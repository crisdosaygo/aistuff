  // app.js

  import {BrowserApp} from './browser.js';
  import { networkExplorerAppDefinition } from './network-explorer.js';
  import { myComputerAppDefinition } from './my-computer.js';
  import { notepadAppDefinition } from './notepad.js';
  import { calculatorAppDefinition } from './calculator.js';
  import { recycleBinAppDefinition } from './recycle-bin.js';

  const APP_DEFINITIONS = {
      networkExplorer: networkExplorerAppDefinition,
      myComputer: myComputerAppDefinition,
      notepad: notepadAppDefinition,
      recycleBin: recycleBinAppDefinition,
      calculator: calculatorAppDefinition,
      shutdownDialog: {
          title: "Shut Down Windows",
          icon: "./shut_down_cool-0.png",
          isDialog: true,
          content: () => `
              <div style="text-align: center; padding: 20px 20px 10px 20px; background: #c0c0c0; height:100%; display:flex; flex-direction:column; justify-content:space-around;">
                  <div>
                      <img src="./computer_shut_down_cool-2.png" alt="Shut down" style="width: 32px; height: 32px; margin-bottom: 15px; float:left; margin-right:15px;">
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
      internetBrowser: {
          netscape: true,
          title: "Internet Browser",
          icon: "./search_web-0.png",
          defaultWidth: 700,
          defaultHeight: 500,
          generateContent: (windowInstanceId, webviewId) => BrowserApp.generateInitialHTML(webviewId),
          initApp: (windowEl, windowInstanceId, webviewId, appDefinition) => {
              return new BrowserApp(windowEl, windowInstanceId, webviewId, appDefinition.netscape, appDefinition);
          }
      },
      internetExplorer: {
          netscape: false,
          title: "Internet Explorer",
          icon: "./msie2-0.png",
          defaultWidth: 700,
          defaultHeight: 500,
          generateContent: (windowInstanceId, webviewId) => BrowserApp.generateInitialHTML(webviewId),
          initApp: (windowEl, windowInstanceId, webviewId, appDefinition) => {
              return new BrowserApp(windowEl, windowInstanceId, webviewId, appDefinition.netscape, appDefinition);
          }
      },
      netscapeNavigator: {
          netscape: true,
          title: "Netscape Navigator",
          icon: "./n2-2.png",
          defaultWidth: 700,
          defaultHeight: 500,
          generateContent: (windowInstanceId, webviewId) => BrowserApp.generateInitialHTML(webviewId),
          initApp: (windowEl, windowInstanceId, webviewId, appDefinition) => {
              return new BrowserApp(windowEl, windowInstanceId, webviewId, appDefinition.netscape, appDefinition);
          }
      },
  };
  window.APP_DEFINITIONS = APP_DEFINITIONS;

  function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
          const context = this;
          const later = () => {
              timeout = null;
              func.apply(context, args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
      };
  }

  function getLuminance(hexColor) {
      if (!hexColor) return 0;
      hexColor = hexColor.replace('#', '');
      if (hexColor.length === 3) hexColor = hexColor.split('').map(char => char + char).join('');
      if (hexColor.length !== 6) return 0; // Should be 6 hex digits
      const r = parseInt(hexColor.substring(0, 2), 16);
      const g = parseInt(hexColor.substring(2, 4), 16);
      const b = parseInt(hexColor.substring(4, 6), 16);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function updateThemeForDesktopBackground(desktopBgColor) {
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty('--desktop-bg-color', desktopBgColor);
      const luminance = getLuminance(desktopBgColor);
      let newIconTextColor = (luminance > 128) ? 'black' : 'white';
      rootStyle.setProperty('--desktop-icon-text-color', newIconTextColor);
  }
  window.updateThemeForDesktopBackground = updateThemeForDesktopBackground;

  // --- START: NEW FUNCTION TO UPDATE START MENU ITEMS ---
  function updateStartMenuItemsState() {
    const startMenu = document.getElementById('startMenu');
    if (!startMenu) return;

    const recycleBinApi = window.APP_DEFINITIONS?.recycleBin?.api;
    if (!recycleBinApi || typeof recycleBinApi.getRecycledItemIds !== 'function') {
        // console.warn("Recycle Bin API for item IDs not found, cannot update Start Menu.");
        return;
    }
    const recycledAppIds = recycleBinApi.getRecycledItemIds();

    const startMenuItems = startMenu.querySelectorAll('.start-menu-item[data-app-id]');
    startMenuItems.forEach(item => {
        const appId = item.dataset.appId;
        if (appId === 'recycleBin' || appId === 'shutdownDialog') { // These should always be launchable
            item.style.display = ''; // Ensure visible
            item.classList.remove('disabled'); // Ensure enabled
            item.style.opacity = '1';
            item.style.pointerEvents = 'auto';
            return;
        }

        if (recycledAppIds.includes(appId)) {
            // Option 1: Hide the item
            item.style.display = 'none';

            // Option 2: Disable the item (more like Win95 "uninstall")
            // item.classList.add('disabled');
            // item.style.opacity = '0.5'; // Visually indicate disabled
            // item.style.pointerEvents = 'none'; // Prevent click
        } else {
            item.style.display = ''; // Ensure visible
            item.classList.remove('disabled');
            item.style.opacity = '1';
            item.style.pointerEvents = 'auto';
        }
    });
  }
  // Expose it globally so recycle-bin.js can call it
  window.Win9xSystem = window.Win9xSystem || {};
  window.Win9xSystem.updateStartMenuItemsState = updateStartMenuItemsState;
  // --- END: NEW FUNCTION TO UPDATE START MENU ITEMS ---


  document.addEventListener('DOMContentLoaded', () => {
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
      window.createWindow = createWindow; // Expose createWindow globally if other modules need it

      function keepAllWindowsOnScreen() {
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
          if(desktop) resizeObserver.observe(desktop);
      } else {
          window.addEventListener('resize', debouncedKeepOnScreen);
      }

      function updateClock() {
          if (!clockElement) return;
          const now = new Date();
          const hours = now.getHours();
          const minutes = now.getMinutes().toString().padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = (hours % 12) || 12;
          clockElement.textContent = `${displayHours}:${minutes} ${ampm}`;
      }
      setInterval(updateClock, 1000);
      updateClock();

      startButton.addEventListener('click', (event) => {
          event.stopPropagation();
          updateStartMenuItemsState(); // Update Start Menu items just before showing
          const isVisible = startMenu.style.display === 'flex';
          startMenu.style.display = isVisible ? 'none' : 'flex';
          startButton.style.borderStyle = isVisible ? 'outset' : 'inset';
          if (!isVisible) startMenu.focus();
      });

      document.addEventListener('click', (event) => {
          if (startMenu.style.display === 'flex' && !startMenu.contains(event.target) && !startButton.contains(event.target)) {
              startMenu.style.display = 'none';
              startButton.style.borderStyle = 'outset';
          }
      }, {capture: true});


      function createWindow(appId, dataForApp) {
          startMenu.style.display = 'none';
          startButton.style.borderStyle = 'outset';

          // --- START: CHECK IF APP IS RECYCLED ---
          const recycleBinApi = window.APP_DEFINITIONS?.recycleBin?.api;
          if (recycleBinApi && typeof recycleBinApi.getRecycledItemIds === 'function') {
              const recycledAppIds = recycleBinApi.getRecycledItemIds();
              if (recycledAppIds.includes(appId) && appId !== 'recycleBin') {
                  // Optionally, show a message or prevent opening
                  // console.warn(`App ${appId} is in Recycle Bin and cannot be opened from Start Menu.`);
                  // alert(`The application "${APP_DEFINITIONS[appId]?.title || appId}" has been moved to the Recycle Bin.`);
                  // For now, we just won't open it if the start menu item was clicked (it should be hidden/disabled)
                  // This check is more for direct calls to createWindow if any.
                  return;
              }
          }
          // --- END: CHECK IF APP IS RECYCLED ---

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
          windowEl.querySelector('.window-titlebar-icon').src = appDef.icon;
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

      function keepSingleWindowOnScreen(windowEl, winData) {
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

      function makeResizable(element) {
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
              });
          });

          if (globalThis.updateDragMoveGlobalListener) {
              document.removeEventListener('pointermove', globalThis.updateDragMoveGlobalListener);
              document.removeEventListener('pointerup', globalThis.updateDragEndGlobalListener);
          }

          globalThis.updateDragMoveGlobalListener = (e) => {
              if (!isResizing || !currentHandle) return;
              e.preventDefault();
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
          };
          document.addEventListener('pointermove', globalThis.updateDragMoveGlobalListener);

          globalThis.updateDragEndGlobalListener = () => {
              if (isResizing) {
                  isResizing = false; currentHandle = null;
                  document.body.style.cursor = 'default';
                  document.body.classList.remove('no-select');
                  const windowData = openWindows[element.dataset.instanceId];
                  if (windowData && !windowData.isMaximized) {
                      windowData.originalRect = { left: element.style.left, top: element.style.top, width: element.style.width, height: element.style.height };
                  }
              }
          };
          document.addEventListener('pointerup', globalThis.updateDragEndGlobalListener);
      }

      function focusWindow(windowEl) {
          if (!windowEl || !document.body.contains(windowEl)) return;
          const instanceId = windowEl.dataset.instanceId;
          const windowData = openWindows[instanceId];
          if (!windowData) return;
          if (windowData.isMinimized) { toggleMinimizeWindow(windowEl); return; }

          const titleBarEl = windowEl.querySelector('.window-titlebar');
          const titleTextEl = windowEl.querySelector('.window-title');

          windowEl.classList.remove('inactive');
          if (windowEl.dataset.customActiveTitlebarColor) {
              titleBarEl.style.backgroundColor = windowEl.dataset.customActiveTitlebarColor;
              if (windowEl.dataset.customActiveTitlebarTextColor) {
                  titleTextEl.style.color = windowEl.dataset.customActiveTitlebarTextColor;
                  titleBarEl.querySelector('.window-titlebar-icon').style.opacity = '1';
              }
          } else {
              titleBarEl.style.backgroundColor = '';
              titleTextEl.style.color = '';
              titleBarEl.querySelector('.window-titlebar-icon').style.opacity = '';
          }

          Object.values(openWindows).forEach(ow => {
              if (ow.element && ow.element !== windowEl) {
                  ow.element.classList.add('inactive');
                  const otherTitleBar = ow.element.querySelector('.window-titlebar');
                  const otherTitleText = ow.element.querySelector('.window-title');
                  if (otherTitleBar) otherTitleBar.style.backgroundColor = '';
                  if (otherTitleText) otherTitleText.style.color = '';
                   const otherIcon = otherTitleBar.querySelector('.window-titlebar-icon');
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
      }

      function closeWindow(windowEl) {
          const instanceId = windowEl.dataset.instanceId;
          if (openWindows[instanceId]) {
              if (openWindows[instanceId].taskbarButton) openWindows[instanceId].taskbarButton.remove();
              if (openWindows[instanceId].appInstance && typeof openWindows[instanceId].appInstance.destroy === 'function') {
                  openWindows[instanceId].appInstance.destroy();
              }
              // --- START: Call onAppDestroy from app definition ---
              const appDef = APP_DEFINITIONS[openWindows[instanceId].appId];
              if (appDef && typeof appDef.onAppDestroy === 'function') {
                  appDef.onAppDestroy(instanceId);
              }
              // --- END: Call onAppDestroy from app definition ---
              delete openWindows[instanceId];
          }
          windowEl.remove();
          const remainingWindows = Object.values(openWindows).filter(ow => ow.element && !ow.isMinimized);
          if (remainingWindows.length > 0) {
              let topWin = null, maxZ = -1;
              remainingWindows.forEach(rw => {
                  const z = parseInt(rw.element.style.zIndex) || 0;
                  if (z > maxZ) { maxZ = z; topWin = rw.element; }
              });
              if (topWin) focusWindow(topWin);
          } else {
             if(desktop) desktop.focus();
          }
      }

      function addWindowToTaskbar(windowEl, title, iconSrc, instanceId) {
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

      function makeDraggable(element) {
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
      }

      function toggleMinimizeWindow(windowEl) {
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
              } else { if(desktop) desktop.focus(); }
          } else {
              windowEl.style.display = 'flex';
              if (!windowData.isMaximized && windowData.originalRectBeforeMinimize) {
                  Object.assign(windowEl.style, windowData.originalRectBeforeMinimize);
              }
              focusWindow(windowEl);
          }
      }

      function toggleMaximizeWindow(windowEl) {
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
              maximizeBtn.textContent = '1';
              maximizeBtn.title = 'Maximize'; titleBar.style.cursor = 'grab';
          } else {
              windowData.originalRect = { left: windowEl.style.left, top: windowEl.style.top, width: windowEl.style.width || `${windowEl.offsetWidth}px`, height: windowEl.style.height || `${windowEl.offsetHeight}px` };
              Object.assign(windowEl.style, { left: '0px', top: '0px', width: `${desktop.clientWidth}px`, height: `${desktop.clientHeight}px` });
              windowData.isMaximized = true; windowEl.classList.add('maximized');
              maximizeBtn.textContent = '2';
              maximizeBtn.title = 'Restore'; titleBar.style.cursor = 'default';
          }
          focusWindow(windowEl);
          if (!windowData.isMinimized && !windowData.isMaximized) keepSingleWindowOnScreen(windowEl, windowData);
          else if (windowData.isMaximized) {
              Object.assign(windowEl.style, { left: '0px', top: '0px', width: `${desktop.clientWidth}px`, height: `${desktop.clientHeight}px` });
          }
      }

      document.querySelectorAll('.desktop-icon').forEach(item => {
          item.addEventListener('dblclick', (e) => {
              const appId = item.dataset.appId;
              // --- START: CHECK IF APP IS RECYCLED BEFORE DBLCLICK LAUNCH ---
              const recycleBinApi = window.APP_DEFINITIONS?.recycleBin?.api;
              if (recycleBinApi && typeof recycleBinApi.getRecycledItemIds === 'function') {
                  const recycledAppIds = recycleBinApi.getRecycledItemIds();
                  if (recycledAppIds.includes(appId) && appId !== 'recycleBin') {
                      // alert(`"${APP_DEFINITIONS[appId]?.title || appId}" is in the Recycle Bin. Restore it first to open.`);
                      return; // Prevent opening
                  }
              }
              // --- END: CHECK IF APP IS RECYCLED BEFORE DBLCLICK LAUNCH ---
              if (appId) createWindow(appId);
          });
      });
      document.querySelectorAll('.start-menu-item').forEach(item => {
           item.addEventListener('click', (e) => {
              if (item.classList.contains('disabled')) return; // Check if disabled by updateStartMenuItemsState
              const appId = item.dataset.appId;
              if (item.id === 'shutdownButtonTrigger') createWindow("shutdownDialog");
              else if (appId) createWindow(appId);
              startMenu.style.display = 'none'; startButton.style.borderStyle = 'outset';
          });
      });

      const initialBgColor = window.getComputedStyle(document.documentElement).getPropertyValue('--desktop-bg-color').trim();
      if (initialBgColor) {
          updateThemeForDesktopBackground(initialBgColor);
      }

      // --- START: INITIAL START MENU STATE UPDATE ---
      // Ensure Start Menu items reflect recycled state on load
      if (window.Win9xSystem && typeof window.Win9xSystem.updateStartMenuItemsState === 'function') {
        window.Win9xSystem.updateStartMenuItemsState();
      }
      // --- END: INITIAL START MENU STATE UPDATE ---

  });

  window.addEventListener('message', ({isTrusted, data}) => {
    if (!isTrusted || !data || !data.type) return;
    const topOffset = window.screen.availHeight - window.visualViewport.height;
    const leftOffset = window.screen.availWidth - window.visualViewport.width;
    switch(data.type) {
      case "pointermove": {
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
