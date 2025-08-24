const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { guardarArchivo, leerArchivo } = require('./src/backend/activos'); // carga de backend
const { leerCatalogos, agregarAlCatalogo, agregarUbicacion, ensureFile, CATALOG_FILE, eliminarDeCatalogo} = require('./src/backend/catalogo');

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


// Esto es para cerrar correctamente en Mac
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
