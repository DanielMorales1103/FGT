const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
<<<<<<< Updated upstream
const { guardarArchivo, leerArchivo } = require('./src/backend/activos'); // carga de backend
=======
const { guardarArchivo, leerArchivo } = require('./src/backend/activos');
const { generarReportes } = require('./src/backend/reportes');
const { leerCatalogos, agregarAlCatalogo, agregarUbicacion, ensureFile, CATALOG_FILE, eliminarDeCatalogo} = require('./src/backend/catalogo');
const { importDesdeExcel } = require('./src/backend/importer');
>>>>>>> Stashed changes

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
    activosCache = leerArchivo();
    createWindow();
})

ipcMain.handle('get-activos', async () => {
    return activosCache;
});

ipcMain.handle('get-reportes', async () => {
    return generarReportes();
});

ipcMain.handle('save-activos', async (event, nuevosActivos) => {
    guardarArchivo(nuevosActivos);
    return { success: true };
});

<<<<<<< Updated upstream
=======
ipcMain.handle('add-activo', async (event, nuevoActivo) => {
    const actuales = leerArchivo();
    actuales.push(nuevoActivo);
    guardarArchivo(actuales);
    return { success: true, activos: actuales };
});

ipcMain.handle('get-catalogos', async () => {
    return leerCatalogos(); 
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

// Manejador para exportar reportes
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


>>>>>>> Stashed changes
// Esto es para cerrar correctamente en Mac
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
