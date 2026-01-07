'use client';

import { useEffect } from 'react';

export default function PWARegistration() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js').then(
                    function (registration) {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);

                        // Check for updates on load
                        registration.update();

                        // Listen for updates
                        registration.onupdatefound = () => {
                            const installingWorker = registration.installing;
                            if (installingWorker) {
                                installingWorker.onstatechange = () => {
                                    if (installingWorker.state === 'installed') {
                                        if (navigator.serviceWorker.controller) {
                                            // New content is available, but wait for it to be active
                                            console.log('New content is available; please refresh.');
                                        } else {
                                            // Content is cached for offline use.
                                            console.log('Content is cached for offline use.');
                                        }
                                    }
                                };
                            }
                        };
                    },
                    function (err) {
                        console.log('ServiceWorker registration failed: ', err);
                    }
                );
            });

            // Handle the controller change (when the new sw takes over)
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        }
    }, []);

    return null;
}
