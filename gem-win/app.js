  // app.js

  import {BrowserApp} from './browser.js';
  import { networkExplorerAppDefinition } from './network-explorer.js';
  import { myComputerAppDefinition } from './my-computer.js';
  import { notepadAppDefinition } from './notepad.js';
  import { calculatorAppDefinition } from './calculator.js';

  // windows awesome
  const APP_DEFINITIONS = {
      networkExplorer: networkExplorerAppDefinition,
      myComputer: myComputerAppDefinition,
      notepad: notepadAppDefinition,
      recycleBin: {
          title: "Recycle Bin",
          icon: "./recycle_bin_empty-0.png",
          iconFull: "./recycle_bin_full_cool-0.png",
          content: () => `<div style="padding:10px; text-align:center; flex-grow:1; display:flex; flex-direction:column; justify-content:center; align-items:center; background:white;"><img src="./recycle_bin_empty_cool-0.png" style="width:48px; height:48px; display:block; margin-bottom:10px;"><p>Recycle Bin is empty.</p></div>`
      },
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

  // --- Utility: Debounce ---
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

  // --- Theme Management ---
  function getLuminance(hexColor) {
      if (!hexColor) return 0; // Default to dark if color is undefined
      hexColor = hexColor.replace('#', '');
      if (hexColor.length === 3) { // Handle shorthand hex
          hexColor = hexColor.split('').map(char => char + char).join('');
      }
      if (hexColor.length !== 6) return 0; // Invalid hex

      const r = parseInt(hexColor.substring(0, 2), 16);
      const g = parseInt(hexColor.substring(2, 4), 16);
      const b = parseInt(hexColor.substring(4, 6), 16);
      // Standard luminance calculation (0-255 range)
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function updateThemeForDesktopBackground(desktopBgColor) {
      document.documentElement.style.setProperty('--desktop-bg-color', desktopBgColor);

      const luminance = getLuminance(desktopBgColor);
      let newIconTextColor;
      let newActiveTitlebarColor;
      // let newInactiveTitlebarColor; // Example if we want to change this too

      if (luminance > 128) { // Light background
          newIconTextColor = 'black';
          // For light desktop, can adjust theme color if desired
          newActiveTitlebarColor = '#0000A0'; // Slightly different dark blue, or keep original
          // newInactiveTitlebarColor = '#A0A0A0'; // Lighter gray for inactive
      } else { // Dark background
          newIconTextColor = 'white';
          newActiveTitlebarColor = '#000080'; // Standard dark blue
          // newInactiveTitlebarColor = '#808080'; // Standard gray for inactive
      }

      document.documentElement.style.setProperty('--desktop-icon-text-color', newIconTextColor);
      document.documentElement.style.setProperty('--theme-color-active-titlebar', newActiveTitlebarColor);
      // if (newInactiveTitlebarColor) {
      //     document.documentElement.style.setProperty('--theme-color-inactive-titlebar', newInactiveTitlebarColor);
      // }

      // Example: Adjust selection color for desktop icons if desktop is very light
      const selectedIconSpan = document.querySelector('.desktop-icon.selected span'); // Check if any selected
      if (selectedIconSpan) {
          if (luminance > 200) { // Very light background
              // Potentially change selection background for better contrast
              // This would require CSS variables for selection colors too.
              // For now, this is a placeholder for more advanced theming.
          }
      }
  }
  // Example call (would be triggered by a display properties change)
  // setTimeout(() => updateThemeForDesktopBackground('#FFFFFF'), 5000); // Test with white
  // setTimeout(() => updateThemeForDesktopBackground('#008080'), 10000); // Test revert to teal


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

      // --- Keep Windows On Screen ---
      function keepAllWindowsOnScreen() {
          if (!desktop) return;
          const desktopWidth = desktop.clientWidth;
          const desktopHeight = desktop.clientHeight;

          Object.values(openWindows).forEach(winData => {
              if (!winData || !winData.element || winData.isMinimized || winData.isMaximized) {
                  return;
              }

              const windowEl = winData.element;
              let currentLeft = windowEl.offsetLeft;
              let currentTop = windowEl.offsetTop;
              const currentWidth = windowEl.offsetWidth;
              const currentHeight = windowEl.offsetHeight;

              let newLeft = currentLeft;
              let newTop = currentTop;

              if (newLeft + currentWidth > desktopWidth) {
                  newLeft = desktopWidth - currentWidth;
              }
              if (newTop + currentHeight > desktopHeight) {
                  newTop = desktopHeight - currentHeight;
              }
              if (newLeft < 0) {
                  newLeft = 0;
              }
              if (newTop < 0) {
                  newTop = 0;
              }

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


      // --- Clock ---
      function updateClock() {
          const now = new Date();
          const hours = now.getHours();
          const minutes = now.getMinutes().toString().padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = (hours % 12) || 12;
          clockElement.textContent = `${displayHours}:${minutes} ${ampm}`;
      }
      setInterval(updateClock, 1000);
      updateClock();

      // --- Start Menu ---
      startButton.addEventListener('click', (event) => {
          event.stopPropagation();
          startMenu.style.display = startMenu.style.display === 'flex' ? 'none' : 'flex';
          startButton.style.borderStyle = (startMenu.style.display === 'flex') ? 'inset' : 'outset';
          if (startMenu.style.display === 'flex') {
              startMenu.focus(); // Focus the menu for keyboard navigation
          }
      });

      document.addEventListener('click', (event) => {
          if (startMenu.style.display !== 'none' && !startMenu.contains(event.target) && !startButton.contains(event.target)) {
              startMenu.style.display = 'none';
              startButton.style.borderStyle = 'outset';
          }
          // Deselect desktop icons if click is on desktop/taskbar but not an icon itself
          // This is now primarily handled by desktop-icons.js logic (marquee/click on desktop)
          // but keeping a general deselect here can be a fallback.
          // if (event.target === desktop || event.target.closest('.taskbar')) {
          //     if (!event.target.closest('.desktop-icon') && !event.target.closest('.window')) {
          //          // deselectAllDesktopIcons(); // desktop-icons.js should manage this
          //     }
          // }
      }, {capture: true}); // Capture true to catch clicks early

      // --- Desktop Icon Selection (basic deselection, main logic in desktop-icons.js) ---
      function deselectAllDesktopIcons() {
          // This function might be called by other parts of app.js if needed
          // but primary selection/deselection is in desktop-icons.js
          document.querySelectorAll('.desktop-icon.selected').forEach(icon => {
              icon.classList.remove('selected');
              // If IconSelectionEffect is used, it should be called here too
          });
      }

      // --- Window Management ---
      function createWindow(appId, dataForApp) {
          startMenu.style.display = 'none';
          startButton.style.borderStyle = 'outset';

          const appDef = APP_DEFINITIONS[appId];
          if (!appDef) {
              console.error("App definition not found for:", appId);
              return;
          }

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

          let appInstanceSpecificData = null;
          if (appId === 'networkExplorer' && typeof createWindow === 'function') { // Pass createWindow if app needs it
              appInstanceSpecificData = createWindow;
          }


          const windowInstanceId = `window-${appId}-${windowIdCounter++}`;
          const windowEl = windowTemplate.content.firstElementChild.cloneNode(true);
          windowEl.dataset.appId = appId;
          windowEl.dataset.instanceId = windowInstanceId;

          windowEl.querySelector('.window-titlebar-icon').src = appDef.icon;
          windowEl.querySelector('.window-titlebar-icon').alt = appDef.title;
          windowEl.querySelector('.window-title').textContent = appDef.title;

          let webviewId = null;
          const isBrowserApp = appId === 'internetBrowser' || appId === 'internetExplorer' || appId === 'netscapeNavigator';
          if (isBrowserApp) {
              webviewId = `webview-${windowInstanceId}`;
          }

          if (appDef.generateContent && typeof appDef.generateContent === 'function') {
              windowEl.querySelector('.window-content').innerHTML = appDef.generateContent(windowInstanceId, webviewId);
          } else {
              windowEl.querySelector('.window-content').innerHTML = typeof appDef.content === 'function' ? appDef.content() : appDef.content;
          }

          const desktopPadding = 0;
          const maxAllowedWidth = desktop.clientWidth - (2 * desktopPadding) - 10;
          const maxAllowedHeight = desktop.clientHeight - (2 * desktopPadding) - 10;

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
              windowEl.style.minWidth = appDef.minWidth || '300px';
              windowEl.style.minHeight = appDef.minHeight || '180px';
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

          Object.values(openWindows).forEach(ow => {
              if (ow.element) {
                  ow.element.classList.add('inactive');
              }
          });

          const newWindowData = {
              element: windowEl,
              taskbarButton: null,
              appId: appId,
              originalRect: {
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

          if (appDef.initApp && typeof appDef.initApp === 'function') {
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
              // Restore button needs its default symbol if dialogs somehow get it
              const maximizeBtn = windowEl.querySelector('.window-maximize-btn');
              if (maximizeBtn) maximizeBtn.innerHTML = '&#x2610;'; // Maximize symbol
              makeDraggable(windowEl);
          }

          windowEl.querySelector('.window-close-btn').addEventListener('click', () => closeWindow(windowEl));
          windowEl.addEventListener('pointerdown', () => focusWindow(windowEl), true);

          focusWindow(windowEl);

          if (!newWindowData.isMinimized && !newWindowData.isMaximized) {
              keepSingleWindowOnScreen(windowEl, newWindowData);
          }

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
          if (!desktop || !windowEl || !winData) return;
          if (winData.isMinimized || winData.isMaximized) return;

          const desktopWidth = desktop.clientWidth;
          const desktopHeight = desktop.clientHeight;

          let currentLeft = windowEl.offsetLeft;
          let currentTop = windowEl.offsetTop;
          const currentWidth = windowEl.offsetWidth;
          const currentHeight = windowEl.offsetHeight;

          let newLeft = currentLeft;
          let newTop = currentTop;

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
          let isResizing = false;
          let currentHandle = null;
          let startX, startY, startWidth, startHeight, startLeft, startTop;

          const minWidth = parseInt(window.getComputedStyle(element).minWidth) || 150;
          const minHeight = parseInt(window.getComputedStyle(element).minHeight) || 100;

          handles.forEach(handle => {
              handle.addEventListener('pointerdown', (e) => {
                  const windowData = openWindows[element.dataset.instanceId];
                  if (windowData && windowData.isMaximized) return;

                  e.stopPropagation();
                  isResizing = true;
                  currentHandle = handle;
                  startX = e.clientX;
                  startY = e.clientY;
                  startWidth = element.offsetWidth;
                  startHeight = element.offsetHeight;
                  startLeft = element.offsetLeft;
                  startTop = element.offsetTop;

                  focusWindow(element);
                  document.body.style.cursor = window.getComputedStyle(currentHandle).cursor;
                  document.body.classList.add('no-select');
              });
          });

          globalThis.updateDragMove = (e) => {
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

              const desktopRect = desktop.getBoundingClientRect();
              if (newLeft < 0) { newWidth += newLeft; newLeft = 0; }
              if (newTop < 0) { newHeight += newTop; newTop = 0; }
              if (newLeft + newWidth > desktopRect.width) { newWidth = desktopRect.width - newLeft; }
              if (newTop + newHeight > desktopRect.height) { newHeight = desktopRect.height - newTop; }

              element.style.width = `${newWidth}px`;
              element.style.height = `${newHeight}px`;
              element.style.left = `${newLeft}px`;
              element.style.top = `${newTop}px`;
          };
          document.addEventListener('pointermove', globalThis.updateDragMove);

          document.addEventListener('pointerup', () => {
              if (isResizing) {
                  isResizing = false;
                  currentHandle = null;
                  document.body.style.cursor = 'default';
                  document.body.classList.remove('no-select');

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
              toggleMinimizeWindow(windowEl); // This will call focusWindow again after unminimizing
              return;
          }

          windowEl.classList.remove('inactive');
          Object.values(openWindows).forEach(ow => {
              if (ow.element && ow.element !== windowEl) {
                  ow.element.classList.add('inactive');
              }
          });

          if (windowEl.hasAttribute('tabindex') && document.activeElement !== windowEl) {
              windowEl.focus({ preventScroll: true });
          }
          highestZIndex++;
          windowEl.style.zIndex = highestZIndex;

          document.querySelectorAll('.taskbar-button').forEach(btn => btn.classList.remove('active'));
          if (windowData.taskbarButton) {
              windowData.taskbarButton.classList.add('active');
              windowData.taskbarButton.classList.remove('minimized');
          }
          // deselectAllDesktopIcons(); // Let desktop-icons.js handle its own selection state
      }

      function closeWindow(windowEl) {
          const instanceId = windowEl.dataset.instanceId;
          if (openWindows[instanceId]) {
              if (openWindows[instanceId].taskbarButton) {
                  openWindows[instanceId].taskbarButton.remove();
              }
              // Call app's cleanup function if it exists
              if (openWindows[instanceId].appInstance && typeof openWindows[instanceId].appInstance.destroy === 'function') {
                  openWindows[instanceId].appInstance.destroy();
              }
              delete openWindows[instanceId];
          }
          windowEl.remove();
          // Focus next available window or desktop
          const remainingWindows = Object.values(openWindows).filter(ow => ow.element && !ow.isMinimized);
          if (remainingWindows.length > 0) {
              // Focus the window that was most recently focused (highest z-index among remaining)
              let topWin = null;
              let maxZ = -1;
              remainingWindows.forEach(rw => {
                  const z = parseInt(rw.element.style.zIndex) || 0;
                  if (z > maxZ) {
                      maxZ = z;
                      topWin = rw.element;
                  }
              });
              if (topWin) focusWindow(topWin);
          } else {
              desktop.focus();
          }
      }

      function addWindowToTaskbar(windowEl, title, iconSrc, instanceId) {
          const taskbarButton = document.createElement('button');
          taskbarButton.className = 'taskbar-button';
          taskbarButton.dataset.windowInstanceId = instanceId;
          taskbarButton.setAttribute('tabindex', '-1'); // Taskbar buttons typically not part of main tab cycle

          const img = document.createElement('img');
          img.src = iconSrc;
          img.alt = "";
          taskbarButton.appendChild(img);

          const titleTextNode = document.createTextNode(title.length > 18 ? title.substring(0,15) + '...' : title);
          taskbarButton.appendChild(titleTextNode);

          taskbarButton.addEventListener('click', () => {
              const winData = openWindows[instanceId];
              if (winData) {
                  if (winData.taskbarButton.classList.contains('active') && !winData.isMinimized) {
                      toggleMinimizeWindow(winData.element);
                  } else {
                     focusWindow(winData.element); // This handles unminimizing if needed
                  }
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
              if (windowData && windowData.isMaximized) return;
              if (e.target.closest('.window-controls button')) return;

              isDragging = true;
              offsetX = e.clientX - element.getBoundingClientRect().left;
              offsetY = e.clientY - element.getBoundingClientRect().top;
              // titleBar.style.cursor = 'grabbing'; // This is handled by :active CSS
              document.body.classList.add('no-select');
              element.setPointerCapture(e.pointerId); // Capture pointer on the element being dragged
          });

          element.addEventListener('pointermove', (e) => { // Listen on element due to capture
              if (!isDragging) return;
              // e.preventDefault(); // Not always needed if captured, but can prevent text selection

              let newX = e.clientX - offsetX;
              let newY = e.clientY - offsetY;

              const desktopRect = desktop.getBoundingClientRect();
              const winRect = element.getBoundingClientRect(); // Use live rect for width/height

              // Constrain to desktop, but allow title bar to go slightly off-screen for easier docking
              const titleBarHeight = titleBar.offsetHeight;
              newX = Math.max(-winRect.width + titleBarHeight, Math.min(newX, desktopRect.width - titleBarHeight));
              newY = Math.max(0, Math.min(newY, desktopRect.height - titleBarHeight));


              element.style.left = `${newX}px`;
              element.style.top = `${newY}px`;
          });

          element.addEventListener('pointerup', (e) => { // Listen on element due to capture
              if (isDragging) {
                  isDragging = false;
                  // titleBar.style.cursor = 'grab'; // Reverts via CSS
                  document.body.classList.remove('no-select');
                  element.releasePointerCapture(e.pointerId);

                  const windowData = openWindows[element.dataset.instanceId];
                  if (windowData && !windowData.isMaximized) {
                      windowData.originalRect.left = element.style.left;
                      windowData.originalRect.top = element.style.top;
                  }
                  // Final position check after drag
                  if (windowData && !windowData.isMinimized && !windowData.isMaximized) {
                      keepSingleWindowOnScreen(element, windowData);
                  }
              }
          });
      }

      function toggleMinimizeWindow(windowEl) {
          const instanceId = windowEl.dataset.instanceId;
          const windowData = openWindows[instanceId];
          if (!windowData) return;

          windowData.isMinimized = !windowData.isMinimized;
          if (windowData.isMinimized) {
              // Store current state IF NOT MAXIMIZED before minimizing
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
              // Focus next available window or desktop
              const remainingWindows = Object.values(openWindows).filter(ow => ow.element && !ow.isMinimized && ow.element !== windowEl);
              if (remainingWindows.length > 0) {
                  let topWin = null;
                  let maxZ = -1;
                  remainingWindows.forEach(rw => {
                      const z = parseInt(rw.element.style.zIndex) || 0;
                      if (z > maxZ) { maxZ = z; topWin = rw.element; }
                  });
                  if (topWin) focusWindow(topWin);
              } else {
                  desktop.focus();
              }

          } else { // Un-minimizing
              windowEl.style.display = 'flex';
              // If it was maximized, isMaximized is true, focusWindow will handle restore to maximized
              // If it was normal, originalRectBeforeMinimize should be used
              if (!windowData.isMaximized && windowData.originalRectBeforeMinimize) {
                  windowEl.style.left = windowData.originalRectBeforeMinimize.left;
                  windowEl.style.top = windowData.originalRectBeforeMinimize.top;
                  windowEl.style.width = windowData.originalRectBeforeMinimize.width;
                  windowEl.style.height = windowData.originalRectBeforeMinimize.height;
              }
              focusWindow(windowEl); // This will set active state, z-index, taskbar button
          }
      }

      function toggleMaximizeWindow(windowEl) {
          const instanceId = windowEl.dataset.instanceId;
          const windowData = openWindows[instanceId];
          if (!windowData || windowData.isMinimized) return;

          const maximizeBtn = windowEl.querySelector('.window-maximize-btn');
          const titleBar = windowEl.querySelector('.window-titlebar');
          const appDef = APP_DEFINITIONS[windowData.appId];


          if (windowData.isMaximized) { // Restore
              if (windowData.originalRect) {
                  windowEl.style.left = windowData.originalRect.left;
                  windowEl.style.top = windowData.originalRect.top;
                  windowEl.style.width = windowData.originalRect.width;
                  windowEl.style.height = windowData.originalRect.height;
              } else {
                  const tempWidth = (appDef && appDef.defaultWidth) || 450;
                  const tempHeight = (appDef && appDef.defaultHeight) || 300;
                  windowEl.style.left = `${(desktop.clientWidth - tempWidth) / 2}px`;
                  windowEl.style.top = `${(desktop.clientHeight - tempHeight) / 3}px`;
                  windowEl.style.width = `${tempWidth}px`;
                  windowEl.style.height = `${tempHeight}px`;
              }
              windowData.isMaximized = false;
              windowEl.classList.remove('maximized');
              maximizeBtn.innerHTML = '&#x2610;'; // Maximize symbol (Ballot Box)
              maximizeBtn.title = 'Maximize';
              titleBar.style.cursor = 'grab';
          } else { // Maximizing
              windowData.originalRect = {
                  left: windowEl.style.left,
                  top: windowEl.style.top,
                  width: windowEl.style.width || `${windowEl.offsetWidth}px`,
                  height: windowEl.style.height || `${windowEl.offsetHeight}px`
              };
              windowEl.style.left = '0px';
              windowEl.style.top = '0px';
              windowEl.style.width = `${desktop.clientWidth}px`;
              windowEl.style.height = `${desktop.clientHeight}px`;
              windowData.isMaximized = true;
              windowEl.classList.add('maximized');
              maximizeBtn.innerHTML = '&#x29C9;'; // Restore symbol (Two Joined Squares)
              maximizeBtn.title = 'Restore';
              titleBar.style.cursor = 'default';
          }
          focusWindow(windowEl);
          // Ensure on-screen after state change
          if (!windowData.isMinimized && !windowData.isMaximized) {
              keepSingleWindowOnScreen(windowEl, windowData);
          } else if (windowData.isMaximized) {
              // Ensure maximized dimensions are correct after potential async operations
              windowEl.style.left = '0px';
              windowEl.style.top = '0px';
              windowEl.style.width = `${desktop.clientWidth}px`;
              windowEl.style.height = `${desktop.clientHeight}px`;
          }
      }

      document.querySelectorAll('.desktop-icon').forEach(item => {
          // Click and dblclick listeners are now primarily handled by desktop-icons.js
          // This is for launching apps. desktop-icons.js handles selection.
          item.addEventListener('dblclick', (e) => {
              const appId = item.dataset.appId;
              if (appId) createWindow(appId);
          });
      });

      document.querySelectorAll('.start-menu-item').forEach(item => {
           item.addEventListener('click', (e) => {
              if (item.classList.contains('disabled')) return;
              const appId = item.dataset.appId;
              if (item.id === 'shutdownButtonTrigger') {
                  createWindow("shutdownDialog");
              } else if (appId) {
                  createWindow(appId);
              }
              // Close start menu after item click
              startMenu.style.display = 'none';
              startButton.style.borderStyle = 'outset';
          });
      });
  });

  window.addEventListener('message', ({isTrusted, data, origin}) => {
    if ( ! isTrusted ) return;
    const topOffset = window.screen.availHeight - window.visualViewport.height;
    const leftOffset = window.screen.availWidth - window.visualViewport.width;
    switch(data.type) {
      case "pointermove": {
        const {pointermove} = data;
        pointermove.screenX -= window.screenX + leftOffset;
        pointermove.screenY -= window.screenY + topOffset;
        pointermove.clientX = pointermove.screenX;
        pointermove.clientY = pointermove.screenY;
        pointermove.preventDefault = () => void 0;
        pointermove.stopPropagation = () => void 0;
        if (globalThis.updateDragMove) {
            globalThis.updateDragMove(pointermove);
        }
      }; break;
      default: {
      }; break;
    }
  });
