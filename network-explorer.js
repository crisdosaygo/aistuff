// network-explorer.js

const NETWORK_EXPLORER_SITES_KEY = 'networkExplorerSites_win9x';
const DEFAULT_SITES = [
    { url: 'https://www.google.com', title: 'Google', customIcon: null },
    { url: 'https://www.microsoft.com', title: 'Microsoft', customIcon: null },
    { url: 'https://www.apple.com', title: 'Apple', customIcon: null },
];

// Favicon proxy - DuckDuckGo is generally good with CORS
const FAVICON_PROXY_URL = (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`;
// const FAVICON_PROXY_URL_GOOGLE = (domain) => `https://www.google.com/s2/favicons?sz=32&domain_url=${domain}`;


function getSavedSites() {
    try {
        const stored = localStorage.getItem(NETWORK_EXPLORER_SITES_KEY);
        return stored ? JSON.parse(stored) : [...DEFAULT_SITES]; // Return default if nothing stored
    } catch (e) {
        console.error("Error reading Network Explorer sites from localStorage:", e);
        return [...DEFAULT_SITES];
    }
}

function saveSites(sites) {
    try {
        localStorage.setItem(NETWORK_EXPLORER_SITES_KEY, JSON.stringify(sites));
    } catch (e) {
        console.error("Error saving Network Explorer sites to localStorage:", e);
    }
}

function generateSiteItemHTML(site, index) {
    const domain = site.url ? new URL(site.url).hostname : 'unknown.com';
    const faviconUrl = site.customIcon || FAVICON_PROXY_URL(domain);
    const genericIcon = "./html-0.png"; // Fallback

    return `
        <div class="network-site-item" data-url="${site.url}" data-index="${index}" title="${site.url}">
            <img 
                src="${faviconUrl}" 
                alt="" 
                onerror="this.onerror=null; this.src='${genericIcon}';"
            >
            <span>${site.title || domain}</span>
            <button class="network-site-delete" data-index="${index}" title="Remove shortcut">✕</button>
        </div>
    `;
}

function renderSitesList(containerElement, sites, clickHandler, deleteHandler) {
    containerElement.innerHTML = sites.map((site, index) => generateSiteItemHTML(site, index)).join('');
    containerElement.querySelectorAll('.network-site-item').forEach(item => {
        // Attach click to the whole item, not just the delete button
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('network-site-delete')) {
                // Click was on delete button, let its own handler manage it
                return;
            }
            clickHandler(item.dataset.url);
        });
    });
    containerElement.querySelectorAll('.network-site-delete').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent site item click handler
            deleteHandler(parseInt(button.dataset.index));
        });
    });
}

export const networkExplorerAppDefinition = {
    title: "Network Explorer",
    icon: "./network_normal_two_pcs-0.png", // Placeholder, find a better one
    defaultWidth: 400,
    defaultHeight: 350,
    generateContent: () => `
        <div class="network-explorer-container">
            <div class="network-sites-list">
                <!-- Sites will be rendered here -->
                <p>Loading sites...</p>
            </div>
            <div class="network-add-site-form">
                <fieldset>
                    <legend>Add New Shortcut</legend>
                    <div>
                        <label for="netex-site-title">Title:</label>
                        <input type="text" id="netex-site-title" placeholder="e.g., My Favorite Site">
                    </div>
                    <div>
                        <label for="netex-site-url">URL:</label>
                        <input type="url" id="netex-site-url" placeholder="https://example.com">
                    </div>
                    <button id="netex-add-btn">Add Shortcut</button>
                </fieldset>
            </div>
        </div>
        <style>
            .network-explorer-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                padding: 5px;
                background-color: #fff; /* Standard window content background */
            }
            .network-sites-list {
                flex-grow: 1;
                overflow-y: auto;
                border: 1px inset #808080;
                padding: 5px;
                margin-bottom: 10px;
                display: flex; /* For icon layout */
                flex-wrap: wrap; /* Allow wrapping */
                align-content: flex-start; /* Align items to the top */
                gap: 10px; /* Spacing between items */
            }
            .network-site-item {
                width: 75px; /* Similar to desktop icons */
                padding: 5px;
                text-align: center;
                cursor: pointer;
                border: 1px solid transparent;
                position: relative; /* For delete button positioning */
            }
            .network-site-item:hover {
                border: 1px dotted #000080;
                background-color: #f0f0f0;
            }
            .network-site-item img {
                width: 32px;
                height: 32px;
                display: block;
                margin: 0 auto 5px auto;
            }
            .network-site-item span {
                display: block;
                font-size: 11px;
                word-wrap: break-word;
                max-height: 3.6em; /* Approx 3 lines */
                overflow: hidden;
            }
            .network-site-delete {
                position: absolute;
                top: -2px;
                right: -2px;
                background-color: #ff6060;
                color: white;
                border: 1px solid #c00;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                font-size: 10px;
                line-height: 14px;
                text-align: center;
                cursor: pointer;
                display: none; /* Hidden by default, shown on hover */
                z-index: 1;
            }
            .network-site-item:hover .network-site-delete {
                display: block;
            }

            .network-add-site-form {
                padding: 10px;
                border-top: 2px groove #dfdfdf;
                background-color: #c0c0c0; /* Classic gray for form area */
            }
            .network-add-site-form fieldset {
                border: 1px solid #808080;
                padding: 10px;
            }
            .network-add-site-form legend {
                font-weight: bold;
                padding: 0 5px;
            }
            .network-add-site-form div {
                margin-bottom: 8px;
                display: flex;
                align-items: center;
            }
            .network-add-site-form label {
                width: 50px; /* Fixed width for labels */
                margin-right: 5px;
                font-size: 11px;
            }
            .network-add-site-form input[type="text"],
            .network-add-site-form input[type="url"] {
                flex-grow: 1;
                padding: 3px;
                border: 1px inset #808080;
                font-size: 12px;
            }
            .network-add-site-form button {
                /* Use win95-button styles if available globally, or define here */
                background-color: #c0c0c0;
                border: 2px outset #dfdfdf;
                padding: 4px 12px;
                cursor: pointer;
                display: block;
                margin-left: auto; /* Push to right */
            }
            .network-add-site-form button:active {
                border-style: inset;
            }
        </style>
    `,
    initApp: (windowEl, windowInstanceId, webviewId, appDef, /* NEW: Pass createWindow function */_createWindowFn) => {
        const sitesListContainer = windowEl.querySelector('.network-sites-list');
        const titleInput = windowEl.querySelector('#netex-site-title');
        const urlInput = windowEl.querySelector('#netex-site-url');
        const addButton = windowEl.querySelector('#netex-add-btn');

        let sites = getSavedSites();

        const handleSiteClick = (url) => {
            console.log("Network Explorer: Clicked site", url);
            if (!url) return;

            // Find an existing browser or create one.
            // We'll prefer 'internetBrowser' as a generic target.
            const targetBrowserAppId = 'internetBrowser';
            let browserWindow = null;
            let browserAppInstance = null;

            // Check if a browser window is already open
            const openBrowsers = Object.values(window.openWindows || {}).filter(
                ow => (ow.appId === 'internetBrowser' || ow.appId === 'internetExplorer' || ow.appId === 'netscapeNavigator') &&
                      ow.element && document.body.contains(ow.element) && !ow.isMinimized
            );

            if (openBrowsers.length > 0) {
                // Prefer an already active (not inactive) browser if multiple are open
                browserWindow = openBrowsers.find(ow => !ow.element.classList.contains('inactive'))?.element || openBrowsers[0].element;
                browserAppInstance = (window.openWindows || {})[browserWindow.dataset.instanceId]?.appInstance;
            }

            if (browserAppInstance && typeof browserAppInstance.navigateTo === 'function') {
                browserAppInstance.navigateTo(url); // Navigate in existing browser
                if (window.focusWindow) window.focusWindow(browserWindow); // Bring to front
            } else {
                // No suitable browser open, or instance not found, create a new one
                // We need the global createWindow function here.
                // It's passed as _createWindowFn
                if (typeof _createWindowFn === 'function') {
                    const newBrowserWindow = _createWindowFn(targetBrowserAppId);
                    if (newBrowserWindow) {
                        // The browser will open its home page initially.
                        // We need to wait for its appInstance to be ready and then navigate.
                        // This is a bit tricky. BrowserApp.navigateTo should handle cases
                        // where it's called very early.
                        // A more robust way would be to pass the URL to createWindow for the browser.
                        // For now, let's try a small delay.
                        setTimeout(() => {
                            const newBrowserInstanceId = newBrowserWindow.dataset.instanceId;
                            const newBrowserAppInstance = (window.openWindows || {})[newBrowserInstanceId]?.appInstance;
                            if (newBrowserAppInstance && typeof newBrowserAppInstance.navigateTo === 'function') {
                                newBrowserAppInstance.navigateTo(url);
                            } else {
                                console.warn("Failed to get new browser instance to navigate for Network Explorer.");
                            }
                        }, 500); // Delay to allow browser to initialize
                    }
                } else {
                    alert(`Could not open browser. createWindow function not available.`);
                }
            }
        };

        const handleDeleteSite = (index) => {
            if (confirm(`Are you sure you want to remove "${sites[index].title || sites[index].url}"?`)) {
                sites.splice(index, 1);
                saveSites(sites);
                renderSitesList(sitesListContainer, sites, handleSiteClick, handleDeleteSite);
            }
        };

        addButton.addEventListener('click', () => {
            const title = titleInput.value.trim();
            const url = urlInput.value.trim();

            if (!url) {
                alert("URL is required.");
                return;
            }
            let fullUrl = url;
            if (!url.match(/^https?:\/\//i) && !url.startsWith('about:')) {
                fullUrl = 'http://' + url;
            }

            try {
                new URL(fullUrl); // Validate URL
            } catch (e) {
                alert("Invalid URL format.");
                return;
            }

            sites.push({ url: fullUrl, title: title || new URL(fullUrl).hostname, customIcon: null });
            saveSites(sites);
            renderSitesList(sitesListContainer, sites, handleSiteClick, handleDeleteSite);
            titleInput.value = '';
            urlInput.value = '';
        });

        renderSitesList(sitesListContainer, sites, handleSiteClick, handleDeleteSite);
        
        // Return any specific instance methods if needed by app.js
        return {
            // e.g., refreshList: () => renderSitesList(...)
        };
    }
};
