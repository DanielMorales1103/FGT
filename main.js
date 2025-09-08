const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { guardarArchivo, leerArchivo } = require('./src/backend/activos'); // carga de backend
const { leerCatalogos, agregarAlCatalogo, agregarUbicacion, ensureFile, CATALOG_FILE, eliminarDeCatalogo} = require('./src/backend/catalogo');
const { importDesdeExcel } = require('./src/backend/importer');
const { generarReportes } = require('./src/backend/reportes');
const ExcelJS = require('exceljs');

let activosCache = [];

function createWindow () {
    const win = new BrowserWindow({
        show: false, // primero la creamos oculta
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    })

    win.loadFile('src/frontend/index.html');

    win.maximize(); 
    win.show();
}

app.whenReady().then(() => {
    ensureFile();
    const cats = leerCatalogos();
    activosCache = leerArchivo();
    createWindow();
})

ipcMain.handle('get-activos', async () => {
    return leerArchivo();
});


ipcMain.handle('save-activos', async (event, nuevosActivos) => {
    guardarArchivo(nuevosActivos);
    return { success: true };
});

ipcMain.handle('add-activo', async (event, nuevoActivo) => {
    const actuales = leerArchivo();

    const norm = (s) =>
    String(s ?? '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim().toLowerCase();
    
    const isDup = (a, b) =>
        norm(a.concepto)         === norm(b.concepto) &&
        norm(a.responsable)      === norm(b.responsable) &&
        String(a.fecha_compra||'').slice(0,10) === String(b.fecha_compra||'').slice(0,10) && // fecha canon YYYY-MM-DD
        norm(a.ubicacion_fisica) === norm(b.ubicacion_fisica) &&
        norm(a.proveedor)        === norm(b.proveedor) &&
        norm(a.no_factura)       === norm(b.no_factura);
    
    const yaExiste = actuales.some(a => isDup(a, nuevoActivo));

    if (yaExiste) {
        return {
            success: false,
            duplicate: true,
            message: 'El activo ya existe con los mismos: concepto, responsable, fecha de compra, ubicación física, proveedor y No. factura.'
        };
    }

    actuales.push(nuevoActivo);
    guardarArchivo(actuales);
    return { success: true, activos: actuales };
});

ipcMain.handle('get-catalogos', async () => {
    return leerCatalogos(); 
});

ipcMain.handle('get-reportes', async () => {
    return generarReportes();
});

ipcMain.handle('add-catalogo-item', async (event, payload) => {
    const { catalogo, valor, grupo } = payload || {};
    if (catalogo === 'ubicaciones') {
        const ubic = agregarUbicacion(grupo, valor); // grupo = sede, valor = área
        return { success: true, items: ubic };
    } else {
        const lista = agregarAlCatalogo(catalogo, valor);
        return { success: true, items: lista };
    }
});

ipcMain.handle('delete-catalogo-item', async (_evt, { catalogo, valor, grupo }) => {
  const cats = eliminarDeCatalogo(catalogo, valor, grupo);
  return { success: true, items: catalogo === 'ubicaciones' ? cats.ubicaciones : cats[catalogo] };
});

ipcMain.handle('ui-confirm', async (_evt, { message, detail }) => {
    const win = BrowserWindow.getFocusedWindow();
    const { response } = await dialog.showMessageBox(win, {
        type: 'question',
        buttons: ['Cancelar', 'Eliminar'],
        defaultId: 1,
        cancelId: 0,
        message,
        detail: detail || '',
        noLink: true
    });
    return response === 1; // true si pulsó "Eliminar"
});

ipcMain.handle('import-excel', async (_evt, { filePath, buffer, sheetName }) => {
    try {
        if (!filePath && !buffer) throw new Error('No se recibió archivo');

        const res = await importDesdeExcel({ filePath, buffer, sheetName });
        return { success: true, ...res };
    } catch (e) {
        console.error('Error importando Excel:', e);
        return { success: false, message: e.message || 'Error desconocido' };
    }
});

ipcMain.handle('exportar-reportes', async (event, reportesData) => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'Exportar Reportes',
        defaultPath: 'reportes_activos.xlsx',
        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    });
    
    if (filePath) {
        const XLSX = require('xlsx');
        const datosExcel = [
            ['REPORTE DE ACTIVOS', '', ''],
            ['Fecha generación', new Date().toLocaleDateString(), ''],
            ['', '', ''],
            ['TOTAL GENERAL', `Q ${reportesData.totalGeneral.toLocaleString()}`, ''],
            ['TOTAL ACTIVOS', reportesData.totalActivos, ''],
            ['', '', ''],
            ['POR CATEGORÍA', 'VALOR', 'PORCENTAJE']
        ];

        Object.entries(reportesData.porCategoria).forEach(([categoria, valor]) => {
            const porcentaje = ((valor / reportesData.totalGeneral) * 100).toFixed(1);
            datosExcel.push([categoria, valor, `${porcentaje}%`]);
        });

        datosExcel.push(['', '', '']);
        datosExcel.push(['POR UBICACIÓN', 'VALOR', '']);
        
        Object.entries(reportesData.porUbicacion).forEach(([ubicacion, valor]) => {
            datosExcel.push([ubicacion, valor, '']);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(datosExcel);
        XLSX.utils.book_append_sheet(wb, ws, "Reportes");
        XLSX.writeFile(wb, filePath);
        
        return { success: true, path: filePath };
    }
    
    return { success: false };
});

ipcMain.handle('export-activos-excel', async (_evt, { rows }) => {
    try {
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Exportar activos',
            defaultPath: 'activos.xlsx',
            filters: [{ name: 'Excel', extensions: ['xlsx'] }]
        });
        if (canceled || !filePath) return { success: false, canceled: true };

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Activos');

        // === Dejar filas vacías 1–4 (para simular formato oficial sin logo) ===
        for (let i = 1; i <= 4; i++) {
            ws.addRow([]);
        }

        // === Encabezados en fila 5 ===
        ws.columns = [
            { header: 'Financiado por',    key: 'financiado_por',   width: 22 },
            { header: 'Proyecto',          key: 'proyecto',         width: 22 },
            { header: 'Clasificación',     key: 'clasificacion',    width: 18 },
            { header: 'Concepto',          key: 'concepto',         width: 26 },
            { header: 'Cantidad',          key: 'cantidad',         width: 10 },
            { header: 'Descripción',       key: 'descripcion',      width: 28 },
            { header: 'Fecha de compra',   key: 'fecha_compra',     width: 16 },
            { header: 'Proveedor',         key: 'proveedor',        width: 22 },
            { header: 'No. Factura',       key: 'no_factura',       width: 16 },
            { header: 'Costo unitario (Q)',key: 'costo_unitario',   width: 18, style:{ numFmt: '#,##0.00' } },
            { header: 'Costo total (Q)',   key: 'costo_total',      width: 18, style:{ numFmt: '#,##0.00' } },
            { header: 'No. Serie',         key: 'no_serie',         width: 18 },
            { header: 'Estado',            key: 'estado',           width: 16 },
            { header: 'Ubicación física',  key: 'ubicacion_fisica', width: 26 },
            { header: 'Responsable',       key: 'responsable',      width: 22 },
            { header: 'Observaciones',     key: 'observaciones',    width: 28 },
        ];

        // Estilos header (fila 5)
        const header = ws.getRow(5);
        header.font = { bold: true };
        header.alignment = { vertical: 'middle' };
        header.height = 20;
        header.eachCell(cell => {
        cell.fill   = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF5F7FA' } };
        cell.border = { top:{style:'thin',color:{argb:'FFE0E0E0'}},
                        left:{style:'thin',color:{argb:'FFE0E0E0'}},
                        bottom:{style:'thin',color:{argb:'FFE0E0E0'}},
                        right:{style:'thin',color:{argb:'FFE0E0E0'}} };
        });

        // === Filas de datos a partir de la fila 6 ===
        (rows || []).forEach(a => {
            ws.addRow({
                financiado_por:   a.financiado_por || '',
                proyecto:         a.proyecto || '',
                clasificacion:    a.clasificacion || '',
                concepto:         a.concepto || '',
                cantidad:         Number(a.cantidad || 0),
                descripcion:      a.descripcion || '',
                fecha_compra:     a.fecha_compra || '',
                proveedor:        a.proveedor || '',
                no_factura:       a.no_factura || '',
                costo_unitario:   Number(a.costo_unitario || 0),
                costo_total:      Number(a.costo_total || 0),
                no_serie:         a.no_serie || '',
                estado:           a.estado || '',
                ubicacion_fisica: a.ubicacion_fisica || '',
                responsable:      a.responsable || '',
                observaciones:    a.observaciones || '',
            });
        });

        await wb.xlsx.writeFile(filePath);
        return { success: true, filePath };
    } catch (e) {
        console.error('Export error:', e);
        return { success: false, message: e.message || 'Error desconocido' };
    }
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
