import  {BrowserWebview} from './webview.js';
      // ===== BROWSER_APP.JS (or inline section) =====
        class BrowserApp {
            constructor(windowEl, windowInstanceId, webviewId, netscape) {
                this.netscape = netscape;
                this.windowEl = windowEl;
                this.windowInstanceId = windowInstanceId;
                this.webviewId = webviewId;
                this.webviewEl = this.windowEl.querySelector(`#${this.webviewId}`); // This is <browser-webview>

                this.defaultUrl = "about:blank";
                this.homeUrl = netscape ? "" : "https://www.google.com";

                this.throbberAnimatedSrc = !netscape ? "" : "./netscape.gif";
                this.throbberStaticSrc = !netscape ? "" : "./netscape-frame.gif";

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
                // ... (HTML remains mostly the same, ensure throbber is there)
                return `
                    <div class="browser-container">
                        <div class="browser-toolbar">
                          <div class="browser-nav-buttons">
                            <button data-action="back" title="Back">‚óÑ Back</button>
                            <button data-action="forward" title="Forward">Forward ‚ñ∫</button>
                            <button data-action="stop" title="Stop">‚úï Stop</button>
                            <button data-action="reload" title="Reload">‚Üª Reload</button>
                            <button data-action="home" title="Home">‚åÇ Home</button>
                            <img src="" alt="${this.netscape ? 'Loading' : ''}" class="browser-throbber" style="display: none;">
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
                this._renderTabs(); // Render based on webview's initial state
                
                const activeTab = this.webviewEl.tabs.find(t => t.id === this._currentAppActiveTabId);
                if (activeTab) {
                    this.ui.addressBar.value = activeTab.url;
                    if (activeTab.url === 'about:blank' || activeTab.url === '' || activeTab.url === 'about:error') {
                        // If initial tab is blank or an error placeholder, navigate to default/home.
                        // Check if it's an error specific to mock init to avoid loop
                        if (activeTab.url !== this.defaultUrl && activeTab.url !== this.homeUrl) {
                             this.navigateTo(this.defaultUrl, this._currentAppActiveTabId);
                        }
                    }
                } else if (this.webviewEl.tabs.length === 0) { // No tabs at all
                    this.addTab(this.defaultUrl, true);
                }
                this._updateNavButtonStates();
            }

            _handleTabCreated(detail) { // detail: { tabId, data: {url, title} }
                console.log(`[BrowserApp ${this.webviewId}] Tab created in webview:`, detail);
                this._renderTabs(); // Re-render to show the new tab
                // If it became active, _handleActiveTabChanged will also fire.
            }

            _handleTabClosed(detail) { // detail: { tabId }
                console.log(`[BrowserApp ${this.webviewId}] Tab closed in webview:`, detail.tabId);
                // active-tab-changed event from webviewEl will handle active tab logic if it changed
                this._renderTabs(); 
                if (this.webviewEl.tabs.length === 0) {
                    this.addTab(this.defaultUrl, true); // Ensure at least one tab
                }
                 this._updateNavButtonStates(); // Update immediately after render
            }

            _handleActiveTabChanged(detail) { // detail: { tabId, url, title }
                 console.log(`[BrowserApp ${this.webviewId}] Active tab changed in webview:`, detail);
                this._currentAppActiveTabId = detail.tabId;
                this.ui.addressBar.value = detail.url || "";
                this._renderTabs(); // To update .active class on tab
                this._updateNavButtonStates();
                 const windowTitleBar = this.windowEl.querySelector('.window-title');
                 if(windowTitleBar && detail.title) {
                    const baseTitle = this.netscape ? 'Netscape Navigator' : APP_DEFINITIONS.internetExplorer.title;
                    windowTitleBar.textContent = `${detail.title} - ${baseTitle}`;
                 } else if (windowTitleBar) {
                    windowTitleBar.textContent = this.netscape ? 'Netscape Navigator' : APP_DEFINITIONS.internetExplorer.title;
                 }

            }

            _handleDidStartLoading(detail) { // detail: { tabId, url }
                if (detail.tabId === this._currentAppActiveTabId) {
                    console.log(`[BrowserApp ${this.webviewId}] Active tab started loading:`, detail.url);
                    this.ui.navButtons.stop.disabled = false;
                    if (this.ui.throbber && this.netscape) {
                        this.ui.throbber.src = this.throbberAnimatedSrc;
                        this.ui.throbber.style.display = 'inline';
                    }
                    // Optionally update address bar if URL changed due to redirect before navigation
                    // this.ui.addressBar.value = detail.url;
                }
                this._renderTabs(); // Update loading indicator on tab
            }

            _handleDidStopLoading(detail) { // detail: { tabId, url }
                if (detail.tabId === this._currentAppActiveTabId) {
                    console.log(`[BrowserApp ${this.webviewId}] Active tab stopped loading:`, detail.url);
                    this.ui.navButtons.stop.disabled = true;
                    if (this.ui.throbber) {
                         if (this.throbberStaticSrc && this.netscape) {
                            this.ui.throbber.src = this.throbberStaticSrc;
                        } else {
                            this.ui.throbber.style.display = 'none';
                            this.ui.throbber.src = '';
                        }
                    }
                }
                this._renderTabs(); // Update loading indicator on tab
            }

            _handleDidNavigate(detail) { // detail: { tabId, url, title, canGoBack, canGoForward }
                 console.log(`[BrowserApp ${this.webviewId}] Navigation completed in webview:`, detail);
                if (detail.tabId === this._currentAppActiveTabId) {
                    this.ui.addressBar.value = detail.url;
                    this._updateNavButtonStates(); // Nav states depend on canGoBack/Forward
                     const windowTitleBar = this.windowEl.querySelector('.window-title');
                     if(windowTitleBar) {
                        const baseTitle = this.netscape ? 'Netscape Navigator' : APP_DEFINITIONS.internetExplorer.title;
                        windowTitleBar.textContent = `${detail.title} - ${baseTitle}`;
                     }
                }
                this._renderTabs(); // Update tab title
            }

            // --- Tab Management API ---
            async addTab(url = this.defaultUrl, makeActive = true) {
                console.log(`[BrowserApp ${this.webviewId}] Requesting new tab for URL: ${url}`);
                const newTabId = await this.webviewEl.createTab(url); // webviewEl handles events
                if (makeActive && newTabId) {
                    await this.webviewEl.setActiveTab(newTabId);
                }
                // UI updates will be driven by events from webviewEl
            }

            async closeTab(tabId) {
                console.log(`[BrowserApp ${this.webviewId}] Requesting close tab: ${tabId}`);
                await this.webviewEl.closeTab(tabId);
                // UI updates (removing tab, switching active) driven by events
            }

            async switchTab(tabId) {
                if (this._currentAppActiveTabId === tabId) return;
                console.log(`[BrowserApp ${this.webviewId}] Requesting switch to tab: ${tabId}`);
                await this.webviewEl.setActiveTab(tabId);
                // UI updates driven by 'active-tab-changed' event
            }

            _renderTabs() {
                this.ui.tabBar.querySelectorAll('.browser-tab').forEach(el => el.remove());
                const tabsFromWebview = this.webviewEl.tabs; // Use getter
                const currentActiveIdInWebview = this.webviewEl.activeTabId;

                tabsFromWebview.forEach(tabData => {
                    const tabEl = document.createElement('div');
                    tabEl.className = 'browser-tab';
                    tabEl.dataset.tabId = tabData.id;
                    if (tabData.id === currentActiveIdInWebview) {
                        tabEl.classList.add('active');
                    }

                    const titleText = tabData.title || 'Loading...';
                    const titleSpan = document.createElement('span');
                    titleSpan.textContent = titleText.substring(0, 20) + (titleText.length > 20 ? '‚Ä¶' : '');
                    if (tabData.loading) { // Show loading indicator on tab
                        titleSpan.textContent = "Loading... " + titleSpan.textContent;
                        titleSpan.style.fontStyle = "italic";
                    }
                    tabEl.appendChild(titleSpan);

                    const closeBtn = document.createElement('span');
                    closeBtn.className = 'tab-close-btn';
                    closeBtn.innerHTML = '‚úï';
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
                const tabId = tabIdToNavigate !== undefined ? tabIdToNavigate : this._currentAppActiveTabId;

                if (tabId === null && this.webviewEl.tabs.length === 0) {
                    console.log(`[BrowserApp ${this.webviewId}] No active tab, creating new one for navigation to ${url}`);
                    await this.addTab(url, true); // addTab will create and make active, webview will load
                    return;
                }
                if (tabId === null) {
                     console.warn(`[BrowserApp ${this.webviewId}] navigateTo called with null tabId, but tabs exist. Using first tab.`);
                     // This case implies _currentAppActiveTabId is out of sync or no tab is active.
                     // Try to use the webview's actual activeTabId or first tab.
                     const fallbackTabId = this.webviewEl.activeTabId || (this.webviewEl.tabs.length > 0 ? this.webviewEl.tabs[0].id : null);
                     if (!fallbackTabId) {
                         await this.addTab(url, true); return; // still no tab, create one
                     }
                     // await this.webviewEl.setActiveTab(fallbackTabId); // ensure it's active
                     // this._currentAppActiveTabId = fallbackTabId; // update local cache
                     // await this.webviewEl.loadURL(this._prepareUrl(url), fallbackTabId);
                     // Simpler: just use the first tab available or create if none.
                     // The `tabId === null && this.webviewEl.tabs.length === 0` case above should handle it.
                     // If we reach here, it means there are tabs, but `_currentAppActiveTabId` is null.
                     // Let's try to make the first tab active and navigate it.
                     const firstTab = this.webviewEl.tabs[0];
                     if (firstTab) {
                        await this.webviewEl.setActiveTab(firstTab.id);
                        // active-tab-changed will set _currentAppActiveTabId, then we can call loadURL
                        // To avoid complexity, just pass the ID directly
                        await this.webviewEl.loadURL(this._prepareUrl(url), firstTab.id);
                     } else {
                         await this.addTab(url, true); // Failsafe
                     }
                     return;
                }

                const fullUrl = this._prepareUrl(url);
                console.log(`[BrowserApp ${this.webviewId}] Requesting navigation for tab ${tabId} to: ${fullUrl}`);
                await this.webviewEl.loadURL(fullUrl, tabId);
                // UI updates (loading indicators, address bar, title) driven by events
            }

            _prepareUrl(url) {
                let fullUrl = url.trim();
                if (!fullUrl) fullUrl = this.defaultUrl;
                if (!fullUrl.match(/^([a-z]+:)?\/\//i) && !fullUrl.startsWith("about:")) {
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
                    this.ui.navButtons.reload.disabled = !activeTab.url || activeTab.url === 'about:blank';
                    // Stop button state is handled by did-start/stop-loading events
                } else { // No active tab
                    this.ui.navButtons.back.disabled = true;
                    this.ui.navButtons.forward.disabled = true;
                    this.ui.navButtons.reload.disabled = true;
                    this.ui.navButtons.stop.disabled = true;
                }
            }
        }
      // ===== END BROWSER_APP.JS =====
