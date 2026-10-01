let loadedGamesData = [];
let currentSearchQuery = "";
let currentCategory = "all";
let currentSeries = "all";
let visibleGamesLimit = 8; // Initial number of games shown
const gamesBatchSize = 8;   // Number of games loaded per "See More" click

document.addEventListener("DOMContentLoaded", () => {
    console.log("Squad Games Store initialized.");

    // 1. Restore scroll position instantly if it was saved before leaving
    const savedPosition = localStorage.getItem('scrollPosition');
    if (savedPosition !== null) {
        window.scrollTo({
            top: parseInt(savedPosition),
            behavior: 'instant'
        });
        localStorage.removeItem('scrollPosition');
    }

    // 2. Save scroll position on action/details click & close dropdowns on outside click
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
            targetGame = loadedGamesData.find(g => (g.id || g.title) === gameId);
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

    // 4. Load Game Catalog
    loadGameCatalog();
});

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
            console.warn("Failed path attempt:", path);
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

function initStore(games) {
    loadedGamesData = games;

    const loaderElements = document.querySelectorAll('#loader, #catalog-loader, .loading-state');
    loaderElements.forEach(el => el.style.display = 'none');

    // Render Categories & Game Series Dropdowns
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
            visibleGamesLimit = 8; // Reset limit on search
            applyFilters();
        });
    }

    if (window.location.pathname.includes('details.html')) {
        initDetailsPage(games);
    }
}

// Helper to extract clean game series/franchise names from game titles
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

// Automatically scans all games and groups them into general categories & game series/types
function renderNavbarDropdowns(games) {
    const container = document.getElementById('dynamic-game-types') || document.querySelector('.portal-navbar');
    if (!container) return;

    let uniqueCategories = new Set();
    let uniqueSeries = new Set();

    games.forEach(game => {
        const rawCategory = game.category || game.Category || game.genre || "";
        if (rawCategory) {
            String(rawCategory).split('/').forEach(cat => {
                let cleanCat = cat.trim();
                if (cleanCat) uniqueCategories.add(cleanCat);
            });
        }
        if (game.title) {
            uniqueSeries.add(getGameSeriesName(game.title));
        }
    });

    let categoriesListHTML = `<a href="#" onclick="filterByCategory('all'); return false;" style="display: block; padding: 10px 14px; color: #f1c40f; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: 600;"><i class="fa-solid fa-layer-group" style="margin-right: 6px;"></i> All Categories</a>`;
    uniqueCategories.forEach(cat => {
        categoriesListHTML += `<a href="#" onclick="filterByCategory('${cat}'); return false;" style="display: block; padding: 10px 14px; color: #fff; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.05);">${cat}</a>`;
    });

    let seriesListHTML = `<a href="#" onclick="filterBySeries('all'); return false;" style="display: block; padding: 10px 14px; color: #f1c40f; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: 600;"><i class="fa-solid fa-gamepad" style="margin-right: 6px;"></i> All Game Series</a>`;
    Array.from(uniqueSeries).sort().forEach(series => {
        seriesListHTML += `<a href="#" onclick="filterBySeries('${series}'); return false;" style="display: block; padding: 10px 14px; color: #fff; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.05);"><i class="fa-solid fa-play" style="margin-right: 6px; color: var(--accent-blue); font-size: 0.7rem;"></i> ${series}</a>`;
    });

    container.innerHTML = `
        <button class="nav-tab active" onclick="resetAllFilters()">
            <i class="fa-solid fa-house"></i> Home
        </button>

        <!-- Categories Dropdown -->
        <div class="category-dropdown-wrapper" style="position: relative; display: inline-block;">
            <button class="nav-tab" onclick="toggleDropdown('categoriesDropdownList', event)">
                <i class="fa-solid fa-layer-group"></i> All Categories <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; margin-left: 4px;"></i>
            </button>
            <div id="categoriesDropdownList" style="display: none; position: absolute; top: 100%; left: 0; background: #1e1e1e; min-width: 240px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); z-index: 9999; margin-top: 6px; max-height: 300px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.15);">
                ${categoriesListHTML}
            </div>
        </div>

        <!-- Game Series / Types Dropdown -->
        <div class="gametype-dropdown-wrapper" style="position: relative; display: inline-block;">
            <button class="nav-tab" onclick="toggleDropdown('gameTypesDropdownList', event)">
                <i class="fa-solid fa-gamepad"></i> Game Type / Series <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; margin-left: 4px;"></i>
            </button>
            <div id="gameTypesDropdownList" style="display: none; position: absolute; top: 100%; left: 0; background: #1e1e1e; min-width: 280px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); z-index: 9999; margin-top: 6px; max-height: 300px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.15);">
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
    visibleGamesLimit = 8; // Reset limit on filter change
    closeAllDropdowns();
    applyFilters();
}
window.filterByCategory = filterByCategory;

function filterBySeries(seriesName) {
    currentSeries = seriesName.toLowerCase() === 'all' ? 'all' : seriesName.toLowerCase();
    currentCategory = 'all';
    visibleGamesLimit = 8; // Reset limit on filter change
    closeAllDropdowns();
    applyFilters();
}
window.filterBySeries = filterBySeries;

function resetAllFilters() {
    currentCategory = 'all';
    currentSeries = 'all';
    currentSearchQuery = '';
    visibleGamesLimit = 8; // Reset limit on reset
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

function applyFilters() {
    const filteredGames = loadedGamesData.filter(game => {
        const title = (game.title || "").toLowerCase();
        const description = (game.description || "").toLowerCase();
        const category = (game.category || game.Category || "").toLowerCase();
        const platform = (game.platform || "").toLowerCase();
        const series = getGameSeriesName(game.title).toLowerCase();

        const matchesSearch = title.includes(currentSearchQuery) || description.includes(currentSearchQuery);

        let matchesCategory = true;
        if (currentCategory !== 'all') {
            matchesCategory = category.includes(currentCategory) || platform.includes(currentCategory);
        }

        let matchesSeries = true;
        if (currentSeries !== 'all') {
            matchesSeries = series === currentSeries;
        }

        return matchesSearch && matchesCategory && matchesSeries;
    });

    renderGameStore(filteredGames);
}

function loadMoreGames() {
    visibleGamesLimit += gamesBatchSize;
    applyFilters();
}
window.loadMoreGames = loadMoreGames;

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
                        <button class="btn-details" onclick="openDetailsById('${encodeURIComponent(gameId)}')" style="padding: 4px 8px; font-size: 0.75rem;">View</button>
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

function renderPopularList(popularGames) {
    const container = document.getElementById("popularList");
    if (!container) return;

    container.innerHTML = popularGames.map((game) => {
        const gameId = game.id || game.title;
        return `
            <div class="popular-item" onclick="openDetailsById('${encodeURIComponent(gameId)}')" style="cursor: pointer;">
                <img src="${game.image}" alt="${game.title}" loading="lazy" onerror="this.src='images/nfsmw-shot1.png';">
                <div class="popular-item-info">
                    <h5>${game.title}</h5>
                    <span>${game.price || 'FREE'}</span>
                </div>
                <i class="fa-solid fa-chevron-right" style="font-size: 0.75rem; color: var(--text-muted);"></i>
            </div>
        `;
    }).join('');
}

function renderGameStore(gameList) {
    const container = document.getElementById("gameGrid") || document.getElementById("games-grid");
    if (!container) return;

    container.innerHTML = "";

    if (gameList.length === 0) {
        container.innerHTML = `
            <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #fff;">
                <p>No games found matching your selection.</p>
            </div>
        `;
        return;
    }

    // Slice the game list to respect the initial limit and pagination
    const gamesToDisplay = gameList.slice(0, visibleGamesLimit);

    gamesToDisplay.forEach((game) => {
        const gameId = game.id || game.title;
        const originalIndex = loadedGamesData.indexOf(game);
        const card = document.createElement("div");
        card.classList.add("game-card");

        const priceText = String(game.price || "").trim().toUpperCase();
        const isFree = priceText === "FREE" || priceText === "0" || priceText.includes("FREE");

        const actionBtnText = isFree ? "Get" : "Buy Now";
        const actionBtnClass = isFree ? "btn-get" : "btn-download";
        const targetUrl = game.downloadUrl || (game.downloadParts && game.downloadParts.length > 0 ? "#" : "");

        let actionButtonsHTML = `
            <a href="${targetUrl}" target="_blank" class="btn-action ${actionBtnClass}" data-game-id="${gameId}" data-game-index="${originalIndex}">${actionBtnText}</a>
        `;

        if (game.altDownloadUrl) {
            actionButtonsHTML += `
                <a href="${game.altDownloadUrl}" target="_blank" class="btn-action btn-vodacom" style="margin-top: 6px;">
                    💬 WhatsApp
                </a>
            `;
        }

        card.innerHTML = `
            <span class="card-badge">${game.platform || "PC"}</span>
            <div class="game-img-wrapper" onclick="openDetailsById('${encodeURIComponent(gameId)}')" style="cursor: pointer;">
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

    // If there are more games left to show, add a "See More Games" button at the bottom
    if (gameList.length > visibleGamesLimit) {
        const seeMoreDiv = document.createElement("div");
        seeMoreDiv.style.gridColumn = "1 / -1";
        seeMoreDiv.style.textAlign = "center";
        seeMoreDiv.style.margin = "30px 0";
        
        seeMoreDiv.innerHTML = `
            <button onclick="loadMoreGames()" style="padding: 12px 30px; font-size: 1rem; background: var(--accent-color, #f1c40f); color: #000; font-weight: bold; border-radius: 8px; cursor: pointer; border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: transform 0.2s;">
                See More Games <i class="fa-solid fa-chevron-down" style="margin-left: 6px;"></i>
            </button>
        `;
        container.appendChild(seeMoreDiv);
    }
}

function openDetailsById(id) {
    window.location.href = `details.html?id=${id}`;
}
window.openDetailsById = openDetailsById;

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
