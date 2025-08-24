(() => {
    const { ipcRenderer } = require('electron');

    let cats = { clasificaciones: [], proveedores: [], estados: [], ubicaciones: {} };
    let activeTab = 'clasificaciones';
    let searchTerm = '';

    // --------- Init ----------
    (async function init() {
        await reloadCats();
        wireTabs();
        wireActions();
        renderAll();
    })();

    async function reloadCats() {
        cats = await ipcRenderer.invoke('get-catalogos');
    }

    function wireTabs() {
        document.querySelectorAll('.tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                activeTab = btn.dataset.tab;
                document.getElementById(`panel-${activeTab}`).classList.add('active');
                document.getElementById('search-input').value = '';
                searchTerm = '';
                renderActive();
            });
        });

        const search = document.getElementById('search-input');
        search.addEventListener('input', () => {
        searchTerm = (search.value || '').trim().toLowerCase();
        renderActive();
        });
    }

    function wireActions() {
        // Agregar simples
        document.getElementById('btn-add-clasificacion').addEventListener('click', () => addSimple('clasificaciones', 'add-clasificacion'));
        document.getElementById('btn-add-proveedor').addEventListener('click', () => addSimple('proveedores', 'add-proveedor'));
        document.getElementById('btn-add-estado').addEventListener('click', () => addSimple('estados', 'add-estado'));

        document.getElementById('btn-add-sede').addEventListener('click', async () => {
            const sede = (document.getElementById('new-sede').value || '').trim();
            if (!sede) return toast('Escribe el nombre de la sede', true);
            try {
                const resp = await ipcRenderer.invoke('add-catalogo-item', { catalogo: 'ubicaciones', grupo: sede, valor: '__init__' });
                if (resp?.success) {
                    cats.ubicaciones = resp.items;
                    document.getElementById('new-sede').value = '';
                    renderUbicaciones();
                    toast('Sede creada');
                } else toast('No se pudo crear la sede', true);
            } catch (e) { console.error(e); toast('Error al crear sede', true); }
        });

    }

    async function addSimple(key, inputId) {
        const val = (document.getElementById(inputId).value || '').trim();
        if (!val) return toast('Ingresa un valor', true);
        try {
            const resp = await ipcRenderer.invoke('add-catalogo-item', { catalogo: key, valor: val });
            if (resp?.success) {
                cats[key] = resp.items;
                document.getElementById(inputId).value = '';
                renderSimple(key);
                toast('Agregado');
            } else toast('No se pudo agregar', true);
        } catch (e) {
            console.error(e); toast('Error al agregar', true);
        }
    }

    // --------- Render ----------
    function renderAll() {
        renderSimple('clasificaciones');
        renderSimple('proveedores');
        renderSimple('estados');
        renderUbicaciones();
        renderCount();
    }

    function renderActive() {
        if (activeTab === 'ubicaciones') {
            renderUbicaciones();
        } else {
            renderSimple(activeTab);
        }
        renderCount();
    }

    function matchesSearch(text) {
        if (!searchTerm) return true;
        return (text || '').toLowerCase().includes(searchTerm);
    }

    function renderSimple(key) {
        const ul = document.getElementById(`list-${key}`);
        if (!ul) return;
        ul.innerHTML = '';

        const items = (cats[key] || []).filter(matchesSearch).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
        for (const value of items) {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="item-label">${value}</div>
                <div class="item-actions">
                <button class="btn danger" data-del="${value}">Eliminar</button>
                </div>`;
            ul.appendChild(li);
        }

        // delete handlers
        ul.querySelectorAll('button[data-del]').forEach(btn => {
            btn.addEventListener('click', () => {
                const value = btn.dataset.del;
                btn.blur();                   
                setTimeout(() => {            
                    deleteSimple(key, value);
                }, 0);
            });
        });
    }

    function renderUbicaciones() {
        const root = document.getElementById('accord-ubicaciones');
        root.innerHTML = '';

        const sedes = Object.keys(cats.ubicaciones || {})
            .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
            .filter(matchesSearch);

        for (const sede of sedes) {
            const card = document.createElement('div');
            card.className = 'card';

            const header = document.createElement('div');
            header.className = 'card-header';
            header.innerHTML = `
                <div class="card-title">${sede}</div>
                <div class="card-actions">
                    <input class="inp-area" data-sede="${sede}" type="text" placeholder="Nueva área para ${sede}">
                    <button class="btn primary icon btn-add-area" data-sede="${sede}">+</button>
                    <button class="btn ghost" data-toggle="${sede}">Mostrar/Ocultar</button>
                </div>
            `;

            const body = document.createElement('div');
            body.className = 'card-body';
            body.style.display = 'block';

            const areas = (cats.ubicaciones[sede] || [])
                .filter(a => a !== '__init__') // por si usaste el init
                .slice()
                .sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));

            const pills = document.createElement('div');
            for (const area of areas) {
                const pill = document.createElement('span');
                pill.className = 'pill';
                pill.innerHTML = `
                    <span>${area}</span>
                    <button class="btn danger" data-sede="${sede}" data-area="${area}">✕</button>
                `;
                pills.appendChild(pill);
            }

            body.appendChild(pills);
            card.appendChild(header);
            card.appendChild(body);
            root.appendChild(card);
        }

        // toggle mostrar/ocultar
        root.querySelectorAll('button[data-toggle]').forEach(btn => {
            btn.addEventListener('click', () => {
                const card = btn.closest('.card');
                const body = card.querySelector('.card-body');
                body.style.display = (body.style.display === 'none') ? 'block' : 'none';
            });
        });

        root.querySelectorAll('.btn-add-area').forEach(btn => {
            btn.addEventListener('click', async () => {
            const sede = btn.dataset.sede;
            const inp = root.querySelector(`.inp-area[data-sede="${sede}"]`);
            const area = (inp.value || '').trim();
            if (!area) return toast('Escribe el nombre del área', true);
            try {
                const resp = await ipcRenderer.invoke('add-catalogo-item', { catalogo: 'ubicaciones', grupo: sede, valor: area });
                if (resp?.success) {
                    cats.ubicaciones = resp.items;
                    inp.value = '';
                    renderUbicaciones();
                    toast('Área agregada');
                } else toast('No se pudo agregar', true);
            } catch (e) { console.error(e); toast('Error al agregar', true); }
            });
        });

        root.querySelectorAll('button[data-sede][data-area]').forEach(btn => {
            btn.addEventListener('click', () => {
            const sede = btn.dataset.sede;
            const area = btn.dataset.area;
            btn.blur();                  
            setTimeout(() => {           
                deleteUbicacion(sede, area);
            }, 0);
            });
        });
    }


    function renderCount() {
        const el = document.getElementById('count-label');
        if (!el) return;

        let count = 0;
        if (activeTab === 'ubicaciones') {
            const sedes = Object.keys(cats.ubicaciones || {}).filter(matchesSearch);
            count = sedes.reduce(
                (acc, s) => acc + (cats.ubicaciones[s] || []).filter(a => a !== '__init__').length,
                0
            );
        } else {
            count = (cats[activeTab] || []).filter(matchesSearch).length;
        }
        el.textContent = `${count} elemento${count === 1 ? '' : 's'}`;
    }


    // --------- Deletes ----------
    async function deleteSimple(key, value) {
        if (!confirm(`¿Eliminar "${value}" de ${key}?`)) return;
        try {
            const resp = await ipcRenderer.invoke('delete-catalogo-item', { catalogo: key, valor: value });
            if (resp?.success) {
                cats[key] = resp.items;
                renderSimple(key);
                toast('Eliminado');
            } else toast('No se pudo eliminar', true);
        } catch (e) {
            console.error(e); toast('Error al eliminar', true);
        }
    }

    async function deleteUbicacion(sede, area) {
        if (!confirm(`¿Eliminar el área "${area}" de "${sede}"?`)) return;
        try {
            const resp = await ipcRenderer.invoke('delete-catalogo-item', { catalogo: 'ubicaciones', grupo: sede, valor: area });
            if (resp?.success) {
                cats.ubicaciones = resp.items;
                renderUbicaciones();
                toast('Eliminado');
            } else toast('No se pudo eliminar', true);
        } catch (e) {
            console.error(e); toast('Error al eliminar', true);
        }
    }

    // --------- Toast ----------
    let toastTimer = null;
    function toast(msg, isError=false) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.style.background = isError ? '#c0392b' : '#333';
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
    }
})();
