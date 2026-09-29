let loadedGamesData = [];
let currentSearchQuery = "";
let currentCategory = "all";
let currentFranchise = "all";

document.addEventListener("DOMContentLoaded", () => {
    console.log("Squad Games Store initialized.");[cite: 8]

    // 1. Restore scroll position instantly if it was saved before leaving
    const savedPosition = localStorage.getItem('scrollPosition');[cite: 8]
    if (savedPosition !== null) {
        window.scrollTo({
            top: parseInt(savedPosition),
            behavior: 'instant'
        });
        localStorage.removeItem('scrollPosition');[cite: 8]
    }

    // 2. Save scroll position whenever any action/download/details button is clicked
    document.addEventListener('click', function(e) {
        if (e.target.closest('.btn-action') || e.target.closest('.btn-details')) {
            localStorage.setItem('scrollPosition', window.scrollY);[cite: 8]
        }
    });

    // 3. Sleek loading animation handler & Universal Multi-part popup trigger
    document.addEventListener('click', function(e) {
        if (e.target.closest('#download-parts-modal')) return;[cite: 8]

        const downloadBtn = e.target.closest('.btn-download, .btn-get, .btn-action');[cite: 8]
        if (!downloadBtn) return;

        if (downloadBtn.classList.contains('btn-vodacom') || downloadBtn.href.includes('wa.me')) return;[cite: 8]

        let targetGame = null;

        const gameId = downloadBtn.getAttribute('data-game-id');[cite: 8]
        if (gameId) {
            targetGame = loadedGamesData.find(g => (g.id || g.title) == gameId);[cite: 8]
        }

        if (!targetGame) {
            const gameIndex = downloadBtn.getAttribute('data-game-index');[cite: 8]
            if (gameIndex !== null && loadedGamesData[gameIndex]) {
                targetGame = loadedGamesData[gameIndex];[cite: 8]
            }
        }

        if (!targetGame && downloadBtn.href) {
            targetGame = loadedGamesData.find(g => g.downloadUrl && downloadBtn.href.includes(g.downloadUrl));[cite: 8]
        }

        if (targetGame && targetGame.downloadParts && targetGame.downloadParts.length > 0) {
            e.preventDefault();
            showDownloadPartsModal(targetGame);[cite: 8]
            return;
        }

        const targetUrl = downloadBtn.getAttribute('href');[cite: 8]
        if (!targetUrl || targetUrl === '#' || targetUrl === 'undefined' || targetUrl === '') return;[cite: 8]
        if (downloadBtn.classList.contains('preparing')) return;[cite: 8]

        e.preventDefault();
        downloadBtn.classList.add('preparing');[cite: 8]
        
        const originalHTML = downloadBtn.innerHTML;[cite: 8]
        downloadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Preparing Link...`;[cite: 8]

        setTimeout(() => {
            downloadBtn.innerHTML = `<i class="fa-solid fa-check"></i> Redirecting...`;[cite: 8]
            window.open(targetUrl, '_blank');[cite: 8]

            setTimeout(() => {
                downloadBtn.innerHTML = originalHTML;[cite: 8]
                downloadBtn.classList.remove('preparing');[cite: 8]
            }, 2000);
        }, 1000);
    });

    // 4. Load Game Catalog (Only if on index page or if container exists)
    if (document.getElementById("gameGrid") || document.getElementById("games-grid") || document.getElementById("featuredTrack")) {
        loadGameCatalog();[cite: 8]
    }
});

async function loadGameCatalog() {
    const pathSegments = window.location.pathname.split('/').filter(Boolean);[cite: 8]
    const repoPrefix = (window.location.hostname.includes("github.io") && pathSegments.length > 0) ? `/${pathSegments[0]}/` : './';[cite: 8]

    const possiblePaths = [
        repoPrefix + 'games.json',[cite: 8]
        './games.json',[cite: 8]
        'games.json'[cite: 8]
    ];

    let rawData = null;

    for (const path of possiblePaths) {
        try {
            const response = await fetch(path);[cite: 8]
            if (response.ok) {
                rawData = await response.json();[cite: 8]
                break;
            }
        } catch (err) {
            console.warn("Failed path attempt:", path);[cite: 8]
        }
    }

    let gamesArray = [];
    if (Array.isArray(rawData)) {
        gamesArray = rawData;[cite: 8]
    } else if (rawData && typeof rawData === 'object') {
        gamesArray = rawData.games || rawData.data || rawData.list || Object.values(rawData).find(Array.isArray) || [];[cite: 8]
    }

    initStore(gamesArray);[cite: 8]
}

function initStore(games) {
    loadedGamesData = games;[cite: 8]

    const loaderElements = document.querySelectorAll('#loader, #catalog-loader, .loading-state');[cite: 8]
    loaderElements.forEach(el => el.style.display = 'none');[cite: 8]

    populateCategoryDropdown(games);[cite: 8]
    populateFranchiseDropdown(games);[cite: 8]

    const featuredGames = games.filter(game => {
        const title = (game.title || "").toLowerCase();[cite: 8]
        if (title.includes("1.57")) return false;[cite: 8]
        const isEtsTanzaniaOrMobile = title.includes("euro truck") && (title.includes("tanzania") || title.includes("tz") || title.includes("mobile") || title.includes("android"));[cite: 8]
        return isEtsTanzaniaOrMobile || 
               title.includes("spider-man") || 
               title.includes("gta v") || 
               title.includes("gta 5") || 
               title.includes("heat") || 
               title.includes("fifa 22") || 
               title.includes("black ops 3");[cite: 8]
    });
    
    renderFeaturedMarquee(featuredGames.length ? featuredGames : games);[cite: 8]

    const popularGames = games.filter(game => {
        const title = (game.title || "").toLowerCase();[cite: 8]
        return title.includes("euro truck simulator") || title.includes("gta") || title.includes("spider-man");[cite: 8]
    });
    renderPopularList(popularGames.length ? popularGames : games);[cite: 8]

    applyFilters();[cite: 8]

    const searchInput = document.getElementById('gameSearchInput');[cite: 8]
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value.toLowerCase().trim();[cite: 8]
            applyFilters();[cite: 8]
        });
    }

    document.querySelectorAll('.portal-navbar .nav-tab:not(select)').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.portal-navbar .nav-tab:not(select)').forEach(t => t.classList.remove('active'));[cite: 8]
            tab.classList.add('active');[cite: 8]
            currentCategory = "all";[cite: 8]
            
            const categoryDropdown = document.getElementById('categoryDropdown');[cite: 8]
            if (categoryDropdown) categoryDropdown.value = "all";[cite: 8]
            const franchiseDropdown = document.getElementById('franchiseDropdown');[cite: 8]
            if (franchiseDropdown) franchiseDropdown.value = "all";[cite: 8]
            currentFranchise = "all";[cite: 8]

            applyFilters();[cite: 8]
        });
    });

    const categoryDropdown = document.getElementById('categoryDropdown');[cite: 8]
    if (categoryDropdown) {
        categoryDropdown.addEventListener('change', (e) => {
            currentCategory = e.target.value.toLowerCase();[cite: 8]
            document.querySelectorAll('.portal-navbar .nav-tab:not(select)').forEach(t => t.classList.remove('active'));[cite: 8]
            applyFilters();[cite: 8]
        });
    }

    const franchiseDropdown = document.getElementById('franchiseDropdown');[cite: 8]
    if (franchiseDropdown) {
        franchiseDropdown.addEventListener('change', (e) => {
            currentFranchise = e.target.value.toLowerCase();[cite: 8]
            applyFilters();[cite: 8]
        });
    }

    const closeModalBtn = document.querySelector('.close-btn');[cite: 8]
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModalDirect);[cite: 8]

    const fullscreenCloseBtn = document.querySelector('.fullscreen-close');[cite: 8]
    if (fullscreenCloseBtn) fullscreenCloseBtn.addEventListener('click', closeFullScreen);[cite: 8]
}

function populateCategoryDropdown(games) {
    const dropdown = document.getElementById('categoryDropdown');[cite: 8]
    if (!dropdown) return;

    let uniqueCategories = new Set();[cite: 8]
    games.forEach(game => {
        const rawCategory = game.category || game.Category || game.genre || game.tags || "";[cite: 8]
        if (rawCategory) {
            const catString = Array.isArray(rawCategory) ? rawCategory.join('/') : String(rawCategory);[cite: 8]
            catString.split('/').forEach(cat => {
                let cleanCat = cat.trim();[cite: 8]
                if (cleanCat) uniqueCategories.add(cleanCat);[cite: 8]
            });
        }
    });

    dropdown.innerHTML = `<option value="all">📁 Select Category...</option>`;[cite: 8]
    uniqueCategories.forEach(cat => {
        const option = document.createElement('option');[cite: 8]
        option.value = cat.toLowerCase();[cite: 8]
        option.textContent = cat;[cite: 8]
        dropdown.appendChild(option);[cite: 8]
    });
}

function populateFranchiseDropdown(games) {
    const dropdown = document.getElementById('franchiseDropdown');[cite: 8]
    if (!dropdown) return;

    let uniqueFranchises = new Set();[cite: 8]
    games.forEach(game => {
        let franchise = game.franchise || game.series;[cite: 8]
        
        if (!franchise && game.title) {
            const title = game.title.toLowerCase();[cite: 8]
            if (title.includes("need for speed")) franchise = "Need for Speed";[cite: 8]
            else if (title.includes("call of duty")) franchise = "Call of Duty";[cite: 8]
            else if (title.includes("grand theft auto") || title.includes("gta")) franchise = "Grand Theft Auto";[cite: 8]
            else if (title.includes("euro truck simulator")) franchise = "Euro Truck Simulator";[cite: 8]
            else if (title.includes("spider-man")) franchise = "Spider-Man";[cite: 8]
            else if (title.includes("carx street")) franchise = "CarX Street";[cite: 8]
            else if (title.includes("fifa")) franchise = "FIFA";[cite: 8]
        }

        if (franchise) {
            uniqueFranchises.add(franchise.trim());[cite: 8]
        }
    });

    dropdown.innerHTML = `<option value="all">🎮 Select Franchise...</option>`;[cite: 8]
    uniqueFranchises.forEach(fran => {
        const option = document.createElement('option');[cite: 8]
        option.value = fran.toLowerCase();[cite: 8]
        option.textContent = fran;[cite: 8]
        dropdown.appendChild(option);[cite: 8]
    });
}

function renderFeaturedMarquee(sliderGames) {
    const track = document.getElementById("featuredTrack");[cite: 8]
    if (!track) return;

    const cardsHTML = sliderGames.map((game) => {
        const gameId = game.id || game.title;[cite: 8]
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

    track.innerHTML = cardsHTML + cardsHTML;[cite: 8]
    initSmoothMarquee(track);[cite: 8]
}

function initSmoothMarquee(track) {
    if (track.dataset.scrollingActive === "true") return;[cite: 8]
    track.dataset.scrollingActive = "true";[cite: 8]

    let scrollAmount = 0;[cite: 8]
    const speed = 1.0;[cite: 8]
    let isPaused = false;[cite: 8]

    track.addEventListener('mouseenter', () => isPaused = true);[cite: 8]
    track.addEventListener('mouseleave', () => isPaused = false);[cite: 8]
    track.addEventListener('touchstart', () => isPaused = true);[cite: 8]
    track.addEventListener('touchend', () => isPaused = false);[cite: 8]

    function scrollStep() {
        if (!isPaused) {
            scrollAmount += speed;[cite: 8]
            if (scrollAmount >= track.scrollWidth / 2) {
                scrollAmount = 0;[cite: 8]
            }
            track.style.transform = `translateX(-${scrollAmount}px)`;[cite: 8]
        }
        requestAnimationFrame(scrollStep);[cite: 8]
    }

    requestAnimationFrame(scrollStep);[cite: 8]
}

function renderPopularList(popularGames) {
    const container = document.getElementById("popularList");[cite: 8]
    if (!container) return;

    container.innerHTML = popularGames.map((game) => {
        const gameId = game.id || game.title;[cite: 8]
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
        const title = (game.title || "").toLowerCase();[cite: 8]
        const description = (game.description || "").toLowerCase();[cite: 8]
        const category = (game.category || game.Category || "").toLowerCase();[cite: 8]
        const platform = (game.platform || "").toLowerCase();[cite: 8]
        const franchiseField = (game.franchise || game.series || "").toLowerCase();[cite: 8]
        const fullText = (title + " " + description).toLowerCase();[cite: 8]

        const matchesSearch = title.includes(currentSearchQuery) || description.includes(currentSearchQuery);[cite: 8]

        let matchesCategory = true;[cite: 8]
        if (currentCategory !== 'all') {
            matchesCategory = category.includes(currentCategory) || platform.includes(currentCategory);[cite: 8]
        }

        let matchesFranchise = true;[cite: 8]
        if (currentFranchise !== 'all') {
            matchesFranchise = franchiseField.includes(currentFranchise) || fullText.includes(currentFranchise);[cite: 8]
        }

        return matchesSearch && matchesCategory && matchesFranchise;[cite: 8]
    });

    renderGameStore(filteredGames);[cite: 8]
}

function renderGameStore(gameList) {
    const container = document.getElementById("gameGrid") || document.getElementById("games-grid");[cite: 8]

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
        const gameId = game.id || game.title;[cite: 8]
        const originalIndex = loadedGamesData.indexOf(game);[cite: 8]
        const card = document.createElement("div");[cite: 8]
        card.classList.add("game-card");[cite: 8]

        const priceText = String(game.price || "").trim().toUpperCase();[cite: 8]
        const isFree = priceText === "FREE" || priceText === "0" || priceText.includes("FREE");[cite: 8]

        const actionBtnText = isFree ? "Get" : "Buy Now";[cite: 8]
        const actionBtnClass = isFree ? "btn-get" : "btn-download";[cite: 8]
        
        const targetUrl = game.downloadUrl || (game.downloadParts && game.downloadParts.length > 0 ? "#" : "");[cite: 8]

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
    window.location.href = `details.html?id=${id}`;[cite: 8]
}

function openDetails(index) {
    const game = loadedGamesData[index];[cite: 8]
    if (!game) return;
    const identifier = game.id !== undefined ? game.id : game.title;[cite: 8]
    openDetailsById(identifier);[cite: 8]
}

function openFullScreen(imgSrc) {
    const fullModal = document.getElementById("fullscreenOverlay") || document.getElementById("fullscreen-modal");[cite: 8]
    const fullImg = document.getElementById("fullscreenImg") || document.getElementById("fullscreen-img");[cite: 8]
    if (fullImg) fullImg.src = imgSrc;[cite: 8]
    if (fullModal) {
        fullModal.style.display = 'flex';
        setTimeout(() => fullModal.classList.add("active"), 10);
    }
}

function closeFullScreen() {
    const fullModal = document.getElementById("fullscreenOverlay") || document.getElementById("fullscreen-modal");[cite: 8]
    if (fullModal) {
        fullModal.classList.remove("active");
        setTimeout(() => {
            if (fullModal.id === 'fullscreen-modal') fullModal.style.display = 'none';
        }, 300);
    }
}

function showDownloadPartsModal(game) {
    let modal = document.getElementById('download-parts-modal');[cite: 8]
    if (!modal) {
        modal = document.createElement('div');[cite: 8]
        modal.id = 'download-parts-modal';[cite: 8]
        modal.className = 'modal-overlay';[cite: 8]
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
        document.body.appendChild(modal);[cite: 8]
        
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeDownloadPartsModal();[cite: 8]
            }
        });
    }

    const titleEl = document.getElementById('parts-modal-title');
    if (titleEl) titleEl.innerText = `Download: ${game.title}`;[cite: 8]
    
    let partsArray = game.downloadParts;[cite: 8]
    if (typeof partsArray === 'string') {
        try { partsArray = JSON.parse(partsArray); } catch (e) { partsArray = []; }[cite: 8]
    }
    partsArray = partsArray || [];[cite: 8]

    const container = document.getElementById('parts-list-container');[cite: 8]
    if (container) {
        container.innerHTML = partsArray.map((part, idx) => {
            const partUrl = (typeof part === 'object' && part !== null) ? (part.url || part.link || '#') : part;[cite: 8]
            const partName = (typeof part === 'object' && part !== null) ? (part.name || `Part ${idx + 1}`) : `Part ${idx + 1}`;[cite: 8]

            return `
                <a href="${partUrl}" target="_blank" class="btn-action btn-get" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; text-decoration: none;">
                    <span><i class="fa-solid fa-download"></i> ${partName}</span>
                    <i class="fa-solid fa-external-link-alt" style="font-size: 0.8rem;"></i>
                </a>
            `;
        }).join('');
    }

    modal.classList.add('active');[cite: 8]
}

function closeDownloadPartsModal() {
    const modal = document.getElementById('download-parts-modal');[cite: 8]
    if (modal) modal.classList.remove('active');[cite: 8]
}
