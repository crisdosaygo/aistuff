// === Imports, Constants, and State ===
class Communication {
    #element;
    #targetOrigin;
    #logPrefix;
    #handlers = new Map();
    #pendingResponses = new Map();
    #messageId = 0;

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
        console.log(`${this.#logPrefix} Sending ${type}:`, message);
        this.#element.contentWindow.postMessage(message, this.#targetOrigin);
    }

    sendRequest(type, data = {}, tabId = null) {
        const id = String(this.#messageId++);
        return new Promise((resolve, reject) => {
            this.#pendingResponses.set(id, { resolve, reject });
            const message = { type, tabId, data, requestId: id };
            console.log(`${this.#logPrefix} Sending request ${type} (${id}):`, message);
            this.#element.contentWindow.postMessage(message, this.#targetOrigin);
        });
    }

    #handleMessage(event) {
        const { type, tabId, data, requestId } = event.data;
        if (requestId && this.#pendingResponses.has(requestId)) {
            const { resolve } = this.#pendingResponses.get(requestId);
            this.#pendingResponses.delete(requestId);
            resolve(data);
            return;
        }
        const handler = this.#handlers.get(type);
        if (handler) {
            console.log(`${this.#logPrefix} Handling ${type}:`, { tabId, data });
            handler({ tabId, data });
        }
    }
}

class BrowserWebview extends HTMLElement {
    #tabs = new Map(); // Map<tabId, { url, title, history, historyIndex, loading, iframe }>
    #activeTabId = null;
    #loadingTimeouts = new Map(); // Map<tabId, timeoutId> for fallback
    #iframeOrigin = '*'; // Set to specific origin in production
    #sessionId = `session-${Math.random().toString(36).slice(2)}`;
    #container;
    #iframe;
    #comm;
    #browserConnection;

    // --- Lifecycle Methods ---
    constructor(browserConnection) {
        super();
        this.#browserConnection = browserConnection || '/browser-ui.html';
    }

    connectedCallback() {
        this.innerHTML = `<div class="webview-container"></div>`;
        this.#container = this.querySelector('.webview-container');
        this.#createIframe();
    }

    // --- API Methods ---
    async createTab(url = null) {
        const { tabId } = await this.#comm.sendRequest('createTab', { url });
        return tabId;
    }

    async loadURL(url, tabId) {
        if (!this.#tabs.has(tabId)) {
            throw new Error(`Tab ${tabId} does not exist`);
        }
        const tab = this.#tabs.get(tabId);
        if (tab.loading) {
            await this.stop(tabId);
        }
        tab.loading = true;
        this.#comm.sendMessage('loadURL', { url }, tabId);
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                this.#loadingTimeouts.delete(tabId);
                resolve();
            }, 5000);
            this.#loadingTimeouts.set(tabId, timeoutId);
        });
    }

    async closeTab(tabId) {
        if (!this.#tabs.has(tabId)) return;
        this.#comm.sendMessage('closeTab', {}, tabId);
    }

    async setActiveTab(tabId) {
        if (!this.#tabs.has(tabId)) {
            throw new Error(`Tab ${tabId} does not exist`);
        }
        this.#activeTabId = tabId;
        this.#comm.sendMessage('setActiveTab', {}, tabId);
    }

    async goBack(tabId) {
        if (!this.#tabs.has(tabId)) {
            throw new Error(`Tab ${tabId} does not exist`);
        }
        this.#comm.sendMessage('goBack', {}, tabId);
    }

    async goForward(tabId) {
        if (!this.#tabs.has(tabId)) {
            throw new Error(`Tab ${tabId} does not exist`);
        }
        this.#comm.sendMessage('goForward', {}, tabId);
    }

    async reload(tabId) {
        if (!this.#tabs.has(tabId)) {
            throw new Error(`Tab ${tabId} does not exist`);
        }
        this.#comm.sendMessage('reload', {}, tabId);
    }

    async stop(tabId) {
        if (!this.#tabs.has(tabId)) return;
        const tab = this.#tabs.get(tabId);
        if (!tab.loading) return;
        this.#comm.sendMessage('stop', {}, tabId);
    }

    // --- Properties ---
    get activeTabId() {
        return this.#activeTabId;
    }

    get tabs() {
        return Array.from(this.#tabs.entries()).map(([id, tab]) => ({
            id,
            url: tab.url,
            title: tab.title,
            canGoBack: tab.historyIndex > 0,
            canGoForward: tab.historyIndex < tab.history.length - 1
        }));
    }

    // --- Communication Methods ---
    #createIframe() {
        this.#iframe = document.createElement('iframe');
        this.#iframe.style.display = 'block';
        this.#iframe.sandbox = [
            'allow-scripts',
            'allow-same-origin',
            'allow-popups',
            'allow-forms',
            'allow-downloads',
            'allow-modals',
            'allow-orientation-lock',
            'allow-pointer-lock',
            'allow-popups-to-escape-sandbox'
        ].join(' ');
        this.#iframe.allow = [
            'autoplay',
            'camera',
            'microphone',
            'geolocation',
            'midi',
            'encrypted-media',
            'fullscreen',
            'payment',
            'display-capture'
        ].join('; ');
        this.#iframe.src = this.#browserConnection;
        this.#container.appendChild(this.#iframe);
        this.#comm = new Communication(this.#iframe, this.#iframeOrigin, `[BrowserWebview ${this.id}]`);
        this.#setupMessageHandlers();
        this.#comm.sendMessage('init', { sessionId: this.#sessionId });
    }

    #setupMessageHandlers() {
        this.#comm.registerHandler('tab-ready', () => {
            this.#comm.sendRequest('getTabs').then(tabs => {
                tabs.forEach(tab => this.#tabs.set(tab.id, { ...tab, iframe: this.#iframe, loading: false }));
                this.#dispatchEvent('tab-created', { tabId: tabs[0]?.id });
            });
            this.#comm.sendRequest('getActiveTab').then(tabId => {
                this.#activeTabId = tabId;
            });
        });

        this.#comm.registerHandler('tab-created', ({ tabId, data }) => {
            this.#tabs.set(tabId, {
                url: data.url || '',
                title: data.title || 'New Tab',
                history: data.url ? [data.url] : [],
                historyIndex: data.url ? 0 : -1,
                loading: false,
                iframe: this.#iframe
            });
            this.#dispatchEvent('tab-created', { tabId });
        });

        this.#comm.registerHandler('tab-closed', ({ tabId }) => {
            this.#tabs.delete(tabId);
            if (this.#loadingTimeouts.has(tabId)) {
                clearTimeout(this.#loadingTimeouts.get(tabId));
                this.#loadingTimeouts.delete(tabId);
            }
            this.#dispatchEvent('tab-closed', { tabId });
            if (this.#activeTabId === tabId) {
                this.#activeTabId = null;
                this.#container.innerHTML = `<div>(No active tab)</div>`;
            }
        });

        this.#comm.registerHandler('did-start-loading', ({ tabId, data }) => {
            const tab = this.#tabs.get(tabId);
            if (tab) {
                tab.loading = true;
                this.#dispatchEvent('did-start-loading', { tabId, url: data.url });
            }
        });

        this.#comm.registerHandler('did-stop-loading', ({ tabId, data }) => {
            const tab = this.#tabs.get(tabId);
            if (tab) {
                tab.loading = false;
                if (this.#loadingTimeouts.has(tabId)) {
                    clearTimeout(this.#loadingTimeouts.get(tabId));
                    this.#loadingTimeouts.delete(tabId);
                }
                this.#dispatchEvent('did-stop-loading', { tabId, url: data.url });
            }
        });

        this.#comm.registerHandler('did-navigate', ({ tabId, data }) => {
            const tab = this.#tabs.get(tabId);
            if (tab) {
                tab.url = data.url;
                tab.title = data.title || this.#extractTitleFromUrl(data.url);
                tab.history = [...tab.history.slice(0, tab.historyIndex + 1), data.url];
                tab.historyIndex = tab.history.length - 1;
                this.#dispatchEvent('did-navigate', {
                    tabId,
                    url: data.url,
                    title: tab.title,
                    canGoBack: tab.historyIndex > 0,
                    canGoForward: tab.historyIndex < tab.history.length - 1
                });
            }
        });

        this.#comm.registerHandler('tabs-list', ({ data }) => {
            data.tabs.forEach(tab => {
                if (!this.#tabs.has(tab.id)) {
                    this.#tabs.set(tab.id, { ...tab, iframe: this.#iframe, loading: false });
                }
            });
        });

        this.#comm.registerHandler('active-tab', ({ data }) => {
            this.#activeTabId = data.tabId;
        });
    }

    // --- Helpers ---
    #extractTitleFromUrl(url) {
        if (!url) return 'Untitled';
        if (url === 'about:blank') return 'Blank Page';
        try {
            const parsedUrl = new URL(url);
            let title = parsedUrl.hostname.replace(/^www\./, '');
            if (parsedUrl.pathname !== '/' && parsedUrl.pathname.length > 1) {
                const pathPart = parsedUrl.pathname.split('/').pop();
                if (pathPart) title = pathPart + ' - ' + title;
            }
            return title || 'Untitled';
        } catch (e) {
            return url.length > 30 ? url.substring(0, 27) + '...' : url;
        }
    }

    #dispatchEvent(eventName, detail) {
        console.log(`[BrowserWebview ${this.id}] Dispatching ${eventName}:`, detail);
        this.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
}

customElements.define('browser-webview', BrowserWebview);
