
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DATA_FILE = path.join(app.getPath('userData'), 'activos.json');

function guardarArchivo(datos) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(datos, null, 2), 'utf-8');
}

function leerArchivo() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            console.warn('Archivo de activos no encontrado');
            return []; // retorna array vacío si no existe el archivo
        }
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo archivo:', error);
        return [];
    }
}

module.exports = { leerArchivo, guardarArchivo };

