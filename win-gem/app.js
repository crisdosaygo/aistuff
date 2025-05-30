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
      const activeFocusContainers = []; 

      function setFocusToContainer(containerElement) {
          const oldContainer = activeFocusContainers.length > 0 ? activeFocusContainers[activeFocusContainers.length - 1] : null;
          if (oldContainer && oldContainer !== containerElement) {
              oldContainer.querySelectorAll('.keyboard-focused').forEach(el => el.classList.remove('keyboard-focused'));
          }
          
          if (activeFocusContainers.length > 0 && activeFocusContainers[activeFocusContainers.length - 1] === containerElement) {
          } else {
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
          const getItems = () => Array.from(container.querySelectorAll(itemSelector));
          
          let currentFocusedIndex = -1;

          const getVisibleItems = () => getItems().filter(item => item.offsetParent !== null && !item.classList.contains('disabled'));

          function setFocusOnItem(index, focusOptions = { preventScroll: false }) {
              const visibleItems = getVisibleItems();
              if (!visibleItems.length) {
                currentFocusedIndex = -1;
                return;
              }

              const previouslyFocusedItem = visibleItems[currentFocusedIndex];
              if (previouslyFocusedItem) {
                  previouslyFocusedItem.classList.remove('keyboard-focused');
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
          }, true);


          container.addEventListener('keydown', (e) => {
              if (container === desktop || container === startMenu) {
                  const activeWindow = Object.values(openWindows).find(ow => !ow.isMinimized && (ow.element === document.activeElement || ow.element.contains(document.activeElement)));
                  if (activeWindow && activeWindow.element !== container) {
                      return; 
                  }
                  if (container === desktop && startMenu.style.display === 'flex' && (startMenu === document.activeElement || startMenu.contains(document.activeElement))) {
                      return; 
                  }
              }
              
              const visibleItems = getVisibleItems();
              if (!visibleItems.length) return;

              const currentDOMFocusedItem = document.activeElement;
              const domFocusIndex = visibleItems.indexOf(currentDOMFocusedItem);

              if (domFocusIndex !== -1 && domFocusIndex !== currentFocusedIndex) {
                  if(visibleItems[currentFocusedIndex]) visibleItems[currentFocusedIndex].classList.remove('keyboard-focused');
                  currentFocusedIndex = domFocusIndex;
                  if(visibleItems[currentFocusedIndex]) visibleItems[currentFocusedIndex].classList.add('keyboard-focused');
              } else if (domFocusIndex === -1 && currentFocusedIndex === -1 && visibleItems.length > 0) {
                  setFocusOnItem(0);
                  if (!visibleItems[0]) return;
              } else if (currentFocusedIndex === -1 && visibleItems.length > 0) {
                  setFocusOnItem(0);
                  if (!visibleItems[0]) return;
              } else if (currentFocusedIndex >= visibleItems.length && visibleItems.length > 0) { 
                  setFocusOnItem(0); 
                  if (!visibleItems[0]) return;
              } else if (currentFocusedIndex === -1 && visibleItems.length === 0) {
                  return;
              }

              const activeEl = document.activeElement;
              if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && container.contains(activeEl)) {
                  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab', 'Escape', ' '].includes(e.key)) {
                      return; 
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
                      else newIndex = currentFocusedIndex; 
                      if (is2D) handled = true;
                      break;
                  case 'ArrowLeft':
                      if (is2D) newIndex = findNextIcon(visibleItems, currentFocusedIndex, 'left');
                      else newIndex = currentFocusedIndex; 
                      if (is2D) handled = true;
                      break;
                  case 'Enter':
                      if (currentFocusedIndex >=0 && visibleItems[currentFocusedIndex]) {
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
                      if (activateWithSpace && currentFocusedIndex >=0 && visibleItems[currentFocusedIndex]) {
                          visibleItems[currentFocusedIndex].click();
                          handled = true;
                      }
                      break;
                  case 'Tab':
                      if (currentFocusedIndex >=0 && visibleItems[currentFocusedIndex]) {
                          visibleItems[currentFocusedIndex].classList.remove('keyboard-focused');
                      }
                      currentFocusedIndex = -1;
                      return; 
              }

              if (handled) {
                  e.preventDefault();
                  if (container === desktop || container === startMenu) {
                    e.stopPropagation();
                  }
                  
                  const numVisible = visibleItems.length;
                  if (numVisible > 0) {
                      newIndex = (newIndex + numVisible) % numVisible; 
                      if (newIndex !== currentFocusedIndex || !visibleItems[currentFocusedIndex]?.classList.contains('keyboard-focused')) {
                          setFocusOnItem(newIndex);
                      }
                  }
              }
          });

          if (getItems().length > 0 && !container.hasAttribute('tabindex')) {
              container.setAttribute('tabindex', '0');
          }
      }
      
      function findNextIcon(icons, currentIndex, direction) {
          if (icons.length <= 1) return currentIndex;
          // This is a simple linear navigation for absolute positioned icons.
          // A true spatial one would calculate distances.
          let newIndex = currentIndex;
          // For absolute positioning, "columns" are less defined.
          // This will just cycle. You might want to sort icons by top then left for more predictable up/down.
          if (direction === 'down' || direction === 'right') {
              newIndex = (currentIndex + 1);
          } else if (direction === 'up' || direction === 'left') {
              newIndex = (currentIndex - 1);
          }
          return newIndex; 
      }

      const focusStyles = `
          .desktop-icon.keyboard-focused {
              outline: 1px dotted #fff !important;
              /* For absolute positioned icons, outline-offset might be better */
              outline-offset: 1px; 
          }
          .desktop-icon.keyboard-focused span {
              background-color: #000080;
          }
          .start-menu-item.keyboard-focused {
              background-color: #000080 !important;
              color: white !important;
          }
          .desktop-icon:focus, .start-menu-item:focus, #desktop:focus, #startMenu:focus, .window:focus {
              outline: none;
          }
      `;
      const styleSheet = document.createElement("style");
      styleSheet.type = "text/css";
      styleSheet.innerText = focusStyles;
      document.head.appendChild(styleSheet);
      // --- END FOCUS MANAGEMENT ---


      // --- Desktop Icon Selection, Marquee, and Dragging ---
      let isMarqueeSelecting = false;
      let marqueeRectEl = null;
      let marqueeStartX, marqueeStartY, marqueeStartScrollX, marqueeStartScrollY;

      // --- Icon Dragging Variables ---
      let isDraggingIcons = false;
      let dragPrimaryIcon = null; 
      let dragOffsets = []; 
      let initialMouseXForDrag, initialMouseYForDrag;

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
              } else if (!event.ctrlKey) { 
                  icon.classList.remove('selected');
              }
          });
      }

      desktop.addEventListener('mousedown', (e) => {
          const clickedOnIcon = e.target.closest('.desktop-icon');
          const clickedOnWindow = e.target.closest('.window');

          if (clickedOnWindow) return; 

          if (e.button === 0) { 
              marqueeStartX = e.clientX; 
              marqueeStartY = e.clientY;
              marqueeStartScrollX = desktop.scrollLeft; // Not really used if desktop itself doesn't scroll
              marqueeStartScrollY = desktop.scrollTop;

              if (clickedOnIcon) {
                  e.stopPropagation(); 
                  
                  if (!e.ctrlKey && !e.shiftKey && !clickedOnIcon.classList.contains('selected')) {
                      deselectAllDesktopIcons(clickedOnIcon); 
                      clickedOnIcon.classList.add('selected');
                  } else if (e.ctrlKey) {
                      clickedOnIcon.classList.toggle('selected');
                  } else if (e.shiftKey) {
                      const visibleIcons = Array.from(desktop.querySelectorAll('.desktop-icon:not(.disabled)'));
                      const currentKBFocused = visibleIcons.find(icon => icon.classList.contains('keyboard-focused'));
                      const anchorIcon = currentKBFocused || visibleIcons.find(icon => icon.classList.contains('selected')); 
                      
                      if (anchorIcon) {
                          const anchorIndex = visibleIcons.indexOf(anchorIcon);
                          const clickIndex = visibleIcons.indexOf(clickedOnIcon);
                          if (anchorIndex !== -1 && clickIndex !== -1) {
                              if (!e.ctrlKey) deselectAllDesktopIcons(); 
                              const start = Math.min(anchorIndex, clickIndex);
                              const end = Math.max(anchorIndex, clickIndex);
                              for (let i = start; i <= end; i++) {
                                  if(visibleIcons[i]) visibleIcons[i].classList.add('selected');
                              }
                          }
                      } else { 
                          if (!e.ctrlKey) deselectAllDesktopIcons(clickedOnIcon);
                          clickedOnIcon.classList.add('selected');
                      }
                  } else if (!clickedOnIcon.classList.contains('selected')) { 
                       deselectAllDesktopIcons(clickedOnIcon);
                       clickedOnIcon.classList.add('selected');
                  }
                  
                  // --- Icon Dragging Initialization ---
                  if (clickedOnIcon.classList.contains('selected')) {
                      isDraggingIcons = true;
                      dragPrimaryIcon = clickedOnIcon; 
                      initialMouseXForDrag = e.clientX; 
                      initialMouseYForDrag = e.clientY;

                      dragOffsets = [];
                      const primaryIconInitialLeft = dragPrimaryIcon.offsetLeft;
                      const primaryIconInitialTop = dragPrimaryIcon.offsetTop;

                      document.querySelectorAll('.desktop-icon.selected').forEach(selIcon => {
                          selIcon.style.zIndex = String(highestZIndex + 1); 
                          dragOffsets.push({
                              element: selIcon,
                              dxRelativeToPrimary: selIcon.offsetLeft - primaryIconInitialLeft,
                              dyRelativeToPrimary: selIcon.offsetTop - primaryIconInitialTop,
                              startLeft: selIcon.offsetLeft,
                              startTop: selIcon.offsetTop
                          });
                      });
                      desktop.style.cursor = 'grabbing'; 
                  }
                  // --- End Icon Dragging Initialization ---
                  
                  document.querySelectorAll('.desktop-icon.keyboard-focused').forEach(kf => kf.classList.remove('keyboard-focused'));
                  clickedOnIcon.classList.add('keyboard-focused');
                  clickedOnIcon.focus({ preventScroll: true });

              } else { 
                  if (!e.ctrlKey) deselectAllDesktopIcons(); 
                  isMarqueeSelecting = true;
                  marqueeRectEl = document.createElement('div');
                  marqueeRectEl.className = 'marquee-rect';
                  const desktopRect = desktop.getBoundingClientRect();
                  // Position marquee relative to desktop's viewport origin
                  marqueeRectEl.style.left = `${marqueeStartX - desktopRect.left}px`;
                  marqueeRectEl.style.top = `${marqueeStartY - desktopRect.top}px`;
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
              const desktopRect = desktop.getBoundingClientRect();
              
              let rLeft = Math.min(marqueeStartX, currentX);
              let rTop = Math.min(marqueeStartY, currentY);
              const rWidth = Math.abs(currentX - marqueeStartX);
              const rHeight = Math.abs(currentY - marqueeStartY);

              // Position marquee relative to desktop's viewport origin
              marqueeRectEl.style.left = `${rLeft - desktopRect.left}px`;
              marqueeRectEl.style.top = `${rTop - desktopRect.top}px`;
              marqueeRectEl.style.width = `${rWidth}px`;
              marqueeRectEl.style.height = `${rHeight}px`;
              updateIconSelectionFromMarquee();
          }
          // --- Icon Dragging Mousemove Logic ---
          else if (isDraggingIcons && dragPrimaryIcon) {
              e.preventDefault(); 
              
              const mouseDeltaX = e.clientX - initialMouseXForDrag;
              const mouseDeltaY = e.clientY - initialMouseYForDrag;

              const primaryIconOffsetData = dragOffsets.find(offset => offset.element === dragPrimaryIcon);
              if (!primaryIconOffsetData) { 
                  console.error("Primary dragged icon not found in dragOffsets during move.");
                  isDraggingIcons = false; // Stop dragging if state is inconsistent
                  return;
              }

              let newPrimaryLeft = primaryIconOffsetData.startLeft + mouseDeltaX;
              let newPrimaryTop = primaryIconOffsetData.startTop + mouseDeltaY;

              newPrimaryLeft = Math.max(0, Math.min(newPrimaryLeft, desktop.clientWidth - dragPrimaryIcon.offsetWidth));
              newPrimaryTop = Math.max(0, Math.min(newPrimaryTop, desktop.clientHeight - dragPrimaryIcon.offsetHeight));
              
              const actualDeltaX = newPrimaryLeft - primaryIconOffsetData.startLeft;
              const actualDeltaY = newPrimaryTop - primaryIconOffsetData.startTop;

              dragOffsets.forEach(info => {
                  let newLeft = info.startLeft + actualDeltaX;
                  let newTop = info.startTop + actualDeltaY;

                  newLeft = Math.max(0, Math.min(newLeft, desktop.clientWidth - info.element.offsetWidth));
                  newTop = Math.max(0, Math.min(newTop, desktop.clientHeight - info.element.offsetHeight));

                  info.element.style.left = `${newLeft}px`;
                  info.element.style.top = `${newTop}px`;
              });
          }
          // --- End Icon Dragging Mousemove Logic ---
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
          // --- Icon Dragging Mouseup Logic ---
          if (isDraggingIcons) {
              isDraggingIcons = false;
              dragOffsets.forEach(info => {
                  info.element.style.zIndex = ''; 
              });
              dragPrimaryIcon = null;
              dragOffsets = [];
              desktop.style.cursor = 'default';
          }
          // --- End Icon Dragging Mouseup Logic ---
      });

      function deselectAllDesktopIcons(exceptionIcon = null) {
          document.querySelectorAll('.desktop-icon.selected').forEach(icon => {
              if (icon !== exceptionIcon) icon.classList.remove('selected');
          });
          document.querySelectorAll('.desktop-icon.keyboard-focused').forEach(icon => {
             if (icon !== exceptionIcon) icon.classList.remove('keyboard-focused');
          });
      }

      const marqueeStyle = `
          .marquee-rect {
              position: absolute;
              border: 1px dotted #000; 
              background-color: rgba(0, 0, 0, 0.1); 
              pointer-events: none;
              z-index: ${highestZIndex + 10};
          }
          .desktop-icon { 
              user-select: none;
          }
      `;
      const marqueeStyleSheet = document.createElement("style");
      marqueeStyleSheet.type = "text/css";
      marqueeStyleSheet.innerText = marqueeStyle;
      document.head.appendChild(marqueeStyleSheet);

      function updateClock() {
          const now = new Date();
          const hours = now.getHours();
          const minutes = now.getMinutes().toString().padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = (hours % 12) || 12;
          clockElement.textContent = `${displayHours}:${minutes} ${ampm}`;
      }
      setInterval(updateClock, 1000); updateClock();

      startButton.addEventListener('click', (event) => {
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

      document.addEventListener('click', (event) => {
          if (startMenu.style.display === 'flex' && !startMenu.contains(event.target) && event.target !== startButton && !startButton.contains(event.target)) {
              startMenu.style.display = 'none';
              startButton.style.borderStyle = 'outset';
              startButton.focus(); 
          }
          if (event.target === desktop || event.target.closest('.taskbar')) {
              if (!event.target.closest('.desktop-icon') && !event.target.closest('.window')) { 
                   deselectAllDesktopIcons();
              }
          }
      });
      
      desktop.addEventListener('click', (e) => {
          if (e.target === desktop) {
              if(!e.ctrlKey) deselectAllDesktopIcons();
              desktop.focus();
          }
      });

      // --- Function to set initial icon positions ---
      function initializeIconPositions() {
          const icons = Array.from(desktop.querySelectorAll('.desktop-icon'));
          const iconHeight = 80; // Approximate height of an icon + text for spacing
          const iconWidth = 95;  // Approximate width
          const paddingTop = 10;
          const paddingLeft = 10;
          let currentX = paddingLeft;
          let currentY = paddingTop;

          icons.forEach(icon => {
              if (currentY + iconHeight > desktop.clientHeight) { // Move to next column
                  currentY = paddingTop;
                  currentX += iconWidth;
              }
              icon.style.left = `${currentX}px`;
              icon.style.top = `${currentY}px`;
              currentY += iconHeight;
          });
      }
      initializeIconPositions(); // Call this after icons are in the DOM

      window.addEventListener('resize', initializeIconPositions); // Optional: re-layout on resize


      function createWindow(appId) {
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
          
          const newWindowData = {
              element: windowEl, taskbarButton: null, appId: appId,
              originalRect: { left: windowEl.style.left, top: windowEl.style.top, width: windowEl.style.width, height: windowEl.style.height },
              isMinimized: false, isMaximized: false, appInstance: null
          };
          openWindows[windowInstanceId] = newWindowData;

          if (appDef.initApp) {
              newWindowData.appInstance = appDef.initApp(windowEl, windowInstanceId, webviewId, appDef);
          }

          if (!appDef.isDialog) {
              makeDraggable(windowEl); makeResizable(windowEl);
              addWindowToTaskbar(windowEl, appDef.title, appDef.icon, windowInstanceId);
              windowEl.querySelector('.window-minimize-btn').addEventListener('click', () => toggleMinimizeWindow(windowEl));
              windowEl.querySelector('.window-maximize-btn').addEventListener('click', () => toggleMaximizeWindow(windowEl));
          } else {
              windowEl.querySelector('.window-minimize-btn').style.display = 'none';
              windowEl.querySelector('.window-maximize-btn').style.display = 'none';
              makeDraggable(windowEl);
          }
          windowEl.querySelector('.window-close-btn').addEventListener('click', () => closeWindow(windowEl));
          
          windowEl.addEventListener('mousedown', (e) => {
              focusWindow(windowEl, e.target); 
          }, true); 
          
          windowEl.setAttribute('tabindex', '-1'); 
          focusWindow(windowEl); 
          return windowEl;
      }

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
              if (newLeft < 0) { newWidth += newLeft; newLeft = 0; } if (newTop < 0) { newHeight += newTop; newTop = 0; }
              if (newLeft + newWidth > desktopRect.width) newWidth = desktopRect.width - newLeft;
              if (newTop + newHeight > desktopRect.height) newHeight = desktopRect.height - newTop;
              element.style.width = `${newWidth}px`; element.style.height = `${newHeight}px`;
              element.style.left = `${newLeft}px`; element.style.top = `${newTop}px`;
          });
          document.addEventListener('mouseup', () => {
              if (isResizing) {
                  isResizing = false; currentHandle = null; document.body.style.cursor = 'default';
                  const windowData = openWindows[element.dataset.instanceId];
                  if (windowData && !windowData.isMaximized) {
                      windowData.originalRect = { left: element.style.left, top: element.style.top, width: element.style.width, height: element.style.height };
                  }
              }
          });
      }

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
          
          if (elementToActuallyFocus && document.activeElement !== elementToActuallyFocus && !elementToActuallyFocus.contains(document.activeElement)) {
              elementToActuallyFocus.focus({ preventScroll: true });
          } else if (!document.activeElement || !windowEl.contains(document.activeElement)) {
              windowEl.focus({ preventScroll: true });
          }
          setFocusToContainer(windowEl);
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
          const windowKeys = Object.keys(openWindows);
          if (windowKeys.length > 0) {
              const lastWindowKey = windowKeys[windowKeys.length - 1];
              if(openWindows[lastWindowKey] && openWindows[lastWindowKey].element){
                   focusWindow(openWindows[lastWindowKey].element);
              } else {
                  desktop.focus();
              }
          } else {
              desktop.focus();
          }
      }
      function addWindowToTaskbar(windowEl, title, iconSrc, instanceId) {
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
              focusWindow(element); 
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
                  const windowData = openWindows[element.dataset.instanceId];
                  if(windowData && !windowData.isMaximized){
                      windowData.originalRect.left = element.style.left;
                      windowData.originalRect.top = element.style.top;
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
              if (!windowData.isMaximized) {
                   windowData.originalRectBeforeMinimize = { left: windowEl.style.left, top: windowEl.style.top, width: windowEl.style.width, height: windowEl.style.height };
              }
              windowEl.style.display = 'none';
              if (windowData.taskbarButton) {
                  windowData.taskbarButton.classList.add('minimized');
                  windowData.taskbarButton.classList.remove('active');
              }
              const windowKeys = Object.keys(openWindows).filter(id => openWindows[id].element && document.body.contains(openWindows[id].element) && !openWindows[id].isMinimized);
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
      function toggleMaximizeWindow(windowEl) {
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
              } else { /* fallback sizing */ }
              windowData.isMaximized = false;
              windowEl.classList.remove('maximized');
              maximizeBtn.textContent = '1'; maximizeBtn.title = 'Maximize';
              titleBar.style.cursor = 'grab';
          } else {
              // Ensure originalRect captures current computed size if style is not set
              const currentWidth = windowEl.style.width || `${windowEl.offsetWidth}px`;
              const currentHeight = windowEl.style.height || `${windowEl.offsetHeight}px`;
              if (!windowData.originalRect || 
                  (windowData.originalRect.left === windowEl.style.left && 
                   windowData.originalRect.top === windowEl.style.top &&
                   windowData.originalRect.width === currentWidth &&
                   windowData.originalRect.height === currentHeight)) {
                  windowData.originalRect = { 
                      left: windowEl.style.left, 
                      top: windowEl.style.top, 
                      width: currentWidth, 
                      height: currentHeight 
                  };
              }
              windowEl.style.left = '0px'; windowEl.style.top = '0px';
              windowEl.style.width = `${desktop.clientWidth}px`; windowEl.style.height = `${desktop.clientHeight}px`;
              windowData.isMaximized = true;
              windowEl.classList.add('maximized');
              maximizeBtn.textContent = '2'; maximizeBtn.title = 'Restore';
              titleBar.style.cursor = 'default';
          }
          focusWindow(windowEl);
      }

      document.querySelectorAll('.desktop-icon').forEach(item => {
          item.addEventListener('dblclick', (e) => {
              const appId = item.dataset.appId;
              if (appId) {
                  item.classList.remove('selected');
                  item.classList.remove('keyboard-focused');
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
              } else if (appId) {
                  createWindow(appId);
              }
              startMenu.style.display = 'none';
              startButton.style.borderStyle = 'outset';
              startButton.focus();
          });
      });

      manageFocusableCollection(desktop, '.desktop-icon', true, false);
      manageFocusableCollection(startMenu, '.start-menu-items-container .start-menu-item', false, true);

      desktop.focus();
  });
