// browser.js

// === Imports, Constants, and State ===
import {BrowserWebview} from './webview.js';

export class BrowserApp {
    // privates
    #netscape;
    #windowEl;
    #windowInstanceId;
    #webviewId;
    #webviewEl;
    #tabs = []; // Array of {id, title, url, history, historyIndex, domElement, isMock?}
    #activeTabId = null;
    #defaultUrl = "about:blank";
    #homeUrl = "https://www.google.com"; // Or your preferred home
    #throbberAnimatedSrc;
    #throbberStaticSrc;
    #ui;
    #tabIdCounter = 0; // For generating mock tab IDs

    // --- Lifecycle Methods ---
    constructor(windowEl, windowInstanceId, webviewId, netscape) {
        this.#netscape = netscape; // true or false
        this.#windowEl = windowEl;
        this.#windowInstanceId = windowInstanceId;
        this.#webviewId = webviewId;

        // Populate UI elements first as webview instantiation might be async
        this.#ui = {
            navButtons: {
                back: this.#windowEl.querySelector('[data-action="back"]'),
                forward: this.#windowEl.querySelector('[data-action="forward"]'),
                stop: this.#windowEl.querySelector('[data-action="stop"]'),
                reload: this.#windowEl.querySelector('[data-action="reload"]'),
                home: this.#windowEl.querySelector('[data-action="home"]'),
            },
            addressBar: this.#windowEl.querySelector('.browser-address-bar'),
            goButton: this.#windowEl.querySelector('[data-action="go"]'),
            tabBar: this.#windowEl.querySelector('.browser-tab-bar'),
            newTabButton: this.#windowEl.querySelector('.browser-new-tab-btn'),
            throbber: this.#windowEl.querySelector('.browser-throbber'),
        };
        
        this.#throbberAnimatedSrc = this.#netscape ? "./netscape.gif" : ""; // Ensure path is correct relative to HTML
        this.#throbberStaticSrc = this.#netscape ? "./netscape-frame.gif" : "";


        // Define a default iframe source, can be overridden by specific needs
        const iframeSrc = this.#netscape ? '/netscape_iframe_handler.html' : '/default_iframe_handler.html'; // Example
        this.#webviewEl = new BrowserWebview(iframeSrc);
        this.#webviewEl.id = webviewId; // Set ID for BrowserWebview's logging

        const placeholder = this.#windowEl.querySelector(`#webview-placeholder-${this.#webviewId}`);
        if (placeholder) {
            placeholder.replaceWith(this.#webviewEl); // Replace placeholder with actual webview
        } else {
            console.error(`[BrowserApp ${this.#webviewId}] Webview placeholder not found! Appending webview to main window container.`);
            const mainBrowserContainer = this.#windowEl.querySelector('.browser-container') || this.#windowEl;
            // Ensure webview is appended in a way that it can take up space
            const webviewWrapper = document.createElement('div');
            webviewWrapper.style.flexGrow = '1';
            webviewWrapper.style.position = 'relative'; // For potential absolute positioning of iframe
            webviewWrapper.appendChild(this.#webviewEl);
            mainBrowserContainer.appendChild(webviewWrapper);
        }

        this.#setupEventListeners(); // For BrowserApp's own UI
        this.#setupWebviewEventListeners(); // For events from BrowserWebview

        // Asynchronously add the initial tab
        this.addTab(this.#defaultUrl, true)
            .then(initialTab => {
                if (initialTab) {
                    console.log(`[BrowserApp ${this.#webviewId}] Initial tab ${initialTab.id} (mock: ${initialTab.isMock}) added.`);
                } else {
                    console.warn(`[BrowserApp ${this.#webviewId}] Initial tab creation failed or yielded no tab.`);
                }
                // #updateNavButtonStates will be called by switchTab or addTab's active path
            })
            .catch(error => {
                console.error(`[BrowserApp ${this.#webviewId}] Error creating initial tab:`, error);
                this.#updateNavButtonStates(); // Ensure UI is consistent even on error
            });
    }

    // --- Static Methods ---
    static generateInitialHTML(webviewId, options = { netscape: false }) { // Pass options
        const throbberSrc = options.netscape ? './netscape-frame.gif' : ''; // Ensure path is correct
        const throbberAlt = options.netscape ? 'Loading Indicator' : '';
        return `
            <div class="browser-container" style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
                <div class="browser-toolbar" style="padding: 5px; background-color: #f0f0f0; border-bottom: 1px solid #ccc;">
                    <div class="browser-nav-buttons" style="display: flex; align-items: center;">
                        <button data-action="back" title="Back" style="margin-right: 5px;">← Back</button>
                        <button data-action="forward" title="Forward" style="margin-right: 5px;">Forward →</button>
                        <button data-action="stop" title="Stop" style="margin-right: 5px;">🛑 Stop</button>
                        <button data-action="reload" title="Reload" style="margin-right: 5px;">🔄 Reload</button>
                        <button data-action="home" title="Home" style="margin-right: 10px;">🏠 Home</button>
                        <img src="${throbberSrc}" alt="${throbberAlt}" class="browser-throbber" style="display: none; width: 22px; height: 22px; vertical-align: middle;">
                    </div>
                </div>
                <div class="browser-address-toolbar" style="display: flex; padding: 5px; background-color: #f0f0f0; border-bottom: 1px solid #ccc;">
                    <label for="address-${webviewId}" style="padding-right: 5px; white-space: nowrap;">Address:</label>
                    <input type="text" id="address-${webviewId}" class="browser-address-bar" value="" style="flex-grow: 1; margin-right: 5px;">
                    <button data-action="go">Go</button>
                </div>
                <div class="browser-tab-bar" style="display: flex; align-items: center; background-color: #e0e0e0; padding: 2px 5px; border-bottom: 1px solid #ccc; flex-shrink: 0;">
                    <!-- Tabs will be rendered here by #renderTabs -->
                    <button class="browser-new-tab-btn" title="New Tab" style="padding: 5px 10px; margin-left: 5px; border: 1px solid #aaa; background-color: #f9f9f9;">+</button>
                </div>
                <div class="webview-placeholder" id="webview-placeholder-${webviewId}" style="flex-grow: 1; background-color: #ffffff; border: none; position: relative;">
                    <!-- BrowserWebview custom element will be placed here -->
                </div>
            </div>
        `;
    }

    // --- Event Setup Methods ---
    #setupEventListeners() {
        const { navButtons, addressBar, goButton, newTabButton, tabBar } = this.#ui;
        if (navButtons.back) navButtons.back.addEventListener('click', () => this.goBack());
        if (navButtons.forward) navButtons.forward.addEventListener('click', () => this.goForward());
        if (navButtons.stop) navButtons.stop.addEventListener('click', () => this.stopLoading());
        if (navButtons.reload) navButtons.reload.addEventListener('click', () => this.reloadPage());
        if (navButtons.home) navButtons.home.addEventListener('click', () => this.navigateTo(this.#homeUrl));

        if (addressBar) addressBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.navigateToCurrentAddress();
        });
        if (goButton) goButton.addEventListener('click', () => this.navigateToCurrentAddress());
        if (newTabButton) newTabButton.addEventListener('click', () => this.addTab(this.#defaultUrl, true));

        if (tabBar) tabBar.addEventListener('click', (e) => {
            const tabElement = e.target.closest('.browser-tab');
            if (!tabElement) return;

            const tabId = tabElement.dataset.tabId;
            if (e.target.classList.contains('tab-close-btn')) {
                this.closeTab(tabId);
            } else {
                this.switchTab(tabId);
            }
        });
    }

    #setupWebviewEventListeners() {
        this.#webviewEl.addEventListener('initial-tabs-loaded', (e) => {
            const { tabs: initialTabsFromWebview, error } = e.detail;
            if (error) {
                console.error(`[BrowserApp ${this.#webviewId}] Error loading initial tabs from webview. Mock tab may remain.`);
                if (this.#tabs.length === 0) {
                    console.warn(`[BrowserApp ${this.#webviewId}] No initial tabs from webview and no mock tab present. Creating one.`);
                    this.addTab(this.#defaultUrl, true);
                }
                return;
            }

            console.log(`[BrowserApp ${this.#webviewId}] webview event: initial-tabs-loaded`, initialTabsFromWebview);
            const oldActiveTabId = this.#activeTabId;
            this.#tabs = []; // Clear any existing (e.g. mock) tabs
            if (initialTabsFromWebview && initialTabsFromWebview.length > 0) {
                initialTabsFromWebview.forEach(tabData => {
                    this.#tabs.push({
                        id: tabData.id,
                        title: tabData.title || this.#extractTitleFromUrl(tabData.url),
                        url: tabData.url || "",
                        history: tabData.url ? [tabData.url] : [], // App history is simplified
                        historyIndex: tabData.url ? 0 : -1,
                        domElement: null,
                        isMock: false // These are real tabs from webview
                    });
                });
                 // Try to restore active tab or set to first
                const newActiveTab = this.#tabs.find(t => t.id === oldActiveTabId) || this.#tabs[0];
                if (newActiveTab) {
                    this.switchTab(newActiveTab.id);
                } else { // No tabs from webview, create a default one
                     this.addTab(this.#defaultUrl, true);
                }
            } else if (this.#tabs.length === 0) {
                 console.log(`[BrowserApp ${this.#webviewId}] No initial tabs from webview. Ensuring a default tab exists.`);
                 this.addTab(this.#defaultUrl, true);
            }
            // `switchTab` or `addTab` will call `#renderTabs` and `#updateNavButtonStates`
        });

        this.#webviewEl.addEventListener('active-tab-set-by-iframe', (e) => {
            const { tabId, url, title } = e.detail;
            console.log(`[BrowserApp ${this.#webviewId}] webview event: active-tab-set-by-iframe: Tab ${tabId}`);
            const tabInApp = this.#tabs.find(t => t.id === tabId);
            if (tabInApp) {
                if(url !== undefined) tabInApp.url = url;
                if(title !== undefined) tabInApp.title = title;
                this.switchTab(tabId); // This ensures UI consistency
            } else {
                 console.warn(`[BrowserApp ${this.#webviewId}] Iframe reported active tab ${tabId}, but it's not in BrowserApp's list. Adding it.`);
                 const newTab = {
                    id: tabId,
                    title: title || this.#extractTitleFromUrl(url),
                    url: url || this.#defaultUrl,
                    history: url ? [url] : [], historyIndex: url ? 0 : -1,
                    domElement: null, isMock: false
                 };
                 this.#tabs.push(newTab);
                 this.switchTab(tabId); // This will also render and update nav
            }
        });
        
        this.#webviewEl.addEventListener('tab-created', (e) => {
            const tabDataFromWebview = e.detail;
            console.log(`[BrowserApp ${this.#webviewId}] webview event: tab-created`, tabDataFromWebview);

            if (!tabDataFromWebview || !tabDataFromWebview.id) {
                console.error(`[BrowserApp ${this.#webviewId}] Invalid 'tab-created' event data from webview.`);
                return;
            }

            let existingTab = this.#tabs.find(t => t.id === tabDataFromWebview.id);
            if (existingTab && existingTab.isMock) { // Mock tab being confirmed by webview
                console.log(`[BrowserApp ${this.#webviewId}] Mock tab ${existingTab.id} confirmed by webview.`);
                existingTab.title = tabDataFromWebview.title || this.#extractTitleFromUrl(tabDataFromWebview.url);
                existingTab.url = tabDataFromWebview.url || existingTab.url;
                existingTab.isMock = false;
            } else if (!existingTab) { // Completely new tab initiated by iframe
                 console.log(`[BrowserApp ${this.#webviewId}] New tab ${tabDataFromWebview.id} created by webview.`);
                existingTab = {
                    id: tabDataFromWebview.id,
                    title: tabDataFromWebview.title || this.#extractTitleFromUrl(tabDataFromWebview.url),
                    url: tabDataFromWebview.url || "",
                    history: tabDataFromWebview.url ? [tabDataFromWebview.url] : [],
                    historyIndex: tabDataFromWebview.url ? 0 : -1,
                    domElement: null,
                    isMock: false
                };
                this.#tabs.push(existingTab);
            } else {
                // Tab already exists and is not mock, could be an update (though 'did-navigate' is better for that)
                existingTab.title = tabDataFromWebview.title || this.#extractTitleFromUrl(tabDataFromWebview.url);
                existingTab.url = tabDataFromWebview.url || existingTab.url;
            }

            this.#renderTabs();
            if (!this.#activeTabId || (this.#tabs.length === 1 && !this.#activeTabId)) {
                this.switchTab(tabDataFromWebview.id);
            } else {
                 this.#updateNavButtonStates(); // If active tab didn't change
            }
        });

        this.#webviewEl.addEventListener('tab-closed', (e) => {
            const { tabId } = e.detail;
            console.log(`[BrowserApp ${this.#webviewId}] webview event: tab-closed: Tab ${tabId}`);
            const tabIndex = this.#tabs.findIndex(t => t.id === tabId);
            if (tabIndex !== -1) {
                this.#tabs.splice(tabIndex, 1);
                if (this.#activeTabId === tabId) {
                    this.#activeTabId = null;
                    if (this.#tabs.length > 0) {
                        const newActiveIndex = Math.max(0, tabIndex - 1);
                        this.switchTab(this.#tabs[newActiveIndex].id);
                    } else {
                        this.addTab(this.#defaultUrl, true);
                    }
                } else {
                    this.#renderTabs();
                    this.#updateNavButtonStates();
                }
            }
        });

        this.#webviewEl.addEventListener('did-start-loading', (e) => {
            const { tabId, url } = e.detail;
            console.log(`[BrowserApp ${this.#webviewId}] did-start-loading: Tab ${tabId}, URL ${url}`);
            if (tabId === this.#activeTabId) {
                if (this.#ui.navButtons.stop) this.#ui.navButtons.stop.disabled = false;
                if (this.#ui.throbber && this.#netscape && this.#throbberAnimatedSrc) {
                    this.#ui.throbber.src = this.#throbberAnimatedSrc;
                    this.#ui.throbber.style.display = 'inline';
                }
                if (this.#ui.addressBar && url) this.#ui.addressBar.value = url;
            }
            const tab = this.#tabs.find(t => t.id === tabId);
            if (tab) {
                if (url) tab.url = url; // Update tab's URL optimistically
                // Consider changing tab.title to "Loading..." or the URL
                // this.#renderTabs(); // If tab title changes for loading state
            }
        });

        this.#webviewEl.addEventListener('did-stop-loading', (e) => {
            const { tabId, url, title, timedOut } = e.detail;
            console.log(`[BrowserApp ${this.#webviewId}] did-stop-loading: Tab ${tabId}, URL ${url}, Title: ${title}`);
            if (tabId === this.#activeTabId) {
                if (this.#ui.navButtons.stop) this.#ui.navButtons.stop.disabled = true;
                if (this.#ui.throbber) {
                    if (this.#throbberStaticSrc && this.#netscape) {
                        this.#ui.throbber.src = this.#throbberStaticSrc;
                    } else {
                        this.#ui.throbber.style.display = 'none';
                        this.#ui.throbber.src = '';
                    }
                }
            }
            const tab = this.#tabs.find(t => t.id === tabId);
            if (tab) {
                if (title) tab.title = title;
                if (url) tab.url = url; // Ensure URL is final
                if (timedOut) tab.title = `(Timeout) ${tab.title || this.#extractTitleFromUrl(tab.url)}`;
                this.#renderTabs(); // Re-render to reflect new title or loading state
            }
             this.#updateNavButtonStates();
        });

        this.#webviewEl.addEventListener('did-navigate', (e) => {
            const { tabId, url, title, canGoBack, canGoForward } = e.detail;
            console.log(`[BrowserApp ${this.#webviewId}] did-navigate: Tab ${tabId}, URL ${url}, Title ${title}`);
            const tab = this.#tabs.find(t => t.id === tabId);
            if (tab) {
                tab.url = url;
                tab.title = title || this.#extractTitleFromUrl(url);
                // App-side history is minimal, webview is source of truth for nav state
                tab.history = [url];
                tab.historyIndex = 0;
                if (tabId === this.#activeTabId) {
                    if (this.#ui.addressBar) this.#ui.addressBar.value = url;
                    if (this.#ui.navButtons.back) this.#ui.navButtons.back.disabled = !canGoBack;
                    if (this.#ui.navButtons.forward) this.#ui.navButtons.forward.disabled = !canGoForward;
                }
                this.#renderTabs();
            }
            this.#updateNavButtonStates(); // Update nav buttons for all tabs
        });

        this.#webviewEl.addEventListener('tabs-updated-by-list', (e) => {
            const { tabs: updatedTabsFromWebview } = e.detail;
            console.log(`[BrowserApp ${this.#webviewId}] webview event: tabs-updated-by-list`, updatedTabsFromWebview);
            updatedTabsFromWebview.forEach(updatedTabData => {
                let existingTab = this.#tabs.find(t => t.id === updatedTabData.id);
                if (existingTab) {
                    existingTab.url = updatedTabData.url;
                    existingTab.title = updatedTabData.title || this.#extractTitleFromUrl(updatedTabData.url);
                    existingTab.isMock = false;
                } else {
                    this.#tabs.push({
                        id: updatedTabData.id,
                        url: updatedTabData.url,
                        title: updatedTabData.title || this.#extractTitleFromUrl(updatedTabData.url),
                        history: [updatedTabData.url], historyIndex: 0, domElement: null, isMock: false
                    });
                }
            });
            this.#renderTabs();
            this.#updateNavButtonStates();
        });
    }

    // --- Tab Management Methods ---
    async addTab(url = this.#defaultUrl, makeActive = true) {
        let processedUrl = this.#processUserInputToUrl(url);

        let tabId = await this.#webviewEl.createTab(processedUrl);
        let isMockTab = false;

        if (tabId === undefined) {
            console.warn(`[BrowserApp ${this.#webviewId}] Failed to create tab via webview for URL "${processedUrl}". Creating a mock tab.`);
            tabId = `mock-tab-${this.#tabIdCounter++}-${Date.now()}`;
            isMockTab = true;
        }

        const newTab = {
            id: tabId,
            title: isMockTab ? `(Offline) ${this.#extractTitleFromUrl(processedUrl)}` : (this.#extractTitleFromUrl(processedUrl) || "New Tab"),
            url: processedUrl,
            history: processedUrl ? [processedUrl] : [],
            historyIndex: processedUrl ? 0 : -1,
            domElement: null,
            isMock: isMockTab
        };
        this.#tabs.push(newTab);
        // Do not call #renderTabs or #switchTab here directly if makeActive is true,
        // as switchTab will handle it. If not makeActive, then render.

        if (makeActive) {
            this.switchTab(tabId); // switchTab will call render and updateNav
        } else {
            this.#renderTabs(); // Render if adding a background tab
            this.#updateNavButtonStates();
        }
        return newTab;
    }

    closeTab(tabId) {
        const tabIndex = this.#tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) {
            console.warn(`[BrowserApp ${this.#webviewId}] closeTab: Tab ${tabId} not found in app's list.`);
            return;
        }
        
        const tabToClose = this.#tabs[tabIndex];
        
        if (!tabToClose.isMock) {
            this.#webviewEl.closeTab(tabId); // Inform webview
        }

        this.#tabs.splice(tabIndex, 1);

        if (this.#activeTabId === tabId) {
            this.#activeTabId = null;
            if (this.#tabs.length > 0) {
                const newActiveIndex = Math.max(0, tabIndex - 1);
                this.switchTab(this.#tabs[newActiveIndex].id);
            } else {
                this.addTab(this.#defaultUrl, true);
            }
        } else {
            this.#renderTabs();
            this.#updateNavButtonStates();
        }
    }

    switchTab(tabId) {
        if (!tabId && this.#tabs.length > 0) {
            tabId = this.#tabs[0].id;
        } else if (!tabId && this.#tabs.length === 0) {
            console.warn(`[BrowserApp ${this.#webviewId}] switchTab called with no tabs available.`);
            this.#activeTabId = null;
            if (this.#ui.addressBar) this.#ui.addressBar.value = "";
            this.#renderTabs();
            this.#updateNavButtonStates();
            return;
        }
        
        const tabToActivate = this.#tabs.find(t => t.id === tabId);
        if (!tabToActivate) {
            console.warn(`[BrowserApp ${this.#webviewId}] switchTab: Tab ${tabId} not found. Defaulting if possible.`);
            if (this.#activeTabId && !this.#tabs.find(t => t.id === this.#activeTabId)) this.#activeTabId = null;
            if (this.#tabs.length > 0) {
                this.switchTab(this.#tabs[0].id); // Switch to first available
            } else { // No tabs left at all
                this.addTab(this.#defaultUrl, true); // This will become active
            }
            return;
        }

        // If already active and UI reflects it, only update nav states
        if (this.#activeTabId === tabId && this.#windowEl.querySelector(`.browser-tab[data-tab-id="${tabId}"].active`)) {
            this.#updateNavButtonStates();
            return;
        }

        this.#activeTabId = tabId;

        if (!tabToActivate.isMock) {
            this.#webviewEl.setActiveTab(tabId);
        } else {
            // For mock tabs, tell webview no "real" tab is active, or a specific placeholder.
            // This assumes the iframe can handle setActiveTab(null) or an unknown ID gracefully (e.g., by showing a blank page).
            this.#webviewEl.setActiveTab(null); // Or a designated "blank" tab ID known to the iframe
        }

        if (this.#ui.addressBar) this.#ui.addressBar.value = tabToActivate.url;
        this.#renderTabs();
        this.#updateNavButtonStates();
    }

    // --- Navigation Methods ---
    navigateTo(url, tabId = this.#activeTabId) {
        if (tabId === null && this.#tabs.length === 0) {
            this.addTab(url, true);
            return;
        }
        // If tabId is null but there are tabs, use the current active one, or the first one
        if (tabId === null) {
            tabId = this.#activeTabId || (this.#tabs.length > 0 ? this.#tabs[0].id : null);
            if (!tabId) { // Still no tabId, means no tabs exist.
                this.addTab(url, true);
                return;
            }
            if (!this.#activeTabId) this.switchTab(tabId); // Make it active if nothing was
        }

        const tab = this.#tabs.find(t => t.id === tabId);
        if (!tab) {
            console.warn(`[BrowserApp ${this.#webviewId}] navigateTo: Tab with id ${tabId} not found. Target URL: ${url}`);
            this.addTab(url, true); // Create a new tab for this URL and make it active
            return;
        }

        let fullUrl = this.#processUserInputToUrl(url);
        tab.url = fullUrl; // Update app's tab URL optimistically
        tab.title = this.#extractTitleFromUrl(fullUrl); // Update title optimistically

        if (!tab.isMock) {
            this.#webviewEl.loadURL(fullUrl, tabId);
        } else {
            // For mock tabs, we've updated its URL/title. Re-render.
            // The content won't actually load in the (potentially broken) iframe.
            console.log(`[BrowserApp ${this.#webviewId}] Navigating mock tab ${tabId} to ${fullUrl}. UI updated, no webview load.`);
            if (this.#activeTabId === tabId && this.#ui.addressBar) {
                this.#ui.addressBar.value = fullUrl;
            }
            this.#renderTabs(); // Reflect new URL/title in tab strip
        }
        this.#updateNavButtonStates(); // Update nav buttons based on new (potential) state
    }

    navigateToCurrentAddress() {
        const url = this.#ui.addressBar ? this.#ui.addressBar.value.trim() : "";
        if (url) {
            this.navigateTo(url);
        }
    }

    goBack() {
        const tab = this.#tabs.find(t => t.id === this.#activeTabId);
        if (tab && !tab.isMock) {
            this.#webviewEl.goBack(tab.id);
        } else if (tab && tab.isMock) {
            console.log(`[BrowserApp ${this.#webviewId}] 'goBack' on mock tab ${tab.id} - no action.`);
        }
    }

    goForward() {
        const tab = this.#tabs.find(t => t.id === this.#activeTabId);
        if (tab && !tab.isMock) {
            this.#webviewEl.goForward(tab.id);
        } else if (tab && tab.isMock) {
            console.log(`[BrowserApp ${this.#webviewId}] 'goForward' on mock tab ${tab.id} - no action.`);
        }
    }

    reloadPage() {
        const tab = this.#tabs.find(t => t.id === this.#activeTabId);
        if (tab && !tab.isMock) {
            this.#webviewEl.reload(tab.id);
        } else if (tab && tab.isMock) {
            console.log(`[BrowserApp ${this.#webviewId}] 'reloadPage' on mock tab ${tab.id} - no action.`);
            // Potentially, one could try to "re-create" the mock tab or re-evaluate its URL
        }
    }

    stopLoading() {
        if (this.#activeTabId !== null) {
            const tab = this.#tabs.find(t => t.id === this.#activeTabId);
            if (tab && !tab.isMock) {
                this.#webviewEl.stop(this.#activeTabId);
            } else if (tab && tab.isMock) {
                console.log(`[BrowserApp ${this.#webviewId}] 'stopLoading' on mock tab ${tab.id} - no action.`);
            }
        }
    }

    // --- UI Update Methods ---
    #updateNavButtonStates() {
        const activeAppTab = this.#tabs.find(t => t.id === this.#activeTabId);
        let canGoBack = false;
        let canGoForward = false;
        let isLoading = false;
        let hasUrl = false;

        if (activeAppTab) {
            hasUrl = !!activeAppTab.url && activeAppTab.url !== "about:blank";
            if (!activeAppTab.isMock) {
                const webviewTabState = this.#webviewEl.tabs.find(t => t.id === this.#activeTabId);
                if (webviewTabState) {
                    canGoBack = webviewTabState.canGoBack;
                    canGoForward = webviewTabState.canGoForward;
                    isLoading = webviewTabState.isLoading;
                } else {
                    // Webview doesn't know about this tab yet, or communication failed.
                    // Assume defaults for a newly created tab.
                    canGoBack = false;
                    canGoForward = false;
                    // isLoading might be true if we just called loadURL and haven't heard back.
                    // For simplicity, we'll rely on did-start/stop-loading to set throbber.
                }
            } else { // Mock tab
                canGoBack = false; // Mock tabs don't have real history
                canGoForward = false;
                isLoading = false;
            }
        }

        if (this.#ui.navButtons.back) this.#ui.navButtons.back.disabled = !canGoBack;
        if (this.#ui.navButtons.forward) this.#ui.navButtons.forward.disabled = !canGoForward;
        if (this.#ui.navButtons.reload) this.#ui.navButtons.reload.disabled = !hasUrl; // Can only reload if there's a URL
        if (this.#ui.navButtons.stop) this.#ui.navButtons.stop.disabled = !isLoading; // Only enable stop if webview says it's loading

        // Throbber state is more directly tied to did-start/stop-loading events for active tab
        // but ensure it's off if not loading
        if (!isLoading && this.#ui.throbber) {
             if (this.#throbberStaticSrc && this.#netscape) {
                this.#ui.throbber.src = this.#throbberStaticSrc;
                // Keep displaying static if netscape, hide otherwise
                this.#ui.throbber.style.display = 'inline';
            } else {
                this.#ui.throbber.style.display = 'none';
                this.#ui.throbber.src = '';
            }
        }
    }

    #renderTabs() {
        if (!this.#ui.tabBar) return;
        // Remove only .browser-tab elements, preserving the newTabButton
        this.#ui.tabBar.querySelectorAll('.browser-tab').forEach(el => el.remove());

        this.#tabs.forEach(tabData => {
            const tabEl = document.createElement('div');
            tabEl.className = 'browser-tab';
            tabEl.dataset.tabId = tabData.id;
            if (tabData.isMock) {
                tabEl.classList.add('mock-tab');
                tabEl.title = `(Offline Tab) ${tabData.url}`;
            } else {
                tabEl.title = tabData.url;
            }

            if (tabData.id === this.#activeTabId) {
                tabEl.classList.add('active');
            }

            const titleSpan = document.createElement('span');
            titleSpan.className = 'tab-title';
            let displayTitle = tabData.title || 'New Tab';
            titleSpan.textContent = displayTitle.substring(0, 20) + (displayTitle.length > 20 ? '…' : '');
            tabEl.appendChild(titleSpan);

            const closeBtn = document.createElement('span');
            closeBtn.className = 'tab-close-btn';
            closeBtn.innerHTML = '×'; // Use HTML entity for 'x'
            closeBtn.title = 'Close Tab';
            tabEl.appendChild(closeBtn);

            tabData.domElement = tabEl; // Store reference to DOM element
            // Insert before the new tab button
            if (this.#ui.newTabButton) {
                this.#ui.tabBar.insertBefore(tabEl, this.#ui.newTabButton);
            } else {
                this.#ui.tabBar.appendChild(tabEl); // Fallback if button not found
            }
        });

        // Basic styling for tabs (can be moved to CSS)
        this.#applyBasicTabStyles();
    }

    #applyBasicTabStyles() {
        const styleId = 'browser-app-tab-styles';
        if (document.getElementById(styleId)) return;

        const css = `
            .browser-tab {
                display: inline-flex; /* Use flex for better alignment */
                align-items: center;
                padding: 6px 8px;
                border: 1px solid #ccc;
                border-bottom: none;
                margin-right: -1px; /* Overlap borders */
                background-color: #f0f0f0;
                cursor: pointer;
                font-size: 13px;
                max-width: 150px; /* Prevent very long tabs */
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            }
            .browser-tab:hover {
                background-color: #e0e0e0;
            }
            .browser-tab.active {
                background-color: #ffffff; /* Or your active tab color */
                border-bottom: 1px solid #ffffff; /* Connect with content area */
                position: relative;
                z-index: 1;
            }
            .browser-tab.mock-tab {
                font-style: italic;
                color: #555;
            }
            .tab-title {
                flex-grow: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-right: 8px; /* Space before close button */
            }
            .tab-close-btn {
                margin-left: auto; /* Pushes to the right if tab-title doesn't fill */
                padding: 0 4px;
                border-radius: 3px;
                font-weight: bold;
                line-height: 1; /* Ensure 'x' is centered */
            }
            .tab-close-btn:hover {
                background-color: #d0d0d0;
                color: #333;
            }
        `;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }


    // --- Helpers ---
    #processUserInputToUrl(input) {
        let url = input.trim();
        if (!url) return this.#defaultUrl; // Default to blank if empty

        // Regex for checking if it has a scheme (e.g. http:, ftp:, file:, about:, data:)
        const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(url);
        // Regex for checking if it looks like a domain name or IP (simplified)
        const looksLikeDomainOrIp = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$|^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(url.split('/')[0]); // Check part before first /
        const isLocalhost = /^localhost(:[0-9]+)?(\/.*)?$/i.test(url);

        if (hasScheme) {
            return url; // Already a full URL (or special like about:blank)
        }

        if (looksLikeDomainOrIp || isLocalhost || url.includes('.') || url.includes(':')) { // if it contains . or :, assume it's meant to be http
            return "http://" + url;
        }

        // Otherwise, treat as a search query (e.g., for Google)
        // You can make this configurable
        return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }

    #extractTitleFromUrl(url) {
        if (!url || typeof url !== 'string') return "Untitled";
        if (url === "about:blank") return "Blank Page";
        if (url.startsWith("data:")) return "Data URL";
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol === "file:") {
                const pathParts = parsedUrl.pathname.split('/');
                return pathParts.pop() || pathParts.pop() || "File"; // Get last non-empty part
            }
            let title = parsedUrl.hostname.replace(/^www\./, '');
            if (parsedUrl.pathname !== '/' && parsedUrl.pathname.length > 1) {
                const pathPart = parsedUrl.pathname.split('/').filter(Boolean).pop(); // Get last segment of path
                if (pathPart) title = pathPart + (title ? " - " + title : '');
            }
            return title || "Untitled";
        } catch (e) {
            // If URL parsing fails, return a truncated version of the input or a default
            const simpleTitle = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
            return simpleTitle.length > 30 ? simpleTitle.substring(0, 27) + "..." : (simpleTitle || "Address");
        }
    }
}
