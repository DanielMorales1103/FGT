function loadPage(page) {
    const content = document.getElementById('content');

    // Quitar la clase 'active' de todos los menús
    const menuItems = document.querySelectorAll('.sidebar ul li a');
    menuItems.forEach(item => item.classList.remove('active'));

    // Agregar clase 'active' al actual
    const currentMenu = document.querySelector(`#menu-${page}`);
    if (currentMenu) {
        currentMenu.classList.add('active');
    }

    // Cargar el HTML correspondiente
    fetch(`pages/${page}/index.html`)
        .then(response => response.text())
        .then(html => {
            content.innerHTML = html;

            // ---- CSS dinámico ----
            const customCssId = 'custom-css';
            let oldLink = document.getElementById(customCssId);
            if (oldLink) oldLink.remove();

            let link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `pages/${page}/style.css`;
            link.id = customCssId;
            document.head.appendChild(link);

            // ---- SCRIPT dinámico ----
            fetch(`pages/${page}/script.js`, {method: 'HEAD'})
                .then(res => {
                    if (res.ok) {
                        const scriptId = 'custom-script';
                        let oldScript = document.getElementById(scriptId);
                        if (oldScript) oldScript.remove();

                        let script = document.createElement('script');
                        script.src = `pages/${page}/script.js?t=${Date.now()}`;
                        script.id = scriptId;
                        script.async = false;
                        document.body.appendChild(script);
                    }
                });
        })
        .catch(error => {
            content.innerHTML = '<h1>Error al cargar la página</h1>';
        });
}

window.onload = () => {
    loadPage('inicio');
};
