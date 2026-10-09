/**
 * Squad Games Store TZ - Core Application Script
 * Synchronized with ApunKaGames Layout: 3-Second Auto Hero Slider, Exact 10 Featured Games, Text Popular Posts Sidebar, and 8-Game Curated Catalog Grid.
 */

let loadedGamesData = [];
let currentSearchQuery = "";
let currentCategory = "all";

// Hero Slider State & Auto-Slide Timer
let currentFeaturedIndex = 0;
let featuredSliderList = [];
let autoSlideTimer = null;

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
        if (e.target.closest('.btn-action') || e.target.closest('.btn-details') || e.target.closest('.hero-slider-img-container')) {
            localStorage.setItem('scrollPosition', window.scrollY);
        }
        
        // Close floating dropdowns if clicked outside
        if (!e.target.closest('.nav-dropdown-btn') && !e.target.closest('.global-floating-dropdown')) {
            closeAllDropdowns();
        }
    });

    // 3. Universal Multi-part popup trigger handler for downloads
    document.addEventListener('click', function(e) {
        if (e.target.closest('#download-parts-modal') || e.target.closest('#payment-options-modal') || e.target.closest('.global-floating-dropdown')) return;

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

/**
 * Smart Helper: Automatically extracts file size from game data if 'size' property is missing
 */
function getGameSize(game) {
    if (game.size) return game.size;
    const textToSearch = (game.description || '') + ' ' + (game.requirements || '');
    const match = textToSearch.match(/(\d+(\.\d+)?\s*(GB|MB))/i);
    return match ? match[0] : 'N/A';
}
window.getGameSize = getGameSize;

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

    // Exact 10 Featured Games requested by user
    const featuredTargetIds = ["1", "2", "19", "8", "13", "12", "46", "7", "27", "51"];
    const featuredGames = games.filter(game => {
        if (featuredTargetIds.includes(String(game.id))) return true;
        const title = (game.title || "").toLowerCase();
        return title.includes("tanzania euro truck simulator 2 + 50 tz mods") ||
               title.includes("tanzania euro truck simulator 2 mobile") ||
               title.includes("need for speed: heat") ||
               title.includes("grand theft auto v legacy") ||
               title.includes("fifa 22") ||
               title.includes("spider-man: miles morales") ||
               title.includes("the last of us part ii") ||
               title.includes("carx street") ||
               title.includes("black ops iii zombies chronicles") ||
               title === "tomb raider";
    });
    
    featuredSliderList = featuredGames.length ? featuredGames : games.slice(0, 10);
    updateHeroSlider(0);
    initAutoSlide();

    renderLatestGamesAdded(games.slice(0, 12));
    renderPopularPostsTextSidebar(games);

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
 * Hero Featured Slider Functions with Auto-Slide (3 Seconds)
 */
function updateHeroSlider(index) {
    if (!featuredSliderList.length) return;
    currentFeaturedIndex = (index + featuredSliderList.length) % featuredSliderList.length;
    const game = featuredSliderList[currentFeaturedIndex];

    const imgEl = document.getElementById('heroSliderImg');
    const titleEl = document.getElementById('heroSliderTitle');

    if (imgEl) imgEl.src = game.image || 'images/nfsmw-shot1.png';
    if (titleEl) titleEl.innerText = game.title;
}

function moveFeaturedSlide(direction) {
    updateHeroSlider(currentFeaturedIndex + direction);
    resetAutoSlide(); 
}
window.moveFeaturedSlide = moveFeaturedSlide;

function openFeaturedDetails() {
    if (featuredSliderList.length > 0) {
        const game = featuredSliderList[currentFeaturedIndex];
        openDetailsById(game.id || game.title);
    }
}
window.openFeaturedDetails = openFeaturedDetails;

function initAutoSlide() {
    if (autoSlideTimer) clearInterval(autoSlideTimer);
    autoSlideTimer = setInterval(() => {
        updateHeroSlider(currentFeaturedIndex + 1);
    }, 3000);

    const sliderContainer = document.querySelector('.hero-slider-wrapper');
    if (sliderContainer) {
        sliderContainer.addEventListener('mouseenter', () => {
            if (autoSlideTimer) clearInterval(autoSlideTimer);
        });
        sliderContainer.addEventListener('mouseleave', () => {
            initAutoSlide();
        });
    }
}

function resetAutoSlide() {
    if (autoSlideTimer) clearInterval(autoSlideTimer);
    initAutoSlide();
}

function renderLatestGamesAdded(games) {
    const container = document.getElementById('latestGamesGrid');
    if (!container) return;

    container.innerHTML = games.map((game, idx) => {
        const gameId = game.id || game.title;
        const dates = ["October 9, 2026", "October 8, 2026", "October 7, 2026", "October 5, 2026"];
        const gameDate = dates[idx % dates.length];

        return `
            <div class="latest-game-card" onclick="openDetailsById('${encodeURIComponent(gameId)}')">
                <img src="${game.image}" alt="${game.title}" loading="lazy" onerror="this.src='images/nfsmw-shot1.png';">
                <div class="latest-game-info">
                    <h5>${game.title}</h5>
                    <span>${gameDate}</span>
                    <span class="badge-latest">Latest</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderPopularPostsTextSidebar(games) {
    const container = document.getElementById('popularPostsTextList');
    if (!container) return;

    const popularSubset = games.slice(0, 10);
    container.innerHTML = popularSubset.map(game => {
        const gameId = game.id || game.title;
        return `
            <a href="#" onclick="openDetailsById('${encodeURIComponent(gameId)}'); return false;" class="popular-text-item">
                <i class="fa-solid fa-angle-right" style="font-size: 0.75rem; margin-right: 6px; color: #e50914;"></i> ${game.title}
            </a>
        `;
    }).join('');
}

/**
 * Dynamically builds navbar dropdowns
 */
function renderNavbarDropdowns(games) {
    const container = document.getElementById('dynamic-game-types');
    if (!container) return;

    let uniqueCategories = new Set();
    let franchisesMap = new Map();

    games.forEach(game => {
        const rawCategory = game.category || game.Category || game.genre || "";
        if (rawCategory) {
            String(rawCategory).split(/[\/,]+/).forEach(cat => {
                let cleanCat = cat.trim();
                if (cleanCat) {
                    uniqueCategories.add(cleanCat.charAt(0).toUpperCase() + cleanCat.slice(1));
                }
            });
        }

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

    let categoriesListHTML = `<div onclick="filterByCategory('all');" style="padding: 10px 14px; color: #f1c40f; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: 600;"><i class="fa-solid fa-layer-group" style="margin-right: 6px;"></i> All Categories (${uniqueCategories.size})</div>`;
    Array.from(uniqueCategories).sort().forEach(cat => {
        categoriesListHTML += `<div onclick="filterByCategory('${cat}');" style="padding: 10px 14px; color: #fff; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" onmouseover="this.style.background='rgba(0,122,255,0.2)'" onmouseout="this.style.background='transparent'">${cat}</div>`;
    });

    let gameTypesListHTML = `<div onclick="filterByCategory('all');" style="padding: 10px 14px; color: #f1c40f; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: 600;"><i class="fa-solid fa-gamepad" style="margin-right: 6px;"></i> All Game Types (${franchisesMap.size})</div>`;
    Array.from(franchisesMap.keys()).sort().forEach(franchise => {
        gameTypesListHTML += `<div onclick="filterByFranchise('${franchise}');" style="padding: 10px 14px; color: #fff; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" onmouseover="this.style.background='rgba(0,122,255,0.2)'" onmouseout="this.style.background='transparent'"><i class="fa-solid fa-fire" style="margin-right: 6px; color: #ff9500; font-size: 0.75rem;"></i> ${franchise}</div>`;
    });

    container.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; width: 100%;">
            <button class="nav-tab active" onclick="filterByCategory('all')">
                <i class="fa-solid fa-house"></i> Home
            </button>
            <button class="nav-tab nav-dropdown-btn" onclick="toggleFloatingDropdown(event, 'categories-dropdown-menu', \`${escapeHtml(categoriesListHTML)}\`)">
                <i class="fa-solid fa-layer-group"></i> All Categories <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; margin-left: 4px;"></i>
            </button>
            <button class="nav-tab nav-dropdown-btn" onclick="toggleFloatingDropdown(event, 'gametypes-dropdown-menu', \`${escapeHtml(gameTypesListHTML)}\`)">
                <i class="fa-solid fa-gamepad"></i> Game Type <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; margin-left: 4px;"></i>
            </button>
        </div>
    `;
}

function escapeHtml(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function toggleFloatingDropdown(event, menuId, htmlContent) {
    event.stopPropagation();
    
    let existingMenu = document.getElementById(menuId);
    if (existingMenu) {
        existingMenu.remove();
        return;
    }

    closeAllDropdowns();

    const btnRect = event.currentTarget.getBoundingClientRect();

    const dropdown = document.createElement('div');
    dropdown.id = menuId;
    dropdown.className = 'global-floating-dropdown';
    dropdown.innerHTML = htmlContent;
    
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${btnRect.bottom + 8}px`;
    dropdown.style.left = `${btnRect.left}px`;
    dropdown.style.background = '#18181c';
    dropdown.style.minWidth = '240px';
    dropdown.style.maxHeight = '320px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.borderRadius = '12px';
    dropdown.style.boxShadow = '0 15px 40px rgba(0,0,0,0.8)';
    dropdown.style.zIndex = '99999';
    dropdown.style.border = '1px solid rgba(255,255,255,0.15)';

    document.body.appendChild(dropdown);
}
window.toggleFloatingDropdown = toggleFloatingDropdown;

function closeAllDropdowns() {
    document.querySelectorAll('.global-floating-dropdown').forEach(el => el.remove());
}
window.closeAllDropdowns = closeAllDropdowns;

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

function applyFilters() {
    let filteredGames = loadedGamesData.filter(game => {
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

    // If on homepage ('all' category and no search), strictly limit to 8 curated games (4 columns x 2 rows)
    if (currentCategory === 'all' && !currentSearchQuery) {
        const priorityTitles = [
            "tanzania euro truck simulator 2 + 50 tz mods packs",
            "tanzania euro truck simulator 2 mobile",
            "need for speed most wanted 2005",
            "need for speed payback",
            "grand theft auto v legacy",
            "call of duty: advanced warfare",
            "fifa 22",
            "carx street"
        ];

        let curatedList = [];
        priorityTitles.forEach(pTitle => {
            const found = filteredGames.find(g => (g.title || "").toLowerCase().includes(pTitle));
            if (found && !curatedList.includes(found)) {
                curatedList.push(found);
            }
        });

        filteredGames.forEach(g => {
            if (!curatedList.includes(g) && curatedList.length < 8) {
                curatedList.push(g);
            }
        });

        filteredGames = curatedList.slice(0, 8);
    }

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
                    <a id="selar-pay-btn" href="#" target="_blank" class="btn-action" style="background: linear-gradient(135deg, #007aff, #0056b3); padding: 14px 16px; border-radius: 10px; font-weight: bold; display: flex; align-items: center; justify-content: space-between; text-decoration: none; color: #fff; box-shadow: 0 4px 15px rgba(0,122,255,0.3);">
                        <span><i class="fa-solid fa-credit-card" style="margin-right: 8px;"></i> Pay Online via Selar</span>
                        <i class="fa-solid fa-external-link-alt" style="font-size: 0.8rem;"></i>
                    </a>

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

    const selarLink = (game.parts && game.parts.length > 0 && game.parts[0].startsWith('http')) ? game.parts[0] : "https://selar.co/m/SquadGamesTZ";
    document.getElementById('selar-pay-btn').href = selarLink;

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
