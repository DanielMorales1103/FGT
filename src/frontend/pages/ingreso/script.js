(() => {
    const ipcRenderer = window.ipc;
    var activos = [];

    window.addEventListener('DOMContentLoaded', async () => {
        activos = await ipcRenderer.invoke('get-activos');
    });

    document.addEventListener('input', function(e) {
        if (e.target.name === "cantidad" || e.target.name === "costo_unitario") {
            recalcularTotalIngreso();
        }
    });

    function recalcularTotalIngreso() {
        const cantidad = parseInt(document.querySelector('[name="cantidad"]').value) || 0;
        const costo_unitario = parseFloat(document.querySelector('[name="costo_unitario"]').value) || 0;
        const total = cantidad * costo_unitario;
        document.querySelector('[name="costo_total"]').value = total.toFixed(2);
    }


    const form = document.getElementById('ingreso-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nuevo = {
            financiado_por:   form.financiado_por.value,
            proyecto:         form.proyecto.value,
            clasificacion:    form.clasificacion.value,
            concepto:         form.concepto.value,
            cantidad:         parseInt(form.cantidad.value)     || 0,
            costo_unitario:   parseFloat(form.costo_unitario.value) || 0,
            costo_total:      parseFloat(form.costo_total.value)    || 0,
            fecha_compra:     form.fecha_compra.value,
            proveedor:        form.proveedor.value,
            no_factura:       form.no_factura.value,
            no_serie:         form.no_serie.value,
            descripcion:      form.descripcion.value,
            estado:           form.estado.value,
            ubicacion_fisica: form.ubicacion_fisica.value,
            responsable:      form.responsable.value,
            observaciones:    form.observaciones.value
        };

        // 4.2) Agrégalo al array y guarda en el archivo
        activos.push(nuevo);
        const respuesta = await ipcRenderer.invoke('save-activos', activos);

        if (respuesta.success) {
            // 4.3) Actualiza UI y limpia el form
            alert('Activo guardado correctamente');
            form.reset();
            form.querySelector('[name="costo_total"]').value = '';
            // si quieres volver a la lista:
            // loadPage('activos');
        } else {
            alert('Error al guardar');
        }
    });

})();