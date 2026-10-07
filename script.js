/**
 * Squad Games Store TZ - Core Application Script
 * Fully synchronized with dynamic categories, clean franchise filters, and dual payment modals.
 */

let loadedGamesData = [];
let currentSearchQuery = "";
let currentCategory = "all";

document.addEventListener("DOMContentLoaded", () => {
    console.log("Squad Games Store initialized successfully.");

    // 1. Restore scroll position instantly if saved before leaving
    const savedPosition = localStorage.getItem('scrollPosition');
    if (savedPosition !== null) {
        window.scrollTo({
            top: parseInt(savedPosition, 10),
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
        if (e.target.closest('#payment-options-modal')) {
            if (e.target.id === 'payment-options-modal') closePaymentOptionsModal();
        }
    });

    // 3. Universal Multi-part popup trigger handler for downloads
    document.addEventListener('click', function(e) {
        if (e.target.closest('#download-parts-modal') || e.target.closest('#payment-options-modal')) return;

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

        const gameParts = targetGame && (targetGame.parts || targetGame.downloadParts);
        if (targetGame && gameParts && gameParts.length > 0) {
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

    renderNavbarDropdowns(games);

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
}

/**
 * Dynamically builds navbar dropdowns with future-proof categories and clean game franchises (types)
 */
function renderNavbarDropdowns(games) {
    const container = document.getElementById('dynamic-game-types');
    if (!container) return;

    let uniqueCategories = new Set();
    let franchisesMap = new Map();

    games.forEach(game => {
        // Extract Categories dynamically
        const rawCategory = game.category || game.Category || game.genre || "";
        if (rawCategory) {
            String(rawCategory).split(/[\/,]+/).forEach(cat => {
                let cleanCat = cat.trim();
                if (cleanCat) {
                    uniqueCategories.add(cleanCat.charAt(0).toUpperCase() + cleanCat.slice(1));
                }
            });
        }

        // Group into clean Franchises / Game Types without repeating individual game titles
        const title = (game.title || "").toLowerCase();
        let franchiseName = "";

        if (title.includes("need for speed") || title.includes("nfs")) franchiseName = "Need for Speed";
        else if (title.includes("gta") || title.includes("grand theft auto")) franchiseName = "Grand Theft Auto (GTA)";
        else if (title.includes("euro truck") || title.includes("truckers")) franchiseName = "Truck Simulator";
        else if (title.includes("spider-man") || title.includes("spiderman")) franchiseName = "Spider-Man";
        else if (title.includes("call of duty") || title.includes("black ops") || title.includes("advanced warfare") || title.includes("vanguard") || title.includes("ghosts")) franchiseName = "Call of Duty";
        else if (title.includes("fifa") || title.includes("pes") || title.includes("pro evolution soccer")) franchiseName = "Football / Sports";
        else if (title.includes("tomb raider")) franchiseName = "Tomb Raider";
        else if (title.includes("the last of us")) franchiseName = "The Last of Us";
        else {
            franchiseName = game.category ? game.category.split('/')[0].trim() : (game.platform || "PC Action");
        }

        if (!franchisesMap.has(franchiseName)) {
            franchisesMap.set(franchiseName, []);
        }
        franchisesMap.get(franchiseName).push(game);
    });

    let categoriesListHTML = `<a href="#" onclick="filterByCategory('all'); return false;" style="display: block; padding: 10px 14px; color: #f1c40f; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: 600;"><i class="fa-solid fa-layer-group" style="margin-right: 6px;"></i> All Categories (${uniqueCategories.size})</a>`;
    Array.from(uniqueCategories).sort().forEach(cat => {
        categoriesListHTML += `<a href="#" onclick="filterByCategory('${cat}'); return false;" style="display: block; padding: 10px 14px; color: #fff; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.05);">${cat}</a>`;
    });

    let gameTypesListHTML = `<a href="#" onclick="filterByCategory('all'); return false;" style="display: block; padding: 10px 14px; color: #f1c40f; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: 600;"><i class="fa-solid fa-gamepad" style="margin-right: 6px;"></i> All Game Types (${franchisesMap.size})</a>`;
    Array.from(franchisesMap.keys()).sort().forEach(franchise => {
        gameTypesListHTML += `<a href="#" onclick="filterByFranchise('${franchise}'); return false;" style="display: block; padding: 10px 14px; color: #fff; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.05);"><i class="fa-solid fa-fire" style="margin-right: 6px; color: #ff9500; font-size: 0.75rem;"></i> ${franchise}</a>`;
    });

    container.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; width: 100%;">
            <button class="nav-tab active" onclick="filterByCategory('all')">
                <i class="fa-solid fa-house"></i> Home
            </button>
            <div class="category-dropdown-wrapper" style="position: relative; display: inline-block;">
                <button class="nav-tab" onclick="toggleDropdown('categoriesDropdownList', event)">
                    <i class="fa-solid fa-layer-group"></i> All Categories <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; margin-left: 4px;"></i>
                </button>
                <div id="categoriesDropdownList" style="display: none; position: absolute; top: 100%; left: 0; background: #1e1e1e; min-width: 240px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); z-index: 9999; margin-top: 6px; max-height: 300px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.15);">
                    ${categoriesListHTML}
                </div>
            </div>
            <div class="gametype-dropdown-wrapper" style="position: relative; display: inline-block;">
                <button class="nav-tab" onclick="toggleDropdown('gameTypesDropdownList', event)">
                    <i class="fa-solid fa-gamepad"></i> Game Type <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; margin-left: 4px;"></i>
                </button>
                <div id="gameTypesDropdownList" style="display: none; position: absolute; top: 100%; left: 0; background: #1e1e1e; min-width: 260px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); z-index: 9999; margin-top: 6px; max-height: 300px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.15);">
                    ${gameTypesListHTML}
                </div>
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
    const lowerCat = category.toLowerCase();
    currentCategory = (lowerCat === 'home' || lowerCat === 'all') ? 'all' : lowerCat;
    currentSearchQuery = '';

    closeAllDropdowns();
    applyFilters();
}
window.filterByCategory = filterByCategory;

function filterByFranchise(franchiseKeyword) {
    currentSearchQuery = "";
    const lowerKey = franchiseKeyword.toLowerCase();

    closeAllDropdowns();

    const filteredGames = loadedGamesData.filter(game => {
        const title = (game.title || "").toLowerCase();
        if (lowerKey.includes("need for speed")) return title.includes("need for speed") || title.includes("nfs");
        if (lowerKey.includes("grand theft auto")) return title.includes("gta") || title.includes("grand theft auto");
        if (lowerKey.includes("truck")) return title.includes("euro truck") || title.includes("truckers");
        if (lowerKey.includes("spider-man")) return title.includes("spider-man") || title.includes("spiderman");
        if (lowerKey.includes("call of duty")) return title.includes("call of duty") || title.includes("black ops") || title.includes("advanced warfare");
        if (lowerKey.includes("football")) return title.includes("fifa") || title.includes("pes");
        if (lowerKey.includes("tomb raider")) return title.includes("tomb raider");
        if (lowerKey.includes("the last of us")) return title.includes("the last of us");
        return title.includes(lowerKey) || (game.category || "").toLowerCase().includes(lowerKey);
    });

    renderGameStore(filteredGames);
}
window.filterByFranchise = filterByFranchise;

function closeAllDropdowns() {
    const catList = document.getElementById('categoriesDropdownList');
    if (catList) catList.style.display = 'none';
    const gameList = document.getElementById('gameTypesDropdownList');
    if (gameList) gameList.style.display = 'none';
}

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
                        <span class="marquee-price">${String(game.id) === "1" ? "TZS 20,000" : String(game.id) === "2" ? "TZS 10,000" : "FREE"}</span>
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
        const displayPrice = String(game.id) === "1" ? "TZS 20,000" : String(game.id) === "2" ? "TZS 10,000" : "FREE";
        return `
            <div class="popular-item" onclick="openDetailsById('${encodeURIComponent(gameId)}')" style="cursor: pointer;">
                <img src="${game.image}" alt="${game.title}" loading="lazy" onerror="this.src='images/nfsmw-shot1.png';">
                <div class="popular-item-info">
                    <h5>${game.title}</h5>
                    <span>${displayPrice}</span>
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

        // Only IDs "1" and "2" are paid games
        const isPaid = String(game.id) === "1" || String(game.id) === "2";
        
        let actionBtnText = isPaid ? "Buy Now" : "Get";
        let actionBtnClass = isPaid ? "btn-download" : "btn-get";
        
        let actionButtonsHTML = '';
        if (isPaid) {
            actionButtonsHTML = `
                <button class="btn-action ${actionBtnClass}" onclick="showPaymentOptionsModal(loadedGamesData[${originalIndex}])">${actionBtnText}</button>
            `;
        } else {
            let gameParts = game.parts || game.downloadParts;
            let targetUrl = game.downloadUrl || (gameParts && gameParts.length > 0 ? "#" : "");
            actionButtonsHTML = `
                <a href="${targetUrl}" target="_blank" class="btn-action ${actionBtnClass}" data-game-id="${encodeURIComponent(gameId)}" data-game-index="${originalIndex}">${actionBtnText}</a>
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
                    <span class="price">${String(game.id) === "1" ? "TZS 20,000" : String(game.id) === "2" ? "TZS 10,000" : "FREE"}</span>
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

/**
 * Dual Payment Modal for Paid Games (Selar vs. Vodacom WhatsApp)
 */
function showPaymentOptionsModal(game) {
    let modal = document.getElementById('payment-options-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'payment-options-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 440px; background: #16161a; padding: 25px; border-radius: 14px; color: #fff; position: relative; box-shadow: 0 15px 35px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.12);">
                <button onclick="closePaymentOptionsModal()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: #aaa; font-size: 1.2rem; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                <h3 id="payment-modal-title" style="margin-top: 0; margin-bottom: 8px; font-size: 1.25rem; color: #fff;">Choose Payment Method</h3>
                <p id="payment-modal-subtitle" style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 20px; line-height: 1.4;">Select your preferred payment option below to complete your order securely.</p>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <!-- Selar Online Payment Option -->
                    <a id="selar-pay-btn" href="#" target="_blank" class="btn-action" style="background: linear-gradient(135deg, #007aff, #0056b3); padding: 14px 16px; border-radius: 10px; font-weight: bold; display: flex; align-items: center; justify-content: space-between; text-decoration: none; color: #fff; box-shadow: 0 4px 15px rgba(0,122,255,0.3);">
                        <span><i class="fa-solid fa-credit-card" style="margin-right: 8px;"></i> Pay Online via Selar</span>
                        <i class="fa-solid fa-external-link-alt" style="font-size: 0.8rem;"></i>
                    </a>

                    <!-- Vodacom WhatsApp Payment Option -->
                    <a id="vodacom-pay-btn" href="#" target="_blank" class="btn-action" style="background: linear-gradient(135deg, #25d366, #128c7e); padding: 14px 16px; border-radius: 10px; font-weight: bold; display: flex; align-items: center; justify-content: space-between; text-decoration: none; color: #fff; box-shadow: 0 4px 15px rgba(37,211,102,0.3);">
                        <span><i class="fa-brands fa-whatsapp" style="margin-right: 8px; font-size: 1.1rem;"></i> Pay via Vodacom (WhatsApp)</span>
                        <i class="fa-solid fa-arrow-right" style="font-size: 0.8rem;"></i>
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closePaymentOptionsModal();
            }
        });
    }

    const displayPrice = String(game.id) === "1" ? "TZS 20,000" : String(game.id) === "2" ? "TZS 10,000" : "Paid Game";
    document.getElementById('payment-modal-title').innerText = `Buy: ${game.title}`;
    document.getElementById('payment-modal-subtitle').innerHTML = `Choose how you want to purchase <b>${displayPrice}</b>. Selar supports card and mobile money, or you can order directly through Vodacom via WhatsApp.`;

    // Extract Selar link from game.parts[0] (or fallback)
    const selarLink = (game.parts && game.parts.length > 0 && game.parts[0].startsWith('http')) ? game.parts[0] : "https://selar.co/m/SquadGamesTZ";
    document.getElementById('selar-pay-btn').href = selarLink;

    // Set WhatsApp Vodacom Link
    const orderMessage = encodeURIComponent(`Hello SquadGames, I want to buy ${game.title} (${game.platform}) using Vodacom mobile money.`);
    document.getElementById('vodacom-pay-btn').href = `https://wa.me/255692752060?text=${orderMessage}`;

    modal.classList.add('active');
}
window.showPaymentOptionsModal = showPaymentOptionsModal;

function closePaymentOptionsModal() {
    const modal = document.getElementById('payment-options-modal');
    if (modal) modal.classList.remove('active');
}
window.closePaymentOptionsModal = closePaymentOptionsModal;

function showDownloadPartsModal(game) {
    let modal = document.getElementById('download-parts-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'download-parts-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px; background: #16161a; padding: 25px; border-radius: 14px; color: #fff; position: relative; box-shadow: 0 15px 35px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.12);">
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
    
    let partsArray = game.parts || game.downloadParts;
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
