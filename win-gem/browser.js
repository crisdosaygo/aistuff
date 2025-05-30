// browser.js

import { BrowserWebview } from './webview.js';

export class BrowserApp {
    constructor(windowEl, windowInstanceId, webviewId, netscape, appDef) {
        this.netscape = netscape;
        this.appDef = appDef;
        this.windowEl = windowEl;
        this.windowInstanceId = windowInstanceId;
        this.webviewId = webviewId;
        this.webviewEl = this.windowEl.querySelector(`#${this.webviewId}`); // This is <browser-webview>

        this.defaultUrl = "about:blank";
        // Restored Netscape home URL and standard Google for IE-like
        this.homeUrl = netscape ? "" : "https://www.google.com";


        this.throbberAnimatedSrc = !netscape ? "" : "./netscape.gif"; // Ensure this path is correct
        this.throbberStaticSrc = !netscape ? "" : "./netscape-frame.gif"; // Ensure this path is correct

        this.ui = {
            navButtons: {
                back: this.windowEl.querySelector('[data-action="back"]'),
                forward: this.windowEl.querySelector('[data-action="forward"]'),
                stop: this.windowEl.querySelector('[data-action="stop"]'),
                reload: this.windowEl.querySelector('[data-action="reload"]'),
                home: this.windowEl.querySelector('[data-action="home"]'),
            },
            addressBar: this.windowEl.querySelector('.browser-address-bar'),
            goButton: this.windowEl.querySelector('[data-action="go"]'),
            tabBar: this.windowEl.querySelector('.browser-tab-bar'),
            newTabButton: this.windowEl.querySelector('.browser-new-tab-btn'),
            throbber: this.windowEl.querySelector('.browser-throbber'),
        };

        this._currentAppActiveTabId = null; // Local cache of webview's active tab ID

        this._setupEventListeners();
        // Initial tab and navigation will be handled by 'webview-ready' event
        this.ui.navButtons.stop.disabled = true; // Stop initially disabled
    }

    static generateInitialHTML(webviewId) {
        // Using actual Unicode symbols now. Ensure your HTML file and JS file are UTF-8 encoded.
        // The 'this.netscape' access in a static method is problematic.
        // The alt text for throbber should be determined by the instance's netscape flag.
        // For now, I'll make a generic alt text or remove it from static generation.
        // Let's pass netscape flag to generateInitialHTML if it's needed for static part.
        // Or, decide based on context if this method is always for one type or other.
        // Given the app definitions, this is fine as netscape is passed to constructor later.
        // The `alt` for throbber isn't critical here.
        return `
            <div class="browser-container">
                <div class="browser-toolbar">
                  <div class="browser-nav-buttons">
                    <button data-action="back" title="Back">◄ Back</button>
                    <button data-action="forward" title="Forward">Forward ►</button>
                    <button data-action="stop" title="Stop">✕ Stop</button>
                    <button data-action="reload" title="Reload">↻ Reload</button>
                    <button data-action="home" title="Home">⌂ Home</button>
                    <img src="" alt="Loading" class="browser-throbber" style="display: none;">
                  </div>
                </div>
                <div class="browser-address-toolbar">
                    <label for="address-${webviewId}">Address:</label>
                    <input type="text" id="address-${webviewId}" class="browser-address-bar" value="">
                    <button data-action="go">Go</button>
                </div>
                <div class="browser-tab-bar">
                    <button class="browser-new-tab-btn" title="New Tab">+</button>
                </div>
                <browser-webview id="${webviewId}" style="flex-grow: 1; background: #fff; border: 1px solid grey; min-height: 100px;">
                    <!-- Content will be managed by BrowserWebview component -->
                </browser-webview>
            </div>
        `;
    }

    _setupEventListeners() {
        this.ui.navButtons.back.addEventListener('click', () => this.goBack());
        this.ui.navButtons.forward.addEventListener('click', () => this.goForward());
        this.ui.navButtons.stop.addEventListener('click', () => this.stopLoading());
        this.ui.navButtons.reload.addEventListener('click', () => this.reloadPage());
        this.ui.navButtons.home.addEventListener('click', () => this.navigateTo(this.homeUrl));

        this.ui.addressBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.navigateToCurrentAddress();
        });
        this.ui.goButton.addEventListener('click', () => this.navigateToCurrentAddress());
        this.ui.newTabButton.addEventListener('click', () => this.addTab(this.defaultUrl, true));

        this.ui.tabBar.addEventListener('click', (e) => {
            const tabElement = e.target.closest('.browser-tab');
            if (!tabElement) return;
            const tabId = tabElement.dataset.tabId; // Tab IDs are strings from webview
            if (e.target.classList.contains('tab-close-btn')) {
                this.closeTab(tabId);
            } else {
                this.switchTab(tabId);
            }
        });

        // Listen to events from <browser-webview>
        this.webviewEl.addEventListener('webview-ready', (e) => this._handleWebviewReady(e.detail));
        this.webviewEl.addEventListener('tab-created', (e) => this._handleTabCreated(e.detail));
        this.webviewEl.addEventListener('tab-closed', (e) => this._handleTabClosed(e.detail));
        this.webviewEl.addEventListener('active-tab-changed', (e) => this._handleActiveTabChanged(e.detail));
        this.webviewEl.addEventListener('did-start-loading', (e) => this._handleDidStartLoading(e.detail));
        this.webviewEl.addEventListener('did-stop-loading', (e) => this._handleDidStopLoading(e.detail));
        this.webviewEl.addEventListener('did-navigate', (e) => this._handleDidNavigate(e.detail));
    }

    // --- Event Handlers for BrowserWebview Events ---
    _handleWebviewReady(detail) { // detail: { tabs, activeTabId }
        console.log(`[BrowserApp ${this.webviewId}] Webview ready:`, detail);
        this._currentAppActiveTabId = detail.activeTabId;
        this._renderTabs();
        
        const activeTab = this.webviewEl.tabs.find(t => t.id === this._currentAppActiveTabId);
        if (activeTab) {
            this.ui.addressBar.value = activeTab.url;
            const windowTitleBar = this.windowEl.querySelector('.window-title');
            const baseTitle = this.netscape ? (this.appDef.title || 'Netscape Navigator') 
                                           : (this.appDef.title || 'Internet Explorer');
            if(windowTitleBar) windowTitleBar.textContent = `${activeTab.title} - ${baseTitle}`;

            if (activeTab.url === 'about:blank' || activeTab.url === '' || activeTab.url === 'about:error') {
                if (activeTab.url !== this.defaultUrl && activeTab.url !== this.homeUrl) {
                     this.navigateTo(this.homeUrl, this._currentAppActiveTabId); // Navigate to home on first blank tab
                }
            }
        } else if (this.webviewEl.tabs.length === 0) {
            this.addTab(this.homeUrl, true); // Open home URL if no tabs
        }
        this._updateNavButtonStates();
    }

    _handleTabCreated(detail) { // detail: { tabId, data: {url, title} }
        console.log(`[BrowserApp ${this.webviewId}] Tab created in webview:`, detail);
        this._renderTabs();
    }

    _handleTabClosed(detail) { // detail: { tabId }
        console.log(`[BrowserApp ${this.webviewId}] Tab closed in webview:`, detail.tabId);
        this._renderTabs(); 
        if (this.webviewEl.tabs.length === 0) {
            this.addTab(this.defaultUrl, true);
        }
        this._updateNavButtonStates();
    }

    _handleActiveTabChanged(detail) { // detail: { tabId, url, title }
        console.log(`[BrowserApp ${this.webviewId}] Active tab changed in webview:`, detail);
        this._currentAppActiveTabId = detail.tabId;
        this.ui.addressBar.value = detail.url || "";
        this._renderTabs();
        this._updateNavButtonStates();
        
        const windowTitleBar = this.windowEl.querySelector('.window-title');
        if(windowTitleBar) {
            const baseTitle = this.netscape ? (this.appDef.title || 'Netscape Navigator') 
                                           : (this.appDef.title || 'Internet Explorer');
            if (detail.title) {
                windowTitleBar.textContent = `${detail.title} - ${baseTitle}`;
            } else {
                windowTitleBar.textContent = baseTitle;
            }
        }
    }

    _handleDidStartLoading(detail) { // detail: { tabId, url }
        if (detail.tabId === this._currentAppActiveTabId) {
            console.log(`[BrowserApp ${this.webviewId}] Active tab started loading:`, detail.url);
            this.ui.navButtons.stop.disabled = false;
            if (this.ui.throbber && this.netscape) {
                this.ui.throbber.src = this.throbberAnimatedSrc;
                this.ui.throbber.style.display = 'inline'; // Or 'block' depending on layout
            }
        }
        const tabToUpdate = this.webviewEl.tabs.find(t => t.id === detail.tabId);
        if (tabToUpdate) tabToUpdate.loading = true; // Ensure internal model reflects loading
        this._renderTabs(); // Update loading indicator on tab
    }

    _handleDidStopLoading(detail) { // detail: { tabId, url }
        if (detail.tabId === this._currentAppActiveTabId) {
            console.log(`[BrowserApp ${this.webviewId}] Active tab stopped loading:`, detail.url);
            this.ui.navButtons.stop.disabled = true;
            if (this.ui.throbber) {
                 if (this.throbberStaticSrc && this.netscape) {
                    this.ui.throbber.src = this.throbberStaticSrc;
                    // Keep display: 'inline' or 'block' if using a static image
                } else {
                    this.ui.throbber.style.display = 'none';
                    this.ui.throbber.src = '';
                }
            }
        }
        const tabToUpdate = this.webviewEl.tabs.find(t => t.id === detail.tabId);
        if (tabToUpdate) tabToUpdate.loading = false;
        this._renderTabs(); // Update loading indicator on tab
    }

    _handleDidNavigate(detail) { // detail: { tabId, url, title, canGoBack, canGoForward }
        console.log(`[BrowserApp ${this.webviewId}] Navigation completed in webview:`, detail);
         const tabToUpdate = this.webviewEl.tabs.find(t => t.id === detail.tabId);
         if (tabToUpdate) { // Update tab data based on navigation
             tabToUpdate.url = detail.url;
             tabToUpdate.title = detail.title;
             tabToUpdate.canGoBack = detail.canGoBack;
             tabToUpdate.canGoForward = detail.canGoForward;
             tabToUpdate.loading = false; // Navigation implies loading stopped
         }

        if (detail.tabId === this._currentAppActiveTabId) {
            this.ui.addressBar.value = detail.url;
            this._updateNavButtonStates();
            const windowTitleBar = this.windowEl.querySelector('.window-title');
            if(windowTitleBar) {
              const baseTitle = this.netscape ? (this.appDef.title || 'Netscape Navigator') 
                                             : (this.appDef.title || 'Internet Explorer');
                windowTitleBar.textContent = `${detail.title} - ${baseTitle}`;
            }
        }
        this._renderTabs(); // Update tab title and loading state
    }

    // --- Tab Management API ---
    async addTab(url = this.defaultUrl, makeActive = true) {
        console.log(`[BrowserApp ${this.webviewId}] Requesting new tab for URL: ${url}`);
        const newTabId = await this.webviewEl.createTab(this._prepareUrl(url));
        if (makeActive && newTabId) {
            await this.webviewEl.setActiveTab(newTabId);
        }
    }

    async closeTab(tabId) {
        console.log(`[BrowserApp ${this.webviewId}] Requesting close tab: ${tabId}`);
        await this.webviewEl.closeTab(tabId);
    }

    async switchTab(tabId) {
        if (this._currentAppActiveTabId === tabId) return;
        console.log(`[BrowserApp ${this.webviewId}] Requesting switch to tab: ${tabId}`);
        await this.webviewEl.setActiveTab(tabId);
    }

    _renderTabs() {
        this.ui.tabBar.querySelectorAll('.browser-tab').forEach(el => el.remove());
        const tabsFromWebview = this.webviewEl.tabs;
        const currentActiveIdInWebview = this.webviewEl.activeTabId;

        tabsFromWebview.forEach(tabData => {
            const tabEl = document.createElement('div');
            tabEl.className = 'browser-tab';
            tabEl.dataset.tabId = tabData.id;
            if (tabData.id === currentActiveIdInWebview) {
                tabEl.classList.add('active');
            }

            let titleText = tabData.title || (tabData.loading ? 'Loading...' : 'New Tab');
            if (tabData.loading && !titleText.toLowerCase().includes('loading')) {
                 titleText = `Loading ${tabData.url ? new URL(tabData.url).hostname : '...'}`;
            } else if (tabData.loading && !tabData.title) { // Explicitly show loading if no title and loading
                titleText = 'Loading...';
            }


            const titleSpan = document.createElement('span');
            titleSpan.className = 'tab-title-text';
            titleSpan.textContent = titleText.substring(0, 20) + (titleText.length > 20 ? '…' : ''); // Corrected ellipsis
            
            if (tabData.loading) {
                // Maybe add a spinner or distinct style instead of prepending text
                // For now, ensure title reflects loading state if not already obvious
                titleSpan.style.fontStyle = "italic";
            }
            tabEl.appendChild(titleSpan);

            const closeBtn = document.createElement('span');
            closeBtn.className = 'tab-close-btn';
            closeBtn.innerHTML = '✕'; // Corrected close symbol
            closeBtn.title = 'Close Tab';
            tabEl.appendChild(closeBtn);

            this.ui.tabBar.insertBefore(tabEl, this.ui.newTabButton);
        });
    }

    // --- Navigation API ---
    navigateToCurrentAddress() {
        const url = this.ui.addressBar.value.trim();
        this.navigateTo(url);
    }

    async navigateTo(url, tabIdToNavigate) {
        const targetTabId = tabIdToNavigate !== undefined ? tabIdToNavigate : this._currentAppActiveTabId;
        const fullUrl = this._prepareUrl(url);

        if (targetTabId === null) { // No active tab, or no tabs at all
            if (this.webviewEl.tabs.length === 0) {
                console.log(`[BrowserApp ${this.webviewId}] No tabs, creating new one for navigation to ${fullUrl}`);
                await this.addTab(fullUrl, true); // addTab creates, makes active, and webview loads
            } else {
                // Tabs exist, but none is marked as active in BrowserApp's cache.
                // This state should ideally be corrected by webview events.
                // Fallback: try to use webview's current active tab or the first tab.
                const webviewActiveId = this.webviewEl.activeTabId || (this.webviewEl.tabs[0]?.id);
                if (webviewActiveId) {
                    console.warn(`[BrowserApp ${this.webviewId}] App's active tabId null, using webview's active/first tab: ${webviewActiveId} for ${fullUrl}`);
                    await this.webviewEl.setActiveTab(webviewActiveId); // Ensure it's marked active.
                    // active-tab-changed event should update _currentAppActiveTabId.
                    await this.webviewEl.loadURL(fullUrl, webviewActiveId);
                } else { // Should be extremely rare if addTab on empty works.
                     console.error(`[BrowserApp ${this.webviewId}] Critical: No target tab for navigation and webview reports no tabs/active tab.`);
                     await this.addTab(fullUrl, true); // Last resort
                }
            }
            return;
        }
        
        console.log(`[BrowserApp ${this.webviewId}] Requesting navigation for tab ${targetTabId} to: ${fullUrl}`);
        await this.webviewEl.loadURL(fullUrl, targetTabId);
    }

    _prepareUrl(url) {
        let fullUrl = url.trim();
        if (!fullUrl) fullUrl = this.defaultUrl; // Default to about:blank if empty
        // Basic protocol check, add http if missing for non-special URLs
        if (!/^[a-z]+:\/\//i.test(fullUrl) && !fullUrl.startsWith("about:") && !fullUrl.startsWith("data:")) {
            fullUrl = "http://" + fullUrl;
        }
        return fullUrl;
    }

    async goBack() {
        if (this._currentAppActiveTabId) {
            await this.webviewEl.goBack(this._currentAppActiveTabId);
        }
    }

    async goForward() {
        if (this._currentAppActiveTabId) {
            await this.webviewEl.goForward(this._currentAppActiveTabId);
        }
    }

    async reloadPage() {
        if (this._currentAppActiveTabId) {
            await this.webviewEl.reload(this._currentAppActiveTabId);
        }
    }

    async stopLoading() {
        if (this._currentAppActiveTabId) {
            await this.webviewEl.stop(this._currentAppActiveTabId);
        }
    }

    _updateNavButtonStates() {
        const activeTab = this.webviewEl.tabs.find(t => t.id === this._currentAppActiveTabId);
        if (activeTab) {
            this.ui.navButtons.back.disabled = !activeTab.canGoBack;
            this.ui.navButtons.forward.disabled = !activeTab.canGoForward;
            this.ui.navButtons.reload.disabled = !activeTab.url || activeTab.url === 'about:blank' || activeTab.loading;
            this.ui.navButtons.stop.disabled = !activeTab.loading; // Stop enabled only if loading
        } else { // No active tab
            this.ui.navButtons.back.disabled = true;
            this.ui.navButtons.forward.disabled = true;
            this.ui.navButtons.reload.disabled = true;
            this.ui.navButtons.stop.disabled = true;
        }
    }
}

