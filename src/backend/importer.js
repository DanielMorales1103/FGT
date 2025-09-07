// src/backend/importer.js
const ExcelJS = require('exceljs');
const { leerArchivo, guardarArchivo } = require('./activos');

// Config propio: encabezados en fila 5, datos desde fila 6
const HEADER_ROW = 5;
const DATA_START = 6;

// -------------------- Helpers --------------------
const rmAccents = (s) => String(s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const norm = (s) => rmAccents(String(s || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' '));

function toDateYYYYMMDD(v) {
    if (!v) return '';
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v).trim();
    const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
    const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m2) {
        const dd = m2[1].padStart(2, '0');
        const mm = m2[2].padStart(2, '0');
        const yyyy = m2[3].length === 2 ? `20${m2[3]}` : m2[3];
        return `${yyyy}-${mm}-${dd}`;
    }
    return s;
}

function num(v) {
    const n = Number(String(v ?? '').replace(/,/g, '.'));
    return Number.isFinite(n) ? n : 0;
}

/** Reconoce la clave interna a partir del texto del encabezado (tolerante a acentos/typos) */
function keyFromHeader(h) {
    const n = norm(h);

    // equivalencias exactas frecuentes
    const exact = new Map([
        ['financiado por', 'financiado_por'],
        ['proyecto', 'proyecto'],
        ['clasificacion (tipo de activo)', 'clasificacion'],
        ['concepto', 'concepto'],
        ['cantidad', 'cantidad'],
        ['fecha de compra', 'fecha_compra'],
        ['proveedor', 'proveedor'],
        ['no. factura', 'no_factura'],
        ['costo unitario q', 'costo_unitario'],
        ['costo total', 'costo_total'],
        ['no. de serie', 'no_serie'],
        ['estado', 'estado'],
        ['ubicacion fisica', 'ubicacion_fisica'],
        ['responsable', 'responsable'],
        ['observaciones', 'observaciones'],
    ]);
    if (exact.has(n)) return exact.get(n);

    // heurísticas por substring (para soportar variantes/typos)
    if (n.includes('descrip')) return 'descripcion'; // descripción / descrpcion / descripcin …
    if (n.includes('estado')) return 'estado';
    if (n.includes('ubicacion') && n.includes('fisica')) return 'ubicacion_fisica';
    if (n.includes('responsab')) return 'responsable';
    if (n.includes('observa')) return 'observaciones';
    if (n.includes('clasificacion')) return 'clasificacion';
    if (n.includes('costo unitario')) return 'costo_unitario';
    if (n.includes('costo total')) return 'costo_total';
    if (n.includes('no. factura') || n.includes('no factura')) return 'no_factura';
    if (n.includes('no. de serie') || n.includes('no de serie')) return 'no_serie';

    return null; // desconocido
}

function buildColumnMap(ws) {
    const colToKey = {}; // colIndex -> clave interna
    const hdr = ws.getRow(HEADER_ROW);

    // Usar el total de columnas de la hoja, no solo las "no vacías" del header
    const maxCols = ws.columnCount || hdr.cellCount;

    for (let c = 1; c <= maxCols; c++) {
        const cell = hdr.getCell(c);

        // Preferir el texto “renderizado” por ExcelJS (concatena richText, maneja saltos de línea)
        let raw = cell?.text;
        if (!raw || raw === '') {
        // Fallbacks por si acaso
        const v = cell?.value;
        if (v && typeof v === 'object' && 'text' in v) raw = v.text;
        else if (v && typeof v === 'object' && Array.isArray(v.richText)) {
            raw = v.richText.map(p => p.text || '').join('');
        } else {
            raw = v != null ? String(v) : '';
        }
        }

        const key = keyFromHeader(raw);
        if (key) colToKey[c] = key;
    }

    return colToKey;
}

function canonEstado(v) {
    const n = norm(v);
    if (n === 'buen estado')         return 'Buen estado';
    if (n === 'mal estado')          return 'Mal estado';
    if (n === 'necesita reparacion') return 'Necesita reparación';
    return '';
}


function isDup(a, b) {
    return (
        norm(a.concepto)         === norm(b.concepto) &&
        norm(a.responsable)      === norm(b.responsable) &&
        String(a.fecha_compra||'').slice(0,10) === String(b.fecha_compra||'').slice(0,10) &&
        norm(a.ubicacion_fisica) === norm(b.ubicacion_fisica) &&
        norm(a.proveedor)        === norm(b.proveedor) &&
        norm(a.no_factura)       === norm(b.no_factura)
    );
}

// -------------------- Importador --------------------
/**
 * Importa desde ruta de archivo O desde buffer (cuando el renderer no expone file.path).
 * Ignora filas 1–4 (logo) y toma fila 5 como encabezados.
 * Agrega (append) los registros a activos.json, no sobreescribe.
 *
 * @param {{filePath?: string, buffer?: number[], sheetName?: string}} args
 */
async function importDesdeExcel({ filePath, buffer, sheetName } = {}) {
    const wb = new ExcelJS.Workbook();

    if (filePath) {
        await wb.xlsx.readFile(filePath);
    } else if (buffer && buffer.length) {
        await wb.xlsx.load(Buffer.from(buffer));
    } else {
        throw new Error('No se recibió archivo');
    }

    const ws = sheetName ? wb.getWorksheet(sheetName) : wb.worksheets[0];
    if (!ws) throw new Error('No se encontró la hoja de cálculo.');

    // 1) Mapa de columnas a partir del header (fila 5)
    const colToKey = buildColumnMap(ws);

    // Requeridos mínimos
    const requeridos = ['concepto', 'cantidad', 'costo_unitario'];
    for (const req of requeridos) {
        const ok = Object.values(colToKey).includes(req);
        if (!ok) throw new Error(`Falta columna requerida: ${req}`);
    }

    // 2) Leer actuales y preparar buffers
    const actuales = leerArchivo();
    const nuevos = [];
    const errores = [];

    // 3) Recorrer filas de datos (desde 6)
    for (let r = DATA_START; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const anyVal = Object.keys(colToKey).some(k => row.getCell(Number(k)).value);
        if (!anyVal) continue;

        try {
            const obj = {
                financiado_por:   '',
                proyecto:         '',
                clasificacion:    '',
                concepto:         '',
                cantidad:         0,
                descripcion:      '',
                fecha_compra:     '',
                proveedor:        '',
                no_factura:       '',
                costo_unitario:   0,
                costo_total:      0,
                no_serie:         '',
                estado:           '',
                ubicacion_fisica: '',
                responsable:      '',
                observaciones:    '',
            };

            for (const [colIdxStr, key] of Object.entries(colToKey)) {
                const c = Number(colIdxStr);
                let v = row.getCell(c)?.value;
                // ExcelJS puede devolver objetos RichText: { text: '...' }
                if (v && typeof v === 'object' && 'text' in v) v = v.text;

                switch (key) {
                    case 'cantidad':        obj.cantidad       = num(v); break;
                    case 'costo_unitario':  obj.costo_unitario = num(v); break;
                    case 'costo_total':     obj.costo_total    = num(v); break;
                    case 'fecha_compra':    obj.fecha_compra   = toDateYYYYMMDD(v); break;
                    case 'estado':          obj.estado         = canonEstado(v); break;
                    default:                obj[key] = String(v ?? '').trim();
                }
            }

            // Validaciones mínimas
            if (!obj.concepto) throw new Error('Concepto vacío');
            if (!(obj.cantidad > 0)) throw new Error('Cantidad inválida');
            if (!(obj.costo_unitario >= 0)) throw new Error('Costo unitario inválido');

            // Calcular costo_total si no viene
            if (!obj.costo_total) {
                obj.costo_total = Number((obj.cantidad * obj.costo_unitario).toFixed(2));
            }

            nuevos.push(obj);
        } catch (e) {
            errores.push({ fila: r, error: e.message || String(e) });
        }
    }

    let skipped_dupes = 0;
    const unicosExcel = [];
    for (const n of nuevos) {
        const dup = unicosExcel.some(x => isDup(x, n));
        if (dup) { skipped_dupes++; continue; }
        unicosExcel.push(n);
    }

    const paraInsertar = unicosExcel.filter(n => !actuales.some(a => isDup(a, n)));
    skipped_dupes += (unicosExcel.length - paraInsertar.length);

    // 4) Guardar (append)
    if (paraInsertar.length) {
        guardarArchivo([...actuales, ...nuevos]); // SE AGREGAN, NO SE SOBREESCRIBEN
    }

    return { inserted: paraInsertar.length, skipped_dupes, errors: errores };
}

module.exports = { importDesdeExcel };
