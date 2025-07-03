console.log("✅ script.js de activos realmente ejecutado");
const activos = [
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

function claseEstado(estado) {
    switch (estado) {
        case "Operativo": return "operativo";
        case "En reparación": return "en-reparacion";
        case "Fuera de servicio": return "fuera-servicio";
        default: return "";
    }
}

function renderTabla() {
    console.log("🚀 Entró a renderTabla");
    console.log("activos:", activos);
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

renderTabla();
