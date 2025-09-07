(() => {
  const { ipcRenderer } = require('electron');

  // Evitar que el browser abra el archivo si cae fuera del drop-zone
  ['dragover', 'drop'].forEach(evt => {
    window.addEventListener(evt, e => e.preventDefault());
  });

  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const fileInfo  = document.getElementById('file-info');
  const btnImport = document.getElementById('btn-importar');

  let selected = null; // { name, path?, buffer? }

  function setSelectedFromFile(file) {
    if (!file) return;
    selected = { name: file.name };
    if (file.path) {
      selected.path = file.path;
      fileInfo.textContent = `Listo: ${file.name}`;
      btnImport.disabled = false;
    } else {
      // Sin path -> leer buffer y guardar
      file.arrayBuffer().then(buf => {
        selected.buffer = Array.from(new Uint8Array(buf));
        fileInfo.textContent = `Listo: ${file.name}`;
        btnImport.disabled = false;
      });
    }
  }

  // Hacer clic en la zona para abrir el selector
  dropZone.addEventListener('click', () => fileInput.click());

  // Drag & drop visual
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      alert('El archivo debe ser .xlsx');
      return;
    }
    setSelectedFromFile(file);
  });

  // Selector nativo (fallback)
  fileInput.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      alert('El archivo debe ser .xlsx');
      return;
    }
    setSelectedFromFile(file);
  });

  // Importar al hacer click (recién aquí se invoca al main)
  btnImport.addEventListener('click', async () => {
    if (!selected) return;
    btnImport.disabled = true;

    try {
      const payload = {};
      if (selected.path) payload.filePath = selected.path;
      else if (selected.buffer) payload.buffer = selected.buffer;
      else throw new Error('No se recibió archivo');

      const { success, inserted, skipped_dupes, errors, message } = await ipcRenderer.invoke('import-excel', payload);

      if (!success) {
        alert('Error al importar: ' + (message || 'desconocido'));
        return;
      }

      let msg = `Importación completada.\nInsertados: ${inserted}`;
      if (typeof skipped_dupes === 'number') {
        msg += `\nDuplicados saltados: ${skipped_dupes}`;
      }
      if (errors?.length) {
        msg += `\nCon errores en ${errors.length} fila(s):\n` +
               errors.slice(0, 5).map(e => `Fila ${e.fila}: ${e.error}`).join('\n') +
               (errors.length > 5 ? '\n...' : '');
      }
      alert(msg);

      // Reset UI
      selected = null;
      fileInput.value = '';
      fileInfo.textContent = 'Ningún archivo seleccionado.';
      btnImport.disabled = true;
    } catch (err) {
      console.error(err);
      alert('Error inesperado al importar');
    } finally {
      btnImport.disabled = false;
    }
  });
})();
