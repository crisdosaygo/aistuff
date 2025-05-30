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
                          <li style="margin-bottom:5px;"><img src="https://win98icons.alexmeub.com/icons/png/drive_3_5-0.png" style="width:20px; height:20px; vertical-align:middle; margin-right:5px;"> 3¬Ω Floppy (A:)</li>
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
              return new BrowserApp(windowEl, windowInstanceId, webviewId, appDefinition.netscape); // Corrected: Removed last appDefinition
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
              return new BrowserApp(windowEl, windowInstanceId, webviewId, appDefinition.netscape); // Corrected
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
              return new BrowserApp(windowEl, windowInstanceId, webviewId, appDefinition.netscape); // Corrected
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
      const activeFocusContainers = [];

      function setFocusToContainer(containerElement) {
          const oldContainer = activeFocusContainers.length > 0 ? activeFocusContainers[activeFocusContainers.length - 1] : null;
          if (oldContainer && oldContainer !== containerElement) {
              oldContainer.querySelectorAll('.keyboard-focused').forEach(el => el.classList.remove('keyboard-focused'));
          }
          activeFocusContainers.pop(); // Remove old
          activeFocusContainers.push(containerElement); // Add new
      }

      function manageFocusableCollection(container, itemSelector, is2D = false, activateWithSpace = true) {
          if (!container) {
            console.warn("manageFocusableCollection: Container not found.");
            return;
          }
          let items = Array.from(container.querySelectorAll(itemSelector));
          if (!items.length) return;

          items.forEach((item, index) => {
              item.setAttribute('tabindex', '-1');
              item.classList.remove('keyboard-focused');
          });

          let currentFocusedIndex = -1;

          const getVisibleItems = () => items.filter(item => item.offsetParent !== null && !item.classList.contains('disabled'));


          function setFocusOnItem(index, focusOptions = { preventScroll: false }) {
              const visibleItems = getVisibleItems();
              if (!visibleItems.length) {
                currentFocusedIndex = -1; // No visible items to focus
                return;
              }

              if (currentFocusedIndex >= 0 && currentFocusedIndex < visibleItems.length && visibleItems[currentFocusedIndex]) {
                  visibleItems[currentFocusedIndex].classList.remove('keyboard-focused');
              }

              currentFocusedIndex = (index + visibleItems.length) % visibleItems.length;

              const newItemToFocus = visibleItems[currentFocusedIndex];
              if (newItemToFocus) {
                  newItemToFocus.classList.add('keyboard-focused');
                  newItemToFocus.focus(focusOptions);
                  setFocusToContainer(container);
              }
          }

          container.addEventListener('focus', () => {
              const visibleItems = getVisibleItems();
              if (visibleItems.length > 0 && !visibleItems.some(item => item.classList.contains('keyboard-focused'))) {
                  setFocusOnItem(0, { preventScroll: true });
              }
          }, true); // Use capture to ensure container focus sets up item focus


          container.addEventListener('keydown', (e) => {
              const visibleItems = getVisibleItems();
              if (!visibleItems.length) return;

              const activeElementIsItem = visibleItems.includes(document.activeElement);

              if (!activeElementIsItem || !visibleItems[currentFocusedIndex] || document.activeElement !== visibleItems[currentFocusedIndex]) {
                  // Try to find the currently focused item if it's one of ours, or default to first
                  const idx = visibleItems.indexOf(document.activeElement);
                  if (idx !== -1) {
                      currentFocusedIndex = idx;
                      // Ensure .keyboard-focused is on the actual activeElement
                      if (!document.activeElement.classList.contains('keyboard-focused')) {
                           items.forEach(it => it.classList.remove('keyboard-focused')); // Clear others
                           document.activeElement.classList.add('keyboard-focused');
                      }
                  } else if (visibleItems.length > 0) {
                     // If focus is lost or on container, reset to first item
                     setFocusOnItem(0);
                     if (!visibleItems[0]) return; // Guard if setFocusOnItem failed
                  } else {
                      return; // No items to navigate
                  }
              }
              
              let newIndex = currentFocusedIndex;
              let handled = false;

              switch (e.key) {
                  case 'ArrowDown':
                      newIndex = is2D ? findNextIcon(visibleItems, currentFocusedIndex, 'down') : currentFocusedIndex + 1;
                      handled = true;
                      break;
                  case 'ArrowUp':
                      newIndex = is2D ? findNextIcon(visibleItems, currentFocusedIndex, 'up') : currentFocusedIndex - 1;
                      handled = true;
                      break;
                  case 'ArrowRight':
                      newIndex = is2D ? findNextIcon(visibleItems, currentFocusedIndex, 'right') : (is2D ? currentFocusedIndex +1 : currentFocusedIndex); // Only move right in 2D
                      if (is2D) handled = true;
                      break;
                  case 'ArrowLeft':
                      newIndex = is2D ? findNextIcon(visibleItems, currentFocusedIndex, 'left') : (is2D ? currentFocusedIndex -1 : currentFocusedIndex); // Only move left in 2D
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
                      return;
              }

              if (handled) {
                  e.preventDefault();
                  e.stopPropagation(); // Prevent event from bubbling further, e.g. to window scroll
                  if (newIndex !== currentFocusedIndex || !visibleItems[currentFocusedIndex]?.classList.contains('keyboard-focused')) {
                      setFocusOnItem(newIndex);
                  }
              }
          });

          if (items.length > 0 && !container.hasAttribute('tabindex')) {
              container.setAttribute('tabindex', '0');
          }
      }
      
      // Simplified 2D navigation for flex/grid based layouts (linear)
      function findNextIcon(icons, currentIndex, direction) {
          if (icons.length <= 1) return currentIndex;
          // For flex layout, up/down might mean skipping many horizontal items or vice-versa.
          // This basic version just moves linearly.
          // A more complex solution would involve analyzing getBoundingClientRects of all icons.
          let newIndex = currentIndex;
          // Assuming icons are in DOM order (left-to-right, top-to-bottom for LTR languages)
          if (direction === 'down' || direction === 'right') {
              newIndex = (currentIndex + 1) % icons.length;
          } else if (direction === 'up' || direction === 'left') {
              newIndex = (currentIndex - 1 + icons.length) % icons.length;
          }
          return newIndex;
      }


      const focusStyles = `
          .desktop-icon.keyboard-focused {
              outline: 1px dotted #fff !important;
              outline-offset: -1px; /* Inset outline for flex items */
          }
          .desktop-icon.keyboard-focused span { /* Ensure text background doesn't hide focus */
              background-color: #000080;
          }
          .start-menu-item.keyboard-focused {
              background-color: #000080 !important;
              color: white !important;
          }
          .desktop-icon:focus, .start-menu-item:focus, #desktop:focus, #startMenu:focus {
              outline: none;
          }
      `;
      const styleSheet = document.createElement("style");
      styleSheet.type = "text/css";
      styleSheet.innerText = focusStyles;
      document.head.appendChild(styleSheet);
      // --- END FOCUS MANAGEMENT ---


      // --- Desktop Icon Selection & Dragging ---
      let isMarqueeSelecting = false;
      let marqueeRectEl = null;
      let marqueeStartX, marqueeStartY, marqueeStartScrollX, marqueeStartScrollY;

      // --- Icon Dragging (COMMENTED OUT - requires icons to be position:absolute) ---
      /*
      let isDraggingIcons = false;
      let dragPrimaryIcon = null;
      let dragOffsets = []; // { element, dxRelativeToPrimary, dyRelativeToPrimary, startLeft, startTop }
      let initialMouseXForDrag, initialMouseYForDrag; // Mouse position at start of drag
      */

      function updateIconSelectionFromMarquee() {
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
              } else if (!event.ctrlKey) { // Don't deselect if Ctrl is held (for additive selection - not fully implemented)
                  icon.classList.remove('selected');
              }
          });
      }

      desktop.addEventListener('mousedown', (e) => {
          const clickedOnIcon = e.target.closest('.desktop-icon');
          const clickedOnWindow = e.target.closest('.window');

          if (clickedOnWindow) return;

          if (e.button === 0) {
              marqueeStartX = e.clientX; // Store for both marquee and potential drag
              marqueeStartY = e.clientY;
              marqueeStartScrollX = desktop.scrollLeft;
              marqueeStartScrollY = desktop.scrollTop;

              if (clickedOnIcon) {
                  e.stopPropagation();
                  
                  if (!e.ctrlKey && !e.shiftKey && !clickedOnIcon.classList.contains('selected')) {
                      deselectAllDesktopIcons(clickedOnIcon); // Pass exception
                      clickedOnIcon.classList.add('selected');
                  } else if (e.ctrlKey) {
                      clickedOnIcon.classList.toggle('selected');
                  } else if (e.shiftKey) {
                      // TODO: Implement shift-click range selection
                      // For now, treat as normal click if no existing selection or ctrl
                      if (!clickedOnIcon.classList.contains('selected')) {
                          deselectAllDesktopIcons(clickedOnIcon);
                          clickedOnIcon.classList.add('selected');
                      }
                  } else if (!clickedOnIcon.classList.contains('selected')) { 
                       // Click on unselected without ctrl/shift
                       deselectAllDesktopIcons(clickedOnIcon);
                       clickedOnIcon.classList.add('selected');
                  }
                  // If clicked on an already selected icon (without Ctrl/Shift), prepare for drag
                  
                  // --- Icon Dragging (COMMENTED OUT - requires icons to be position:absolute) ---
                  /*
                  if (clickedOnIcon.classList.contains('selected')) {
                      // Check if icons are absolutely positioned. If not, dragging is not feasible.
                      if (getComputedStyle(clickedOnIcon).position !== 'absolute') {
                          console.warn("Icon dragging is disabled because icons are not absolutely positioned.");
                          return;
                      }
                      isDraggingIcons = true;
                      dragPrimaryIcon = clickedOnIcon;
                      initialMouseXForDrag = e.clientX;
                      initialMouseYForDrag = e.clientY;

                      dragOffsets = [];
                      const primaryIconInitialLeft = dragPrimaryIcon.offsetLeft;
                      const primaryIconInitialTop = dragPrimaryIcon.offsetTop;

                      document.querySelectorAll('.desktop-icon.selected').forEach(selIcon => {
                          selIcon.style.zIndex = highestZIndex + 1;
                          dragOffsets.push({
                              element: selIcon,
                              dxRelativeToPrimary: selIcon.offsetLeft - primaryIconInitialLeft,
                              dyRelativeToPrimary: selIcon.offsetTop - primaryIconInitialTop,
                              startLeft: selIcon.offsetLeft, // Store original position of each icon
                              startTop: selIcon.offsetTop
                          });
                      });
                      desktop.style.cursor = 'grabbing';
                  }
                  */
                  
                  // Keyboard focus management
                  document.querySelectorAll('.desktop-icon.keyboard-focused').forEach(kf => kf.classList.remove('keyboard-focused'));
                  clickedOnIcon.classList.add('keyboard-focused');
                  clickedOnIcon.focus({ preventScroll: true });

              } else { // Clicked on empty desktop: Marquee selection
                  if (!e.ctrlKey) deselectAllDesktopIcons();
                  isMarqueeSelecting = true;

                  marqueeRectEl = document.createElement('div');
                  marqueeRectEl.className = 'marquee-rect';
                  // Initial position relative to viewport, adjusted for scroll
                  marqueeRectEl.style.left = `${marqueeStartX + marqueeStartScrollX - desktop.getBoundingClientRect().left}px`;
                  marqueeRectEl.style.top = `${marqueeStartY + marqueeStartScrollY - desktop.getBoundingClientRect().top}px`;
                  marqueeRectEl.style.width = '0px';
                  marqueeRectEl.style.height = '0px';
                  desktop.appendChild(marqueeRectEl);
                  desktop.style.cursor = 'crosshair';
              }
          }
      });

      document.addEventListener('mousemove', (e) => {
          if (isMarqueeSelecting && marqueeRectEl) {
              const currentX = e.clientX;
              const currentY = e.clientY;
              // Calculate marquee relative to initial mousedown, adjusted for current scroll
              const desktopRect = desktop.getBoundingClientRect();
              
              let left = Math.min(marqueeStartX + marqueeStartScrollX, currentX + desktop.scrollLeft);
              let top = Math.min(marqueeStartY + marqueeStartScrollY, currentY + desktop.scrollTop);
              const width = Math.abs((currentX + desktop.scrollLeft) - (marqueeStartX + marqueeStartScrollX));
              const height = Math.abs((currentY + desktop.scrollTop) - (marqueeStartY + marqueeStartScrollY));

              marqueeRectEl.style.left = `${left - desktopRect.left}px`;
              marqueeRectEl.style.top = `${top - desktopRect.top}px`;
              marqueeRectEl.style.width = `${width}px`;
              marqueeRectEl.style.height = `${height}px`;
              updateIconSelectionFromMarquee();
          }
          // --- Icon Dragging (COMMENTED OUT - requires icons to be position:absolute) ---
          /*
          else if (isDraggingIcons && dragPrimaryIcon) {
              e.preventDefault();
              
              const mouseDeltaX = e.clientX - initialMouseXForDrag;
              const mouseDeltaY = e.clientY - initialMouseYForDrag;

              dragOffsets.forEach(info => {
                  let newLeft = info.startLeft + mouseDeltaX;
                  let newTop = info.startTop + mouseDeltaY;

                  // Boundary checks
                  newLeft = Math.max(0, Math.min(newLeft, desktop.clientWidth - info.element.offsetWidth));
                  newTop = Math.max(0, Math.min(newTop, desktop.clientHeight - info.element.offsetHeight));

                  info.element.style.left = `${newLeft}px`;
                  info.element.style.top = `${newTop}px`;
              });
          }
          */
      });

      document.addEventListener('mouseup', (e) => {
          if (isMarqueeSelecting) {
              isMarqueeSelecting = false;
              if (marqueeRectEl) {
                  marqueeRectEl.remove();
                  marqueeRectEl = null;
              }
              desktop.style.cursor = 'default';
          }
          // --- Icon Dragging (COMMENTED OUT - requires icons to be position:absolute) ---
          /*
          if (isDraggingIcons) {
              isDraggingIcons = false;
              dragOffsets.forEach(info => info.element.style.zIndex = '');
              dragPrimaryIcon = null;
              dragOffsets = [];
              desktop.style.cursor = 'default';
              // Here you might want to save the new icon positions if using absolute positioning
          }
          */
      });

      function deselectAllDesktopIcons(exceptionIcon = null) {
          document.querySelectorAll('.desktop-icon.selected').forEach(icon => {
              if (icon !== exceptionIcon) {
                  icon.classList.remove('selected');
              }
          });
          document.querySelectorAll('.desktop-icon.keyboard-focused').forEach(icon => {
             if (icon !== exceptionIcon) {
                icon.classList.remove('keyboard-focused');
             }
          });
      }

      const marqueeStyle = `
          .marquee-rect {
              position: absolute;
              border: 1px dotted #000; /* In Windows, this is often white or inverted */
              background-color: rgba(0, 0, 0, 0.1); /* Very subtle */
              pointer-events: none;
              z-index: ${highestZIndex + 10};
          }
          .desktop-icon { /* Ensure user-select is none for better marquee */
              user-select: none;
          }
      `;
      const marqueeStyleSheet = document.createElement("style");
      marqueeStyleSheet.type = "text/css";
      marqueeStyleSheet.innerText = marqueeStyle; // Focus styles are already added
      document.head.appendChild(marqueeStyleSheet);


      // --- Clock ---
      function updateClock() { /* ... (same as before) ... */
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
      startButton.addEventListener('click', (event) => { /* ... (same as before, but add focus logic) ... */
          event.stopPropagation();
          const isOpening = startMenu.style.display !== 'flex';
          startMenu.style.display = isOpening ? 'flex' : 'none';
          startButton.style.borderStyle = isOpening ? 'inset' : 'outset';
          if (isOpening) {
              startMenu.focus(); // manageFocusableCollection will handle the first item
          } else {
              startButton.focus();
          }
      });

      document.addEventListener('click', (event) => { /* ... (same as before, but clear focus too) ... */
          if (startMenu.style.display === 'flex' && !startMenu.contains(event.target) && event.target !== startButton && !startButton.contains(event.target)) {
              startMenu.style.display = 'none';
              startButton.style.borderStyle = 'outset';
              startButton.focus(); // Return focus
          }
          if (event.target === desktop || event.target.closest('.taskbar')) {
              if (!event.target.closest('.desktop-icon')) {
                   deselectAllDesktopIcons();
              }
          }
      });
      
      desktop.addEventListener('click', (e) => {
          if (e.target === desktop) {
              if(!e.ctrlKey) deselectAllDesktopIcons();
              desktop.focus();
              // manageFocusableCollection will attempt to focus the first icon
              // If you want no icon focused by default on desktop click, clear explicitly:
              const visibleIcons = Array.from(desktop.querySelectorAll('.desktop-icon')).filter(item => item.offsetParent !== null);
              if(visibleIcons.length > 0) {
                // visibleIcons[0].classList.remove('keyboard-focused'); // Optional: prevent auto-focus of first
              }
          }
      });


      // --- Window Management (largely same, focusWindow updated) ---
      function createWindow(appId) { /* ... (same as before) ... */
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
          const windowInstanceId = `window-${appId}-${windowIdCounter++}`;
          const windowEl = windowTemplate.content.firstElementChild.cloneNode(true);
          windowEl.dataset.appId = appId;
          windowEl.dataset.instanceId = windowInstanceId;
          windowEl.querySelector('.window-titlebar-icon').src = appDef.icon;
          windowEl.querySelector('.window-titlebar-icon').alt = appDef.title;
          windowEl.querySelector('.window-title').textContent = appDef.netscape ? (APP_DEFINITIONS?.netscapeNavigator?.title || 'Netscape Navigator') : appDef.title;

          let webviewId = null;
          if (appId === 'internetBrowser' || appId === 'internetExplorer' || appId === 'netscapeNavigator' || (appDef.generateContent && appDef.title === "Internet Browser")) {
              webviewId = `webview-${windowInstanceId}`;
          }

          if (appDef.generateContent && typeof appDef.generateContent === 'function') {
              windowEl.querySelector('.window-content').innerHTML = appDef.generateContent(windowInstanceId, webviewId);
          } else {
              windowEl.querySelector('.window-content').innerHTML = typeof appDef.content === 'function' ? appDef.content() : appDef.content;
          }

          let defaultWidth = appDef.defaultWidth || 450;
          let defaultHeight = appDef.defaultHeight || 300;

          if (appDef.isDialog) {
              defaultWidth = appDef.defaultWidth || 380;
              defaultHeight = appDef.defaultHeight || 220;
              windowEl.style.minWidth = appDef.minWidth || '300px';
              windowEl.style.minHeight = appDef.minHeight || '180px';
              windowEl.style.left = `${Math.max(0, (desktop.offsetWidth - defaultWidth) / 2)}px`;
              windowEl.style.top = `${Math.max(0, (desktop.offsetHeight - defaultHeight) / 3)}px`;
          } else {
              windowEl.style.left = `${Math.floor(Math.random() * Math.max(0, (desktop.offsetWidth - defaultWidth - 40))) + 20}px`;
              windowEl.style.top = `${Math.floor(Math.random() * Math.max(0, (desktop.offsetHeight - defaultHeight - 40))) + 20}px`;
          }
          windowEl.style.width = `${defaultWidth}px`;
          windowEl.style.height = `${defaultHeight}px`;

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
              originalRect: { left: windowEl.style.left, top: windowEl.style.top, width: windowEl.style.width, height: windowEl.style.height },
              isMinimized: false,
              isMaximized: false,
              appInstance: null
          };
          openWindows[windowInstanceId] = newWindowData;
          if (appDef.initApp && typeof appDef.initApp === 'function') {
              newWindowData.appInstance = appDef.initApp(windowEl, windowInstanceId, webviewId, appDef);
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
          windowEl.addEventListener('mousedown', () => focusWindow(windowEl), true);
          
          // Make window itself focusable for keyboard control (e.g. Alt+F4 mock)
          windowEl.setAttribute('tabindex', '-1'); 
          focusWindow(windowEl);
          return windowEl;
      }

      function makeResizable(element) { /* ... (same as before) ... */
          const handles = element.querySelectorAll('.resize-handle');
          let isResizing = false;
          let currentHandle = null;
          let startX, startY, startWidth, startHeight, startLeft, startTop;
          const minWidth = parseInt(window.getComputedStyle(element).minWidth) || 150;
          const minHeight = parseInt(window.getComputedStyle(element).minHeight) || 100;
          handles.forEach(handle => {
              handle.addEventListener('mousedown', (e) => {
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
          });
          document.addEventListener('mouseup', () => {
              if (isResizing) {
                  isResizing = false;
                  currentHandle = null;
                  document.body.style.cursor = 'default';
                  const windowData = openWindows[element.dataset.instanceId];
                  if (windowData && !windowData.isMaximized) {
                      windowData.originalRect = { left: element.style.left, top: element.style.top, width: element.style.width, height: element.style.height };
                  }
              }
          });
      }

      function focusWindow(windowEl) { /* ... (same, but with updated focus logic) ... */
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
          if (startMenu.style.display === 'flex') startMenu.style.display = 'none'; // Close start menu

          // Attempt to focus a sensible element within the window
          const firstFocusable = windowEl.querySelector(
              '.browser-address-bar, textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          ) || windowEl.querySelector('.window-content'); // Fallback to content area
          
          if (firstFocusable) {
              firstFocusable.focus({preventScroll: true});
          } else {
              windowEl.focus({preventScroll: true});
          }
          setFocusToContainer(windowEl);
          // Add keydown listener for window-specific actions if needed (e.g. Esc to close dialog)
      }

      function closeWindow(windowEl) { /* ... (same as before) ... */
          const instanceId = windowEl.dataset.instanceId;
          if (openWindows[instanceId]) {
              if (openWindows[instanceId].taskbarButton) {
                  openWindows[instanceId].taskbarButton.remove();
              }
              delete openWindows[instanceId];
          }
          windowEl.remove();
          // TODO: Focus next available window or desktop
          const windowKeys = Object.keys(openWindows);
          if (windowKeys.length > 0) {
              focusWindow(openWindows[windowKeys[windowKeys.length -1]].element);
          } else {
              desktop.focus();
          }
      }
      function addWindowToTaskbar(windowEl, title, iconSrc, instanceId) { /* ... (same as before) ... */
          const taskbarButton = document.createElement('button');
          taskbarButton.className = 'taskbar-button';
          taskbarButton.dataset.windowInstanceId = instanceId;
          const img = document.createElement('img');
          img.src = iconSrc;
          img.alt = "";
          taskbarButton.appendChild(img);
          const titleText = document.createTextNode(title.length > 18 ? title.substring(0,15) + '...' : title);
          taskbarButton.appendChild(titleText);
          taskbarButton.addEventListener('click', () => {
              const winData = openWindows[instanceId];
              if (winData) {
                  if (winData.taskbarButton.classList.contains('active') && !winData.isMinimized) {
                      toggleMinimizeWindow(winData.element);
                  } else {
                     focusWindow(winData.element);
                  }
              }
          });
          taskbarWindows.appendChild(taskbarButton);
          openWindows[instanceId].taskbarButton = taskbarButton;
      }
      function makeDraggable(element) { /* ... (same as before) ... */
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
              focusWindow(element); // Focus on drag start
          });
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
                  // Update originalRect after dragging, if not maximized
                  const windowData = openWindows[element.dataset.instanceId];
                  if(windowData && !windowData.isMaximized){
                      windowData.originalRect.left = element.style.left;
                      windowData.originalRect.top = element.style.top;
                  }
              }
          });
      }
      function toggleMinimizeWindow(windowEl) { /* ... (same as before) ... */
          const instanceId = windowEl.dataset.instanceId;
          const windowData = openWindows[instanceId];
          if (!windowData) return;
          windowData.isMinimized = !windowData.isMinimized;
          if (windowData.isMinimized) {
              if (!windowData.isMaximized) {
                   windowData.originalRectBeforeMinimize = { left: windowEl.style.left, top: windowEl.style.top, width: windowEl.style.width, height: windowEl.style.height };
              }
              windowEl.style.display = 'none';
              if (windowData.taskbarButton) {
                  windowData.taskbarButton.classList.add('minimized');
                  windowData.taskbarButton.classList.remove('active');
              }
              const windowKeys = Object.keys(openWindows).filter(id => !openWindows[id].isMinimized && document.body.contains(openWindows[id].element));
              if (windowKeys.length > 0) {
                  focusWindow(openWindows[windowKeys[windowKeys.length -1]].element);
              } else {
                  desktop.focus();
              }
          } else {
              windowEl.style.display = 'flex';
              if (windowData.originalRectBeforeMinimize && !windowData.isMaximized) {
                  windowEl.style.left = windowData.originalRectBeforeMinimize.left;
                  windowEl.style.top = windowData.originalRectBeforeMinimize.top;
                  windowEl.style.width = windowData.originalRectBeforeMinimize.width;
                  windowEl.style.height = windowData.originalRectBeforeMinimize.height;
              }
              focusWindow(windowEl);
          }
      }
      function toggleMaximizeWindow(windowEl) { /* ... (same as before) ... */
          const instanceId = windowEl.dataset.instanceId;
          const windowData = openWindows[instanceId];
          if (!windowData || windowData.isMinimized) return;
          const maximizeBtn = windowEl.querySelector('.window-maximize-btn');
          const titleBar = windowEl.querySelector('.window-titlebar');
          if (windowData.isMaximized) {
              if (windowData.originalRect) {
                  windowEl.style.left = windowData.originalRect.left;
                  windowEl.style.top = windowData.originalRect.top;
                  windowEl.style.width = windowData.originalRect.width;
                  windowEl.style.height = windowData.originalRect.height;
              } else {
                  const initialWidth = windowEl.style.width || `${windowEl.offsetWidth}px`;
                  const initialHeight = windowEl.style.height || `${windowEl.offsetHeight}px`;
                  const initialLeft = windowEl.style.left || `${(desktop.clientWidth - parseInt(initialWidth)) / 2}px`;
                  const initialTop = windowEl.style.top || `${(desktop.clientHeight - parseInt(initialHeight)) / 3}px`;
                  windowEl.style.left = initialLeft;
                  windowEl.style.top = initialTop;
                  windowEl.style.width = initialWidth;
                  windowEl.style.height = initialHeight;
              }
              windowData.isMaximized = false;
              windowEl.classList.remove('maximized');
              maximizeBtn.textContent = '1';
              maximizeBtn.title = 'Maximize';
              titleBar.style.cursor = 'grab';
          } else {
              if (!windowData.originalRect || (windowData.originalRect.left === windowEl.style.left && windowData.originalRect.top === windowEl.style.top && windowData.originalRect.width === (windowEl.style.width || `${windowEl.offsetWidth}px`) && windowData.originalRect.height === (windowEl.style.height || `${windowEl.offsetHeight}px`))) {
                  windowData.originalRect = { left: windowEl.style.left, top: windowEl.style.top, width: windowEl.style.width || `${windowEl.offsetWidth}px`, height: windowEl.style.height || `${windowEl.offsetHeight}px` };
              }
              windowEl.style.left = '0px';
              windowEl.style.top = '0px';
              windowEl.style.width = `${desktop.clientWidth}px`;
              windowEl.style.height = `${desktop.clientHeight}px`;
              windowData.isMaximized = true;
              windowEl.classList.add('maximized');
              maximizeBtn.textContent = '2';
              maximizeBtn.title = 'Restore';
              titleBar.style.cursor = 'default';
          }
          focusWindow(windowEl);
      }

      // --- Icon/Menu Item Click Handlers (adapted for new focus/selection) ---
      document.querySelectorAll('.desktop-icon').forEach(item => {
          // Dblclick to open is primary
          item.addEventListener('dblclick', (e) => {
              const appId = item.dataset.appId;
              if (appId) {
                  // deselectAllDesktopIcons(); // Keep selection or clear? Usually clear.
                  item.classList.remove('selected'); // Just clear this one if it was part of selection
                  item.classList.remove('keyboard-focused');
                  createWindow(appId);
              }
          });
          // Mousedown handles selection and drag prep (defined earlier)
          // 'click' listener for selection is removed as mousedown covers it better
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
              // Close start menu after click
              startMenu.style.display = 'none';
              startButton.style.borderStyle = 'outset';
              startButton.focus(); // Return focus
          });
      });

      // Initialize focus management
      manageFocusableCollection(desktop, '.desktop-icon', true, false);
      manageFocusableCollection(startMenu, '.start-menu-items-container .start-menu-item', false, true); // Target items within the container
      
      // Initial focus to desktop
      desktop.focus();

  });
