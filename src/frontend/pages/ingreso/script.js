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
