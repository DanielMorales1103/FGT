// esta función después va a leer el archivo JSON
function leerArchivo() {
    return [
        {
            financiado_por: "FGT",
            proyecto: "2023-Tecnología",
            clasificacion: "Computo",
            concepto: "Laptop Dell 14\"",
            cantidad: 5,
            descripcion: "Core i5, 8GB, SSD 512",
            fecha_compra: "2023-04-10",
            proveedor: "Dell Guatemala",
            no_factura: "001234",
            costo_unitario: 6500,
            costo_total: 32500,
            no_serie: "ABC1234",
            estado: "Operativo",
            ubicacion_fisica: "Oficina 1",
            responsable: "Pedro Gómez",
            observaciones: "Buen estado"
        },
        {
            financiado_por: "Cooperación",
            proyecto: "Audio 2022",
            clasificacion: "Audio",
            concepto: "Proyector Epson",
            cantidad: 2,
            descripcion: "Full HD, HDMI",
            fecha_compra: "2022-11-05",
            proveedor: "Epson CA",
            no_factura: "005678",
            costo_unitario: 3200,
            costo_total: 6400,
            no_serie: "XYZ7890",
            estado: "En reparación",
            ubicacion_fisica: "Sala reuniones",
            responsable: "Juan Pérez",
            observaciones: "Enviado a servicio"
        }
    ];
}

module.exports = { leerArchivo };
