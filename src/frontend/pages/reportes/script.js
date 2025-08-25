const { ipcRenderer } = require('electron');

let reportesData = {};
let charts = {};

// Cargar reportes al iniciar
cargarReportes();

async function cargarReportes() {
    try {
        reportesData = await ipcRenderer.invoke('get-reportes');
        actualizarUI();
        crearGraficas();
    } catch (error) {
        console.error('Error cargando reportes:', error);
    }
}

function actualizarUI() {
    // Total general
    document.getElementById('total-general').textContent = 
        `Q ${reportesData.totalGeneral.toLocaleString('es-GT', {minimumFractionDigits: 2})}`;
    
    // Total activos
    document.getElementById('total-activos').textContent = 
        reportesData.totalActivos.toLocaleString();

    // Tabla por categoría
    const tablaCategoria = document.querySelector('#tabla-categoria tbody');
    tablaCategoria.innerHTML = '';
    
    Object.entries(reportesData.porCategoria)
        .sort((a, b) => b[1] - a[1])
        .forEach(([categoria, valor]) => {
            const porcentaje = ((valor / reportesData.totalGeneral) * 100).toFixed(1);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${categoria}</td>
                <td>Q ${valor.toLocaleString('es-GT', {minimumFractionDigits: 2})}</td>
                <td>${porcentaje}%</td>
            `;
            tablaCategoria.appendChild(tr);
        });

    // Tabla por ubicación
    const tablaUbicacion = document.querySelector('#tabla-ubicacion tbody');
    tablaUbicacion.innerHTML = '';
    
    Object.entries(reportesData.porUbicacion)
        .sort((a, b) => b[1] - a[1])
        .forEach(([ubicacion, valor]) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ubicacion}</td>
                <td>Q ${valor.toLocaleString('es-GT', {minimumFractionDigits: 2})}</td>
            `;
            tablaUbicacion.appendChild(tr);
        });
}

function crearGraficas() {
    // Destruir gráficas existentes
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};

    // Gráfica por categoría (doughnut)
    charts.categoria = new Chart(document.getElementById('grafica-categoria'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(reportesData.porCategoria),
            datasets: [{
                data: Object.values(reportesData.porCategoria),
                backgroundColor: [
                    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
                    '#1abc9c', '#d35400', '#34495e', '#7f8c8d', '#27ae60'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });

    // Gráfica por ubicación (bar)
    charts.ubicacion = new Chart(document.getElementById('grafica-ubicacion'), {
        type: 'bar',
        data: {
            labels: Object.keys(reportesData.porUbicacion),
            datasets: [{
                label: 'Valor por Ubicación',
                data: Object.values(reportesData.porUbicacion),
                backgroundColor: '#3498db'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // Gráfica temporal (línea)
    crearGraficaTemporal('mensual');
}

function crearGraficaTemporal(tipo) {
    const data = tipo === 'mensual' ? reportesData.porMes : reportesData.porAnio;
    const labels = Object.keys(data).sort();
    const values = labels.map(label => data[label]);

    charts.temporal = new Chart(document.getElementById('grafica-temporal'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: tipo === 'mensual' ? 'Compras Mensuales' : 'Compras Anuales',
                data: values,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Manejar tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        crearGraficaTemporal(btn.dataset.tab);
    });
});

// Actualizar reportes
document.getElementById('btn-actualizar-reportes').addEventListener('click', cargarReportes);

// Exportar a Excel
document.getElementById('btn-exportar-reportes').addEventListener('click', async () => {
    await ipcRenderer.invoke('exportar-reportes', reportesData);
});