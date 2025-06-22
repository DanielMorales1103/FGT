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

            // Opcional: si cada página tiene su propio CSS
            const customCssId = 'custom-css';
            let oldLink = document.getElementById(customCssId);
            if (oldLink) oldLink.remove();

            let link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `pages/${page}/style.css`;
            link.id = customCssId;
            document.head.appendChild(link);
        })
        .catch(error => {
            content.innerHTML = '<h1>Error al cargar la página</h1>';
            console.error(error);
        });
}

window.onload = () => {
    loadPage('inicio');
};
