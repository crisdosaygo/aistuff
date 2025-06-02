// browser.js

import { BrowserWebview } from './webview.js';

export class BrowserApp {
    constructor(windowEl, windowInstanceId, webviewId, netscapeFlag_unused, appDef) {
        this.netscape = false; 
        this.appDef = appDef;
        this.windowEl = windowEl;
        this.windowInstanceId = windowInstanceId;
        this.webviewId = webviewId;
        this.webviewEl = this.windowEl.querySelector(`#${this.webviewId}`);

        this.defaultUrl = "about:blank";
        this.homeUrl = "about:blank"; 

        this.throbberAnimatedSrc = "./netscape.gif";
        this.throbberStaticSrc = "./netscape-frame.gif";
        this.defaultFavicon = "./template_world-4.png"; // Default favicon for tabs

        this.ui = {
            menuBar: { // Menu items are present in HTML but disabled by default
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
            tabBar: this.windowEl.querySelector('.browser-tab-bar-ie'), // Tab bar
            newTabButton: this.windowEl.querySelector('.browser-new-tab-btn-ie'), // New tab button
            statusBar: {
                statusIcon: this.windowEl.querySelector('.status-bar-icon-main img'), // Icon in first panel
                statusText: this.windowEl.querySelector('.status-bar-text-main'),    // Text in first panel
                zoneIcon: this.windowEl.querySelector('.status-bar-icon-zone img'), // Icon in last panel
                zoneText: this.windowEl.querySelector('.status-bar-zone-text')      // Text in last panel ("BrowserBox")
            }
        };

        this._currentAppActiveTabId = null;
        this._setupEventListeners();
        
        if (this.ui.navButtons.stop) this.ui.navButtons.stop.style.display = 'none';
        if (this.ui.navButtons.refresh) this.ui.navButtons.refresh.style.display = 'flex';
        
        if (this.ui.throbber) {
            this.ui.throbber.src = this.throbberStaticSrc;
            this.ui.throbber.style.display = 'block'; 
        }
        
        this._updateNavButtonStates();
        this.setStatusBarText("Done", "./channels-4.png"); // Initial status with channels icon
        if (this.ui.statusBar.zoneIcon) this.ui.statusBar.zoneIcon.src = './internet_connection_wiz-0.png';
        if (this.ui.statusBar.zoneText) this.ui.statusBar.zoneText.textContent = "BrowserBox";
    }

    static generateInitialHTML(webviewId) {
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
                <browser-webview id="${webviewId}" style="flex-grow: 1; min-height: 100px;"></browser-webview>
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

        this.ui.addressBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.navigateToCurrentAddress();
        });
        this.ui.goButton.addEventListener('click', () => this.navigateToCurrentAddress());

        // Tab Bar Listeners
        if (this.ui.tabBar) {
            this.ui.tabBar.addEventListener('click', (e) => {
                const tabElement = e.target.closest('.browser-tab-ie');
                if (!tabElement) return;
                const tabId = tabElement.dataset.tabId;

                if (e.target.classList.contains('tab-close-btn-ie')) {
                    this.closeTab(tabId);
                } else {
                    this.switchTab(tabId);
                }
            });
        }
        if (this.ui.newTabButton) {
            this.ui.newTabButton.addEventListener('click', () => this.addTab(this.defaultUrl, true));
        }

        this.webviewEl.addEventListener('webview-ready', (e) => this._handleWebviewReady(e.detail));
        this.webviewEl.addEventListener('tab-created', (e) => this._handleTabCreated(e.detail));
        this.webviewEl.addEventListener('tab-closed', (e) => this._handleTabClosed(e.detail));
        this.webviewEl.addEventListener('active-tab-changed', (e) => this._handleActiveTabChanged(e.detail));
        this.webviewEl.addEventListener('did-start-loading', (e) => this._handleDidStartLoading(e.detail));
        this.webviewEl.addEventListener('did-stop-loading', (e) => this._handleDidStopLoading(e.detail));
        this.webviewEl.addEventListener('did-navigate', (e) => this._handleDidNavigate(e.detail));
        this.webviewEl.addEventListener('favicon-updated', (e) => this._handleFaviconUpdated(e.detail)); // New listener
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
    
    _handleFaviconUpdated(detail) {
        const { tabId, favicon } = detail;
        const tabElement = this.ui.tabBar.querySelector(`.browser-tab-ie[data-tab-id="${tabId}"]`);
        if (tabElement) {
            const faviconImg = tabElement.querySelector('.tab-favicon-ie img');
            if (faviconImg) {
                faviconImg.src = favicon || this.defaultFavicon;
            }
        }
    }

    _handleDidStartLoading(detail) {
        if (detail.tabId === this._currentAppActiveTabId) {
            if (this.ui.navButtons.stop) this.ui.navButtons.stop.style.display = 'flex';
            if (this.ui.navButtons.refresh) this.ui.navButtons.refresh.style.display = 'none';

            if (this.ui.throbber && this.throbberAnimatedSrc) {
                this.ui.throbber.src = this.throbberAnimatedSrc;
                this.ui.throbber.style.display = 'block';
            }
            this.setStatusBarText(`Loading ${detail.url}...`, "./channels-4.png"); // Or a specific loading icon
        }
        const tabToUpdate = this.webviewEl.tabs.find(t => t.id === detail.tabId);
        if (tabToUpdate) tabToUpdate.loading = true;
        this._renderTabs();
        this._updateNavButtonStates();
    }

    _handleDidStopLoading(detail) {
        if (detail.tabId === this._currentAppActiveTabId) {
            if (this.ui.navButtons.stop) this.ui.navButtons.stop.style.display = 'none';
            if (this.ui.navButtons.refresh) this.ui.navButtons.refresh.style.display = 'flex';

            if (this.ui.throbber && this.throbberStaticSrc) {
                this.ui.throbber.src = this.throbberStaticSrc;
                this.ui.throbber.style.display = 'block'; 
            }
            this.setStatusBarText("Done", "./channels-4.png");
        }
        const tabToUpdate = this.webviewEl.tabs.find(t => t.id === detail.tabId);
        if (tabToUpdate) tabToUpdate.loading = false;
        this._renderTabs();
        this._updateNavButtonStates();
    }

    _updateNavButtonStates() { /* ... (same as previous complete version) ... */ 
        const activeTab = this.webviewEl.tabs.find(t => t.id === this._currentAppActiveTabId);
        
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

    _handleWebviewReady(detail) { /* ... (same as previous complete version) ... */ 
        console.log(`[BrowserApp ${this.webviewId}] Webview ready:`, detail);
        this._currentAppActiveTabId = detail.activeTabId;
        this._renderTabs();
        
        const activeTab = this.webviewEl.tabs.find(t => t.id === this._currentAppActiveTabId);
        if (activeTab) {
            this.ui.addressBar.value = activeTab.url;
            const windowTitleBar = this.windowEl.querySelector('.window-title');
            const baseTitle = this.appDef.title || 'Internet Browser'; 
            if(windowTitleBar) windowTitleBar.textContent = `${activeTab.title || 'Blank Page'} - ${baseTitle}`;

            if (activeTab.url === 'about:blank' || activeTab.url === '' || activeTab.url === 'about:error') {
                if (activeTab.url !== this.defaultUrl && activeTab.url !== this.homeUrl) {
                     this.navigateTo(this.homeUrl, this._currentAppActiveTabId);
                }
            }
        } else if (this.webviewEl.tabs.length === 0) {
            this.addTab(this.homeUrl, true); 
        }
        this._updateNavButtonStates();
        this.setStatusBarText("Done", "./channels-4.png");
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

    _prepareUrl(url) { /* ... (same as previous complete version) ... */ 
        let fullUrl = url.trim();
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
