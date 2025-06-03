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
        icon.removeEventListener('pointerdown', onIconPointerDown);
        const img = icon.querySelector('img');
        if (img && img.fnPreventDragStart) {
            img.removeEventListener('dragstart', img.fnPreventDragStart);
        }

        if (icon.style.display !== 'none') {
            icon.addEventListener('pointerdown', onIconPointerDown);
            if (img) {
                const preventDragStart = (e) => e.preventDefault();
                img.addEventListener('dragstart', preventDragStart);
                img.fnPreventDragStart = preventDragStart;
            }
        }
    });
  }

  function applyAllIconPositionsAndSnap(isInitialLoad = false) {
      if (!desktopElement) return;
      const initialDomIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));
      const recycleBinApi = getRecycleBinApi();
      const recycledAppIds = recycleBinApi ? recycleBinApi.getRecycledItemIds() : [];

      allDesktopIcons = [];

      initialDomIcons.forEach(icon => {
          const appId = icon.dataset.appId;
          if (appId && recycledAppIds.includes(appId) && appId !== 'recycleBin') {
              icon.style.display = 'none';
          } else {
              icon.style.display = '';
              allDesktopIcons.push(icon);
          }
      });

      const storedPositions = getStoredPositions();
      const iconsRequiringSnap = [];

      allDesktopIcons.forEach(icon => {
          const appId = icon.dataset.appId;
          if (icon.style.display === 'none') return;
          if (isInitialLoad && appId && storedPositions[appId]) {
              const pos = storedPositions[appId];
              icon.style.position = 'absolute';
              icon.style.left = `${pos.x}px`;
              icon.style.top = `${pos.y}px`;
              icon.style.margin = '0';
              icon.classList.add('is-positioned');
          } else {
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
              console.warn("SnapToGrid module not found.");
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

  function _applySelectionVisuals(iconElement) {
    if (!iconElement) return;
    iconElement.classList.add('selected');
    if (window.IconSelectionEffect && typeof window.IconSelectionEffect.applySelectionEffect === 'function') {
        const img = iconElement.querySelector('img');
        if (img) window.IconSelectionEffect.applySelectionEffect(img);
    }
  }

  function _removeSelectionVisuals(iconElement) {
    if (!iconElement) return;
    iconElement.classList.remove('selected');
    if (window.IconSelectionEffect && typeof window.IconSelectionEffect.removeSelectionEffect === 'function') {
        const img = iconElement.querySelector('img');
        if (img) window.IconSelectionEffect.removeSelectionEffect(img);
    }
  }

  function clearSelection() {
      selectedIcons.forEach(icon => {
          _removeSelectionVisuals(icon);
      });
      selectedIcons.clear();
  }

  function selectIcon(iconElement, isAdditive = false) {
      if (!isAdditive) clearSelection();
      if (iconElement && iconElement.style.display !== 'none' && !selectedIcons.has(iconElement)) {
          selectedIcons.add(iconElement);
          _applySelectionVisuals(iconElement);
      }
  }

  function toggleSelectIcon(iconElement) {
      if (!iconElement || iconElement.style.display === 'none') return;
      if (selectedIcons.has(iconElement)) {
          selectedIcons.delete(iconElement);
          _removeSelectionVisuals(iconElement);
      } else {
          selectedIcons.add(iconElement);
          _applySelectionVisuals(iconElement);
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
          const isCurrentlySelected = selectedIcons.has(icon);

          if (isIntersecting(marqueeRect, iconRect)) {
              if (!isCurrentlySelected) {
                  // Add to selection without clearing others (marquee is additive by nature for unselected items)
                  selectedIcons.add(icon);
                  _applySelectionVisuals(icon);
              }
          } else {
              // Only deselect if it was part of the marquee selection
              // and not a pre-existing selection held with Ctrl/Shift
              if (isCurrentlySelected && !(event.ctrlKey || event.shiftKey)) {
                  selectedIcons.delete(icon);
                  _removeSelectionVisuals(icon);
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
      // If it was just a click on the desktop (no drag for marquee, no items selected by it) and not ctrl/shift, clear selection.
      if (!hasDragged && selectedIcons.size === 0 && event.target === desktopElement && !event.ctrlKey && !event.shiftKey) {
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

      // Handle selection based on modifiers
      if (event.ctrlKey) { // Ctrl + click always toggles
          toggleSelectIcon(iconElement);
      } else if (event.shiftKey) { // Shift + click (simple version: if not selected, select exclusively)
          if (!selectedIcons.has(iconElement)) {
              clearSelection();
              selectIcon(iconElement); // isAdditive is false by default here
          }
          // If already selected with shift, it remains selected as part of potential group drag
      } else { // No Ctrl, No Shift
          if (!selectedIcons.has(iconElement)) { // Clicked on an unselected icon
              clearSelection();
              selectIcon(iconElement);
          }
          // If clicked on an already selected icon (and it's the only one or part of a group), prepare to drag.
      }

      // isDraggingGroup is true if the icon we start dragging is part of the current selection set
      isDraggingGroup = selectedIcons.has(primaryDraggedIcon);

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
          icon.style.zIndex = '100';
          icon.classList.add('is-positioned', 'dragging'); // Add 'dragging' class
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
          // If we started dragging, ensure items in drag group (if any) visually reflect selection
          // (This is more a failsafe; startIconDrag should handle initial selection)
          const iconsInDrag = isDraggingGroup ? selectedIcons : new Set([primaryDraggedIcon]);
          iconsInDrag.forEach(icon => {
              if (!icon.classList.contains('selected')) {
                  _applySelectionVisuals(icon);
              }
          });

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
          // Condition: recycleBinIconEl exists, we are dragging something, and it's not the recycle bin itself
          // AND the primary dragged icon is not the recycle bin (to avoid self-highlight on drag)
          const isDraggingRecycleBinItself = iconsToMove.has(recycleBinIconEl);

          if (recycleBinIconEl && !isDraggingRecycleBinItself && primaryDraggedIcon !== recycleBinIconEl) {
              const currentX = event.clientX;
              const currentY = event.clientY;
              const binRect = recycleBinIconEl.getBoundingClientRect();
              const isOverBin = currentX >= binRect.left && currentX <= binRect.right &&
                                currentY >= binRect.top && currentY <= binRect.bottom;

              if (isOverBin) {
                  if (!recycleBinIconEl.classList.contains('selected')) {
                      _applySelectionVisuals(recycleBinIconEl); // Apply full selection visuals
                  }
                  recycleBinIconEl.classList.add('drop-target'); // For additional drop-target specific styles
              } else {
                  if (recycleBinIconEl.classList.contains('selected')) {
                      // Only remove selection if it was applied *because* of this drag-over.
                      // If the bin was already selected by a click, it should stay selected.
                      // This is tricky. For now, we'll remove it, assuming drag-over is temporary.
                      // A more complex state would be needed to distinguish click-selected vs drag-over-selected.
                      _removeSelectionVisuals(recycleBinIconEl);
                  }
                  recycleBinIconEl.classList.remove('drop-target');
              }
          } else if (recycleBinIconEl && (isDraggingRecycleBinItself || primaryDraggedIcon === recycleBinIconEl)) {
              // If dragging the bin itself, ensure it doesn't have the drop-target highlight
              // but keep its regular selection if it was part of the selected group.
              recycleBinIconEl.classList.remove('drop-target');
              // If it was selected and is being dragged, its selection visuals are handled by the main drag group logic.
          }
      }
  }

  function endIconDrag(event) {
      if (!primaryDraggedIcon) return;
      if (primaryDraggedIcon.hasPointerCapture(event.pointerId)) {
        primaryDraggedIcon.releasePointerCapture(event.pointerId);
      }
      document.body.classList.remove('no-select');

      // Remove 'dragging' class from all dragged items
      const iconsThatWereDragged = isDraggingGroup ? selectedIcons : new Set([primaryDraggedIcon]);
      iconsThatWereDragged.forEach(icon => icon.classList.remove('dragging'));


      let droppedOnRecycleBin = false;
      const recycleBinApi = getRecycleBinApi();
      const recycleBinIconEl = recycleBinApi ? recycleBinApi.getDesktopIconElement() : null;

      if (hasDragged) {
          const isDraggingRecycleBinItself = iconsThatWereDragged.has(recycleBinIconEl);
          if (recycleBinIconEl && !isDraggingRecycleBinItself && primaryDraggedIcon !== recycleBinIconEl && recycleBinApi.addItem) {
              const binRect = recycleBinIconEl.getBoundingClientRect();
              const isOverBin = event.clientX >= binRect.left && event.clientX <= binRect.right &&
                                event.clientY >= binRect.top && event.clientY <= binRect.bottom;

              if (isOverBin) {
                  droppedOnRecycleBin = true;
                  const itemsToRecycle = Array.from(iconsThatWereDragged);

                  itemsToRecycle.forEach(iconToRecycle => {
                      if (iconToRecycle === recycleBinIconEl) return; // Should be redundant due to earlier check
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
                      recycleBinApi.addItem({ id: appId, name: iconName, iconSrc: originalIconSrc, originalAppId: appId });
                      iconToRecycle.style.display = 'none';
                      selectedIcons.delete(iconToRecycle);
                      _removeSelectionVisuals(iconToRecycle); // Ensure visuals removed from now-hidden icon
                  });

                  if (window.Win9xDesktopUtils && Win9xDesktopUtils.refreshIconStateAndListeners) {
                      Win9xDesktopUtils.refreshIconStateAndListeners();
                  }
                  // If after deleting items, selection becomes empty, and no modifiers were held for the original click
                  if (selectedIcons.size === 0 && !event.ctrlKey && !event.shiftKey) {
                       // No need to clearSelection() here, as deleted items are removed from selectedIcons.
                       // The bin's own selection state will be handled below.
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

      } else { // Click (not a drag) - selection handled in startIconDrag
          draggedItemsInitialStates.forEach((state, icon) => {
              if (icon.style.display !== 'none') icon.style.zIndex = state.zIndex;
          });
      }

      // Cleanup Recycle Bin specific highlighting from drag-over
      if (recycleBinIconEl) {
          if (recycleBinIconEl.classList.contains('drop-target')) {
              recycleBinIconEl.classList.remove('drop-target');
          }
          // If the bin was highlighted *only* for drag-over, and not part of a click-selection, remove its selection.
          // This is tricky. If `hasDragged` is true, and the bin is selected, and it's NOT the primaryDraggedIcon (meaning it wasn't clicked),
          // then it was likely selected due to drag-over.
          if (hasDragged && recycleBinIconEl.classList.contains('selected') && !selectedIcons.has(recycleBinIconEl)) {
            // The above condition 'selectedIcons.has(recycleBinIconEl)' implies it was selected by a click.
            // If not in selectedIcons, but has .selected class, it means it was highlighted by drag-over.
             _removeSelectionVisuals(recycleBinIconEl);
          }
          // If it IS in selectedIcons (clicked to select), its selection state persists as expected.
      }

      primaryDraggedIcon = null;
      isDraggingGroup = false;
      draggedItemsInitialStates.clear();
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
              if (!selectedIcons.has(iconElement)) { // If right-clicking on unselected item
                if(!event.ctrlKey && !event.shiftKey) clearSelection(); // Clear others unless ctrl/shift
                selectIcon(iconElement, event.ctrlKey || event.shiftKey); // Select it (additively if ctrl/shift)
              }
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
                  if (!selectedIcons.has(longPressTargetIcon)) { // Long press on unselected icon
                    if(!event.ctrlKey && !event.shiftKey) clearSelection();
                    selectIcon(longPressTargetIcon, event.ctrlKey || event.shiftKey);
                  }
                  DesktopContextMenu.show(lpEvent, longPressTargetIcon);
                  hasDragged = true; // Prevent drag from starting after context menu
                  if (primaryDraggedIcon === longPressTargetIcon && primaryDraggedIcon.hasPointerCapture(longPressPointerId)) {
                      try { primaryDraggedIcon.releasePointerCapture(longPressPointerId); } catch (e) { /* ignore */ }
                      primaryDraggedIcon = null;
                      document.body.classList.remove('no-select');
                      const initialState = draggedItemsInitialStates.get(longPressTargetIcon);
                      if (initialState) longPressTargetIcon.style.zIndex = initialState.zIndex;
                      longPressTargetIcon.classList.remove('dragging');
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
      } else if (event.target === desktopElement && !wasLongPressFiring && event.button === 0 && !hasDragged) {
          clearSelection();
      }
      hasDragged = false;
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

  window.Win9xDesktopUtils.forceRelayoutAllIcons = () => {
      applyAllIconPositionsAndSnap(false);
      attachListenersToAllDesktopIcons();
  };

  window.Win9xDesktopUtils.refreshIconStateAndListeners = () => {
      applyAllIconPositionsAndSnap(true);
      attachListenersToAllDesktopIcons();
  };

  window.Win9xDesktopUtils.clearSelection = clearSelection;
  window.Win9xDesktopUtils.selectIcon = selectIcon;
  window.Win9xDesktopUtils.getAllVisibleDesktopIcons = () => {
      if (!desktopElement) return [];
      return Array.from(desktopElement.querySelectorAll('.desktop-icon:not([style*="display: none"])'));
  };
  window.Win9xDesktopUtils.getDesktopIconByAppId = (appId) => {
      if (!desktopElement) return null;
      return desktopElement.querySelector(`.desktop-icon[data-app-id="${appId}"]`);
  };


  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDesktopInteractions);
  else initDesktopInteractions();
})(window);
