(() => {
  const canvas = document.getElementById("map-canvas");
  const ctx = canvas.getContext("2d");
  const tooltip = document.getElementById("tooltip");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let scale = 0.25;
  let offsetX = (canvas.width - mapConfig.tilesPerRow * mapConfig.tileSize * scale) / 2;
  let offsetY = (canvas.height - mapConfig.tilesPerCol * mapConfig.tileSize * scale) / 2;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  const tileImages = [];
  let tilesLoaded = 0;
  let portsLoaded = false;
  let iconosListos = false;

  const imagenesPorId = {
    0: "imagenes/neu.svg",
    1: "imagenes/pir.svg",
    2: "imagenes/esp.svg",
    3: "imagenes/fra.svg",
    4: "imagenes/ing.svg",
    5: "imagenes/ind.svg"
  };

  const iconosCargados = {};

  function cargarIconos(callback) {
    const ids = Object.keys(imagenesPorId);
    let cargados = 0;

    ids.forEach(id => {
      const img = new Image();
      img.src = imagenesPorId[id];
      img.onload = () => {
        iconosCargados[id] = img;
        cargados++;
        if (cargados === ids.length) {
          iconosListos = true;
          callback();
        }
      };
      img.onerror = () => {
        console.warn(`No se pudo cargar la imagen para NationId ${id}`);
        cargados++;
        if (cargados === ids.length) {
          iconosListos = true;
          callback();
        }
      };
    });
  }

  const now = new Date();
  if (now.getHours() < 13) now.setDate(now.getDate() - 1);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateSuffix = `${yyyy}-${mm}-${dd}`;

  const datasets = {
    ports: `datos_actualizados/Ports_${dateSuffix}.json`,
    itemTemplates: `datos_actualizados/ItemTemplates_${dateSuffix}.json`,
    shops: `datos_actualizados/Shops_${dateSuffix}.json`,
    nations: `datos_actualizados/Nations_${dateSuffix}.json`
  };

  Object.entries(datasets).forEach(([key, path]) => {
    fetch(path)
      .then(res => {
        if (!res.ok) throw new Error(`Archivo no encontrado: ${path}`);
        return res.json();
      })
      .then(data => {
        if (key === "ports") {
          window.portsRaw = data;
          portsLoaded = true;
          checkReadyToDraw();
        } else if (key === "nations") {
          const nationsArray = Array.isArray(data) ? data : data.Nations ?? [];
          window.nations = nationsArray;

          window.ports = window.portsRaw.map(p => {
            const nationId = p.Nation ?? 0;
            const nation = window.nations.find(n => n.Id === nationId);
            return {
              ...p,
              name: p.Name,
              coordinates: [p.sourcePosition.x, p.sourcePosition.y],
              countyCapital: p.Capital || false,
              nationId,
              nationName: nation?.Name ?? "Neutral"
            };
          });

          portsLoaded = true;
          checkReadyToDraw();
        } else {
          window[key] = data;
        }
      })
      .catch(err => {
        console.error(`❌ Error cargando ${key}:`, err);
        window[key] = [];
        if (key === "ports") {
          portsLoaded = true;
          checkReadyToDraw();
        }
      });
  });

  tiles.forEach((tile, index) => {
    const img = new Image();
    img.src = tile.src;
    img.onload = () => {
      tilesLoaded++;
      tileImages[index] = img;
      checkReadyToDraw();
    };
    img.onerror = () => console.error("Error cargando tile:", tile.src);
  });

  cargarIconos(checkReadyToDraw);

  function checkReadyToDraw() {
    if (tilesLoaded === tiles.length && portsLoaded && iconosListos) {
      drawMap();
    }
  }

  function drawMap() {
    if (!Array.isArray(window.ports)) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    tileImages.forEach((img, index) => {
      const x = (index % mapConfig.tilesPerRow) * mapConfig.tileSize;
      const y = Math.floor(index / mapConfig.tilesPerRow) * mapConfig.tileSize;
      ctx.drawImage(img, x, y, mapConfig.tileSize, mapConfig.tileSize);
    });

    window.ports.forEach(port => {
      const [x, y] = port.coordinates;
      if (typeof x !== "number" || typeof y !== "number") return;

      const icono = iconosCargados[port.nationId];
      if (icono) {
        ctx.drawImage(icono, x - 16, y - 16, 32, 32);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = port.countyCapital ? 'red' : 'yellow';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#222';
        ctx.stroke();
      }

      if (scale > 0.3 && port.name) {
        ctx.font = `14px Arial`;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(port.name, x + 12, y + 5);
        ctx.fillText(port.name, x + 12, y + 5);

        ctx.font = `12px Arial`;
        ctx.fillStyle = '#ccc';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(port.nationName, x + 12, y + 20);
        ctx.fillText(port.nationName, x + 12, y + 20);
      }
    });

    ctx.restore();
  }

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;
    const prevScale = scale;

    scale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;

    offsetX = mouseX - (mouseX - offsetX) * (scale / prevScale);
    offsetY = mouseY - (mouseY - offsetY) * (scale / prevScale);

    drawMap();
  });

  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartX = e.clientX - offsetX;
    dragStartY = e.clientY - offsetY;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (isDragging) {
      offsetX = e.clientX - dragStartX;
      offsetY = e.clientY - dragStartY;
      drawMap();
      tooltip.style.display = "none";
      return;
    }

    const mouseX = (e.clientX - offsetX) / scale;
    const mouseY = (e.clientY - offsetY) / scale;

    let hoveredPort = null;

    for (const port of window.ports) {
      const [x, y] = port.coordinates;
      const dx = mouseX - x;
      const dy = mouseY - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 16) {
        hoveredPort = port;
        break;
      }
    }

    if (hoveredPort) {
      const screenX = hoveredPort.coordinates[0] * scale + offsetX;
      const screenY = hoveredPort.coordinates[1] * scale + offsetY;

      tooltip.style.display = "block";
      tooltip.style.left = `${screenX + 10}px`;
      tooltip.style.top = `${screenY - 40}px`;
      tooltip.innerHTML = `
        <strong>${hoveredPort.name}</strong><br>
        Nación: ${hoveredPort.nationName}<br>
        Clan: ${hoveredPort.Capturer ?? "Sin clan"}<br>
        ${hoveredPort.countyCapital ? "🏛 Capital regional" : ""}
      `;
    } else {
      tooltip.style.display = "none";
    }
  });

  canvas.addEventListener("mouseup", () => isDragging = false);
  canvas.addEventListener("mouseleave", () => tooltip.style.display = "none");
})();
