async function obtenerFechaMasReciente() {
  try {
    const respuesta = await fetch('datos_actualizados/');
    const texto = await respuesta.text();

    // Extraer nombres de archivos tipo Ports_YYYY-MM-DD.json
    const coincidencias = [...texto.matchAll(/Ports_(\\d{4}-\\d{2}-\\d{2})\\.json/g)];
    const fechas = coincidencias.map(m => m[1]);

    if (fechas.length === 0) {
      console.error("No se encontraron archivos Ports en la carpeta.");
      return null;
    }

    // Ordenar fechas de más reciente a más antigua
    fechas.sort((a, b) => new Date(b) - new Date(a));
    return fechas[0]; // La más reciente
  } catch (error) {
    console.error("Error al listar archivos:", error);
    return null;
  }
}
