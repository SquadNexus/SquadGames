let loadedGamesData = [];
let currentSearchQuery = "";
let currentCategory = "all";

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

    // 3. Sleek loading animation handler & Universal Multi-part popup trigger for all current & future games
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

        // Fallback check if data-game-id wasn't present
        if (!targetGame) {
            const gameIndex = downloadBtn.getAttribute('data-game-index');
            if (gameIndex !== null && loadedGamesData[gameIndex]) {
                targetGame = loadedGamesData[gameIndex];
            }
        }

        if (!targetGame && downloadBtn.href) {
            targetGame = loadedGamesData.find(g => g.downloadUrl && downloadBtn.href.includes(g.downloadUrl));
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
            console.log("Attempting to fetch games.json from:", path);
            const response = await fetch(path);
            if (response.ok) {
                rawData = await response.json();
                console.log("Successfully loaded games.json from:", path);
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

    if (gamesArray.length === 0) {
        console.warn("Using fallback catalog data.");
        gamesArray = [
            {
                id: "1",
                title: "Tanzania Euro Truck Simulator 2 + 50 TZ mods packs",
                platform: "PC",
                category: "Simulation",
                description: "Full Euro Truck Simulator 2 PC game bundled with 50 custom TZ mods.",
                requirements: "OS: Windows 10/11 (64-bit) | RAM: 8 GB | Storage: 25 GB",
                installGuide: "1. Extract the downloaded archive.\n2. Run setup.exe as administrator.\n3. Move mods to documents folder.",
                price: "TZS 20,000",
                image: "images/ets-2-pc.jpg",
                screenshots: [],
                downloadUrl: "https://selar.com/8z3yp9tnyv",
                altDownloadUrl: "https://wa.me/255692752060?text=Hello%20Squad%20Games"
            },
            {
                id: "2",
                title: "Marvel's Spider-Man: Miles Morales",
                platform: "PC",
                category: "Action",
                description: "Experience the rise of Miles Morales as new powers unfold.",
                requirements: "OS: Windows 10 (64-bit) | RAM: 8 GB",
                installGuide: "1. Extract files.\n2. Install prerequisite runtimes.\n3. Play from shortcut.",
                price: "FREE",
                image: "images/spider-man.jpg",
                screenshots: [],
                downloadUrl: "https://wa.me/255692752060"
            }
        ];
    }

    initStore(gamesArray);
}

function initStore(games) {
    loadedGamesData = games;

    // Hide loading indicators once store data is loaded
    const loaderElements = document.querySelectorAll('#loader, #catalog-loader, .loading-state');
    loaderElements.forEach(el => el.style.display = 'none');

    // Render interactive expandable dropdown navigation
    renderThreeMainCategories(games);

    const featuredGames = games.filter(game => {
        const title = (game.title || "").toLowerCase();
        if (title.includes("1.57")) return false;
        const isEtsTanzaniaOrMobile = title.includes("euro truck") && (title.includes("tanzania") || title.includes("tz") || title.includes("mobile") || title.includes("android"));
        return isEtsTanzaniaOrMobile || 
               title.includes("spider-man") || 
               title.includes("gta v") || 
               title.includes("gta 5") || 
               title.includes("heat") || 
               title.includes("fifa 22") || 
               title.includes("black ops 3");
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
            applyFilters();
        });
    }

    const closeModalBtn = document.querySelector('.close-btn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModalDirect);

    const fullscreenCloseBtn = document.querySelector('.fullscreen-close');
    if (fullscreenCloseBtn) fullscreenCloseBtn.addEventListener('click', closeFullScreen);

    // AUTO-LOAD FOR DETAILS.HTML PAGE IF PRESENT
    if (window.location.pathname.includes('details.html')) {
        initDetailsPage(games);
    }
}

// Renders interactive navigation with expandable Categories & Game Types dropdowns
function renderThreeMainCategories(games) {
    const container = document.getElementById('dynamic-game-types');
    if (!container) return;

    let uniqueCategories = new Set();
    games.forEach(game => {
        const rawCategory = game.category || game.Category || game.genre || game.tags || "";
        if (rawCategory) {
            const catString = Array.isArray(rawCategory) ? rawCategory.join('/') : String(rawCategory);
            catString.split('/').forEach(cat => {
                let cleanCat = cat.trim();
                if (cleanCat) uniqueCategories.add(cleanCat);
            });
        }
    });

    let categoriesListHTML = `<a href="#" onclick="filterByCategory('all'); return false;" style="display: block; padding: 10px 14px; color: #f1c40f; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: 600;"><i class="fa-solid fa-layer-group" style="margin-right: 6px;"></i> All Categories (${uniqueCategories.size})</a>`;
    uniqueCategories.forEach(cat => {
        categoriesListHTML += `<a href="#" onclick="filterByCategory('${cat}'); return false;" style="display: block; padding: 10px 14px; color: #fff; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;">${cat}</a>`;
    });

    let gamesListHTML = `<a href="#" onclick="filterByCategory('all'); return false;" style="display: block; padding: 10px 14px; color: #f1c40f; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: 600;"><i class="fa-solid fa-gamepad" style="margin-right: 6px;"></i> All Available Games (${games.length})</a>`;
    games.forEach(game => {
        const gameId = game.id || game.title;
        gamesListHTML += `<a href="#" onclick="openDetailsById('${encodeURIComponent(gameId)}'); return false;" style="display: block; padding: 10px 14px; color: #fff; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.05); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><i class="fa-solid fa-play" style="margin-right: 6px; color: var(--accent-blue); font-size: 0.7rem;"></i> ${game.title}</a>`;
    });

    container.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; width: 100%;">
            <!-- 1. Home / All Games Button -->
            <button class="nav-tab active" onclick="filterByCategory('all')">
                <i class="fa-solid fa-house"></i> Home
            </button>

            <!-- 2. All Categories Expandable Dropdown -->
            <div class="category-dropdown-wrapper" style="position: relative; display: inline-block;">
                <button class="nav-tab" onclick="toggleDropdown('categoriesDropdownList', event)">
                    <i class="fa-solid fa-layer-group"></i> All Categories <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; margin-left: 4px;"></i>
                </button>
                <div id="categoriesDropdownList" style="display: none; position: absolute; top: 100%; left: 0; background: #1e1e1e; min-width: 240px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); z-index: 9999; margin-top: 6px; max-height: 300px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.15);">
                    ${categoriesListHTML}
                </div>
            </div>

            <!-- 3. Game Type Expandable Dropdown -->
            <div class="gametype-dropdown-wrapper" style="position: relative; display: inline-block;">
                <button class="nav-tab" onclick="toggleDropdown('gameTypesDropdownList', event)">
                    <i class="fa-solid fa-gamepad"></i> Game Type <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; margin-left: 4px;"></i>
                </button>
                <div id="gameTypesDropdownList" style="display: none; position: absolute; top: 100%; left: 0; background: #1e1e1e; min-width: 280px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); z-index: 9999; margin-top: 6px; max-height: 300px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.15);">
                    ${gamesListHTML}
                </div>
            </div>
        </div>
    `;
}

// Universal dropdown toggle handler
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
    const lowerCat = category.toLowerCase();
    currentCategory = (lowerCat === 'home' || lowerCat === 'all') ? 'all' : lowerCat;
    currentSearchQuery = '';

    const catList = document.getElementById('categoriesDropdownList');
    if (catList) catList.style.display = 'none';
    const gameList = document.getElementById('gameTypesDropdownList');
    if (gameList) gameList.style.display = 'none';

    applyFilters();
}
window.filterByCategory = filterByCategory;

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

function applyFilters() {
    const filteredGames = loadedGamesData.filter(game => {
        const title = (game.title || "").toLowerCase();
        const description = (game.description || "").toLowerCase();
        const category = (game.category || game.Category || "").toLowerCase();
        const platform = (game.platform || "").toLowerCase();

        const matchesSearch = title.includes(currentSearchQuery) || description.includes(currentSearchQuery);

        let matchesCategory = true;
        if (currentCategory !== 'all') {
            matchesCategory = category.includes(currentCategory) || platform.includes(currentCategory);
        }

        return matchesSearch && matchesCategory;
    });

    renderGameStore(filteredGames);
}

function renderGameStore(gameList) {
    const container = document.getElementById("gameGrid") || document.getElementById("games-grid");

    if (!container) return;

    container.innerHTML = "";

    if (gameList.length === 0) {
        container.innerHTML = `
            <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #fff;">
                <p>No games found matching your search or filters.</p>
            </div>
        `;
        return;
    }

    gameList.forEach((game) => {
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

function initDetailsPage(games) {
    const detailsLoaders = document.querySelectorAll('#loader, #catalog-loader, .loading-state, [id*="load"], [class*="load"]');
    detailsLoaders.forEach(el => el.style.display = 'none');

    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('id');

    if (!gameId) {
        console.warn("No game ID found in URL parameters!");
        return;
    }

    const decodedId = decodeURIComponent(gameId);

    const currentGame = games.find(g => 
        String(g.id) === String(decodedId) || 
        String(g.title).toLowerCase() === String(decodedId).toLowerCase()
    );

    if (!currentGame) {
        console.error("Game not found in catalog for ID:", decodedId);
        const titleEl = document.getElementById('detailGameTitle');
        if (titleEl) titleEl.innerText = "Game Not Found";
        return;
    }

    const setElementText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    setElementText('detailGameTitle', currentGame.title);
    setElementText('detailGameCategory', currentGame.category || currentGame.Category || '');
    setElementText('detailGameDescription', currentGame.description || '');
    setElementText('detailGameRequirements', currentGame.requirements || '');
    setElementText('detailGamePrice', currentGame.price || 'FREE');

    const detailInstallGuideEl = document.getElementById('detailInstallGuide');
    if (detailInstallGuideEl) {
        detailInstallGuideEl.textContent = currentGame.installGuide;
    }

    const coverImg = document.getElementById('detailGameImage');
    if (coverImg && currentGame.image) {
        coverImg.src = currentGame.image;
    }

    const installGuideContainer = document.getElementById('gameInstallGuide');
    if (installGuideContainer) {
        if (currentGame.installGuide) {
            installGuideContainer.innerHTML = currentGame.installGuide.replace(/\n/g, '<br>');
        } else {
            installGuideContainer.innerHTML = "<p>Standard installation: Extract archive and run setup executable.</p>";
        }
    }

    const downloadBtn = document.getElementById('detailDownloadBtn');
    if (downloadBtn) {
        if (currentGame.downloadParts && currentGame.downloadParts.length > 0) {
            downloadBtn.href = "#";
            downloadBtn.innerHTML = `<i class="fa-solid fa-download"></i> Download Parts (${currentGame.downloadParts.length})`;
            downloadBtn.onclick = (e) => {
                e.preventDefault();
                showDownloadPartsModal(currentGame);
            };
        } else {
            downloadBtn.href = currentGame.downloadUrl || '#';
            downloadBtn.innerHTML = `<i class="fa-solid fa-download"></i> Download Game`;
        }
    }

    const altDownloadContainer = document.getElementById('details-alt-download-section');
    if (altDownloadContainer) {
        if (currentGame.altDownloadUrl) {
            altDownloadContainer.innerHTML = `
                <a href="${currentGame.altDownloadUrl}" target="_blank" class="btn-action btn-vodacom" style="display: inline-block; margin-top: 10px; text-decoration: none;">
                    💬 Alternative / Buy via WhatsApp
                </a>
            `;
        } else {
            altDownloadContainer.innerHTML = '';
        }
    }

    const screenshotsContainer = document.getElementById('detailGameScreenshots'); 
    if (screenshotsContainer) {
        if (currentGame.screenshots && currentGame.screenshots.length > 0) {
            screenshotsContainer.innerHTML = currentGame.screenshots.map(shot => `
                <img src="${shot}" alt="Game Screenshot" class="screenshot-thumb" onclick="openFullScreen('${shot}')" style="cursor: pointer;" />
            `).join('');
        } else {
            screenshotsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No screenshots available for this title.</p>';
        }
    }
}
