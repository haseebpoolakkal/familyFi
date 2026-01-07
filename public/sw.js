self.addEventListener('install', () => {
    console.log('Service Worker installing.');
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating.');
    // Allow the service worker to control all open clients
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Pass through all requests
    event.respondWith(fetch(event.request));
});
