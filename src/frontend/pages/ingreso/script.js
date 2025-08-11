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
        // Asegúrate de que la página correcta está montada
        const selClas = document.getElementById('sel-clasificacion');
        if (!selClas) return; // Si no está esta página, sal.

        const cats = await ipcRenderer.invoke('get-catalogos');

        // Llenar selects
        setupSimpleSelect(
            document.getElementById('sel-clasificacion'),
            cats.clasificaciones,
            { allowAdd: true, addLabel: '➕ Agregar clasificación…', catalogKey: 'clasificaciones' }
        );
        setupSimpleSelect(
            document.getElementById('sel-proveedor'),
            cats.proveedores,
            { allowAdd: true, addLabel: '➕ Agregar proveedor…', catalogKey: 'proveedores' }
        );
        setupSimpleSelect(
            document.getElementById('sel-estado'),
            cats.estados,
            { allowAdd: false, catalogKey: 'estados' }
        );
        setupUbicacionesSelect(
            document.getElementById('sel-ubicacion'),
            cats.ubicaciones,
            { allowAdd: true, addLabel: '➕ Agregar ubicación…' }
        );
    }


    function setupSimpleSelect(selectEl, items, opts = {}) {
        if (!selectEl) return;
        const { allowAdd, addLabel, catalogKey } = opts;
        fillSimple(selectEl, items, allowAdd, addLabel);

        selectEl.addEventListener('change', async (e) => {
            if (e.target.value === '__add__' && allowAdd) {
            const label = selectEl.previousElementSibling?.textContent?.replace(':','') || 'nuevo valor';
            const nuevo = prompt(`Agregar ${label}`);
            if (nuevo && nuevo.trim()) {
                const resp = await ipcRenderer.invoke('add-catalogo-item', { catalogo: catalogKey, valor: nuevo.trim() });
                if (resp?.success) fillSimple(selectEl, resp.items, allowAdd, addLabel, nuevo.trim());
            } else {
                fillSimple(selectEl, items, allowAdd, addLabel);
            }
            }
        });
    }

    function fillSimple(selectEl, items, allowAdd = false, addLabel = '➕ Agregar…', selected = '') {
        selectEl.innerHTML = '';
        selectEl.appendChild(new Option('— Seleccione —', ''));
        (items || []).forEach(v => selectEl.appendChild(new Option(v, v)));
        if (allowAdd) selectEl.appendChild(new Option(addLabel, '__add__'));
        selectEl.value = selected || '';
    }

    function setupUbicacionesSelect(selectEl, ubicaciones, opts = {}) {
        if (!selectEl) return;
        const { allowAdd, addLabel } = opts;
        fillUbicaciones(selectEl, ubicaciones, allowAdd, addLabel);

        selectEl.addEventListener('change', async (e) => {
            if (e.target.value === '__add__' && allowAdd) {
            const sede = prompt('Sede/Oficina (ej. "Oficina Central")');
            if (!sede || !sede.trim()) return fillUbicaciones(selectEl, ubicaciones, allowAdd, addLabel);
            const area = prompt(`Área/Zona dentro de "${sede.trim()}" (ej. "Contabilidad")`);
            if (!area || !area.trim()) return fillUbicaciones(selectEl, ubicaciones, allowAdd, addLabel);

            const resp = await ipcRenderer.invoke('add-catalogo-item', { catalogo: 'ubicaciones', grupo: sede.trim(), valor: area.trim() });
            if (resp?.success) fillUbicaciones(selectEl, resp.items, allowAdd, addLabel, `${sede.trim()} - ${area.trim()}`);
            }
        });
    }

    function fillUbicaciones(selectEl, ubicacionesObj, allowAdd = false, addLabel = '➕ Agregar ubicación…', selected = '') {
        selectEl.innerHTML = '';
        selectEl.appendChild(new Option('— Seleccione —', ''));
        const sedes = Object.keys(ubicacionesObj || {}).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
        for (const sede of sedes) {
            const og = document.createElement('optgroup'); og.label = sede;
            (ubicacionesObj[sede] || []).forEach(area => og.appendChild(new Option(`${sede} - ${area}`, `${sede} - ${area}`)));
            selectEl.appendChild(og);
        }
        if (allowAdd) selectEl.appendChild(new Option(addLabel, '__add__'));
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