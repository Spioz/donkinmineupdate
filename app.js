// Donkin Mine Tracker - Mobile PWA JavaScript

class DonkinMineTracker {
    constructor() {
        this.newsItems = [];
        this.seenItems = new Set();
        this.settings = {
            email: '',
            frequency: 'daily',
            theme: 'auto',
            pushNotifications: false
        };
        this.currentView = 'news';
        this.deferredPrompt = null;
        this.isRefreshing = false;
        this.touchStartY = 0;
        this.pullToRefreshThreshold = 60;
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.setupPWAFeatures();
        this.setupPullToRefresh();
        this.loadMockData();
        this.renderNews();
        this.updateNewsCount();
        this.applyTheme();
    }

    // Data Management
    async loadData() {
        try {
            // Load from localStorage for now (can be upgraded to IndexedDB)
            const newsData = localStorage.getItem('donkin-news');
            if (newsData) {
                this.newsItems = JSON.parse(newsData);
            }

            const seenData = localStorage.getItem('donkin-seen');
            if (seenData) {
                this.seenItems = new Set(JSON.parse(seenData));
            }

            const settingsData = localStorage.getItem('donkin-settings');
            if (settingsData) {
                this.settings = { ...this.settings, ...JSON.parse(settingsData) };
            }
        } catch (error) {
            console.warn('Error loading data:', error);
        }
    }

    async saveData() {
        try {
            localStorage.setItem('donkin-news', JSON.stringify(this.newsItems));
            localStorage.setItem('donkin-seen', JSON.stringify([...this.seenItems]));
            localStorage.setItem('donkin-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Error saving data:', error);
        }
    }

    loadMockData() {
        if (this.newsItems.length === 0) {
            this.newsItems = [
                {
                    id: 1,
                    title: "International Mining Consortium Shows Interest in Donkin",
                    summary: "A major international mining consortium has reportedly expressed preliminary interest in acquiring the Donkin coal mine, according to sources close to the negotiations.",
                    category: "Investor News",
                    timestamp: new Date("2025-08-17T09:00:00Z").getTime(),
                    sources: [
                        { name: "CBC Nova Scotia", url: "https://cbc.ca/news/example" },
                        { name: "SaltWire Network", url: "https://saltwire.com/example" }
                    ],
                    content: "Full detailed content about the international mining consortium's interest in the Donkin coal mine. This would include comprehensive reporting on the potential acquisition, the parties involved, financial implications, and impact on local communities. The content would be much longer in a real application, providing in-depth analysis and context about the mine's strategic importance and the consortium's background.",
                    isNew: !this.seenItems.has(1)
                },
                {
                    id: 2,
                    title: "Morien Resources Quarterly Update",
                    summary: "Morien Resources releases Q3 financial results with specific focus on Donkin mine royalties and operational updates.",
                    category: "Financial Reports",
                    timestamp: new Date("2025-08-16T14:30:00Z").getTime(),
                    sources: [
                        { name: "Mining Weekly", url: "https://miningweekly.com/example" },
                        { name: "Financial Post", url: "https://financialpost.com/example" }
                    ],
                    content: "Detailed financial report from Morien Resources covering their quarterly performance, with particular attention to revenues from Donkin mine royalties. The report would include financial metrics, market analysis, future projections, and commentary from company executives about the strategic importance of their Donkin mine interests.",
                    isNew: !this.seenItems.has(2)
                },
                {
                    id: 3,
                    title: "Local Community Responds to Sale Rumors",
                    summary: "Cape Breton community leaders share concerns and hopes regarding potential changes in Donkin mine ownership.",
                    category: "Operations Updates",
                    timestamp: new Date("2025-08-15T11:15:00Z").getTime(),
                    sources: [
                        { name: "Cape Breton Post", url: "https://capebretonpost.com/example" }
                    ],
                    content: "Community response article covering local perspectives on the potential sale of Donkin mine. This would include interviews with community leaders, workers, local politicians, and residents discussing the economic impact, job security concerns, environmental considerations, and hopes for the mine's future under new ownership.",
                    isNew: !this.seenItems.has(3)
                }
            ];
            this.saveData();
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Header actions
        document.getElementById('refresh-btn')?.addEventListener('click', () => this.refreshNews());
        document.getElementById('settings-btn')?.addEventListener('click', () => this.showSettings());

        // Bottom navigation
        document.getElementById('nav-news')?.addEventListener('click', () => this.switchView('news'));
        document.getElementById('nav-archive')?.addEventListener('click', () => this.showArchive());
        document.getElementById('nav-search')?.addEventListener('click', () => this.showSearch());
        document.getElementById('nav-settings')?.addEventListener('click', () => this.showSettings());

        // Modal close buttons
        document.getElementById('detail-back-btn')?.addEventListener('click', () => this.hideModal('news-detail-modal'));
        document.getElementById('archive-back-btn')?.addEventListener('click', () => this.hideModal('archive-modal'));
        document.getElementById('search-back-btn')?.addEventListener('click', () => this.hideModal('search-modal'));
        document.getElementById('settings-back-btn')?.addEventListener('click', () => this.hideModal('settings-modal'));

        // Settings actions
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('install-app-btn')?.addEventListener('click', () => this.installApp());

        // Search input
        document.getElementById('search-input')?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('search-clear-btn')?.addEventListener('click', () => this.clearSearch());

        // Install prompt
        document.getElementById('install-accept')?.addEventListener('click', () => this.acceptInstall());
        document.getElementById('install-dismiss')?.addEventListener('click', () => this.dismissInstall());

        // Empty state refresh
        document.getElementById('empty-refresh-btn')?.addEventListener('click', () => this.refreshNews());

        // Share button
        document.getElementById('detail-share-btn')?.addEventListener('click', () => this.shareNews());

        // Archive clear
        document.getElementById('archive-clear-btn')?.addEventListener('click', () => this.clearArchive());

        // Modal overlay clicks
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }

    setupPWAFeatures() {
        // Install prompt handling
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });

        // App installed
        window.addEventListener('appinstalled', () => {
            this.showToast('App installed successfully!', 'success');
            this.hideInstallPrompt();
        });

        // Service worker (if available)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('SW registered'))
                .catch(() => console.log('SW registration failed'));
        }
    }

    setupPullToRefresh() {
        const mainElement = document.querySelector('.app-main');
        if (!mainElement) return;

        let startY = 0;
        let currentY = 0;
        let isPulling = false;

        mainElement.addEventListener('touchstart', (e) => {
            if (mainElement.scrollTop === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        }, { passive: true });

        mainElement.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            
            currentY = e.touches[0].clientY;
            const pullDistance = currentY - startY;
            
            if (pullDistance > 0 && mainElement.scrollTop === 0) {
                e.preventDefault();
                const pullIndicator = document.getElementById('pull-indicator');
                
                if (pullDistance > this.pullToRefreshThreshold) {
                    pullIndicator?.classList.remove('hidden');
                    pullIndicator?.classList.add('show');
                } else {
                    pullIndicator?.classList.add('hidden');
                    pullIndicator?.classList.remove('show');
                }
            }
        }, { passive: false });

        mainElement.addEventListener('touchend', (e) => {
            if (!isPulling) return;
            
            const pullDistance = currentY - startY;
            const pullIndicator = document.getElementById('pull-indicator');
            
            if (pullDistance > this.pullToRefreshThreshold) {
                this.refreshNews();
            }
            
            pullIndicator?.classList.add('hidden');
            pullIndicator?.classList.remove('show');
            isPulling = false;
        }, { passive: true });
    }

    // Navigation
    switchView(view) {
        this.currentView = view;
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.getElementById(`nav-${view}`)?.classList.add('active');

        // Show appropriate content
        if (view === 'news') {
            this.hideAllModals();
        }
    }

    // News Management
    async refreshNews() {
        if (this.isRefreshing) return;
        
        this.isRefreshing = true;
        this.showLoadingState();
        
        try {
            // Simulate API call
            await this.simulateApiCall(2000);
            
            // Add some new mock news (simulating fresh content)
            const newNews = this.generateMockNews();
            const existingIds = this.newsItems.map(item => item.id);
            const freshNews = newNews.filter(item => !existingIds.includes(item.id));
            
            if (freshNews.length > 0) {
                this.newsItems.unshift(...freshNews);
                this.showToast(`Found ${freshNews.length} new articles!`, 'success');
            } else {
                this.showToast('No new articles found', 'info');
            }
            
            await this.saveData();
            this.renderNews();
            this.updateNewsCount();
            
        } catch (error) {
            console.error('Error refreshing news:', error);
            this.showToast('Failed to refresh news', 'error');
        } finally {
            this.hideLoadingState();
            this.isRefreshing = false;
        }
    }

    generateMockNews() {
        const headlines = [
            "New Investor Interest in Donkin Mine Operations",
            "Environmental Assessment Update for Donkin",
            "Donkin Mine Employment Figures Released",
            "Regional Economic Impact Study Published",
            "Coal Market Analysis Affects Donkin Valuation"
        ];
        
        const categories = ["Investor News", "Operations Updates", "Financial Reports", "Regulatory News"];
        
        return headlines.map((title, index) => ({
            id: Date.now() + index,
            title,
            summary: `Latest updates regarding ${title.toLowerCase()}. This represents fresh news content that would be fetched from real news sources.`,
            category: categories[Math.floor(Math.random() * categories.length)],
            timestamp: Date.now() - (index * 3600000), // Spread over hours
            sources: [
                { name: "News Source", url: "#" }
            ],
            content: `Full content for ${title}. In a real application, this would contain the complete article text, analysis, and detailed information about the topic.`,
            isNew: true
        }));
    }

    renderNews() {
        const newsList = document.getElementById('news-list');
        const emptyState = document.getElementById('empty-state');
        
        if (!newsList) return;

        if (this.newsItems.length === 0) {
            newsList.innerHTML = '';
            emptyState?.classList.remove('hidden');
            return;
        }

        emptyState?.classList.add('hidden');

        // Sort by timestamp (newest first)
        const sortedNews = [...this.newsItems].sort((a, b) => b.timestamp - a.timestamp);

        newsList.innerHTML = sortedNews.map(item => this.createNewsItemHTML(item)).join('');

        // Add click listeners
        newsList.querySelectorAll('.news-item').forEach(element => {
            element.addEventListener('click', () => {
                const itemId = parseInt(element.dataset.id);
                this.showNewsDetail(itemId);
                this.markAsSeen(itemId);
            });
        });
    }

    createNewsItemHTML(item) {
        const isNew = item.isNew && !this.seenItems.has(item.id);
        const date = new Date(item.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="news-item ${isNew ? 'new' : ''}" data-id="${item.id}">
                <div class="news-item-header">
                    <h3 class="news-item-title">${item.title}</h3>
                    <div class="news-item-status">
                        <span class="status-badge ${isNew ? 'new' : 'seen'}">${isNew ? 'NEW' : 'SEEN'}</span>
                    </div>
                </div>
                <div class="news-item-meta">
                    <span class="category-badge">${item.category}</span>
                    <span class="news-date">${date}</span>
                </div>
                <p class="news-item-summary">${item.summary}</p>
            </div>
        `;
    }

    showNewsDetail(itemId) {
        const item = this.newsItems.find(news => news.id === itemId);
        if (!item) return;

        document.getElementById('detail-title').textContent = item.title;
        document.getElementById('detail-category').textContent = item.category;
        document.getElementById('detail-date').textContent = new Date(item.timestamp).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const isNew = !this.seenItems.has(item.id);
        const statusElement = document.getElementById('detail-status');
        statusElement.textContent = isNew ? 'NEW' : 'SEEN';
        statusElement.className = `status-badge ${isNew ? 'new' : 'seen'}`;
        
        document.getElementById('detail-summary').textContent = item.summary;
        document.getElementById('detail-content').textContent = item.content;

        // Render sources
        const sourcesList = document.getElementById('sources-list');
        sourcesList.innerHTML = item.sources.map(source => `
            <a href="${source.url}" target="_blank" class="source-item">
                <svg class="source-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15,3 21,3 21,9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                <span>${source.name}</span>
            </a>
        `).join('');

        this.showModal('news-detail-modal');
    }

    markAsSeen(itemId) {
        this.seenItems.add(itemId);
        this.saveData();
        this.renderNews();
        this.updateNewsCount();
    }

    updateNewsCount() {
        const newCount = this.newsItems.filter(item => !this.seenItems.has(item.id)).length;
        const totalCount = this.newsItems.length;
        document.getElementById('news-count').textContent = `${totalCount} items (${newCount} new)`;
    }

    // Archive Management
    showArchive() {
        const archiveList = document.getElementById('archive-list');
        const sortedNews = [...this.newsItems].sort((a, b) => b.timestamp - a.timestamp);

        archiveList.innerHTML = sortedNews.map(item => `
            <div class="archive-item" data-id="${item.id}">
                <div class="archive-item-info">
                    <div class="archive-item-title">${item.title}</div>
                    <div class="archive-item-date">${new Date(item.timestamp).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');

        // Add click listeners
        archiveList.querySelectorAll('.archive-item').forEach(element => {
            element.addEventListener('click', () => {
                const itemId = parseInt(element.dataset.id);
                this.hideModal('archive-modal');
                setTimeout(() => this.showNewsDetail(itemId), 300);
            });
        });

        this.showModal('archive-modal');
    }

    clearArchive() {
        if (confirm('Are you sure you want to clear all archived news?')) {
            this.newsItems = [];
            this.seenItems.clear();
            this.saveData();
            this.renderNews();
            this.updateNewsCount();
            this.hideModal('archive-modal');
            this.showToast('Archive cleared', 'info');
        }
    }

    // Search Functionality
    showSearch() {
        this.showModal('search-modal');
        setTimeout(() => {
            document.getElementById('search-input')?.focus();
        }, 300);
    }

    handleSearch(query) {
        const searchResults = document.getElementById('search-results');
        
        if (!query.trim()) {
            searchResults.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>Start typing to search</h3>
                    <p>Search through all your saved news articles</p>
                </div>
            `;
            return;
        }

        const results = this.newsItems.filter(item => 
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.summary.toLowerCase().includes(query.toLowerCase()) ||
            item.content.toLowerCase().includes(query.toLowerCase()) ||
            item.category.toLowerCase().includes(query.toLowerCase())
        );

        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <h3>No results found</h3>
                    <p>Try different keywords</p>
                </div>
            `;
            return;
        }

        searchResults.innerHTML = results.map(item => `
            <div class="archive-item" data-id="${item.id}">
                <div class="archive-item-info">
                    <div class="archive-item-title">${this.highlightText(item.title, query)}</div>
                    <div class="archive-item-date">${new Date(item.timestamp).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');

        // Add click listeners
        searchResults.querySelectorAll('.archive-item').forEach(element => {
            element.addEventListener('click', () => {
                const itemId = parseInt(element.dataset.id);
                this.hideModal('search-modal');
                setTimeout(() => this.showNewsDetail(itemId), 300);
            });
        });
    }

    highlightText(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    clearSearch() {
        const searchInput = document.getElementById('search-input');
        searchInput.value = '';
        this.handleSearch('');
        searchInput.focus();
    }

    // Settings Management
    showSettings() {
        // Load current settings
        document.getElementById('settings-email').value = this.settings.email;
        document.getElementById('settings-frequency').value = this.settings.frequency;
        document.getElementById('settings-theme').value = this.settings.theme;
        document.getElementById('settings-push').checked = this.settings.pushNotifications;

        // Show install button if available
        const installBtn = document.getElementById('install-app-btn');
        if (this.deferredPrompt) {
            installBtn?.classList.remove('hidden');
        }

        this.showModal('settings-modal');
    }

    async saveSettings() {
        const email = document.getElementById('settings-email').value;
        const frequency = document.getElementById('settings-frequency').value;
        const theme = document.getElementById('settings-theme').value;
        const pushNotifications = document.getElementById('settings-push').checked;

        // Validate email
        if (email && !this.validateEmail(email)) {
            this.showToast('Please enter a valid email address', 'error');
            return;
        }

        // Update settings
        this.settings = {
            email,
            frequency,
            theme,
            pushNotifications
        };

        await this.saveData();
        this.applyTheme();
        
        // Request notification permission if enabled
        if (pushNotifications && 'Notification' in window) {
            await Notification.requestPermission();
        }

        this.showToast('Settings saved successfully!', 'success');
        this.hideModal('settings-modal');
    }

    applyTheme() {
        const { theme } = this.settings;
        const root = document.documentElement;
        
        if (theme === 'dark') {
            root.setAttribute('data-color-scheme', 'dark');
        } else if (theme === 'light') {
            root.setAttribute('data-color-scheme', 'light');
        } else {
            root.removeAttribute('data-color-scheme');
        }
    }

    // PWA Installation
    showInstallPrompt() {
        const installPrompt = document.getElementById('install-prompt');
        installPrompt?.classList.add('show');
    }

    hideInstallPrompt() {
        const installPrompt = document.getElementById('install-prompt');
        installPrompt?.classList.remove('show');
    }

    async acceptInstall() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            this.deferredPrompt = null;
        }
        this.hideInstallPrompt();
    }

    dismissInstall() {
        this.hideInstallPrompt();
        // Don't show again for a while
        localStorage.setItem('install-dismissed', Date.now().toString());
    }

    async installApp() {
        if (this.deferredPrompt) {
            await this.acceptInstall();
        } else {
            this.showToast('App installation not available', 'info');
        }
    }

    // Sharing
    async shareNews() {
        const titleElement = document.getElementById('detail-title');
        const title = titleElement?.textContent || 'Donkin Mine News';
        const url = window.location.href;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    url,
                    text: 'Check out this news about Donkin Mine'
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            // Fallback to clipboard
            try {
                await navigator.clipboard.writeText(`${title} - ${url}`);
                this.showToast('Link copied to clipboard!', 'success');
            } catch (error) {
                this.showToast('Unable to share', 'error');
            }
        }
    }

    // Modal Management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        document.body.style.overflow = '';
    }

    // Loading States
    showLoadingState() {
        document.getElementById('loading-state')?.classList.remove('hidden');
        document.getElementById('news-list')?.classList.add('hidden');
        document.getElementById('empty-state')?.classList.add('hidden');
    }

    hideLoadingState() {
        document.getElementById('loading-state')?.classList.add('hidden');
        document.getElementById('news-list')?.classList.remove('hidden');
    }

    // Toast Notifications
    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; margin-left: 12px;">&times;</button>
            </div>
        `;

        container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Utilities
    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    async simulateApiCall(delay = 1000) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.1) { // 90% success rate
                    resolve();
                } else {
                    reject(new Error('API call failed'));
                }
            }, delay);
        });
    }

    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.donkinApp = new DonkinMineTracker();

    // Development helpers
    if (process?.env?.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        console.log('🔧 Development mode');
        console.log('Available commands:');
        console.log('- donkinApp.refreshNews() - Refresh news feed');
        console.log('- donkinApp.showToast(msg, type) - Show toast notification');
        console.log('- donkinApp.generateMockNews() - Generate mock news items');
    }
});

// Handle app lifecycle events
window.addEventListener('beforeunload', () => {
    // Save any pending changes
    if (window.donkinApp) {
        window.donkinApp.saveData();
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    if (window.donkinApp) {
        window.donkinApp.showToast('Back online!', 'success');
    }
});

window.addEventListener('offline', () => {
    if (window.donkinApp) {
        window.donkinApp.showToast('You are offline', 'warning');
    }
});

// Handle visibility change (tab switching)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.donkinApp) {
        // App became visible, could refresh data
        const lastRefresh = localStorage.getItem('last-refresh');
        const now = Date.now();
        if (!lastRefresh || now - parseInt(lastRefresh) > 300000) { // 5 minutes
            // Auto refresh if it's been a while
            setTimeout(() => {
                if (window.donkinApp && !window.donkinApp.isRefreshing) {
                    window.donkinApp.refreshNews();
                }
            }, 1000);
        }
    }
});

// Prevent zoom on double tap (mobile)
let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
    var now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);