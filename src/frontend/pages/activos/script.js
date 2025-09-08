(() => {
    const { ipcRenderer } = require('electron');

    var activos = [];
    let catsCache = null;

    // ---------- Carga inicial ----------
    (async () => {
        catsCache = await ipcRenderer.invoke('get-catalogos'); // clasificaciones, proveedores, estados, ubicaciones
        activos   = await ipcRenderer.invoke('get-activos');
        renderTabla();
        seguroRenderTabla(); // por si el tbody aún no está presente
    })();

    // ---------- Helpers para selects ----------
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
        const sedes = Object.keys(ubicacionesObj || {}).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
        for (const sede of sedes) {
        const og = document.createElement('optgroup'); og.label = sede;
        (ubicacionesObj[sede] || []).forEach(area => og.appendChild(new Option(`${sede} - ${area}`, `${sede} - ${area}`)));
        selectEl.appendChild(og);
        }
        selectEl.value = selected || '';
    }

    function claseEstado(estado) {
        const n = String(estado || '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
            .trim().toLowerCase();

        // Canoniza a 3 valores
        if (n === 'buen estado')             return 'operativo';       // verde
        if (n === 'mal estado')              return 'fuera-servicio';  // rojo
        if (n === 'necesita reparacion')     return 'en-reparacion';   // naranja
        return ''; // sin clase si no matchea
    }

    let _ultimaLista = [];
    function renderTabla(lista = activos) {
        const tbody = document.getElementById("activos-body");
        if (!tbody) return;
        tbody.innerHTML = "";
        let total = 0;

        _ultimaLista = lista;         
        lista.forEach((a, idx) => {
            total += a.costo_total;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${a.concepto}</td>
                <td>${a.clasificacion}</td>
                <td><span class="badge ${claseEstado(a.estado)}">${a.estado}</span></td>
                <td>${a.responsable}</td>
                <td>Q ${a.costo_total.toLocaleString()}</td>
                <td>${a.fecha_compra}</td>
                <td>${a.ubicacion_fisica}</td>
                <td>
                    <button class="btn-accion" onclick="mostrarDetalle(${idx})">🔍</button>
                    <button class="btn-accion" onclick="mostrarEditar(${idx})">✏️</button>
                    <button class="btn-accion" onclick="eliminarActivo(${idx})">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById("totales").innerHTML = 
            `Total activos: <strong>${activos.length}</strong> | Valor total: <strong>Q ${total.toLocaleString()}</strong>`;
    }

    function mostrarDetalle(idx) {
        const a = activos[idx];
        const d = document.getElementById("detalle-content");
        d.innerHTML = `
            <h3>${a.concepto}</h3>
            <p><strong>Financiado por:</strong> ${a.financiado_por}</p>
            <p><strong>Proyecto:</strong> ${a.proyecto}</p>
            <p><strong>Clasificación:</strong> ${a.clasificacion}</p>
            <p><strong>Concepto:</strong> ${a.concepto}</p>
            <p><strong>Cantidad:</strong> ${a.cantidad}</p>
            <p><strong>Descripción:</strong> ${a.descripcion}</p>
            <p><strong>Fecha de compra:</strong> ${a.fecha_compra}</p>
            <p><strong>Proveedor:</strong> ${a.proveedor}</p>
            <p><strong>No. Factura:</strong> ${a.no_factura}</p>
            <p><strong>Costo unitario:</strong> Q ${a.costo_unitario.toLocaleString()}</p>
            <p><strong>Costo total:</strong> Q ${a.costo_total.toLocaleString()}</p>
            <p><strong>No. Serie:</strong> ${a.no_serie}</p>
            <p><strong>Estado:</strong> ${a.estado}</p>
            <p><strong>Ubicación física:</strong> ${a.ubicacion_fisica}</p>
            <p><strong>Responsable:</strong> ${a.responsable}</p>
            <p><strong>Observaciones:</strong> ${a.observaciones}</p>
        `;
        document.getElementById("detalle-modal").style.display = "block";
    }

    function cerrarModal() {
        document.getElementById("detalle-modal").style.display = "none";
    }

    async function ensureCats() {
        if (!catsCache) catsCache = await ipcRenderer.invoke('get-catalogos');
    }

    async function mostrarEditar(idx) {
        await ensureCats();
        const activo = activos[idx];

        fillSimple(document.getElementById("edit-clasificacion"), catsCache?.clasificaciones);
        fillSimple(document.getElementById("edit-proveedor"),     catsCache?.proveedores);
        // Estados: si quieres agregar desde modal, cambia false → true y usa setupAddHandlers
        fillSimple(document.getElementById("edit-estado"),        catsCache?.estados);
        fillUbicaciones(document.getElementById("edit-ubicacion_fisica"), catsCache?.ubicaciones);


        document.getElementById("edit-index").value = idx;
        document.getElementById("edit-financiado_por").value = activo.financiado_por || "";
        document.getElementById("edit-proyecto").value = activo.proyecto || "";
        document.getElementById("edit-clasificacion").value = activo.clasificacion || "";
        document.getElementById("edit-concepto").value = activo.concepto || "";
        document.getElementById("edit-cantidad").value = activo.cantidad || 0;
        document.getElementById("edit-descripcion").value = activo.descripcion || "";
        document.getElementById("edit-fecha_compra").value = activo.fecha_compra || "";
        document.getElementById("edit-proveedor").value = activo.proveedor || "";
        document.getElementById("edit-no_factura").value = activo.no_factura || "";
        document.getElementById("edit-costo_unitario").value = activo.costo_unitario || 0;
        document.getElementById("edit-costo_total").value = activo.costo_total || 0;
        document.getElementById("edit-no_serie").value = activo.no_serie || "";
        document.getElementById("edit-estado").value = activo.estado || "";
        document.getElementById("edit-ubicacion_fisica").value = activo.ubicacion_fisica || "";
        document.getElementById("edit-responsable").value = activo.responsable || "";
        document.getElementById("edit-observaciones").value = activo.observaciones || "";

        document.getElementById("editar-modal").style.display = "flex";
    }

    function cerrarEditarModal() {
        document.getElementById("editar-modal").style.display = "none";
    }

    async function guardarEdicion() {
        const idx = document.getElementById("edit-index").value;
        const cantidad = parseInt(document.getElementById("edit-cantidad").value) || 0;
        const costo_unitario = parseFloat(document.getElementById("edit-costo_unitario").value) || 0;
        const total = cantidad * costo_unitario;

        activos[idx] = {
            financiado_por: document.getElementById("edit-financiado_por").value,
            proyecto: document.getElementById("edit-proyecto").value,
            clasificacion: document.getElementById("edit-clasificacion").value,
            concepto: document.getElementById("edit-concepto").value,
            cantidad: cantidad, //parseInt(document.getElementById("edit-cantidad").value),
            descripcion: document.getElementById("edit-descripcion").value,
            fecha_compra: document.getElementById("edit-fecha_compra").value,
            proveedor: document.getElementById("edit-proveedor").value,
            no_factura: document.getElementById("edit-no_factura").value,
            costo_unitario: costo_unitario,//parseFloat(document.getElementById("edit-costo_unitario").value),
            costo_total: total, //parseFloat(document.getElementById("edit-costo_total").value),
            no_serie: document.getElementById("edit-no_serie").value,
            estado: document.getElementById("edit-estado").value,
            ubicacion_fisica: document.getElementById("edit-ubicacion_fisica").value,
            responsable: document.getElementById("edit-responsable").value,
            observaciones: document.getElementById("edit-observaciones").value
        };

        await ipcRenderer.invoke('save-activos', activos);
        cerrarEditarModal();
        renderTabla();
    }

    async function eliminarActivo(idx) {
        const a = activos[idx];
        if (!a) return;

        const ok = await ipcRenderer.invoke('ui-confirm', {
            message: '¿Eliminar este activo?',
            detail: `${a.concepto || ''} — ${a.responsable || ''}`
        });
        if (!ok) return;

        const nuevos = [...activos];
        nuevos.splice(idx, 1);

        const res = await ipcRenderer.invoke('save-activos', nuevos);
        if (res?.success) {
            activos = nuevos;
            // Reaplicar filtros si hay; si no, render general
            const hayFiltros = [
                'filtro-busqueda','filtro-estado','filtro-clasificacion','filtro-ubicacion',
                'filtro-responsable','filtro-fecha-desde','filtro-fecha-hasta',
                'filtro-costo-min','filtro-costo-max'
            ].some(id => (document.getElementById(id)?.value || '') !== '');
            if (hayFiltros && typeof applyFilters === 'function') {
                applyFilters();
            } else {
                renderTabla();
            }
        } else {
            alert('No se pudo eliminar.');
        }
    }

    const btnExport = document.getElementById('btn-exportar-activos');
    if (btnExport) {
        btnExport.addEventListener('click', async () => {
            try {
                const lista = _ultimaLista && _ultimaLista.length ? _ultimaLista : activos;
                const res = await ipcRenderer.invoke('export-activos-excel', { rows: lista });
                if (res?.canceled) return;
                if (!res?.success) {
                    alert('Error al exportar: ' + (res?.message || 'desconocido'));
                    return;
                }
                alert('Exportado a:\n' + res.filePath);
            } catch (err) {
                console.error(err);
                alert('Error inesperado al exportar');
            }
        });
    }

    window.onclick = function(event) {
        if (event.target == document.getElementById("detalle-modal")) {
            cerrarModal();
        }
        if (event.target == document.getElementById("editar-modal")) {
            cerrarEditarModal();
        }
    }

    window.mostrarDetalle = mostrarDetalle;
    window.mostrarEditar = mostrarEditar;
    window.cerrarModal = cerrarModal;
    window.cerrarEditarModal = cerrarEditarModal;
    window.guardarEdicion = guardarEdicion;
    window.eliminarActivo = eliminarActivo;

    document.addEventListener('input', function(e) {
        if (e.target.id === "edit-cantidad" || e.target.id === "edit-costo_unitario") {
            recalcularTotal();
        }
    });

    function recalcularTotal() {
        const cantidad = parseInt(document.getElementById("edit-cantidad").value) || 0;
        const costo_unitario = parseFloat(document.getElementById("edit-costo_unitario").value) || 0;
        const total = cantidad * costo_unitario;
        document.getElementById("edit-costo_total").value = total;
    }

    function seguroRenderTabla() {
        const check = setInterval(() => {
            if (document.getElementById("activos-body")) {
                clearInterval(check);
                renderTabla();
            }
        }, 20);
    }

    seguroRenderTabla();

    function stripAccents(str) {
    return str
        .normalize('NFD')              
        .replace(/[\u0300-\u036f]/g, '') 
        .toLowerCase();
    }

    function fillSelectSimple(selectEl, items, firstLabel) {
        if (!selectEl) return;
        selectEl.innerHTML = '';
        selectEl.appendChild(new Option(firstLabel, ''));
        (items || []).forEach(v => selectEl.appendChild(new Option(v, v)));
    }

    function fillSelectUbicaciones(selectEl, ubicacionesObj, firstLabel) {
        if (!selectEl) return;
        selectEl.innerHTML = '';
        selectEl.appendChild(new Option(firstLabel, ''));
        const sedes = Object.keys(ubicacionesObj || {}).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
        for (const sede of sedes) {
            const og = document.createElement('optgroup');
            og.label = sede;
            (ubicacionesObj[sede] || []).forEach(area => {
                const val = `${sede} - ${area}`;
                og.appendChild(new Option(val, val));
            });
            selectEl.appendChild(og);
        }
    }

    async function populateFilterSelects() {
        // Si ya tienes catsCache cargado, úsalo; si no, pídelo:
        const cats = (typeof catsCache !== 'undefined' && catsCache) ? catsCache : await ipcRenderer.invoke('get-catalogos');

        // Estado: usa lo que venga del catálogo
        fillSelectSimple(document.getElementById('filtro-estado'), cats.estados, '— Todos los estados —');

        // Clasificación
        fillSelectSimple(document.getElementById('filtro-clasificacion'), cats.clasificaciones, '— Todas las clasificaciones —');

        // Ubicación (con optgroups por sede)
        fillSelectUbicaciones(document.getElementById('filtro-ubicacion'), cats.ubicaciones, '— Todas las ubicaciones —');
    }

    // Llama a esto en tu init de la página de activos, antes de enganchar eventos de filtros:
    populateFilterSelects();


    function applyFilters() {
        const texto   = stripAccents(document.getElementById('filtro-busqueda').value);
        const estado  = document.getElementById('filtro-estado').value;           
        const clasif  = document.getElementById('filtro-clasificacion').value;    
        const ubicSel = document.getElementById('filtro-ubicacion').value;        
        const resp    = stripAccents(document.getElementById('filtro-responsable').value);
        const desde   = document.getElementById('filtro-fecha-desde').value;
        const hasta   = document.getElementById('filtro-fecha-hasta').value;
        const minCost = parseFloat(document.getElementById('filtro-costo-min').value) || 0;
        const maxCost = parseFloat(document.getElementById('filtro-costo-max').value) || Infinity;

        const filtrados = activos.filter(a => {
            const conc  = stripAccents(a.concepto || '');
            const prov  = stripAccents(a.proveedor || '');
            const respA = stripAccents(a.responsable || '');
            const clas  = a.clasificacion || '';
            const ubi   = a.ubicacion_fisica || '';
            const fc    = a.fecha_compra || '';
            const ct    = Number(a.costo_total || 0);

            // Cada condición de filtro
            const matchTexto = !texto || conc.includes(texto) || prov.includes(texto) || respA.includes(texto);

            const matchEstado = !estado || a.estado === estado;
            const matchClasif = !clasif || clas === clasif;
            const matchUbic   = !ubicSel || ubi === ubicSel;

            const matchResp   = !resp    || respA.includes(resp);

            const matchFecha  = (!desde || fc >= desde) && (!hasta || fc <= hasta);
            const matchCosto  = ct >= minCost && ct <= maxCost;

            return matchTexto && matchEstado && matchClasif && matchUbic 
                && matchResp && matchFecha && matchCosto;
        });

        renderTabla(filtrados);
    }

    ['input','change'].forEach(evt => {
        document.querySelectorAll(
            '#filtro-busqueda, #filtro-estado, ' +
            '#filtro-clasificacion, #filtro-ubicacion, #filtro-responsable, ' +
            '#filtro-fecha-desde, #filtro-fecha-hasta, ' +
            '#filtro-costo-min, #filtro-costo-max'
        ).forEach(el => el.addEventListener(evt, applyFilters));
    });

    document.getElementById('btn-reset-filtros').addEventListener('click', () => {
        document.querySelectorAll(
            '#filtro-busqueda, #filtro-estado, ' +
            '#filtro-clasificacion, #filtro-ubicacion, #filtro-responsable, ' +
            '#filtro-fecha-desde, #filtro-fecha-hasta, ' +
            '#filtro-costo-min, #filtro-costo-max'
        ).forEach(el => { el.value = ''; });
        applyFilters();
    });

    window.addEventListener('DOMContentLoaded', () => {
        const filtrosIds = ['filtro-busqueda', 'filtro-estado', 'filtro-clasificacion', 'filtro-ubicacion',
            'filtro-responsable', 'filtro-fecha-desde', 'filtro-fecha-hasta', 'filtro-costo-min', 'filtro-costo-max',];

        filtrosIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input',  applyFilters);
            el.addEventListener('change', applyFilters);
        });
    });

})();