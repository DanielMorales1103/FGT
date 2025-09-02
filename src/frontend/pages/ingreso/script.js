(() => {
    const { ipcRenderer } = require('electron'); 

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

    async function initIngreso() {
        const selClas = document.getElementById('sel-clasificacion');
        if (!selClas) return; // si no es esta página, salir

        const cats = await ipcRenderer.invoke('get-catalogos');

        // Llenar selects SIN opción de agregar
        fillSimple(document.getElementById('sel-clasificacion'), cats.clasificaciones);
        fillSimple(document.getElementById('sel-proveedor'),     cats.proveedores);
        fillSimple(document.getElementById('sel-estado'),        cats.estados);
        fillUbicaciones(document.getElementById('sel-ubicacion'), cats.ubicaciones);
    }

    // Helpers sin modo "agregar"
    function fillSimple(selectEl, items, selected = '') {
        if (!selectEl) return;
        selectEl.innerHTML = '';
        selectEl.appendChild(new Option('— Seleccione —', ''));
        (items || []).forEach(v => selectEl.appendChild(new Option(v, v)));
        selectEl.value = selected || '';
    }

    function fillUbicaciones(selectEl, ubicacionesObj, selected = '') {
        if (!selectEl) return;
        selectEl.innerHTML = '';
        selectEl.appendChild(new Option('— Seleccione —', ''));
        const sedes = Object.keys(ubicacionesObj || {}).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
        for (const sede of sedes) {
        const og = document.createElement('optgroup'); og.label = sede;
        (ubicacionesObj[sede] || []).forEach(area =>
            og.appendChild(new Option(`${sede} - ${area}`, `${sede} - ${area}`))
        );
        selectEl.appendChild(og);
        }
        selectEl.value = selected || '';
    }
    initIngreso();
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

        try {
        const { success } = await ipcRenderer.invoke('add-activo', nuevo);
        if (success) {
            alert('Activo guardado correctamente');
            form.reset();
            form.querySelector('[name="costo_total"]').value = '';
            // opción: navegar a la lista (recomendado)
            // window.location.href = '../activos/index.html';
        } else {
            alert('Error al guardar');
        }
        } catch (err) {
            console.error(err);
            alert('Error inesperado al guardar');
        } finally {
        saving = false;
        }
    });

})();