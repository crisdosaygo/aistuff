// browser.js

import { BrowserWebview } from './webview.js';

export class BrowserApp {
    constructor(windowEl, windowInstanceId, webviewId, netscape, appDef) {
        this.netscape = netscape;
        this.appDef = appDef;
        this.windowEl = windowEl;
        this.windowInstanceId = windowInstanceId;
        this.webviewId = webviewId;
        this.webviewEl = this.windowEl.querySelector(`#${this.webviewId}`);

        this.defaultUrl = "about:blank";
        this.homeUrl = netscape ? "about:blank" : "https://www.google.com"; // Netscape often had about:blank or a portal as home

        this.throbberAnimatedSrc = netscape ? "./netscape.gif" : "";
        this.throbberStaticSrc = netscape ? "./netscape-frame.gif" : "";

        this.ui = {
            navButtons: {
                back: this.windowEl.querySelector('.browser-nav-button-back'),
                forward: this.windowEl.querySelector('.browser-nav-button-forward'),
                stop: this.windowEl.querySelector('.browser-nav-button-stop'),
                reload: this.windowEl.querySelector('.browser-nav-button-reload'),
                home: this.windowEl.querySelector('.browser-nav-button-home'),
                search: this.windowEl.querySelector('.browser-nav-button-search'),
                print: this.windowEl.querySelector('.browser-nav-button-print')
            },
            addressBar: this.windowEl.querySelector('.browser-address-bar'),
            goButton: this.windowEl.querySelector('.browser-address-toolbar [data-action="go"]'), // Will be null after HTML changes
            tabBar: this.windowEl.querySelector('.browser-tab-bar'),
            newTabButton: this.windowEl.querySelector('.browser-new-tab-btn'),
            throbber: this.windowEl.querySelector('.browser-throbber-netscape'),
        };

        this._currentAppActiveTabId = null;
        this._setupEventListeners();
        
        if (this.ui.navButtons.stop) this.ui.navButtons.stop.style.display = 'none';
        if (this.ui.navButtons.reload) this.ui.navButtons.reload.style.display = 'flex'; // flex for column layout
        if (this.ui.throbber) this.ui.throbber.style.display = 'none';
        
        this._updateNavButtonStates(); 
    }

    static generateInitialHTML(webviewId) {
        // Button labels as per the Netscape screenshot
        const buttonLabels = {
            back: "Back",
            forward: "Forward",
            reload: "Reload",
            home: "Home",
            search: "Search",
            print: "Print",
            stop: "Stop" 
        };

        // Changed Address label to "Go to:" and removed Go button
        return `
            <div class="browser-container">
                <div class="browser-toolbar">
                  <div class="browser-nav-buttons">
                    <button class="browser-nav-button-back" data-action="back" title="Back">
                        <span class="icon-area"></span>
                        <span>${buttonLabels.back}</span>
                    </button>
                    <button class="browser-nav-button-forward" data-action="forward" title="Forward">
                        <span class="icon-area"></span>
                        <span>${buttonLabels.forward}</span>
                    </button>
                    <button class="browser-nav-button-reload" data-action="reload" title="Reload">
                        <span class="icon-area"></span>
                        <span>${buttonLabels.reload}</span>
                    </button>
                    <button class="browser-nav-button-stop" data-action="stop" title="Stop" style="display:none;">
                        <span class="icon-area"></span>
                        <span>${buttonLabels.stop}</span>
                    </button> 
                    <button class="browser-nav-button-home" data-action="home" title="Home">
                        <span class="icon-area"></span>
                        <span>${buttonLabels.home}</span>
                    </button>
                    <button class="browser-nav-button-search" data-action="search" title="Search (Not Implemented)">
                        <span class="icon-area"></span>
                        <span>${buttonLabels.search}</span>
                    </button>
                    <button class="browser-nav-button-print" data-action="print" title="Print (Not Implemented)">
                        <span class="icon-area"></span>
                        <span>${buttonLabels.print}</span>
                    </button>
                  </div>
                  <img src="" alt="Status" class="browser-throbber-netscape" style="display: none;">
                </div>
                <div class="browser-address-toolbar">
                    <label for="address-${webviewId}" class="browser-address-label">Go to:</label>
                    <input type="text" id="address-${webviewId}" class="browser-address-bar" value="">
                    <!-- Go button removed to match Netscape target -->
                </div>
                <div class="browser-tab-bar">
                    <button class="browser-new-tab-btn" title="New Tab">+</button>
                </div>
                <browser-webview id="${webviewId}" style="flex-grow: 1; min-height: 100px;">
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
        
        this.ui.navButtons.search.addEventListener('click', () => alert('Search action not implemented.'));
        this.ui.navButtons.print.addEventListener('click', () => alert('Print action not implemented.'));

        this.ui.addressBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.navigateToCurrentAddress();
        });
        
        // Go button is removed from HTML, so ui.goButton might be null
        if (this.ui.goButton) {
            this.ui.goButton.addEventListener('click', () => this.navigateToCurrentAddress());
        }
        
        this.ui.newTabButton.addEventListener('click', () => this.addTab(this.defaultUrl, true));

        this.ui.tabBar.addEventListener('click', (e) => {
            const tabElement = e.target.closest('.browser-tab');
            if (!tabElement) return;
            const tabId = tabElement.dataset.tabId;
            if (e.target.classList.contains('tab-close-btn')) {
                this.closeTab(tabId);
            } else {
                this.switchTab(tabId);
            }
        });

        this.webviewEl.addEventListener('webview-ready', (e) => this._handleWebviewReady(e.detail));
        this.webviewEl.addEventListener('tab-created', (e) => this._handleTabCreated(e.detail));
        this.webviewEl.addEventListener('tab-closed', (e) => this._handleTabClosed(e.detail));
        this.webviewEl.addEventListener('active-tab-changed', (e) => this._handleActiveTabChanged(e.detail));
        this.webviewEl.addEventListener('did-start-loading', (e) => this._handleDidStartLoading(e.detail));
        this.webviewEl.addEventListener('did-stop-loading', (e) => this._handleDidStopLoading(e.detail));
        this.webviewEl.addEventListener('did-navigate', (e) => this._handleDidNavigate(e.detail));
    }

    _handleDidStartLoading(detail) {
        if (detail.tabId === this._currentAppActiveTabId) {
            if (this.ui.navButtons.stop) this.ui.navButtons.stop.style.display = 'flex'; 
            if (this.ui.navButtons.reload) this.ui.navButtons.reload.style.display = 'none';

            if (this.ui.throbber && this.netscape && this.throbberAnimatedSrc) {
                this.ui.throbber.src = this.throbberAnimatedSrc;
                this.ui.throbber.style.display = 'inline-block'; 
            }
        }
        const tabToUpdate = this.webviewEl.tabs.find(t => t.id === detail.tabId);
        if (tabToUpdate) tabToUpdate.loading = true;
        this._renderTabs();
        this._updateNavButtonStates();
    }

    _handleDidStopLoading(detail) {
        if (detail.tabId === this._currentAppActiveTabId) {
            if (this.ui.navButtons.stop) this.ui.navButtons.stop.style.display = 'none';
            if (this.ui.navButtons.reload) this.ui.navButtons.reload.style.display = 'flex';

            if (this.ui.throbber && this.netscape) {
                if (this.throbberStaticSrc) {
                    this.ui.throbber.src = this.throbberStaticSrc;
                    this.ui.throbber.style.display = 'inline-block';
                } else {
                    this.ui.throbber.style.display = 'none';
                    this.ui.throbber.src = '';
                }
            } else if (this.ui.throbber) {
                this.ui.throbber.style.display = 'none';
                this.ui.throbber.src = '';
            }
        }
        const tabToUpdate = this.webviewEl.tabs.find(t => t.id === detail.tabId);
        if (tabToUpdate) tabToUpdate.loading = false;
        this._renderTabs();
        this._updateNavButtonStates();
    }

    _updateNavButtonStates() {
        const activeTab = this.webviewEl.tabs.find(t => t.id === this._currentAppActiveTabId);
        
        const allNavButtons = [
            this.ui.navButtons.back, this.ui.navButtons.forward,
            this.ui.navButtons.reload, this.ui.navButtons.stop,
            this.ui.navButtons.home, this.ui.navButtons.search, this.ui.navButtons.print
        ];

        if (activeTab) {
            this.ui.navButtons.back.classList.toggle('disabled', !activeTab.canGoBack);
            this.ui.navButtons.forward.classList.toggle('disabled', !activeTab.canGoForward);
            
            const isLoading = activeTab.loading;
            const isBlankOrError = !activeTab.url || activeTab.url === 'about:blank' || activeTab.url === 'about:error';

            if (this.ui.navButtons.reload) {
                this.ui.navButtons.reload.classList.toggle('disabled', isBlankOrError || isLoading);
            }
            if (this.ui.navButtons.stop) {
                this.ui.navButtons.stop.classList.toggle('disabled', !isLoading);
            }
            
        } else { 
            allNavButtons.forEach(btn => btn && btn.classList.add('disabled'));
            if (this.ui.navButtons.stop) this.ui.navButtons.stop.style.display = 'none';
            if (this.ui.navButtons.reload) this.ui.navButtons.reload.style.display = 'flex'; 
        }

        if (this.ui.navButtons.home) this.ui.navButtons.home.classList.remove('disabled');
        if (this.ui.navButtons.search) this.ui.navButtons.search.classList.remove('disabled'); // Search and Print are always enabled for now
        if (this.ui.navButtons.print) this.ui.navButtons.print.classList.remove('disabled');
    }

    _handleWebviewReady(detail) {
        console.log(`[BrowserApp ${this.webviewId}] Webview ready:`, detail);
        this._currentAppActiveTabId = detail.activeTabId;
        this._renderTabs();
        
        const activeTab = this.webviewEl.tabs.find(t => t.id === this._currentAppActiveTabId);
        if (activeTab) {
            this.ui.addressBar.value = activeTab.url;
            const windowTitleBar = this.windowEl.querySelector('.window-title');
            const baseTitle = this.netscape ? (this.appDef.title || 'Netscape') // Simplified title
                                           : (this.appDef.title || 'Internet Browser');
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
    }

    _handleTabCreated(detail) {
        console.log(`[BrowserApp ${this.webviewId}] Tab created in webview:`, detail);
        this._renderTabs();
    }

    _handleTabClosed(detail) {
        console.log(`[BrowserApp ${this.webviewId}] Tab closed in webview:`, detail.tabId);
        this._renderTabs(); 
        if (this.webviewEl.tabs.length === 0) {
            this.addTab(this.defaultUrl, true);
        }
    }

    _handleActiveTabChanged(detail) {
        console.log(`[BrowserApp ${this.webviewId}] Active tab changed in webview:`, detail);
        this._currentAppActiveTabId = detail.tabId;
        this.ui.addressBar.value = detail.url || "";
        this._renderTabs();
        this._updateNavButtonStates();
        
        const windowTitleBar = this.windowEl.querySelector('.window-title');
        if(windowTitleBar) {
            const baseTitle = this.netscape ? (this.appDef.title || 'Netscape') 
                                           : (this.appDef.title || 'Internet Browser');
            if (detail.title) {
                windowTitleBar.textContent = `${detail.title} - ${baseTitle}`;
            } else {
                 windowTitleBar.textContent = `${detail.url === "about:blank" ? "Blank Page" : "Untitled"} - ${baseTitle}`;
            }
        }
    }
    
    _handleDidNavigate(detail) {
        console.log(`[BrowserApp ${this.webviewId}] Navigation completed in webview:`, detail);
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
              const baseTitle = this.netscape ? (this.appDef.title || 'Netscape') 
                                             : (this.appDef.title || 'Internet Browser');
                windowTitleBar.textContent = `${detail.title || (detail.url === "about:blank" ? "Blank Page" : "Untitled")} - ${baseTitle}`;
            }
        }
        this._renderTabs();
    }

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

            let titleText = tabData.title || (tabData.loading ? 'Loading...' : (tabData.url === "about:blank" ? "Blank Page" : "New Tab"));
            if (tabData.loading && !titleText.toLowerCase().includes('loading')) {
                 titleText = `Loading ${tabData.url && !tabData.url.startsWith("about:") ? new URL(tabData.url).hostname : '...'}`;
            } else if (tabData.loading && !tabData.title) {
                titleText = 'Loading...';
            }


            const titleSpan = document.createElement('span');
            titleSpan.className = 'tab-title-text';
            titleSpan.textContent = titleText.substring(0, 20) + (titleText.length > 20 ? '…' : ''); 
            
            if (tabData.loading) {
                titleSpan.style.fontStyle = "italic";
            }
            tabEl.appendChild(titleSpan);

            const closeBtn = document.createElement('span');
            closeBtn.className = 'tab-close-btn';
            closeBtn.innerHTML = 'r'; 
            closeBtn.title = 'Close Tab';
            tabEl.appendChild(closeBtn);

            this.ui.tabBar.insertBefore(tabEl, this.ui.newTabButton);
        });
    }
    
    navigateToCurrentAddress() {
        const url = this.ui.addressBar.value.trim();
        this.navigateTo(url);
    }

    async navigateTo(url, tabIdToNavigate) {
        const targetTabId = tabIdToNavigate !== undefined ? tabIdToNavigate : this._currentAppActiveTabId;
        const fullUrl = this._prepareUrl(url);

        if (targetTabId === null) {
            if (this.webviewEl.tabs.length === 0) {
                await this.addTab(fullUrl, true);
            } else {
                const webviewActiveId = this.webviewEl.activeTabId || (this.webviewEl.tabs[0]?.id);
                if (webviewActiveId) {
                    await this.webviewEl.setActiveTab(webviewActiveId);
                    await this.webviewEl.loadURL(fullUrl, webviewActiveId);
                } else {
                     await this.addTab(fullUrl, true);
                }
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
        if (this._currentAppActiveTabId && this.ui.navButtons.back && !this.ui.navButtons.back.classList.contains('disabled')) {
            await this.webviewEl.goBack(this._currentAppActiveTabId);
        }
    }

    async goForward() {
        if (this._currentAppActiveTabId && this.ui.navButtons.forward && !this.ui.navButtons.forward.classList.contains('disabled')) {
            await this.webviewEl.goForward(this._currentAppActiveTabId);
        }
    }

    async reloadPage() {
        if (this._currentAppActiveTabId && this.ui.navButtons.reload && !this.ui.navButtons.reload.classList.contains('disabled')) {
            await this.webviewEl.reload(this._currentAppActiveTabId);
        }
    }

    async stopLoading() {
        if (this._currentAppActiveTabId && this.ui.navButtons.stop && !this.ui.navButtons.stop.classList.contains('disabled')) {
            await this.webviewEl.stop(this._currentAppActiveTabId);
        }
    }
}
