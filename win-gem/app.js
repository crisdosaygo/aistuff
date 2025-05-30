// app.js
import {BrowserApp} from './browser.js';

// windows awesome
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
      internetBrowser: {
          netscape: true,
          title: "Internet Browser",
          icon: "https://win98icons.alexmeub.com/icons/png/search_web-0.png",
          defaultWidth: 700,
          defaultHeight: 500,
          generateContent: (windowInstanceId, webviewId) => BrowserApp.generateInitialHTML(webviewId),
          initApp: (windowEl, windowInstanceId, webviewId, appDefinition) => {
              return new BrowserApp(windowEl, windowInstanceId, webviewId, appDefinition.netscape);
          }
      },
      internetExplorer: {
          netscape: false,
          title: "Internet Explorer",
          icon: "https://win98icons.alexmeub.com/icons/png/msie2-0.png",
          defaultWidth: 700,
          defaultHeight: 500,
          generateContent: (windowInstanceId, webviewId) => BrowserApp.generateInitialHTML(webviewId),
          initApp: (windowEl, windowInstanceId, webviewId, appDefinition) => {
              return new BrowserApp(windowEl, windowInstanceId, webviewId, appDefinition.netscape);
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
              return new BrowserApp(windowEl, windowInstanceId, webviewId, appDefinition.netscape);
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
      let openWindows = {};
      let windowIdCounter = 0;

      // --- FOCUS MANAGEMENT & KEYBOARD NAVIGATION ---
      const activeFocusContainers = []; // Stack-like, last element is current active container

      function setFocusToContainer(containerElement) {
          // Remove .keyboard-focused from previously focused container's items
          const oldContainer = activeFocusContainers.length > 0 ? activeFocusContainers[activeFocusContainers.length - 1] : null;
          if (oldContainer && oldContainer !== containerElement) {
              oldContainer.querySelectorAll('.keyboard-focused').forEach(el => el.classList.remove('keyboard-focused'));
          }
          
          // Update stack
          if (activeFocusContainers.length > 0 && activeFocusContainers[activeFocusContainers.length - 1] === containerElement) {
              // Already the active container, do nothing to stack
          } else {
              // Remove if exists elsewhere, then push
              const existingIndex = activeFocusContainers.indexOf(containerElement);
              if (existingIndex > -1) activeFocusContainers.splice(existingIndex, 1);
              activeFocusContainers.push(containerElement);
          }
      }


      function manageFocusableCollection(container, itemSelector, is2D = false, activateWithSpace = true) {
          if (!container) {
            console.warn("manageFocusableCollection: Container not found for selector:", itemSelector);
            return;
          }
          // Get items dynamically within event handlers to account for changes in visibility/DOM
          const getItems = () => Array.from(container.querySelectorAll(itemSelector));
          
          let currentFocusedIndex = -1; // Index relative to `getVisibleItems()`

          const getVisibleItems = () => getItems().filter(item => item.offsetParent !== null && !item.classList.contains('disabled'));

          function setFocusOnItem(index, focusOptions = { preventScroll: false }) {
              const visibleItems = getVisibleItems();
              if (!visibleItems.length) {
                currentFocusedIndex = -1;
                return;
              }

              // Remove focus from previously focused item in this container
              const previouslyFocusedItem = visibleItems[currentFocusedIndex];
              if (previouslyFocusedItem) {
                  previouslyFocusedItem.classList.remove('keyboard-focused');
              }

              currentFocusedIndex = (index + visibleItems.length) % visibleItems.length;

              const newItemToFocus = visibleItems[currentFocusedIndex];
              if (newItemToFocus) {
                  newItemToFocus.classList.add('keyboard-focused');
                  newItemToFocus.focus(focusOptions); // Set actual DOM focus
                  setFocusToContainer(container); 
              }
          }
          
          container.addEventListener('focus', () => { // When the container itself gets focus
              const visibleItems = getVisibleItems();
              // If no item within this container is already marked as keyboard-focused, focus the first one.
              if (visibleItems.length > 0 && !visibleItems.some(item => item.classList.contains('keyboard-focused'))) {
                  setFocusOnItem(0, { preventScroll: true });
              }
          }, true); // Capture phase can be useful here


          container.addEventListener('keydown', (e) => {
              // If an active window (not this container, unless this container IS a window) has focus, let it handle.
              // This check is primarily for #desktop and #startMenu containers.
              if (container === desktop || container === startMenu) {
                  const activeWindow = Object.values(openWindows).find(ow => !ow.isMinimized && (ow.element === document.activeElement || ow.element.contains(document.activeElement)));
                  if (activeWindow && activeWindow.element !== container) {
                      return; // Active window should handle its own keys
                  }
                  if (container === desktop && startMenu.style.display === 'flex' && (startMenu === document.activeElement || startMenu.contains(document.activeElement))) {
                      return; // Start menu is active, let it handle
                  }
              }
              
              const visibleItems = getVisibleItems();
              if (!visibleItems.length) return;

              // Ensure currentFocusedIndex is correct if focus moved by mouse/other means
              const currentDOMFocusedItem = document.activeElement;
              const domFocusIndex = visibleItems.indexOf(currentDOMFocusedItem);

              if (domFocusIndex !== -1 && domFocusIndex !== currentFocusedIndex) {
                  // DOM focus is on one of our items, but not the one we thought. Sync.
                  if(visibleItems[currentFocusedIndex]) visibleItems[currentFocusedIndex].classList.remove('keyboard-focused');
                  currentFocusedIndex = domFocusIndex;
                  visibleItems[currentFocusedIndex].classList.add('keyboard-focused'); // Ensure it has the class
              } else if (domFocusIndex === -1 && currentFocusedIndex === -1 && visibleItems.length > 0) {
                  // No item focused, default to first
                  setFocusOnItem(0);
                  if (!visibleItems[0]) return; // Guard
              } else if (currentFocusedIndex === -1 && visibleItems.length > 0) {
                  // currentFocusedIndex is stale, but DOM focus might be on container or outside. Reset to first.
                  setFocusOnItem(0);
                  if (!visibleItems[0]) return; // Guard
              } else if (currentFocusedIndex >= visibleItems.length) { // Index out of bounds
                  setFocusOnItem(0); // Reset to first
                  if (!visibleItems[0]) return;
              }


              // If focus is inside an input/textarea within this managed collection (less common for desktop/startmenu)
              const activeEl = document.activeElement;
              if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && container.contains(activeEl)) {
                  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab', 'Escape', ' '].includes(e.key)) {
                      return; // Let input handle typing
                  }
              }
              
              let newIndex = currentFocusedIndex;
              let handled = false;

              switch (e.key) {
                  case 'ArrowDown':
                      newIndex = is2D ? findNextIcon(visibleItems, currentFocusedIndex, 'down') : (currentFocusedIndex + 1);
                      handled = true;
                      break;
                  case 'ArrowUp':
                      newIndex = is2D ? findNextIcon(visibleItems, currentFocusedIndex, 'up') : (currentFocusedIndex - 1);
                      handled = true;
                      break;
                  case 'ArrowRight':
                      if (is2D) newIndex = findNextIcon(visibleItems, currentFocusedIndex, 'right');
                      // else if (!is2D) newIndex = currentFocusedIndex + 1; // For 1D, right can be same as down
                      else newIndex = currentFocusedIndex; // Noop for 1D right
                      if (is2D) handled = true;
                      break;
                  case 'ArrowLeft':
                      if (is2D) newIndex = findNextIcon(visibleItems, currentFocusedIndex, 'left');
                      // else if (!is2D) newIndex = currentFocusedIndex - 1; // For 1D, left can be same as up
                      else newIndex = currentFocusedIndex; // Noop for 1D left
                      if (is2D) handled = true;
                      break;
                  case 'Enter':
                      if (visibleItems[currentFocusedIndex]) {
                          if (visibleItems[currentFocusedIndex].classList.contains('desktop-icon')) {
                              const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window });
                              visibleItems[currentFocusedIndex].dispatchEvent(dblClickEvent);
                          } else {
                              visibleItems[currentFocusedIndex].click();
                          }
                          handled = true;
                      }
                      break;
                  case ' ':
                      if (activateWithSpace && visibleItems[currentFocusedIndex]) {
                          visibleItems[currentFocusedIndex].click();
                          handled = true;
                      }
                      break;
                  case 'Tab':
                      if (visibleItems[currentFocusedIndex]) {
                          visibleItems[currentFocusedIndex].classList.remove('keyboard-focused');
                      }
                      currentFocusedIndex = -1;
                      // Allow default Tab behavior to move focus out of the container
                      return; 
              }

              if (handled) {
                  e.preventDefault();
                  // For desktop/start menu, stopPropagation is generally fine as they are top-level UI.
                  // If this was used INSIDE a window with text inputs, stopPropagation would be an issue.
                  if (container === desktop || container === startMenu) {
                    e.stopPropagation();
                  }
                  
                  // Ensure newIndex is valid before calling setFocusOnItem
                  const numVisible = visibleItems.length;
                  if (numVisible > 0) {
                      newIndex = (newIndex + numVisible) % numVisible; // Wrap around
                      if (newIndex !== currentFocusedIndex || !visibleItems[currentFocusedIndex]?.classList.contains('keyboard-focused')) {
                          setFocusOnItem(newIndex);
                      }
                  }
              }
          });

          // Make container itself focusable if it wasn't already and has items
          if (getItems().length > 0 && !container.hasAttribute('tabindex')) {
              container.setAttribute('tabindex', '0');
          }
      }
      
      function findNextIcon(icons, currentIndex, direction) {
          if (icons.length <= 1) return currentIndex;
          let newIndex = currentIndex;
          if (direction === 'down' || direction === 'right') {
              newIndex = (currentIndex + 1);
          } else if (direction === 'up' || direction === 'left') {
              newIndex = (currentIndex - 1);
          }
          // relies on setFocusOnItem to wrap index
          return newIndex;
      }

      const focusStyles = `
          .desktop-icon.keyboard-focused {
              outline: 1px dotted #fff !important;
              outline-offset: -1px;
          }
          .desktop-icon.keyboard-focused span {
              background-color: #000080;
          }
          .start-menu-item.keyboard-focused {
              background-color: #000080 !important;
              color: white !important;
          }
          /* Remove default browser focus outline if using custom */
          .desktop-icon:focus, .start-menu-item:focus, #desktop:focus, #startMenu:focus, .window:focus {
              outline: none;
          }
      `;
      const styleSheet = document.createElement("style");
      styleSheet.type = "text/css";
      styleSheet.innerText = focusStyles;
      document.head.appendChild(styleSheet);
      // --- END FOCUS MANAGEMENT ---


      // --- Desktop Icon Selection & Marquee ---
      let isMarqueeSelecting = false;
      let marqueeRectEl = null;
      let marqueeStartX, marqueeStartY, marqueeStartScrollX, marqueeStartScrollY;
      // Icon Dragging variables (still assuming flex layout, so actual drag is disabled)
      // let isDraggingIcons = false; // Uncomment if enabling drag with absolute positioning

      function updateIconSelectionFromMarquee() { /* ... (same as before) ... */
          if (!marqueeRectEl) return;
          const marqueeBox = marqueeRectEl.getBoundingClientRect();
          document.querySelectorAll('.desktop-icon').forEach(icon => {
              const iconBox = icon.getBoundingClientRect();
              const intersects = !(
                  marqueeBox.right < iconBox.left ||
                  marqueeBox.left > iconBox.right ||
                  marqueeBox.bottom < iconBox.top ||
                  marqueeBox.top > iconBox.bottom
              );
              if (intersects) {
                  icon.classList.add('selected');
              } else if (!event.ctrlKey) { 
                  icon.classList.remove('selected');
              }
          });
      }

      desktop.addEventListener('mousedown', (e) => { /* ... (same as before, drag logic still commented) ... */
          const clickedOnIcon = e.target.closest('.desktop-icon');
          const clickedOnWindow = e.target.closest('.window');

          if (clickedOnWindow) return; // Let window mousedown handler take over

          if (e.button === 0) { // Left mouse button
              marqueeStartX = e.clientX; 
              marqueeStartY = e.clientY;
              marqueeStartScrollX = desktop.scrollLeft;
              marqueeStartScrollY = desktop.scrollTop;

              if (clickedOnIcon) {
                  e.stopPropagation(); // Prevent desktop mousedown from creating marquee immediately
                  
                  if (!e.ctrlKey && !e.shiftKey && !clickedOnIcon.classList.contains('selected')) {
                      deselectAllDesktopIcons(clickedOnIcon); 
                      clickedOnIcon.classList.add('selected');
                  } else if (e.ctrlKey) {
                      clickedOnIcon.classList.toggle('selected');
                  } else if (e.shiftKey) {
                      // Shift-click range selection (basic: select from last selected/focused to this one)
                      // This is a simplified version. A robust one needs to track the "anchor" of selection.
                      const visibleIcons = Array.from(desktop.querySelectorAll('.desktop-icon:not(.disabled)'));
                      const currentKBFocused = visibleIcons.find(icon => icon.classList.contains('keyboard-focused'));
                      const anchorIcon = currentKBFocused || visibleIcons.find(icon => icon.classList.contains('selected')); // Fallback to any selected
                      
                      if (anchorIcon) {
                          const anchorIndex = visibleIcons.indexOf(anchorIcon);
                          const clickIndex = visibleIcons.indexOf(clickedOnIcon);
                          if (anchorIndex !== -1 && clickIndex !== -1) {
                              if (!e.ctrlKey) deselectAllDesktopIcons(); // Clear previous unless Ctrl is also held
                              const start = Math.min(anchorIndex, clickIndex);
                              const end = Math.max(anchorIndex, clickIndex);
                              for (let i = start; i <= end; i++) {
                                  visibleIcons[i].classList.add('selected');
                              }
                          }
                      } else { // No anchor, just select this one
                          if (!e.ctrlKey) deselectAllDesktopIcons(clickedOnIcon);
                          clickedOnIcon.classList.add('selected');
                      }
                  } else if (!clickedOnIcon.classList.contains('selected')) { 
                       deselectAllDesktopIcons(clickedOnIcon);
                       clickedOnIcon.classList.add('selected');
                  }
                  
                  // ICON DRAGGING CODE IS STILL COMMENTED HERE
                  // To enable, change icon CSS to position:absolute and uncomment the block.
                  
                  // Update keyboard focus to the clicked icon
                  document.querySelectorAll('.desktop-icon.keyboard-focused').forEach(kf => kf.classList.remove('keyboard-focused'));
                  clickedOnIcon.classList.add('keyboard-focused');
                  clickedOnIcon.focus({ preventScroll: true });

              } else { // Clicked on empty desktop
                  if (!e.ctrlKey) deselectAllDesktopIcons(); // Deselect if not holding Ctrl
                  isMarqueeSelecting = true;
                  marqueeRectEl = document.createElement('div');
                  marqueeRectEl.className = 'marquee-rect';
                  const desktopRect = desktop.getBoundingClientRect();
                  marqueeRectEl.style.left = `${marqueeStartX - desktopRect.left + marqueeStartScrollX}px`;
                  marqueeRectEl.style.top = `${marqueeStartY - desktopRect.top + marqueeStartScrollY}px`;
                  marqueeRectEl.style.width = '0px';
                  marqueeRectEl.style.height = '0px';
                  desktop.appendChild(marqueeRectEl);
                  desktop.style.cursor = 'crosshair';
              }
          }
      });

      document.addEventListener('mousemove', (e) => { /* ... (same as before, drag logic still commented) ... */
          if (isMarqueeSelecting && marqueeRectEl) {
              const currentX = e.clientX;
              const currentY = e.clientY;
              const desktopRect = desktop.getBoundingClientRect();
              
              let rLeft = Math.min(marqueeStartX, currentX);
              let rTop = Math.min(marqueeStartY, currentY);
              const rWidth = Math.abs(currentX - marqueeStartX);
              const rHeight = Math.abs(currentY - marqueeStartY);

              // Position marquee relative to desktop's viewport scrolled position
              marqueeRectEl.style.left = `${rLeft - desktopRect.left + desktop.scrollLeft}px`;
              marqueeRectEl.style.top = `${rTop - desktopRect.top + desktop.scrollTop}px`;
              marqueeRectEl.style.width = `${rWidth}px`;
              marqueeRectEl.style.height = `${rHeight}px`;
              updateIconSelectionFromMarquee();
          }
          // ICON DRAGGING MOUSEMOVE LOGIC IS STILL COMMENTED HERE
      });

      document.addEventListener('mouseup', (e) => { /* ... (same as before, drag logic still commented) ... */
          if (isMarqueeSelecting) {
              isMarqueeSelecting = false;
              if (marqueeRectEl) {
                  marqueeRectEl.remove();
                  marqueeRectEl = null;
              }
              desktop.style.cursor = 'default';
          }
          // ICON DRAGGING MOUSEUP LOGIC IS STILL COMMENTED HERE
      });

      function deselectAllDesktopIcons(exceptionIcon = null) { /* ... (same as before) ... */
          document.querySelectorAll('.desktop-icon.selected').forEach(icon => {
              if (icon !== exceptionIcon) icon.classList.remove('selected');
          });
          document.querySelectorAll('.desktop-icon.keyboard-focused').forEach(icon => {
             if (icon !== exceptionIcon) icon.classList.remove('keyboard-focused');
          });
      }

      const marqueeStyle = ` /* ... (same as before) ... */ `;
      const marqueeStyleSheet = document.createElement("style");
      marqueeStyleSheet.type = "text/css";
      marqueeStyleSheet.innerText = marqueeStyle;
      document.head.appendChild(marqueeStyleSheet);

      function updateClock() { /* ... (same as before) ... */ }
      setInterval(updateClock, 1000); updateClock();

      startButton.addEventListener('click', (event) => { /* ... (same as before) ... */
          event.stopPropagation();
          const isOpening = startMenu.style.display !== 'flex';
          startMenu.style.display = isOpening ? 'flex' : 'none';
          startButton.style.borderStyle = isOpening ? 'inset' : 'outset';
          if (isOpening) {
              startMenu.focus(); 
          } else {
              startButton.focus();
          }
      });

      document.addEventListener('click', (event) => { /* ... (same as before) ... */
          if (startMenu.style.display === 'flex' && !startMenu.contains(event.target) && event.target !== startButton && !startButton.contains(event.target)) {
              startMenu.style.display = 'none';
              startButton.style.borderStyle = 'outset';
              startButton.focus(); 
          }
          if (event.target === desktop || event.target.closest('.taskbar')) {
              if (!event.target.closest('.desktop-icon') && !event.target.closest('.window')) { // Also check not clicking window
                   deselectAllDesktopIcons();
              }
          }
      });
      
      desktop.addEventListener('click', (e) => { /* ... (same as before) ... */
          if (e.target === desktop) {
              if(!e.ctrlKey) deselectAllDesktopIcons();
              desktop.focus();
          }
      });

      function createWindow(appId) { /* ... (same as before, but calls modified focusWindow) ... */
          startMenu.style.display = 'none';
          startButton.style.borderStyle = 'outset';
          const appDef = APP_DEFINITIONS[appId];
          if (!appDef) { console.error("App definition not found for:", appId); return; }

          if (!appDef.isDialog) { /* ... existing instance check ... */
              const existingInstance = Object.values(openWindows).find(ow => ow.appId === appId && ow.element && document.body.contains(ow.element));
              if (existingInstance) {
                  if (existingInstance.isMinimized) toggleMinimizeWindow(existingInstance.element);
                  else focusWindow(existingInstance.element); // Pass only windowEl
                  return;
              }
          }
          const windowInstanceId = `window-${appId}-${windowIdCounter++}`;
          const windowEl = windowTemplate.content.firstElementChild.cloneNode(true);
          windowEl.dataset.appId = appId;
          windowEl.dataset.instanceId = windowInstanceId;
          windowEl.querySelector('.window-titlebar-icon').src = appDef.icon;
          windowEl.querySelector('.window-titlebar-icon').alt = appDef.title;
          windowEl.querySelector('.window-title').textContent = appDef.netscape ? (APP_DEFINITIONS?.netscapeNavigator?.title || 'Netscape Navigator') : appDef.title;

          let webviewId = null;
          if (['internetBrowser', 'internetExplorer', 'netscapeNavigator'].includes(appId)) {
              webviewId = `webview-${windowInstanceId}`;
          }

          if (appDef.generateContent) {
              windowEl.querySelector('.window-content').innerHTML = appDef.generateContent(windowInstanceId, webviewId);
          } else {
              windowEl.querySelector('.window-content').innerHTML = typeof appDef.content === 'function' ? appDef.content() : appDef.content;
          }
          
          // ... (sizing and positioning logic same as before) ...
          let defaultWidth = appDef.defaultWidth || 450;
          let defaultHeight = appDef.defaultHeight || 300;
          if (appDef.isDialog) {
              defaultWidth = appDef.defaultWidth || 380; defaultHeight = appDef.defaultHeight || 220;
              windowEl.style.minWidth = appDef.minWidth || '300px'; windowEl.style.minHeight = appDef.minHeight || '180px';
              windowEl.style.left = `${Math.max(0, (desktop.offsetWidth - defaultWidth) / 2)}px`;
              windowEl.style.top = `${Math.max(0, (desktop.offsetHeight - defaultHeight) / 3)}px`;
          } else {
              windowEl.style.left = `${Math.floor(Math.random() * Math.max(0, (desktop.offsetWidth - defaultWidth - 40))) + 20}px`;
              windowEl.style.top = `${Math.floor(Math.random() * Math.max(0, (desktop.offsetHeight - defaultHeight - 40))) + 20}px`;
          }
          windowEl.style.width = `${defaultWidth}px`; windowEl.style.height = `${defaultHeight}px`;

          highestZIndex++;
          windowEl.style.zIndex = highestZIndex;
          desktop.appendChild(windowEl);
          Object.values(openWindows).forEach(ow => { if (ow.element) ow.element.classList.add('inactive'); });
          
          const newWindowData = { /* ... (same as before) ... */
              element: windowEl, taskbarButton: null, appId: appId,
              originalRect: { left: windowEl.style.left, top: windowEl.style.top, width: windowEl.style.width, height: windowEl.style.height },
              isMinimized: false, isMaximized: false, appInstance: null
          };
          openWindows[windowInstanceId] = newWindowData;

          if (appDef.initApp) {
              newWindowData.appInstance = appDef.initApp(windowEl, windowInstanceId, webviewId, appDef);
          }

          if (!appDef.isDialog) { /* ... (same as before) ... */
              makeDraggable(windowEl); makeResizable(windowEl);
              addWindowToTaskbar(windowEl, appDef.title, appDef.icon, windowInstanceId);
              windowEl.querySelector('.window-minimize-btn').addEventListener('click', () => toggleMinimizeWindow(windowEl));
              windowEl.querySelector('.window-maximize-btn').addEventListener('click', () => toggleMaximizeWindow(windowEl));
          } else { /* ... (same as before) ... */
              windowEl.querySelector('.window-minimize-btn').style.display = 'none';
              windowEl.querySelector('.window-maximize-btn').style.display = 'none';
              makeDraggable(windowEl);
          }
          windowEl.querySelector('.window-close-btn').addEventListener('click', () => closeWindow(windowEl));
          
          // MODIFIED mousedown listener for windowEl
          windowEl.addEventListener('mousedown', (e) => {
              focusWindow(windowEl, e.target); // Pass the event target
          }, true); // Keep capture phase
          
          windowEl.setAttribute('tabindex', '-1'); 
          focusWindow(windowEl); // Initial focus, e.target will be null
          return windowEl;
      }

      function makeResizable(element) { /* ... (same as before) ... */ }

      // MODIFIED focusWindow function
      function focusWindow(windowEl, eventTarget = null) {
          if (!windowEl || !document.body.contains(windowEl)) return;
          const instanceId = windowEl.dataset.instanceId;
          const windowData = openWindows[instanceId];
          if (!windowData) return;

          if (windowData.isMinimized) {
              toggleMinimizeWindow(windowEl);
              return;
          }

          windowEl.classList.remove('inactive');
          Object.values(openWindows).forEach(ow => {
              if (ow.element && ow.element !== windowEl) {
                  ow.element.classList.add('inactive');
              }
          });
          highestZIndex++;
          windowEl.style.zIndex = highestZIndex;
          document.querySelectorAll('.taskbar-button').forEach(btn => btn.classList.remove('active'));
          if (windowData.taskbarButton) {
              windowData.taskbarButton.classList.add('active');
              windowData.taskbarButton.classList.remove('minimized');
          }
          
          deselectAllDesktopIcons();
          startMenu.querySelectorAll('.keyboard-focused').forEach(el => el.classList.remove('keyboard-focused'));
          if (startMenu.style.display === 'flex') {
              startMenu.style.display = 'none';
              startButton.style.borderStyle = 'outset';
          }

          let elementToActuallyFocus = null;
          const focusableSelector = '.browser-address-bar, textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

          if (eventTarget && windowEl.contains(eventTarget) && eventTarget.matches(focusableSelector)) {
              elementToActuallyFocus = eventTarget;
          } else {
              elementToActuallyFocus = windowEl.querySelector(focusableSelector) || 
                                     windowEl.querySelector('.window-content') || 
                                     windowEl; 
          }
          
          // Only change focus if it's not already on the target or within a child of the target (e.g. text selection)
          if (elementToActuallyFocus && document.activeElement !== elementToActuallyFocus && !elementToActuallyFocus.contains(document.activeElement)) {
              // console.log("Focusing in window:", elementToActuallyFocus);
              elementToActuallyFocus.focus({ preventScroll: true });
          } else if (!document.activeElement || !windowEl.contains(document.activeElement)) {
              // If focus is completely outside, or nothing specific was found, focus the window element itself
              // console.log("Fallback focusing window element:", windowEl);
              windowEl.focus({ preventScroll: true });
          }
          setFocusToContainer(windowEl);
      }


      function closeWindow(windowEl) { /* ... (same as before) ... */ }
      function addWindowToTaskbar(windowEl, title, iconSrc, instanceId) { /* ... (same as before) ... */ }
      function makeDraggable(element) { /* ... (same as before, ensure focusWindow(element) is called without e.target) ... */
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
              focusWindow(element); // Call without e.target, so it focuses first focusable
          });
          // ... rest of makeDraggable
          document.addEventListener('mousemove', (e) => {
              if (!isDragging) return;
              e.preventDefault();
              let newX = e.clientX - offsetX;
              let newY = e.clientY - offsetY;
              const desktopRect = desktop.getBoundingClientRect();
              const winRect = element.getBoundingClientRect();
              newX = Math.max(0, Math.min(newX, desktopRect.width - winRect.width));
              newY = Math.max(0, Math.min(newY, desktopRect.height - winRect.height));
              element.style.left = `${newX}px`;
              element.style.top = `${newY}px`;
          });
          document.addEventListener('mouseup', () => {
              if (isDragging) {
                  isDragging = false;
                  titleBar.style.cursor = 'grab';
                  const windowData = openWindows[element.dataset.instanceId];
                  if(windowData && !windowData.isMaximized){
                      windowData.originalRect.left = element.style.left;
                      windowData.originalRect.top = element.style.top;
                  }
              }
          });
      }
      function toggleMinimizeWindow(windowEl) { /* ... (same as before) ... */ }
      function toggleMaximizeWindow(windowEl) { /* ... (same as before) ... */ }

      document.querySelectorAll('.desktop-icon').forEach(item => { /* ... (same as before) ... */ });
      document.querySelectorAll('.start-menu-item').forEach(item => { /* ... (same as before) ... */ });

      manageFocusableCollection(desktop, '.desktop-icon', true, false);
      manageFocusableCollection(startMenu, '.start-menu-items-container .start-menu-item', false, true);
      
      desktop.focus();
  });
