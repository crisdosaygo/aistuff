// browser.js
// Consumes <browserbox-webview> API directly — no wrapper layer.

import './browserbox-webview.js';

export class BrowserApp {
    // Internal view-model for tabs (sync state for UI rendering)
    #tabs = new Map();
    #tabOrder = [];
    #activeTabId = null;
    #isReady = false;

    constructor(windowEl, windowInstanceId, webviewId, netscapeFlag_unused, appDef) {
        this.netscape = false; 
        this.appDef = appDef;
        this.windowEl = windowEl;
        this.windowInstanceId = windowInstanceId;
        this.webviewId = webviewId;
        // Query for <browserbox-webview> element directly
        this.webviewEl = this.windowEl.querySelector(`#${this.webviewId}`);

        this.defaultUrl = "about:blank";
        this.homeUrl = "about:blank"; 

        this.throbberAnimatedSrc = "./netscape.gif";
        this.throbberStaticSrc = "./netscape-frame.gif";
        this.defaultFavicon = "./template_world-4.png";

        this.ui = {
            menuBar: {
                file: this.windowEl.querySelector('[data-menu-item="file"]'),
                edit: this.windowEl.querySelector('[data-menu-item="edit"]'),
                view: this.windowEl.querySelector('[data-menu-item="view"]'),
                favorites: this.windowEl.querySelector('[data-menu-item="favorites"]'),
                tools: this.windowEl.querySelector('[data-menu-item="tools"]'),
                help: this.windowEl.querySelector('[data-menu-item="help"]'),
            },
            navButtons: {
                back: this.windowEl.querySelector('.browser-nav-button-back'),
                forward: this.windowEl.querySelector('.browser-nav-button-forward'),
                stop: this.windowEl.querySelector('.browser-nav-button-stop'),
                refresh: this.windowEl.querySelector('.browser-nav-button-refresh'),
                home: this.windowEl.querySelector('.browser-nav-button-home'),
                search: this.windowEl.querySelector('.browser-nav-button-search'),
                favorites: this.windowEl.querySelector('.browser-nav-button-favorites'),
                history: this.windowEl.querySelector('.browser-nav-button-history')
            },
            addressBar: this.windowEl.querySelector('.browser-address-bar-input'),
            goButton: this.windowEl.querySelector('.browser-address-bar-go'),
            linksButton: this.windowEl.querySelector('.browser-address-bar-links'),
            throbber: this.windowEl.querySelector('.browser-throbber-netscape'),
            tabBar: this.windowEl.querySelector('.browser-tab-bar-ie'),
            newTabButton: this.windowEl.querySelector('.browser-new-tab-btn-ie'),
            browserContent: this.windowEl.querySelector('.browser-content'),
            statusBar: {
                statusIcon: this.windowEl.querySelector('.status-bar-icon-main img'),
                statusText: this.windowEl.querySelector('.status-bar-text-main'),
                zoneIcon: this.windowEl.querySelector('.status-bar-icon-zone img'),
                zoneText: this.windowEl.querySelector('.status-bar-zone-text')
            }
        };

        this._setupEventListeners();
        
        if (this.ui.navButtons.stop) this.ui.navButtons.stop.style.display = 'none';
        if (this.ui.navButtons.refresh) this.ui.navButtons.refresh.style.display = 'flex';
        
        if (this.ui.throbber) {
            this.ui.throbber.src = this.throbberStaticSrc;
            this.ui.throbber.style.display = 'block'; 
        }
        
        this._updateNavButtonStates();
        this.setStatusBarText("Done", "./channels-4.png");
        if (this.ui.statusBar.zoneIcon) this.ui.statusBar.zoneIcon.src = './internet_connection_wiz-0.png';
        if (this.ui.statusBar.zoneText) this.ui.statusBar.zoneText.textContent = "BrowserBox";
    }

    static generateInitialHTML(webviewId, launchData = {}) {
        // Underlined characters for menu items
        const menuItems = [
            { label: "<u>F</u>ile", action: "file" },
            { label: "<u>E</u>dit", action: "edit" },
            { label: "<u>V</u>iew", action: "view" },
            { label: "F<u>a</u>vorites", action: "favorites" }, // 'a' is often underlined in Favorites
            { label: "<u>T</u>ools", action: "tools" },
            { label: "<u>H</u>elp", action: "help" }
        ];
        const mainButtonLabels = {
            back: "Back", forward: "Forward", stop: "Stop", refresh: "Refresh",
            home: "Home", search: "Search", favorites: "Favorites", history: "History"
        };
        const rawLoginLink = typeof launchData?.loginLink === 'string' ? launchData.loginLink : '';
        const sanitizedLoginLink = rawLoginLink
            .replaceAll('&', '&amp;')
            .replaceAll('"', '&quot;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;');
        const loginLinkAttr = sanitizedLoginLink ? ` login-link="${sanitizedLoginLink}"` : '';

        return `
            <div class="browser-container-ie">
                <div class="browser-toolbars-wrapper-ie">
                    <div class="browser-menu-bar-ie">
                        ${menuItems.map(item => `<button data-menu-item="${item.action}" disabled>${item.label}</button>`).join('')}
                    </div>
                    <div class="browser-main-toolbar-ie">
                        <div class="browser-nav-buttons-ie">
                            <button class="browser-nav-button-back" data-action="back" title="Back"><span class="icon-area"></span><span>${mainButtonLabels.back}</span></button>
                            <button class="browser-nav-button-forward" data-action="forward" title="Forward"><span class="icon-area"></span><span>${mainButtonLabels.forward}</span></button>
                            <span class="toolbar-separator"></span>
                            <button class="browser-nav-button-stop" data-action="stop" title="Stop"><span class="icon-area"></span><span>${mainButtonLabels.stop}</span></button>
                            <button class="browser-nav-button-refresh" data-action="refresh" title="Refresh"><span class="icon-area"></span><span>${mainButtonLabels.refresh}</span></button>
                            <span class="toolbar-separator"></span>
                            <button class="browser-nav-button-home" data-action="home" title="Home"><span class="icon-area"></span><span>${mainButtonLabels.home}</span></button>
                            <span class="toolbar-separator"></span>
                            <button class="browser-nav-button-search" data-action="search" title="Search"><span class="icon-area"></span><span>${mainButtonLabels.search}</span></button>
                            <button class="browser-nav-button-favorites" data-action="favorites" title="Favorites"><span class="icon-area"></span><span>${mainButtonLabels.favorites}</span></button>
                            <button class="browser-nav-button-history" data-action="history" title="History"><span class="icon-area"></span><span>${mainButtonLabels.history}</span></button>
                        </div>
                        <img src="" alt="Activity" class="browser-throbber-netscape"> 
                    </div>
                    <div class="browser-address-toolbar-ie">
                        <label for="address-${webviewId}" class="browser-address-bar-label">Address</label>
                        <input type="text" id="address-${webviewId}" class="browser-address-bar-input" value="">
                        <button class="browser-address-bar-go" data-action="go" title="Go to address">
                            <span class="icon-area icon-go"></span>Go
                        </button>
                        <button class="browser-address-bar-links" data-action="links" disabled>Links »</button>
                    </div>
                    <div class="browser-tab-bar-ie">
                        <button class="browser-new-tab-btn-ie" title="New Tab">+</button>
                    </div>
                </div>
                <div class="browser-content">
                    <browserbox-webview id="${webviewId}"${loginLinkAttr}
                        style="display:block; width:100%; height:100%;"
                        request-timeout-ms="45000">
                    </browserbox-webview>
                </div>
                <div class="browser-status-bar-ie">
                    <div class="status-bar-panel status-bar-main">
                        <img src="./channels-4.png" alt="" class="status-bar-icon-main"/>
                        <span class="status-bar-text-main">Done</span>
                    </div>
                    <div class="status-bar-panel status-bar-short"></div>
                    <div class="status-bar-panel status-bar-short"></div>
                    <div class="status-bar-panel status-bar-zone">
                        <img src="./internet_connection_wiz-0.png" alt="Zone" class="status-bar-icon-zone"/>
                        <span class="status-bar-zone-text"></span>
                    </div>
                </div>
            </div>
        `;
    }

    _setupEventListeners() {
        // Nav button handlers — call BBX API directly
        this.ui.navButtons.back.addEventListener('click', () => this.goBack());
        this.ui.navButtons.forward.addEventListener('click', () => this.goForward());
        this.ui.navButtons.stop.addEventListener('click', () => this.stopLoading());
        this.ui.navButtons.refresh.addEventListener('click', () => this.reloadPage());
        this.ui.navButtons.home.addEventListener('click', () => this.navigateTo(this.homeUrl));
        
        this.ui.navButtons.search.addEventListener('click', () => alert('Search action not implemented.'));
        this.ui.navButtons.favorites.addEventListener('click', () => alert('Favorites action not implemented.'));
        this.ui.navButtons.history.addEventListener('click', () => alert('History action not implemented.'));
        
        if (this.ui.linksButton) {
            this.ui.linksButton.addEventListener('click', () => alert('Links action not implemented.'));
        }

        // Address bar — navigate via BBX submitOmnibox API
        this.ui.addressBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.navigateToCurrentAddress();
        });
        this.ui.goButton.addEventListener('click', () => this.navigateToCurrentAddress());

        // Tab bar click delegation
        if (this.ui.tabBar) {
            this.ui.tabBar.addEventListener('click', (e) => {
                const tabElement = e.target.closest('.browser-tab-ie');
                if (!tabElement) return;
                const tabIndex = parseInt(tabElement.dataset.tabIndex, 10);

                if (e.target.classList.contains('tab-close-btn-ie')) {
                    // Close tab via BBX API
                    this.webviewEl.closeTab(tabIndex);
                } else {
                    // Switch tab via BBX API
                    this.webviewEl.switchToTab(tabIndex);
                }
            });
        }

        // New tab button — create tab via BBX API
        if (this.ui.newTabButton) {
            this.ui.newTabButton.addEventListener('click', () => {
                this.webviewEl.createTab(this.defaultUrl);
            });
        }

        // BBX API events — directly from <browserbox-webview>
        this.webviewEl.addEventListener('ready', () => this._handleReady());
        this.webviewEl.addEventListener('api-ready', (e) => this._handleApiReady(e.detail));
        this.webviewEl.addEventListener('tab-created', (e) => this._handleTabCreated(e.detail));
        this.webviewEl.addEventListener('tab-closed', (e) => this._handleTabClosed(e.detail));
        this.webviewEl.addEventListener('active-tab-changed', (e) => this._handleActiveTabChanged(e.detail));
        this.webviewEl.addEventListener('did-start-loading', (e) => this._handleDidStartLoading(e.detail));
        this.webviewEl.addEventListener('did-stop-loading', (e) => this._handleDidStopLoading(e.detail));
        this.webviewEl.addEventListener('did-navigate', (e) => this._handleDidNavigate(e.detail));
        this.webviewEl.addEventListener('policy-denied', (e) => {
            console.warn('[BrowserApp] Policy denied:', e.detail);
        });
    }

    setStatusBarText(text, iconSrc = null) {
        if (this.ui.statusBar.statusText) {
            this.ui.statusBar.statusText.textContent = text;
        }
        if (iconSrc && this.ui.statusBar.statusIcon) {
            this.ui.statusBar.statusIcon.src = iconSrc;
            this.ui.statusBar.statusIcon.style.display = 'inline';
        } else if (this.ui.statusBar.statusIcon) {
            this.ui.statusBar.statusIcon.style.display = 'none'; // Hide if no icon src
        }
    }
    
    // --- Internal view model helpers ---
    
    #getTab(tabId) {
        return this.#tabs.get(tabId) || null;
    }
    
    #getActiveTab() {
        return this.#activeTabId ? this.#tabs.get(this.#activeTabId) : null;
    }
    
    #upsertTab(detail) {
        const tabId = this.#extractTabId(detail);
        if (!tabId) return null;
        
        const existing = this.#tabs.get(tabId) || {
            id: tabId,
            url: '',
            title: 'New Tab',
            loading: false,
            canGoBack: false,
            canGoForward: false,
            faviconDataURI: '',
        };
        
        const url = typeof detail.url === 'string' ? detail.url : existing.url;
        const title = (typeof detail.title === 'string' && detail.title.length > 0)
            ? detail.title
            : this.#extractTitleFromUrl(url);
        
        const next = {
            ...existing,
            id: tabId,
            url,
            title,
            loading: typeof detail.loading === 'boolean' ? detail.loading : existing.loading,
            canGoBack: typeof detail.canGoBack === 'boolean' ? detail.canGoBack : existing.canGoBack,
            canGoForward: typeof detail.canGoForward === 'boolean' ? detail.canGoForward : existing.canGoForward,
            faviconDataURI: (typeof detail.faviconDataURI === 'string' && detail.faviconDataURI.length > 0)
                ? detail.faviconDataURI
                : existing.faviconDataURI,
        };
        
        if (!this.#tabOrder.includes(tabId)) {
            this.#tabOrder.push(tabId);
        }
        
        this.#tabs.set(tabId, next);
        return next;
    }
    
    #extractTabId(detail) {
        if (!detail || typeof detail !== 'object') return null;
        const candidates = [detail.id, detail.tabId, detail.targetId];
        for (const c of candidates) {
            if (typeof c === 'string' && c.length > 0) return c;
        }
        if (Number.isInteger(detail.index) && detail.index >= 0) {
            return this.#tabOrder[detail.index] || null;
        }
        return null;
    }
    
    #extractTitleFromUrl(url) {
        if (!url || typeof url !== 'string') return 'Untitled';
        if (url === 'about:blank') return 'Blank Page';
        try {
            return new URL(url).hostname || 'Untitled';
        } catch {
            return url.substring(0, 20);
        }
    }

    // --- BBX API event handlers ---
    
    _handleReady() {
        console.log(`[BrowserApp ${this.webviewId}] BBX ready event`);
    }
    
    async _handleApiReady(detail) {
        console.log(`[BrowserApp ${this.webviewId}] BBX api-ready:`, detail);
        this.#isReady = true;
        
        // Sync tabs from BBX API
        await this.#syncTabsFromApi();
        this._renderTabs();
        this._updateNavButtonStates();
        
        const activeTab = this.#getActiveTab();
        if (activeTab) {
            this.ui.addressBar.value = activeTab.url || '';
            this._updateWindowTitle(activeTab.title);
        }
        this.setStatusBarText("Done", "./channels-4.png");
    }
    
    async #syncTabsFromApi() {
        try {
            const apiTabs = await this.webviewEl.getTabs();
            const activeIndex = await this.webviewEl.getActiveTabIndex();
            
            this.#tabs.clear();
            this.#tabOrder = [];
            
            for (const tab of (Array.isArray(apiTabs) ? apiTabs : [])) {
                const tabId = tab.id || tab.targetId || `tab-${tab.index}`;
                this.#tabOrder.push(tabId);
                this.#tabs.set(tabId, {
                    id: tabId,
                    url: tab.url || '',
                    title: tab.title || this.#extractTitleFromUrl(tab.url),
                    loading: false,
                    canGoBack: tab.canGoBack || false,
                    canGoForward: tab.canGoForward || false,
                    faviconDataURI: tab.faviconDataURI || '',
                });
            }
            
            if (Number.isInteger(activeIndex) && activeIndex >= 0 && activeIndex < this.#tabOrder.length) {
                this.#activeTabId = this.#tabOrder[activeIndex];
            } else {
                this.#activeTabId = this.#tabOrder[0] || null;
            }
        } catch (err) {
            console.warn('[BrowserApp] Failed to sync tabs:', err);
        }
    }

    _handleTabCreated(detail) {
        console.log(`[BrowserApp ${this.webviewId}] Tab created:`, detail);
        this.#upsertTab(detail);
        this._renderTabs();
    }

    _handleTabClosed(detail) {
        const tabId = this.#extractTabId(detail);
        console.log(`[BrowserApp ${this.webviewId}] Tab closed:`, tabId);
        
        if (tabId) {
            this.#tabs.delete(tabId);
            this.#tabOrder = this.#tabOrder.filter(id => id !== tabId);
            
            if (this.#activeTabId === tabId) {
                this.#activeTabId = this.#tabOrder[0] || null;
            }
        }
        
        this._renderTabs();
        
        // If no tabs remain, create a new blank tab
        if (this.#tabOrder.length === 0) {
            this.webviewEl.createTab(this.defaultUrl);
        }
    }

    _handleActiveTabChanged(detail) {
        console.log(`[BrowserApp ${this.webviewId}] Active tab changed:`, detail);
        const tab = this.#upsertTab(detail);
        const tabId = tab?.id || this.#extractTabId(detail);
        this.#activeTabId = tabId;
        
        this.ui.addressBar.value = detail.url || tab?.url || '';
        this._updateWindowTitle(detail.title || tab?.title);
        this._renderTabs();
        this._updateNavButtonStates();
        this.setStatusBarText("Done", "./channels-4.png");
    }

    _handleDidStartLoading(detail) {
        const tabId = this.#extractTabId(detail);
        console.log(`[BrowserApp ${this.webviewId}] Loading started:`, tabId);
        
        const tab = this.#tabs.get(tabId);
        if (tab) {
            tab.loading = true;
            if (detail.url) tab.url = detail.url;
        }
        
        if (tabId === this.#activeTabId) {
            if (this.ui.navButtons.stop) this.ui.navButtons.stop.style.display = 'flex';
            if (this.ui.navButtons.refresh) this.ui.navButtons.refresh.style.display = 'none';
            if (this.ui.throbber) this.ui.throbber.src = this.throbberAnimatedSrc;
            this.setStatusBarText(`Loading ${detail.url || '...'}`, "./channels-4.png");
        }
        
        this._renderTabs();
        this._updateNavButtonStates();
    }

    _handleDidStopLoading(detail) {
        const tabId = this.#extractTabId(detail);
        console.log(`[BrowserApp ${this.webviewId}] Loading stopped:`, tabId);
        
        const tab = this.#tabs.get(tabId);
        if (tab) tab.loading = false;
        
        if (tabId === this.#activeTabId) {
            if (this.ui.navButtons.stop) this.ui.navButtons.stop.style.display = 'none';
            if (this.ui.navButtons.refresh) this.ui.navButtons.refresh.style.display = 'flex';
            if (this.ui.throbber) this.ui.throbber.src = this.throbberStaticSrc;
            this.setStatusBarText("Done", "./channels-4.png");
        }
        
        this._renderTabs();
        this._updateNavButtonStates();
    }

    _handleDidNavigate(detail) {
        console.log(`[BrowserApp ${this.webviewId}] Navigation completed:`, detail);
        const tab = this.#upsertTab({ ...detail, loading: false });
        
        if (tab && tab.id === this.#activeTabId) {
            this.ui.addressBar.value = tab.url;
            this._updateWindowTitle(tab.title);
            this._updateNavButtonStates();
        }
        
        this._renderTabs();
        this.setStatusBarText("Done", "./channels-4.png");
    }

    _updateNavButtonStates() {
        const activeTab = this.#getActiveTab();
        
        const allNavButtons = [
            this.ui.navButtons.back, this.ui.navButtons.forward,
            this.ui.navButtons.refresh, this.ui.navButtons.stop,
            this.ui.navButtons.home, this.ui.navButtons.search,
            this.ui.navButtons.favorites, this.ui.navButtons.history
        ];

        if (activeTab) {
            this.ui.navButtons.back.disabled = !activeTab.canGoBack;
            this.ui.navButtons.forward.disabled = !activeTab.canGoForward;
            
            const isLoading = activeTab.loading;
            const isBlankOrError = !activeTab.url || activeTab.url === 'about:blank' || activeTab.url === 'about:error';

            if (this.ui.navButtons.refresh) {
                this.ui.navButtons.refresh.disabled = isBlankOrError || isLoading;
            }
            if (this.ui.navButtons.stop) {
                this.ui.navButtons.stop.disabled = !isLoading;
            }
        } else { 
            allNavButtons.forEach(btn => btn && (btn.disabled = true));
            if (this.ui.navButtons.stop) this.ui.navButtons.stop.style.display = 'none';
            if (this.ui.navButtons.refresh) this.ui.navButtons.refresh.style.display = 'flex';
        }

        if (this.ui.navButtons.home) this.ui.navButtons.home.disabled = false;
        if (this.ui.navButtons.search) this.ui.navButtons.search.disabled = false;
        if (this.ui.navButtons.favorites) this.ui.navButtons.favorites.disabled = false;
        if (this.ui.navButtons.history) this.ui.navButtons.history.disabled = false;
    }
    
    _updateWindowTitle(title) {
        const windowTitleBar = this.windowEl.querySelector('.window-title');
        if (windowTitleBar) {
            const baseTitle = this.appDef.title || 'Internet Browser';
            windowTitleBar.textContent = `${title || 'Blank Page'} - ${baseTitle}`;
        }
    }
    }

    _handleTabCreated(detail) { /* ... (same as previous complete version, but now calls _renderTabs) ... */
        console.log(`[BrowserApp ${this.webviewId}] Tab created in webview:`, detail);
        this._renderTabs();
    }

    _handleTabClosed(detail) { /* ... (same as previous complete version, but now calls _renderTabs) ... */
        console.log(`[BrowserApp ${this.webviewId}] Tab closed in webview:`, detail.tabId);
        this._renderTabs(); 
        if (this.webviewEl.tabs.length === 0) {
            this.addTab(this.defaultUrl, true);
        }
    }

    _handleActiveTabChanged(detail) { /* ... (same as previous complete version, but now calls _renderTabs) ... */
        console.log(`[BrowserApp ${this.webviewId}] Active tab changed in webview:`, detail);
        this._currentAppActiveTabId = detail.tabId;
        this.ui.addressBar.value = detail.url || "";
        this._renderTabs();
        this._updateNavButtonStates();
        
        const windowTitleBar = this.windowEl.querySelector('.window-title');
        if(windowTitleBar) {
            const baseTitle = this.appDef.title || 'Internet Browser';
            if (detail.title) {
                windowTitleBar.textContent = `${detail.title} - ${baseTitle}`;
            } else {
                 windowTitleBar.textContent = `${detail.url === "about:blank" ? "Blank Page" : "Untitled"} - ${baseTitle}`;
            }
        }
        this.setStatusBarText("Done", "./channels-4.png"); 
    }
    
    _handleDidNavigate(detail) { /* ... (same as previous complete version, but now calls _renderTabs) ... */
        console.log(`[BrowserApp ${this.webviewId}] Navigation completed in webview:`, detail);
         const tabToUpdate = this.webviewEl.tabs.find(t => t.id === detail.tabId);
         if (tabToUpdate) {
             tabToUpdate.url = detail.url;
             tabToUpdate.title = detail.title;
             tabToUpdate.favicon = detail.favicon; // Capture favicon
             tabToUpdate.canGoBack = detail.canGoBack;
             tabToUpdate.canGoForward = detail.canGoForward;
             tabToUpdate.loading = false;
         }

        if (detail.tabId === this._currentAppActiveTabId) {
            this.ui.addressBar.value = detail.url;
            this._updateNavButtonStates(); 
            const windowTitleBar = this.windowEl.querySelector('.window-title');
            if(windowTitleBar) {
              const baseTitle = this.appDef.title || 'Internet Browser';
                windowTitleBar.textContent = `${detail.title || (detail.url === "about:blank" ? "Blank Page" : "Untitled")} - ${baseTitle}`;
            }
        }
        this._renderTabs();
        this.setStatusBarText("Done", "./channels-4.png");
    }

    async addTab(url = this.defaultUrl, makeActive = true) { /* ... (same as previous complete version) ... */
        console.log(`[BrowserApp ${this.webviewId}] Requesting new tab for URL: ${url}`);
        const newTabId = await this.webviewEl.createTab(this._prepareUrl(url));
        if (makeActive && newTabId) {
            await this.webviewEl.setActiveTab(newTabId);
        }
        // _renderTabs will be called by _handleTabCreated or _handleActiveTabChanged
    }

    async closeTab(tabId) { /* ... (same as previous complete version) ... */
        console.log(`[BrowserApp ${this.webviewId}] Requesting close tab: ${tabId}`);
        await this.webviewEl.closeTab(tabId);
        // _renderTabs will be called by _handleTabClosed or _handleActiveTabChanged
    }

    async switchTab(tabId) { /* ... (same as previous complete version) ... */
        if (this._currentAppActiveTabId === tabId) return;
        console.log(`[BrowserApp ${this.webviewId}] Requesting switch to tab: ${tabId}`);
        await this.webviewEl.setActiveTab(tabId);
        // _renderTabs will be called by _handleActiveTabChanged
    }

    _renderTabs() {
        if (!this.ui.tabBar) return; // Guard if tab bar isn't present
        this.ui.tabBar.querySelectorAll('.browser-tab-ie').forEach(el => el.remove());
        
        const tabsFromWebview = this.webviewEl.tabs;
        const currentActiveIdInWebview = this.webviewEl.activeTabId;

        tabsFromWebview.forEach(tabData => {
            const tabEl = document.createElement('div');
            tabEl.className = 'browser-tab-ie';
            tabEl.dataset.tabId = tabData.id;
            if (tabData.id === currentActiveIdInWebview) {
                tabEl.classList.add('active');
            }

            const faviconContainer = document.createElement('div');
            faviconContainer.className = 'tab-favicon-ie';
            const faviconImg = document.createElement('img');
            faviconImg.src = tabData.favicon || this.defaultFavicon;
            faviconImg.alt = '';
            faviconContainer.appendChild(faviconImg);
            tabEl.appendChild(faviconContainer);

            let titleText = tabData.title || (tabData.loading ? 'Loading...' : (tabData.url === "about:blank" ? "Blank Page" : "New Tab"));
            if (tabData.loading && !titleText.toLowerCase().includes('loading')) {
                 titleText = `Loading ${tabData.url && !tabData.url.startsWith("about:") ? new URL(tabData.url).hostname : '...'}`;
            } else if (tabData.loading && !tabData.title) {
                titleText = 'Loading...';
            }

            const titleSpan = document.createElement('span');
            titleSpan.className = 'tab-title-text-ie';
            titleSpan.textContent = titleText.substring(0, 20) + (titleText.length > 20 ? '…' : ''); 
            
            if (tabData.loading) {
                titleSpan.style.fontStyle = "italic";
            }
            tabEl.appendChild(titleSpan);

            const closeBtn = document.createElement('span');
            closeBtn.className = 'tab-close-btn-ie';
            closeBtn.innerHTML = '×'; // Using HTML entity for 'x'
            closeBtn.title = 'Close Tab';
            tabEl.appendChild(closeBtn);

            this.ui.tabBar.insertBefore(tabEl, this.ui.newTabButton);
        });
    }
    
    navigateToCurrentAddress() { /* ... (same as previous complete version) ... */ 
        const url = this.ui.addressBar.value.trim();
        this.navigateTo(url);
    }

    async navigateTo(url, tabIdToNavigate) { /* ... (same as previous complete version) ... */ 
        const targetTabId = tabIdToNavigate !== undefined ? tabIdToNavigate : this._currentAppActiveTabId;
        const fullUrl = this._prepareUrl(url);

        if (targetTabId === null && this.webviewEl.tabs.length === 0) {
            await this.addTab(fullUrl, true);
            return;
        } else if (targetTabId === null && this.webviewEl.tabs.length > 0) {
            const activeId = this.webviewEl.activeTabId || this.webviewEl.tabs[0]?.id;
            if (activeId) {
                await this.webviewEl.loadURL(fullUrl, activeId);
            } else { 
                await this.addTab(fullUrl, true); 
            }
            return;
        }
        await this.webviewEl.loadURL(fullUrl, targetTabId);
    }

    _prepareUrl(url) {
        let fullUrl = url.trim();
        if (fullUrl === 'cloud://' || fullUrl === 'bb://') {
             this.webviewEl.enableCloudMode();
             return 'about:blank';
        }
        if (!fullUrl) fullUrl = this.defaultUrl;
        if (!/^[a-z]+:\/\//i.test(fullUrl) && !fullUrl.startsWith("about:") && !fullUrl.startsWith("data:")) {
            fullUrl = "http://" + fullUrl;
        }
        return fullUrl;
    }

    async goBack() { /* ... (same as previous complete version) ... */ 
        if (this._currentAppActiveTabId && !this.ui.navButtons.back.disabled) {
            await this.webviewEl.goBack(this._currentAppActiveTabId);
        }
    }

    async goForward() { /* ... (same as previous complete version) ... */ 
        if (this._currentAppActiveTabId && !this.ui.navButtons.forward.disabled) {
            await this.webviewEl.goForward(this._currentAppActiveTabId);
        }
    }

    async reloadPage() { /* ... (same as previous complete version) ... */  
        if (this._currentAppActiveTabId && !this.ui.navButtons.refresh.disabled) {
            await this.webviewEl.reload(this._currentAppActiveTabId);
        }
    }

    async stopLoading() { /* ... (same as previous complete version) ... */ 
        if (this._currentAppActiveTabId && !this.ui.navButtons.stop.disabled) {
            await this.webviewEl.stop(this._currentAppActiveTabId);
        }
    }
}
