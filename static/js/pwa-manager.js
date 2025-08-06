// PWA Manager for Data Analysis Platform
// Handles service worker registration, install prompts, and offline functionality

class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isOnline = navigator.onLine;
        this.offlineQueue = [];
        this.init();
    }

    /**
     * Initialize PWA functionality
     */
    init() {
        console.log('PWA Manager initialized');
        
        // Register service worker
        this.registerServiceWorker();
        
        // Setup install prompt
        this.setupInstallPrompt();
        
        // Setup offline handling
        this.setupOfflineHandling();
        
        // Setup connection monitoring
        this.setupConnectionMonitoring();
        
        // Setup background sync
        this.setupBackgroundSync();
        
        // Check for updates
        this.checkForUpdates();
    }

    /**
     * Register service worker
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });
                
                console.log('Service Worker registered successfully:', registration);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
                
                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    this.handleServiceWorkerMessage(event.data);
                });
                
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        } else {
            console.warn('Service Worker not supported');
        }
    }

    /**
     * Setup install prompt
     */
    setupInstallPrompt() {
        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('beforeinstallprompt event fired');
            
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            
            // Store the event for later use
            this.deferredPrompt = e;
            
            // Show custom install banner
            this.showInstallBanner();
        });

        // Handle install button click
        const installBtn = document.getElementById('install-btn');
        if (installBtn) {
            installBtn.addEventListener('click', () => {
                this.promptInstall();
            });
        }

        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.hideInstallBanner();
            this.deferredPrompt = null;
            
            // Track installation
            this.trackEvent('pwa_installed');
        });
    }

    /**
     * Show install banner
     */
    showInstallBanner() {
        const banner = document.getElementById('install-banner');
        if (banner && !this.isAppInstalled()) {
            banner.style.display = 'block';
            banner.classList.add('show');
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                this.hideInstallBanner();
            }, 10000);
        }
    }

    /**
     * Hide install banner
     */
    hideInstallBanner() {
        const banner = document.getElementById('install-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Check if app is already installed
     */
    isAppInstalled() {
        // Check if running in standalone mode
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    /**
     * Prompt user to install app
     */
    async promptInstall() {
        if (!this.deferredPrompt) {
            console.log('No install prompt available');
            return;
        }

        // Show the install prompt
        this.deferredPrompt.prompt();

        // Wait for the user to respond
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log('Install prompt outcome:', outcome);

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
            this.trackEvent('pwa_install_accepted');
        } else {
            console.log('User dismissed the install prompt');
            this.trackEvent('pwa_install_dismissed');
        }

        // Clear the deferredPrompt
        this.deferredPrompt = null;
        this.hideInstallBanner();
    }

    /**
     * Setup offline handling
     */
    setupOfflineHandling() {
        // Show offline indicator when offline
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showOfflineIndicator();
            console.log('App is offline');
        });

        // Hide offline indicator when online
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.hideOfflineIndicator();
            this.processOfflineQueue();
            console.log('App is online');
        });

        // Check initial connection status
        if (!navigator.onLine) {
            this.showOfflineIndicator();
        }
    }

    /**
     * Show offline indicator
     */
    showOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.style.display = 'block';
        }
    }

    /**
     * Hide offline indicator
     */
    hideOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    /**
     * Setup connection monitoring
     */
    setupConnectionMonitoring() {
        // Monitor connection quality
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            const updateConnectionInfo = () => {
                console.log('Connection type:', connection.effectiveType);
                console.log('Downlink speed:', connection.downlink);
                console.log('RTT:', connection.rtt);
                
                // Adjust app behavior based on connection
                this.adaptToConnection(connection);
            };
            
            connection.addEventListener('change', updateConnectionInfo);
            updateConnectionInfo();
        }
    }

    /**
     * Adapt app behavior based on connection
     */
    adaptToConnection(connection) {
        const slowConnections = ['slow-2g', '2g'];
        
        if (slowConnections.includes(connection.effectiveType)) {
            // Reduce functionality for slow connections
            console.log('Slow connection detected, reducing functionality');
            this.enableDataSaverMode();
        } else {
            this.disableDataSaverMode();
        }
    }

    /**
     * Enable data saver mode
     */
    enableDataSaverMode() {
        document.body.classList.add('data-saver-mode');
        
        // Disable auto-refreshing charts
        const charts = document.querySelectorAll('.plotly-graph-div');
        charts.forEach(chart => {
            chart.style.pointerEvents = 'none';
        });
        
        // Show data saver notification
        this.showDataSaverNotification();
    }

    /**
     * Disable data saver mode
     */
    disableDataSaverMode() {
        document.body.classList.remove('data-saver-mode');
        
        // Re-enable chart interactions
        const charts = document.querySelectorAll('.plotly-graph-div');
        charts.forEach(chart => {
            chart.style.pointerEvents = 'auto';
        });
    }

    /**
     * Show data saver notification
     */
    showDataSaverNotification() {
        const notification = document.createElement('div');
        notification.className = 'alert alert-warning data-saver-alert';
        notification.innerHTML = `
            <i class="fas fa-wifi me-2"></i>
            Data saver mode enabled due to slow connection. Some features may be limited.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        if (container) {
            container.insertAdjacentElement('afterbegin', notification);
        }
    }

    /**
     * Setup background sync
     */
    setupBackgroundSync() {
        // Add requests to queue when offline
        document.addEventListener('submit', (e) => {
            if (!this.isOnline && e.target.tagName === 'FORM') {
                e.preventDefault();
                this.queueFormSubmission(e.target);
            }
        });
    }

    /**
     * Queue form submission for when back online
     */
    queueFormSubmission(form) {
        const formData = new FormData(form);
        const request = {
            url: form.action || window.location.href,
            method: form.method || 'POST',
            data: formData,
            timestamp: Date.now()
        };
        
        this.offlineQueue.push(request);
        this.saveOfflineQueue();
        
        // Show queued notification
        this.showQueuedNotification();
    }

    /**
     * Process offline queue when back online
     */
    async processOfflineQueue() {
        if (this.offlineQueue.length === 0) return;
        
        console.log('Processing offline queue:', this.offlineQueue.length, 'items');
        
        for (const request of this.offlineQueue) {
            try {
                await this.sendQueuedRequest(request);
                console.log('Queued request sent successfully');
            } catch (error) {
                console.error('Failed to send queued request:', error);
            }
        }
        
        // Clear queue
        this.offlineQueue = [];
        this.saveOfflineQueue();
    }

    /**
     * Send queued request
     */
    async sendQueuedRequest(request) {
        const response = await fetch(request.url, {
            method: request.method,
            body: request.data
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    }

    /**
     * Save offline queue to localStorage
     */
    saveOfflineQueue() {
        try {
            localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
        } catch (error) {
            console.error('Failed to save offline queue:', error);
        }
    }

    /**
     * Load offline queue from localStorage
     */
    loadOfflineQueue() {
        try {
            const queue = localStorage.getItem('offlineQueue');
            return queue ? JSON.parse(queue) : [];
        } catch (error) {
            console.error('Failed to load offline queue:', error);
            return [];
        }
    }

    /**
     * Show queued notification
     */
    showQueuedNotification() {
        const notification = document.createElement('div');
        notification.className = 'alert alert-info';
        notification.innerHTML = `
            <i class="fas fa-clock me-2"></i>
            Your request has been queued and will be processed when you're back online.
        `;
        
        const container = document.querySelector('.container');
        if (container) {
            container.insertAdjacentElement('afterbegin', notification);
        }
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    /**
     * Check for app updates
     */
    async checkForUpdates() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.update();
                    console.log('Checked for service worker updates');
                }
            } catch (error) {
                console.error('Failed to check for updates:', error);
            }
        }
    }

    /**
     * Show update notification
     */
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'alert alert-success update-alert';
        notification.innerHTML = `
            <i class="fas fa-download me-2"></i>
            A new version of the app is available! 
            <button class="btn btn-sm btn-success ms-2" onclick="window.location.reload()">
                Update Now
            </button>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        if (container) {
            container.insertAdjacentElement('afterbegin', notification);
        }
    }

    /**
     * Handle messages from service worker
     */
    handleServiceWorkerMessage(data) {
        console.log('Message from service worker:', data);
        
        switch (data.type) {
            case 'CACHE_UPDATED':
                console.log('Cache updated with new content');
                break;
                
            case 'OFFLINE_FALLBACK':
                console.log('Showing offline fallback');
                this.showOfflineIndicator();
                break;
                
            case 'BACKGROUND_SYNC':
                console.log('Background sync completed');
                this.processOfflineQueue();
                break;
        }
    }

    /**
     * Track analytics events
     */
    trackEvent(eventName, parameters = {}) {
        // Send to analytics if available
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, parameters);
        }
        
        console.log('Event tracked:', eventName, parameters);
    }

    /**
     * Get app information
     */
    getAppInfo() {
        return {
            isOnline: this.isOnline,
            isInstalled: this.isAppInstalled(),
            serviceWorkerSupported: 'serviceWorker' in navigator,
            pushSupported: 'PushManager' in window,
            notificationSupported: 'Notification' in window,
            queueLength: this.offlineQueue.length
        };
    }
}

// Initialize PWA Manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.pwaManager = new PWAManager();
    
    // Load offline queue
    window.pwaManager.offlineQueue = window.pwaManager.loadOfflineQueue();
    
    // Expose for debugging
    window.PWAManager = PWAManager;
    
    console.log('PWA Manager ready:', window.pwaManager.getAppInfo());
});

// Handle page beforeunload to save state
window.addEventListener('beforeunload', function() {
    if (window.pwaManager) {
        window.pwaManager.saveOfflineQueue();
    }
});
