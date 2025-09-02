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
    const tooltip = document.getElementById("tooltip"), portPanel = document.getElementById("portPanel"), portPanelTitle = document.getElementById("port-panel-title"), closePanelButton = document.getElementById("close-panel-button"), tabsContainer = document.querySelector(".tabs"), tabContents = { battle: document.getElementById("battle"), trade: document.getElementById("trade") }, menuToggle = document.getElementById("menu-toggle"), sideMenu = document.getElementById("side-menu"), mapContainer = document.getElementById("map-container");
    const portSearchInput = document.getElementById("port-search-input"), portSearchResults = document.getElementById("port-search-results"), nationFiltersContainer = document.querySelector("#nation-filters .filter-buttons"), battleList = document.getElementById("battle-list"), topTargetsList = document.getElementById("top-targets-list");
    const originPortInput = document.getElementById("origin-port-input"), originPortResults = document.getElementById("origin-port-results"), itemFinderInput = document.getElementById("item-finder-input"), itemFinderResults = document.getElementById("item-finder-results");
    
    const battleInfo = { clan: document.getElementById("battleClan"), countdown: document.getElementById("battleCountdown"), lastBattleDate: document.getElementById("lastBattleDate"), brLimit: document.getElementById("battle-br-limit"), points: document.getElementById("port-points"), window: document.getElementById("battle-window"), defenses: document.getElementById("port-defenses") };
    const tradeInfo = { sorters: document.getElementById("trade-sorters"), items: document.getElementById("tradeItems"), summaryTax: document.getElementById("trade-tax"), summaryVolume: document.getElementById("trade-volume") };

    // --- ESTADO DE LA APLICACIÓN ---
    const state = {
        ports: [], nations: [], shops: [], itemTemplatesMap: new Map(), tileImages: [], nationIcons: {},
        tradeableItems: [], currentOriginPort: null,
        scale: 0.25, offsetX: 0, offsetY: 0,
        isDragging: false, dragStartX: 0, dragStartY: 0,
        mouseDownPos: { x: 0, y: 0 }, isClick: false, battleCountdownInterval: null,
        currentPortItems: [], currentSort: { key: 'name', asc: true },
        activeNationFilter: 'all'
    };

    const imagenesPorId = { 0: "imagenes/neu.svg", 1: "imagenes/pir.svg", 2: "imagenes/esp.svg", 3: "imagenes/fra.svg", 4: "imagenes/ing.svg", 5: "imagenes/ind.svg" };

    // --- LÓGICA DE CARGA DE RECURSOS ---
    async function loadAssets() {
        const loadImage = (src) => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error(`No se pudo cargar: ${src}`)); img.src = src; });
        const fetchJson = async (path) => { const response = await fetch(path); if (!response.ok) throw new Error(`Archivo no encontrado: ${path}`); return response.json(); };
        const now = new Date(); if (now.getHours() < 13) now.setDate(now.getDate() - 1); const yyyy = now.getFullYear(), mm = String(now.getMonth() + 1).padStart(2, '0'), dd = String(now.getDate()).padStart(2, '0'); const dateSuffix = `${yyyy}-${mm}-${dd}`;
        try {
            const [portsRaw, nationsData, shopsData, itemTemplatesData, tileImages, nationIcons] = await Promise.all([
                fetchJson(`datos_actualizados/Ports_${dateSuffix}.json`), fetchJson(`datos_actualizados/Nations_${dateSuffix}.json`), fetchJson(`datos_actualizados/Shops_${dateSuffix}.json`), fetchJson(`datos_actualizados/ItemTemplates_${dateSuffix}.json`),
                Promise.all(tiles.map(tile => loadImage(tile.src))), Promise.all(Object.entries(imagenesPorId).map(([id, src]) => loadImage(src).then(img => ({ id, img })).catch(() => ({ id, img: null }))))
            ]);
            state.tileImages = tileImages; nationIcons.filter(icon => icon.img).forEach(icon => state.nationIcons[icon.id] = icon.img);
            const nationsList = Array.isArray(nationsData) ? nationsData : nationsData.Nations ?? [];
            state.nations = nationsList; state.shops = shopsData; state.itemTemplatesMap = new Map(itemTemplatesData.map(item => [item.Id, item]));
            state.ports = portsRaw.map(p => { const nationId = p.Nation ?? 0; const nation = nationsList.find(n => n.Id === nationId); return { ...p, name: p.Name, coordinates: [p.sourcePosition.x, p.sourcePosition.y], countyCapital: p.Capital || false, nationId, nationName: nation?.Name ?? "Neutral" }; });
        } catch (error) { console.error("❌ Fallo crítico:", error); ctx.font = "16px Arial"; ctx.fillStyle = "red"; ctx.fillText("Error al cargar datos.", 20, 40); }
    }

    // --- LÓGICA DE DIBUJADO (MODIFICADA PARA FILTROS) ---
    function drawMap() { if (state.tileImages.length === 0) return; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.translate(state.offsetX, state.offsetY); ctx.scale(state.scale, state.scale); state.tileImages.forEach((img, index) => { const x = (index % mapConfig.tilesPerRow) * mapConfig.tileSize, y = Math.floor(index / mapConfig.tilesPerRow) * mapConfig.tileSize; ctx.drawImage(img, x, y, mapConfig.tileSize, mapConfig.tileSize); }); ctx.globalAlpha = 0.4; state.ports.forEach(port => drawPort(port)); ctx.globalAlpha = 1.0; const filteredPorts = state.activeNationFilter === 'all' ? state.ports : state.ports.filter(p => p.nationId == state.activeNationFilter); filteredPorts.forEach(port => drawPort(port)); ctx.restore(); }
    function drawPort(port) { const [x, y] = port.coordinates; const icon = state.nationIcons[port.nationId]; if (icon) { ctx.drawImage(icon, x - 16, y - 16, 32, 32); } else { ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI); ctx.fillStyle = port.countyCapital ? 'red' : 'yellow'; ctx.fill(); } if (state.scale > 0.3 && port.name) { ctx.font = `bold 14px Arial`; ctx.fillStyle = 'white'; ctx.strokeStyle = 'black'; ctx.lineWidth = 3; ctx.strokeText(port.name, x + 16, y + 5); ctx.fillText(port.name, x + 16, y + 5); } }

    // --- MANEJADORES DE EVENTOS ---
    function handleResize() { canvas.width = mapContainer.clientWidth; canvas.height = mapContainer.clientHeight; state.offsetX = (canvas.width - mapConfig.tilesPerRow * mapConfig.tileSize * state.scale) / 2; state.offsetY = (canvas.height - mapConfig.tilesPerCol * mapConfig.tileSize * state.scale) / 2; drawMap(); }
    function handleWheel(e) { e.preventDefault(); hidePortPanel(); const zoomFactor = 1.1; const mouseX = e.offsetX, mouseY = e.offsetY; const prevScale = state.scale; state.scale = e.deltaY < 0 ? state.scale * zoomFactor : state.scale / zoomFactor; state.offsetX = mouseX - (mouseX - state.offsetX) * (state.scale / prevScale); state.offsetY = mouseY - (mouseY - state.offsetY) * (state.scale / prevScale); drawMap(); }
    function handleMouseDown(e) { state.isClick = true; state.mouseDownPos = { x: e.clientX, y: e.clientY }; state.isDragging = true; state.dragStartX = e.clientX - state.offsetX; state.dragStartY = e.clientY - state.offsetY; }
    function handleMouseUp() { state.isDragging = false; canvas.style.cursor = 'grab'; }
    
    function handleMouseMove(e) {
        if (state.isDragging) { if (Math.hypot(e.clientX - state.mouseDownPos.x, e.clientY - state.mouseDownPos.y) > 5) { state.isClick = false; } if (!state.isClick) { canvas.style.cursor = 'grabbing'; state.offsetX = e.clientX - state.dragStartX; state.offsetY = e.clientY - state.dragStartY; tooltip.style.display = "none"; drawMap(); } return; }
        const mouseX = (e.offsetX - state.offsetX) / state.scale, mouseY = (e.offsetY - state.offsetY) / state.scale;
        let hoveredPort = null;
        for (const port of state.ports) { const [x, y] = port.coordinates; if (Math.hypot(mouseX - x, mouseY - y) < 16) { hoveredPort = port; break; } }
        
        if (hoveredPort) {
            canvas.style.cursor = 'pointer';
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.clientX + 15}px`;
            tooltip.style.top = `${e.clientY + 15}px`;
            
            const depthText = hoveredPort.Depth === 1 ? 'Aguas Someras' : 'Aguas Profundas';
            const depthClass = hoveredPort.Depth === 1 ? 'depth-shallow' : 'depth-deep';

            tooltip.innerHTML = `
                <strong>${hoveredPort.name}</strong><br>
                Nación: ${hoveredPort.nationName}<br>
                Clan: ${hoveredPort.Capturer ?? 'Ninguno'}<br>
                Límite BR: ${hoveredPort.PortBattleBRLimit ?? 'N/A'}<br>
                <span class="${depthClass}">${depthText}</span>
            `;
        } else {
            canvas.style.cursor = 'grab';
            tooltip.style.display = 'none';
        }
    }
    
    function handleClick(e) { if (!state.isClick) return; const mouseX = (e.offsetX - state.offsetX) / state.scale, mouseY = (e.offsetY - state.offsetY) / state.scale; let clickedPort = null; for (const port of state.ports) { const [x, y] = port.coordinates; if (Math.hypot(mouseX - x, mouseY - y) < 16) { clickedPort = port; break; } } if (clickedPort) { showPortPanel(clickedPort); } else { hidePortPanel(); } }

    // --- FUNCIONES DEL PANEL Y MENÚ ---
    function showPortPanel(port) { tooltip.style.display = "none"; portPanel.classList.remove('hidden'); portPanelTitle.textContent = port.name; battleInfo.clan.textContent = port.Capturer ?? 'Ninguno'; updateBattleTimers(port); battleInfo.brLimit.textContent = port.PortBattleBRLimit ?? 'N/A'; battleInfo.points.textContent = port.PortPoints ?? 'N/A'; const startTime = port.PortBattleStartTime, length = port.PortBattleTimeSlotLength; if (startTime !== undefined && length !== undefined) { const endTime = startTime + length; battleInfo.window.textContent = `${startTime}:00 - ${endTime}:00 UTC`; } else { battleInfo.window.textContent = 'N/A'; } if (port.PortElements && port.PortElements.length > 0) { battleInfo.defenses.innerHTML = port.PortElements.map(def => `<li>${def.TemplateName}</li>`).join(''); } else { battleInfo.defenses.innerHTML = '<li>Sin defensas</li>'; } const shop = state.shops.find(s => s.Id === port.Id); let totalVolume = 0; if (shop && shop.RegularItems) { state.currentPortItems = shop.RegularItems.map(item => { const details = state.itemTemplatesMap.get(item.TemplateId); totalVolume += item.Quantity; return { ...item, name: details ? details.Name.trim() : `ID:${item.TemplateId}` }; }); } else { state.currentPortItems = []; } tradeInfo.summaryTax.textContent = `${(port.PortTax * 100).toFixed(0)}%`; tradeInfo.summaryVolume.textContent = totalVolume.toLocaleString(); sortAndRenderTradeItems(); switchTab('battle'); }
    function hidePortPanel() { portPanel.classList.add('hidden'); if (state.battleCountdownInterval) { clearInterval(state.battleCountdownInterval); state.battleCountdownInterval = null; } }
    function updateBattleTimers(port) { if (state.battleCountdownInterval) clearInterval(state.battleCountdownInterval); if (port.LastPortBattle && port.LastPortBattle > 0) { const ticks = BigInt(port.LastPortBattle), epochTicks = BigInt(621355968000000000), jsTimestamp = Number((ticks - epochTicks) / BigInt(10000)); battleInfo.lastBattleDate.textContent = new Date(jsTimestamp).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } else { battleInfo.lastBattleDate.textContent = 'N/A'; } const endTime = port.PortBattleEnd; if (!endTime || typeof endTime !== 'string' || !endTime.includes('/Date(')) { battleInfo.countdown.textContent = 'No programada'; return; } const battleEndTime = new Date(parseInt(endTime.substr(6))).getTime(); if (isNaN(battleEndTime) || battleEndTime < Date.now()) { battleInfo.countdown.textContent = 'No programada'; return; } const updateCountdown = () => { const diff = battleEndTime - Date.now(); if (diff <= 0) { battleInfo.countdown.textContent = "¡EN CURSO!"; clearInterval(state.battleCountdownInterval); return; } const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000); battleInfo.countdown.textContent = `${d}d ${h}h ${m}m ${s}s`; }; updateCountdown(); state.battleCountdownInterval = setInterval(updateCountdown, 1000); }
    function sortAndRenderTradeItems() { const { key, asc } = state.currentSort; const sortedItems = [...state.currentPortItems].sort((a, b) => { let valA, valB; switch(key) { case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break; case 'quantity': valA = a.Quantity; valB = b.Quantity; break; case 'buy': valA = a.BuyPrice; valB = b.BuyPrice; break; case 'sell': valA = a.SellPrice; valB = b.SellPrice; break; } if (valA < valB) return asc ? -1 : 1; if (valA > valB) return asc ? 1 : -1; return 0; }); const itemsHtml = sortedItems.map(item => `<li><span class="item-name" title="${item.name}">${item.name}</span><span class="item-details">Cant: ${item.Quantity.toLocaleString()} | <span class="price-buy">${item.BuyPrice.toLocaleString()}</span> / <span class="price-sell">${item.SellPrice.toLocaleString()}</span></span></li>`).join(''); tradeInfo.items.innerHTML = itemsHtml || '<li>No hay objetos en venta.</li>'; }
    function switchTab(tabId) { tabsContainer.querySelectorAll('.tab-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.tab === tabId); }); Object.values(tabContents).forEach(content => { content.classList.toggle('hidden', content.id !== tabId); }); }
    function panToPort(port) { const targetScale = 0.5; state.scale = targetScale; state.offsetX = (canvas.width / 2) - (port.coordinates[0] * targetScale); state.offsetY = (canvas.height / 2) - (port.coordinates[1] * targetScale); drawMap(); showPortPanel(port); sideMenu.classList.add('hidden'); }

    // --- NUEVAS FUNCIONES PARA EL MENÚ AVANZADO ---
    function calculateDistance(port1, port2) { return Math.hypot(port1.coordinates[0] - port2.coordinates[0], port1.coordinates[1] - port2.coordinates[1]); }
    function buildTradeableItemsList() { const allItems = []; state.shops.forEach(shop => { const port = state.ports.find(p => p.Id === shop.Id); if (!port) return; (shop.RegularItems || []).forEach(item => { const itemDetails = state.itemTemplatesMap.get(item.TemplateId); if (itemDetails && item.BuyPrice > 0) { allItems.push({ itemName: itemDetails.Name.trim(), itemId: item.TemplateId, portId: port.Id, portName: port.name, buyPrice: item.BuyPrice, quantity: item.Quantity }); } }); }); state.tradeableItems = allItems; }
    function calculatePortScores() { state.ports.forEach(port => { const strategicValue = (port.PortPoints || 0) + (port.Capital ? 50 : 0) + (port.CountyCapital ? 25 : 0); const shop = state.shops.find(s => s.Id === port.Id); let economicValue = 0; if (shop && shop.RegularItems) { economicValue = shop.RegularItems.reduce((sum, item) => { const itemDetails = state.itemTemplatesMap.get(item.TemplateId); const price = itemDetails ? (itemDetails.BasePrice > 0 ? itemDetails.BasePrice : 1) : 1; return sum + (item.Quantity * price); }, 0); } const resistance = 1 + (port.PortElements ? port.PortElements.length : 0); port.threatScore = ((strategicValue * 1000) + (economicValue * 0.01)) / resistance; }); }

    function populateSideMenu() {
        portSearchInput.addEventListener('input', (e) => { const searchTerm = e.target.value.toLowerCase(); if (!searchTerm) { portSearchResults.innerHTML = ''; return; } const results = state.ports.filter(p => p.name.toLowerCase().includes(searchTerm)).slice(0, 5); portSearchResults.innerHTML = results.map(p => `<div data-port-id="${p.Id}">${p.name}</div>`).join(''); });
        portSearchResults.addEventListener('click', (e) => { if (e.target.dataset.portId) { const port = state.ports.find(p => p.Id === e.target.dataset.portId); if (port) panToPort(port); } });
        
        originPortInput.addEventListener('input', (e) => { const searchTerm = e.target.value.toLowerCase(); originPortInput.classList.remove('selected'); if (!searchTerm) { originPortResults.innerHTML = ''; state.currentOriginPort = null; return; } const results = state.ports.filter(p => p.name.toLowerCase().includes(searchTerm)).slice(0, 5); originPortResults.innerHTML = results.map(p => `<div data-port-id="${p.Id}">${p.name}</div>`).join(''); });
        originPortResults.addEventListener('click', (e) => { if (e.target.dataset.portId) { const port = state.ports.find(p => p.Id === e.target.dataset.portId); if (port) { state.currentOriginPort = port; originPortInput.value = port.name; originPortInput.classList.add('selected'); originPortResults.innerHTML = ''; itemFinderInput.dispatchEvent(new Event('input')); } } });
        
        itemFinderInput.addEventListener('input', (e) => { const searchTerm = e.target.value.toLowerCase(); if (searchTerm.length < 3) { itemFinderResults.innerHTML = ''; return; } let results = state.tradeableItems.filter(item => item.itemName.toLowerCase().includes(searchTerm)).sort((a, b) => a.buyPrice - b.buyPrice); if (state.currentOriginPort) { results.forEach(item => { const destinationPort = state.ports.find(p => p.Id === item.portId); item.distance = calculateDistance(state.currentOriginPort, destinationPort); }); } results = results.slice(0, 5); itemFinderResults.innerHTML = results.map(item => `<div class="result-item" data-port-id="${item.portId}"><div class="result-info"><span class="port-name">${item.portName}</span>${item.distance ? `<span class="distance">${item.distance.toFixed(0)} units</span>` : ''}</div><span class="price">${item.buyPrice.toLocaleString()}</span></div>`).join(''); });
        itemFinderResults.addEventListener('click', (e) => { const target = e.target.closest('.result-item'); if (target && target.dataset.portId) { const port = state.ports.find(p => p.Id === target.dataset.portId); if (port) panToPort(port); } });
        
        const allButton = document.createElement('button'); allButton.textContent = 'Todos'; allButton.dataset.nationId = 'all'; allButton.className = 'active'; nationFiltersContainer.appendChild(allButton);
        state.nations.forEach(nation => { if (nation.Id === 0) return; const btn = document.createElement('button'); btn.textContent = nation.Name; btn.dataset.nationId = nation.Id; nationFiltersContainer.appendChild(btn); });
        nationFiltersContainer.addEventListener('click', (e) => { if (e.target.matches('button')) { state.activeNationFilter = e.target.dataset.nationId; nationFiltersContainer.querySelectorAll('button').forEach(b => b.classList.remove('active')); e.target.classList.add('active'); drawMap(); } });
        const upcomingBattles = state.ports.filter(p => p.PortBattleEnd && new Date(parseInt(p.PortBattleEnd.substr(6))) > Date.now()).sort((a, b) => new Date(parseInt(a.PortBattleEnd.substr(6))) - new Date(parseInt(b.PortBattleEnd.substr(6))));
        if (upcomingBattles.length > 0) { battleList.innerHTML = upcomingBattles.map(p => { const endDate = new Date(parseInt(p.PortBattleEnd.substr(6))); return `<li data-port-id="${p.Id}">${p.name}<small>${endDate.toLocaleString('es-ES')}</small></li>`; }).join(''); } else { battleList.innerHTML = '<li>No hay batallas programadas.</li>'; }
        battleList.addEventListener('click', (e) => { const target = e.target.closest('li'); if(target && target.dataset.portId) { const port = state.ports.find(p => p.Id === target.dataset.portId); if (port) panToPort(port); } });
        const topTargets = [...state.ports].sort((a, b) => b.threatScore - a.threatScore).slice(0, 5);
        topTargetsList.innerHTML = topTargets.map(p => `<li data-port-id="${p.Id}">${p.name}<small>Índice: ${p.threatScore.toFixed(0)}</small></li>`).join('');
        topTargetsList.addEventListener('click', (e) => { const target = e.target.closest('li'); if(target && target.dataset.portId) { const port = state.ports.find(p => p.Id === target.dataset.portId); if (port) panToPort(port); } });
    }

    // --- INICIALIZACIÓN ---
    function initialize() {
        menuToggle.addEventListener('click', (e) => { e.stopPropagation(); sideMenu.classList.toggle('hidden'); });
        mapContainer.addEventListener('click', () => { if (!sideMenu.classList.contains('hidden')) { sideMenu.classList.add('hidden'); } });
        canvas.addEventListener("wheel", handleWheel); canvas.addEventListener("mousedown", handleMouseDown); canvas.addEventListener("mouseup", handleMouseUp); canvas.addEventListener("mousemove", handleMouseMove); canvas.addEventListener("click", handleClick); window.addEventListener('resize', handleResize);
        closePanelButton.addEventListener('click', hidePortPanel);
        tabsContainer.addEventListener('click', (e) => { if (e.target.matches('.tab-button')) { switchTab(e.target.dataset.tab); } });
        tradeInfo.sorters.addEventListener('click', (e) => { if (e.target.matches('button')) { const sortKey = e.target.dataset.sort; if (state.currentSort.key === sortKey) { state.currentSort.asc = !state.currentSort.asc; } else { state.currentSort.key = sortKey; state.currentSort.asc = (sortKey !== 'name'); } sortAndRenderTradeItems(); } });
        
        loadAssets().then(() => {
            calculatePortScores();
            buildTradeableItemsList();
            handleResize();
            populateSideMenu();
        });
    }
    
    initialize();
})();
