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

    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get('category');
    const urlFranchise = urlParams.get('franchise');

    const catalogTitleEl = document.getElementById('catalogSectionTitle');

    if (urlCategory || urlFranchise) {
        const featuredBox = document.querySelector('.apunka-featured-box');
        if (featuredBox) featuredBox.style.display = 'none';

        const latestBox = document.querySelector('.apunka-section-box');
        if (latestBox) latestBox.style.display = 'none';

        const trustBar = document.querySelector('.trust-bar');
        if (trustBar) trustBar.style.display = 'none';

        if (urlCategory && catalogTitleEl) {
            catalogTitleEl.innerHTML = `<i class="fa-solid fa-layer-group"></i> Category: ${urlCategory}`;
        } else if (urlFranchise && catalogTitleEl) {
            catalogTitleEl.innerHTML = `<i class="fa-solid fa-gamepad"></i> Game Type: ${urlFranchise}`;
        }
    } else {
        // Exact 10 Featured Games requested by user for homepage
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
    }

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
 * Intelligent Franchise / Game Series Grouper
 */
function getGameFranchise(title) {
    const t = (title || "").toLowerCase();
    
    if (t.includes("need for speed") || t.includes("nfs")) return "Need for Speed";
    if (t.includes("gta") || t.includes("grand theft auto")) return "Grand Theft Auto (GTA)";
    if (t.includes("euro truck") || t.includes("truckers")) return "Euro Truck Simulator";
    if (t.includes("spider-man") || t.includes("spiderman")) return "Spider-Man";
    if (t.includes("call of duty") || t.includes("black ops") || t.includes("modern warfare") || t.includes("advanced warfare")) return "Call of Duty";
    if (t.includes("fifa") || t.includes("pes") || t.includes("pro evolution soccer") || t.includes("nba") || t.includes("fc ")) return "Football / Sports";
    if (t.includes("tomb raider")) return "Tomb Raider";
    if (t.includes("the last of us")) return "The Last of Us";
    if (t.includes("red dead")) return "Red Dead Redemption";
    if (t.includes("assetto corsa")) return "Assetto Corsa";
    if (t.includes("carx")) return "CarX Games";
    if (t.includes("battlefield")) return "Battlefield";
    if (t.includes("far cry")) return "Far Cry";
    if (t.includes("resident evil")) return "Resident Evil";
    if (t.includes("assassin")) return "Assassin's Creed";
    
    let cleanTitle = title.split(/[:\-\+]/)[0].trim();
    return cleanTitle;
}

/**
 * Dynamically builds navbar dropdowns (Grouped by Game Series / Franchises)
 */
function renderNavbarDropdowns(games) {
    const container = document.getElementById('dynamic-game-types');
    if (!container) return;

    let uniqueCategories = new Set();
    let gameTypesMap = new Map();

    games.forEach(game => {
        const rawCategory = game.category || game.Category || game.genre || "";
        if (rawCategory) {
            String(rawCategory).split(/[\/,|]+/).forEach(cat => {
                let cleanCat = cat.trim();
                if (cleanCat) {
                    uniqueCategories.add(cleanCat.charAt(0).toUpperCase() + cleanCat.slice(1));
                }
            });
        }

        const franchiseName = getGameFranch
