(async () => {
    // --- CONFIGURACIÓN DEL MAPA ---
    const mapConfig = { tileSize: 1024, tilesPerRow: 8, tilesPerCol: 8, tilePath: "tiles/", tileFormat: "webp" };
    const tiles = [];
    for (let y = 0; y < mapConfig.tilesPerCol; y++) {
        for (let x = 0; x < mapConfig.tilesPerRow; x++) {
            tiles.push({ src: `${mapConfig.tilePath}${y}/${x}.${mapConfig.tileFormat}` });
        }
    }

    // --- REFERENCIAS AL DOM ---
    const canvas = document.getElementById("map-canvas");
    if (!canvas) { console.error("Canvas no encontrado."); return; }
    const ctx = canvas.getContext("2d");
    const tooltip = document.getElementById("tooltip"), portPanel = document.getElementById("portPanel"), portPanelTitle = document.getElementById("port-panel-title"), closePanelButton = document.getElementById("close-panel-button"), tabsContainer = document.querySelector(".tabs"), tabContents = { battle: document.getElementById("battle"), trade: document.getElementById("trade") }, mapContainer = document.getElementById("map-container");
    const battleMenuToggle = document.getElementById("battle-menu-toggle"), tradeMenuToggle = document.getElementById("trade-menu-toggle"), craftingMenuToggle = document.getElementById("crafting-menu-toggle"), windPredictorToggle = document.getElementById("wind-predictor-toggle");
    const battleMenu = document.getElementById("battle-menu"), tradeMenu = document.getElementById("trade-menu"), craftingMenu = document.getElementById("crafting-menu");
    const portSearchInput = document.getElementById("port-search-input"), portSearchResults = document.getElementById("port-search-results");
    const routeFinderInput = document.getElementById("route-finder-input"), routeFinderResults = document.getElementById("route-finder-results");
    const recipeFinderInput = document.getElementById("recipe-finder-input"), recipeFinderResults = document.getElementById("recipe-finder-results"), specialPortsList = document.getElementById("special-ports-list");
    const raidAlertsContainer = document.getElementById("raid-alerts");
    const spanishDefensesList = document.getElementById("spanish-defenses-list");
    const attackTargetsList = document.getElementById("attack-targets-list");
    const statsToggle = document.getElementById("stats-toggle"), statsMenu = document.getElementById("stats-menu"), nationDominanceList = document.getElementById("nation-dominance-list"), tradeHubsList = document.getElementById("trade-hubs-list"), clanPowerList = document.getElementById("clan-power-list");
    const materialPanel = document.getElementById("materialPanel"), materialPanelTitle = document.getElementById("material-panel-title"), closeMaterialPanelButton = document.getElementById("close-material-panel-button"), materialListContainer = document.getElementById("material-list-container");
    const modalOverlay = document.getElementById("modal-overlay");
    const windPredictorModal = document.getElementById("wind-predictor-modal");
    const closeWindPredictorButton = document.getElementById("close-wind-predictor-button");
    const currentServerTimeInput = document.getElementById("current-server-time");
    const currentWindDirectionSelect = document.getElementById("current-wind-direction");
    const futurePredictionTimeInput = document.getElementById("future-prediction-time");
    const calculateWindButton = document.getElementById("calculate-wind-button");
    const predictedWindText = document.getElementById("predicted-wind-text");
    const predictedWindDegrees = document.getElementById("predicted-wind-degrees");
    const windArrowContainer = document.getElementById("wind-arrow-container");
    const productFinderInput = document.getElementById("product-finder-input");
    const productFinderResults = document.getElementById("product-finder-results");
    const predictedInverseText = document.getElementById("predicted-inverse-text");
    const predictedInverseDegrees = document.getElementById("predicted-inverse-degrees");
    
    const battleInfo = { clan: document.getElementById("battleClan"), countdown: document.getElementById("battleCountdown"), lastBattleDate: document.getElementById("lastBattleDate"), brLimit: document.getElementById("battle-br-limit"), points: document.getElementById("port-points"), window: document.getElementById("battle-window"), defenses: document.getElementById("port-defenses") };
    const tradeInfo = { sorters: document.getElementById("trade-sorters"), items: document.getElementById("tradeItems"), summaryTax: document.getElementById("trade-tax"), summaryVolume: document.getElementById("trade-volume") };

    // --- ESTADO DE LA APLICACIÓN ---
    const state = {
        ports: [], nations: [], shops: [], itemTemplatesMap: new Map(), tileImages: [], nationIcons: {},
        itemTradeDatabase: new Map(),
        itemLocationDatabase: new Map(),
        selectedTradeRoute: null,
        recipes: [],
        searchableRecipes: [],
        buildingMap: new Map(), specialPorts: [],
        scale: 0.25, offsetX: 0, offsetY: 0,
        isDragging: false, dragStartX: 0, dragStartY: 0,
        mouseDownPos: { x: 0, y: 0 }, isClick: false, battleCountdownInterval: null,
        currentPortItems: [], currentSort: { key: 'name', asc: true },
        raidAlertPorts: []
    };

    const imagenesPorId = { 0: "imagenes/neu.svg", 1: "imagenes/pir.svg", 2: "imagenes/esp.svg", 3: "imagenes/fra.svg", 4: "imagenes/ing.svg", 5: "imagenes/ind.svg" };

    const windDirections = [
        { name: "Norte", abbr: "N", degrees: 0 }, { name: "Nornoreste", abbr: "NNE", degrees: 22.5 }, { name: "Noreste", abbr: "NE", degrees: 45 }, { name: "Estenoreste", abbr: "ENE", degrees: 67.5 },
        { name: "Este", abbr: "E", degrees: 90 }, { name: "Estesureste", abbr: "ESE", degrees: 112.5 }, { name: "Sureste", abbr: "SE", degrees: 135 }, { name: "Sursureste", abbr: "SSE", degrees: 157.5 },
        { name: "Sur", abbr: "S", degrees: 180 }, { name: "Sursuroeste", abbr: "SSW", degrees: 202.5 }, { name: "Suroeste", abbr: "SW", degrees: 225 }, { name: "Oestesuroeste", abbr: "WSW", degrees: 247.5 },
        { name: "Oeste", abbr: "W", degrees: 270 }, { name: "Oestenoroeste", abbr: "WNW", degrees: 292.5 }, { name: "Noroeste", abbr: "NW", degrees: 315 }, { name: "Nornoroeste", abbr: "NNW", degrees: 337.5 }
    ];

    // --- LÓGICA DE CARGA DE RECURSOS ---
    async function loadAssets() {
        const loadImage = (src) => new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => { console.warn(`No se pudo cargar: ${src}`); resolve(null); }; img.src = src; });
        const fetchJsonWithFallback = async (basePath) => {
            const now = new Date();
            const yyyy_today = now.getFullYear(), mm_today = String(now.getMonth() + 1).padStart(2, '0'), dd_today = String(now.getDate()).padStart(2, '0');
            const todaySuffix = `${yyyy_today}-${mm_today}-${dd_today}`;
            try {
                const response = await fetch(`${basePath}_${todaySuffix}.json`);
                if (!response.ok) throw new Error('File for today not found');
                return await response.json();
            } catch (e) {
                console.warn(`No se encontró el archivo de hoy (${todaySuffix}), intentando con el de ayer.`);
                const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
                const yyyy_yesterday = yesterday.getFullYear(), mm_yesterday = String(yesterday.getMonth() + 1).padStart(2, '0'), dd_yesterday = String(yesterday.getDate()).padStart(2, '0');
                const yesterdaySuffix = `${yyyy_yesterday}-${mm_yesterday}-${dd_yesterday}`;
                try {
                    const response = await fetch(`${basePath}_${yesterdaySuffix}.json`);
                    if (!response.ok) throw new Error(`File for yesterday also not found`);
                    return await response.json();
                } catch (err) { console.error(`Fallo crítico cargando ${basePath}`, err); return []; }
            }
        };
        try {
            const [portsRaw, nationsData, shopsData, itemTemplatesData, tileImages, nationIcons] = await Promise.all([
                fetchJsonWithFallback(`datos_actualizados/Ports`), fetchJsonWithFallback(`datos_actualizados/Nations`), fetchJsonWithFallback(`datos_actualizados/Shops`), fetchJsonWithFallback(`datos_actualizados/ItemTemplates`),
                Promise.all(tiles.map(tile => loadImage(tile.src))), Promise.all(Object.entries(imagenesPorId).map(([id, src]) => loadImage(src).then(img => ({ id, img })).catch(() => ({ id, img: null }))))
            ]);
            state.tileImages = tileImages.filter(img => img); nationIcons.filter(icon => icon.img).forEach(icon => state.nationIcons[icon.id] = icon.img);
            const nationsList = Array.isArray(nationsData) ? nationsData : nationsData.Nations ?? [];
            state.nations = nationsList; state.shops = shopsData; state.itemTemplatesMap = new Map(itemTemplatesData.map(item => [item.Id, item]));
            state.ports = portsRaw.map(p => { 
                const nationId = p.Nation ?? 0; 
                const nation = nationsList.find(n => n.Id === nationId);
                const hasValidCoords = p.sourcePosition && typeof p.sourcePosition.x === 'number' && typeof p.sourcePosition.y === 'number';
                return { ...p, name: p.Name, coordinates: hasValidCoords ? [p.sourcePosition.x, p.sourcePosition.y] : null, countyCapital: p.Capital || false, nationId, nationName: nation?.Name ?? "Neutral" }; 
            });
        } catch (error) { console.error("❌ Fallo en Promise.all:", error); ctx.font = "16px Arial"; ctx.fillStyle = "red"; ctx.fillText("Error al cargar datos.", 20, 40); }
    }

    // --- LÓGICA DE DIBUJADO Y ANIMACIÓN ---
    let lineDashOffset = 0;
    function animationLoop() { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.translate(state.offsetX, state.offsetY); ctx.scale(state.scale, state.scale); state.tileImages.forEach((img, index) => { if (img) { const x = (index % mapConfig.tilesPerRow) * mapConfig.tileSize, y = Math.floor(index / mapConfig.tilesPerRow) * mapConfig.tileSize; ctx.drawImage(img, x, y, mapConfig.tileSize, mapConfig.tileSize); } }); drawTradeRoute(); state.ports.forEach(port => drawPort(port)); drawRaidAlerts(); ctx.restore(); requestAnimationFrame(animationLoop); }
    function drawPort(port) { if (!port.coordinates) return; const [x, y] = port.coordinates; const icon = state.nationIcons[port.nationId]; if (icon) { ctx.drawImage(icon, x - 16, y - 16, 32, 32); } else { ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI); ctx.fillStyle = port.countyCapital ? 'red' : 'yellow'; ctx.fill(); } if (state.scale > 0.3 && port.name) { ctx.font = `bold 14px Arial`; ctx.fillStyle = 'white'; ctx.strokeStyle = 'black'; ctx.lineWidth = 3; ctx.strokeText(port.name, x + 16, y + 5); ctx.fillText(port.name, x + 16, y + 5); } }
    function drawRaidAlerts() { if (state.raidAlertPorts.length === 0) return; const pulse = Math.abs(Math.sin(Date.now() * 0.002)) * 8; const radius = 25 + pulse; ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; ctx.lineWidth = 3 / state.scale; state.raidAlertPorts.forEach(port => { if (!port.coordinates) return; const [x, y] = port.coordinates; ctx.beginPath(); ctx.arc(x, y, radius, 0, 2 * Math.PI); ctx.stroke(); }); }
    function drawTradeRoute() { if (!state.selectedTradeRoute) return; const { buyPort, sellPort } = state.selectedTradeRoute; ctx.beginPath(); ctx.setLineDash([15 / state.scale, 10 / state.scale]); lineDashOffset -= 0.2; ctx.lineDashOffset = lineDashOffset; ctx.moveTo(buyPort.coordinates[0], buyPort.coordinates[1]); ctx.lineTo(sellPort.coordinates[0], sellPort.coordinates[1]); ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 3 / state.scale; ctx.stroke(); ctx.setLineDash([]); }

    // --- MANEJADORES DE EVENTOS ---
    const closeEverything = () => {
        battleMenu.classList.add('hidden');
        tradeMenu.classList.add('hidden');
        craftingMenu.classList.add('hidden');
        statsMenu.classList.add('hidden');
        modalOverlay.classList.add('hidden');
        windPredictorModal.classList.add('hidden');
        const wasRaidActive = battleMenuToggle.classList.contains('raid-active');
        battleMenuToggle.classList.remove('active', 'raid-active');
        if (wasRaidActive) battleMenuToggle.classList.add('raid-active');
        tradeMenuToggle.classList.remove('active');
        craftingMenuToggle.classList.remove('active');
        statsToggle.classList.remove('active');
        windPredictorToggle.classList.remove('active');
        state.selectedTradeRoute = null;
    };
    function handleResize() { canvas.width = mapContainer.clientWidth; canvas.height = mapContainer.clientHeight; state.offsetX = (canvas.width - mapConfig.tilesPerRow * mapConfig.tileSize * state.scale) / 2; state.offsetY = (canvas.height - mapConfig.tilesPerCol * mapConfig.tileSize * state.scale) / 2; }
    function handleWheel(e) { e.preventDefault(); hidePortPanel(); state.selectedTradeRoute = null; const zoomFactor = 1.1; const mouseX = e.offsetX, mouseY = e.offsetY; const prevScale = state.scale; state.scale = e.deltaY < 0 ? state.scale * zoomFactor : state.scale / zoomFactor; state.offsetX = mouseX - (mouseX - state.offsetX) * (state.scale / prevScale); state.offsetY = mouseY - (mouseY - state.offsetY) * (state.scale / prevScale); }
    function handleMouseDown(e) { state.isClick = true; state.mouseDownPos = { x: e.clientX, y: e.clientY }; state.isDragging = true; state.dragStartX = e.clientX - state.offsetX; state.dragStartY = e.clientY - state.offsetY; state.selectedTradeRoute = null; }
    function handleMouseUp() { state.isDragging = false; canvas.style.cursor = 'grab'; }
    function handleMouseMove(e) { if (state.isDragging) { if (Math.hypot(e.clientX - state.mouseDownPos.x, e.clientY - state.mouseDownPos.y) > 5) { state.isClick = false; } if (!state.isClick) { canvas.style.cursor = 'grabbing'; state.offsetX = e.clientX - state.dragStartX; state.offsetY = e.clientY - state.dragStartY; tooltip.style.display = "none"; } return; } const mouseX = (e.offsetX - state.offsetX) / state.scale, mouseY = (e.offsetY - state.offsetY) / state.scale; let hoveredPort = null; for (const port of state.ports) { if (!port.coordinates) continue; const [x, y] = port.coordinates; if (Math.hypot(mouseX - x, mouseY - y) < 16) { hoveredPort = port; break; } } if (hoveredPort) { canvas.style.cursor = 'pointer'; tooltip.style.display = 'block'; tooltip.style.left = `${e.clientX + 15}px`; tooltip.style.top = `${e.clientY + 15}px`; const depthText = hoveredPort.Depth === 1 ? 'Aguas Someras' : 'Aguas Profundas'; const depthClass = hoveredPort.Depth === 1 ? 'depth-shallow' : 'depth-deep'; tooltip.innerHTML = `<strong>${hoveredPort.name}</strong><br>Nación: ${hoveredPort.nationName}<br>Clan: ${hoveredPort.Capturer ?? 'Ninguno'}<br>Límite BR: ${hoveredPort.PortBattleBRLimit ?? 'N/A'}<br><span class="${depthClass}">${depthText}</span>`; } else { canvas.style.cursor = 'grab'; tooltip.style.display = 'none'; } }
    function handleClick(e) {
        if (!state.isClick) return;
        const mouseX = (e.offsetX - state.offsetX) / state.scale;
        const mouseY = (e.offsetY - state.offsetY) / state.scale;
        let clickedPort = null;
        for (const port of state.ports) {
            if (!port.coordinates) continue;
            const [x, y] = port.coordinates;
            if (Math.hypot(mouseX - x, mouseY - y) < 16) {
                clickedPort = port;
                break;
            }
        }
        if (clickedPort) {
            e.stopPropagation(); 
            showPortPanel(clickedPort);
        } else {
            hidePortPanel();
            closeEverything();
        }
    }

    // --- FUNCIONES DEL PANEL Y MENÚ ---
    function showPortPanel(port) { tooltip.style.display = "none"; portPanel.classList.remove('hidden'); portPanelTitle.textContent = port.name; battleInfo.clan.textContent = port.Capturer ?? 'Ninguno'; updateBattleTimers(port); battleInfo.brLimit.textContent = port.PortBattleBRLimit ?? 'N/A'; battleInfo.points.textContent = port.PortPoints ?? 'N/A'; const startTime = port.PortBattleStartTime, length = port.PortBattleTimeSlotLength; if (startTime !== undefined && length !== undefined) { const endTime = startTime + length; battleInfo.window.textContent = `${startTime}:00 - ${endTime}:00 UTC`; } else { battleInfo.window.textContent = 'N/A'; } if (port.PortElements && port.PortElements.length > 0) { battleInfo.defenses.innerHTML = port.PortElements.map(def => `<li>${def.TemplateName}</li>`).join(''); } else { battleInfo.defenses.innerHTML = '<li>Sin defensas</li>'; } const shop = state.shops.find(s => s.Id === port.Id); let totalVolume = 0; if (shop && shop.RegularItems) { state.currentPortItems = shop.RegularItems.map(item => { const details = state.itemTemplatesMap.get(item.TemplateId); totalVolume += item.Quantity; return { ...item, name: details ? details.Name.trim() : `ID:${item.TemplateId}` }; }); } else { state.currentPortItems = []; } tradeInfo.summaryTax.textContent = `${(port.PortTax * 100).toFixed(0)}%`; tradeInfo.summaryVolume.textContent = totalVolume.toLocaleString(); sortAndRenderTradeItems(); switchTab('battle'); }
    function hidePortPanel() { portPanel.classList.add('hidden'); if (state.battleCountdownInterval) { clearInterval(state.battleCountdownInterval); state.battleCountdownInterval = null; } }
    const TicksToDate = (ticks) => new Date((Number(BigInt(ticks) - BigInt(621355968000000000)) / 10000));
    function updateBattleTimers(port) { if (state.battleCountdownInterval) clearInterval(state.battleCountdownInterval); if (port.LastPortBattle && port.LastPortBattle > 0) { battleInfo.lastBattleDate.textContent = TicksToDate(port.LastPortBattle).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } else { battleInfo.lastBattleDate.textContent = 'N/A'; } 
        if (!port.PortBattleEnd) {
            battleInfo.countdown.textContent = 'No programada';
            return;
        }
        const battleStartTime = TicksToDate(port.PortBattleEnd); 
        if (!battleStartTime || battleStartTime < new Date()) { battleInfo.countdown.textContent = 'No programada'; return; } const battleEndTime = new Date(battleStartTime.getTime() + (port.PortBattleTimeSlotLength * 3600000)); const updateCountdown = () => { const now = Date.now(); const diff = battleStartTime - now; if (diff <= 0) { if (now > battleEndTime) { battleInfo.countdown.textContent = "Finalizada"; clearInterval(state.battleCountdownInterval); } else { battleInfo.countdown.textContent = "¡EN CURSO!"; } return; } const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000); battleInfo.countdown.textContent = `${d}d ${h}h ${m}m ${s}s`; }; updateCountdown(); state.battleCountdownInterval = setInterval(updateCountdown, 1000); 
    }
    function sortAndRenderTradeItems() { const { key, asc } = state.currentSort; const sortedItems = [...state.currentPortItems].sort((a, b) => { let valA, valB; switch(key) { case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break; case 'quantity': valA = a.Quantity; valB = b.Quantity; break; case 'buy': valA = a.BuyPrice; valB = b.BuyPrice; break; case 'sell': valA = a.SellPrice; valB = b.SellPrice; break; } if (valA < valB) return asc ? -1 : 1; if (valA > valB) return asc ? 1 : -1; return 0; }); const itemsHtml = sortedItems.map(item => `<li><span class="item-name" title="${item.name}">${item.name}</span><span class="item-details">Cant: ${item.Quantity.toLocaleString()} | <span class="price-buy">${item.BuyPrice.toLocaleString()}</span> / <span class="price-sell">${item.SellPrice.toLocaleString()}</span></span></li>`).join(''); tradeInfo.items.innerHTML = itemsHtml || '<li>No hay objetos en venta.</li>'; }
    function switchTab(tabId) { tabsContainer.querySelectorAll('.tab-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.tab === tabId); }); Object.values(tabContents).forEach(content => { content.classList.toggle('hidden', content.id !== tabId); }); }
    
    function panToPort(port) {
        if (!port.coordinates) return;
        closeEverything();
        const targetScale = 0.5;
        state.scale = targetScale;
        state.offsetX = (canvas.width / 2) - (port.coordinates[0] * targetScale);
        state.offsetY = (canvas.height / 2) - (port.coordinates[1] * targetScale);
        showPortPanel(port);
    }

    function panAndZoomToRoute(route) { if (!route.buyPort.coordinates || !route.sellPort.coordinates) { return; } const { buyPort, sellPort } = route; const [x1, y1] = buyPort.coordinates; const [x2, y2] = sellPort.coordinates; const midX = (x1 + x2) / 2; const midY = (y1 + y2) / 2; const dist = Math.hypot(x2 - x1, y2 - y1) * 1.2; const scaleX = canvas.width / dist; const scaleY = canvas.height / dist; state.scale = Math.min(scaleX, scaleY, 1.0); state.offsetX = (canvas.width / 2) - (midX * state.scale); state.offsetY = (canvas.height / 2) - (midY * state.scale); state.selectedTradeRoute = route; closeEverything();}
    function showMaterialLocations(recipeName, materials) { materialPanelTitle.textContent = `Materiales para: ${recipeName}`; let html = ''; for (const req of materials) { const materialDetails = state.itemTemplatesMap.get(req.Template); const materialName = materialDetails ? materialDetails.Name : `ID: ${req.Template}`; const tradeData = state.itemTradeDatabase.get(req.Template); html += `<div class="material-item">`; html += `<h4>${req.Amount} x ${materialName}</h4>`; if (tradeData && tradeData.buyLocations.length > 0) { const cheapestPorts = tradeData.buyLocations.sort((a, b) => a.price - b.price).slice(0, 5); html += `<ul>`; cheapestPorts.forEach(port => { html += `<li>${port.portName} - <span class="price-buy">${port.price.toLocaleString()}</span></li>`; }); html += `</ul>`; } else { html += `<p>No se encontraron puertos de venta para este material.</p>`; } html += `</div>`; } materialListContainer.innerHTML = html; modalOverlay.classList.remove('hidden'); materialPanel.classList.remove('hidden'); }
    
    function buildItemTradeDatabase() { state.shops.forEach(shop => { const port = state.ports.find(p => p.Id === shop.Id); if (!port || !port.coordinates) return; (shop.RegularItems || []).forEach(item => { const itemDetails = state.itemTemplatesMap.get(item.TemplateId); if (itemDetails) { const entry = state.itemTradeDatabase.get(item.TemplateId) || { name: itemDetails.Name.trim(), buyLocations: [], sellLocations: [] }; if (item.BuyPrice > 0 && item.Quantity > 0) { entry.buyLocations.push({ portId: port.Id, portName: port.name, price: item.BuyPrice, coordinates: port.coordinates }); } if (item.SellPrice > 0) { entry.sellLocations.push({ portId: port.Id, portName: port.name, price: item.SellPrice, coordinates: port.coordinates }); } state.itemTradeDatabase.set(item.TemplateId, entry); } }); }); }
    function buildItemLocationDatabase() {
        state.shops.forEach(shop => {
            const port = state.ports.find(p => p.Id === shop.Id);
            if (!port) return;
            (shop.RegularItems || []).forEach(item => {
                const itemDetails = state.itemTemplatesMap.get(item.TemplateId);
                if (itemDetails) {
                    const entry = state.itemLocationDatabase.get(item.TemplateId) || { name: itemDetails.Name.trim(), locations: [] };
                    entry.locations.push({
                        portId: port.Id,
                        portName: port.name,
                        quantity: item.Quantity,
                        buyPrice: item.BuyPrice,
                        sellPrice: item.SellPrice
                    });
                    state.itemLocationDatabase.set(item.TemplateId, entry);
                }
            });
        });
    }

    function populateTopProfitItems() { const topProfitItems = []; state.itemTradeDatabase.forEach((item, itemId) => { if (item.buyLocations.length > 0 && item.sellLocations.length > 0) { const minBuyPrice = Math.min(...item.buyLocations.map(loc => loc.price)); const maxSellPrice = Math.max(...item.sellLocations.map(loc => loc.price)); const profit = maxSellPrice - minBuyPrice; if (profit > 0) { topProfitItems.push({ name: item.name, profit: profit }); } } }); topProfitItems.sort((a, b) => b.profit - a.profit); const top10 = topProfitItems.slice(0, 10); const topProfitList = document.getElementById("top-profit-list"); topProfitList.innerHTML = top10.map(item => `<li><span class="top-item-name">${item.name}</span><span class="top-item-profit">+${item.profit.toLocaleString()}</span></li>`).join(''); topProfitList.querySelectorAll('li').forEach(li => { li.addEventListener('click', () => { const itemName = li.querySelector('.top-item-name').textContent; routeFinderInput.value = itemName; routeFinderInput.dispatchEvent(new Event('input')); }); }); }
    
    function populateBattleIntelligence() {
        const now = new Date(); const SPANISH_NATION_ID = 2; const dateOptions = { day: '2-digit', month: 'short' };
        state.raidAlertPorts = state.ports.filter(p => {
            if (!p.LastRaidStartTime || p.LastRaidStartTime <= 0) return false;
            const raidDate = TicksToDate(p.LastRaidStartTime);
            return raidDate.getTime() > (now.getTime() - (4 * 60 * 60 * 1000));
        });
        if (state.raidAlertPorts.length > 0) {
            raidAlertsContainer.innerHTML = state.raidAlertPorts.map(p => `<div class="alert" data-port-id="${p.Id}">ALERTA DE RAID: ${p.name} (clan ${p.Capturer || 'N/A'})</div>`).join('');
            battleMenuToggle.classList.add('raid-active');
        } else {
            raidAlertsContainer.innerHTML = '';
            battleMenuToggle.classList.remove('raid-active');
        }
        const allCooldownPorts = state.ports.filter(p => p.Capturer && p.LastPortBattle > 0).map(p => { const lastAttack = TicksToDate(p.LastPortBattle); const cooldownEnd = new Date(lastAttack.getTime() + (14 * 24 * 60 * 60 * 1000)); return { port: p, cooldownEnd }; }).sort((a, b) => a.cooldownEnd - b.cooldownEnd);
        const spanishDefenses = allCooldownPorts.filter(item => item.port.nationId === SPANISH_NATION_ID && item.cooldownEnd > now);
        if (spanishDefenses.length > 0) { spanishDefensesList.innerHTML = spanishDefenses.map(item => `<li data-port-id="${item.port.Id}"><div><span class="port-name">${item.port.name}</span><div class="port-info">Clan: ${item.port.Capturer}</div></div><span class="port-date defense">Activa hasta: ${item.cooldownEnd.toLocaleDateString('es-ES', dateOptions)}</span></li>`).join(''); } else { spanishDefensesList.innerHTML = `<li class="empty-list">No hay defensas españolas activas.</li>`; }
        const threeDaysFromNow = now.getTime() + (3 * 24 * 60 * 60 * 1000);
        const attackTargets = allCooldownPorts.filter(item => item.port.nationId !== SPANISH_NATION_ID && item.cooldownEnd > now && item.cooldownEnd.getTime() < threeDaysFromNow);
        if (attackTargets.length > 0) { attackTargetsList.innerHTML = attackTargets.map(item => `<li data-port-id="${item.port.Id}"><div><span class="port-name">${item.port.name}</span><div class="port-info">Nación: ${item.port.nationName}</div></div><span class="port-date">Vulnerable: ${item.cooldownEnd.toLocaleDateString('es-ES', dateOptions)}</span></li>`).join(''); } else { attackTargetsList.innerHTML = `<li class="empty-list">No hay objetivos próximos.</li>`; }
    }
    
    function populateStatsMenu() { const nationCounts = state.ports.reduce((acc, port) => { acc[port.nationId] = (acc[port.nationId] || 0) + 1; return acc; }, {}); const sortedNations = Object.entries(nationCounts).map(([nationId, count]) => { const nation = state.nations.find(n => n.Id == nationId); return { nationId, name: nation ? nation.Name : 'Neutral', icon: imagenesPorId[nationId], count }; }).sort((a, b) => b.count - a.count); nationDominanceList.innerHTML = sortedNations.map(n => `<li><img src="${n.icon}" class="nation-icon" alt="${n.name}">${n.name}<span class="stat-value">${n.count}</span></li>`).join(''); const portVolumes = state.shops.map(shop => { const port = state.ports.find(p => p.Id === shop.Id); if (!port) return null; const totalVolume = (shop.RegularItems || []).reduce((sum, item) => sum + item.Quantity, 0); return { port, volume: totalVolume }; }).filter(p => p).sort((a, b) => b.volume - a.volume).slice(0, 10); tradeHubsList.innerHTML = portVolumes.map((item, index) => `<li data-port-id="${item.port.Id}"><span class="rank-badge">${index + 1}.</span>${item.port.name}<span class="stat-value">${item.volume.toLocaleString()}</span></li>`).join(''); const clanPoints = state.ports.reduce((acc, port) => { if (port.Capturer) { acc[port.Capturer] = (acc[port.Capturer] || 0) + (port.PortPoints || 0); } return acc; }, {}); const sortedClans = Object.entries(clanPoints).sort((a, b) => b[1] - a[1]).slice(0, 10); clanPowerList.innerHTML = sortedClans.map(([name, points], index) => `<li><span class="rank-badge">${index + 1}.</span>${name}<span class="stat-value">${points} Pts</span></li>`).join(''); }
    
    function buildCraftingDatabase() {
        state.itemTemplatesMap.forEach(item => {
            if (item.__type && item.__type.includes('Building')) {
                state.buildingMap.set(item.Id, item.Name);
            }
            if (item.__type && item.__type.includes('Recipe') && item.BuildingRequirements && item.BuildingRequirements.length > 0) {
                state.recipes.push(item);
                const resultItemTemplate = (item.CraftingResults && item.CraftingResults.length > 0)
                    ? state.itemTemplatesMap.get(item.CraftingResults[0].Template)
                    : null;
                const finalItemName = resultItemTemplate ? resultItemTemplate.Name.trim() : "Producto Desconocido";
                state.searchableRecipes.push({
                    recipe: item,
                    finalItemName: finalItemName,
                    finalItemNameLower: finalItemName.toLowerCase()
                });
            }
        });
        state.specialPorts = state.ports.filter(p => p.ImprovedCraftChance || p.CanConvertResources);
    }
    
    function calculateWindPrediction() {
        const currentServerTime = currentServerTimeInput.value; const currentWindDirectionAbbr = currentWindDirectionSelect.value; const futurePredictionTime = futurePredictionTimeInput.value;
        if (!currentServerTime || !currentWindDirectionAbbr || !futurePredictionTime) { return; }
        
        const parseTime = (timeStr) => { const [hours, minutes] = timeStr.split(':').map(Number); return hours * 60 + minutes; };
        const currentTimeInMinutes = parseTime(currentServerTime);
        const futureTimeInMinutes = parseTime(futurePredictionTime);
        
        const currentWind = windDirections.find(d => d.abbr === currentWindDirectionAbbr);
        if (!currentWind) return;

        let timeDifference = futureTimeInMinutes - currentTimeInMinutes;
        if (timeDifference < 0) { timeDifference += 24 * 60; }

        const degreesPerMinute = 360 / 48;
        const degreeShift = timeDifference * degreesPerMinute;
        
        let predictedDegrees = currentWind.degrees - degreeShift;
        predictedDegrees = (predictedDegrees % 360 + 360) % 360;

        let closestDirection = windDirections[0];
        let minDiff = 360;
        for (const dir of windDirections) {
            const diff = Math.min(Math.abs(predictedDegrees - dir.degrees), 360 - Math.abs(predictedDegrees - dir.degrees));
            if (diff < minDiff) {
                minDiff = diff;
                closestDirection = dir;
            }
        }
        
        const inverseDegrees = (predictedDegrees + 180) % 360;
        let closestInverseDirection = windDirections[0];
        minDiff = 360;
        for (const dir of windDirections) {
            const diff = Math.min(Math.abs(inverseDegrees - dir.degrees), 360 - Math.abs(inverseDegrees - dir.degrees));
            if (diff < minDiff) {
                minDiff = diff;
                closestInverseDirection = dir;
            }
        }
        
        predictedWindText.textContent = `${closestDirection.name} (${closestDirection.abbr})`;
        predictedWindDegrees.textContent = `(${predictedDegrees.toFixed(1)}°)`;
        windArrowContainer.style.transform = `rotate(${predictedDegrees}deg)`;

        predictedInverseText.textContent = `${closestInverseDirection.name} (${closestInverseDirection.abbr})`;
        predictedInverseDegrees.textContent = `(${inverseDegrees.toFixed(1)}°)`;
    }

    function initializeSideMenus() {
        portSearchInput.addEventListener('input', (e) => { const searchTerm = e.target.value.toLowerCase(); if (!searchTerm) { portSearchResults.innerHTML = ''; return; } const results = state.ports.filter(p => p.name.toLowerCase().includes(searchTerm) && p.coordinates).slice(0, 5); portSearchResults.innerHTML = results.map(p => `<div data-port-id="${p.Id}">${p.name}</div>`).join(''); });
        portSearchResults.addEventListener('click', (e) => { e.stopPropagation(); if (e.target.dataset.portId) { const port = state.ports.find(p => p.Id === e.target.dataset.portId); if (port) panToPort(port); } });
        
        productFinderInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            if (searchTerm.length < 3) { productFinderResults.innerHTML = ''; return; }
            let matchingItems = [];
            state.itemLocationDatabase.forEach((value, key) => {
                if (value.name.toLowerCase().includes(searchTerm)) { matchingItems.push({ id: key, ...value }); }
            });
            if (matchingItems.length === 0) { productFinderResults.innerHTML = '<div>No se encontraron productos.</div>'; return; }
            const item = matchingItems[0];
            productFinderResults.innerHTML = item.locations.map(loc => `<div class="product-location" data-port-id="${loc.portId}"><div class="location-header"><span>${loc.portName}</span><span>Cant: ${loc.quantity.toLocaleString()}</span></div><div class="location-details">Compra: <span class="price-buy">${loc.buyPrice.toLocaleString()}</span> / Venta: <span class="price-sell">${loc.sellPrice.toLocaleString()}</span></div></div>`).join('');
        });
        productFinderResults.addEventListener('click', (e) => { e.stopPropagation(); const target = e.target.closest('.product-location'); if (target && target.dataset.portId) { const port = state.ports.find(p => p.Id === target.dataset.portId); if (port) panToPort(port); } });
        
        routeFinderInput.addEventListener('input', (e) => { const searchTerm = e.target.value.toLowerCase(); if (searchTerm.length < 3) { routeFinderResults.innerHTML = ''; return; } let matchingItems = []; state.itemTradeDatabase.forEach((value, key) => { if (value.name.toLowerCase().includes(searchTerm)) { matchingItems.push({ id: key, ...value }); } }); if (matchingItems.length === 0) { routeFinderResults.innerHTML = '<div>No se encontraron rutas rentables.</div>'; return; } const item = matchingItems[0]; let routes = []; for (const buyLoc of item.buyLocations) { for (const sellLoc of item.sellLocations) { if (buyLoc.portId === sellLoc.portId) continue; const profit = sellLoc.price - buyLoc.price; if (profit > 0) { const distance = Math.hypot(buyLoc.coordinates[0] - sellLoc.coordinates[0], buyLoc.coordinates[1] - sellLoc.coordinates[1]); routes.push({ buyPort: buyLoc, sellPort: sellLoc, profit, distance }); } } } routes.sort((a, b) => b.profit - a.profit); const topRoutes = routes.slice(0, 5); if (topRoutes.length === 0) { routeFinderResults.innerHTML = '<div>No se encontraron rutas rentables.</div>'; return; } 
            routeFinderResults.innerHTML = topRoutes.map(route => { const safeRouteData = JSON.stringify(route).replace(/"/g, '&quot;'); return `<div class="route" data-route="${safeRouteData}"><div class="route-header"><span>${item.name}</span><span class="profit">+${route.profit.toLocaleString()}</span></div><div class="route-details"><p><span>Compra en:</span> <span class="port-link">${route.buyPort.portName} (<span class="price-buy">${route.buyPort.price}</span>)</span></p><p><span>Vende en:</span> <span class="port-link">${route.sellPort.portName} (<span class="price-sell">${route.sellPort.price}</span>)</span></p><p><span>Distancia:</span> <span class="distance">${route.distance.toFixed(0)} dist.</span></p></div></div>`; }).join(''); });
        routeFinderResults.addEventListener('click', (e) => { e.stopPropagation(); const target = e.target.closest('.route'); if (target && target.dataset.route) { const route = JSON.parse(target.dataset.route); panAndZoomToRoute(route); } });
        
        recipeFinderInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            if (searchTerm.length < 3) { recipeFinderResults.innerHTML = ''; return; }
            const results = state.searchableRecipes.filter(r =>
                r.finalItemNameLower.includes(searchTerm) || 
                r.recipe.Name.toLowerCase().includes(searchTerm)
            ).slice(0, 5);
            if (results.length === 0) {
                recipeFinderResults.innerHTML = '<div>No se encontraron recetas.</div>';
                return;
            }
            recipeFinderResults.innerHTML = results.map(result => {
                const recipe = result.recipe;
                const buildingId = recipe.BuildingRequirements[0].BuildingTemplate;
                const buildingName = state.buildingMap.get(buildingId) || `Edificio ID: ${buildingId}`;
                const materials = (recipe.FullRequirements || []).map(req => { const material = state.itemTemplatesMap.get(req.Template); return `<li>${req.Amount} x ${material ? material.Name : `ID: ${req.Template}`}</li>`; }).join('');
                return `<div class="recipe-result" data-recipe-id="${recipe.Id}"><strong>${recipe.Name}</strong><br><small>Produce: ${result.finalItemName}</small><div class="recipe-details"><h5>Requiere: ${buildingName}</h5><ul>${materials}</ul></div></div>`;
            }).join('');
        });
        recipeFinderResults.addEventListener('click', (e) => { e.stopPropagation(); const target = e.target.closest('.recipe-result'); if (target && target.dataset.recipeId) { const recipeId = parseInt(target.dataset.recipeId, 10); const recipe = state.recipes.find(r => r.Id === recipeId); if (recipe) { showMaterialLocations(recipe.Name, recipe.FullRequirements || []); } } });
        
        specialPortsList.innerHTML = state.specialPorts.map(p => { let specialBonuses = []; if (p.ImprovedCraftChance) { specialBonuses.push(`<span class="bonus-tag craft-chance" title="Probabilidad de crafteo mejorada">+ Crafteo</span>`); } if (p.CanConvertResources) { specialBonuses.push(`<span class="bonus-tag convert-res" title="Puede convertir recursos">Conversión</span>`); } return `<li data-port-id="${p.Id}">${p.name} ${specialBonuses.join(' ')}</li>`; }).join('');
        specialPortsList.addEventListener('click', (e) => { e.stopPropagation(); const target = e.target.closest('li'); if (target && target.dataset.portId) { const port = state.ports.find(p => p.Id === target.dataset.portId); if (port) panToPort(port); } });

        raidAlertsContainer.addEventListener('click', (e) => { e.stopPropagation(); const target = e.target.closest('.alert'); if (target && target.dataset.portId) { const port = state.ports.find(p => p.Id === target.dataset.portId); if (port) panToPort(port); } });
        
        spanishDefensesList.addEventListener('click', (e) => { e.stopPropagation(); const target = e.target.closest('li'); if (target && target.dataset.portId) { const port = state.ports.find(p => p.Id === target.dataset.portId); if (port) panToPort(port); } });
        attackTargetsList.addEventListener('click', (e) => { e.stopPropagation(); const target = e.target.closest('li'); if (target && target.dataset.portId) { const port = state.ports.find(p => p.Id === target.dataset.portId); if (port) panToPort(port); } });
        tradeHubsList.addEventListener('click', (e) => { e.stopPropagation(); const target = e.target.closest('li'); if (target && target.dataset.portId) { const port = state.ports.find(p => p.Id === target.dataset.portId); if (port) panToPort(port); } });

        calculateWindButton.addEventListener('click', calculateWindPrediction);
    }

    function initialize() {
        const setupToggle = (toggle, menu) => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isAlreadyOpen = !menu.classList.contains('hidden');
                closeEverything();
                if (!isAlreadyOpen) {
                    menu.classList.remove('hidden');
                    toggle.classList.add('active');
                }
            });
        };

        setupToggle(battleMenuToggle, battleMenu);
        setupToggle(tradeMenuToggle, tradeMenu);
        setupToggle(craftingMenuToggle, craftingMenu);
        setupToggle(statsToggle, statsMenu);
        
        windPredictorToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isAlreadyOpen = !windPredictorModal.classList.contains('hidden');
            closeEverything();
            if (!isAlreadyOpen) {
                modalOverlay.classList.remove('hidden');
                windPredictorModal.classList.remove('hidden');
                windPredictorToggle.classList.add('active');
            }
        });
        
        closeWindPredictorButton.addEventListener('click', closeEverything);
        modalOverlay.addEventListener('click', closeEverything);
        
        canvas.addEventListener("wheel", handleWheel);
        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("mouseup", handleMouseUp);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("click", handleClick);
        window.addEventListener('resize', handleResize);
        
        closePanelButton.addEventListener('click', hidePortPanel);
        tabsContainer.addEventListener('click', (e) => { if (e.target.matches('.tab-button')) { switchTab(e.target.dataset.tab); } });
        closeMaterialPanelButton.addEventListener('click', () => { 
            materialPanel.classList.add('hidden');
            modalOverlay.classList.add('hidden');
        });
        
        loadAssets().then(() => {
            buildItemTradeDatabase();
            buildCraftingDatabase();
            buildItemLocationDatabase();
            handleResize();
            initializeSideMenus();
            populateBattleIntelligence();
            populateStatsMenu();
            populateTopProfitItems();
            animationLoop();
        });
    }
    
    initialize();
})();