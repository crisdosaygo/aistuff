// desktop-icons.js
(function(window) {
  'use strict';

  const DESKTOP_ICON_POSITIONS_KEY = 'desktopIconPositions_win9x_style_v2';
  let desktopElement;
  let allDesktopIcons = []; // This will be populated by applyAllIconPositionsAndSnap

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

  function attachListenersToAllDesktopIcons() {
    allDesktopIcons.forEach(icon => {
        // Clean up potential old pointerdown listeners first
        icon.removeEventListener('pointerdown', onIconPointerDown);
        
        // For dragstart, we need a reference to the function to remove it.
        const img = icon.querySelector('img');
        if (img && img.fnPreventDragStart) {
            img.removeEventListener('dragstart', img.fnPreventDragStart);
        }

        if (icon.style.display !== 'none') { // Add listeners only to currently visible icons
            icon.addEventListener('pointerdown', onIconPointerDown);
            if (img) {
                const preventDragStart = (e) => e.preventDefault();
                img.addEventListener('dragstart', preventDragStart);
                img.fnPreventDragStart = preventDragStart; // Store reference for removal
            }
        }
    });
  }

  function applyAllIconPositionsAndSnap(isInitialLoad = false) {
      if (!desktopElement) return;
      const initialDomIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));
      const recycleBinApi = getRecycleBinApi();
      const recycledAppIds = recycleBinApi ? recycleBinApi.getRecycledItemIds() : [];
      // console.log('[DesktopIcons] Recycled App IDs on refresh:', recycledAppIds);

      allDesktopIcons = []; // Reset and rebuild

      initialDomIcons.forEach(icon => {
          const appId = icon.dataset.appId;
          if (appId && recycledAppIds.includes(appId) && appId !== 'recycleBin') { // Recycle Bin itself is never "recycled"
              icon.style.display = 'none';
          } else {
              icon.style.display = ''; // Ensure it's visible if previously hidden
              allDesktopIcons.push(icon); // Add to the active list
          }
      });

      const storedPositions = getStoredPositions();
      const iconsRequiringSnap = [];

      allDesktopIcons.forEach(icon => {
          const appId = icon.dataset.appId;
          if (icon.style.display === 'none') return; 

          // If isInitialLoad is true, try to use stored position.
          // If isInitialLoad is false (Arrange All), it falls through to snapping.
          if (isInitialLoad && appId && storedPositions[appId]) {
              const pos = storedPositions[appId];
              icon.style.position = 'absolute';
              icon.style.left = `${pos.x}px`;
              icon.style.top = `${pos.y}px`;
              icon.style.margin = '0';
              icon.classList.add('is-positioned');
          } else {
              // Needs to be snapped if:
              // 1. It's an "Arrange All" call (isInitialLoad is false).
              // 2. Or it's an initial load but the icon has no stored position.
              iconsRequiringSnap.push(icon);
          }
      });

      if (iconsRequiringSnap.length > 0) {
          if (window.SnapToGrid && typeof window.SnapToGrid.snap === 'function') {
              window.SnapToGrid.snap({
                  iconsToSnap: iconsRequiringSnap,
                  allDesktopIcons: allDesktopIcons.filter(icon => icon.style.display !== 'none'),
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
          if (icon.style.display === 'none') return;
          const iconRect = icon.getBoundingClientRect();
          if (isIntersecting(marqueeRect, iconRect)) {
              if (!selectedIcons.has(icon)) selectIcon(icon, true);
          } else {
              if (selectedIcons.has(icon) && !(event.ctrlKey || event.shiftKey)) { // only deselect if not additive marquee
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
      if (!isMarqueeSelecting) return;
      if (event.pointerId && desktopElement.hasPointerCapture(event.pointerId)) {
        desktopElement.releasePointerCapture(event.pointerId);
      }
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
      if (event.button !== 0) return;
      hasDragged = false; 
      primaryDraggedIcon = iconElement;
      desktopRectCache = desktopElement.getBoundingClientRect();

      if (!event.ctrlKey && !event.shiftKey && !selectedIcons.has(iconElement)) {
          clearSelection();
          selectIcon(iconElement);
      } else if (event.ctrlKey && !event.shiftKey) { // Ctrl + click
          toggleSelectIcon(iconElement); // Toggle selection for this icon
      } else if (!event.ctrlKey && event.shiftKey) { // Shift + click (not standard Win95, but can be for range select later)
          // For now, treat shift like a normal click if it's the first in a selection
          if (selectedIcons.size === 0) selectIcon(iconElement);
          // else if (selectedIcons.has(iconElement)) { /* do nothing, it's already selected */ }
          // else selectIcon(iconElement, true); // Add to selection
          // Standard behavior might be to select iconElement and clear others if not ctrlKey
          if (!selectedIcons.has(iconElement)) {
            clearSelection();
            selectIcon(iconElement);
          }

      } else if (!selectedIcons.has(iconElement)) { // Click on unselected icon when others are selected (no ctrl/shift)
          clearSelection();
          selectIcon(iconElement);
      }
      // If iconElement is already selected and part of a group, dragging moves the group.

      isDraggingGroup = selectedIcons.size > 0 && selectedIcons.has(primaryDraggedIcon); // Drag selected group if clicked icon is in it
      
      const clickedIconRect = primaryDraggedIcon.getBoundingClientRect();
      const desktopStyle = window.getComputedStyle(desktopElement);
      const desktopPaddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
      const desktopPaddingTop = parseFloat(desktopStyle.paddingTop) || 0;
      dragOffsetX = event.clientX - clickedIconRect.left;
      dragOffsetY = event.clientY - clickedIconRect.top;

      draggedItemsInitialStates.clear();
      const iconsToDrag = isDraggingGroup ? selectedIcons : new Set([primaryDraggedIcon]);

      iconsToDrag.forEach(icon => {
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

      const iconsToMove = isDraggingGroup ? selectedIcons : new Set([primaryDraggedIcon]);
      iconsToMove.forEach(icon => {
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
          if (recycleBinIconEl && primaryDraggedIcon !== recycleBinIconEl && iconsToMove.has(primaryDraggedIcon) && !iconsToMove.has(recycleBinIconEl)) { // Ensure we are not dragging the bin itself
              const currentX = event.clientX;
              const currentY = event.clientY;
              const binRect = recycleBinIconEl.getBoundingClientRect();
              const isOverBin = currentX >= binRect.left && currentX <= binRect.right &&
                                currentY >= binRect.top && currentY <= binRect.bottom;

              if (isOverBin) {
                  if (!recycleBinIconEl.classList.contains('selected')) {
                      recycleBinIconEl.classList.add('selected');
                      if (window.IconSelectionEffect && typeof window.IconSelectionEffect.applySelectionEffect === 'function') {
                          const img = recycleBinIconEl.querySelector('img');
                          if (img) window.IconSelectionEffect.applySelectionEffect(img);
                      }
                  }
                  recycleBinIconEl.classList.add('drop-target');
              } else {
                  if (recycleBinIconEl.classList.contains('selected')) {
                      recycleBinIconEl.classList.remove('selected');
                      if (window.IconSelectionEffect && typeof window.IconSelectionEffect.removeSelectionEffect === 'function') {
                          const img = recycleBinIconEl.querySelector('img');
                          if (img) window.IconSelectionEffect.removeSelectionEffect(img);
                      }
                  }
                  recycleBinIconEl.classList.remove('drop-target');
              }
          } else if (recycleBinIconEl) { // Dragging the recycle bin itself or no valid drag for hover effect
              if (recycleBinIconEl.classList.contains('selected')) {
                   recycleBinIconEl.classList.remove('selected');
                   if (window.IconSelectionEffect && typeof window.IconSelectionEffect.removeSelectionEffect === 'function') {
                       const img = recycleBinIconEl.querySelector('img');
                       if (img) window.IconSelectionEffect.removeSelectionEffect(img);
                   }
              }
              recycleBinIconEl.classList.remove('drop-target');
          }
      }
  }

  function endIconDrag(event) {
      if (!primaryDraggedIcon) return;
      if (primaryDraggedIcon.hasPointerCapture(event.pointerId)) {
        primaryDraggedIcon.releasePointerCapture(event.pointerId);
      }
      document.body.classList.remove('no-select');

      let droppedOnRecycleBin = false;
      const recycleBinApi = getRecycleBinApi();
      const recycleBinIconEl = recycleBinApi ? recycleBinApi.getDesktopIconElement() : null;

      if (hasDragged) {
          const iconsThatWereDragged = isDraggingGroup ? selectedIcons : new Set([primaryDraggedIcon]);
          if (recycleBinIconEl && primaryDraggedIcon !== recycleBinIconEl && !iconsThatWereDragged.has(recycleBinIconEl) && recycleBinApi.addItem) {
              const primaryRect = primaryDraggedIcon.getBoundingClientRect(); // Use primary dragged icon for drop check
              const binRect = recycleBinIconEl.getBoundingClientRect();
              
              // Check using current pointer position instead of primaryDraggedIcon's rect
              const isOverBin = event.clientX >= binRect.left && event.clientX <= binRect.right &&
                                event.clientY >= binRect.top && event.clientY <= binRect.bottom;

              if (isOverBin) {
                  droppedOnRecycleBin = true;
                  const itemsToRecycle = Array.from(iconsThatWereDragged); // Use the set of icons actually dragged

                  itemsToRecycle.forEach(iconToRecycle => {
                      if (iconToRecycle === recycleBinIconEl) return;

                      const appId = iconToRecycle.dataset.appId;
                      const iconNameElement = iconToRecycle.querySelector('span');
                      const iconName = iconNameElement ? iconNameElement.textContent : (appId || 'Unknown Item');
                      
                      let originalIconSrc = '';
                      if (window.APP_DEFINITIONS && window.APP_DEFINITIONS[appId]) {
                          originalIconSrc = window.APP_DEFINITIONS[appId].icon;
                      } else {
                          const iconImgElement = iconToRecycle.querySelector('img');
                          originalIconSrc = iconImgElement ? iconImgElement.src : '';
                      }
                      
                      recycleBinApi.addItem({ 
                          id: appId, 
                          name: iconName, 
                          iconSrc: originalIconSrc, 
                          originalAppId: appId 
                      });
                      
                      iconToRecycle.style.display = 'none'; 
                      selectedIcons.delete(iconToRecycle); // Remove from selection if it was selected
                  });
                  
                  // After recycling, refresh the desktop icon states
                  if (window.Win9xDesktopUtils && Win9xDesktopUtils.refreshIconStateAndListeners) {
                      Win9xDesktopUtils.refreshIconStateAndListeners(); // Refresh all desktop icons state
                  }
                  if (selectedIcons.size === 0 && !event.ctrlKey && !event.shiftKey) { // If all selected items were recycled
                       clearSelection(); // Clears the class from remaining items
                  }
              }
          }

          if (!droppedOnRecycleBin) {
              iconsThatWereDragged.forEach(icon => {
                  if (icon.style.display !== 'none') { 
                      saveIconPosition(icon.dataset.appId, icon.offsetLeft, icon.offsetTop);
                  }
              });
          }
          
          draggedItemsInitialStates.forEach((state, icon) => {
              if (icon.style.display !== 'none') { 
                   icon.style.zIndex = state.zIndex;
              }
          });

      } else { // Click (not a drag)
          draggedItemsInitialStates.forEach((state, icon) => {
              if (icon.style.display !== 'none') icon.style.zIndex = state.zIndex;
          });
          // Click logic is handled by startIconDrag for selection based on ctrl/shift
      }
      
      if (recycleBinIconEl) {
          if (recycleBinIconEl.classList.contains('selected')) {
              recycleBinIconEl.classList.remove('selected');
              if (window.IconSelectionEffect && typeof window.IconSelectionEffect.removeSelectionEffect === 'function') {
                  const img = recycleBinIconEl.querySelector('img');
                  if (img) window.IconSelectionEffect.removeSelectionEffect(img);
              }
          }
          recycleBinIconEl.classList.remove('drop-target');
      }

      primaryDraggedIcon = null;
      isDraggingGroup = false;
      draggedItemsInitialStates.clear();
      // If it was a click and not a drag, selection state is already set by startIconDrag
      // No need to clear selection here unless specific conditions met.
  }

  function clearLongPressAttempt() {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      longPressTargetIcon = null;
      longPressPointerId = null;
  }

  function onIconPointerDown(event) {
      const iconElement = event.currentTarget;
      if (iconElement.style.display === 'none') return;

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
                  if (primaryDraggedIcon === longPressTargetIcon && primaryDraggedIcon.hasPointerCapture(longPressPointerId)) { 
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
      if (event.target === desktopElement) {
          clearLongPressAttempt(); 
          if (event.button === 0 && !(window.DesktopContextMenu && DesktopContextMenu.isVisible && DesktopContextMenu.isVisible())) {
               startMarquee(event);
          }
      }
  }

  function onDocumentPointerMove(event) {
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
      const wasLongPressFiring = !!longPressTimer; 
      clearLongPressAttempt(); 

      if (isMarqueeSelecting) {
          endMarquee(event);
      } else if (primaryDraggedIcon) {
          endIconDrag(event);
      } else if (event.target === desktopElement && !wasLongPressFiring && event.button === 0 && !hasDragged) { // ensure no drag occurred
          // Only clear selection on desktop click if it wasn't a context menu trigger (long press)
          // and not part of a drag operation that just ended.
          clearSelection();
      }
      hasDragged = false; // Reset for next interaction
  }

  const debouncedCheckAndSnapIcons = debounce(() => {
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

      applyAllIconPositionsAndSnap(true); 
      attachListenersToAllDesktopIcons();  

      desktopElement.addEventListener('pointerdown', onDesktopPointerDown);
      document.addEventListener('pointermove', onDocumentPointerMove);
      document.addEventListener('pointerup', onDocumentPointerUp);
      document.addEventListener('pointercancel', (event) => { 
          clearLongPressAttempt();
          if (isMarqueeSelecting) endMarquee(event);
          else if (primaryDraggedIcon) endIconDrag(event); 
          hasDragged = false;
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
              allDesktopIcons: currentVisibleIcons, 
              desktopElement: desktopElement, 
              savePositionFn: saveIconPosition
          });
      }
  };
  
  // This is for "Arrange Icons" command
  window.Win9xDesktopUtils.forceRelayoutAllIcons = () => {
      applyAllIconPositionsAndSnap(false); // 'false' means not initial load, so arrange/snap all
      attachListenersToAllDesktopIcons();
  };

  // This is for refreshing state after an action like restore/delete
  window.Win9xDesktopUtils.refreshIconStateAndListeners = () => {
      applyAllIconPositionsAndSnap(true); // 'true' means like initial load, respect stored positions
      attachListenersToAllDesktopIcons();
  };

  window.Win9xDesktopUtils.clearSelection = clearSelection;
  window.Win9xDesktopUtils.selectIcon = selectIcon; // Expose selectIcon
  window.Win9xDesktopUtils.getAllVisibleDesktopIcons = () => {
      return Array.from(desktopElement.querySelectorAll('.desktop-icon:not([style*="display: none"])'));
  };
  window.Win9xDesktopUtils.getDesktopIconByAppId = (appId) => {
      if (!desktopElement) return null;
      return desktopElement.querySelector(`.desktop-icon[data-app-id="${appId}"]`);
  };


  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDesktopInteractions);
  else initDesktopInteractions();
})(window);
