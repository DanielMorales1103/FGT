const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const CATALOG_FILE = () => path.join(app.getPath('userData'), 'catalogos.json');

const DEFAULTS = {
    clasificaciones: ['Mobiliario', 'Equipos', 'Vehículos'],
    proveedores: ['Intelaf', 'Macrosistemas', 'Punto Digital', 'Marvin Valenzuela', 'Librería Progreso', 'CANELLA'],
    estados: ['Buen estado', 'Mal estado', 'Necesita reparación'],
    // Estructura jerárquica por Sede/Oficina
    ubicaciones: {
        'Oficina Central': [
        'Administración', 'Recepción', 'Contabilidad', 'Gestión y Planificación', 'Programas',
        'Memoria Histórica', 'Salón de reuniones', 'Bodega', 'Bodega de Contabilidad',
        'Sala', 'Cocina', 'Guardianía', 'Librería'
        ],
        'Oficina El Estor - Izabal': [
        'Coordinación', 'Subcoordinación', 'Contabilidad', 'Técnicos'
        ]
    }
};

function ensureFile() {
    const p = CATALOG_FILE();
    try {
        if (!fs.existsSync(p)) {
        fs.writeFileSync(p, JSON.stringify(DEFAULTS, null, 2), 'utf-8');
        }
    } catch (e) {
        console.error('Error creando catalogos.json:', e);
    }
}

function normalize(data) {
    // Asegura que existan todas las llaves mínimas
    const out = { ...DEFAULTS, ...(data || {}) };

    // Asegurar tipos
    if (!Array.isArray(out.clasificaciones)) out.clasificaciones = [...DEFAULTS.clasificaciones];
    if (!Array.isArray(out.proveedores)) out.proveedores = [...DEFAULTS.proveedores];
    if (!Array.isArray(out.estados)) out.estados = [...DEFAULTS.estados];

    // ubicaciones debe ser objeto { sede: [areas] }
    if (!out.ubicaciones || typeof out.ubicaciones !== 'object' || Array.isArray(out.ubicaciones)) {
        out.ubicaciones = JSON.parse(JSON.stringify(DEFAULTS.ubicaciones));
    }
    // limpiar duplicados / ordenar
    out.clasificaciones = dedupSort(out.clasificaciones);
    out.proveedores = dedupSort(out.proveedores);
    out.estados = dedupSort(out.estados);

    for (const sede of Object.keys(out.ubicaciones)) {
        out.ubicaciones[sede] = dedupSort(out.ubicaciones[sede] || []);
    }
    return out;
}

function dedupSort(arr) {
    const seen = new Set();
    const out = [];
    for (const v of arr || []) {
        const key = String(v).trim().toLowerCase();
        if (!key) continue;
        if (!seen.has(key)) {
        seen.add(key);
        out.push(String(v).trim());
        }
    }
    return out.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

function readRaw() {
    const p = CATALOG_FILE();
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw);
}

function writeRaw(data) {
    fs.writeFileSync(CATALOG_FILE(), JSON.stringify(data, null, 2), 'utf-8');
}

function leerCatalogos() {
    ensureFile();
    try {
        return normalize(readRaw());
    } catch (e) {
        console.error('Error leyendo catalogos.json:', e);
        return normalize({});
    }
}

function guardarCatalogos(data) {
    ensureFile();
    writeRaw(normalize(data));
}

function agregarAlCatalogo(nombre, valor) {
    // Para catálogos de lista simple (clasificaciones, proveedores, estados)
    const cats = leerCatalogos();
    const key = String(nombre);
    const v = String(valor || '').trim();
    if (!v) return cats[key] || [];
    if (!Array.isArray(cats[key])) cats[key] = [];
    if (!cats[key].some(x => x.toLowerCase() === v.toLowerCase())) {
        cats[key].push(v);
        cats[key] = dedupSort(cats[key]);
        guardarCatalogos(cats);
    }
    return cats[key];
}

function agregarUbicacion(sede, area) {
    const cats = leerCatalogos();
    const s = String(sede || '').trim();
    const a = String(area || '').trim();
    if (!s || !a) return cats.ubicaciones;

    if (!cats.ubicaciones[s]) cats.ubicaciones[s] = [];
    if (!cats.ubicaciones[s].some(x => x.toLowerCase() === a.toLowerCase())) {
        cats.ubicaciones[s].push(a);
        cats.ubicaciones[s] = dedupSort(cats.ubicaciones[s]);
        guardarCatalogos(cats);
    }
    return cats.ubicaciones;
}

function eliminarDeCatalogo(catalogo, valor, grupo) {
    const cats = leerCatalogos();
    const norm = (s) => (s || '').trim().toLowerCase();

    if (catalogo === 'ubicaciones') {
        const sede = (grupo || '').trim();
        if (!sede || !cats.ubicaciones?.[sede]) return cats;
        cats.ubicaciones[sede] = (cats.ubicaciones[sede] || [])
        .filter(a => norm(a) !== norm(valor) && a !== '__init__');
        if (cats.ubicaciones[sede].length === 0) delete cats.ubicaciones[sede];
    } else {
        cats[catalogo] = (cats[catalogo] || []).filter(v => norm(v) !== norm(valor));
    }

    guardarCatalogos(cats);          
    return cats;
}


module.exports = {
    leerCatalogos,
    guardarCatalogos,
    agregarAlCatalogo,   
    agregarUbicacion,    
    ensureFile,
    CATALOG_FILE,
    eliminarDeCatalogo
};
