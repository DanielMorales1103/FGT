var { ipcRenderer } = require('electron');

var activos = [];

ipcRenderer.invoke('get-activos')
    .then(data => {
        activos = data;
        renderTabla();
    })

function claseEstado(estado) {
    switch (estado) {
        case "Operativo": return "operativo";
        case "En reparación": return "en-reparacion";
        case "Fuera de servicio": return "fuera-servicio";
        default: return "";
    }
}

function renderTabla() {
    const tbody = document.getElementById("activos-body");
    tbody.innerHTML = "";
    let total = 0;

    activos.forEach((a, idx) => {
        total += a.costo_total;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${a.concepto}</td>
            <td>${a.clasificacion}</td>
            <td><span class="badge ${claseEstado(a.estado)}">${a.estado}</span></td>
            <td>${a.responsable}</td>
            <td>Q ${a.costo_total.toLocaleString()}</td>
            <td>
                <button class="btn-accion" onclick="mostrarDetalle(${idx})">🔍</button>
                <button class="btn-accion" onclick="mostrarEditar(${idx})">✏️</button>
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

window.onclick = function(event) {
    if (event.target == document.getElementById("detalle-modal")) {
        cerrarModal();
    }
}

function mostrarEditar(idx) {
    const activo = activos[idx];
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

function guardarEdicion() {
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

    cerrarEditarModal();
    renderTabla();
}

// Escuchar cambios en cantidad y costo unitario
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

