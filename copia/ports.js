const today = new Date();
if (today.getHours() < 13) {
  today.setDate(today.getDate() - 1);
}
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
const fileName = `datos_actualizados/Ports_${yyyy}-${mm}-${dd}.json`;

fetch(fileName)
  .then(res => {
    if (!res.ok) throw new Error("Archivo no encontrado");
    return res.json();
  })
  .then(data => {
    window.ports = data;
    if (typeof drawMap === 'function') drawMap();
  })
  .catch(err => {
    console.error("Error cargando puertos desde:", fileName, err);
    window.ports = [];
    if (typeof drawMap === 'function') drawMap();
  });
