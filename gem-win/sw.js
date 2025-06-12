// sw.js
const CACHE_NAME = 'win98-cache-v2.0'; // Increment version if you update assets
const APP_SHELL_URLS = [
  './',
  './index.html',
  './splash.css',
  './app.js',
  './browser.js',
  './webview.js',
  './network-explorer.js',
  // './my-computer.js', // Removed
  './notepad.js',
  './calculator.js',
  './recycle-bin.js',
  './desktop-icons.js',
  './desktop-context-menu.js',
  './snap-to-grid.js',
  './icon-selection-effect.js',
  './tlds.js',
  './desktop-icons.css',
  './desktop-context-menu.css',
  './browser.css',
  './marlett.woff',
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
  'https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2',
];

// Use your refined icon list here
const ICON_URLS = [
  './internet_connection_wiz-0.png', './browser-toolbar-icons-color.png', './browser-toolbar-icons-gray.png',
  './calculator-0.png', './channels-4.png', './computer_2-1.png',
  './computer_shut_down_cool-2.png', // From shutdown dialog
  './directory_closed_cool-0.png', './directory_open_cool-0.png',
  './entire_network_globe-0.png',
  './globe_map-0.png', './help_book_cool-0.png',
  './html-0.png', './msie2-0.png', './n1.png', './n2-2.png', './n2.png', './n3.png', './n4.png',
  './netscape-frame.gif', './netscape.gif', './network_cool_2pcs-4.png',
  './network_normal_two_pcs-0.png', './network_three_pcs-0.png', './notepad-0.png',
  './recycle_bin_empty-0.png', './recycle_bin_empty_cool-0.png',
  './recycle_bin_full_cool-0.png', './search_web-0.png', './settings_gear-0.png',
  './shut_down_cool-0.png', './template_world-4.png',
  './windows-0.png'
];

const URLS_TO_CACHE = [...APP_SHELL_URLS, ...ICON_URLS];

self.addEventListener('install', (event) => {
  console.log('[SW] Install event for version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache:', CACHE_NAME);
        const cachePromises = URLS_TO_CACHE.map(urlToCache => {
          return cache.add(urlToCache).catch(err => {
            console.warn(`[SW] Failed to cache ${urlToCache}:`, err);
          });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('[SW] All specified assets cached (or attempted).');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event for version:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET' &&
            (event.request.url.startsWith(self.location.origin) || event.request.url.includes('fonts.gstatic.com'))) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(error => {
          console.warn('[SW] Fetch failed for:', event.request.url, error);
          // Optionally return a fallback response for critical assets
        });
      })
  );
});
