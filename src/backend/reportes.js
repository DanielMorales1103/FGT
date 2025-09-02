const { leerArchivo } = require('./activos');

function generarReportes() {
    const activos = leerArchivo();
    
    // 1. Totales por categoría (clasificación)
    const porCategoria = {};
    activos.forEach(a => {
        const cat = a.clasificacion || 'Sin categoría';
        porCategoria[cat] = (porCategoria[cat] || 0) + (a.costo_total || 0);
    });

    // 2. Total general
    const totalGeneral = activos.reduce((sum, a) => sum + (a.costo_total || 0), 0);

    // 3. Total por oficina/ubicación
    const porUbicacion = {};
    activos.forEach(a => {
        const ubi = a.ubicacion_fisica || 'Sin ubicación';
        porUbicacion[ubi] = (porUbicacion[ubi] || 0) + (a.costo_total || 0);
    });

    // 4. Compras por mes y año
    const porMes = {};
    const porAnio = {};
    
    activos.forEach(a => {
        if (!a.fecha_compra) return;
        
        // Por año
        const anio = a.fecha_compra.split('-')[0];
        if (anio) {
            porAnio[anio] = (porAnio[anio] || 0) + (a.costo_total || 0);
        }
        
        // Por mes (formato: "YYYY-MM")
        const mes = a.fecha_compra.substring(0, 7);
        if (mes) {
            porMes[mes] = (porMes[mes] || 0) + (a.costo_total || 0);
        }
    });

    return {
        porCategoria,
        totalGeneral,
        porUbicacion,
        porMes,
        porAnio,
        totalActivos: activos.length
    };
}

module.exports = { generarReportes };