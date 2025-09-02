// map.js

// Configuración del mapa
const mapConfig = {
    tileSize: 1024,      // tamaño de cada tile en píxeles
    tilesPerRow: 8,      // número de tiles por fila
    tilesPerCol: 8,      // número de tiles por columna
    tilePath: "tiles/",  // carpeta raíz de los tiles
    tileFormat: "webp"   // formato de imagen
};

// Generar la lista completa de tiles
const tiles = [];

for (let y = 0; y < mapConfig.tilesPerCol; y++) {
    for (let x = 0; x < mapConfig.tilesPerRow; x++) {
        tiles.push({
            x: x,
            y: y,
            src: `${mapConfig.tilePath}${y}/${x}.${mapConfig.tileFormat}`
        });
    }
}
