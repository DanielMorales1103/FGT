const { app, BrowserWindow } = require('electron');

function createWindow () {
    const win = new BrowserWindow({
        show: false, // primero la creamos oculta
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    win.loadFile('src/frontend/index.html');

    win.maximize(); 
    win.show();
}

app.whenReady().then(createWindow);

// Esto es para cerrar correctamente en Mac
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
