const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { guardarArchivo, leerArchivo } = require('./src/backend/activos'); // carga de backend
const { leerCatalogos, agregarAlCatalogo, agregarUbicacion, ensureFile, CATALOG_FILE, eliminarDeCatalogo} = require('./src/backend/catalogo');
const { importDesdeExcel } = require('./src/backend/importer');
const { generarReportes } = require('./src/backend/reportes');


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

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
