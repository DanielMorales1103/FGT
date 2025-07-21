const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { guardarArchivo, leerArchivo } = require('./src/backend/activos'); // carga de backend

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


ipcMain.handle('save-activos', async (event, nuevosActivos) => {
    guardarArchivo(nuevosActivos);
    return { success: true };
});

// Esto es para cerrar correctamente en Mac
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
