self.addEventListener('install', () => {
    console.log('Service Worker installing.');
});

self.addEventListener('activate', () => {
    console.log('Service Worker activating.');
});

self.addEventListener('fetch', (event) => {
    // Pass through all requests
    event.respondWith(fetch(event.request));
});
