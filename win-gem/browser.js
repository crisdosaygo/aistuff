// browser.js

import { BrowserWebview } from './webview.js';

export class BrowserApp {
    constructor(windowEl, windowInstanceId, webviewId, netscapeFlag_unused, appDef) {
        this.netscape = false; // Still primarily an IE-layout inspired UI
        this.appDef = appDef;
        this.windowEl = windowEl;
        this.windowInstanceId = windowInstanceId;
        this.webviewId = webviewId;
        this.webviewEl = this.windowEl.querySelector(`#${this.webviewId}`);

        this.defaultUrl = "about:blank";
        this.homeUrl = "about:blank";

        // USE OG Netscape Throbber Icons
        this.throbberAnimatedSrc = "./netscape.gif";
        this.throbberStaticSrc = "./netscape-frame.gif";

        this.ui = {
            menuBar: { /* ... as before ... */ },
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
            throbber: this.windowEl.querySelector('.browser-throbber-netscape'), // UPDATED CLASS
            statusBar: { /* ... as before ... */ }
        };

        this._currentAppActiveTabId = null;
        this._setupEventListeners();
        
        if (this.ui.navButtons.stop) this.ui.navButtons.stop.style.display = 'none';
        if (this.ui.navButtons.refresh) this.ui.navButtons.refresh.style.display = 'flex';
        
        // For Netscape throbber, initial state is often static or hidden until loading
        if (this.ui.throbber) {
            this.ui.throbber.src = this.throbberStaticSrc; // Start with static
            this.ui.throbber.style.display = 'block'; // Or 'none' if you prefer it hidden initially
        }
        
        this._updateNavButtonStates();
        this.setStatusBarText("Done");
        if (this.ui.statusBar.icon1) this.ui.statusBar.icon1.src = './icons/doc-icon.png';
        if (this.ui.statusBar.zoneIcon) this.ui.statusBar.zoneIcon.src = './icons/internet_connection_wiz-0.png';
    }

    static generateInitialHTML(webviewId) {
        const menuItems = ["File", "Edit", "View", "Favorites", "Tools", "Help"];
        const mainButtonLabels = {
            back: "Back",
            forward: "Forward",
            stop: "Stop",
            refresh: "Refresh",
            home: "Home",
            search: "Search",
            favorites: "Favorites",
            history: "History"
        };

        return `
            <div class="browser-container-ie">
                <div class="browser-toolbars-wrapper-ie">
                    <div class="browser-menu-bar-ie">
                        ${menuItems.map(item => `<button data-menu-item="${item.toLowerCase()}" disabled>${item}</button>`).join('')}
                    </div>
                    <div class="browser-main-toolbar-ie">
                        <div class="browser-nav-buttons-ie">
                            <button class="browser-nav-button-back" data-action="back" title="Back">
                                <span class="icon-area"></span><span>${mainButtonLabels.back}</span>
                            </button>
                            <button class="browser-nav-button-forward" data-action="forward" title="Forward">
                                <span class="icon-area"></span><span>${mainButtonLabels.forward}</span>
                            </button>
                            <span class="toolbar-separator"></span>
                            <button class="browser-nav-button-stop" data-action="stop" title="Stop">
                                <span class="icon-area"></span><span>${mainButtonLabels.stop}</span>
                            </button>
                            <button class="browser-nav-button-refresh" data-action="refresh" title="Refresh">
                                <span class="icon-area"></span><span>${mainButtonLabels.refresh}</span>
                            </button>
                            <span class="toolbar-separator"></span>
                            <button class="browser-nav-button-home" data-action="home" title="Home">
                                <span class="icon-area"></span><span>${mainButtonLabels.home}</span>
                            </button>
                            <span class="toolbar-separator"></span>
                            <button class="browser-nav-button-search" data-action="search" title="Search">
                                <span class="icon-area"></span><span>${mainButtonLabels.search}</span>
                            </button>
                            <button class="browser-nav-button-favorites" data-action="favorites" title="Favorites">
                                <span class="icon-area"></span><span>${mainButtonLabels.favorites}</span>
                            </button>
                            <button class="browser-nav-button-history" data-action="history" title="History">
                                <span class="icon-area"></span><span>${mainButtonLabels.history}</span>
                            </button>
                        </div>
                        <img src="" alt="Activity" class="browser-throbber-netscape"> 
                    </div>
                    <div class="browser-address-toolbar-ie">
                        <label for="address-${webviewId}" class="browser-address-bar-label">Address</label>
                        <input type="text" id="address-${webviewId}" class="browser-address-bar-input" value="">
                        <button class="browser-address-bar-go" data-action="go">Go</button>
                        <button class="browser-address-bar-links" data-action="links" disabled>Links »</button>
                    </div>
                </div>
                <browser-webview id="${webviewId}" style="flex-grow: 1; min-height: 100px;"></browser-webview>
                <div class="browser-status-bar-ie">
                    <div class="status-bar-panel status-bar-icon-1"><img src="" alt=""/></div>
                    <div class="status-bar-panel status-bar-text">Done</div>
                    <div class="status-bar-panel"></div>
                    <div class="status-bar-panel"></div>
                    <div class="status-bar-panel status-bar-icon-zone"><img src="" alt="Zone"/></div>
                </div>
            </div>
        `;
    }

    // _setupEventListeners remains the same as your IE-version

    // setStatusBarText remains the same

    _handleDidStartLoading(detail) {
        if (detail.tabId === this._currentAppActiveTabId) {
            if (this.ui.navButtons.stop) this.ui.navButtons.stop.style.display = 'flex';
            if (this.ui.navButtons.refresh) this.ui.navButtons.refresh.style.display = 'none';

            if (this.ui.throbber && this.throbberAnimatedSrc) {
                this.ui.throbber.src = this.throbberAnimatedSrc;
                this.ui.throbber.style.display = 'block'; // Ensure visible
            }
            this.setStatusBarText(`Loading ${detail.url}...`);
        }
        const tabToUpdate = this.webviewEl.tabs.find(t => t.id === detail.tabId);
        if (tabToUpdate) tabToUpdate.loading = true;
        this._updateNavButtonStates();
    }

    _handleDidStopLoading(detail) {
        if (detail.tabId === this._currentAppActiveTabId) {
            if (this.ui.navButtons.stop) this.ui.navButtons.stop.style.display = 'none';
            if (this.ui.navButtons.refresh) this.ui.navButtons.refresh.style.display = 'flex';

            if (this.ui.throbber && this.throbberStaticSrc) {
                this.ui.throbber.src = this.throbberStaticSrc;
                // Keep it displayed, matching typical Netscape throbber behavior (always visible after first load)
                this.ui.throbber.style.display = 'block'; 
            }
            this.setStatusBarText("Done");
        }
        const tabToUpdate = this.webviewEl.tabs.find(t => t.id === detail.tabId);
        if (tabToUpdate) tabToUpdate.loading = false;
        this._updateNavButtonStates();
    }

    // _updateNavButtonStates remains the same
    // _handleWebviewReady remains the same
    // _handleTabCreated remains the same
    // _handleTabClosed remains the same
    // _handleActiveTabChanged remains the same
    // _handleDidNavigate remains the same
    // addTab, closeTab, switchTab, _renderTabs (no-op) remain the same
    // navigateToCurrentAddress, navigateTo, _prepareUrl remain the same
    // goBack, goForward, reloadPage, stopLoading remain the same
    // --- All other methods from your IE-version JS remain unchanged ---
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

        this.webviewEl.addEventListener('webview-ready', (e) => this._handleWebviewReady(e.detail));
        this.webviewEl.addEventListener('tab-created', (e) => this._handleTabCreated(e.detail)); 
        this.webviewEl.addEventListener('tab-closed', (e) => this._handleTabClosed(e.detail));   
        this.webviewEl.addEventListener('active-tab-changed', (e) => this._handleActiveTabChanged(e.detail));
        this.webviewEl.addEventListener('did-start-loading', (e) => this._handleDidStartLoading(e.detail));
        this.webviewEl.addEventListener('did-stop-loading', (e) => this._handleDidStopLoading(e.detail));
        this.webviewEl.addEventListener('did-navigate', (e) => this._handleDidNavigate(e.detail));
    }

    setStatusBarText(text) {
        if (this.ui.statusBar.statusText) {
            this.ui.statusBar.statusText.textContent = text;
        }
    }

    _updateNavButtonStates() {
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

    _handleWebviewReady(detail) {
        this._currentAppActiveTabId = detail.activeTabId;
        
        const activeTab = this.webviewEl.tabs.find(t => t.id === this._currentAppActiveTabId);
        if (activeTab) {
            this.ui.addressBar.value = activeTab.url;
            const windowTitleBar = this.windowEl.querySelector('.window-title');
            const baseTitle = this.appDef.title || 'Microsoft Internet Explorer'; // Keep title for now
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
        this.setStatusBarText("Done");
    }

    _handleTabCreated(detail) {}
    _handleTabClosed(detail) {
        if (this.webviewEl.tabs.length === 0) {
            this.addTab(this.defaultUrl, true);
        }
    }

    _handleActiveTabChanged(detail) {
        this._currentAppActiveTabId = detail.tabId;
        this.ui.addressBar.value = detail.url || "";
        this._updateNavButtonStates();
        
        const windowTitleBar = this.windowEl.querySelector('.window-title');
        if(windowTitleBar) {
            const baseTitle = this.appDef.title || 'Microsoft Internet Explorer'; // Keep title
            if (detail.title) {
                windowTitleBar.textContent = `${detail.title} - ${baseTitle}`;
            } else {
                 windowTitleBar.textContent = `${detail.url === "about:blank" ? "Blank Page" : "Untitled"} - ${baseTitle}`;
            }
        }
        this.setStatusBarText("Done"); 
    }
    
    _handleDidNavigate(detail) {
         const tabToUpdate = this.webviewEl.tabs.find(t => t.id === detail.tabId);
         if (tabToUpdate) {
             tabToUpdate.url = detail.url;
             tabToUpdate.title = detail.title;
             tabToUpdate.canGoBack = detail.canGoBack;
             tabToUpdate.canGoForward = detail.canGoForward;
             tabToUpdate.loading = false;
         }

        if (detail.tabId === this._currentAppActiveTabId) {
            this.ui.addressBar.value = detail.url;
            this._updateNavButtonStates(); 
            const windowTitleBar = this.windowEl.querySelector('.window-title');
            if(windowTitleBar) {
              const baseTitle = this.appDef.title || 'Microsoft Internet Explorer'; // Keep title
                windowTitleBar.textContent = `${detail.title || (detail.url === "about:blank" ? "Blank Page" : "Untitled")} - ${baseTitle}`;
            }
        }
        this.setStatusBarText("Done");
    }

    async addTab(url = this.defaultUrl, makeActive = true) {
        const newTabId = await this.webviewEl.createTab(this._prepareUrl(url));
        if (makeActive && newTabId) {
            await this.webviewEl.setActiveTab(newTabId);
        }
    }

    async closeTab(tabId) { 
        await this.webviewEl.closeTab(tabId);
    }

    async switchTab(tabId) { 
        if (this._currentAppActiveTabId === tabId) return;
        await this.webviewEl.setActiveTab(tabId);
    }

    _renderTabs() {}
    
    navigateToCurrentAddress() {
        const url = this.ui.addressBar.value.trim();
        this.navigateTo(url);
    }

    async navigateTo(url, tabIdToNavigate) {
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
        if (!fullUrl) fullUrl = this.defaultUrl;
        if (!/^[a-z]+:\/\//i.test(fullUrl) && !fullUrl.startsWith("about:") && !fullUrl.startsWith("data:")) {
            fullUrl = "http://" + fullUrl;
        }
        return fullUrl;
    }

    async goBack() {
        if (this._currentAppActiveTabId && !this.ui.navButtons.back.disabled) {
            await this.webviewEl.goBack(this._currentAppActiveTabId);
        }
    }

    async goForward() {
        if (this._currentAppActiveTabId && !this.ui.navButtons.forward.disabled) {
            await this.webviewEl.goForward(this._currentAppActiveTabId);
        }
    }

    async reloadPage() { 
        if (this._currentAppActiveTabId && !this.ui.navButtons.refresh.disabled) {
            await this.webviewEl.reload(this._currentAppActiveTabId);
        }
    }

    async stopLoading() {
        if (this._currentAppActiveTabId && !this.ui.navButtons.stop.disabled) {
            await this.webviewEl.stop(this._currentAppActiveTabId);
        }
    }
}
