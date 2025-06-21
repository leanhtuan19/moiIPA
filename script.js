/*
Designed and developed by Le Anh Tuan
Facebook: https://www.facebook.com/atusnmoi
Github: https://github.com/leanhtuan19
Open Source Project
*/
let sampleApps = [];

async function loadAndProcessAppData() {
    const jsonUrl = 'https://raw.githubusercontent.com/apptesters-org/AppTesters_Repo/refs/heads/main/apps.json';
    const groupedApps = {}; // Group apps by bundleIdentifier

    // Helper to format bytes into readable format (KB, MB, GB)
    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    try {
        const response = await fetch(jsonUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const appsToProcess = data.apps || [];

        appsToProcess.forEach(item => {
            const bundleId = item.bundleIdentifier;
            // A bundleIdentifier is required to correctly group app versions.
            if (!bundleId) {
                return; // Skip this item if it's missing a bundleIdentifier.
            }

            let description = item.localizedDescription || '';
            if (description.startsWith('Injected with ')) {
                description = 'Chức năng đã thêm: ' + description.substring('Injected with '.length);
            }

            // Add 'v' prefix to version if it doesn't already have one.
            let versionString = item.version;
            if (versionString && !versionString.toLowerCase().startsWith('v')) {
                versionString = 'v' + versionString;
            }

            const versionData = {
                version: versionString || 'N/A',
                size: formatSize(item.size),
                addedDate: new Date(item.versionDate),
                downloadLink: item.downloadURL,
                description: description
            };

            // If this is the first time we see this app, create a new group for it.
            if (!groupedApps[bundleId]) {
                const category = item.type === 2 ? 'games' : 'apps';
                groupedApps[bundleId] = {
                    name: item.name, // The name might be missing on this version.
                    bundleId: bundleId,
                    category: category,
                    icon: item.iconURL,
                    description: description, // This will be updated with the latest version's description later.
                    versions: []
                };
            }

            // If the app group exists but doesn't have a name yet, try to get it from the current item.
            if (!groupedApps[bundleId].name && item.name) {
                groupedApps[bundleId].name = item.name;
            }

            // Add the current version's data to its app group.
            groupedApps[bundleId].versions.push(versionData);
        });

        // Convert object to array, sort versions by date (latest first), and set latest description
        sampleApps = Object.values(groupedApps)
            .filter(app => app.name) // Fulfills: "if it still has no name value, then hide it"
            .map(app => {
                // Sort versions by date, with the latest version first.
                app.versions.sort((a, b) => b.addedDate - a.addedDate);
                // Use the description from the latest version for the main app card.
                if (app.versions.length > 0) {
                    app.description = app.versions[0].description;
                }
                return app;
            });
    } catch (error) {
        console.error("Could not fetch or process app data:", error);
        filesGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: white; padding: 40px;"><i class="fas fa-exclamation-triangle" style="font-size: 3rem; opacity: 0.5; margin-bottom: 20px;"></i><p style="font-size: 1.2rem; opacity: 0.8;">Không thể tải dữ liệu ứng dụng.</p><p style="font-size: 1rem; opacity: 0.6; margin-top: 10px;">Vui lòng kiểm tra kết nối mạng và thử lại.</p></div>`;
    }
}

// Current active category
let currentCategory = 'all';
let searchQuery = '';

// Pagination
let currentPage = 1;
const appsPerPage = 8;

// DOM elements
const filesGrid = document.getElementById('filesGrid');
const fileModal = document.getElementById('fileModal');
const closeModal = document.getElementById('closeModal');
const contactModal = document.getElementById('contactModal');
const contactBtn = document.getElementById('contactBtn');
const contactLink = document.getElementById('contactLink');
const closeContactModal = document.getElementById('closeContactModal');
const categoryTabs = document.querySelectorAll('.tab-btn');
const sectionTitle = document.getElementById('sectionTitle');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');


// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    const timeDisplay = document.getElementById('timeDisplay');
    function updateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        if (timeDisplay) timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
    }
    if (timeDisplay) {
        setInterval(updateTime, 1000);
        updateTime(); // Initial call
    }

    await loadAndProcessAppData();
    setupEventListeners();
    renderFiles();
});

// Setup event listeners
function setupEventListeners() {
    // Modal close
    closeModal.addEventListener('click', closeFileModal);
    closeContactModal.addEventListener('click', closeContactModalFunc);
    
    // Contact button
    contactBtn.addEventListener('click', openContactModal);
    contactLink.addEventListener('click', openContactModal);
    
    // Prevent modal from closing when clicking on modal content
    fileModal.querySelector('.modal-content').addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    contactModal.querySelector('.contact-modal-content').addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    
    
    window.addEventListener('click', (e) => {
        if (e.target === fileModal) {
            closeFileModal();
        }
        if (e.target === contactModal) {
            closeContactModalFunc();
        }
    });
    
    // Category tabs
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const category = tab.dataset.category;
            switchCategory(category);
        });
    });
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        resetPagination();
        
        if (searchQuery) {
            clearSearch.style.display = 'block';
        } else {
            clearSearch.style.display = 'none';
        }
        
        renderFiles();
    });
    
    // Clear search
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        resetPagination();
        clearSearch.style.display = 'none';
        renderFiles();
        searchInput.focus();
    });

    // Draggable version carousel for desktop
    const slider = document.getElementById('modalVersionsList');
    if (slider) {
        let isDown = false;
        let startX;
        let scrollLeft;

        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            slider.classList.add('active-drag');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });

        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.classList.remove('active-drag');
        });

        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.classList.remove('active-drag');
        });

        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2; // Tăng tốc độ cuộn
            slider.scrollLeft = scrollLeft - walk;
        });
    }
}



// Render files grid
function renderFiles() {
    // Add fade out animation before clearing
    filesGrid.style.opacity = '0';
    filesGrid.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        filesGrid.innerHTML = '';
        
        let filteredApps = currentCategory === 'all' 
            ? sampleApps 
            : sampleApps.filter(app => app.category === currentCategory);
        
        // Apply search filter
        if (searchQuery) {
            // Filter by app name only, and ensure app.name exists to prevent errors.
            filteredApps = filteredApps.filter(app =>
                app.name && app.name.toLowerCase().includes(searchQuery)
            );
        }

        // Get the count of filtered apps before pagination
        const currentCategoryCount = filteredApps.length;

        // Update section title with count
        let categoryIcon, categoryName;
        if (currentCategory === 'all') {
            categoryIcon = 'fas fa-th-large';
            categoryName = 'Tất cả';
        } else if (currentCategory === 'games') {
            categoryIcon = 'fas fa-gamepad';
            categoryName = 'Game';
        } else { // currentCategory === 'apps'
            categoryIcon = 'fas fa-mobile-alt';
            categoryName = 'Ứng dụng';
        }
        sectionTitle.innerHTML = `<i class="${categoryIcon}"></i> ${categoryName} (<span id="categoryCount">${currentCategoryCount}</span>)`;
        
        if (filteredApps.length === 0) {
        const categoryMap = {
            all: 'ứng dụng và game',
            apps: 'ứng dụng',
            games: 'game'
        };
        const categoryName = categoryMap[currentCategory] || 'danh mục này';
        
        const noResultsMessage = searchQuery 
            ? `Không tìm thấy "${searchQuery}" trong ${categoryName}`
            : `Chưa có ${categoryName} nào`;
            
        const iconClass = searchQuery ? 'fas fa-search' : 'fas fa-inbox';
        
        filesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: white; padding: 40px;">
                <i class="${iconClass}" style="font-size: 3rem; opacity: 0.5; margin-bottom: 20px;"></i>
                <p style="font-size: 1.2rem; opacity: 0.8;">${noResultsMessage}</p>
                ${searchQuery ? '<p style="font-size: 1rem; opacity: 0.6; margin-top: 10px;">Thử tìm kiếm với từ khóa khác</p>' : ''}
            </div>
        `;
        updatePagination(0);
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredApps.length / appsPerPage);
    const startIndex = (currentPage - 1) * appsPerPage;
    const endIndex = startIndex + appsPerPage;
    const currentApps = filteredApps.slice(startIndex, endIndex);
    
    // Render current page apps
        currentApps.forEach(app => {
            const fileCard = createFileCard(app);
            filesGrid.appendChild(fileCard);
        });
        
        // Update pagination controls
        updatePagination(totalPages);
        
        // Fade in the grid
        filesGrid.style.opacity = '1';
        filesGrid.style.transform = 'translateY(0)';
    }, 150);
}

// Create file card element
function createFileCard(app) {
    const card = document.createElement('div');
    card.className = 'app-item';

    // Display info from the latest version (first in the sorted array)
    const latestVersion = app.versions[0];

    const categoryIcon = app.category === 'games' ? 'fas fa-gamepad' : 'fas fa-mobile-alt';
    const categoryTag = app.category === 'games' ? 'Game' : 'App';
    const categoryColor = app.category === 'games' ? '#FF9500' : '#007AFF';

    const downloadButtonText = app.versions.length > 1 ? 'Chọn phiên bản' : 'Tải xuống';
    const versionCountText = app.versions.length > 1 ? `<span class="version-count">(<span class="version-number">${app.versions.length}</span> phiên bản)</span>` : '';

    card.innerHTML = `
        <div class="app-icon">
            <img src="${app.icon}" alt="${app.name}" onerror="this.parentElement.innerHTML='<i class=&quot;${categoryIcon}&quot;></i>'">
        </div>
        <div class="app-info">
            <h3>${app.name}</h3>
            ${versionCountText}
            <p>${latestVersion.description}</p>
            <span class="app-category-tag" style="background-color: ${categoryColor}">${categoryTag}</span>
        </div>
        <div class="app-meta">
            <span class="app-size">${latestVersion.size}</span>
            <button class="download-btn">
                <i class="fas fa-download"></i>
                ${downloadButtonText}
            </button>
        </div>
    `;

    card.querySelector('.download-btn').onclick = (e) => {
        e.stopPropagation();
        openFileModal(app);
    };

    card.onclick = () => {
        openFileModal(app);
    };

    return card;
}

// Open file modal
function openFileModal(app) {
    const versionsContainer = document.getElementById('modalVersionsContainer');
    const versionsList = document.getElementById('modalVersionsList');
    const versionsTitle = document.getElementById('modalVersionsTitle');

    document.getElementById('modalIcon').src = app.icon;
    document.getElementById('modalTitle').textContent = app.name;

    versionsList.innerHTML = ''; // Clear previous versions

    if (app.versions.length > 1) {
        versionsContainer.style.display = 'block';
        versionsTitle.innerHTML = `Gồm <span class="modal-version-count">${app.versions.length}</span> phiên bản có sẵn:`;
        app.versions.forEach((version, index) => {
            const versionElement = document.createElement('div');
            versionElement.className = 'version-item';
            if (index === 0) versionElement.classList.add('active');

            versionElement.innerHTML = `
                <div class="version-info">
                    <strong>${version.version}</strong>
                    <span>${version.size} • ${version.addedDate.toLocaleDateString('vi-VN')}</span>
                </div>
                <div class="version-description">${version.description}</div>
            `;
            versionElement.onclick = () => {
                versionsList.querySelectorAll('.version-item').forEach(el => el.classList.remove('active'));
                versionElement.classList.add('active');
                updateModalForVersion(version);
            };
            versionsList.appendChild(versionElement);
        });
        updateModalForVersion(app.versions[0]); // Show latest version details initially
    } else {
        versionsContainer.style.display = 'none';
        updateModalForVersion(app.versions[0]); // Show the only version's details
    }

    fileModal.style.display = 'block';
}

// Close file modal
function closeFileModal() {
    fileModal.style.display = 'none';
}

// Helper to update modal details for a specific version
function updateModalForVersion(version) {
    document.getElementById('modalDescription').textContent = version.description;
    document.getElementById('modalVersion').textContent = `${version.version} • ${version.size} • ${version.addedDate.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    document.getElementById('downloadBtn').onclick = () => downloadApp(version);
}

// Open contact modal
function openContactModal(event) {
    if (event && event.currentTarget === contactBtn) {
        contactBtn.style.transform = 'translateY(-1px) scale(1.02)';
        setTimeout(() => {
            contactBtn.style.transform = '';
        }, 150);
    }
    
    // Show modal with animation
    contactModal.style.display = 'block';
    const modalContent = contactModal.querySelector('.contact-modal-content');
    
    // Trigger animation
    setTimeout(() => {
        modalContent.classList.add('show');
    }, 10);
}

// Close contact modal
function closeContactModalFunc() {
    const modalContent = contactModal.querySelector('.contact-modal-content');
    modalContent.classList.remove('show');
    
    // Hide modal after animation completes
    setTimeout(() => {
        contactModal.style.display = 'none';
    }, 400);
}

// Download app
function downloadApp(version) {
    if (version && version.downloadLink) {
        window.open(version.downloadLink, '_blank');
        closeFileModal();
    } else {
        alert('Link tải xuống chưa được thiết lập cho phiên bản này.');
    }
}





// Remove 3D tilt effect, keep only simple hover animations

// Add floating particles effect
function createParticles() {
    const particlesContainer = document.createElement('div');
    particlesContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
    `;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            animation: float ${Math.random() * 3 + 2}s ease-in-out infinite;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 2}s;
        `;
        particlesContainer.appendChild(particle);
    }
    
    document.body.appendChild(particlesContainer);
}

// Add CSS animation for particles
const style = document.createElement('style');
style.textContent = `
    @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
        50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Update pagination controls
function updatePagination(totalPages) {
    let paginationContainer = document.getElementById('paginationContainer');
    
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'paginationContainer';
        paginationContainer.className = 'pagination-container';
        document.querySelector('.files-section').appendChild(paginationContainer);
    }
    
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    paginationContainer.innerHTML = '';
    
    // First Page button
    const firstBtn = document.createElement('button');
    firstBtn.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
    firstBtn.innerHTML = '<i class="fas fa-angle-double-left"></i>';
    firstBtn.onclick = () => changePage(1);
    paginationContainer.appendChild(firstBtn);

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.onclick = () => changePage(currentPage - 1);
    paginationContainer.appendChild(prevBtn);

    // Page numbers
    const pagesOnEachSide = 2; // Reduced to make space for more buttons
    const pagesToShow = pagesOnEachSide * 2 + 1; // Total 5 pages in the middle
    let startPage, endPage;

    if (totalPages <= pagesToShow) {
        startPage = 1;
        endPage = totalPages;
    } else {
        if (currentPage <= pagesOnEachSide + 1) {
            startPage = 1;
            endPage = pagesToShow;
        } else if (currentPage + pagesOnEachSide >= totalPages) {
            startPage = totalPages - pagesToShow + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - pagesOnEachSide;
            endPage = currentPage + pagesOnEachSide;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => changePage(i);
        paginationContainer.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.onclick = () => changePage(currentPage + 1);
    paginationContainer.appendChild(nextBtn);
    
    // Last Page button
    const lastBtn = document.createElement('button');
    lastBtn.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
    lastBtn.innerHTML = '<i class="fas fa-angle-double-right"></i>';
    lastBtn.onclick = () => changePage(totalPages);
    paginationContainer.appendChild(lastBtn);

    // Page info input
    const pageInfoContainer = document.createElement('div');
    pageInfoContainer.className = 'page-info'; // Re-use the same class for the container

    pageInfoContainer.innerHTML = `
        <span>Trang </span>
        <input type="number" class="page-info-input" value="${currentPage}" min="1" max="${totalPages}">
        <span> / ${totalPages}</span>
    `;
    paginationContainer.appendChild(pageInfoContainer);

    const pageInfoInput = pageInfoContainer.querySelector('.page-info-input');
    pageInfoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const page = parseInt(e.target.value, 10);
            if (!isNaN(page)) {
                changePage(page);
            }
            e.target.blur(); // Bỏ focus khỏi ô input
        }
    });

    // Khi người dùng click ra ngoài, reset giá trị về trang hiện tại
    pageInfoInput.addEventListener('blur', (e) => {
        e.target.value = currentPage;
    });
}

// Change page function
function changePage(page) {
    const totalApps = currentCategory === 'all' 
        ? sampleApps.length 
        : sampleApps.filter(app => app.category === currentCategory).length;
    
    const totalPages = Math.ceil(totalApps / appsPerPage);
    
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderFiles();
    
    // Scroll to top of files section
    document.querySelector('.files-section').scrollIntoView({ behavior: 'smooth' });
}

// Reset pagination when switching categories or searching
function resetPagination() {
    currentPage = 1;
}

// Switch category function
function switchCategory(category) {
    currentCategory = category;
    resetPagination();
    
    categoryTabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === category) {
            tab.classList.add('active');
        }
    });
    
    // Re-render files
    renderFiles();
}
/*
Designed and developed by Le Anh Tuan
Facebook: https://www.facebook.com/atusnmoi
Github: https://github.com/leanhtuan19
Open Source Project
*/
createParticles();
/*
Designed and developed by Le Anh Tuan
Facebook: https://www.facebook.com/atusnmoi
Github: https://github.com/leanhtuan19
Open Source Project
*/