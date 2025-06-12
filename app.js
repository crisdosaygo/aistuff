// app.js
  import { BrowserApp } from './browser.js';
  import { networkExplorerAppDefinition } from './network-explorer.js';
  import { notepadAppDefinition } from './notepad.js';
  import { calculatorAppDefinition } from './calculator.js';
  import { recycleBinAppDefinition } from './recycle-bin.js';

  const APP_DEFINITIONS = {
      networkExplorer: networkExplorerAppDefinition,
      notepad: notepadAppDefinition,
      recycleBin: recycleBinAppDefinition,
      calculator: calculatorAppDefinition,
      shutdownDialog: {
          title: "Shut Down Windows",
          isDialog: true,
          content: () => `
              <div style="text-align: center; padding: 20px 20px 10px 20px; background: #c0c0c0; height:100%; display:flex; flex-direction:column; justify-content:space-around;">
                  <div style="display: flex; flex-direction: row;">
                      <img src="./shut_down_with_computer-0.png" alt="Shut down" style="width: 32px; height: 32px; margin-bottom: 15px; float:left; margin-right:15px;">
                      <div style="margin-bottom: 20px; text-align:left;">
                        <p style="text-align:left; margin-top:0;">Are you sure you want to:</p>
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
      internetBrowser: {
          // netscape: true, // This was in your provided app.js, BrowserApp constructor now has netscapeFlag_unused
          title: "Internet Browser",
          icon: "./search_web-0.png",
          defaultWidth: 700,
          defaultHeight: 500,
          generateContent: (windowInstanceId, webviewId) => BrowserApp.generateInitialHTML(webviewId),
          initApp: (windowEl, windowInstanceId, webviewId, appDefinition) => {
              // Assuming BrowserApp's 4th param is netscape-like flag.
              // For "Internet Browser", let's assume it's NOT Netscape-styled.
              return new BrowserApp(windowEl, windowInstanceId, webviewId, false, appDefinition);
          }
      },
      internetExplorer: {
          // netscape: false, // This was in your provided app.js
          title: "Internet Explorer",
          icon: "./msie2-0.png",
          defaultWidth: 700,
          defaultHeight: 500,
          generateContent: (windowInstanceId, webviewId) => BrowserApp.generateInitialHTML(webviewId),
          initApp: (windowEl, windowInstanceId, webviewId, appDefinition) => {
              return new BrowserApp(windowEl, windowInstanceId, webviewId, false, appDefinition);
          }
      },
      netscapeNavigator: {
          // netscape: true, // This was in your provided app.js
          title: "Netscape Navigator",
          icon: "./n2-2.png",
          defaultWidth: 700,
          defaultHeight: 500,
          generateContent: (windowInstanceId, webviewId) => BrowserApp.generateInitialHTML(webviewId),
          initApp: (windowEl, windowInstanceId, webviewId, appDefinition) => {
              return new BrowserApp(windowEl, windowInstanceId, webviewId, true, appDefinition); // Pass true for Netscape style
          }
      },
  };
  window.APP_DEFINITIONS = APP_DEFINITIONS;

  function debounce(func, wait) { /* ... (same as your latest) ... */
      let timeout;
      return function executedFunction(...args) {
          const context = this;
          const later = () => { timeout = null; func.apply(context, args); };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
      };
  }
  function getLuminance(hexColor) { /* ... (same as your latest) ... */
      if (!hexColor) return 0;
      hexColor = hexColor.replace('#', '');
      if (hexColor.length === 3) hexColor = hexColor.split('').map(char => char + char).join('');
      if (hexColor.length !== 6) return 0;
      const r = parseInt(hexColor.substring(0, 2), 16);
      const g = parseInt(hexColor.substring(2, 4), 16);
      const b = parseInt(hexColor.substring(4, 6), 16);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function updateThemeForDesktopBackground(desktopBgColor) { /* ... (same as your latest) ... */
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty('--desktop-bg-color', desktopBgColor);
      const luminance = getLuminance(desktopBgColor);
      let newIconTextColor = (luminance > 128) ? 'black' : 'white';
      rootStyle.setProperty('--desktop-icon-text-color', newIconTextColor);
  }
  window.updateThemeForDesktopBackground = updateThemeForDesktopBackground;

  function updateStartMenuItemsState() { /* ... (same as your latest) ... */
    const startMenu = document.getElementById('startMenu');
    if (!startMenu) return;
    const recycleBinApi = window.APP_DEFINITIONS?.recycleBin?.api;
    if (!recycleBinApi || typeof recycleBinApi.getRecycledItemIds !== 'function') return;
    const recycledAppIds = recycleBinApi.getRecycledItemIds();
    const startMenuItems = startMenu.querySelectorAll('.start-menu-item[data-app-id]');
    startMenuItems.forEach(item => {
        const appId = item.dataset.appId;
        if (appId === 'recycleBin' || appId === 'shutdownDialog') {
            item.style.display = ''; item.classList.remove('disabled');
            item.style.opacity = '1'; item.style.pointerEvents = 'auto';
            return;
        }
        if (recycledAppIds.includes(appId)) item.style.display = 'none';
        else {
            item.style.display = ''; item.classList.remove('disabled');
            item.style.opacity = '1'; item.style.pointerEvents = 'auto';
        }
    });
  }
  window.Win9xSystem = window.Win9xSystem || {};
  window.Win9xSystem.updateStartMenuItemsState = updateStartMenuItemsState;

  async function preloadAppImages(onProgress) {
      const imageUrls = [];
      Object.values(window.APP_DEFINITIONS || {}).forEach(appDef => {
          if (appDef.icon && !imageUrls.includes(appDef.icon)) imageUrls.push(appDef.icon);
          if (appDef.iconFull && !imageUrls.includes(appDef.iconFull)) imageUrls.push(appDef.iconFull);
          if (appDef.menuBar) {
              appDef.menuBar.forEach(menu => {
                  menu.items.forEach(item => {
                      if (item.icon && !imageUrls.includes(item.icon)) imageUrls.push(item.icon);
                  });
              });
          }
      });
      // Use your refined list of icons
      const explicitIconUrls = [
          './internet_connection_wiz-0.png', './browser-toolbar-icons-color.png', './browser-toolbar-icons-gray.png',
          './calculator-0.png', './channels-4.png', './computer_2-1.png',
          // './computer_explorer-0.png', // My Computer icon, removed
          './directory_closed_cool-0.png', './directory_open_cool-0.png',
          './entire_network_globe-0.png',
          './globe_map-0.png', './help_book_cool-0.png',
          './html-0.png', './msie2-0.png', './n1.png', './n2-2.png', './n2.png', './n3.png', './n4.png',
          './netscape-frame.gif', './netscape.gif', './network_cool_2pcs-4.png',
          './network_normal_two_pcs-0.png', './network_three_pcs-0.png', './notepad-0.png',
          './recycle_bin_empty-0.png', './recycle_bin_empty_cool-0.png',
          './recycle_bin_full_cool-0.png', './search_web-0.png', './settings_gear-0.png',
          './shut_down_normal-0.png', './template_world-4.png', './shut_down_with_computer-0.png',
          './windows-0.png',
      ];
      explicitIconUrls.forEach(url => { if (!imageUrls.includes(url)) imageUrls.push(url); });

      let loadedCount = 0;
      const totalAssets = imageUrls.length;
      if (totalAssets === 0) {
          if (typeof onProgress === 'function') onProgress(100);
          return Promise.resolve();
      }
      const promises = imageUrls.map(src => {
          return new Promise((resolve) => {
              if (src.startsWith('http://') || src.startsWith('https://')) {
                  loadedCount++;
                  if (typeof onProgress === 'function') onProgress((loadedCount / totalAssets) * 100);
                  resolve(); return;
              }
              const img = new Image();
              img.onload = img.onerror = () => {
                  if (img.onerror && !img.onload && !img.src.endsWith('.gif')) {
                       console.warn(`Failed to preload image: ${src}`);
                  }
                  loadedCount++;
                  if (typeof onProgress === 'function') onProgress((loadedCount / totalAssets) * 100);
                  resolve();
              };
              img.src = src;
          });
      });
      return Promise.all(promises);
  }

  document.addEventListener('DOMContentLoaded', async () => {
      console.log("DOM fully loaded and parsed. Starting app initialization...");
      if (window.SPLASH_API) window.SPLASH_API.setProgress(5);
      if (new URLSearchParams(window.location.search).has('debugsplash') && window.SPLASH_API && window.SPLASH_API.showDebugControls) {
          window.SPLASH_API.showDebugControls();
      }

      const clockElement = document.getElementById('clock');
      const startButton = document.getElementById('startButton');
      const startMenu = document.getElementById('startMenu');
      const desktop = document.getElementById('desktop');
      const windowTemplate = document.getElementById('windowTemplate');
      const taskbarWindows = document.getElementById('taskbarWindows');

      let highestZIndex = 100;
      let openWindows = {};
      let windowIdCounter = 0;
      window.openWindows = openWindows;
      window.focusWindow = focusWindow;

      if (window.SPLASH_API) {
          console.log("Starting asset preloading...");
          await preloadAppImages((percentage) => {
              window.SPLASH_API.setProgress(5 + (percentage * 0.80));
          });
          console.log("Asset preloading complete.");
          window.SPLASH_API.setProgress(85);
      } else {
          console.warn("SPLASH_API not found.");
      }

      // --- Core Function Definitions (from your latest app.js) ---
      function keepAllWindowsOnScreen() { /* ... (same as your latest) ... */
          if (!desktop) return;
          const desktopWidth = desktop.clientWidth;
          const desktopHeight = desktop.clientHeight;
          Object.values(openWindows).forEach(winData => {
              if (!winData || !winData.element || winData.isMinimized || winData.isMaximized) return;
              const windowEl = winData.element;
              let currentLeft = windowEl.offsetLeft, currentTop = windowEl.offsetTop;
              const currentWidth = windowEl.offsetWidth, currentHeight = windowEl.offsetHeight;
              let newLeft = currentLeft, newTop = currentTop;
              if (newLeft + currentWidth > desktopWidth) newLeft = desktopWidth - currentWidth;
              if (newTop + currentHeight > desktopHeight) newTop = desktopHeight - currentHeight;
              if (newLeft < 0) newLeft = 0;
              if (newTop < 0) newTop = 0;
              if (newLeft !== currentLeft || newTop !== currentTop) {
                  windowEl.style.left = newLeft + 'px';
                  windowEl.style.top = newTop + 'px';
                  if (winData.originalRect) {
                      winData.originalRect.left = windowEl.style.left;
                      winData.originalRect.top = windowEl.style.top;
                  }
              }
          });
      }
      const debouncedKeepOnScreen = debounce(keepAllWindowsOnScreen, 250);
      if (typeof ResizeObserver !== 'undefined') {
          const resizeObserver = new ResizeObserver(debouncedKeepOnScreen);
          resizeObserver.observe(desktop);
      } else {
          window.addEventListener('resize', debouncedKeepOnScreen);
      }

      function updateClock() { /* ... (same as your latest) ... */
          const now = new Date();
          const hours = now.getHours();
          const minutes = now.getMinutes().toString().padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = (hours % 12) || 12;
          clockElement.textContent = `${displayHours}:${minutes} ${ampm}`;
      }
      setInterval(updateClock, 1000); updateClock();

      startButton.addEventListener('click', (event) => { /* ... (same as your latest) ... */
          event.stopPropagation();
          const isVisible = startMenu.style.display === 'flex';
          startMenu.style.display = isVisible ? 'none' : 'flex';
          startButton.style.borderStyle = isVisible ? 'outset' : 'inset';
          if (!isVisible) startMenu.focus();
      });
      document.addEventListener('click', (event) => { /* ... (same as your latest for Start Menu) ... */
          if (startMenu.style.display === 'flex' && !startMenu.contains(event.target) && !startButton.contains(event.target)) {
              startMenu.style.display = 'none';
              startButton.style.borderStyle = 'outset';
          }
          // Desktop icon deselection is handled by desktop-icons.js
      }, {capture: true});

      // --- Window Management Functions (from your latest app.js) ---
      function createWindow(appId, dataForApp) { /* ... (same as your latest) ... */
          startMenu.style.display = 'none';
          startButton.style.borderStyle = 'outset';
          const appDef = APP_DEFINITIONS[appId];
          if (!appDef) { console.error("App definition not found for:", appId); return; }

          if (!appDef.isDialog) {
              const existingInstance = Object.values(openWindows).find(ow => ow.appId === appId && ow.element && document.body.contains(ow.element));
              if (existingInstance) {
                  if (existingInstance.isMinimized) toggleMinimizeWindow(existingInstance.element);
                  else focusWindow(existingInstance.element);
                  return;
              }
          }

          let appInstanceSpecificData = null;
          if (appId === 'networkExplorer' && typeof createWindow === 'function') {
              appInstanceSpecificData = createWindow;
          }

          const windowInstanceId = `window-${appId}-${windowIdCounter++}`;
          const windowEl = windowTemplate.content.firstElementChild.cloneNode(true);
          windowEl.dataset.appId = appId;
          windowEl.dataset.instanceId = windowInstanceId;
          if ( appDef.icon ) {
            windowEl.querySelector('.window-titlebar-icon').src = appDef.icon;
            windowEl.querySelector('.window-titlebar-icon').style.display = 'inline-block';
          } else {
            windowEl.querySelector('.window-titlebar-icon').style.display = 'none';
          }
          windowEl.querySelector('.window-titlebar-icon').alt = appDef.title;
          windowEl.querySelector('.window-title').textContent = appDef.title;

          if (appDef.activeTitleBarColor) {
              windowEl.dataset.customActiveTitlebarColor = appDef.activeTitleBarColor;
              if (appDef.activeTitleBarTextColor) {
                  windowEl.dataset.customActiveTitlebarTextColor = appDef.activeTitleBarTextColor;
              }
          }

          let webviewId = null;
          const isBrowserApp = ['internetBrowser', 'internetExplorer', 'netscapeNavigator'].includes(appId);
          if (isBrowserApp) webviewId = `webview-${windowInstanceId}`;

          if (appDef.generateContent) {
              windowEl.querySelector('.window-content').innerHTML = appDef.generateContent(windowInstanceId, webviewId);
          } else {
              windowEl.querySelector('.window-content').innerHTML = typeof appDef.content === 'function' ? appDef.content() : appDef.content;
          }

          const maxAllowedWidth = desktop.clientWidth - 20;
          const maxAllowedHeight = desktop.clientHeight - 20;
          let defaultWidth = appDef.defaultWidth || (appDef.isDialog ? 380 : 600);
          let defaultHeight = appDef.defaultHeight || (appDef.isDialog ? 220 : 450);
          defaultWidth = Math.min(defaultWidth, maxAllowedWidth);
          defaultHeight = Math.min(defaultHeight, maxAllowedHeight);
          const minW = parseInt(window.getComputedStyle(windowEl).minWidth) || 150;
          const minH = parseInt(window.getComputedStyle(windowEl).minHeight) || 100;
          defaultWidth = Math.max(defaultWidth, minW);
          defaultHeight = Math.max(defaultHeight, minH);
          windowEl.style.width = `${defaultWidth}px`;
          windowEl.style.height = `${defaultHeight}px`;

          if (appDef.isDialog) {
              windowEl.style.left = `${Math.max(0, (desktop.offsetWidth - defaultWidth) / 2)}px`;
              windowEl.style.top = `${Math.max(0, (desktop.offsetHeight - defaultHeight) / 3)}px`;
          } else {
              const randomOffsetX = Math.max(0, desktop.offsetWidth - defaultWidth - 40);
              const randomOffsetY = Math.max(0, desktop.offsetHeight - defaultHeight - 40);
              windowEl.style.left = `${Math.floor(Math.random() * randomOffsetX) + 20}px`;
              windowEl.style.top = `${Math.floor(Math.random() * randomOffsetY) + 20}px`;
          }

          highestZIndex++;
          windowEl.style.zIndex = highestZIndex;
          desktop.appendChild(windowEl);
          Object.values(openWindows).forEach(ow => { if (ow.element) ow.element.classList.add('inactive'); });

          const newWindowData = {
              element: windowEl, taskbarButton: null, appId: appId,
              originalRect: { left: windowEl.style.left, top: windowEl.style.top, width: windowEl.style.width, height: windowEl.style.height },
              isMinimized: false, isMaximized: false, appInstance: null
          };
          openWindows[windowInstanceId] = newWindowData;

          if (appDef.initApp) {
              newWindowData.appInstance = appDef.initApp(windowEl, windowInstanceId, webviewId, appDef, appInstanceSpecificData, dataForApp);
          }

          if (!appDef.isDialog) {
              makeDraggable(windowEl);
              makeResizable(windowEl);
              addWindowToTaskbar(windowEl, appDef.title, appDef.icon, windowInstanceId);
              windowEl.querySelector('.window-minimize-btn').addEventListener('click', () => toggleMinimizeWindow(windowEl));
              windowEl.querySelector('.window-maximize-btn').addEventListener('click', () => toggleMaximizeWindow(windowEl));
          } else {
              windowEl.querySelector('.window-minimize-btn').style.display = 'none';
              windowEl.querySelector('.window-maximize-btn').style.display = 'none';
              makeDraggable(windowEl);
          }
          windowEl.querySelector('.window-close-btn').addEventListener('click', () => closeWindow(windowEl));
          windowEl.addEventListener('pointerdown', () => focusWindow(windowEl), true);
          focusWindow(windowEl);
          if (!newWindowData.isMinimized && !newWindowData.isMaximized) keepSingleWindowOnScreen(windowEl, newWindowData);

          if (dataForApp && dataForApp.navigateToUrl && isBrowserApp) {
              const checkBrowserReadyAndNavigate = () => {
                  const winData = openWindows[windowInstanceId];
                  if (winData && winData.appInstance && typeof winData.appInstance.navigateTo === 'function') {
                      winData.appInstance.navigateTo(dataForApp.navigateToUrl);
                  } else if (winData && newWindowData.element && document.body.contains(newWindowData.element)) {
                      setTimeout(checkBrowserReadyAndNavigate, 200);
                  }
              };
              setTimeout(checkBrowserReadyAndNavigate, 100);
          }
          return windowEl;
      }
      function keepSingleWindowOnScreen(windowEl, winData) { /* ... (same as your latest) ... */
          if (!desktop || !windowEl || !winData || winData.isMinimized || winData.isMaximized) return;
          const desktopWidth = desktop.clientWidth, desktopHeight = desktop.clientHeight;
          let currentLeft = windowEl.offsetLeft, currentTop = windowEl.offsetTop;
          const currentWidth = windowEl.offsetWidth, currentHeight = windowEl.offsetHeight;
          let newLeft = currentLeft, newTop = currentTop;
          if (newLeft + currentWidth > desktopWidth) newLeft = desktopWidth - currentWidth;
          if (newTop + currentHeight > desktopHeight) newTop = desktopHeight - currentHeight;
          if (newLeft < 0) newLeft = 0;
          if (newTop < 0) newTop = 0;
          if (newLeft !== currentLeft || newTop !== currentTop) {
              windowEl.style.left = newLeft + 'px';
              windowEl.style.top = newTop + 'px';
              if (winData.originalRect) {
                  winData.originalRect.left = windowEl.style.left;
                  winData.originalRect.top = windowEl.style.top;
              }
          }
      }
      function makeResizable(element) { /* ... (same as your latest - with element-specific listeners) ... */
          const handles = element.querySelectorAll('.resize-handle');
          let isResizing = false, currentHandle = null;
          let startX, startY, startWidth, startHeight, startLeft, startTop;
          const minWidth = parseInt(window.getComputedStyle(element).minWidth) || 150;
          const minHeight = parseInt(window.getComputedStyle(element).minHeight) || 100;

          handles.forEach(handle => {
              handle.addEventListener('pointerdown', (e) => {
                  const windowData = openWindows[element.dataset.instanceId];
                  if (windowData && windowData.isMaximized) return;
                  e.stopPropagation(); isResizing = true; currentHandle = handle;
                  startX = e.clientX; startY = e.clientY;
                  startWidth = element.offsetWidth; startHeight = element.offsetHeight;
                  startLeft = element.offsetLeft; startTop = element.offsetTop;
                  focusWindow(element);
                  document.body.style.cursor = window.getComputedStyle(currentHandle).cursor;
                  document.body.classList.add('no-select');
                  element.setPointerCapture(e.pointerId); 
              });
          });
      
          element.addEventListener('pointermove', (e) => {
              if (!isResizing || !currentHandle) return;
              const dx = e.clientX - startX, dy = e.clientY - startY;
              let newWidth = startWidth, newHeight = startHeight, newLeft = startLeft, newTop = startTop;
      
              if (currentHandle.classList.contains('resize-handle-e')) newWidth = Math.max(minWidth, startWidth + dx);
              else if (currentHandle.classList.contains('resize-handle-w')) { newWidth = Math.max(minWidth, startWidth - dx); newLeft = startLeft + dx; if (newWidth === minWidth) newLeft = startLeft + (startWidth - minWidth); }
              if (currentHandle.classList.contains('resize-handle-s')) newHeight = Math.max(minHeight, startHeight + dy);
              else if (currentHandle.classList.contains('resize-handle-n')) { newHeight = Math.max(minHeight, startHeight - dy); newTop = startTop + dy; if (newHeight === minHeight) newTop = startTop + (startHeight - minHeight); }
              if (currentHandle.classList.contains('resize-handle-se')) { newWidth = Math.max(minWidth, startWidth + dx); newHeight = Math.max(minHeight, startHeight + dy); }
              else if (currentHandle.classList.contains('resize-handle-sw')) { newWidth = Math.max(minWidth, startWidth - dx); newHeight = Math.max(minHeight, startHeight + dy); newLeft = startLeft + dx; if (newWidth === minWidth) newLeft = startLeft + (startWidth - minWidth); }
              else if (currentHandle.classList.contains('resize-handle-ne')) { newWidth = Math.max(minWidth, startWidth + dx); newHeight = Math.max(minHeight, startHeight - dy); newTop = startTop + dy; if (newHeight === minHeight) newTop = startTop + (startHeight - minHeight); }
              else if (currentHandle.classList.contains('resize-handle-nw')) { newWidth = Math.max(minWidth, startWidth - dx); newHeight = Math.max(minHeight, startHeight - dy); newLeft = startLeft + dx; newTop = startTop + dy; if (newWidth === minWidth) newLeft = startLeft + (startWidth - minWidth); if (newHeight === minHeight) newTop = startTop + (startHeight - minHeight); }
      
              const desktopRect = desktop.getBoundingClientRect();
              if (newLeft < 0) { newWidth += newLeft; newLeft = 0; }
              if (newTop < 0) { newHeight += newTop; newTop = 0; }
              if (newLeft + newWidth > desktopRect.width) newWidth = desktopRect.width - newLeft;
              if (newTop + newHeight > desktopRect.height) newHeight = desktopRect.height - newTop;
      
              element.style.width = `${newWidth}px`; element.style.height = `${newHeight}px`;
              element.style.left = `${newLeft}px`; element.style.top = `${newTop}px`;
          });
      
          element.addEventListener('pointerup', (e) => {
              if (isResizing) {
                  isResizing = false; currentHandle = null;
                  document.body.style.cursor = 'default';
                  document.body.classList.remove('no-select');
                  if (element.hasPointerCapture(e.pointerId)) element.releasePointerCapture(e.pointerId);
                  const windowData = openWindows[element.dataset.instanceId];
                  if (windowData && !windowData.isMaximized) {
                      windowData.originalRect = { left: element.style.left, top: element.style.top, width: element.style.width, height: element.style.height };
                  }
                  if (windowData && !windowData.isMinimized && !windowData.isMaximized) keepSingleWindowOnScreen(element, windowData);
              }
          });
          element.addEventListener('pointercancel', (e) => {
              if (isResizing) {
                  isResizing = false; currentHandle = null;
                  document.body.style.cursor = 'default';
                  document.body.classList.remove('no-select');
                  if (element.hasPointerCapture(e.pointerId)) element.releasePointerCapture(e.pointerId);
              }
          });
      }
      function focusWindow(windowEl) { /* ... (same as your latest) ... */
          if (!windowEl || !document.body.contains(windowEl)) return;
          const instanceId = windowEl.dataset.instanceId;
          const windowData = openWindows[instanceId];
          if (!windowData) return;
          if (windowData.isMinimized) { toggleMinimizeWindow(windowEl); return; }

          const titleBarEl = windowEl.querySelector('.window-titlebar');
          const titleTextEl = windowEl.querySelector('.window-title');
          const titleIconEl = windowEl.querySelector('.window-titlebar-icon');

          windowEl.classList.remove('inactive');
          if (windowEl.dataset.customActiveTitlebarColor) {
              titleBarEl.style.backgroundColor = windowEl.dataset.customActiveTitlebarColor;
              if (windowEl.dataset.customActiveTitlebarTextColor) {
                  titleTextEl.style.color = windowEl.dataset.customActiveTitlebarTextColor;
              }
              if (titleIconEl) titleIconEl.style.opacity = '1';
          } else {
              titleBarEl.style.backgroundColor = '';
              titleTextEl.style.color = '';
              if (titleIconEl) titleIconEl.style.opacity = '';
          }

          Object.values(openWindows).forEach(ow => {
              if (ow.element && ow.element !== windowEl) {
                  ow.element.classList.add('inactive');
                  const otherTitleBar = ow.element.querySelector('.window-titlebar');
                  const otherTitleText = ow.element.querySelector('.window-title');
                  const otherIcon = otherTitleBar ? otherTitleBar.querySelector('.window-titlebar-icon') : null;
                  if (otherTitleBar) otherTitleBar.style.backgroundColor = '';
                  if (otherTitleText) otherTitleText.style.color = '';
                  if (otherIcon) otherIcon.style.opacity = '';
              }
          });

          if (windowEl.hasAttribute('tabindex') && document.activeElement !== windowEl) windowEl.focus({ preventScroll: true });
          highestZIndex++;
          windowEl.style.zIndex = highestZIndex;
          document.querySelectorAll('.taskbar-button').forEach(btn => btn.classList.remove('active'));
          if (windowData.taskbarButton) {
              windowData.taskbarButton.classList.add('active');
              windowData.taskbarButton.classList.remove('minimized');
          }
          // No deselectAllDesktopIcons() here, as desktop-icons.js handles selection.
      }
      function closeWindow(windowEl) { /* ... (same as your latest) ... */
          const instanceId = windowEl.dataset.instanceId;
          if (openWindows[instanceId]) {
              if (openWindows[instanceId].taskbarButton) openWindows[instanceId].taskbarButton.remove();
              if (openWindows[instanceId].appInstance && typeof openWindows[instanceId].appInstance.destroy === 'function') {
                  openWindows[instanceId].appInstance.destroy();
              }
              delete openWindows[instanceId];
          }
          windowEl.remove();
          const remainingWindows = Object.values(openWindows).filter(ow => ow.element && !ow.isMinimized);
          if (remainingWindows.length > 0) {
              let topWin = null, maxZ = -1;
              remainingWindows.forEach(rw => { const z = parseInt(rw.element.style.zIndex) || 0; if (z > maxZ) { maxZ = z; topWin = rw.element; } });
              if (topWin) focusWindow(topWin);
          } else {
              desktop.focus();
          }
      }
      function addWindowToTaskbar(windowEl, title, iconSrc, instanceId) { /* ... (same as your latest) ... */
          const taskbarButton = document.createElement('button');
          taskbarButton.className = 'taskbar-button';
          taskbarButton.dataset.windowInstanceId = instanceId;
          taskbarButton.setAttribute('tabindex', '-1');
          const img = document.createElement('img');
          img.src = iconSrc; img.alt = ""; taskbarButton.appendChild(img);
          taskbarButton.appendChild(document.createTextNode(title.length > 18 ? title.substring(0,15) + '...' : title));
          taskbarButton.addEventListener('click', () => {
              const winData = openWindows[instanceId];
              if (winData) {
                  if (winData.taskbarButton.classList.contains('active') && !winData.isMinimized) toggleMinimizeWindow(winData.element);
                  else focusWindow(winData.element);
              }
          });
          taskbarWindows.appendChild(taskbarButton);
          openWindows[instanceId].taskbarButton = taskbarButton;
      }
      function makeDraggable(element) { /* ... (same as your latest - with element-specific listeners) ... */
          const titleBar = element.querySelector('.window-titlebar');
          let offsetX, offsetY, isDragging = false;
          titleBar.addEventListener('pointerdown', (e) => {
              const windowData = openWindows[element.dataset.instanceId];
              if ((windowData && windowData.isMaximized) || e.target.closest('.window-controls button')) return;
              isDragging = true;
              const rect = element.getBoundingClientRect();
              offsetX = e.clientX - rect.left; offsetY = e.clientY - rect.top;
              document.body.classList.add('no-select');
              element.setPointerCapture(e.pointerId);
          });
          element.addEventListener('pointermove', (e) => {
              if (!isDragging) return;
              let newX = e.clientX - offsetX, newY = e.clientY - offsetY;
              const desktopRect = desktop.getBoundingClientRect(), winRect = element.getBoundingClientRect();
              const titleBarHeight = titleBar.offsetHeight;
              newX = Math.max(-winRect.width + titleBarHeight + 20, Math.min(newX, desktopRect.width - (titleBarHeight + 20)));
              newY = Math.max(0, Math.min(newY, desktopRect.height - titleBarHeight));
              element.style.left = `${newX}px`; element.style.top = `${newY}px`;
          });
          element.addEventListener('pointerup', (e) => {
              if (isDragging) {
                  isDragging = false;
                  document.body.classList.remove('no-select');
                  element.releasePointerCapture(e.pointerId);
                  const windowData = openWindows[element.dataset.instanceId];
                  if (windowData && !windowData.isMaximized) {
                      windowData.originalRect.left = element.style.left;
                      windowData.originalRect.top = element.style.top;
                  }
                  if (windowData && !windowData.isMinimized && !windowData.isMaximized) keepSingleWindowOnScreen(element, windowData);
              }
          });
          element.addEventListener('pointercancel', (e) => {
              if (isDragging) {
                  isDragging = false;
                  document.body.classList.remove('no-select');
                  if (element.hasPointerCapture(e.pointerId)) element.releasePointerCapture(e.pointerId);
              }
          });
      }
      function toggleMinimizeWindow(windowEl) { /* ... (same as your latest) ... */
          const instanceId = windowEl.dataset.instanceId;
          const windowData = openWindows[instanceId];
          if (!windowData) return;
          windowData.isMinimized = !windowData.isMinimized;
          if (windowData.isMinimized) {
              if (!windowData.isMaximized) {
                   windowData.originalRectBeforeMinimize = { left: windowEl.style.left, top: windowEl.style.top, width: windowEl.style.width, height: windowEl.style.height };
              }
              windowEl.style.display = 'none';
              if (windowData.taskbarButton) { windowData.taskbarButton.classList.add('minimized'); windowData.taskbarButton.classList.remove('active'); }
              const remainingWindows = Object.values(openWindows).filter(ow => ow.element && !ow.isMinimized && ow.element !== windowEl);
              if (remainingWindows.length > 0) {
                  let topWin = null, maxZ = -1;
                  remainingWindows.forEach(rw => { const z = parseInt(rw.element.style.zIndex) || 0; if (z > maxZ) { maxZ = z; topWin = rw.element; } });
                  if (topWin) focusWindow(topWin);
              } else { desktop.focus(); }
          } else {
              windowEl.style.display = 'flex';
              if (!windowData.isMaximized && windowData.originalRectBeforeMinimize) {
                  Object.assign(windowEl.style, windowData.originalRectBeforeMinimize);
              }
              focusWindow(windowEl);
          }
      }
      function toggleMaximizeWindow(windowEl) { /* ... (same as your latest) ... */
          const instanceId = windowEl.dataset.instanceId;
          const windowData = openWindows[instanceId];
          if (!windowData || windowData.isMinimized) return;
          const maximizeBtn = windowEl.querySelector('.window-maximize-btn');
          const titleBar = windowEl.querySelector('.window-titlebar');
          const appDef = APP_DEFINITIONS[windowData.appId];

          if (windowData.isMaximized) {
              if (windowData.originalRect) Object.assign(windowEl.style, windowData.originalRect);
              else {
                  const tempW = (appDef && appDef.defaultWidth) || 450, tempH = (appDef && appDef.defaultHeight) || 300;
                  windowEl.style.left = `${(desktop.clientWidth - tempW) / 2}px`; windowEl.style.top = `${(desktop.clientHeight - tempH) / 3}px`;
                  windowEl.style.width = `${tempW}px`; windowEl.style.height = `${tempH}px`;
              }
              windowData.isMaximized = false; windowEl.classList.remove('maximized');
              maximizeBtn.textContent = '1'; maximizeBtn.title = 'Maximize'; titleBar.style.cursor = 'grab';
          } else {
              windowData.originalRect = { left: windowEl.style.left, top: windowEl.style.top, width: windowEl.style.width || `${windowEl.offsetWidth}px`, height: windowEl.style.height || `${windowEl.offsetHeight}px` };
              Object.assign(windowEl.style, { left: '0px', top: '0px', width: `${desktop.clientWidth}px`, height: `${desktop.clientHeight}px` });
              windowData.isMaximized = true; windowEl.classList.add('maximized');
              maximizeBtn.textContent = '2'; maximizeBtn.title = 'Restore'; titleBar.style.cursor = 'default';
          }
          focusWindow(windowEl);
          if (!windowData.isMinimized && !windowData.isMaximized) keepSingleWindowOnScreen(windowEl, windowData);
          else if (windowData.isMaximized) {
              Object.assign(windowEl.style, { left: '0px', top: '0px', width: `${desktop.clientWidth}px`, height: `${desktop.clientHeight}px` });
          }
      }

      // --- Desktop Icon Event Handlers (RESTORED from your old-app.js logic) ---
      // These are general handlers. desktop-icons.js will add more specific pointerdown for drag/marquee.
      // This ensures basic click-to-select and dblclick-to-open still work if desktop-icons.js
      // doesn't fully override or if it's loaded later.
      // However, it's generally better for one module (desktop-icons.js) to own all direct icon interactions.
      // If desktop-icons.js handles selection and dblclick, these can be removed.
      // For now, restoring to match the structure of the `old-app.js` you provided earlier as a base.
      document.querySelectorAll('.desktop-icon').forEach(item => {
          item.addEventListener('click', (e) => { // Single click to select
              e.stopPropagation(); // Prevent desktop click from deselecting immediately
              // If desktop-icons.js is handling selection, this might be redundant or it might
              // call a utility from desktop-icons.js.
              // For now, mimicking the old app.js behavior:
              if (typeof deselectAllDesktopIcons === 'function') deselectAllDesktopIcons(); // From app.js
              item.classList.add('selected');
              if (window.IconSelectionEffect && typeof window.IconSelectionEffect.applySelectionEffect === 'function') {
                  const img = item.querySelector('img');
                  if (img) window.IconSelectionEffect.applySelectionEffect(img);
              }
          });
          item.addEventListener('dblclick', (e) => { // Double click to open
              const appId = item.dataset.appId;
              if (appId) createWindow(appId);
          });
      });


      document.querySelectorAll('.start-menu-item').forEach(item => { /* ... (same as your latest) ... */
           item.addEventListener('click', (e) => {
              if (item.classList.contains('disabled')) return;
              const appId = item.dataset.appId;
              if (item.id === 'shutdownButtonTrigger') createWindow("shutdownDialog");
              else if (appId) createWindow(appId);
              startMenu.style.display = 'none'; startButton.style.borderStyle = 'outset';
          });
      });

      const initialBgColor = window.getComputedStyle(document.documentElement).getPropertyValue('--desktop-bg-color').trim();
      if (initialBgColor) updateThemeForDesktopBackground(initialBgColor);
      if (window.Win9xSystem && typeof window.Win9xSystem.updateStartMenuItemsState === 'function') {
        window.Win9xSystem.updateStartMenuItemsState();
      }

      // Ensure desktop icons are laid out after all other scripts (like desktop-icons.js) have run
      // and potentially modified the DOM or icon states.
      if (window.Win9xDesktopUtils && typeof window.Win9xDesktopUtils.forceRelayoutAllIcons === 'function') {
          console.log("Ensuring desktop icons are laid out before hiding splash...");
          window.Win9xDesktopUtils.forceRelayoutAllIcons();
      } else {
          console.warn("Win9xDesktopUtils.forceRelayoutAllIcons not found. Desktop icons might not be positioned correctly before splash hides.");
          // Fallback: if desktop-icons.js didn't run or its utils aren't ready,
          // we might need a simpler way to ensure icons are at least somewhat positioned.
          // However, this should ideally be handled by desktop-icons.js's init.
      }
      if (window.SPLASH_API) window.SPLASH_API.setProgress(95);

      console.log("App setup complete. Hiding splash screen.");
      if (window.SPLASH_API) {
          window.SPLASH_API.completeAndHide();
      } else {
          const desktopEl = document.getElementById('desktop');
          if(desktopEl) desktopEl.style.visibility = 'visible';
      }
  });

  window.addEventListener('message', ({isTrusted, data}) => { /* ... (same as your latest) ... */
    if (!isTrusted || !data || !data.type) return;
    const topOffset = window.screen.availHeight - window.visualViewport.height;
    const leftOffset = window.screen.availWidth - window.visualViewport.width;
    switch(data.type) {
      case "pointermove": {
        // Your latest app.js uses globalThis.updateDragMoveGlobalListener
        // Ensure this matches how makeResizable sets up its listener.
        // My previous correction changed makeResizable to use element-specific listeners,
        // which is generally safer than a single global listener for this.
        // If you stick with globalThis.updateDragMoveGlobalListener, ensure makeResizable sets it.
        // If makeResizable uses element.addEventListener, this message listener might not be needed for resize.
        if (globalThis.updateDragMoveGlobalListener && data.pointermove) {
            const {pointermove} = data;
            pointermove.screenX -= window.screenX + leftOffset;
            pointermove.screenY -= window.screenY + topOffset;
            pointermove.clientX = pointermove.screenX;
            pointermove.clientY = pointermove.screenY;
            pointermove.preventDefault = () => void 0;
            pointermove.stopPropagation = () => void 0;
            globalThis.updateDragMoveGlobalListener(pointermove);
        }
      }; break;
      default: break;
    }
  });
