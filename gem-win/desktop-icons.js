// desktop-icons.js
(function(window) {
  'use strict';

  const DESKTOP_ICON_POSITIONS_KEY = 'desktopIconPositions_win9x_style_v2'; // Consistent key
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

  let longPressTimer = null;
  const LONG_PRESS_DURATION = 700;
  let longPressPointerDownX, longPressPointerDownY;
  let longPressTargetIcon = null;
  let longPressPointerId = null;

  // Helper to get the Recycle Bin API if available
  function getRecycleBinApi() {
      if (window.APP_DEFINITIONS &&
          window.APP_DEFINITIONS.recycleBin &&
          window.APP_DEFINITIONS.recycleBin.api) {
          return window.APP_DEFINITIONS.recycleBin.api;
      }
      console.warn("Recycle Bin API not found. Is APP_DEFINITIONS.recycleBin.api available globally?");
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
      allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));
      const positions = isInitialLoad ? getStoredPositions() : {};

      const iconsRequiringSnap = [];

      allDesktopIcons.forEach(icon => {
          const appId = icon.dataset.appId;
          if (isInitialLoad && appId && positions[appId]) {
              const pos = positions[appId];
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
                  allDesktopIcons: allDesktopIcons,
                  desktopElement: desktopElement,
                  savePositionFn: saveIconPosition
              });
          } else {
              console.warn("SnapToGrid module not found. Icons requiring snap may not be positioned correctly.");
              let yOffset = 10;
              iconsRequiringSnap.forEach(icon => {
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
              window.IconSelectionEffect.removeSelectionEffect(icon.querySelector('img'));
          }
      });
      selectedIcons.clear();
  }

  function selectIcon(iconElement, isAdditive = false) {
      if (!isAdditive) clearSelection();
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
      if (event.button !== 0 || (window.DesktopContextMenu && DesktopContextMenu.isVisible && DesktopContextMenu.isVisible())) return;
      isMarqueeSelecting = true;
      hasDragged = false; // Reset for marquee context specifically
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
      if (!event.ctrlKey && !event.shiftKey) clearSelection(); // Clear selection if not additive marquee
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
          const iconRect = icon.getBoundingClientRect();
          if (isIntersecting(marqueeRect, iconRect)) {
              if (!selectedIcons.has(icon)) selectIcon(icon, true); // Always additive during marquee drag
          } else {
              // Only deselect if marquee started without Ctrl/Shift (handled in startMarquee)
              // and icon was previously selected by this marquee action.
              // This part is tricky; for now, simple additive selection is easier.
              // To implement Windows-like deselection, you'd need to track initially selected items.
              // For now, if not intersecting and was selected, remove it.
              if (selectedIcons.has(icon)) {
                  selectedIcons.delete(icon);
                  icon.classList.remove('selected');
                  if (window.IconSelectionEffect) window.IconSelectionEffect.removeSelectionEffect(icon.querySelector('img'));
              }
          }
      });
  }

  function endMarquee(event) {
      if (!isMarqueeSelecting) return;
      desktopElement.releasePointerCapture(event.pointerId);
      if (marqueeElement) { marqueeElement.remove(); marqueeElement = null; }
      document.body.classList.remove('no-select');
      isMarqueeSelecting = false;
      if (!hasDragged && selectedIcons.size === 0 && event.target === desktopElement) {
          clearSelection();
      }
      // hasDragged is reset at the start of the next marquee or icon drag
  }

  function isIntersecting(rectA, rectB) {
      return !(rectA.right < rectB.left || rectA.left > rectB.right || rectA.bottom < rectB.top || rectA.top > rectB.bottom);
  }

  function startIconDrag(event, iconElement) {
      if (event.button !== 0) return;
      hasDragged = false; // Reset for icon drag
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
          icon.style.zIndex = '10000'; // Bring dragged icons to front
          icon.classList.add('is-positioned'); // Ensure it's positioned
          icon.style.position = 'absolute'; // Ensure it's absolute
          icon.style.margin = '0';
      });
      document.body.classList.add('no-select');
      primaryDraggedIcon.setPointerCapture(event.pointerId);
  }

  function processDrag(event) {
      if (!primaryDraggedIcon) return;
      if (!hasDragged && (Math.abs(event.movementX) > 3 || Math.abs(event.movementY) > 3)) {
          hasDragged = true;
          clearLongPressAttempt(); // If dragging starts, it's not a long press
      }
      if (!hasDragged) return; // Only process if actually dragging

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
      if (!primaryInitialState) return; // Should not happen if drag started correctly
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

      // Highlight Recycle Bin if dragging over it
      const recycleBinApi = getRecycleBinApi();
      if (recycleBinApi) {
          const recycleBinIconEl = recycleBinApi.getDesktopIconElement();
          if (recycleBinIconEl && primaryDraggedIcon !== recycleBinIconEl) {
              // Use event.clientX/Y for hover check as it's the current pointer position
              const currentX = event.clientX;
              const currentY = event.clientY;
              const binRect = recycleBinIconEl.getBoundingClientRect();

              if (currentX >= binRect.left && currentX <= binRect.right &&
                  currentY >= binRect.top && currentY <= binRect.bottom) {
                  recycleBinIconEl.classList.add('drop-target');
              } else {
                  recycleBinIconEl.classList.remove('drop-target');
              }
          } else if (recycleBinIconEl) { // If not dragging or dragging recycle bin itself
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
              // Check for drop based on current pointer position relative to bin icon
              const primaryRect = primaryDraggedIcon.getBoundingClientRect(); // Could also use event.clientX/Y for drop check
              const binRect = recycleBinIconEl.getBoundingClientRect();
              
              // Check if the pointer (event.clientX/Y) is over the bin at pointerup
              if (event.clientX >= binRect.left && event.clientX <= binRect.right &&
                  event.clientY >= binRect.top && event.clientY <= binRect.bottom) {
                  
                  droppedOnRecycleBin = true;
                  const itemsToRecycle = Array.from(selectedIcons);

                  itemsToRecycle.forEach(iconToRecycle => {
                      if (iconToRecycle === recycleBinIconEl) return; // Cannot recycle the bin itself

                      const appId = iconToRecycle.dataset.appId;
                      const iconNameElement = iconToRecycle.querySelector('span');
                      const iconName = iconNameElement ? iconNameElement.textContent : (appId || 'Unknown Item');
                      const iconImgElement = iconToRecycle.querySelector('img');
                      const iconImgSrc = iconImgElement ? iconImgElement.src : '';
                      
                      recycleBinApi.addItem({ id: appId, name: iconName, iconSrc: iconImgSrc });
                      
                      iconToRecycle.remove(); // Remove from DOM
                      allDesktopIcons = allDesktopIcons.filter(i => i !== iconToRecycle); // Update internal cache
                      selectedIcons.delete(iconToRecycle); // Remove from current selection
                      // Note: Removing icon position from DESKTOP_ICON_POSITIONS_KEY is now handled within recycleBinApi.addItem
                  });
                  // If items were recycled, the selection set was modified,
                  // so clearSelection might not be needed or could be adjusted.
                  // For now, let clearSelection run if no items remain selected (which should be the case).
                  if (selectedIcons.size === 0) {
                       clearSelection();
                  }
              }
          }

          if (!droppedOnRecycleBin) {
              const iconsToSnap = Array.from(selectedIcons);
              if (window.SnapToGrid && typeof SnapToGrid.snap === 'function' && iconsToSnap.length > 0) {
                  SnapToGrid.snap({
                      iconsToSnap: iconsToSnap,
                      allDesktopIcons: allDesktopIcons,
                      desktopElement: desktopElement,
                      savePositionFn: saveIconPosition
                  });
              } else if (iconsToSnap.length > 0) { // Fallback if no snap, just save raw positions
                  iconsToSnap.forEach(icon => saveIconPosition(icon.dataset.appId, icon.offsetLeft, icon.offsetTop));
              }
          }
          
          // Restore z-index for icons that were part of the drag but not recycled
          draggedItemsInitialStates.forEach((state, icon) => {
              if (document.body.contains(icon)) { // Only if icon still exists
                   icon.style.zIndex = state.zIndex;
              }
          });

      } else { // Click (not a drag)
          draggedItemsInitialStates.forEach((state, icon) => {
              if (document.body.contains(icon)) icon.style.zIndex = state.zIndex;
          });
          if (event.ctrlKey) {
              toggleSelectIcon(primaryDraggedIcon);
          } else {
              // If not Ctrl, startIconDrag already made it the sole selection, or it was part of a group.
              // If it was a single click on an unselected item, it's now selected.
              // If it was a single click on an item already in a selection, others remain selected.
              // To make it the *only* selected on a non-ctrl click if it was part of a group:
              // if (selectedIcons.size > 1) { clearSelection(); selectIcon(primaryDraggedIcon); }
          }
      }
      
      // Clear drop target class from Recycle Bin icon
      if (recycleBinIconEl) {
          recycleBinIconEl.classList.remove('drop-target');
      }

      primaryDraggedIcon = null;
      isDraggingGroup = false;
      draggedItemsInitialStates.clear();
      // hasDragged is reset at the start of the next icon pointerdown or marquee
  }


  function clearLongPressAttempt() {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      longPressTargetIcon = null;
      longPressPointerId = null;
  }

  function onIconPointerDown(event) {
      const iconElement = event.currentTarget;
      hasDragged = false; // Reset for this interaction

      // Right-click or if our context menu is already visible (e.g. from desktop long press)
      if (event.button === 2 || (window.DesktopContextMenu && DesktopContextMenu.isVisible && DesktopContextMenu.isVisible())) {
          clearLongPressAttempt();
          if (event.button === 2 && window.DesktopContextMenu && typeof DesktopContextMenu.show === 'function') {
              // desktop-context-menu's show function will handle selection if targetIcon is passed
              DesktopContextMenu.show(event, iconElement);
          }
          return; // Don't proceed with left-click/long-press logic
      }

      if (event.button === 0) { // Left click or touch
          longPressTargetIcon = iconElement;
          longPressPointerDownX = event.clientX;
          longPressPointerDownY = event.clientY;
          longPressPointerId = event.pointerId;

          clearTimeout(longPressTimer); // Clear any previous timer
          longPressTimer = setTimeout(() => {
              if (longPressTargetIcon && window.DesktopContextMenu && typeof DesktopContextMenu.show === 'function' && !hasDragged) {
                  // desktop-context-menu.js's showContextMenu will handle selecting the icon
                  // when `targetIcon` is passed. No need to manually select here.
                  
                  const lpEvent = { ...event, clientX: longPressPointerDownX, clientY: longPressPointerDownY, target: longPressTargetIcon, button: 0, type: 'contextmenu' }; // Simulate a contextmenu event for consistency
                  DesktopContextMenu.show(lpEvent, longPressTargetIcon);
                  
                  // Prevent click/drag after long press menu by setting hasDragged
                  // This ensures endIconDrag doesn't interpret the pointerup as a click
                  hasDragged = true;
                  if (primaryDraggedIcon === longPressTargetIcon) { // If drag was about to start
                      try { primaryDraggedIcon.releasePointerCapture(longPressPointerId); } catch (e) { /* ignore */ }
                      primaryDraggedIcon = null; // Cancel the drag because context menu appeared
                      document.body.classList.remove('no-select'); // Clean up
                      // Restore z-index if it was changed in startIconDrag
                      const initialState = draggedItemsInitialStates.get(longPressTargetIcon);
                      if (initialState) longPressTargetIcon.style.zIndex = initialState.zIndex;
                  }
              }
              longPressTimer = null; longPressTargetIcon = null; longPressPointerId = null;
          }, LONG_PRESS_DURATION);
          
          startIconDrag(event, iconElement); // Prepare for potential drag
      }
      event.stopPropagation(); // Stop propagation to desktop's pointerdown (marquee select)
  }


  function onDesktopPointerDown(event) {
      // Only start marquee if clicking directly on the desktop (not an icon, window, etc.)
      if (event.target === desktopElement) {
          clearLongPressAttempt(); // Clear any icon long press if clicking on desktop
          if (event.button === 0 && !(window.DesktopContextMenu && DesktopContextMenu.isVisible())) {
               startMarquee(event);
          }
          // Right click on desktop is handled by desktop-context-menu.js directly
      }
  }

  function onDocumentPointerMove(event) {
      if (longPressTargetIcon && !hasDragged) { // Only check for move if not already dragging
          const moveThreshold = 10; // pixels
          if (Math.abs(event.clientX - longPressPointerDownX) > moveThreshold ||
              Math.abs(event.clientY - longPressPointerDownY) > moveThreshold) {
              clearLongPressAttempt(); // Moved too much, cancel long press
          }
      }

      if (isMarqueeSelecting) {
          updateMarquee(event);
      } else if (primaryDraggedIcon) {
          processDrag(event); // processDrag will set hasDragged if actual movement occurs
      }
  }

  function onDocumentPointerUp(event) {
      const wasLongPressActive = !!longPressTimer; // Was a long press timer running before clear?
      clearLongPressAttempt(); // Clear any pending long press first

      if (isMarqueeSelecting) {
          endMarquee(event);
      } else if (primaryDraggedIcon) {
          // endIconDrag handles its own logic based on `hasDragged`
          // If `hasDragged` is true (set by processDrag or long press timeout), it won't be a click.
          endIconDrag(event);
      } else if (event.target === desktopElement && !wasLongPressActive && event.button === 0) {
          // If a simple click on desktop that wasn't a marquee or icon drag,
          // and didn't just cancel an icon's long press.
          clearSelection();
      }
  }


  const debouncedCheckAndSnapIcons = debounce(() => {
      if (!desktopElement || !window.SnapToGrid || typeof SnapToGrid.getDesktopIconAreaMetrics !== 'function') return;
      allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon')); // Refresh list
      const iconAreaMetrics = SnapToGrid.getDesktopIconAreaMetrics(desktopElement);
      let anIconIsOffscreen = false;
      for (const icon of allDesktopIcons) {
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
              Win9xDesktopUtils.snapSelectedIconsToGrid(); // Snaps all positioned if none selected
          }
          currentlySelected.forEach(icon => {
              const stillExists = Array.from(allDesktopIcons).includes(icon);
              if (stillExists) selectIcon(icon, true);
          });
      }
  }, 300);


  function initDesktopInteractions() {
      desktopElement = document.getElementById('desktop');
      if (!desktopElement) { console.error('DesktopInteractions: Desktop element not found.'); return; }

      allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));
      applyAllIconPositionsAndSnap(true); // Initial load

      // Re-fetch after initial snap, as snap might slightly adjust DOM or classes
      allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));

      allDesktopIcons.forEach(icon => {
          icon.addEventListener('pointerdown', onIconPointerDown);
          const img = icon.querySelector('img');
          if (img) img.addEventListener('dragstart', (e) => e.preventDefault()); // Prevent native image drag
      });

      desktopElement.addEventListener('pointerdown', onDesktopPointerDown);
      // desktopElement's 'contextmenu' is handled by desktop-context-menu.js

      document.addEventListener('pointermove', onDocumentPointerMove);
      document.addEventListener('pointerup', onDocumentPointerUp);
      document.addEventListener('pointercancel', (event) => { // Handle unexpected pointer interruption
          clearLongPressAttempt();
          if (isMarqueeSelecting) endMarquee(event);
          else if (primaryDraggedIcon) endIconDrag(event); // Treat as drag end
      });

      if (window.SnapToGrid && typeof SnapToGrid.configure === 'function') {
          SnapToGrid.configure({ gridSizeX: 85, gridSizeY: 87, desktopPadding: 10 });
      }

      debouncedCheckAndSnapIcons(); // Initial check
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
      allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon')); // Refresh
      let iconsToProcess = selectedIcons.size > 0 ? Array.from(selectedIcons) : allDesktopIcons.filter(icon => icon.classList.contains('is-positioned'));
      if (iconsToProcess.length === 0 && allDesktopIcons.length > 0) iconsToProcess = [...allDesktopIcons]; // Fallback: snap all if none are positioned

      if (iconsToProcess.length > 0) {
          SnapToGrid.snap({
              iconsToSnap: iconsToProcess, allDesktopIcons: allDesktopIcons,
              desktopElement: desktopElement, savePositionFn: saveIconPosition
          });
      }
  };
  window.Win9xDesktopUtils.forceRelayoutAllIcons = () => {
      applyAllIconPositionsAndSnap(false); // false means it's not initial load, so re-snap all
  };
  window.Win9xDesktopUtils.clearSelection = clearSelection;
  // Expose selectedIcons for DesktopContextMenu to check (e.g., for Ctrl key logic if needed there)
  // Though DesktopContextMenu should ideally not need to know about selection details.
  // window.Win9xDesktopUtils.selectedIcons = selectedIcons;


  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDesktopInteractions);
  else initDesktopInteractions();
})(window);
