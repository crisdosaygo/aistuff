// desktop-icons.js
(function(window) {
  'use strict';

  const DESKTOP_ICON_POSITIONS_KEY = 'desktopIconPositions_win9x_style_v2';
  let desktopElement;
  let allDesktopIcons = []; // This will be populated after checking recycled items

  let selectedIcons = new Set();
  let primaryDraggedIcon = null;
  let isDraggingGroup = false;
  let dragOffsetX, dragOffsetY;
  let draggedItemsInitialStates = new Map();
  let isMarqueeSelecting = false;
  let marqueeElement = null;
  let marqueeStartX, marqueeStartY;
  let desktopRectCache;
  let hasDragged = false;

  let longPressTimer = null;
  const LONG_PRESS_DURATION = 700;
  let longPressPointerDownX, longPressPointerDownY;
  let longPressTargetIcon = null;
  let longPressPointerId = null;

  function getRecycleBinApi() {
      if (window.APP_DEFINITIONS &&
          window.APP_DEFINITIONS.recycleBin &&
          window.APP_DEFINITIONS.recycleBin.api) {
          return window.APP_DEFINITIONS.recycleBin.api;
      }
      // console.warn("Recycle Bin API not found."); // Less noisy
      return null;
  }

  function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
          const context = this;
          const later = () => { timeout = null; func.apply(context, args); };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
      };
  }

  function getStoredPositions() {
      try {
          const stored = localStorage.getItem(DESKTOP_ICON_POSITIONS_KEY);
          return stored ? JSON.parse(stored) : {};
      } catch (e) { console.error("LS Error (get):", e); return {}; }
  }

  function saveIconPosition(appId, x, y) {
      if (!appId) return;
      const positions = getStoredPositions();
      positions[appId] = { x, y };
      try {
          localStorage.setItem(DESKTOP_ICON_POSITIONS_KEY, JSON.stringify(positions));
      } catch (e) { console.error("LS Error (save):", e); }
  }

  function applyAllIconPositionsAndSnap(isInitialLoad = false) {
      if (!desktopElement) return;
      const initialDomIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));
      const recycleBinApi = getRecycleBinApi();
      const recycledAppIds = recycleBinApi ? recycleBinApi.getRecycledItemIds() : [];
      console.log('[DesktopIcons] Recycled App IDs on load:', recycledAppIds); // DEBUG

      allDesktopIcons = []; // Reset and rebuild

      initialDomIcons.forEach(icon => {
          const appId = icon.dataset.appId;
          if (appId && recycledAppIds.includes(appId)) {
              icon.style.display = 'none'; // Hide it instead of removing, easier to restore
                                           // Or remove it: icon.remove();
          } else {
              allDesktopIcons.push(icon); // Only add non-recycled icons to the active list
          }
      });


      const positions = isInitialLoad ? getStoredPositions() : {};
      const iconsRequiringSnap = [];

      allDesktopIcons.forEach(icon => { // Iterate only over non-recycled icons
          const appId = icon.dataset.appId;
          if (icon.style.display === 'none') return; // Skip hidden (recycled) icons

          if (isInitialLoad && appId && positions[appId]) {
              const pos = positions[appId];
              icon.style.position = 'absolute';
              icon.style.left = `${pos.x}px`;
              icon.style.top = `${pos.y}px`;
              icon.style.margin = '0';
              icon.classList.add('is-positioned');
          } else {
              // If not initial load (e.g., "Arrange Icons") or icon not in storage,
              // it needs to be snapped.
              iconsRequiringSnap.push(icon);
          }
      });

      if (iconsRequiringSnap.length > 0) {
          if (window.SnapToGrid && typeof window.SnapToGrid.snap === 'function') {
              window.SnapToGrid.snap({
                  iconsToSnap: iconsRequiringSnap,
                  allDesktopIcons: allDesktopIcons.filter(icon => icon.style.display !== 'none'), // Pass only visible for collision
                  desktopElement: desktopElement,
                  savePositionFn: saveIconPosition
              });
          } else {
              console.warn("SnapToGrid module not found. Icons requiring snap may not be positioned correctly.");
              let yOffset = 10;
              iconsRequiringSnap.forEach(icon => {
                  if (icon.style.display === 'none') return;
                  icon.style.position = 'absolute';
                  icon.style.left = '10px';
                  icon.style.top = `${yOffset}px`;
                  icon.style.margin = '0';
                  icon.classList.add('is-positioned');
                  saveIconPosition(icon.dataset.appId, 10, yOffset);
                  yOffset += (parseInt(window.getComputedStyle(icon).height) || 80) + 5;
              });
          }
      }
  }


  function clearSelection() {
      selectedIcons.forEach(icon => {
          icon.classList.remove('selected');
          if (window.IconSelectionEffect && typeof window.IconSelectionEffect.removeSelectionEffect === 'function') {
              const img = icon.querySelector('img');
              if (img) window.IconSelectionEffect.removeSelectionEffect(img);
          }
      });
      selectedIcons.clear();
  }

  function selectIcon(iconElement, isAdditive = false) {
      if (!isAdditive) clearSelection();
      if (iconElement && iconElement.style.display !== 'none' && !selectedIcons.has(iconElement)) {
          selectedIcons.add(iconElement);
          iconElement.classList.add('selected');
          if (window.IconSelectionEffect && typeof window.IconSelectionEffect.applySelectionEffect === 'function') {
              const img = iconElement.querySelector('img');
              if (img) window.IconSelectionEffect.applySelectionEffect(img);
          }
      }
  }

  function toggleSelectIcon(iconElement) {
      if (iconElement.style.display === 'none') return;
      if (selectedIcons.has(iconElement)) {
          selectedIcons.delete(iconElement);
          iconElement.classList.remove('selected');
          if (window.IconSelectionEffect && typeof window.IconSelectionEffect.removeSelectionEffect === 'function') {
              const img = iconElement.querySelector('img');
              if (img) window.IconSelectionEffect.removeSelectionEffect(img);
          }
      } else {
          selectedIcons.add(iconElement);
          iconElement.classList.add('selected');
          if (window.IconSelectionEffect && typeof window.IconSelectionEffect.applySelectionEffect === 'function') {
              const img = iconElement.querySelector('img');
              if (img) window.IconSelectionEffect.applySelectionEffect(img);
          }
      }
  }

  function startMarquee(event) {
      // ... (no changes needed here for these requirements)
      if (event.button !== 0 || (window.DesktopContextMenu && DesktopContextMenu.isVisible && DesktopContextMenu.isVisible())) return;
      isMarqueeSelecting = true;
      hasDragged = false; 
      desktopRectCache = desktopElement.getBoundingClientRect();
      const desktopStyle = window.getComputedStyle(desktopElement);
      const paddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
      const paddingTop = parseFloat(desktopStyle.paddingTop) || 0;
      marqueeStartX = event.clientX - desktopRectCache.left - paddingLeft;
      marqueeStartY = event.clientY - desktopRectCache.top - paddingTop;
      marqueeElement = document.createElement('div');
      marqueeElement.className = 'marquee-select-box';
      Object.assign(marqueeElement.style, { left: `${marqueeStartX}px`, top: `${marqueeStartY}px`, width: '0px', height: '0px' });
      desktopElement.appendChild(marqueeElement);
      if (!event.ctrlKey && !event.shiftKey) clearSelection();
      document.body.classList.add('no-select');
      desktopElement.setPointerCapture(event.pointerId);
  }

  function updateMarquee(event) {
      // ... (no changes needed here for these requirements)
      if (!isMarqueeSelecting || !marqueeElement) return;
      const desktopStyle = window.getComputedStyle(desktopElement);
      const paddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
      const paddingTop = parseFloat(desktopStyle.paddingTop) || 0;
      let currentX = event.clientX - desktopRectCache.left - paddingLeft;
      let currentY = event.clientY - desktopRectCache.top - paddingTop;
      const newLeft = Math.min(marqueeStartX, currentX), newTop = Math.min(marqueeStartY, currentY);
      const newWidth = Math.abs(currentX - marqueeStartX), newHeight = Math.abs(currentY - marqueeStartY);
      Object.assign(marqueeElement.style, { left: `${newLeft}px`, top: `${newTop}px`, width: `${newWidth}px`, height: `${newHeight}px` });

      if (newWidth > 5 || newHeight > 5) hasDragged = true;

      const marqueeRect = marqueeElement.getBoundingClientRect();
      allDesktopIcons.forEach(icon => {
          if (icon.style.display === 'none') return; // Skip hidden icons
          const iconRect = icon.getBoundingClientRect();
          if (isIntersecting(marqueeRect, iconRect)) {
              if (!selectedIcons.has(icon)) selectIcon(icon, true);
          } else {
              if (selectedIcons.has(icon)) {
                  selectedIcons.delete(icon);
                  icon.classList.remove('selected');
                  if (window.IconSelectionEffect) {
                      const img = icon.querySelector('img');
                      if (img) window.IconSelectionEffect.removeSelectionEffect(img);
                  }
              }
          }
      });
  }

  function endMarquee(event) {
      // ... (no changes needed here for these requirements)
      if (!isMarqueeSelecting) return;
      desktopElement.releasePointerCapture(event.pointerId);
      if (marqueeElement) { marqueeElement.remove(); marqueeElement = null; }
      document.body.classList.remove('no-select');
      isMarqueeSelecting = false;
      if (!hasDragged && selectedIcons.size === 0 && event.target === desktopElement) {
          clearSelection();
      }
  }

  function isIntersecting(rectA, rectB) {
      return !(rectA.right < rectB.left || rectA.left > rectB.right || rectA.bottom < rectB.top || rectA.top > rectB.bottom);
  }

  function startIconDrag(event, iconElement) {
      // ... (no changes needed here for these requirements)
      if (event.button !== 0) return;
      hasDragged = false; 
      primaryDraggedIcon = iconElement;
      desktopRectCache = desktopElement.getBoundingClientRect();

      if (!event.ctrlKey && !selectedIcons.has(iconElement)) {
          clearSelection();
          selectIcon(iconElement);
      } else if (event.ctrlKey) {
          if (!selectedIcons.has(iconElement)) selectIcon(iconElement, true);
      }

      isDraggingGroup = selectedIcons.size > 0;
      const clickedIconRect = primaryDraggedIcon.getBoundingClientRect();
      const desktopStyle = window.getComputedStyle(desktopElement);
      const desktopPaddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
      const desktopPaddingTop = parseFloat(desktopStyle.paddingTop) || 0;
      dragOffsetX = event.clientX - clickedIconRect.left;
      dragOffsetY = event.clientY - clickedIconRect.top;

      draggedItemsInitialStates.clear();
      selectedIcons.forEach(icon => {
          draggedItemsInitialStates.set(icon, { x: icon.offsetLeft, y: icon.offsetTop, zIndex: icon.style.zIndex || '' });
          icon.style.zIndex = '10000'; 
          icon.classList.add('is-positioned'); 
          icon.style.position = 'absolute'; 
          icon.style.margin = '0';
      });
      document.body.classList.add('no-select');
      primaryDraggedIcon.setPointerCapture(event.pointerId);
  }

  function processDrag(event) {
      // ... (no changes needed here for these requirements, drop target logic is fine)
      if (!primaryDraggedIcon) return;
      if (!hasDragged && (Math.abs(event.movementX) > 3 || Math.abs(event.movementY) > 3)) {
          hasDragged = true;
          clearLongPressAttempt(); 
      }
      if (!hasDragged) return; 

      const desktopStyle = window.getComputedStyle(desktopElement);
      const desktopPaddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
      const desktopPaddingTop = parseFloat(desktopStyle.paddingTop) || 0;
      
      const iconAreaMetrics = (window.SnapToGrid && SnapToGrid.getDesktopIconAreaMetrics) ? SnapToGrid.getDesktopIconAreaMetrics(desktopElement) : { iconAreaOffsetX: 0, iconAreaOffsetY: 0, contentWidthForGrid: desktopElement.clientWidth, contentHeightForGrid: desktopElement.clientHeight };
      const minX = iconAreaMetrics.iconAreaOffsetX;
      const minY = iconAreaMetrics.iconAreaOffsetY;
      const draggableWidth = minX + iconAreaMetrics.contentWidthForGrid;
      const draggableHeight = minY + iconAreaMetrics.contentHeightForGrid;

      let newPrimaryX = event.clientX - desktopRectCache.left - desktopPaddingLeft - dragOffsetX;
      let newPrimaryY = event.clientY - desktopRectCache.top - desktopPaddingTop - dragOffsetY;
      newPrimaryX = Math.max(minX, Math.min(newPrimaryX, draggableWidth - primaryDraggedIcon.offsetWidth));
      newPrimaryY = Math.max(minY, Math.min(newPrimaryY, draggableHeight - primaryDraggedIcon.offsetHeight));

      const primaryInitialState = draggedItemsInitialStates.get(primaryDraggedIcon);
      if (!primaryInitialState) return; 
      const deltaX = newPrimaryX - primaryInitialState.x;
      const deltaY = newPrimaryY - primaryInitialState.y;

      selectedIcons.forEach(icon => {
          const initialState = draggedItemsInitialStates.get(icon);
          if (!initialState) return;
          let newX = initialState.x + deltaX;
          let newY = initialState.y + deltaY;
          newX = Math.max(minX, Math.min(newX, draggableWidth - icon.offsetWidth));
          newY = Math.max(minY, Math.min(newY, draggableHeight - icon.offsetHeight));
          icon.style.left = `${newX}px`;
          icon.style.top = `${newY}px`;
      });

      const recycleBinApi = getRecycleBinApi();
      if (recycleBinApi) {
          const recycleBinIconEl = recycleBinApi.getDesktopIconElement();
          if (recycleBinIconEl && primaryDraggedIcon !== recycleBinIconEl) {
              const currentX = event.clientX;
              const currentY = event.clientY;
              const binRect = recycleBinIconEl.getBoundingClientRect();

              if (currentX >= binRect.left && currentX <= binRect.right &&
                  currentY >= binRect.top && currentY <= binRect.bottom) {
                  recycleBinIconEl.classList.add('drop-target');
              } else {
                  recycleBinIconEl.classList.remove('drop-target');
              }
          } else if (recycleBinIconEl) { 
              recycleBinIconEl.classList.remove('drop-target');
          }
      }
  }

  function endIconDrag(event) {
      if (!primaryDraggedIcon) return;
      primaryDraggedIcon.releasePointerCapture(event.pointerId);
      document.body.classList.remove('no-select');

      let droppedOnRecycleBin = false;
      const recycleBinApi = getRecycleBinApi();
      const recycleBinIconEl = recycleBinApi ? recycleBinApi.getDesktopIconElement() : null;

      if (hasDragged) {
          if (recycleBinIconEl && primaryDraggedIcon !== recycleBinIconEl && recycleBinApi.addItem) {
              if (event.clientX >= recycleBinIconEl.offsetLeft && event.clientX <= recycleBinIconEl.offsetLeft + recycleBinIconEl.offsetWidth &&
                  event.clientY >= recycleBinIconEl.offsetTop && event.clientY <= recycleBinIconEl.offsetTop + recycleBinIconEl.offsetHeight) {
                  
                  droppedOnRecycleBin = true;
                  const itemsToRecycle = Array.from(selectedIcons);

                  itemsToRecycle.forEach(iconToRecycle => {
                      if (iconToRecycle === recycleBinIconEl) return;

                      const appId = iconToRecycle.dataset.appId;
                      const iconNameElement = iconToRecycle.querySelector('span');
                      const iconName = iconNameElement ? iconNameElement.textContent : (appId || 'Unknown Item');
                      
                      // Get the original icon source from APP_DEFINITIONS
                      let originalIconSrc = '';
                      if (window.APP_DEFINITIONS && window.APP_DEFINITIONS[appId]) {
                          originalIconSrc = window.APP_DEFINITIONS[appId].icon;
                      } else {
                          // Fallback if not in APP_DEFINITIONS (e.g. a file icon not an app)
                          const iconImgElement = iconToRecycle.querySelector('img');
                          originalIconSrc = iconImgElement ? iconImgElement.src : '';
                      }
                      
                      recycleBinApi.addItem({ 
                          id: appId, // This is the unique ID for the desktop item
                          name: iconName, 
                          iconSrc: originalIconSrc, // Store the original icon path
                          originalAppId: appId // Store the appId if it's an app, for potential restore
                      });
                      
                      iconToRecycle.style.display = 'none'; // Hide instead of removing
                      // The icon is still in allDesktopIcons, but applyAllIconPositionsAndSnap will filter it out
                      selectedIcons.delete(iconToRecycle);
                  });
                  if (selectedIcons.size === 0) {
                       clearSelection();
                  }
              }
          }

          if (!droppedOnRecycleBin) {
              // If not dropped on recycle bin, just save the current positions.
              // Snapping is now an explicit action.
              selectedIcons.forEach(icon => {
                  if (icon.style.display !== 'none') { // Only save if not just "deleted"
                      saveIconPosition(icon.dataset.appId, icon.offsetLeft, icon.offsetTop);
                  }
              });
          }
          
          draggedItemsInitialStates.forEach((state, icon) => {
              if (icon.style.display !== 'none') { // Only if icon still exists visually
                   icon.style.zIndex = state.zIndex;
              }
          });

      } else { // Click (not a drag)
          draggedItemsInitialStates.forEach((state, icon) => {
              if (icon.style.display !== 'none') icon.style.zIndex = state.zIndex;
          });
          if (event.ctrlKey) {
              toggleSelectIcon(primaryDraggedIcon);
          }
      }
      
      if (recycleBinIconEl) {
          recycleBinIconEl.classList.remove('drop-target');
      }

      primaryDraggedIcon = null;
      isDraggingGroup = false;
      draggedItemsInitialStates.clear();
  }

  function clearLongPressAttempt() {
      // ... (no changes needed here for these requirements)
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      longPressTargetIcon = null;
      longPressPointerId = null;
  }

  function onIconPointerDown(event) {
      // ... (no changes needed here for these requirements, selection logic is fine)
      const iconElement = event.currentTarget;
      if (iconElement.style.display === 'none') return; // Don't interact with hidden icons

      hasDragged = false; 

      if (event.button === 2 || (window.DesktopContextMenu && DesktopContextMenu.isVisible && DesktopContextMenu.isVisible())) {
          clearLongPressAttempt();
          if (event.button === 2 && window.DesktopContextMenu && typeof DesktopContextMenu.show === 'function') {
              DesktopContextMenu.show(event, iconElement);
          }
          return; 
      }

      if (event.button === 0) { 
          longPressTargetIcon = iconElement;
          longPressPointerDownX = event.clientX;
          longPressPointerDownY = event.clientY;
          longPressPointerId = event.pointerId;

          clearTimeout(longPressTimer); 
          longPressTimer = setTimeout(() => {
              if (longPressTargetIcon && window.DesktopContextMenu && typeof DesktopContextMenu.show === 'function' && !hasDragged) {
                  const lpEvent = { ...event, clientX: longPressPointerDownX, clientY: longPressPointerDownY, target: longPressTargetIcon, button: 0, type: 'contextmenu' }; 
                  DesktopContextMenu.show(lpEvent, longPressTargetIcon);
                  hasDragged = true;
                  if (primaryDraggedIcon === longPressTargetIcon) { 
                      try { primaryDraggedIcon.releasePointerCapture(longPressPointerId); } catch (e) { /* ignore */ }
                      primaryDraggedIcon = null; 
                      document.body.classList.remove('no-select'); 
                      const initialState = draggedItemsInitialStates.get(longPressTargetIcon);
                      if (initialState) longPressTargetIcon.style.zIndex = initialState.zIndex;
                  }
              }
              longPressTimer = null; longPressTargetIcon = null; longPressPointerId = null;
          }, LONG_PRESS_DURATION);
          
          startIconDrag(event, iconElement); 
      }
      event.stopPropagation(); 
  }

  function onDesktopPointerDown(event) {
      // ... (no changes needed here for these requirements)
      if (event.target === desktopElement) {
          clearLongPressAttempt(); 
          if (event.button === 0 && !(window.DesktopContextMenu && DesktopContextMenu.isVisible())) {
               startMarquee(event);
          }
      }
  }

  function onDocumentPointerMove(event) {
      // ... (no changes needed here for these requirements)
      if (longPressTargetIcon && !hasDragged) { 
          const moveThreshold = 10; 
          if (Math.abs(event.clientX - longPressPointerDownX) > moveThreshold ||
              Math.abs(event.clientY - longPressPointerDownY) > moveThreshold) {
              clearLongPressAttempt(); 
          }
      }

      if (isMarqueeSelecting) {
          updateMarquee(event);
      } else if (primaryDraggedIcon) {
          processDrag(event); 
      }
  }

  function onDocumentPointerUp(event) {
      // ... (no changes needed here for these requirements)
      const wasLongPressActive = !!longPressTimer; 
      clearLongPressAttempt(); 

      if (isMarqueeSelecting) {
          endMarquee(event);
      } else if (primaryDraggedIcon) {
          endIconDrag(event);
      } else if (event.target === desktopElement && !wasLongPressActive && event.button === 0) {
          clearSelection();
      }
  }

  const debouncedCheckAndSnapIcons = debounce(() => {
      // ... (no changes needed here for these requirements)
      if (!desktopElement || !window.SnapToGrid || typeof SnapToGrid.getDesktopIconAreaMetrics !== 'function') return;
      const currentAllIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon:not([style*="display: none"])'));
      const iconAreaMetrics = SnapToGrid.getDesktopIconAreaMetrics(desktopElement);
      let anIconIsOffscreen = false;
      for (const icon of currentAllIcons) {
          if (icon.classList.contains('is-positioned')) {
              const iconLeft = icon.offsetLeft, iconTop = icon.offsetTop;
              const iconRight = iconLeft + icon.offsetWidth, iconBottom = iconTop + icon.offsetHeight;
              const minX = iconAreaMetrics.iconAreaOffsetX, minY = iconAreaMetrics.iconAreaOffsetY;
              const maxX = minX + iconAreaMetrics.contentWidthForGrid, maxY = minY + iconAreaMetrics.contentHeightForGrid;
              if (iconLeft < minX || iconTop < minY || iconRight > maxX || iconBottom > maxY) {
                  anIconIsOffscreen = true; break;
              }
          }
      }
      if (anIconIsOffscreen) {
          const currentlySelected = new Set(selectedIcons); clearSelection();
          if (window.Win9xDesktopUtils && typeof Win9xDesktopUtils.snapSelectedIconsToGrid === 'function') {
              Win9xDesktopUtils.snapSelectedIconsToGrid(); 
          }
          currentlySelected.forEach(icon => {
              if (icon.style.display !== 'none') selectIcon(icon, true);
          });
      }
  }, 300);

  function initDesktopInteractions() {
      desktopElement = document.getElementById('desktop');
      if (!desktopElement) { console.error('DesktopInteractions: Desktop element not found.'); return; }

      // applyAllIconPositionsAndSnap will now handle filtering recycled items
      // and populating `allDesktopIcons` with only visible ones.
      applyAllIconPositionsAndSnap(true); 

      // `allDesktopIcons` is now populated by applyAllIconPositionsAndSnap with visible icons
      allDesktopIcons.forEach(icon => {
          if (icon.style.display !== 'none') { // Add listeners only to visible icons
              icon.addEventListener('pointerdown', onIconPointerDown);
              const img = icon.querySelector('img');
              if (img) img.addEventListener('dragstart', (e) => e.preventDefault());
          }
      });

      desktopElement.addEventListener('pointerdown', onDesktopPointerDown);
      document.addEventListener('pointermove', onDocumentPointerMove);
      document.addEventListener('pointerup', onDocumentPointerUp);
      document.addEventListener('pointercancel', (event) => { 
          clearLongPressAttempt();
          if (isMarqueeSelecting) endMarquee(event);
          else if (primaryDraggedIcon) endIconDrag(event); 
      });

      if (window.SnapToGrid && typeof SnapToGrid.configure === 'function') {
          SnapToGrid.configure({ gridSizeX: 85, gridSizeY: 87, desktopPadding: 10 });
      }

      debouncedCheckAndSnapIcons(); 
      if (typeof ResizeObserver !== 'undefined') {
          const resizeObserver = new ResizeObserver(debouncedCheckAndSnapIcons);
          resizeObserver.observe(desktopElement);
      } else {
          window.addEventListener('resize', debouncedCheckAndSnapIcons);
      }
  }

  if (!window.Win9xDesktopUtils) window.Win9xDesktopUtils = {};
  window.Win9xDesktopUtils.snapSelectedIconsToGrid = () => {
      if (!window.SnapToGrid || typeof SnapToGrid.snap !== 'function' || !desktopElement) return;
      // Get currently visible icons
      const currentVisibleIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon:not([style*="display: none"])'));
      
      let iconsToProcess = selectedIcons.size > 0 ? 
          Array.from(selectedIcons).filter(icon => icon.style.display !== 'none') : 
          currentVisibleIcons.filter(icon => icon.classList.contains('is-positioned'));

      if (iconsToProcess.length === 0 && currentVisibleIcons.length > 0) {
          iconsToProcess = [...currentVisibleIcons];
      }

      if (iconsToProcess.length > 0) {
          SnapToGrid.snap({
              iconsToSnap: iconsToProcess, 
              allDesktopIcons: currentVisibleIcons, // Pass only visible for collision
              desktopElement: desktopElement, 
              savePositionFn: saveIconPosition
          });
      }
  };
  window.Win9xDesktopUtils.forceRelayoutAllIcons = () => {
      // This should re-apply positions and snap those not in storage, respecting hidden icons
      applyAllIconPositionsAndSnap(false); 
  };
  window.Win9xDesktopUtils.clearSelection = clearSelection;
  window.Win9xDesktopUtils.getAllVisibleDesktopIcons = () => {
      return Array.from(desktopElement.querySelectorAll('.desktop-icon:not([style*="display: none"])'));
  };
  window.Win9xDesktopUtils.getDesktopIconByAppId = (appId) => {
      return desktopElement.querySelector(`.desktop-icon[data-app-id="${appId}"]`);
  };


  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDesktopInteractions);
  else initDesktopInteractions();
})(window);
