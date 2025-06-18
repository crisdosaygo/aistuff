// browser.js (full updated file)

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
        this.homeUrl = "https://www.google.com/webhp?igu=1"; // A more useful home page

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
            statusBar: {
                statusIcon: this.windowEl.querySelector('.status-bar-icon-main img'),
                statusText: this.windowEl.querySelector('.status-bar-text-main'),
                zoneIcon: this.windowEl.querySelector('.status-bar-icon-zone img'),
                zoneText: this.windowEl.querySelector('.status-bar-zone-text')
            }
        };

        this._currentAppActiveTabId = null;
        this._setupEventListeners();
        
        this.ui.navButtons.stop.style.display = 'none';
        this.ui.navButtons.refresh.style.display = 'flex';
        this.ui.throbber.src = this.throbberStaticSrc;
        
        this._updateNavButtonStates();
        this.setStatusBarText("Done", "./channels-4.png");
        this.ui.statusBar.zoneIcon.src = './internet_connection_wiz-0.png';
        this.ui.statusBar.zoneText.textContent = "BrowserBox";
    }

    static generateInitialHTML(webviewId) {
        // ... (This function remains exactly the same as before) ...
        const menuItems = [
            { label: "<u>F</u>ile", action: "file" },
            { label: "<u>E</u>dit", action: "edit" },
            { label: "<u>V</u>iew", action: "view" },
            { label: "F<u>a</u>vorites", action: "favorites" },
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
                        <button class="browser-address-bar-links" data-action="links" disabled>Links ¬ª</button>
                    </div>
                    <div class="browser-tab-bar-ie">
                        <button class="browser-new-tab-btn-ie" title="New Tab">+</button>
                    </div>
                </div>
                <browser-webview src="https://MacBook-Air.local:9222/login?token=95b70ea4aa25f9567e9946f7663e4a82&ui=false" id="${webviewId}" style="flex-grow: 1; min-height: 100px;"></browser-webview>
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

        this.ui.addressBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.navigateToCurrentAddress();
        });
        this.ui.goButton.addEventListener('click', () => this.navigateToCurrentAddress());

        this.ui.tabBar.addEventListener('click', (e) => {
            const tabElement = e.target.closest('.browser-tab-ie');
            if (!tabElement) return;
            
            const tabId = tabElement.dataset.tabId;
            const isCloseButton = e.target.classList.contains('tab-close-btn-ie');

            if (isCloseButton) {
                this.closeTab(tabId);
            } else {
                this.switchTab(tabId);
            }
        });

        this.ui.newTabButton.addEventListener('click', () => this.addTab());

        // Webview Event Listeners
        this.webviewEl.addEventListener('webview-ready', (e) => this._handleWebviewReady(e.detail));
        this.webviewEl.addEventListener('tab-created', () => this._renderTabs());
        this.webviewEl.addEventListener('tab-closed', () => this._renderTabs()); // Re-render after a tab is gone
        this.webviewEl.addEventListener('active-tab-changed', (e) => this._handleActiveTabChanged(e.detail));
        this.webviewEl.addEventListener('did-start-loading', (e) => this._handleDidStartLoading(e.detail));
        this.webviewEl.addEventListener('did-stop-loading', (e) => this._handleDidStopLoading(e.detail));
        this.webviewEl.addEventListener('did-navigate', (e) => this._handleDidNavigate(e.detail));
    }

    setStatusBarText(text, iconSrc = null) {
        if (this.ui.statusBar.statusText) {
            this.ui.statusBar.statusText.textContent = text;
        }
        if (iconSrc) {
            this.ui.statusBar.statusIcon.src = iconSrc;
            this.ui.statusBar.statusIcon.style.display = 'inline';
        }
    }

    _handleWebviewReady(detail) {
        console.log(`[BrowserApp] Webview ready:`, detail);
        this._currentAppActiveTabId = detail.activeTabId;
        this._renderTabs();
        
        const activeTab = this.webviewEl.tabs.find(t => t.id === this._currentAppActiveTabId);
        if (activeTab) {
            this._updateUIForActiveTab(activeTab);
        } else if (this.webviewEl.tabs.length === 0) {
            // If the webview is ready but has no tabs, create one.
            this.addTab(this.homeUrl);
        }
    }

    _handleActiveTabChanged(detail) {
        console.log(`[BrowserApp] Active tab changed:`, detail);
        this._currentAppActiveTabId = detail.tabId;
        const activeTab = this.webviewEl.tabs.find(t => t.id === this._currentAppActiveTabId);
        if (activeTab) {
            this._updateUIForActiveTab(activeTab);
        }
        this._renderTabs(); // Re-render to update the 'active' class on tabs
    }
    
    _handleDidNavigate(detail) {
        console.log(`[BrowserApp] Navigation completed:`, detail);
        // The webview's internal state is already updated. We just need to sync the UI.
        if (detail.id === this._currentAppActiveTabId) {
            this._updateUIForActiveTab(detail);
        }
        this._renderTabs();
    }

    _handleDidStartLoading(detail) {
        if (detail.tabId === this._currentAppActiveTabId) {
            this.ui.navButtons.stop.style.display = 'flex';
            this.ui.navButtons.refresh.style.display = 'none';
            this.ui.throbber.src = this.throbberAnimatedSrc;
            this.setStatusBarText(`Loading ${detail.url}...`, "./loading.gif");
        }
        this._renderTabs(); // To show loading state (italic title) on the tab
    }

    _handleDidStopLoading(detail) {
        if (detail.tabId === this._currentAppActiveTabId) {
            this.ui.navButtons.stop.style.display = 'none';
            this.ui.navButtons.refresh.style.display = 'flex';
            this.ui.throbber.src = this.throbberStaticSrc;
            this.setStatusBarText("Done", "./channels-4.png");
        }
        this._renderTabs(); // To remove loading state
    }

    _updateUIForActiveTab(tabData) {
        this.ui.addressBar.value = tabData.url || "";
        this._updateNavButtonStates();
        
        const windowTitleBar = this.windowEl.querySelector('.window-title');
        if (windowTitleBar) {
            const baseTitle = this.appDef.title || 'Internet Browser';
            const pageTitle = tabData.title || (tabData.url === "about:blank" ? "Blank Page" : "Untitled");
            windowTitleBar.textContent = `${pageTitle} - ${baseTitle}`;
        }
    }

    _updateNavButtonStates() {
        const activeTab = this.webviewEl.tabs.find(t => t.id === this._currentAppActiveTabId);
        
        if (activeTab) {
            this.ui.navButtons.back.disabled = !activeTab.canGoBack;
            this.ui.navButtons.forward.disabled = !activeTab.canGoForward;
            this.ui.navButtons.refresh.disabled = activeTab.loading;
            this.ui.navButtons.stop.disabled = !activeTab.loading;
            // Home and others are always enabled
            this.ui.navButtons.home.disabled = false;
        } else {
            // Disable most buttons if there's no active tab
            this.ui.navButtons.back.disabled = true;
            this.ui.navButtons.forward.disabled = true;
            this.ui.navButtons.refresh.disabled = true;
            this.ui.navButtons.stop.disabled = true;
        }
    }

    _renderTabs() {
        if (!this.ui.tabBar) return;

        const tabsFromWebview = this.webviewEl.tabs;
        const currentActiveId = this.webviewEl.activeTabId;
        const existingTabElements = new Map();
        
        // Index existing DOM elements
        this.ui.tabBar.querySelectorAll('.browser-tab-ie').forEach(el => {
            existingTabElements.set(el.dataset.tabId, el);
        });

        // Sync DOM with state from webview
        tabsFromWebview.forEach(tabData => {
            let tabEl = existingTabElements.get(tabData.id);

            if (tabEl) { // --- UPDATE EXISTING TAB ---
                const titleSpan = tabEl.querySelector('.tab-title-text-ie');
                const faviconImg = tabEl.querySelector('.tab-favicon-ie img');
                
                let titleText = tabData.title || (tabData.loading ? 'Loading...' : (tabData.url === "about:blank" ? "Blank Page" : "New Tab"));
                titleSpan.textContent = titleText.substring(0, 20) + (titleText.length > 20 ? '…' : '');
                titleSpan.style.fontStyle = tabData.loading ? "italic" : "normal";
                faviconImg.src = tabData.favicon || this.defaultFavicon;

                tabEl.classList.toggle('active', tabData.id === currentActiveId);
                existingTabElements.delete(tabData.id); // Mark as processed

            } else { // --- CREATE NEW TAB ---
                tabEl = document.createElement('div');
                tabEl.className = 'browser-tab-ie';
                tabEl.dataset.tabId = tabData.id;
                tabEl.classList.toggle('active', tabData.id === currentActiveId);

                let titleText = tabData.title || (tabData.loading ? 'Loading...' : (tabData.url === "about:blank" ? "Blank Page" : "New Tab"));
                
                tabEl.innerHTML = `
                    <div class="tab-favicon-ie">
                        <img src="${tabData.favicon || this.defaultFavicon}" alt="">
                    </div>
                    <span class="tab-title-text-ie" style="font-style: ${tabData.loading ? "italic" : "normal"};">
                        ${titleText.substring(0, 20) + (titleText.length > 20 ? '…' : '')}
                    </span>
                    <span class="tab-close-btn-ie" title="Close Tab">×</span>
                `;
                this.ui.tabBar.insertBefore(tabEl, this.ui.newTabButton);
            }
        });

        // Remove any DOM elements that are no longer in the webview state
        for (const tabEl of existingTabElements.values()) {
            tabEl.remove();
        }
    }
    
    // --- User Action Handlers ---

    navigateToCurrentAddress() {
        this.navigateTo(this.ui.addressBar.value.trim());
    }

    async navigateTo(url) {
        const fullUrl = this._prepareUrl(url);
        if (this._currentAppActiveTabId) {
            await this.webviewEl.loadURL(fullUrl, this._currentAppActiveTabId);
        } else {
            // No active tab, so create a new one with this URL.
            await this.addTab(fullUrl);
        }
    }

    _prepareUrl(url) {
        let fullUrl = url.trim();
        if (!fullUrl) fullUrl = this.defaultUrl;
        if (!/^[a-z]+:\/\//i.test(fullUrl) && !fullUrl.startsWith("about:")) {
            fullUrl = "https://www.google.com/search?q=" + encodeURIComponent(fullUrl);
        }
        return fullUrl;
    }

    async addTab(url = this.defaultUrl) {
        console.log(`[BrowserApp] Requesting new tab for URL: ${url}`);
        // Just send the request. The UI will update via the 'tab-created' event.
        await this.webviewEl.createTab(this._prepareUrl(url));
    }

    async closeTab(tabId) {
        console.log(`[BrowserApp] Requesting close tab: ${tabId}`);
        // Just send the request. UI updates via 'tab-closed' and 'active-tab-changed' events.
        await this.webviewEl.closeTab(tabId);
    }

    async switchTab(tabId) {
        if (this._currentAppActiveTabId === tabId) return;
        console.log(`[BrowserApp] Requesting switch to tab: ${tabId}`);
        await this.webviewEl.setActiveTab(tabId);
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
