// Service Worker for Data Analysis Platform
// Handles caching, offline functionality, and background sync

const CACHE_NAME = 'data-analysis-platform-v1.0.0';
const DYNAMIC_CACHE = 'data-analysis-platform-dynamic-v1.0.0';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/static/css/style.css',
    '/static/js/main.js',
    '/static/js/pwa-manager.js',
    '/static/icons/icon-192.svg',
    '/static/icons/icon-512.svg',
    '/offline',
    // External CDN assets
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.plot.ly/plotly-2.26.0.min.js'
];

// Routes that should be cached
const CACHEABLE_ROUTES = [
    '/',
    '/upload',
    '/preview',
    '/clean',
    '/dashboard'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Static assets cached successfully');
                // Force activation of new service worker
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Failed to cache static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Old caches cleaned up');
                // Take control of all clients
                return self.clients.claim();
            })
            .catch((error) => {
                console.error('Failed to clean up old caches:', error);
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other schemes
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Handle different types of requests
    if (url.pathname.startsWith('/static/')) {
        // Static assets - cache first
        event.respondWith(handleStaticAssets(request));
    } else if (CACHEABLE_ROUTES.includes(url.pathname)) {
        // App routes - network first with cache fallback
        event.respondWith(handleAppRoutes(request));
    } else if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/export/')) {
        // API requests - network only with offline queue
        event.respondWith(handleApiRequests(request));
    } else {
        // Other requests - network first
        event.respondWith(handleOtherRequests(request));
    }
});

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticAssets(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fetch from network and cache
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Failed to serve static asset:', error);
        return new Response('Asset not available offline', { status: 503 });
    }
}

/**
 * Handle app routes with network-first strategy
 */
async function handleAppRoutes(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            const cache = await caches.open(DYNAMIC_CACHE);
            await cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        throw new Error(`Network response not ok: ${networkResponse.status}`);
    } catch (error) {
        console.log('Network failed, trying cache:', error.message);
        
        // Try cache fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page
        return getOfflinePage();
    }
}

/**
 * Handle API requests with network-only strategy
 */
async function handleApiRequests(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (!networkResponse.ok) {
            throw new Error(`API request failed: ${networkResponse.status}`);
        }
        
        return networkResponse;
    } catch (error) {
        console.error('API request failed:', error);
        
        // Queue request for background sync if POST/PUT/DELETE
        if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
            await queueRequest(request);
        }
        
        return new Response(
            JSON.stringify({ 
                error: 'Request failed. Will retry when online.',
                queued: true 
            }),
            { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

/**
 * Handle other requests with network-first strategy
 */
async function handleOtherRequests(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses in dynamic cache
            const cache = await caches.open(DYNAMIC_CACHE);
            await cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Try cache fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return getOfflinePage();
    }
}

/**
 * Get offline page
 */
async function getOfflinePage() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const offlinePage = await cache.match('/offline');
        
        if (offlinePage) {
            return offlinePage;
        }
        
        // Fallback offline page
        return new Response(
            createOfflineFallbackHTML(),
            { 
                headers: { 'Content-Type': 'text/html' },
                status: 503
            }
        );
    } catch (error) {
        console.error('Failed to serve offline page:', error);
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Create fallback offline HTML
 */
function createOfflineFallbackHTML() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Offline - Data Analysis Platform</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 2rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                }
                .container {
                    background: rgba(255, 255, 255, 0.95);
                    color: #333;
                    padding: 2rem;
                    border-radius: 1rem;
                    box-shadow: 0 1rem 2rem rgba(0, 0, 0, 0.1);
                    max-width: 400px;
                }
                .icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.7; }
                button {
                    background: #667eea;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    margin-top: 1rem;
                }
                button:hover { background: #5a6fd8; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">📶</div>
                <h2>You're Offline</h2>
                <p>Please check your internet connection and try again.</p>
                <button onclick="window.location.reload()">Try Again</button>
            </div>
        </body>
        </html>
    `;
}

/**
 * Queue request for background sync
 */
async function queueRequest(request) {
    try {
        // Store request details for background sync
        const requestData = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: await request.clone().text(),
            timestamp: Date.now()
        };
        
        // Store in IndexedDB (simplified version using Cache API)
        const cache = await caches.open('offline-requests');
        const queueKey = `queue-${Date.now()}-${Math.random()}`;
        
        await cache.put(
            queueKey,
            new Response(JSON.stringify(requestData), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
        
        console.log('Request queued for background sync:', queueKey);
        
        // Register background sync if supported
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            await self.registration.sync.register('background-sync');
        }
    } catch (error) {
        console.error('Failed to queue request:', error);
    }
}

/**
 * Background sync event
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        console.log('Background sync triggered');
        event.waitUntil(processQueuedRequests());
    }
});

/**
 * Process queued requests
 */
async function processQueuedRequests() {
    try {
        const cache = await caches.open('offline-requests');
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                const response = await cache.match(request);
                const requestData = await response.json();
                
                // Replay the request
                const replayResponse = await fetch(requestData.url, {
                    method: requestData.method,
                    headers: requestData.headers,
                    body: requestData.body || undefined
                });
                
                if (replayResponse.ok) {
                    // Remove from queue
                    await cache.delete(request);
                    console.log('Queued request processed successfully');
                } else {
                    console.error('Queued request failed:', replayResponse.status);
                }
            } catch (error) {
                console.error('Failed to process queued request:', error);
            }
        }
        
        // Notify clients about sync completion
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({ type: 'BACKGROUND_SYNC', success: true });
        });
    } catch (error) {
        console.error('Failed to process queued requests:', error);
    }
}

/**
 * Message event - handle messages from main thread
 */
self.addEventListener('message', (event) => {
    const { data } = event;
    
    switch (data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
    }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('All caches cleared');
    } catch (error) {
        console.error('Failed to clear caches:', error);
    }
}

/**
 * Periodic cleanup of old cached data
 */
async function periodicCleanup() {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const requests = await cache.keys();
        
        // Remove entries older than 7 days
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        const now = Date.now();
        
        for (const request of requests) {
            const response = await cache.match(request);
            const dateHeader = response.headers.get('date');
            
            if (dateHeader) {
                const cacheAge = now - new Date(dateHeader).getTime();
                if (cacheAge > maxAge) {
                    await cache.delete(request);
                    console.log('Cleaned up old cache entry:', request.url);
                }
            }
        }
    } catch (error) {
        console.error('Failed to perform periodic cleanup:', error);
    }
}

// Run periodic cleanup every hour
setInterval(periodicCleanup, 60 * 60 * 1000);

console.log('Service Worker loaded successfully');
