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
        this.webview = null;
        this.isReady = false;
        this.tabs = new Map();
        this.activeTabId = null;
        this._messageQueue = [];
        this._recentlyCreated = new Set();
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
    closeTab(tabId) { 
        // Optimistically remove the tab from our state.
        if (this.#tabs.has(tabId)) {
            this.#tabs.delete(tabId);
            this.#dispatchEvent('tab-closed', { tabId });
        }
        // Then send the message to the iframe, without waiting.
        this.#sendMessage('closeTab', {}, tabId); 
    }
    setActiveTab(tabId) { this.#sendMessage('setActiveTab', {}, tabId); }
    goBack(tabId) { this.#sendMessage('goBack', {}, tabId); }
    goForward(tabId) { this.#sendMessage('goForward', {}, tabId); }
    reload(tabId) { this.#sendMessage('reload', {}, tabId); }
    stop(tabId) { this.#sendMessage('stop', {}, tabId); }

    // --- Public Properties ---
    get activeTabId() { return this.#activeTabId; }
    set activeTabId(newATI) {
      this.#activeTabId = newATI;
    }
    get tabs() { return this.#tabs; }
    set tabs(newTabs) {
      for( const tab of newTabs ) {
        this.#tabs.set(tab.id, tab);
      }
    }

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

        switch (type) {
            case 'ready':
                console.log(`[BrowserWebview ${this.id}] Received 'ready' from iframe with data:`, data);
                this.isReady = true;
                this._normalizeAndSetTabs(data.tabs || []);
                this.dispatchEvent(new CustomEvent('webview-ready', {
                    detail: { tabs: this.tabs, activeTabId: this.#activeTabId }
                }));
                break;
            case 'tab-created':
                this._handleTabCreated(data);
                break;
            case 'tab-closed':
                this._handleTabClosed(data.tabId);
                break;
            case 'active-tab-changed':
                this._handleActiveTabChanged(data.tabId, data);
                break;
            case 'did-navigate':
                this._handleDidNavigate(data);
                break;
            case 'did-start-loading':
                this._handleLoadChange(data.tabId, true, data.url);
                break;
            case 'did-stop-loading':
                this._handleLoadChange(data.tabId, false);
                break;
        }
    }

    #registerHandler(type, handler) { this.#handlers.set(type, handler); }
    
    #dispatchEvent(eventName, detail) {
        this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, composed: true }));
    }

    #setupMessageHandlers() {
        this.#registerHandler('tab-api-ready', async () => {
            try {
              console.log(`${this.#logPrefix} Received 'tab-api-ready'. Fetching initial state.`);
              const tabs = await this.#sendRequest('getTabs');
              this.#tabs.clear();
              (tabs || []).forEach(tabData => {
                  const id = tabData.id || tabData.targetId;
                  this.#tabs.set(id, { ...tabData, id });
              });
              const activeTab = await this.#sendRequest('getActiveTab')
              const activeId = activeTab ? (activeTab.id || activeTab.targetId) : (this.#tabs.size > 0 ? this.#tabs.keys().next().value : null);
              this.#activeTabId = activeId;
              this.#isWebViewReady = true;

              this.#dispatchEvent('webview-ready', { tabs: this.tabs, activeTabId: this.#activeTabId });
              this.dispatchEvent(new CustomEvent('tabs-updated', {
                  detail: { tabs }
              }));
              console.log(`${this.#logPrefix} Initialized from iframe. Active: ${this.#activeTabId}`);
            } catch(error) {
                console.error(`${this.#logPrefix} Error getting initial state from iframe:`, error);
            }
        });

        // State update handlers
        this.#registerHandler('tab-created', ({ data }) => {
            const id = data.id || data.targetId;
            if (!id) {
                console.warn(`${this.#logPrefix} Received tab-created without an ID.`, data);
                return;
            }
            this.#tabs.set(id, { ...data, id });
            this.#dispatchEvent('tab-created', { tabId: id, data: { ...data, id } });
        });
        this.#registerHandler('tab-closed', ({ tabId, data }) => {
            const id = tabId || (data && (data.id || data.targetId));
            if (this.#tabs.has(id)) {
                this.#tabs.delete(id);
                // The event is now dispatched optimistically in closeTab,
                // but we keep this handler for cases where the iframe initiates the close.
                this.#dispatchEvent('tab-closed', { tabId: id });
            }
        });
        this.#registerHandler('active-tab-changed', ({ tabId, data }) => {
            const id = tabId || (data && (data.id || data.targetId));
            if (this.#activeTabId !== id) {
                this.#activeTabId = id;
                const activeTabData = id ? this.#tabs.get(id) : null;
                this.#dispatchEvent('active-tab-changed', { tabId: id, url: activeTabData?.url, title: activeTabData?.title });
            }
        });
        this.#registerHandler('did-navigate', ({ data }) => {
            const id = data.id || data.targetId;
            if (!id) return;

            let tab = this.tabs.get(id);

            if (!tab) {
                // A navigation event for a tab we don't know about.
                // For now, we'll just log it. The optimistic creation was causing duplicates.
                console.warn(`[BrowserWebview ${this.id}] Received 'did-navigate' for unknown tab:`, data);
                return;
            }

            Object.assign(tab, data, { id: id, loading: false });
            this.dispatchEvent(new CustomEvent('did-navigate', { detail: { ...tab } }));
        });
        this.#registerHandler('did-start-loading', ({ tabId, data }) => {
            const id = tabId || (data && (data.id || data.targetId));
            const tab = this.#tabs.get(id);
            if (tab) {
                tab.loading = true;
                if (data && data.url) tab.url = data.url;
                this.#dispatchEvent('did-start-loading', { tabId: id, url: tab.url });
            }
        });
        this.#registerHandler('did-stop-loading', ({ tabId, data }) => {
            const id = tabId || (data && (data.id || data.targetId));
            const tab = this.#tabs.get(id);
            if (tab) {
                tab.loading = false;
                this.#dispatchEvent('did-stop-loading', { tabId: id, url: tab.url });
            }
        });
        setInterval(async () => {
                const tabs = await this.#sendRequest('getTabs');
                (tabs || []).forEach(tabData => {
                    const id = tabData.id || tabData.targetId;
                    this.#tabs.set(id, { ...tabData, id });
                });
                this.dispatchEvent(new CustomEvent('tabs-updated', {
                    detail: { tabs }
                }));
        }, 5000);
    }

    _handleTabCreated(data) {
        const id = data.id || data.targetId;
        if (!id) {
            console.warn(`[BrowserWebview ${this.id}] Received tab-created without an ID.`, data);
            return;
        }
        // Cache this ID for a moment to prevent did-navigate from creating a duplicate
        this._recentlyCreated.add(id);
        setTimeout(() => this._recentlyCreated.delete(id), 1000);

        const newTab = { ...data, id };
        this.tabs.set(id, newTab);
        this.dispatchEvent(new CustomEvent('tab-created', {
            detail: { tabId: id, data: newTab }
        }));
    }

    _handleTabClosed(tabId) {
        if (this.#tabs.has(tabId)) {
            this.#tabs.delete(tabId);
            this.#dispatchEvent('tab-closed', { tabId });
        }
    }

    _handleActiveTabChanged(tabId, data) {
        const id = tabId || (data && (data.id || data.targetId));
        if (this.#activeTabId !== id) {
            this.#activeTabId = id;
            const activeTabData = id ? this.#tabs.get(id) : null;
            this.#dispatchEvent('active-tab-changed', { tabId: id, url: activeTabData?.url, title: activeTabData?.title });
        }
    }

    _handleDidNavigate(data) {
        const id = data.id || data.targetId;
        if (!id) return;

        let tab = this.tabs.get(id);

        if (!tab) {
            // A navigation event for a tab we don't know about.
            // For now, we'll just log it. The optimistic creation was causing duplicates.
            console.warn(`[BrowserWebview ${this.id}] Received 'did-navigate' for unknown tab:`, data);
            return;
        }

        Object.assign(tab, data, { id: id, loading: false });
        this.dispatchEvent(new CustomEvent('did-navigate', { detail: { ...tab } }));
    }

    _handleLoadChange(tabId, isLoading, url) {
        const id = tabId || (data && (data.id || data.targetId));
        const tab = this.tabs.get(id);
        if (tab) {
            tab.loading = isLoading;
            if (url) tab.url = url;
            this.dispatchEvent(new CustomEvent('did-start-loading', { detail: { tabId: id, url: tab.url } }));
        }
    }
}

customElements.define('browser-webview', BrowserWebview);
