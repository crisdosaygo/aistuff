  (function() {
  'use strict';

  const DESKTOP_ICON_POSITIONS_KEY = 'desktopIconPositions_win9x_style_v2'; // v2 for always absolute
  let desktopElement;
  let allDesktopIcons = [];

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

  let marqueeJustFinishedOnDesktop = false;
  let significantMarqueeOccurred = false;

  // Long press state variables
  let longPressTimer = null;
  const LONG_PRESS_DURATION = 700; // ms
  let longPressPointerDownX, longPressPointerDownY;
  let longPressTargetIcon = null;
  let longPressPointerId = null;


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

  function getStoredPositions() {
      try {
          const stored = localStorage.getItem(DESKTOP_ICON_POSITIONS_KEY);
          return stored ? JSON.parse(stored) : {};
      } catch (e) { console.error("LS Error (get):", e); return {}; }
  }

  function saveIconPosition(appId, x, y) {
      if (!appId) return; // Do not save if appId is missing
      const positions = getStoredPositions();
      positions[appId] = { x, y };
      try {
          localStorage.setItem(DESKTOP_ICON_POSITIONS_KEY, JSON.stringify(positions));
      } catch (e) { console.error("LS Error (save):", e); }
  }

  function applyInitialPositions() {
      if (!desktopElement) return;
      const positions = getStoredPositions();
      allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));

      const iconsInitiallyPositionedFromStorage = new Set();

      allDesktopIcons.forEach(icon => {
          const appId = icon.dataset.appId;
          if (appId && positions[appId]) {
              const pos = positions[appId];
              icon.style.position = 'absolute';
              icon.style.left = `${pos.x}px`;
              icon.style.top = `${pos.y}px`;
              icon.style.margin = '0'; // Remove flow layout margin
              icon.classList.add('is-positioned');
              iconsInitiallyPositionedFromStorage.add(icon);
          }
      });

      const iconsRequiringInitialSnap = allDesktopIcons.filter(icon => !iconsInitiallyPositionedFromStorage.has(icon));

      if (iconsRequiringInitialSnap.length > 0) {
          if (window.SnapToGrid && typeof window.SnapToGrid.snap === 'function') {
              // SnapToGrid.snap function is expected to:
              // 1. Iterate `iconsToSnap`.
              // 2. For each, find an available grid cell.
              // 3. Apply `style.position = 'absolute'`, `style.left`, `style.top`, `style.margin = '0'`.
              // 4. Add `classList.add('is-positioned')`.
              // 5. Call `savePositionFn` with the new coordinates.
              window.SnapToGrid.snap({
                  iconsToSnap: iconsRequiringInitialSnap,
                  allDesktopIcons: allDesktopIcons,
                  desktopElement: desktopElement,
                  savePositionFn: saveIconPosition,
                  isInitialLayout: true
              });
          } else {
              console.warn("SnapToGrid module or its snap function not found for initial layout of some icons. Basic stacking fallback.");
              // Basic fallback if SnapToGrid is missing (less ideal)
              let currentX = 10, currentY = 10; // Start coordinates
              const iconWidthEstimate = 85; // Approximate width + gap
              const iconHeightEstimate = 85; // Approximate height + gap
              const desktopWidth = desktopElement.clientWidth - 20; // Usable width

              // Create a temporary grid map of occupied spaces by stored icons
              const occupiedGrid = new Set();
              iconsInitiallyPositionedFromStorage.forEach(icon => {
                  // Crude approximation of grid cells occupied
                  const xCell = Math.floor(icon.offsetLeft / iconWidthEstimate);
                  const yCell = Math.floor(icon.offsetTop / iconHeightEstimate);
                  occupiedGrid.add(`${xCell},${yCell}`);
              });

              iconsRequiringInitialSnap.forEach(icon => {
                  let placed = false;
                  // Try to find an empty slot in a simple grid manner
                  for (let xCellTry = 0; xCellTry * iconWidthEstimate < desktopWidth; xCellTry++) {
                      for (let yCellTry = 0; yCellTry * iconHeightEstimate < desktopElement.clientHeight - 20; yCellTry++) {
                          if (!occupiedGrid.has(`${xCellTry},${yCellTry}`)) {
                              currentX = 10 + xCellTry * iconWidthEstimate;
                              currentY = 10 + yCellTry * iconHeightEstimate;
                              occupiedGrid.add(`${xCellTry},${yCellTry}`);
                              placed = true;
                              break;
                          }
                      }
                      if (placed) break;
                  }
                   if (!placed) { // If somehow no slot found (e.g., too many icons), just stack at default
                      currentX = 10; currentY = 10; // Reset and overlap, less ideal
                   }


                  icon.style.position = 'absolute';
                  icon.style.left = `${currentX}px`;
                  icon.style.top = `${currentY}px`;
                  icon.style.margin = '0';
                  icon.classList.add('is-positioned');
                  saveIconPosition(icon.dataset.appId, currentX, currentY);
              });
          }
      }

      // Final check: all icons should now be 'is-positioned' and 'absolute'
      // If any icon is still 'static', it's an issue.
      allDesktopIcons.forEach(icon => {
          if (!icon.classList.contains('is-positioned')) {
              console.warn('Icon not positioned by storage or initial snap:', icon.dataset.appId, icon);
              // As a last resort, make it relative for basic marquee interaction, though it shouldn't happen.
               if (window.getComputedStyle(icon).position === 'static') {
                   icon.style.position = 'relative'; // Fallback for offsetTop/Left
               }
          }
      });
  }


  function clearSelection() {
      selectedIcons.forEach(icon => {
          icon.classList.remove('selected');
          if (window.IconSelectionEffect && typeof window.IconSelectionEffect.removeSelectionEffect === 'function') {
              window.IconSelectionEffect.removeSelectionEffect(icon.querySelector('img'));
          }
      });
      selectedIcons.clear();
  }

  function selectIcon(iconElement, isAdditive = false) {
      if (!isAdditive) {
          clearSelection();
      }
      if (iconElement && !selectedIcons.has(iconElement)) {
          selectedIcons.add(iconElement);
          iconElement.classList.add('selected');
          if (window.IconSelectionEffect && typeof window.IconSelectionEffect.applySelectionEffect === 'function') {
              window.IconSelectionEffect.applySelectionEffect(iconElement.querySelector('img'));
          }
      }
  }

  function toggleSelectIcon(iconElement) {
      if (selectedIcons.has(iconElement)) {
          selectedIcons.delete(iconElement);
          iconElement.classList.remove('selected');
          if (window.IconSelectionEffect && typeof window.IconSelectionEffect.removeSelectionEffect === 'function') {
              window.IconSelectionEffect.removeSelectionEffect(iconElement.querySelector('img'));
          }
      } else {
          selectedIcons.add(iconElement);
          iconElement.classList.add('selected');
          if (window.IconSelectionEffect && typeof window.IconSelectionEffect.applySelectionEffect === 'function') {
              window.IconSelectionEffect.applySelectionEffect(iconElement.querySelector('img'));
          }
      }
  }

  function startMarquee(event) {
      if (event.button !== 0) return;

      significantMarqueeOccurred = false;
      marqueeJustFinishedOnDesktop = false;

      isMarqueeSelecting = true;
      desktopRectCache = desktopElement.getBoundingClientRect();

      const desktopStyle = window.getComputedStyle(desktopElement);
      const paddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
      const paddingTop = parseFloat(desktopStyle.paddingTop) || 0;

      marqueeStartX = event.clientX - desktopRectCache.left - paddingLeft;
      marqueeStartY = event.clientY - desktopRectCache.top - paddingTop;

      marqueeElement = document.createElement('div');
      marqueeElement.className = 'marquee-select-box';
      marqueeElement.style.left = `${marqueeStartX}px`;
      marqueeElement.style.top = `${marqueeStartY}px`;
      marqueeElement.style.width = '0px';
      marqueeElement.style.height = '0px';
      desktopElement.appendChild(marqueeElement);

      clearSelection();
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

      const newLeft = Math.min(marqueeStartX, currentX);
      const newTop = Math.min(marqueeStartY, currentY);
      const newWidth = Math.abs(currentX - marqueeStartX);
      const newHeight = Math.abs(currentY - marqueeStartY);

      marqueeElement.style.left = `${newLeft}px`;
      marqueeElement.style.top = `${newTop}px`;
      marqueeElement.style.width = `${newWidth}px`;
      marqueeElement.style.height = `${newHeight}px`;

      if (newWidth > 5 || newHeight > 5) {
          significantMarqueeOccurred = true;
      }

      const marqueeRect = marqueeElement.getBoundingClientRect();
      let iconsWereSelectedThisUpdate = false;
      allDesktopIcons.forEach(icon => {
          const iconRect = icon.getBoundingClientRect();
          if (isIntersecting(marqueeRect, iconRect)) {
              if (!selectedIcons.has(icon)) {
                  selectedIcons.add(icon);
                  icon.classList.add('selected');
                  if (window.IconSelectionEffect && typeof window.IconSelectionEffect.applySelectionEffect === 'function') {
                      window.IconSelectionEffect.applySelectionEffect(icon.querySelector('img'));
                  }
                  iconsWereSelectedThisUpdate = true;
              }
          } else {
              if (selectedIcons.has(icon)) {
                  selectedIcons.delete(icon);
                  icon.classList.remove('selected');
                  if (window.IconSelectionEffect && typeof window.IconSelectionEffect.removeSelectionEffect === 'function') {
                      window.IconSelectionEffect.removeSelectionEffect(icon.querySelector('img'));
                  }
              }
          }
      });
      if (iconsWereSelectedThisUpdate) {
          significantMarqueeOccurred = true;
      }
  }

  function endMarquee(event) {
      if (!isMarqueeSelecting) return;

      desktopElement.releasePointerCapture(event.pointerId);
      if (marqueeElement) {
          const marqueeWidth = parseFloat(marqueeElement.style.width) || 0;
          const marqueeHeight = parseFloat(marqueeElement.style.height) || 0;
          if (marqueeWidth > 5 || marqueeHeight > 5) {
              significantMarqueeOccurred = true;
          }
          marqueeElement.remove();
          marqueeElement = null;
      }
      document.body.classList.remove('no-select');
      isMarqueeSelecting = false;

      if (selectedIcons.size > 0) {
          significantMarqueeOccurred = true;
      }

      if (event.target === desktopElement) {
          marqueeJustFinishedOnDesktop = true;
      }
  }

  function isIntersecting(rectA, rectB) {
      return !(rectA.right < rectB.left ||
               rectA.left > rectB.right ||
               rectA.bottom < rectB.top ||
               rectA.top > rectB.bottom);
  }

  function startIconDrag(event, iconElement) {
      if (event.button !== 0) return;

      hasDragged = false;
      primaryDraggedIcon = iconElement;
      desktopRectCache = desktopElement.getBoundingClientRect();

      if (!event.ctrlKey && !selectedIcons.has(iconElement)) {
          clearSelection();
          selectIcon(iconElement);
      } else if (event.ctrlKey && !selectedIcons.has(iconElement)) {
          selectIcon(iconElement, true);
      } else if (event.ctrlKey && selectedIcons.has(iconElement)) {
          // If Ctrl is pressed and icon is already selected, it remains part of the drag group.
          // A subsequent click (if no drag) would toggle it off, handled by endIconDrag's click logic.
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
          // All icons are expected to be position:absolute now.
          // The 'wasFlowLayout' logic is removed.
          icon.style.position = 'absolute'; // Ensure, though should be already
          icon.style.margin = '0';      // Ensure, though should be already

          draggedItemsInitialStates.set(icon, {
              x: icon.offsetLeft,
              y: icon.offsetTop,
              zIndex: icon.style.zIndex || '',
          });
          icon.style.zIndex = '10000';
      });

      document.body.classList.add('no-select');
      primaryDraggedIcon.setPointerCapture(event.pointerId);
  }

  function processDrag(event) {
      if (!primaryDraggedIcon) return;

      if (!hasDragged && (Math.abs(event.movementX) > 3 || Math.abs(event.movementY) > 3)) { // Increased threshold slightly
          hasDragged = true;
          clearLongPressAttempt(); // If drag starts, cancel long press
      }
      if (!hasDragged) return;

      const desktopStyle = window.getComputedStyle(desktopElement);
      const desktopPaddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
      const desktopPaddingTop = parseFloat(desktopStyle.paddingTop) || 0;

      const iconAreaMetrics = (window.SnapToGrid && typeof window.SnapToGrid.getDesktopIconAreaMetrics === 'function') ?
                              window.SnapToGrid.getDesktopIconAreaMetrics(desktopElement) :
                              { iconAreaOffsetX: 0, iconAreaOffsetY: 0, contentWidthForGrid: desktopElement.clientWidth, contentHeightForGrid: desktopElement.clientHeight };

      const draggableWidth = iconAreaMetrics.iconAreaOffsetX + iconAreaMetrics.contentWidthForGrid;
      const draggableHeight = iconAreaMetrics.iconAreaOffsetY + iconAreaMetrics.contentHeightForGrid;
      const minX = iconAreaMetrics.iconAreaOffsetX;
      const minY = iconAreaMetrics.iconAreaOffsetY;

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
  }

  function endIconDrag(event) {
      if (!primaryDraggedIcon) return;

      primaryDraggedIcon.releasePointerCapture(event.pointerId);
      document.body.classList.remove('no-select');

      if (hasDragged) {
          draggedItemsInitialStates.forEach((state, icon) => {
              icon.style.zIndex = state.zIndex;
              const appId = icon.dataset.appId;
              if (appId) {
                  saveIconPosition(appId, icon.offsetLeft, icon.offsetTop);
              }
              // Ensure 'is-positioned' remains, which it should as it's added at init/snap
              if (!icon.classList.contains('is-positioned')) {
                   icon.classList.add('is-positioned');
              }
          });
      } else { // Click (no significant drag)
          draggedItemsInitialStates.forEach((state, icon) => {
              icon.style.zIndex = state.zIndex;
              // Icons remain absolutely positioned. No style reversion needed.
          });
          // Handle selection for a click:
          // If Ctrl was pressed, toggle selection of the primary icon.
          // If Ctrl was not pressed, the primary icon was already selected exclusively in startIconDrag.
          if (event.ctrlKey) {
              toggleSelectIcon(primaryDraggedIcon);
          } else {
              // If not a ctrlKey click, and it wasn't a drag,
              // ensure only this icon is selected. startIconDrag should have handled this.
              // selectIcon(primaryDraggedIcon); // This is usually redundant due to startIconDrag
          }
      }

      primaryDraggedIcon = null;
      isDraggingGroup = false;
      draggedItemsInitialStates.clear();
      // hasDragged is reset at the start of the next pointerdown on an icon
  }


  function clearLongPressAttempt() {
      if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
      }
      if (longPressTargetIcon && longPressPointerId !== null) {
          try {
              // Only release if this specific pointerdown initiated the longpress
              // and it hasn't been captured by drag logic already.
              // This is tricky because drag logic also captures.
              // For now, rely on drag logic to manage its own capture.
          } catch(e) { /* ignore */ }
      }
      longPressTargetIcon = null;
      longPressPointerId = null;
  }


  function onIconPointerDown(event) {
      const iconElement = event.currentTarget;
      hasDragged = false; // Reset for this interaction

      if (event.button === 2 || document.querySelector('.desktop-context-menu.visible')) {
          // Native or custom right-click context menu logic will handle this.
          // Long press is primarily for touch or as an alternative.
          // If it's a right click, clear any pending long press from other pointers.
          clearLongPressAttempt();
          return;
      }

      // For left click (button 0) or touch
      if (event.button === 0) {
          longPressTargetIcon = iconElement;
          longPressPointerDownX = event.clientX;
          longPressPointerDownY = event.clientY;
          longPressPointerId = event.pointerId; // Store pointerId for potential release

          clearTimeout(longPressTimer);
          longPressTimer = setTimeout(() => {
              if (longPressTargetIcon && window.DesktopContextMenu && typeof window.DesktopContextMenu.show === 'function') {
                  const longPressSimulatedEvent = {
                      preventDefault: () => event.preventDefault(),
                      stopPropagation: () => event.stopPropagation(),
                      clientX: longPressPointerDownX,
                      clientY: longPressPointerDownY,
                      target: longPressTargetIcon,
                      button: 0, // Simulate left-click context menu
                      pointerType: event.pointerType
                  };
                  window.DesktopContextMenu.show(longPressSimulatedEvent, longPressTargetIcon);

                  hasDragged = true; // Prevent click/drag actions after context menu appears from long press

                  // If drag logic captured this pointer, release it so context menu can be interacted with.
                  // This assumes primaryDraggedIcon would be set if drag logic started.
                  if (primaryDraggedIcon === longPressTargetIcon) {
                      try {
                          longPressTargetIcon.releasePointerCapture(longPressPointerId);
                      } catch (e) { /* console.warn("Error releasing pointer capture after long press:", e); */ }
                      primaryDraggedIcon = null; // Nullify drag operation
                  }
              }
              longPressTimer = null;
              longPressTargetIcon = null;
              longPressPointerId = null;
          }, LONG_PRESS_DURATION);

          // Start drag preparations (selection, offsets). Actual drag movement handled in processDrag.
          startIconDrag(event, iconElement);
      }
      event.stopPropagation(); // Prevent desktop marquee if click is on an icon
  }

  function onDesktopPointerDown(event) {
      if (event.target === desktopElement) {
          clearLongPressAttempt(); // Click on desktop cancels any icon long press
          if (event.button === 0) {
              startMarquee(event);
          }
      }
  }

  function onDocumentPointerMove(event) {
      if (longPressTargetIcon) {
          const moveThreshold = 10;
          if (Math.abs(event.clientX - longPressPointerDownX) > moveThreshold ||
              Math.abs(event.clientY - longPressPointerDownY) > moveThreshold) {
              clearLongPressAttempt(); // Moved too much, cancel long press
          }
      }

      if (isMarqueeSelecting) {
          updateMarquee(event);
      } else if (primaryDraggedIcon) {
          // processDrag checks `hasDragged` internally after first significant movement
          processDrag(event);
      }
  }

  function onDocumentPointerUp(event) {
      clearLongPressAttempt(); // Pointer up, always clear long press attempt

      if (isMarqueeSelecting) {
          endMarquee(event);
      } else if (primaryDraggedIcon) {
          endIconDrag(event); // This will handle save or click logic based on `hasDragged`
      }

      marqueeJustFinishedOnDesktop = false;
      significantMarqueeOccurred = false;
      if (event.target === desktopElement && isMarqueeSelecting === false && primaryDraggedIcon === null) {
          // If click was on desktop and wasn't ending a marquee or icon drag
          // (those set their own flags or handle selection)
          // This is a direct click on desktop.
          if (!significantMarqueeOccurred) { // And no significant marquee happened just before this pointerup
               clearSelection();
          }
      }
  }


  function checkAndSnapIconsIfOffscreen() {
      if (!desktopElement || !window.SnapToGrid || typeof window.SnapToGrid.getDesktopIconAreaMetrics !== 'function') {
          return;
      }
      allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));
      const iconAreaMetrics = window.SnapToGrid.getDesktopIconAreaMetrics(desktopElement);
      let anIconIsOffscreen = false;

      for (const icon of allDesktopIcons) {
          if (icon.classList.contains('is-positioned')) {
              const iconLeft = icon.offsetLeft;
              const iconTop = icon.offsetTop;
              const iconRight = iconLeft + icon.offsetWidth;
              const iconBottom = iconTop + icon.offsetHeight;

              const minX = iconAreaMetrics.iconAreaOffsetX;
              const minY = iconAreaMetrics.iconAreaOffsetY;
              const maxX = iconAreaMetrics.iconAreaOffsetX + iconAreaMetrics.contentWidthForGrid;
              const maxY = iconAreaMetrics.iconAreaOffsetY + iconAreaMetrics.contentHeightForGrid;

              if (iconLeft < minX || iconTop < minY || iconRight > maxX || iconBottom > maxY) {
                  anIconIsOffscreen = true;
                  break;
              }
          }
      }

      if (anIconIsOffscreen) {
          const currentlySelected = new Set(selectedIcons);
          clearSelection();

          if (window.Win9xDesktopUtils && typeof window.Win9xDesktopUtils.snapSelectedIconsToGrid === 'function') {
              // Snap all positioned icons if any are offscreen
              // snapSelectedIconsToGrid with no selection will snap all 'is-positioned' icons.
              window.Win9xDesktopUtils.snapSelectedIconsToGrid();
          }
          currentlySelected.forEach(icon => selectIcon(icon, true));
      }
  }
  const debouncedCheckAndSnapIcons = debounce(checkAndSnapIconsIfOffscreen, 300);

  function initDesktopInteractions() {
      desktopElement = document.getElementById('desktop');
      if (!desktopElement) {
          console.error('DesktopInteractions: Desktop element (#desktop) not found.');
          return;
      }

      applyInitialPositions(); // Applies stored/snapped positions, populates allDesktopIcons

      allDesktopIcons.forEach(icon => {
          icon.addEventListener('pointerdown', onIconPointerDown);
          const img = icon.querySelector('img');
          if (img) img.addEventListener('dragstart', (e) => e.preventDefault());
      });

      desktopElement.addEventListener('pointerdown', onDesktopPointerDown);
      document.addEventListener('pointermove', onDocumentPointerMove);
      document.addEventListener('pointerup', onDocumentPointerUp);
      document.addEventListener('pointercancel', (event) => { // Handle cancel like up
          clearLongPressAttempt();
          if (isMarqueeSelecting) endMarquee(event);
          else if (primaryDraggedIcon) endIconDrag(event);
      });

      document.addEventListener('click', function(event) {
          // This global click listener is tricky with the new logic.
          // Marquee end and icon end drag handle their own selection logic.
          // A direct click on the desktop (not on an icon, not starting a marquee)
          // should clear selection. This is handled by onDesktopPointerDown -> startMarquee -> clearSelection
          // or by onDocumentPointerUp if it was a simple click on desktop.

          // The flags marqueeJustFinishedOnDesktop and significantMarqueeOccurred
          // were intended to refine this, but might be less necessary if other handlers are robust.
          // For now, let's simplify: if a click lands directly on the desktop and wasn't part of
          // a marquee selection process that selected items, it should clear.
          // This is largely covered by onDocumentPointerUp's final block.

      }, true);

      if (window.SnapToGrid && typeof window.SnapToGrid.configure === 'function') {
          window.SnapToGrid.configure({
              gridSizeX: 85,
              gridSizeY: 87,
              desktopPadding: 10
          });
      }

      checkAndSnapIconsIfOffscreen();
      if (typeof ResizeObserver !== 'undefined') {
          const resizeObserver = new ResizeObserver(debouncedCheckAndSnapIcons);
          resizeObserver.observe(desktopElement);
      } else {
          window.addEventListener('resize', debouncedCheckAndSnapIcons);
      }
  }

  if (!window.Win9xDesktopUtils) window.Win9xDesktopUtils = {};
  window.Win9xDesktopUtils.snapSelectedIconsToGrid = () => {
      if (!window.SnapToGrid || typeof window.SnapToGrid.snap !== 'function') {
          console.error("SnapToGrid module or its snap function not found.");
          return;
      }
      if (!desktopElement) {
          console.error("Desktop element not found for snapping.");
          return;
      }
      allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));

      let iconsToProcess;
      if (selectedIcons.size > 0) {
          iconsToProcess = Array.from(selectedIcons);
      } else {
          // If no icons selected, snap all 'is-positioned' icons.
          // Since all icons should be 'is-positioned' after init, this effectively snaps all.
          iconsToProcess = allDesktopIcons.filter(icon => icon.classList.contains('is-positioned'));
          if (iconsToProcess.length === 0) { // Should not happen if init works
              console.warn("Snap all called, but no icons are 'is-positioned'. Snapping all icons.");
              iconsToProcess = [...allDesktopIcons];
          }
      }

      if (iconsToProcess.length > 0) {
          window.SnapToGrid.snap({
              iconsToSnap: iconsToProcess,
              allDesktopIcons: allDesktopIcons,
              desktopElement: desktopElement,
              savePositionFn: saveIconPosition
          });
      }
  };
  window.Win9xDesktopUtils.clearSelection = clearSelection; // Expose clearSelection


  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDesktopInteractions);
  } else {
      initDesktopInteractions();
  }
  })();
