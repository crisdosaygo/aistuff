// webview.js

import { BrowserBoxClient } from './browserbox-client.js';
import { BrowserBoxAdapter } from './browserbox-adapter.js';

class Communication {
    #element;
    #targetOrigin;
    #logPrefix;
    #handlers = new Map();
    #pendingResponses = new Map();
    #messageId = 0;
    #requestTimeout = 3000;

    constructor(element, targetOrigin, logPrefix) {
        this.#element = element;
        this.#targetOrigin = targetOrigin;
        this.#logPrefix = logPrefix;
        this.#element.addEventListener('message', this.#handleMessage.bind(this));
    }

    registerHandler(type, handler) {
        this.#handlers.set(type, handler);
    }

    sendMessage(type, data = {}, tabId = null) {
        const message = { type, tabId, data };
        if (this.#element.contentWindow) {
            this.#element.contentWindow.postMessage(message, this.#targetOrigin);
        }
    }

    sendRequest(type, data = {}, tabId = null) {
        const id = String(this.#messageId++);
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                if (this.#pendingResponses.has(id)) {
                    this.#pendingResponses.delete(id);
                    reject(new Error(`Request ${type} (${id}) timed out`));
                }
            }, this.#requestTimeout);

            this.#pendingResponses.set(id, { resolve, reject, timeoutId });
            const message = { type, tabId, data, requestId: id };
            if (this.#element.contentWindow) {
                this.#element.contentWindow.postMessage(message, this.#targetOrigin);
            } else {
                clearTimeout(timeoutId);
                this.#pendingResponses.delete(id);
                reject(new Error(`contentWindow not available`));
            }
        });
    }

    #handleMessage(event) {
        if (!event.data || typeof event.data.type !== 'string') return;
        const { type, tabId, data, requestId, error } = event.data;

        if (requestId && this.#pendingResponses.has(requestId)) {
            const pending = this.#pendingResponses.get(requestId);
            clearTimeout(pending.timeoutId);
            this.#pendingResponses.delete(requestId);
            if (error) pending.reject(error);
            else pending.resolve(data);
            return;
        }

        const handler = this.#handlers.get(type);
        if (handler) handler({ tabId, data });
    }
}

export class BrowserWebview extends HTMLElement {
    // Private fields
    #tabs = new Map();
    #activeTabId = null;
    #iframeOrigin = '*';
    #sessionId = `session-${Math.random().toString(36).slice(2)}`;
    #container;
    #iframe;
    #comm;
    #browserConnection;
    #tabIdCounter = 0;
    #isWebViewReady = false;
    #initializationFallbackTimeout = null;
    #isCloudMode = false;
    #cloudClient = null;
    #cloudAdapter = null;
    #cloudSessionData = null;

    constructor(browserConnection) {
        super();
        this.#browserConnection = browserConnection || '/frame';
        this.#cloudClient = new BrowserBoxClient();
    }

    connectedCallback() {
        console.log('[BrowserWebview] connectedCallback fired');
        this.innerHTML = `<div class="webview-container" style="width:100%; height:100%;"><div style="padding:10px; text-align:center; color: #555;">Initializing Webview...</div></div>`;
        this.#container = this.querySelector('.webview-container');
        this.#createIframe();

        // Default to cloud mode
        console.log('[BrowserWebview] Calling enableCloudMode');
        this.enableCloudMode();
    }

    disconnectedCallback() {
        if (this.#initializationFallbackTimeout) {
            clearTimeout(this.#initializationFallbackTimeout);
        }
    }

    #initializeAsMock(isErrorCase = false) {
        if (this.#isWebViewReady) return;

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

        this.#container.innerHTML = '';
        this.#container.appendChild(this.#iframe);
        this.#updateIframeVisibility();

        this.#dispatchEvent('webview-ready', {
            tabs: this.tabs,
            activeTabId: this.#activeTabId
        });
    }

    // Cloud Mode
    async enableCloudMode() {
        console.log('[BrowserWebview] enableCloudMode called, isCloudMode:', this.#isCloudMode);
        if (this.#isCloudMode) return;
        
        this.#isCloudMode = true;
        this.#showDeployingScreen();

        try {
            console.log('[BrowserWebview] Checking status...');
            const status = await this.#cloudClient.checkStatus();
            console.log('[BrowserWebview] Status:', status);
            let sessionData;

            if (status && status.activeSession) {
                console.log('[BrowserWebview] Reusing existing session');
                sessionData = status.activeSession;
            } else {
                console.log('[BrowserWebview] Creating new session...');
                sessionData = await this.#cloudClient.createSession();
                console.log('[BrowserWebview] Session created:', sessionData);
            }

            this.#cloudSessionData = sessionData;
            this.#initializeCloudSession(sessionData);

        } catch (error) {
            console.error(`[BrowserWebview] Cloud connection failed:`, error);
            this.#isCloudMode = false;
            this.#showBSOD(error.message);
        }
    }

    #showDeployingScreen() {
        this.#container.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                background: #008080;
                color: white;
                font-family: 'MS Sans Serif', Tahoma, sans-serif;
            ">
                <div style="background: #000080; padding: 20px 40px; border: 2px outset #c0c0c0;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="win98-spinner"></div>
                        <div>
                            <p style="margin: 0 0 8px 0; font-weight: bold;">Windows is deploying your browser...</p>
                            <p style="margin: 0; font-size: 12px;">Finding closest server to your location.</p>
                            <p style="margin: 4px 0 0 0; font-size: 11px; color: #a0a0a0;">This may take up to 60 seconds.</p>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                .win98-spinner {
                    width: 32px; height: 32px;
                    border: 3px solid #c0c0c0;
                    border-top: 3px solid #000080;
                    border-radius: 50%;
                    animation: win98-spin 1s linear infinite;
                }
                @keyframes win98-spin { to { transform: rotate(360deg); } }
            </style>
        `;
    }

    #showBSOD(errorMessage) {
        // Classic Windows 98 BSOD
        this.#container.innerHTML = `
            <div style="
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                background: #000080;
                color: white;
                font-family: 'Perfect DOS VGA 437', 'Courier New', monospace;
                font-size: 14px;
                padding: 40px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                line-height: 1.6;
            ">
                <div style="background: #a8a8a8; color: #000080; padding: 2px 8px; margin-bottom: 20px;">
                    Windows
                </div>
                <div style="max-width: 600px;">
                    <p>A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) +
                    00010E36. The current application will be terminated.</p>
                    <br>
                    <p>*  Press any key to terminate the current application.</p>
                    <p>*  Press CTRL+ALT+DEL again to restart your computer. You will</p>
                    <p>   lose any unsaved information in all applications.</p>
                    <br>
                    <p style="color: #ffff00;">BROWSERBOX_CLOUD_CONNECT_FAILED</p>
                    <p style="color: #a8a8a8; font-size: 12px;">${errorMessage}</p>
                    <br>
                    <p>Press any key to continue <span class="bsod-blink">_</span></p>
                </div>
            </div>
            <style>
                .bsod-blink { animation: bsod-cursor 1s infinite; }
                @keyframes bsod-cursor { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
            </style>
        `;
        
        // Click anywhere to retry
        const clickHandler = () => {
            this.#container.removeEventListener('click', clickHandler);
            document.removeEventListener('keydown', keyHandler);
            this.enableCloudMode();
        };
        const keyHandler = (e) => {
            if (this.#container.offsetParent !== null) { // visible
                clickHandler();
            }
        };
        this.#container.addEventListener('click', clickHandler);
        document.addEventListener('keydown', keyHandler);
    }

    disableCloudMode() {
        if (!this.#isCloudMode) return;
        this.#isCloudMode = false;
        this.#cloudSessionData = null;
        this.#cloudAdapter = null;
        this.#isWebViewReady = false;
        this.#createIframe();
        this.#initializeAsMock();
    }

    #initializeCloudSession(sessionData) {
        this.#tabs.clear();
        this.#activeTabId = null;

        if (!this.#iframe) this.#createIframe();
        
        const separator = sessionData.loginUrl.includes('?') ? '&' : '?';
        this.#iframe.src = `${sessionData.loginUrl}${separator}embedded=true`;
        this.#iframe.style.display = 'block';
        
        this.#container.innerHTML = '';
        this.#container.appendChild(this.#iframe);

        this.#cloudAdapter = new BrowserBoxAdapter(this.#iframe, (event, data) => {
            this.#dispatchEvent(event, data);
        });

        const cloudTabId = 'cloud-session';
        this.#tabs.set(cloudTabId, {
            url: sessionData.loginUrl,
            title: 'BrowserBox Cloud',
            history: [],
            historyIndex: 0,
            loading: false,
            iframe: this.#iframe,
            isCloud: true
        });
        this.#activeTabId = cloudTabId;
        this.#isWebViewReady = true;

        this.#dispatchEvent('webview-ready', {
            tabs: this.tabs,
            activeTabId: this.#activeTabId
        });
    }

    // API Methods
    async loadURL(url, tabId) {
        if (this.#isCloudMode) {
            if (this.#cloudAdapter) {
                this.#cloudAdapter.loadURL(url);
                this.#dispatchEvent('did-navigate', { tabId: this.#activeTabId, url: url, title: url }); 
            }
            return;
        }
        if (!tabId || !this.#tabs.has(tabId)) {
            if (this.#tabs.size > 0 && !tabId) tabId = this.#activeTabId;
            else return;
        }
        const tab = this.#tabs.get(tabId);
        if (tab.loading) await this.stop(tabId);
        
        tab.loading = true;
        tab.url = url;
        this.#dispatchEvent('did-start-loading', { tabId, url });
        this.#updateIframeVisibility();
        this.#comm.sendMessage('loadURL', { url }, tabId);

        setTimeout(() => {
            if (!this.#tabs.has(tabId)) return;
            const currentTab = this.#tabs.get(tabId);
            currentTab.loading = false;
            currentTab.title = this.#extractTitleFromUrl(url);

            if (currentTab.history[currentTab.historyIndex] !== url) {
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
        }, 500 + Math.random() * 300);
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
            if (this.#tabs.size > 0) tabId = this.#tabs.keys().next().value;
            else tabId = null;
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
            tab.url = url;
            tab.title = this.#extractTitleFromUrl(url);
            this.#dispatchEvent('did-start-loading', { tabId, url });
            setTimeout(() => {
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
        if (this.#isCloudMode && this.#cloudAdapter) {
            this.#cloudAdapter.goBack();
            return;
        }
        if (this._navigateHistory(tabId, -1)) {
            this.#comm.sendMessage('goBack', {}, tabId);
        }
    }

    async goForward(tabId) {
        if (this.#isCloudMode && this.#cloudAdapter) {
            this.#cloudAdapter.goForward();
            return;
        }
        if (this._navigateHistory(tabId, 1)) {
            this.#comm.sendMessage('goForward', {}, tabId);
        }
    }

    async reload(tabId) {
        if (this.#isCloudMode && this.#cloudAdapter) {
            this.#cloudAdapter.reload();
            return;
        }
        if (!this.#tabs.has(tabId)) return;
        const tab = this.#tabs.get(tabId);
        await this.loadURL(tab.url, tabId);
        this.#comm.sendMessage('reload', {}, tabId);
    }

    async stop(tabId) {
        if (!this.#tabs.has(tabId)) return;
        const tab = this.#tabs.get(tabId);
        if (!tab.loading) return;
        tab.loading = false;
        this.#dispatchEvent('did-stop-loading', { tabId, url: tab.url });
        this.#comm.sendMessage('stop', {}, tabId);
    }

    // Properties
    get activeTabId() { return this.#activeTabId; }

    get tabs() {
        return Array.from(this.#tabs.entries()).map(([id, tab]) => ({
            id,
            url: tab.url,
            title: tab.title,
            loading: tab.loading,
            canGoBack: tab.historyIndex > 0,
            canGoForward: tab.historyIndex < tab.history.length - 1
        }));
    }

    _generateTabId() {
        return `bwv-tab-${this.#tabIdCounter++}-${Date.now()}`;
    }

    // Internal Methods
    #createIframe() {
        this.#iframe = document.createElement('iframe');
        this.#iframe.style.width = '100%';
        this.#iframe.style.height = '100%';
        this.#iframe.style.border = 'none';
        this.#iframe.style.display = 'none';
        this.#iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-modals allow-pointer-lock allow-popups-to-escape-sandbox';
        this.#iframe.allow = 'autoplay; camera; microphone; geolocation; midi; encrypted-media; fullscreen; payment; display-capture';
        
        try {
            const url = new URL(this.#browserConnection, window.location.origin);
            this.#iframe.src = url.href;
        } catch (e) {
            this.#iframe.src = 'about:blank';
        }
        
        this.#comm = new Communication(this.#iframe, this.#iframeOrigin, `[BrowserWebview]`);
        this.#setupMessageHandlers();
        
        this.#iframe.onload = () => {
            this.#comm.sendMessage('init', { sessionId: this.#sessionId });
        };
        this.#iframe.onerror = () => {
            if (this.#initializationFallbackTimeout) clearTimeout(this.#initializationFallbackTimeout);
            this.#initializeAsMock(true);
        };
    }
    
    #updateIframeVisibility() {
        if (this.#iframe) {
            if (this.#activeTabId && this.#tabs.has(this.#activeTabId)) {
                this.#iframe.style.display = 'block';
                this.#container.innerHTML = '';
                this.#container.appendChild(this.#iframe);
            } else {
                this.#iframe.style.display = 'none';
                this.#container.innerHTML = `<div style="padding:10px; text-align:center; color: #555;">(No active tab)</div>`;
            }
        }
    }

    #setupMessageHandlers() {
        this.#comm.registerHandler('tab-ready', () => {
            if(this.#initializationFallbackTimeout) clearTimeout(this.#initializationFallbackTimeout);
            this.#initializationFallbackTimeout = null;

            Promise.all([
                this.#comm.sendRequest('getTabs'),
                this.#comm.sendRequest('getActiveTab')
            ]).then(([tabsFromIframe, activeTabIdFromIframe]) => {
                this.#tabs.clear();
                tabsFromIframe.forEach(tabData => {
                    this.#tabs.set(tabData.id, {
                        url: tabData.url,
                        title: tabData.title || this.#extractTitleFromUrl(tabData.url),
                        history: tabData.url ? [tabData.url] : [],
                        historyIndex: tabData.url ? 0 : -1,
                        loading: false,
                        iframe: this.#iframe
                    });
                    this.#dispatchEvent('tab-created', { tabId: tabData.id, data: this.#tabs.get(tabData.id) });
                });

                this.#activeTabId = activeTabIdFromIframe;
                if (!this.#activeTabId || !this.#tabs.has(this.#activeTabId)) {
                    this.#activeTabId = this.#tabs.size > 0 ? this.#tabs.keys().next().value : null;
                }
                
                this.#isWebViewReady = true;
                this.#container.innerHTML = '';
                this.#container.appendChild(this.#iframe);
                this.#updateIframeVisibility();

                this.#dispatchEvent('webview-ready', { tabs: this.tabs, activeTabId: this.#activeTabId });
                if (this.#activeTabId) {
                    const activeTabData = this.#tabs.get(this.#activeTabId);
                    this.#dispatchEvent('active-tab-changed', { tabId: this.#activeTabId, url: activeTabData?.url, title: activeTabData?.title });
                }
            }).catch(() => {
                if (!this.#isWebViewReady) this.#initializeAsMock(true);
            });
        });

        this.#comm.registerHandler('tab-created', ({ tabId, data }) => {
            if (this.#tabs.has(tabId)) {
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

        this.#comm.registerHandler('tab-closed', ({ tabId }) => {
            const wasActive = (this.#activeTabId === tabId);
            if (this.#tabs.has(tabId)) {
                this.#tabs.delete(tabId);
                this.#dispatchEvent('tab-closed', { tabId });
            }
            if (wasActive) {
                const remainingTabIds = Array.from(this.#tabs.keys());
                const newActiveTabId = remainingTabIds.length > 0 ? remainingTabIds[remainingTabIds.length - 1] : null;
                this.setActiveTab(newActiveTabId);
            }
            this.#updateIframeVisibility();
        });
        
        this.#comm.registerHandler('active-tab', ({ data }) => {
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
                if (data && data.url) tab.url = data.url;
                this.#dispatchEvent('did-start-loading', { tabId, url: tab.url });
            }
        });

        this.#comm.registerHandler('did-stop-loading', ({ tabId, data }) => {
            const tab = this.#tabs.get(tabId);
            if (tab) {
                tab.loading = false;
                this.#dispatchEvent('did-stop-loading', { tabId, url: tab.url });
            }
        });

        this.#comm.registerHandler('did-navigate', ({ tabId, data }) => {
            const tab = this.#tabs.get(tabId);
            if (tab) {
                tab.url = data.url;
                tab.title = data.title || this.#extractTitleFromUrl(data.url);
                tab.loading = false;

                if (data.history && data.historyIndex !== undefined) {
                    tab.history = data.history;
                    tab.historyIndex = data.historyIndex;
                } else {
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

        this.#comm.registerHandler('tabs-list', ({ data }) => {});
    }

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
        this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, composed: true }));
    }
}

customElements.define('browser-webview', BrowserWebview);
