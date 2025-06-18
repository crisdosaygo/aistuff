// webview.js (full updated file)

export class BrowserWebview extends HTMLElement {
    // Component State
    #tabs = new Map(); // Map<targetId, { id, url, title, ... }>
    #activeTabId = null; // This will be a targetId
    #isWebViewReady = false;

    // IFrame and Communication Properties (folded in)
    #iframe;
    #targetOrigin = '*';
    #logPrefix;
    #handlers = new Map();
    #pendingResponses = new Map();
    #messageId = 0;
    #requestTimeout = 5000;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.#logPrefix = `[BrowserWebview ${this.id || 'N/A'}]`;
    }

    connectedCallback() {
        if (!this.shadowRoot.firstChild) {
            this.#initialize();
        }
    }

    #initialize() {
        const style = document.createElement('style');
        style.textContent = `
            :host { display: block; width: 100%; height: 100%; overflow: hidden; }
            iframe { width: 100%; height: 100%; border: none; }
        `;

        this.#iframe = document.createElement('iframe');
        this.#iframe.src = this.getAttribute('src') || '/frame';
        this.#iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-modals allow-pointer-lock allow-popups-to-escape-sandbox';
        this.#iframe.allow = 'autoplay; camera; microphone; geolocation; midi; encrypted-media; fullscreen; payment; display-capture';

        this.shadowRoot.append(style, this.#iframe);

        this.#setupMessageHandlers();
        window.addEventListener('message', this.#handleMessage.bind(this));

        this.#iframe.onload = () => {
            console.log(`${this.#logPrefix} Iframe loaded. Sending init.`);
            this.#sendMessage('init');
        };
        this.#iframe.onerror = () => {
            console.error(`${this.#logPrefix} Iframe failed to load src: ${this.#iframe.src}.`);
        };
    }

    // --- Public API Methods ---
    createTab(url = 'about:blank') { this.#sendMessage('createTab', { url }); }
    loadURL(url, tabId) { this.#sendMessage('loadURL', { url }, tabId); }
    closeTab(tabId) { this.#sendMessage('closeTab', {}, tabId); }
    setActiveTab(tabId) { this.#sendMessage('setActiveTab', {}, tabId); }
    goBack(tabId) { this.#sendMessage('goBack', {}, tabId); }
    goForward(tabId) { this.#sendMessage('goForward', {}, tabId); }
    reload(tabId) { this.#sendMessage('reload', {}, tabId); }
    stop(tabId) { this.#sendMessage('stop', {}, tabId); }

    // --- Public Properties ---
    get activeTabId() { return this.#activeTabId; }
    get tabs() { return Array.from(this.#tabs.values()); }

    // --- Internal Communication & State Logic ---
    #sendMessage(type, data = {}, tabId = null, extra_props = {}) {
        const message = { type, tabId, data, ...extra_props };
        if (this.#iframe.contentWindow) {
            this.#iframe.contentWindow.postMessage(message, this.#targetOrigin);
        } else {
            console.warn(`${this.#logPrefix} contentWindow not available for sending ${type}`);
        }
    }

    #sendRequest(type, data = {}, tabId = null) {
        const id = String(this.#messageId++);
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.#pendingResponses.delete(id);
                reject(new Error(`Request ${type} (${id}) timed out`));
            }, this.#requestTimeout);

            this.#pendingResponses.set(id, { resolve, reject, timeoutId });
            this.#sendMessage(type, data, tabId, { requestId: id });
        });
    }

    #handleMessage(event) {
        if (this.#targetOrigin !== '*' && event.origin !== this.#targetOrigin) return;
        if (event.source !== this.#iframe.contentWindow) return;
        if (!event.data || typeof event.data.type !== 'string') return;

        const { type, tabId, data, requestId, error } = event.data;

        if (requestId && this.#pendingResponses.has(requestId)) {
            const pending = this.#pendingResponses.get(requestId);
            clearTimeout(pending.timeoutId);
            this.#pendingResponses.delete(requestId);
            error ? pending.reject(new Error(error)) : pending.resolve(data);
            return;
        }

        const handler = this.#handlers.get(type);
        if (handler) {
            handler({ tabId, data });
        }
    }

    #registerHandler(type, handler) { this.#handlers.set(type, handler); }
    
    #dispatchEvent(eventName, detail) {
        this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, composed: true }));
    }

    #setupMessageHandlers() {
        this.#registerHandler('tab-api-ready', () => {
            console.log(`${this.#logPrefix} Received 'tab-api-ready'. Fetching initial state.`);
            Promise.all([
                this.#sendRequest('getTabs'),
                this.#sendRequest('getActiveTab')
            ]).then(([tabs, activeTab]) => {
                this.#tabs.clear();
                (tabs || []).forEach(tabData => this.#tabs.set(tabData.id, tabData));
                this.#activeTabId = activeTab ? activeTab.id : (this.#tabs.size > 0 ? this.#tabs.keys().next().value : null);
                this.#isWebViewReady = true;

                this.#dispatchEvent('webview-ready', { tabs: this.tabs, activeTabId: this.#activeTabId });
                console.log(`${this.#logPrefix} Initialized from iframe. Active: ${this.#activeTabId}`);
            }).catch(error => {
                console.error(`${this.#logPrefix} Error getting initial state from iframe:`, error);
            });
        });

        // State update handlers
        this.#registerHandler('tab-created', ({ data }) => {
            this.#tabs.set(data.id, data);
            this.#dispatchEvent('tab-created', { tabId: data.id, data });
        });
        this.#registerHandler('tab-closed', ({ tabId }) => {
            if (this.#tabs.has(tabId)) {
                this.#tabs.delete(tabId);
                this.#dispatchEvent('tab-closed', { tabId });
            }
        });
        this.#registerHandler('active-tab-changed', ({ tabId }) => {
            if (this.#activeTabId !== tabId) {
                this.#activeTabId = tabId;
                const activeTabData = tabId ? this.#tabs.get(tabId) : null;
                this.#dispatchEvent('active-tab-changed', { tabId, url: activeTabData?.url, title: activeTabData?.title });
            }
        });
        this.#registerHandler('did-navigate', ({ data }) => {
            const tab = this.#tabs.get(data.id);
            if (tab) {
                Object.assign(tab, data, { loading: false });
                this.#dispatchEvent('did-navigate', { ...tab });
            }
        });
        this.#registerHandler('did-start-loading', ({ tabId, data }) => {
            const tab = this.#tabs.get(tabId);
            if (tab) {
                tab.loading = true;
                if (data && data.url) tab.url = data.url;
                this.#dispatchEvent('did-start-loading', { tabId, url: tab.url });
            }
        });
        this.#registerHandler('did-stop-loading', ({ tabId }) => {
            const tab = this.#tabs.get(tabId);
            if (tab) {
                tab.loading = false;
                this.#dispatchEvent('did-stop-loading', { tabId, url: tab.url });
            }
        });
    }
}

customElements.define('browser-webview', BrowserWebview);
