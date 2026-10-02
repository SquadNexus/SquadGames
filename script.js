/**
 * Squad Games Store TZ - Core Application Script
 * Manages game catalog loading, dynamic filters, search, marquee animations, 
 * multi-part downloads, and UI modal states.
 */

let loadedGamesData = [];
let currentSearchQuery = "";
let currentCategory = "all";
let currentSeries = "all";
let showAllGames = false;
const INITIAL_GAME_LIMIT = 8;

document.addEventListener("DOMContentLoaded", () => {
    console.log("Squad Games Store TZ initialized successfully.");

    // 1. Restore scroll position instantly if saved before navigating to details
    const savedPosition = localStorage.getItem('scrollPosition');
    if (savedPosition !== null) {
        window.scrollTo({
            top: parseInt(savedPosition, 10),
            behavior: 'instant'
        });
        localStorage.removeItem('scrollPosition');
    }

    // 2. Global click listeners for scroll tracking and dropdown auto-closing
    document.addEventListener('click', function(e) {
        if (e.target.closest('.btn-action') || e.target.closest('.btn-details')) {
            localStorage.setItem('scrollPosition', window.scrollY);
        }
        
        if (!e.target.closest('.category-dropdown-wrapper')) {
            const catDropdown = document.getElementById('categoriesDropdownList');
            if (catDropdown) catDropdown.style.display = 'none';
        }
        if (!e.target.closest('.gametype-dropdown-wrapper')) {
            const gameDropdown = document.getElementById('gameTypesDropdownList');
            if (gameDropdown) gameDropdown.style.display = 'none';
        }
    });

    // 3. Multi-part popup trigger handler for downloads
    document.addEventListener('click', function(e) {
        if (e.target.closest('#download-parts-modal')) return;

        const downloadBtn = e.target.closest('.btn-download, .btn-get, .btn-action');
        if (!downloadBtn) return;

        if (downloadBtn.classList.contains('btn-vodacom') || downloadBtn.href.includes('wa.me')) return;

        let targetGame = null;
        const gameId = downloadBtn.getAttribute('data-game-id');
        if (gameId) {
            targetGame = loadedGamesData.find(g => String(g.id || g.title) === decodeURIComponent(gameId));
        }

        if (!targetGame) {
            const gameIndex = downloadBtn.getAttribute('data-game-index');
            if (gameIndex !== null && loadedGamesData[gameIndex]) {
                targetGame = loadedGamesData[gameIndex];
            }
        }

        if (targetGame && targetGame.downloadParts && targetGame.downloadParts.length > 0) {
            e.preventDefault();
            showDownloadPartsModal(targetGame);
            return;
        }

        const targetUrl = downloadBtn.getAttribute('href');
        if (!targetUrl || targetUrl === '#' || targetUrl === 'undefined' || targetUrl === '') return;
        if (downloadBtn.classList.contains('preparing')) return;

        e.preventDefault();
        downloadBtn.classList.add('preparing');
        
        const originalHTML = downloadBtn.innerHTML;
        downloadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Preparing Link...`;

        setTimeout(() => {
            downloadBtn.innerHTML = `<i class="fa-solid fa-check"></i> Redirecting...`;
            window.open(targetUrl, '_blank');

            setTimeout(() => {
                downloadBtn.innerHTML = originalHTML;
                downloadBtn.classList.remove('preparing');
            }, 2000);
        }, 1000);
    });

    // 4. Trigger Game Catalog Fetch
    loadGameCatalog();
});

/**
 * Robust asynchronous loader for games.json supporting GitHub Pages repo paths
 */
async function loadGameCatalog() {
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const repoPrefix = (window.location.hostname.includes("github.io") && pathSegments.length > 0) ? `/${pathSegments[0]}/` : './';

    const possiblePaths = [
        repoPrefix + 'games.json',
        './games.json',
        'games.json'
    ];

    let rawData = null;

    for (const path of possiblePaths) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                rawData = await response.json();
                break;
            }
        } catch (err) {
            console.warn("Failed fetching from path attempt:", path);
        }
    }

    let gamesArray = [];
    if (Array.isArray(rawData)) {
        gamesArray = rawData;
    } else if (rawData && typeof rawData === 'object') {
        gamesArray = rawData.games || rawData.data || rawData.list || Object.values(rawData).find(Array.isArray) || [];
    }

    initStore(gamesArray);
}

/**
 * Initializes store components and search listeners after data is fetched
 */
function initStore(games) {
    loadedGamesData = games;

    const loaderElements = document.querySelectorAll('#loader, #catalog-loader, .loading-state');
    loaderElements.forEach(el => el.style.display = 'none');

    renderNavbarDropdowns(games);

    const featuredGames = games.filter(game => {
        const title = (game.title || "").toLowerCase();
        return title.includes("euro truck") || title.includes("spider-man") || title.includes("gta") || title.includes("heat");
    });
    
    renderFeaturedMarquee(featuredGames.length ? featuredGames : games); 

    const popularGames = games.filter(game => {
        const title = (game.title || "").toLowerCase();
        return title.includes("euro truck simulator") || title.includes("gta") || title.includes("spider-man");
    });
    renderPopularList(popularGames.length ? popularGames : games);

    applyFilters(); 

    const searchInput = document.getElementById('gameSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value.toLowerCase().trim();
            showAllGames = false;
            applyFilters();
        });
    }

    if (window.location.pathname.includes('details.html')) {
        initDetailsPage(games);
    }
}

/**
 * Normalizes raw category strings into clean unified categories
 */
function getNormalizedCategories(rawCategory) {
    if (!rawCategory) return ['Action'];
    
    const parts = String(rawCategory).split(/[\/,]+/).map(p => p.trim().toLowerCase());
    let normalizedSet = new Set();

    parts.forEach(p => {
        if (p.includes('racing') || p.includes('drive') || p.includes('car')) {
            normalizedSet.add('Racing');
        } else if (p.includes('fps') || p.includes('shooter') || p.includes('first-person') || p.includes('gun')) {
            normalizedSet.add('FPS');
        } else if (p.includes('sport') || p.includes('soccer') || p.includes('fifa') || p.includes('pes')) {
            normalizedSet.add('Sports');
        } else if (p.includes('war') || p.includes('military') || p.includes('battle')) {
            normalizedSet.add('War');
        } else if (p.includes('adventure')) {
            normalizedSet.add('Adventure');
        } else if (p.includes('action')) {
            normalizedSet.add('Action');
        } else if (p.includes('simulation') || p.includes('simulator') || p.includes('truck')) {
            normalizedSet.add('Simulation');
        } else if (p.includes('strategy')) {
            normalizedSet.add('Strategy');
        } else if (p.includes('horror') || p.includes('zombie')) {
            normalizedSet.add('Horror');
        } else if (p.length > 0) {
            normalizedSet.add(p.charAt(0).toUpperCase() + p.slice(1));
        }
    });

    return normalizedSet.size > 0 ? Array.from(normalizedSet) : ['Action'];
}

/**
 * Extracts clean franchise/series names from game titles
 */
function getGameSeriesName(title) {
    const t = title.toLowerCase();
    if (t.includes('call of duty')) return 'Call of Duty';
    if (t.includes('fifa')) return 'FIFA';
    if (t.includes('pro evolution soccer') || t.includes('pes')) return 'Pro Evolution Soccer';
    if (t.includes('grand theft auto') || t.includes('gta')) return 'Grand Theft Auto (GTA)';
    if (t.includes('need for speed') || t.includes('nfs')) return 'Need for Speed';
    if (t.includes('euro truck simulator')) return 'Euro Truck Simulator';
    if (t.includes('spider-man') || t.includes('spiderman')) return 'Spider-Man';
    if (t.includes('resident evil')) return 'Resident Evil';
    if (t.includes('far cry')) return 'Far Cry';
    if (t.includes('tomb raider')) return 'Tomb Raider';
    if (t.includes('battlefield')) return 'Battlefield';
    
    if (title.includes(':')) return title.split(':')[0].trim();
    if (title.includes(' - ')) return title.split(' - ')[0].trim();
    const words = title.split(' ');
    return words.slice(0, 2).join(' ');
}

/**
 * Dynamically builds navbar dropdown items for categories and series
 */
function renderNavbarDropdowns(games) {
    const container = document.getElementById('dynamic-game-types') || document.querySelector('.portal-navbar');
    if (!container) return;

    let uniqueCategories = new Set();
    let uniqueSeries = new Set();

    games.forEach(game => {
        const rawCategory = game.category || game.Category || game.genre || "";
        const cleanCategories = getNormalizedCategories(rawCategory);
        cleanCategories.forEach(cat => uniqueCategories.add(cat));

        if (game.title) {
            uniqueSeries.add(getGameSeriesName(game.title));
        }
    });

    let categoriesListHTML = `<a href="#" onclick="filterByCategory('all'); return false;" class="dropdown-item highlight"><i class="fa-solid fa-layer-group"></i> All Categories</a>`;
    Array.from(uniqueCategories).sort().forEach(cat => {
        categoriesListHTML += `<a href="#" onclick="filterByCategory('${cat}'); return false;" class="dropdown-item"><i class="fa-solid fa-tag"></i> ${cat}</a>`;
    });

    let seriesListHTML = `<a href="#" onclick="filterBySeries('all'); return false;" class="dropdown-item highlight"><i class="fa-solid fa-gamepad"></i> All Game Series</a>`;
    Array.from(uniqueSeries).sort().forEach(series => {
        seriesListHTML += `<a href="#" onclick="filterBySeries('${series}'); return false;" class="dropdown-item"><i class="fa-solid fa-play"></i> ${series}</a>`;
    });

    container.innerHTML = `
        <button class="nav-tab active" onclick="resetAllFilters()">
            <i class="fa-solid fa-house"></i> Home
        </button>

        <!-- Categories Dropdown -->
        <div class="category-dropdown-wrapper" style="position: relative; display: inline-block;">
            <button class="nav-tab" onclick="toggleDropdown('categoriesDropdownList', event)">
                <i class="fa-solid fa-layer-group"></i> Categories <i class="fa-solid fa-chevron-down chevron-icon"></i>
            </button>
            <div id="categoriesDropdownList" class="custom-dropdown-list">
                ${categoriesListHTML}
            </div>
        </div>

        <!-- Game Series Dropdown -->
        <div class="gametype-dropdown-wrapper" style="position: relative; display: inline-block;">
            <button class="nav-tab" onclick="toggleDropdown('gameTypesDropdownList', event)">
                <i class="fa-solid fa-gamepad"></i> Series <i class="fa-solid fa-chevron-down chevron-icon"></i>
            </button>
            <div id="gameTypesDropdownList" class="custom-dropdown-list">
                ${seriesListHTML}
            </div>
        </div>
    `;
}

function toggleDropdown(elementId, e) {
    e.stopPropagation();
    const otherId = elementId === 'categoriesDropdownList' ? 'gameTypesDropdownList' : 'categoriesDropdownList';
    const otherEl = document.getElementById(otherId);
    if (otherEl) otherEl.style.display = 'none';

    const dropdownList = document.getElementById(elementId);
    if (dropdownList) {
        dropdownList.style.display = dropdownList.style.display === 'block' ? 'none' : 'block';
    }
}
window.toggleDropdown = toggleDropdown;

function filterByCategory(category) {
    currentCategory = category.toLowerCase() === 'all' ? 'all' : category.toLowerCase();
    currentSeries = 'all';
    showAllGames = false;
    closeAllDropdowns();
    applyFilters();
}
window.filterByCategory = filterByCategory;

function filterBySeries(seriesName) {
    currentSeries = seriesName.toLowerCase() === 'all' ? 'all' : seriesName.toLowerCase();
    currentCategory = 'all';
    showAllGames = false;
    closeAllDropdowns();
    applyFilters();
}
window.filterBySeries = filterBySeries;

function resetAllFilters() {
    currentCategory = 'all';
    currentSeries = 'all';
    currentSearchQuery = '';
    showAllGames = false;
    closeAllDropdowns();
    applyFilters();
}
window.resetAllFilters = resetAllFilters;

function closeAllDropdowns() {
    const catList = document.getElementById('categoriesDropdownList');
    if (catList) catList.style.display = 'none';
    const gameList = document.getElementById('gameTypesDropdownList');
    if (gameList) gameList.style.display = 'none';
}

/**
 * Applies search query, category, and series filters to the catalog
 */
function applyFilters() {
    const filteredGames = loadedGamesData.filter(game => {
        const title = (game.title || "").toLowerCase();
        const description = (game.description || "").toLowerCase();
        const rawCategory = game.category || game.Category || "";
        const gameCategories = getNormalizedCategories(rawCategory).map(c => c.toLowerCase());
        const series = getGameSeriesName(game.title).toLowerCase();

        const matchesSearch = title.includes(currentSearchQuery) || description.includes(currentSearchQuery);

        let matchesCategory = true;
        if (currentCategory !== 'all') {
            matchesCategory = gameCategories.includes(currentCategory);
        }

        let matchesSeries = true;
        if (currentSeries !== 'all') {
            matchesSeries = series === currentSeries;
        }

        return matchesSearch && matchesCategory && matchesSeries;
    });

    renderGameStore(filteredGames);
}

function toggleShowAllGames(expand) {
    showAllGames = expand;
    applyFilters();
    
    if (!expand) {
        const gridEl = document.getElementById("gameGrid") || document.getElementById("games-grid");
        if (gridEl) {
            gridEl.scrollIntoView({ behavior: 'smooth' });
        }
    }
}
window.toggleShowAllGames = toggleShowAllGames;

/**
 * Renders the featured marquee slider
 */
function renderFeaturedMarquee(sliderGames) {
    const track = document.getElementById("featuredTrack");
    if (!track) return;

    const cardsHTML = sliderGames.map((game) => {
        const gameId = game.id || game.title;
        return `
            <div class="marquee-game-card">
                <img class="marquee-game-img" src="${game.image}" alt="${game.title}" loading="lazy" onerror="this.src='images/nfsmw-shot1.png';">
                <div class="marquee-game-content">
                    <span class="marquee-game-badge">${game.platform || 'Game'}</span>
                    <h4>${game.title}</h4>
                    <p>${game.description || ''}</p>
                    <div class="marquee-game-footer">
                        <span class="marquee-price">${game.price || 'FREE'}</span>
                        <button class="btn-details" onclick="openDetailsById('${encodeURIComponent(gameId)}')">View</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    track.innerHTML = cardsHTML + cardsHTML;
    initSmoothMarquee(track);
}

function initSmoothMarquee(track) {
    if (track.dataset.scrollingActive === "true") return;
    track.dataset.scrollingActive = "true";

    let scrollAmount = 0;
    const speed = 1.0; 
    let isPaused = false;

    track.addEventListener('mouseenter', () => isPaused = true);
    track.addEventListener('mouseleave', () => isPaused = false);
    track.addEventListener('touchstart', () => isPaused = true);
    track.addEventListener('touchend', () => isPaused = false);

    function scrollStep() {
        if (!isPaused) {
            scrollAmount += speed;
            if (scrollAmount >= track.scrollWidth / 2) {
                scrollAmount = 0;
            }
            track.style.transform = `translateX(-${scrollAmount}px)`;
        }
        requestAnimationFrame(scrollStep);
    }

    requestAnimationFrame(scrollStep);
}

/**
 * Renders the most popular games sidebar/section
 */
function renderPopularList(popularGames) {
    const container = document.getElementById("popularList");
    if (!container) return;

    container.innerHTML = popularGames.map((game) => {
        const gameId = game.id || game.title;
        return `
            <div class="popular-item" onclick="openDetailsById('${encodeURIComponent(gameId)}')">
                <img src="${game.image}" alt="${game.title}" loading="lazy" onerror="this.src='images/nfsmw-shot1.png';">
                <div class="popular-item-info">
                    <h5>${game.title}</h5>
                    <span>${game.price || 'FREE'}</span>
                </div>
                <i class="fa-solid fa-chevron-right"></i>
            </div>
        `;
    }).join('');
}

/**
 * Renders the main game catalog grid with pagination limit
 */
function renderGameStore(gameList) {
    const container = document.getElementById("gameGrid") || document.getElementById("games-grid");
    if (!container) return;

    container.innerHTML = "";

    if (gameList.length === 0) {
        container.innerHTML = `
            <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #fff;">
                <i class="fa-solid fa-face-sad-tear" style="font-size: 2rem; margin-bottom: 10px; color: var(--accent-blue);"></i>
                <p>No games found matching your selection.</p>
            </div>
        `;
        return;
    }

    const gamesToRender = showAllGames ? gameList : gameList.slice(0, INITIAL_GAME_LIMIT);

    gamesToRender.forEach((game) => {
        const gameId = game.id || game.title;
        const originalIndex = loadedGamesData.indexOf(game);
        const card = document.createElement("div");
        card.classList.add("game-card");

        // First two games (index 0 and 1) are paid games requiring "Buy Now"
        const isPaid = originalIndex === 0 || originalIndex === 1 || String(game.id) === "1" || String(game.id) === "2";
        
        let actionBtnText = "Get";
        let actionBtnClass = "btn-get";
        let targetUrl = game.downloadUrl || (game.downloadParts && game.downloadParts.length > 0 ? "#" : "");

        if (isPaid) {
            actionBtnText = "Buy Now";
            actionBtnClass = "btn-download";
            const orderMessage = encodeURIComponent(`Hello, I want to buy ${game.title} (${game.platform})`);
            targetUrl = game.altDownloadUrl || `https://wa.me/255XXXXXXXXX?text=${orderMessage}`;
        }

        let actionButtonsHTML = `
            <a href="${targetUrl}" target="_blank" class="btn-action ${actionBtnClass}" data-game-id="${encodeURIComponent(gameId)}" data-game-index="${originalIndex}">${actionBtnText}</a>
        `;

        if (!isPaid && game.altDownloadUrl) {
            actionButtonsHTML += `
                <a href="${game.altDownloadUrl}" target="_blank" class="btn-action btn-vodacom" style="margin-top: 6px;">
                    💬 WhatsApp
                </a>
            `;
        }

        card.innerHTML = `
            <span class="card-badge">${game.platform || "PC"}</span>
            <div class="game-img-wrapper" onclick="openDetailsById('${encodeURIComponent(gameId)}')">
                <img src="${game.image || 'images/nfsmw-shot1.png'}" alt="${game.title}" class="game-img" loading="lazy" onerror="this.onerror=null; this.src='images/nfsmw-shot1.png';" />
            </div>
            <div class="game-details">
                <span class="category-tag">${game.category || game.Category || "General"}</span>
                <h3>${game.title}</h3>
                <p>${game.description || ""}</p>
                <div class="card-action">
                    <span class="price">${game.price || 'FREE'}</span>
                    <div class="action-group">
                        <button class="btn-details" onclick="openDetailsById('${encodeURIComponent(gameId)}')">Details &rarr;</button>
                        ${actionButtonsHTML}
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });

    if (gameList.length > INITIAL_GAME_LIMIT) {
        const toggleWrapper = document.createElement("div");
        toggleWrapper.style.gridColumn = "1 / -1";
        toggleWrapper.style.textAlign = "center";
        toggleWrapper.style.marginTop = "30px";
        toggleWrapper.style.marginBottom = "20px";

        if (!showAllGames) {
            const remainingCount = gameList.length - INITIAL_GAME_LIMIT;
            toggleWrapper.innerHTML = `
                <button onclick="toggleShowAllGames(true)" class="btn-see-more">
                    <i class="fa-solid fa-angles-down"></i> See More (${remainingCount} more games)
                </button>
            `;
        } else {
            toggleWrapper.innerHTML = `
                <button onclick="toggleShowAllGames(false)" class="btn-see-less">
                    <i class="fa-solid fa-angles-up"></i> See Less
                </button>
            `;
        }

        container.appendChild(toggleWrapper);
    }
}

function openDetailsById(id) {
    window.location.href = `details.html?id=${id}`;
}
window.openDetailsById = openDetailsById;

/**
 * Populates game details page elements dynamically from games.json query parameter
 */
function initDetailsPage(games) {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('id');
    if (!gameId) return;
    
    const decodedId = decodeURIComponent(gameId);
    const gameIndex = games.findIndex(g => String(g.id || g.title) === decodedId);
    const game = gameIndex !== -1 ? games[gameIndex] : null;
    if (!game) return;
    
    const container = document.querySelector('.container') || document.body;
    
    // Check if it's one of the first two paid games
    const isPaid = gameIndex === 0 || gameIndex === 1 || String(game.id) === "1" || String(game.id) === "2";
    const buttonText = isPaid ? "Buy Now" : "Get Game";
    const buttonClass = isPaid ? "btn-action btn-download" : "btn-action btn-get";
    
    let actionHtml = "";
    if (isPaid) {
        const orderMessage = encodeURIComponent(`Hello, I want to buy ${game.title} (${game.platform})`);
        const targetUrl = game.altDownloadUrl || `https://wa.me/255XXXXXXXXX?text=${orderMessage}`;
        actionHtml = `<a href="${targetUrl}" target="_blank" class="${buttonClass}" style="display:inline-block; text-align:center; text-decoration:none;">${buttonText}</a>`;
    } else {
        actionHtml = `<button class="${buttonClass}" data-game-id="${game.id}">${buttonText}</button>`;
    }

    container.innerHTML = `
        <div class="game-details-card" style="padding: 2rem; max-width: 800px; margin: auto; color: #fff;">
            <a href="index.html" class="back-link" style="color: #00f; text-decoration: underline;">&larr; Back to Home</a>
            <h1>${game.title}</h1>
            <img src="${game.image}" alt="${game.title}" style="max-width: 100%; border-radius: 8px; margin: 1rem 0;">
            <p><strong>Platform:</strong> ${game.platform}</p>
            <p><strong>Category:</strong> ${game.category}</p>
            <p><strong>Size:</strong> ${game.size}</p>
            <p><strong>Price:</strong> ${game.price || 'FREE'}</p>
            
            <div class="requirements" style="margin: 1.5rem 0; background: #1e1e1e; padding: 1rem; border-radius: 6px;">
                <h3>System Requirements</h3>
                <p><strong>OS:</strong> ${game.systemRequirements.os}</p>
                <p><strong>Processor:</strong> ${game.systemRequirements.processor}</p>
                <p><strong>RAM:</strong> ${game.systemRequirements.ram}</p>
                <p><strong>Storage:</strong> ${game.systemRequirements.storage}</p>
            </div>
            
            <div class="action-wrapper" style="margin-top: 1.5rem;">
                ${actionHtml}
            </div>
        </div>
    `;
}

function openFullScreen(imgSrc) {
    const fullModal = document.getElementById("fullscreenOverlay") || document.getElementById("fullscreen-overlay");
    const fullImg = document.getElementById("fullscreenImg") || document.getElementById("fullscreen-img");
    if (fullImg) fullImg.src = imgSrc;
    if (fullModal) fullModal.classList.add("active");
}
window.openFullScreen = openFullScreen;

function closeFullScreen() {
    const fullModal = document.getElementById("fullscreenOverlay") || document.getElementById("fullscreen-overlay");
    if (fullModal) fullModal.classList.remove("active");
}
window.closeFullScreen = closeFullScreen;

/**
 * Displays download parts modal when a game contains multi-part archives
 */
function showDownloadPartsModal(game) {
    let modal = document.getElementById('download-parts-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'download-parts-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px; background: var(--bg-card, #1e1e1e); padding: 25px; border-radius: 12px; color: #fff; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <button onclick="closeDownloadPartsModal()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: #aaa; font-size: 1.2rem; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                <h3 id="parts-modal-title" style="margin-bottom: 8px; font-size: 1.25rem;">Select Download Part</h3>
                
                <p style="color: #f1c40f; font-size: 0.85rem; margin-bottom: 12px; font-weight: 600; line-height: 1.4;">
                    <i class="fa-solid fa-triangle-exclamation"></i> To get this game you are required to download all these parts for proper installation and extraction of the game.
                </p>

                <p style="color: #aaa; font-size: 0.85rem; margin-bottom: 20px;">Choose a specific part series below to start your direct download link:</p>
                <div id="parts-list-container" style="display: flex; flex-direction: column; gap: 10px;"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeDownloadPartsModal();
            }
        });
    }

    document.getElementById('parts-modal-title').innerText = `Download: ${game.title}`;
    
    let partsArray = game.downloadParts;
    if (typeof partsArray === 'string') {
        try { partsArray = JSON.parse(partsArray); } catch (e) { partsArray = []; }
    }
    partsArray = partsArray || [];

    const container = document.getElementById('parts-list-container');
    container.innerHTML = partsArray.map((part, idx) => {
        const partUrl = (typeof part === 'object' && part !== null) ? (part.url || part.link || '#') : part;
        const partName = (typeof part === 'object' && part !== null) ? (part.name || `Part ${idx + 1}`) : `Part ${idx + 1}`;

        return `
            <a href="${partUrl}" target="_blank" class="btn-action btn-get" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; text-decoration: none;">
                <span><i class="fa-solid fa-download"></i> ${partName}</span>
                <i class="fa-solid fa-external-link-alt" style="font-size: 0.8rem;"></i>
            </a>
        `;
    }).join('');

    modal.classList.add('active');
}
window.showDownloadPartsModal = showDownloadPartsModal;

function closeDownloadPartsModal() {
    const modal = document.getElementById('download-parts-modal');
    if (modal) modal.classList.remove('active');
}
window.closeDownloadPartsModal = closeDownloadPartsModal;
