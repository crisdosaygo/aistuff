
      // ===== BROWSER_APP.JS (or inline section) =====
        class BrowserApp {
            constructor(windowEl, windowInstanceId, webviewId) {
                this.windowEl = windowEl;
                this.windowInstanceId = windowInstanceId;
                this.webviewId = webviewId; // The ID for the <browser-webview> element
                this.webviewEl = this.windowEl.querySelector(`#${this.webviewId}`);

                this.tabs = []; // { id, title, url, history: [], historyIndex, domElement }
                this.activeTabId = null;
                this.tabIdCounter = 0;
                this.defaultUrl = "about:blank"; // Or your preferred home page
                this.homeUrl = "https://www.google.com"; // Example home page

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
                };

                this._setupEventListeners();
                this.addTab(this.defaultUrl, true); // Open with a default tab
                this._updateNavButtonStates(); // Initial state
            }

            static generateInitialHTML(webviewId) {
                // Note: Using text for nav buttons for simplicity. Could use Marlett/Webdings or icons.
                // ◄ ► ✕ ↻ ⌂
                return `
                    <div class="browser-container">
                        <div class="browser-toolbar">
                            <button data-action="back" title="Back">◄ Back</button>
                            <button data-action="forward" title="Forward">Forward ►</button>
                            <button data-action="stop" title="Stop">✕ Stop</button>
                            <button data-action="reload" title="Reload">↻ Reload</button>
                            <button data-action="home" title="Home">⌂ Home</button>
                        </div>
                        <div class="browser-address-toolbar">
                            <label for="address-${webviewId}">Address:</label>
                            <input type="text" id="address-${webviewId}" class="browser-address-bar" value="">
                            <button data-action="go">Go</button>
                        </div>
                        <div class="browser-tab-bar">
                            <!-- Tabs will be added here by JS -->
                            <button class="browser-new-tab-btn" title="New Tab">+</button>
                        </div>
                        <browser-webview id="${webviewId}">
                            (Content for ${webviewId} will appear here)
                        </browser-webview>
                    </div>
                `;
            }

            _setupEventListeners() {
                // Navigation buttons
                this.ui.navButtons.back.addEventListener('click', () => this.goBack());
                this.ui.navButtons.forward.addEventListener('click', () => this.goForward());
                this.ui.navButtons.stop.addEventListener('click', () => this.stopLoading());
                this.ui.navButtons.reload.addEventListener('click', () => this.reloadPage());
                this.ui.navButtons.home.addEventListener('click', () => this.navigateTo(this.homeUrl));

                // Address bar and Go button
                this.ui.addressBar.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.navigateToCurrentAddress();
                    }
                });
                this.ui.goButton.addEventListener('click', () => this.navigateToCurrentAddress());

                // New tab button
                this.ui.newTabButton.addEventListener('click', () => this.addTab(this.defaultUrl, true));

                // Tab bar (for clicks on tabs or close buttons - event delegation)
                this.ui.tabBar.addEventListener('click', (e) => {
                    const tabElement = e.target.closest('.browser-tab');
                    if (!tabElement) return;

                    const tabId = parseInt(tabElement.dataset.tabId);
                    if (e.target.classList.contains('tab-close-btn')) {
                        this.closeTab(tabId);
                    } else {
                        this.switchTab(tabId);
                    }
                });

                // Mock webview events (replace with actual webview events later)
                // this.webviewEl.addEventListener('did-start-loading', (e) => this._handleWebViewEvent(e));
                // this.webviewEl.addEventListener('did-stop-loading', (e) => this._handleWebViewEvent(e));
                // this.webviewEl.addEventListener('did-navigate', (e) => this._handleWebViewEvent(e));
            }

            // --- Tab Management ---
            addTab(url = this.defaultUrl, makeActive = true) {
                const tabId = this.tabIdCounter++;
                const newTab = {
                    id: tabId,
                    title: "New Tab",
                    url: "", // Will be set by first navigation
                    history: [],
                    historyIndex: -1,
                    domElement: null // Will be created by _renderTabs
                };
                this.tabs.push(newTab);
                this._renderTabs(); // Re-render all tabs

                if (makeActive) {
                    this.switchTab(tabId); // This will also trigger navigation
                }
                this.navigateTo(url, tabId); // Navigate the new tab
                return newTab;
            }

            closeTab(tabId) {
                const tabIndex = this.tabs.findIndex(t => t.id === tabId);
                if (tabIndex === -1) return;

                this.tabs.splice(tabIndex, 1);
                // Conceptually: this.webviewEl.closeTab(tabId); // Inform the webview

                if (this.activeTabId === tabId) {
                    this.activeTabId = null; // Clear active tab
                    if (this.tabs.length > 0) {
                        // Switch to the previous tab, or the first one if no previous
                        const newActiveIndex = Math.max(0, tabIndex - 1);
                        this.switchTab(this.tabs[newActiveIndex].id);
                    } else {
                        // No tabs left, maybe close browser window or show a "no tabs" state
                        // For now, just clear UI
                        this.ui.addressBar.value = "";
                        this._updateNavButtonStates();
                    }
                }
                this._renderTabs();
                if (this.tabs.length === 0) {
                     // If no tabs left, create a new default one
                    this.addTab(this.defaultUrl, true);
                }
            }

            switchTab(tabId) {
                if (this.activeTabId === tabId && this.tabs.find(t => t.id === tabId)) return; // Already active or tab doesn't exist

                this.activeTabId = tabId;
                const activeTabData = this.tabs.find(t => t.id === tabId);

                if (activeTabData) {
                    this.ui.addressBar.value = activeTabData.url;
                    // Conceptually: this.webviewEl.setActiveTab(tabId);
                    this.webviewEl.innerHTML = `(Content for ${activeTabData.url} - Tab ID: ${tabId})`; // Mock
                } else {
                    // This case should ideally not happen if closeTab logic is correct
                    this.ui.addressBar.value = "";
                    this.webviewEl.innerHTML = `(No active tab selected)`;
                }

                this._renderTabs(); // To update active class
                this._updateNavButtonStates();
            }

            _renderTabs() {
                // Clear existing tab elements except the new tab button
                this.ui.tabBar.querySelectorAll('.browser-tab').forEach(el => el.remove());

                this.tabs.forEach(tabData => {
                    const tabEl = document.createElement('div');
                    tabEl.className = 'browser-tab';
                    tabEl.dataset.tabId = tabData.id;
                    if (tabData.id === this.activeTabId) {
                        tabEl.classList.add('active');
                    }

                    const titleSpan = document.createElement('span');
                    titleSpan.textContent = tabData.title.substring(0, 20) + (tabData.title.length > 20 ? '…' : ''); // Truncate title
                    tabEl.appendChild(titleSpan);

                    const closeBtn = document.createElement('span');
                    closeBtn.className = 'tab-close-btn';
                    closeBtn.innerHTML = '✕'; // Simple 'x'
                    closeBtn.title = 'Close Tab';
                    tabEl.appendChild(closeBtn);

                    tabData.domElement = tabEl;
                    this.ui.tabBar.insertBefore(tabEl, this.ui.newTabButton); // Insert before the '+' button
                });
            }

            // --- Navigation ---
            navigateToCurrentAddress() {
                const url = this.ui.addressBar.value.trim();
                this.navigateTo(url);
            }

            navigateTo(url, tabIdToNavigate) {
                const tabId = tabIdToNavigate !== undefined ? tabIdToNavigate : this.activeTabId;
                if (tabId === null && this.tabs.length === 0) { // No tabs, create one
                    const newTab = this.addTab(url, true);
                    // navigateTo will be called again inside addTab for the new tab
                    return;
                }
                if (tabId === null) return; // Should not happen if addTab handles empty case

                const tab = this.tabs.find(t => t.id === tabId);
                if (!tab) return;

                let fullUrl = url;
                if (!url.match(/^([a-z]+:)?\/\//i) && !url.startsWith("about:")) { // Basic check if not a full URL or about:
                    fullUrl = "http://" + url; // Assume http
                }
                
                // Mocking webview interaction
                // Conceptually: this.webviewEl.loadURL(fullUrl, tabId);
                console.log(`[Browser ${this.webviewId}] Tab ${tabId} navigating to: ${fullUrl}`);
                this.webviewEl.innerHTML = `Loading ${fullUrl}... (Tab ID: ${tabId})`;
                this.ui.navButtons.stop.disabled = false; // Enable stop button

                // Simulate page load and title update
                setTimeout(() => {
                    if (!this.tabs.find(t => t.id === tabId)) return; // Tab might have been closed

                    tab.url = fullUrl;
                    tab.title = this._extractTitleFromUrl(fullUrl);

                    // History management
                    if (tab.historyIndex < tab.history.length - 1) {
                        tab.history = tab.history.slice(0, tab.historyIndex + 1); // Clear forward history
                    }
                    tab.history.push(fullUrl);
                    tab.historyIndex = tab.history.length - 1;

                    if (tab.id === this.activeTabId) { // Update UI only if it's the active tab
                        this.ui.addressBar.value = fullUrl;
                        this.webviewEl.innerHTML = `(Content for ${tab.title} - ${tab.url})`;
                    }
                    this._renderTabs(); // Update tab title in the tab bar
                    this._updateNavButtonStates();
                    this.ui.navButtons.stop.disabled = true; // Disable stop button after "load"
                }, 500 + Math.random() * 500); // Simulate network delay
            }

            goBack() {
                const tab = this.tabs.find(t => t.id === this.activeTabId);
                if (tab && tab.historyIndex > 0) {
                    tab.historyIndex--;
                    const url = tab.history[tab.historyIndex];
                    // Conceptually: this.webviewEl.goBack(tab.id);
                    // For mock, we directly "load" from history
                    this._loadFromHistory(tab, url);
                }
            }

            goForward() {
                const tab = this.tabs.find(t => t.id === this.activeTabId);
                if (tab && tab.historyIndex < tab.history.length - 1) {
                    tab.historyIndex++;
                    const url = tab.history[tab.historyIndex];
                    // Conceptually: this.webviewEl.goForward(tab.id);
                    this._loadFromHistory(tab, url);
                }
            }

            _loadFromHistory(tab, url) {
                // This is a simplified load for history navigation, doesn't add to history again
                console.log(`[Browser ${this.webviewId}] Tab ${tab.id} history nav to: ${url}`);
                this.webviewEl.innerHTML = `Loading ${url} from history...`;
                this.ui.navButtons.stop.disabled = false;

                setTimeout(() => {
                    if (!this.tabs.find(t => t.id === tab.id)) return;

                    tab.url = url;
                    tab.title = this._extractTitleFromUrl(url);

                    if (tab.id === this.activeTabId) {
                        this.ui.addressBar.value = url;
                        this.webviewEl.innerHTML = `(Content for ${tab.title} - ${tab.url})`;
                    }
                    this._renderTabs();
                    this._updateNavButtonStates();
                    this.ui.navButtons.stop.disabled = true;
                }, 200 + Math.random() * 300);
            }


            reloadPage() {
                const tab = this.tabs.find(t => t.id === this.activeTabId);
                if (tab && tab.url) {
                    // Conceptually: this.webviewEl.reload(tab.id);
                    // For mock, just call navigateTo with current URL (will re-add to history, which is fine for simple reload)
                    this.navigateTo(tab.url, tab.id);
                }
            }

            stopLoading() {
                // Conceptually: this.webviewEl.stopLoading(this.activeTabId);
                console.log(`[Browser ${this.webviewId}] Stop loading for tab ${this.activeTabId}`);
                this.ui.navButtons.stop.disabled = true;
                const tab = this.tabs.find(t => t.id === this.activeTabId);
                if (tab) {
                     this.webviewEl.innerHTML = `(Loading stopped for ${tab.url})`;
                }
            }

            _updateNavButtonStates() {
                const tab = this.tabs.find(t => t.id === this.activeTabId);
                if (tab) {
                    this.ui.navButtons.back.disabled = tab.historyIndex <= 0;
                    this.ui.navButtons.forward.disabled = tab.historyIndex >= tab.history.length - 1;
                    this.ui.navButtons.reload.disabled = !tab.url;
                } else { // No active tab
                    this.ui.navButtons.back.disabled = true;
                    this.ui.navButtons.forward.disabled = true;
                    this.ui.navButtons.reload.disabled = true;
                }
                // Stop button is managed during load simulation
                // Home button is always enabled
            }

            _extractTitleFromUrl(url) {
                if (!url) return "Untitled";
                if (url === "about:blank") return "Blank Page";
                try {
                    const parsedUrl = new URL(url);
                    let title = parsedUrl.hostname.replace(/^www\./, '');
                    if (parsedUrl.pathname !== '/' && parsedUrl.pathname.length > 1) {
                        const pathPart = parsedUrl.pathname.split('/').pop(); // Get last part of path
                        if (pathPart) title = pathPart + " - " + title;
                    }
                    return title || "Untitled";
                } catch (e) {
                    // If not a valid URL, use the string itself, truncated
                    return url.length > 30 ? url.substring(0, 27) + "..." : url;
                }
            }
        }
      // ===== END BROWSER_APP.JS =====
        const APP_DEFINITIONS = {
            myComputer: {
                title: "My Computer",
                icon: "https://win98icons.alexmeub.com/icons/png/computer_explorer-0.png",
                content: () => `
                    <div style="display: flex; flex-direction: column; height: 100%; font-size:11px;">
                        <div style="padding: 2px 5px; border-bottom: 1px solid #808080; background: #c0c0c0;"><u>F</u>ile <u>E</u>dit <u>V</u>iew <u>H</u>elp</div>
                        <div style="padding:10px; flex-grow:1; background: white;">
                            <ul style="list-style-type:none; padding-left:5px; margin-top:0;">
                                <li style="margin-bottom:5px;"><img src="https://win98icons.alexmeub.com/icons/png/drive_3_5-0.png" style="width:20px; height:20px; vertical-align:middle; margin-right:5px;"> 3½ Floppy (A:)</li>
                                <li style="margin-bottom:5px;"><img src="https://win98icons.alexmeub.com/icons/png/drive_cd_rom-1.png" style="width:20px; height:20px; vertical-align:middle; margin-right:5px;"> (C:) Local Disk</li>
                                <li style="margin-bottom:5px;"><img src="https://win98icons.alexmeub.com/icons/png/folder_network_cool-0.png" style="width:20px; height:20px; vertical-align:middle; margin-right:5px;"> Network Neighborhood</li>
                                <li style="margin-bottom:5px;"><img src="https://win98icons.alexmeub.com/icons/png/settings_gear_cool-0.png" style="width:20px; height:20px; vertical-align:middle; margin-right:5px;"> Control Panel</li>
                            </ul>
                        </div>
                        <div style="padding: 2px 5px; border-top: 1px solid #808080; background: #c0c0c0;">4 object(s)</div>
                    </div>`
            },
            notepad: {
                title: "Untitled - Notepad",
                icon: "https://win98icons.alexmeub.com/icons/png/notepad-0.png",
                content: () => `
                    <div style="display: flex; flex-direction: column; height: 100%; font-size:11px;">
                        <div style="padding: 2px 5px; border-bottom: 1px solid #808080; background: #c0c0c0;">
                            <u>F</u>ile <u>E</u>dit <u>S</u>earch <u>H</u>elp
                        </div>
                        <textarea style="width: 100%; height: 100%; border: none; font-family: 'Lucida Console', 'Courier New', monospace; font-size:12px; resize:none; box-sizing: border-box; padding:2px;" placeholder=""></textarea>
                    </div>`
            },
            recycleBin: {
                title: "Recycle Bin",
                icon: "https://win98icons.alexmeub.com/icons/png/recycle_bin_empty-0.png",
                iconFull: "https://win98icons.alexmeub.com/icons/png/recycle_bin_full_cool-0.png",
                content: () => `<div style="padding:10px; text-align:center; flex-grow:1; display:flex; flex-direction:column; justify-content:center; align-items:center; background:white;"><img src="https://win98icons.alexmeub.com/icons/png/recycle_bin_empty_cool-0.png" style="width:48px; height:48px; display:block; margin-bottom:10px;"><p>Recycle Bin is empty.</p></div>`
            },
            calculator: {
                title: "Calculator",
                icon: "https://win98icons.alexmeub.com/icons/png/calculator-0.png",
                content: () => `
                    <div style="display: flex; flex-direction: column; height: 100%; background: #c0c0c0; padding: 5px; font-family: 'MS Sans Serif', Arial; font-size:11px;">
                        <div style="padding: 0px 3px 3px 3px;"><u>E</u>dit <u>V</u>iew <u>H</u>elp</div>
                        <input type="text" readonly value="0" style="width: calc(100% - 0px); margin-bottom: 5px; text-align: right; padding: 3px 5px; border: 1px inset #808080; background: white; height:24px; box-sizing:border-box; font-size:14px;">
                        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; flex-grow:1;">
                            ${['', 'Backspace', 'CE', 'C', 
                            'MC', '7', '8', '9', '/', 'sqrt',
                            'MR', '4', '5', '6', '*', '%',
                            'MS', '1', '2', '3', '-', '1/x',
                            'M+', '0', '+/-', '.', '+', '='
                            ].map(key => {
                                let style = "border: 1px outset #dfdfdf; background: #c0c0c0; aspect-ratio: 1.2 / 1; font-size:10px; padding:0;";
                                if (['/', '*', '-', '+', '='].includes(key)) style += "color:red;";
                                if (['Backspace', 'CE', 'C'].includes(key)) style += "color:red;";
                                if (['MC', 'MR', 'MS', 'M+'].includes(key)) style += "color:blue;";
                                if (key === '') return '<div></div>'; // Empty cell for layout
                                return `<button style="${style}" onclick="alert('Calculator button ${key} clicked - not implemented')">${key}</button>`
                            }).join('')}
                        </div>
                    </div>`
            },
            shutdownDialog: {
                title: "Shut Down Windows",
                icon: "https://win98icons.alexmeub.com/icons/png/shut_down_cool-0.png",
                isDialog: true,
                content: () => `
                    <div style="text-align: center; padding: 20px 20px 10px 20px; background: #c0c0c0; height:100%; display:flex; flex-direction:column; justify-content:space-around;">
                        <div>
                            <img src="https://win98icons.alexmeub.com/icons/png/computer_shut_down_cool-2.png" alt="Shut down" style="width: 32px; height: 32px; margin-bottom: 15px; float:left; margin-right:15px;">
                            <p style="text-align:left; margin-top:0;">Are you sure you want to:</p>
                            <div style="margin-bottom: 20px; text-align:left;">
                                <label style="display:block; margin-bottom:5px;"><input type="radio" name="shutdownAction" value="shutdown" checked> Shut down the computer?</label>
                                <label style="display:block; margin-bottom:5px;"><input type="radio" name="shutdownAction" value="restart"> Restart the computer?</label>
                                <label style="display:block;"><input type="radio" name="shutdownAction" value="msdos"> Restart in MS-DOS mode?</label>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:center;">
                            <button class="win95-button" onclick="alert('Okay, performing action... (not really!)'); this.closest('.window').querySelector('.window-close-btn').click();">Yes</button>
                            <button class="win95-button" onclick="this.closest('.window').querySelector('.window-close-btn').click();">No</button>
                            <button class="win95-button" onclick="alert('Help not available for shutdown.');">Help</button>
                        </div>
                    </div>
                `
            },
            // Add this to your existing APP_DEFINITIONS object
            internetBrowser: {
                title: "Internet Browser", // Or "Netscape", "Explorer"
                icon: "https://win98icons.alexmeub.com/icons/png/msie2-0.png", // Classic IE icon
                defaultWidth: 700, // Browser windows are usually larger
                defaultHeight: 500,
                // content and init will be handled by the BrowserApp class
                // We'll call a static method to get HTML and then an init method
                generateContent: (windowInstanceId, webviewId) => BrowserApp.generateInitialHTML(webviewId),
                initApp: (windowEl, windowInstanceId, webviewId) => {
                    return new BrowserApp(windowEl, windowInstanceId, webviewId);
                }
            },
        };

        document.addEventListener('DOMContentLoaded', () => {
            const clockElement = document.getElementById('clock');
            const startButton = document.getElementById('startButton');
            const startMenu = document.getElementById('startMenu');
            const desktop = document.getElementById('desktop');
            const windowTemplate = document.getElementById('windowTemplate');
            const taskbarWindows = document.getElementById('taskbarWindows');

            let highestZIndex = 100;
            let openWindows = {}; // instanceId: { element, taskbarButton, appId, originalRect, isMinimized, isMaximized }
            let windowIdCounter = 0;

            // --- Clock ---
            function updateClock() {
                const now = new Date();
                const hours = now.getHours();
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayHours = (hours % 12) || 12; // Convert 0 to 12 for 12 AM
                clockElement.textContent = `${displayHours}:${minutes} ${ampm}`;
            }
            setInterval(updateClock, 1000); // Update every second
            updateClock(); // Initial call

            // --- Start Menu ---
            startButton.addEventListener('click', (event) => {
                event.stopPropagation();
                startMenu.style.display = startMenu.style.display === 'flex' ? 'none' : 'flex';
                if (startMenu.style.display === 'flex') {
                    startButton.style.borderStyle = 'inset';
                } else {
                    startButton.style.borderStyle = 'outset';
                }
            });

            document.addEventListener('click', (event) => {
                if (startMenu.style.display === 'flex' && !startMenu.contains(event.target) && event.target !== startButton && !startButton.contains(event.target)) {
                    startMenu.style.display = 'none';
                    startButton.style.borderStyle = 'outset';
                }
                 // Deselect desktop icons if clicking on empty desktop or taskbar
                if (event.target === desktop || event.target.closest('.taskbar')) {
                    if (!event.target.closest('.desktop-icon')) { // Don't deselect if clicking an icon itself
                         deselectAllDesktopIcons();
                    }
                }
            });

            // --- Desktop Icon Selection ---
            function deselectAllDesktopIcons() {
                document.querySelectorAll('.desktop-icon.selected').forEach(icon => {
                    icon.classList.remove('selected');
                });
            }

            // --- Window Management ---
            function createWindow(appId) {
                startMenu.style.display = 'none';
                startButton.style.borderStyle = 'outset';

                const appDef = APP_DEFINITIONS[appId];
                if (!appDef) {
                    console.error("App definition not found for:", appId);
                    return;
                }

                // Prevent multiple instances for non-dialog apps
                if (!appDef.isDialog) {
                    const existingInstance = Object.values(openWindows).find(ow => ow.appId === appId && ow.element && document.body.contains(ow.element));
                    if (existingInstance) {
                        if (existingInstance.isMinimized) {
                            toggleMinimizeWindow(existingInstance.element);
                        } else {
                            focusWindow(existingInstance.element);
                        }
                        return;
                    }
                }

                const windowInstanceId = `window-${appId}-${windowIdCounter++}`;
                const windowEl = windowTemplate.content.firstElementChild.cloneNode(true);
                windowEl.dataset.appId = appId;
                windowEl.dataset.instanceId = windowInstanceId;

                // Set window title bar icon and title
                windowEl.querySelector('.window-titlebar-icon').src = appDef.icon;
                windowEl.querySelector('.window-titlebar-icon').alt = appDef.title; // Use appDef.title for alt
                windowEl.querySelector('.window-title').textContent = appDef.title;

                // --- NEW: Generate webviewId if needed by the app ---
                let webviewId = null;
                // A more generic check could be a flag in appDef, e.g., appDef.requiresWebviewId
                // For now, we'll assume if generateContent exists, it might need it, or check specific app ID.
                if (appId === 'internetBrowser' || (appDef.generateContent && appDef.title === "Internet Browser")) { // Example condition
                    webviewId = `webview-${windowInstanceId}`;
                }

                // --- NEW: Use appDef.generateContent for dynamic content, otherwise fallback ---
                if (appDef.generateContent && typeof appDef.generateContent === 'function') {
                    windowEl.querySelector('.window-content').innerHTML = appDef.generateContent(windowInstanceId, webviewId);
                } else { // Fallback for apps with static content or older definitions
                    windowEl.querySelector('.window-content').innerHTML = typeof appDef.content === 'function' ? appDef.content() : appDef.content;
                }

                // Default size for new windows, can be overridden by appDef
                let defaultWidth = 450;
                let defaultHeight = 300;

                // --- NEW: Use appDef.defaultWidth/Height if specified ---
                if (appDef.defaultWidth) {
                    defaultWidth = appDef.defaultWidth;
                }
                if (appDef.defaultHeight) {
                    defaultHeight = appDef.defaultHeight;
                }

                // Apply sizes and positions
                if (appDef.isDialog) {
                    // For dialogs, use their specific default sizes if provided, or fallback
                    defaultWidth = appDef.defaultWidth || 380;
                    defaultHeight = appDef.defaultHeight || 220;
                    windowEl.style.minWidth = appDef.minWidth || '300px'; // Allow appDef to specify min sizes
                    windowEl.style.minHeight = appDef.minHeight || '180px';
                    windowEl.style.left = `${Math.max(0, (desktop.offsetWidth - defaultWidth) / 2)}px`;
                    windowEl.style.top = `${Math.max(0, (desktop.offsetHeight - defaultHeight) / 3)}px`;
                } else {
                    // For regular windows, random position
                    windowEl.style.left = `${Math.floor(Math.random() * Math.max(0, (desktop.offsetWidth - defaultWidth - 40))) + 20}px`;
                    windowEl.style.top = `${Math.floor(Math.random() * Math.max(0, (desktop.offsetHeight - defaultHeight - 40))) + 20}px`;
                }
                windowEl.style.width = `${defaultWidth}px`;
                windowEl.style.height = `${defaultHeight}px`;


                highestZIndex++;
                windowEl.style.zIndex = highestZIndex;

                desktop.appendChild(windowEl); // IMPORTANT: Append to DOM before initializing app logic that might need the element

                Object.values(openWindows).forEach(ow => {
                    if (ow.element) { // Check if element exists (it might if this is not the first window)
                        ow.element.classList.add('inactive');
                    }
                });

                const newWindowData = {
                    element: windowEl,
                    taskbarButton: null,
                    appId: appId,
                    originalRect: { // <<<< SET INITIAL originalRect HERE
                        left: windowEl.style.left,
                        top: windowEl.style.top,
                        width: windowEl.style.width,
                        height: windowEl.style.height
                    },
                    isMinimized: false,
                    isMaximized: false,
                    appInstance: null
                };
                openWindows[windowInstanceId] = newWindowData;

                // --- NEW: Call appDef.initApp if it exists to initialize app-specific logic ---
                if (appDef.initApp && typeof appDef.initApp === 'function') {
                    newWindowData.appInstance = appDef.initApp(windowEl, windowInstanceId, webviewId);
                }

                // Setup standard window controls
                if (!appDef.isDialog) {
                    makeDraggable(windowEl);
                    makeResizable(windowEl);
                    addWindowToTaskbar(windowEl, appDef.title, appDef.icon, windowInstanceId);
                    windowEl.querySelector('.window-minimize-btn').addEventListener('click', () => toggleMinimizeWindow(windowEl));
                    windowEl.querySelector('.window-maximize-btn').addEventListener('click', () => toggleMaximizeWindow(windowEl));
                } else {
                    // Dialogs typically don't have minimize/maximize, but can be draggable
                    windowEl.querySelector('.window-minimize-btn').style.display = 'none';
                    windowEl.querySelector('.window-maximize-btn').style.display = 'none';
                    makeDraggable(windowEl); // Allow dragging dialogs
                }

                windowEl.querySelector('.window-close-btn').addEventListener('click', () => closeWindow(windowEl));
                windowEl.addEventListener('mousedown', () => focusWindow(windowEl), true); // Use capture for focus

                focusWindow(windowEl);
                return windowEl;
            }

            // New function: makeResizable
            function makeResizable(element) {
                const handles = element.querySelectorAll('.resize-handle');
                let isResizing = false;
                let currentHandle = null;
                let startX, startY, startWidth, startHeight, startLeft, startTop;

                const minWidth = parseInt(window.getComputedStyle(element).minWidth) || 150;
                const minHeight = parseInt(window.getComputedStyle(element).minHeight) || 100;

                handles.forEach(handle => {
                    handle.addEventListener('mousedown', (e) => {
                        const windowData = openWindows[element.dataset.instanceId];
                        if (windowData && windowData.isMaximized) return; // Don't resize if maximized

                        e.stopPropagation(); // Prevent window drag
                        isResizing = true;
                        currentHandle = handle;
                        startX = e.clientX;
                        startY = e.clientY;
                        startWidth = element.offsetWidth;
                        startHeight = element.offsetHeight;
                        startLeft = element.offsetLeft;
                        startTop = element.offsetTop;

                        // Bring to front when starting resize
                        focusWindow(element);
                        document.body.style.cursor = window.getComputedStyle(currentHandle).cursor; // Set body cursor
                    });
                });

                document.addEventListener('mousemove', (e) => {
                    if (!isResizing || !currentHandle) return;
                    e.preventDefault();

                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;

                    let newWidth = startWidth;
                    let newHeight = startHeight;
                    let newLeft = startLeft;
                    let newTop = startTop;

                    if (currentHandle.classList.contains('resize-handle-e')) {
                        newWidth = Math.max(minWidth, startWidth + dx);
                    } else if (currentHandle.classList.contains('resize-handle-w')) {
                        newWidth = Math.max(minWidth, startWidth - dx);
                        newLeft = startLeft + dx;
                        if (newWidth === minWidth) newLeft = startLeft + (startWidth - minWidth);
                    }

                    if (currentHandle.classList.contains('resize-handle-s')) {
                        newHeight = Math.max(minHeight, startHeight + dy);
                    } else if (currentHandle.classList.contains('resize-handle-n')) {
                        newHeight = Math.max(minHeight, startHeight - dy);
                        newTop = startTop + dy;
                        if (newHeight === minHeight) newTop = startTop + (startHeight - minHeight);
                    }

                    // Corners
                    if (currentHandle.classList.contains('resize-handle-se')) {
                        newWidth = Math.max(minWidth, startWidth + dx);
                        newHeight = Math.max(minHeight, startHeight + dy);
                    } else if (currentHandle.classList.contains('resize-handle-sw')) {
                        newWidth = Math.max(minWidth, startWidth - dx);
                        newHeight = Math.max(minHeight, startHeight + dy);
                        newLeft = startLeft + dx;
                        if (newWidth === minWidth) newLeft = startLeft + (startWidth - minWidth);
                    } else if (currentHandle.classList.contains('resize-handle-ne')) {
                        newWidth = Math.max(minWidth, startWidth + dx);
                        newHeight = Math.max(minHeight, startHeight - dy);
                        newTop = startTop + dy;
                        if (newHeight === minHeight) newTop = startTop + (startHeight - minHeight);
                    } else if (currentHandle.classList.contains('resize-handle-nw')) {
                        newWidth = Math.max(minWidth, startWidth - dx);
                        newHeight = Math.max(minHeight, startHeight - dy);
                        newLeft = startLeft + dx;
                        newTop = startTop + dy;
                        if (newWidth === minWidth) newLeft = startLeft + (startWidth - minWidth);
                        if (newHeight === minHeight) newTop = startTop + (startHeight - minHeight);
                    }

                    // Boundary checks (simple version, against desktop edges)
                    const desktopRect = desktop.getBoundingClientRect();
                    if (newLeft < 0) { newWidth += newLeft; newLeft = 0; }
                    if (newTop < 0) { newHeight += newTop; newTop = 0; }
                    if (newLeft + newWidth > desktopRect.width) { newWidth = desktopRect.width - newLeft; }
                    if (newTop + newHeight > desktopRect.height) { newHeight = desktopRect.height - newTop; }


                    element.style.width = `${newWidth}px`;
                    element.style.height = `${newHeight}px`;
                    element.style.left = `${newLeft}px`;
                    element.style.top = `${newTop}px`;
                });

                document.addEventListener('mouseup', () => {
                    if (isResizing) {
                        isResizing = false;
                        currentHandle = null;
                        document.body.style.cursor = 'default'; // Reset body cursor
                        // Update originalRect if window was resized (for maximize/restore)
                        const windowData = openWindows[element.dataset.instanceId];
                        if (windowData && !windowData.isMaximized) {
                            windowData.originalRect = {
                                left: element.style.left,
                                top: element.style.top,
                                width: element.style.width,
                                height: element.style.height,
                            };
                        }
                    }
                });
            }

            function focusWindow(windowEl) {
                if (!windowEl || !document.body.contains(windowEl)) return;

                const instanceId = windowEl.dataset.instanceId;
                const windowData = openWindows[instanceId];
                if (!windowData) return;

                if (windowData.isMinimized) {
                    toggleMinimizeWindow(windowEl);
                    return;
                }

                // --- NEW: Manage inactive class ---
                // Remove 'inactive' from the currently focused window
                windowEl.classList.remove('inactive');

                // Add 'inactive' to all OTHER windows
                Object.values(openWindows).forEach(ow => {
                    if (ow.element && ow.element !== windowEl) {
                        ow.element.classList.add('inactive');
                    }
                });
                // --- END NEW ---


                highestZIndex++;
                windowEl.style.zIndex = highestZIndex;

                document.querySelectorAll('.taskbar-button').forEach(btn => btn.classList.remove('active'));
                if (windowData.taskbarButton) {
                    windowData.taskbarButton.classList.add('active');
                    windowData.taskbarButton.classList.remove('minimized');
                }
                deselectAllDesktopIcons();
            }

            function closeWindow(windowEl) {
                const instanceId = windowEl.dataset.instanceId;
                if (openWindows[instanceId]) {
                    if (openWindows[instanceId].taskbarButton) {
                        openWindows[instanceId].taskbarButton.remove();
                    }
                    delete openWindows[instanceId];
                }
                windowEl.remove();
            }

            function addWindowToTaskbar(windowEl, title, iconSrc, instanceId) {
                const taskbarButton = document.createElement('button');
                taskbarButton.className = 'taskbar-button';
                taskbarButton.dataset.windowInstanceId = instanceId;

                const img = document.createElement('img');
                img.src = iconSrc;
                img.alt = ""; // Decorative
                taskbarButton.appendChild(img);
                
                const titleText = document.createTextNode(title.length > 18 ? title.substring(0,15) + '...' : title);
                taskbarButton.appendChild(titleText);
                
                taskbarButton.addEventListener('click', () => {
                    const winData = openWindows[instanceId];
                    if (winData) {
                        // If it's the active window and not minimized, minimize it (classic taskbar toggle)
                        if (winData.taskbarButton.classList.contains('active') && !winData.isMinimized) {
                            toggleMinimizeWindow(winData.element);
                        } else { // Otherwise, focus or restore it
                           focusWindow(winData.element); // focusWindow handles un-minimizing
                        }
                    }
                });

                taskbarWindows.appendChild(taskbarButton);
                openWindows[instanceId].taskbarButton = taskbarButton;
            }

            function makeDraggable(element) {
                const titleBar = element.querySelector('.window-titlebar');
                let offsetX, offsetY, isDragging = false;

                titleBar.addEventListener('mousedown', (e) => {
                    const windowData = openWindows[element.dataset.instanceId];
                    if (windowData && windowData.isMaximized) return;
                    if (e.target.closest('.window-controls button')) return;

                    isDragging = true;
                    offsetX = e.clientX - element.getBoundingClientRect().left;
                    offsetY = e.clientY - element.getBoundingClientRect().top;
                    titleBar.style.cursor = 'grabbing';
                    // focusWindow is called by the window's mousedown listener
                });

                document.addEventListener('mousemove', (e) => {
                    if (!isDragging) return;
                    e.preventDefault(); // Prevent text selection while dragging

                    let newX = e.clientX - offsetX;
                    let newY = e.clientY - offsetY;

                    const desktopRect = desktop.getBoundingClientRect();
                    const winRect = element.getBoundingClientRect();

                    // Clamp within desktop boundaries
                    newX = Math.max(0, Math.min(newX, desktopRect.width - winRect.width));
                    newY = Math.max(0, Math.min(newY, desktopRect.height - winRect.height));
                    
                    element.style.left = `${newX}px`;
                    element.style.top = `${newY}px`;
                });

                document.addEventListener('mouseup', () => {
                    if (isDragging) {
                        isDragging = false;
                        titleBar.style.cursor = 'grab';
                    }
                });
            }

            function toggleMinimizeWindow(windowEl) {
                const instanceId = windowEl.dataset.instanceId;
                const windowData = openWindows[instanceId];
                if (!windowData) return;

                windowData.isMinimized = !windowData.isMinimized;
                if (windowData.isMinimized) {
                    // Store current position if not maximized, before hiding
                    if (!windowData.isMaximized) {
                         windowData.originalRectBeforeMinimize = {
                            left: windowEl.style.left,
                            top: windowEl.style.top,
                            width: windowEl.style.width,
                            height: windowEl.style.height
                        };
                    }
                    windowEl.style.display = 'none';
                    if (windowData.taskbarButton) {
                        windowData.taskbarButton.classList.add('minimized');
                        windowData.taskbarButton.classList.remove('active');
                    }
                    // TODO: Focus next available window or desktop
                } else { // Un-minimizing
                    windowEl.style.display = 'flex';
                    // Restore position if it was stored
                    if (windowData.originalRectBeforeMinimize && !windowData.isMaximized) {
                        windowEl.style.left = windowData.originalRectBeforeMinimize.left;
                        windowEl.style.top = windowData.originalRectBeforeMinimize.top;
                        windowEl.style.width = windowData.originalRectBeforeMinimize.width;
                        windowEl.style.height = windowData.originalRectBeforeMinimize.height;
                    }
                    focusWindow(windowEl); // This will set taskbar button active
                }
            }

            function toggleMaximizeWindow(windowEl) {
                const instanceId = windowEl.dataset.instanceId;
                const windowData = openWindows[instanceId];
                if (!windowData || windowData.isMinimized) return; // Don't maximize if minimized

                const maximizeBtn = windowEl.querySelector('.window-maximize-btn');
                const titleBar = windowEl.querySelector('.window-titlebar'); // Get titleBar reference

                if (windowData.isMaximized) { // ---- RESTORE ----
                    if (windowData.originalRect) {
                        windowEl.style.left = windowData.originalRect.left;
                        windowEl.style.top = windowData.originalRect.top;
                        windowEl.style.width = windowData.originalRect.width;
                        windowEl.style.height = windowData.originalRect.height;
                    } else {
                        // Fallback: This should ideally not be hit if originalRect is always set.
                        // This could happen if a window is created, never moved/resized, and then maximized.
                        // Let's try to get its initial computed size or a reasonable default.
                        const initialWidth = windowEl.style.width || `${windowEl.offsetWidth}px`;
                        const initialHeight = windowEl.style.height || `${windowEl.offsetHeight}px`;
                        const initialLeft = windowEl.style.left || `${(desktop.clientWidth - parseInt(initialWidth)) / 2}px`;
                        const initialTop = windowEl.style.top || `${(desktop.clientHeight - parseInt(initialHeight)) / 3}px`;

                        windowEl.style.left = initialLeft;
                        windowEl.style.top = initialTop;
                        windowEl.style.width = initialWidth;
                        windowEl.style.height = initialHeight;
                        console.warn("Restoring window without originalRect, using current/default dimensions.", windowEl);
                    }

                    windowData.isMaximized = false;
                    windowEl.classList.remove('maximized');
                    maximizeBtn.textContent = '1'; // Maximize symbol (Marlett)
                    maximizeBtn.title = 'Maximize';
                    titleBar.style.cursor = 'grab'; // Restore draggable cursor

                } else { // ---- MAXIMIZE ----
                    // Store current dimensions in originalRect IF NOT ALREADY SET by drag/resize.
                    // If originalRect exists, it means the user has already positioned/sized it,
                    // so we want to preserve that specific state for the next restore.
                    // If it doesn't exist, or if the window hasn't been manually changed from its initial spawn state,
                    // then capture the current state.
                    if (!windowData.originalRect ||
                        (windowData.originalRect.left === windowEl.style.left &&
                         windowData.originalRect.top === windowEl.style.top &&
                         windowData.originalRect.width === (windowEl.style.width || `${windowEl.offsetWidth}px`) &&
                         windowData.originalRect.height === (windowEl.style.height || `${windowEl.offsetHeight}px`))) {
                        // If originalRect is not set, or if it matches the current state (meaning no drag/resize happened since last originalRect set)
                        // then update originalRect to the current state before maximizing.
                        windowData.originalRect = {
                            left: windowEl.style.left,
                            top: windowEl.style.top,
                            width: windowEl.style.width || `${windowEl.offsetWidth}px`, // Use current style or offsetWidth
                            height: windowEl.style.height || `${windowEl.offsetHeight}px` // Use current style or offsetHeight
                        };
                    }
                    // If windowData.originalRect was already set by a previous drag/resize, we *don't* overwrite it here.
                    // We want to restore to *that specific user-defined size/position*.

                    windowEl.style.left = '0px';
                    windowEl.style.top = '0px';
                    windowEl.style.width = `${desktop.clientWidth}px`;
                    windowEl.style.height = `${desktop.clientHeight}px`;

                    windowData.isMaximized = true;
                    windowEl.classList.add('maximized');
                    maximizeBtn.textContent = '2'; // Restore symbol (Marlett)
                    maximizeBtn.title = 'Restore';
                    titleBar.style.cursor = 'default'; // Non-draggable cursor when maximized
                }
                focusWindow(windowEl);
            }

            // --- Icon/Menu Item Click Handlers ---
            document.querySelectorAll('.desktop-icon').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent desktop click from deselecting
                    deselectAllDesktopIcons();
                    item.classList.add('selected');
                });
                item.addEventListener('dblclick', (e) => {
                    const appId = item.dataset.appId;
                    if (appId) {
                        createWindow(appId);
                    }
                });
            });
            
            document.querySelectorAll('.start-menu-item').forEach(item => {
                 item.addEventListener('click', (e) => {
                    if (item.classList.contains('disabled')) return;
                    const appId = item.dataset.appId;
                    
                    if (item.id === 'shutdownButtonTrigger') {
                        createWindow("shutdownDialog");
                        return;
                    }
                    if (appId) {
                        createWindow(appId);
                    }
                });
            });
        });
