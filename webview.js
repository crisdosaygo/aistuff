// webview.js

// === Imports, Constants, and State ===
class Communication {
    #element;
    #targetOrigin;
    #logPrefix;
    #handlers = new Map();
    #pendingResponses = new Map();
    #messageId = 0;
    #requestTimeout = 3000; // Added request timeout for robustness

    constructor(element, targetOrigin, logPrefix) {
        this.#element = element;
        this.#targetOrigin = targetOrigin;
        this.#logPrefix = logPrefix;
        this.#element.addEventListener('message', this.#handleMessage.bind(this));
    }

    // --- Communication Methods ---
    registerHandler(type, handler) {
        this.#handlers.set(type, handler);
    }

    sendMessage(type, data = {}, tabId = null) {
        const message = { type, tabId, data };
        alert('[WEBVIEW]' + JSON.stringify(message, null, 2) + (new Error).stack);
        console.log(`${this.#logPrefix} Sending ${type}:`, message);
        if (this.#element.contentWindow) {
            this.#element.contentWindow.postMessage(message, this.#targetOrigin);
        } else {
            console.warn(`${this.#logPrefix} contentWindow not available for sending ${type}`);
        }
    }

    sendRequest(type, data = {}, tabId = null) {
        const id = String(this.#messageId++);
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                if (this.#pendingResponses.has(id)) {
                    this.#pendingResponses.delete(id);
                    console.warn(`${this.#logPrefix} Request ${type} (${id}) timed out.`);
                    reject(new Error(`Request ${type} (${id}) timed out`));
                }
            }, this.#requestTimeout);

            this.#pendingResponses.set(id, { resolve, reject, timeoutId });
            const message = { type, tabId, data, requestId: id };
            console.log(`${this.#logPrefix} Sending request ${type} (${id}):`, message);
            if (this.#element.contentWindow) {
                this.#element.contentWindow.postMessage(message, this.#targetOrigin);
            } else {
                console.warn(`${this.#logPrefix} contentWindow not available for sending request ${type} (${id})`);
                clearTimeout(timeoutId);
                this.#pendingResponses.delete(id);
                reject(new Error(`contentWindow not available for request ${type} (${id})`));
            }
        });
    }

    #handleMessage(event) {
        // Basic check for event origin and source if possible (not strictly implemented here for brevity)
        // if (event.origin !== this.#targetOrigin && this.#targetOrigin !== '*') {
        //     console.warn(`${this.#logPrefix} Message from unexpected origin: ${event.origin}`);
        //     return;
        // }
        if (!event.data || typeof event.data.type !== 'string') {
             // console.warn(`${this.#logPrefix} Received malformed message:`, event.data);
            return; // Ignore malformed messages
        }

        const { type, tabId, data, requestId, error } = event.data;

        if (requestId && this.#pendingResponses.has(requestId)) {
            const pending = this.#pendingResponses.get(requestId);
            clearTimeout(pending.timeoutId);
            this.#pendingResponses.delete(requestId);
            if (error) {
                console.warn(`${this.#logPrefix} Request ${type} (${requestId}) failed:`, error);
                pending.reject(error);
            } else {
                pending.resolve(data);
            }
            return;
        }

        const handler = this.#handlers.get(type);
        if (handler) {
            console.log(`${this.#logPrefix} Handling ${type}:`, { tabId, data });
            handler({ tabId, data });
        } else {
            console.log(`${this.#logPrefix} No handler for ${type}:`, { tabId, data });
        }
    }
}

export class BrowserWebview extends HTMLElement {
    #tabs = new Map(); // Map<tabId, { url, title, history, historyIndex, loading, iframe (shared) }>
    #activeTabId = null;
    #iframeOrigin = '*'; // Set to specific origin in production
    #sessionId = `session-${Math.random().toString(36).slice(2)}`;
    #container;
    #iframe;
    #comm;
    #browserConnection;
    #tabIdCounter = 0; // For generating mock tab IDs
    #isWebViewReady = false;
    #initializationFallbackTimeout = null;

    constructor(browserConnection) {
        super();
        this.#browserConnection = browserConnection || this.getAttribute('src') || this.src || '/frame'; // This path would be to a dummy html for the iframe
    }

    connectedCallback() {
        this.innerHTML = `<div class="webview-container" style="width:100%; height:100%;"><div style="padding:10px; text-align:center; color: #555;">Initializing Webview...</div></div>`;
        this.#container = this.querySelector('.webview-container');
        this.#createIframe();

        // Fallback if 'tab-ready' isn't received from iframe (e.g., iframe is dummied)
        this.#initializationFallbackTimeout = setTimeout(() => {
            if (!this.#isWebViewReady) {
                console.warn(`[BrowserWebview ${this.id || 'N/A'}] 'tab-ready' not received. Initializing with mock state.`);
                this.#initializeAsMock();
            }
        }, 2500); // Adjust timeout as needed
    }

    disconnectedCallback() {
        if (this.#initializationFallbackTimeout) {
            clearTimeout(this.#initializationFallbackTimeout);
        }
        // TODO: Clean up event listeners from #comm if necessary, though Communication class handles its own.
    }

    #initializeAsMock(isErrorCase = false) {
        if (this.#isWebViewReady) return; // Already initialized

        this.#tabs.clear();
        const mockInitialTabId = this._generateTabId();
        this.#tabs.set(mockInitialTabId, {
            url: isErrorCase ? 'about:error' : 'about:blank',
            title: isErrorCase ? 'Error Page' : 'New Tab (Mock)',
            history: [isErrorCase ? 'about:error' : 'about:blank'],
            historyIndex: 0,
            loading: false,
            iframe: this.#iframe
        });
        this.#activeTabId = mockInitialTabId;
        this.#isWebViewReady = true;
        if (this.#initializationFallbackTimeout) clearTimeout(this.#initializationFallbackTimeout);

        this.#container.innerHTML = ''; // Clear "Initializing..."
        this.#container.appendChild(this.#iframe); // Ensure iframe is there
        this.#updateIframeVisibility();

        this.#dispatchEvent('webview-ready', {
            tabs: this.tabs, // Use getter
            activeTabId: this.#activeTabId
        });
        console.log(`[BrowserWebview ${this.id || 'N/A'}] Initialized with mock state. Active: ${this.#activeTabId}`);
    }


    // --- API Methods ---
    async createTab(url = 'about:blank') {
        const tabId = this._generateTabId();
        const newTab = {
            url: url,
            title: this.#extractTitleFromUrl(url) || 'New Tab',
            history: [url],
            historyIndex: 0,
            loading: false,
            iframe: this.#iframe
        };
        this.#tabs.set(tabId, newTab);
        this.#dispatchEvent('tab-created', { tabId, data: { ...newTab } });

        // Attempt to inform the iframe, but don't depend on its success for mock mode
        this.#comm.sendMessage('createTab', { url }, tabId);

        if (!this.#activeTabId || this.#tabs.size === 1) {
            await this.setActiveTab(tabId);
        }
        return tabId;
    }

    async loadURL(url, tabId) {
        if (!tabId || !this.#tabs.has(tabId)) {
            console.error(`[BrowserWebview] loadURL: Tab ${tabId} does not exist or invalid.`);
            if (this.#tabs.size > 0 && !tabId) tabId = this.#activeTabId; // try active tab if none specified
            else return;
        }
        const tab = this.#tabs.get(tabId);
        if (tab.loading) {
            await this.stop(tabId); // stop might also be a mock
        }
        tab.loading = true;
        tab.url = url; // Optimistically set URL for display
        this.#dispatchEvent('did-start-loading', { tabId, url });
        this.#updateIframeVisibility();

        // Attempt to inform iframe
        this.#comm.sendMessage('loadURL', { url }, tabId);

        // Mock loading process
        setTimeout(() => {
            if (!this.#tabs.has(tabId)) return; // Tab might have been closed
            const currentTab = this.#tabs.get(tabId);
            currentTab.loading = false;
            currentTab.title = this.#extractTitleFromUrl(url);

            // Manage history
            if (currentTab.history[currentTab.historyIndex] !== url) { // Add to history if it's a new URL
                currentTab.history = currentTab.history.slice(0, currentTab.historyIndex + 1);
                currentTab.history.push(url);
                currentTab.historyIndex = currentTab.history.length - 1;
            }

            this.#dispatchEvent('did-stop-loading', { tabId, url });
            this.#dispatchEvent('did-navigate', {
                tabId,
                url: currentTab.url,
                title: currentTab.title,
                canGoBack: currentTab.historyIndex > 0,
                canGoForward: currentTab.historyIndex < currentTab.history.length - 1
            });
        }, 500 + Math.random() * 300); // Simulate load time
    }

    async closeTab(tabId) {
        if (!this.#tabs.has(tabId)) return;

        const wasActive = (this.#activeTabId === tabId);
        this.#tabs.delete(tabId);
        this.#dispatchEvent('tab-closed', { tabId });

        this.#comm.sendMessage('closeTab', {}, tabId);

        if (wasActive) {
            const remainingTabIds = Array.from(this.#tabs.keys());
            const newActiveTabId = remainingTabIds.length > 0 ? remainingTabIds[remainingTabIds.length - 1] : null;
            await this.setActiveTab(newActiveTabId);
        }
        this.#updateIframeVisibility();
    }

    async setActiveTab(tabId) {
        if (this.#activeTabId === tabId) return;
        if (tabId !== null && !this.#tabs.has(tabId)) {
            // This case should ideally be handled by caller, or pick first available
            console.warn(`[BrowserWebview] setActiveTab: Tab ${tabId} does not exist.`);
            if (this.#tabs.size > 0) {
                tabId = this.#tabs.keys().next().value; // Fallback to first tab
            } else {
                tabId = null; // No tabs left
            }
        }

        this.#activeTabId = tabId;
        const activeTabData = tabId ? this.#tabs.get(tabId) : null;
        this.#dispatchEvent('active-tab-changed', { tabId, url: activeTabData?.url, title: activeTabData?.title });
        this.#comm.sendMessage('setActiveTab', {}, tabId);
        this.#updateIframeVisibility();
    }

    _navigateHistory(tabId, direction) {
        if (!this.#tabs.has(tabId)) return false;
        const tab = this.#tabs.get(tabId);
        let newIndex = tab.historyIndex + direction;

        if (newIndex >= 0 && newIndex < tab.history.length) {
            tab.historyIndex = newIndex;
            const url = tab.history[newIndex];
            // For mock, directly call loadURL behavior (which includes event dispatches)
            // To avoid re-adding to history, loadURL needs to be smarter or use a different path.
            // Let's simplify: just dispatch navigate for mock, and send message.
            tab.url = url;
            tab.title = this.#extractTitleFromUrl(url);
            this.#dispatchEvent('did-start-loading', { tabId, url }); // Simulate start
            setTimeout(() => { // Simulate load
                 if (!this.#tabs.has(tabId)) return;
                 this.#dispatchEvent('did-stop-loading', { tabId, url });
                 this.#dispatchEvent('did-navigate', {
                    tabId,
                    url: tab.url,
                    title: tab.title,
                    canGoBack: tab.historyIndex > 0,
                    canGoForward: tab.historyIndex < tab.history.length - 1
                });
            }, 150);
            return true;
        }
        return false;
    }

    async goBack(tabId) {
        if (this._navigateHistory(tabId, -1)) {
            this.#comm.sendMessage('goBack', {}, tabId);
        }
    }

    async goForward(tabId) {
        if (this._navigateHistory(tabId, 1)) {
            this.#comm.sendMessage('goForward', {}, tabId);
        }
    }

    async reload(tabId) {
        if (!this.#tabs.has(tabId)) return;
        const tab = this.#tabs.get(tabId);
        // For mock, just "load" the current URL again
        await this.loadURL(tab.url, tabId); // loadURL handles events and message sending
        // No need to send 'reload' separately if loadURL is used, unless iframe handles it differently.
        // For consistency, let's assume loadURL is sufficient for mock, and send 'reload' for real iframe.
        this.#comm.sendMessage('reload', {}, tabId);
    }

    async stop(tabId) {
        if (!this.#tabs.has(tabId)) return;
        const tab = this.#tabs.get(tabId);
        if (!tab.loading) return;

        tab.loading = false;
        // Clear any pending mock navigation for this tab if we had more complex timeouts
        this.#dispatchEvent('did-stop-loading', { tabId, url: tab.url });
        this.#comm.sendMessage('stop', {}, tabId);
        console.log(`[BrowserWebview ${this.id || 'N/A'}] Stopped loading for tab ${tabId}`);
    }

    // --- Properties ---
    get activeTabId() {
        return this.#activeTabId;
    }

    get tabs() { // This getter is crucial for BrowserApp
        return Array.from(this.#tabs.entries()).map(([id, tab]) => ({
            id,
            url: tab.url,
            title: tab.title,
            loading: tab.loading, // Added loading state
            canGoBack: tab.historyIndex > 0,
            canGoForward: tab.historyIndex < tab.history.length - 1
        }));
    }

    _generateTabId() {
        return `bwv-tab-${this.#tabIdCounter++}-${Date.now()}`;
    }

    // --- Communication Methods ---
    #createIframe() {
        this.#iframe = document.createElement('iframe');
        this.#iframe.style.width = '100%';
        this.#iframe.style.height = '100%';
        this.#iframe.style.border = 'none';
        this.#iframe.style.display = 'none'; // Initially hidden until a tab is active
        this.#iframe.sandbox = [
            'allow-scripts', 'allow-same-origin', 'allow-popups', 'allow-forms',
            'allow-downloads', 'allow-modals',
            'allow-pointer-lock', 'allow-popups-to-escape-sandbox'
        ].join(' ');
        this.#iframe.allow = [
            'autoplay', 'camera', 'microphone', 'geolocation', 'midi',
            'encrypted-media', 'fullscreen', 'payment', 'display-capture'
        ].join('; ');
        
        try {
            const url = new URL(this.#browserConnection, window.location.origin);
            this.#iframe.src = url.href;
             // For '*' targetOrigin, iframe src must be resolvable.
             // If browserConnection is a relative path like '/browser-ui.html', it needs to exist.
             // For a pure mock where the iframe content doesn't matter, src can be about:blank.
             // However, Communication relies on contentWindow.
        } catch (e) {
            console.error(`[BrowserWebview ${this.id || 'N/A'}] Invalid iframe src: ${this.#browserConnection}. Defaulting to about:blank for structure.`, e);
            this.#iframe.src = 'about:blank';
        }
        // this.#container.appendChild(this.#iframe); // Moved to #initializeAsMock or tab-ready
        
        this.#comm = new Communication(this.#iframe, this.#iframeOrigin, `[BrowserWebview ${this.id || 'N/A'}]`);
        this.#setupMessageHandlers();
        
        // Send init message after iframe has a chance to load its own script
        this.#iframe.onload = () => {
            console.log(`[BrowserWebview ${this.id || 'N/A'}] Iframe loaded. Sending init.`);
            this.#comm.sendMessage('init', { sessionId: this.#sessionId });
            // The 'tab-ready' message from iframe will then trigger full initialization.
        };
        this.#iframe.onerror = () => {
            console.error(`[BrowserWebview ${this.id || 'N/A'}] Iframe failed to load src: ${this.#iframe.src}. Initializing with mock error state.`);
            if (this.#initializationFallbackTimeout) clearTimeout(this.#initializationFallbackTimeout);
            this.#initializeAsMock(true); // Initialize with an error state
        };
    }
    
    #updateIframeVisibility() {
        if (this.#iframe) {
          this.#iframe.style.display = 'block';
          if ( ! this.#container.contains(this.#iframe) ) {
            const tab = this.#tabs.get(this.#activeTabId);
            this.#container.innerHTML = ''; // Clear previous content
            this.#container.appendChild(this.#iframe); // Add iframe back
            // This is a very basic way to show "content".
            // A real one might have the iframe always present and just message it.
            // To make it simpler for mocking, we can put placeholder text directly.
            // But the prompt implies iframe is there, just maybe not working.
            // So, let's keep the iframe but ensure it's displayed.
            // The iframe could show "Loading..." or the URL if it's a dummy.
            // For now, the global iframe is just "active".
          }
        }
    }


    #setupMessageHandlers() {
        // This is when the *iframe signals it's ready* with its own UI and communication channel.
        this.#comm.registerHandler('tab-ready', () => {
            if (this.#isWebViewReady && !this.#initializationFallbackTimeout) { // If already initialized by fallback, this is a late real init
                console.log(`[BrowserWebview ${this.id || 'N/A'}] Received 'tab-ready' after mock initialization. Re-syncing.`);
            }
            if(this.#initializationFallbackTimeout) clearTimeout(this.#initializationFallbackTimeout);
            this.#initializationFallbackTimeout = null; // Mark that iframe responded.

            Promise.all([
                this.#comm.sendRequest('getTabs'),
                this.#comm.sendRequest('getActiveTab')
            ]).then(([tabsFromIframe, activeTabIdFromIframe]) => {
                this.#tabs.clear(); // Clear any mock tabs
                tabsFromIframe.forEach(tabData => {
                    this.#tabs.set(tabData.id, { // Assuming tabData has {id, url, title}
                        url: tabData.url,
                        title: tabData.title || this.#extractTitleFromUrl(tabData.url),
                        history: tabData.url ? [tabData.url] : [],
                        historyIndex: tabData.url ? 0 : -1,
                        loading: false,
                        iframe: this.#iframe
                    });
                    // Dispatch tab-created for each tab from iframe for UI to catch up
                    this.#dispatchEvent('tab-created', { tabId: tabData.id, data: this.#tabs.get(tabData.id) });
                });

                this.#activeTabId = activeTabIdFromIframe;
                // Validate activeTabId
                if (!this.#activeTabId || !this.#tabs.has(this.#activeTabId)) {
                    this.#activeTabId = this.#tabs.size > 0 ? this.#tabs.keys().next().value : null;
                }
                
                this.#isWebViewReady = true;
                this.#container.innerHTML = ''; // Clear "Initializing..." or mock content
                this.#container.appendChild(this.#iframe);
                this.#updateIframeVisibility();

                this.#dispatchEvent('webview-ready', {
                    tabs: this.tabs, // Use getter
                    activeTabId: this.#activeTabId
                });
                // Dispatch active-tab-changed if there's an active tab
                if (this.#activeTabId) {
                    const activeTabData = this.#tabs.get(this.#activeTabId);
                    this.#dispatchEvent('active-tab-changed', { tabId: this.#activeTabId, url: activeTabData?.url, title: activeTabData?.title });
                }
                console.log(`[BrowserWebview ${this.id || 'N/A'}] Initialized from iframe. Active: ${this.#activeTabId}`);

            }).catch(error => {
                console.warn(`[BrowserWebview ${this.id || 'N/A'}] Error during 'tab-ready' processing with iframe:`, error, "Using/falling back to mock initialization.");
                if (!this.#isWebViewReady) this.#initializeAsMock(true); // If not yet mock-initialized, do it with error state.
            });
        });

        this.#comm.registerHandler('tab-created', ({ tabId, data }) => { // From iframe
            if (this.#tabs.has(tabId)) { // Already exists (e.g. optimistic create)
                const tab = this.#tabs.get(tabId);
                tab.url = data.url || tab.url;
                tab.title = data.title || this.#extractTitleFromUrl(data.url) || tab.title;
            } else {
                this.#tabs.set(tabId, {
                    url: data.url || '',
                    title: data.title || this.#extractTitleFromUrl(data.url),
                    history: data.url ? [data.url] : [],
                    historyIndex: data.url ? 0 : -1,
                    loading: false,
                    iframe: this.#iframe
                });
            }
            this.#dispatchEvent('tab-created', { tabId, data: this.#tabs.get(tabId) });
        });

        this.#comm.registerHandler('tab-closed', ({ tabId }) => { // From iframe
            const wasActive = (this.#activeTabId === tabId);
            if (this.#tabs.has(tabId)) {
                this.#tabs.delete(tabId);
                this.#dispatchEvent('tab-closed', { tabId }); // Inform app
            }
            if (wasActive) { // If the closed tab was active, webview needs to pick a new one
                const remainingTabIds = Array.from(this.#tabs.keys());
                const newActiveTabId = remainingTabIds.length > 0 ? remainingTabIds[remainingTabIds.length - 1] : null;
                // This should trigger 'active-tab' message from iframe, or we set it optimistically
                this.setActiveTab(newActiveTabId); // This will dispatch active-tab-changed
            }
            this.#updateIframeVisibility();
        });
        
        this.#comm.registerHandler('active-tab', ({ data }) => { // From iframe, confirming active tab
            const newActiveTabId = data.tabId;
            if (this.#activeTabId !== newActiveTabId) {
                this.#activeTabId = newActiveTabId;
                 const activeTabData = newActiveTabId ? this.#tabs.get(newActiveTabId) : null;
                 this.#dispatchEvent('active-tab-changed', { tabId: newActiveTabId, url: activeTabData?.url, title: activeTabData?.title });
            }
            this.#updateIframeVisibility();
        });

        this.#comm.registerHandler('did-start-loading', ({ tabId, data }) => {
            const tab = this.#tabs.get(tabId);
            if (tab) {
                tab.loading = true;
                if (data && data.url) tab.url = data.url; // Update URL if provided (e.g. redirects)
                this.#dispatchEvent('did-start-loading', { tabId, url: tab.url });
            }
        });

        this.#comm.registerHandler('did-stop-loading', ({ tabId, data }) => {
            const tab = this.#tabs.get(tabId);
            if (tab) {
                tab.loading = false;
                // data might contain final URL if different
                if (data && data.url && data.url !== tab.url) {
                    // This implies a navigation also happened
                }
                this.#dispatchEvent('did-stop-loading', { tabId, url: tab.url });
            }
        });

        this.#comm.registerHandler('did-navigate', ({ tabId, data }) => { // data: { url, title, historyLength, currentIndex }
            const tab = this.#tabs.get(tabId);
            if (tab) {
                tab.url = data.url;
                tab.title = data.title || this.#extractTitleFromUrl(data.url);
                tab.loading = false; // Navigation implies loading stopped for that page

                // If iframe manages history, update based on its report
                if (data.history && data.historyIndex !== undefined) {
                    tab.history = data.history;
                    tab.historyIndex = data.historyIndex;
                } else { // Fallback to simple history tracking
                    if (tab.history[tab.historyIndex] !== data.url) {
                        tab.history = tab.history.slice(0, tab.historyIndex + 1);
                        tab.history.push(data.url);
                        tab.historyIndex = tab.history.length - 1;
                    }
                }
                
                this.#dispatchEvent('did-navigate', {
                    tabId,
                    url: tab.url,
                    title: tab.title,
                    canGoBack: tab.historyIndex > 0,
                    canGoForward: tab.historyIndex < tab.history.length - 1
                });
            }
        });

        // Handlers for tabs-list and active-tab can be used for sync if needed
        this.#comm.registerHandler('tabs-list', ({ data }) => { /* ... potentially sync this.#tabs ... */ });
    }

    // --- Helpers ---
    #extractTitleFromUrl(url) {
        if (!url || typeof url !== 'string') return 'Invalid URL';
        if (url === 'about:blank') return 'Blank Page';
        if (url === 'about:error') return 'Error';
        try {
            const parsedUrl = new URL(url);
            let title = parsedUrl.hostname.replace(/^www\./, '');
            if (parsedUrl.pathname !== '/' && parsedUrl.pathname.length > 1) {
                const pathPart = parsedUrl.pathname.split('/').filter(Boolean).pop();
                if (pathPart) title = decodeURIComponent(pathPart) + ' - ' + title;
            }
            return title || 'Untitled';
        } catch (e) {
            return url.length > 30 ? url.substring(0, 27) + '...' : url;
        }
    }

    #dispatchEvent(eventName, detail) {
        console.log(`[BrowserWebview ${this.id || 'N/A'}] Dispatching ${eventName}:`, detail);
        this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, composed: true }));
    }
}

customElements.define('browser-webview', BrowserWebview);
