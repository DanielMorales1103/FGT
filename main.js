const { app, BrowserWindow } = require('electron');

function createWindow () {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    })

    win.loadFile('src/frontend/index.html');
}

app.whenReady().then(createWindow);

// Esto es para cerrar correctamente en Mac
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
