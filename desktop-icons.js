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
      const positions = isInitialLoad ? getStoredPositions() : {}; // For relayout, don't use stored initially

      const iconsToPositionFromStorage = [];
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
              // iconsToPositionFromStorage.push(icon); // Not needed if SnapToGrid handles all
          } else {
              // If not initial load (e.g. "Arrange Icons"), or icon not in storage,
              // it needs to be snapped.
              // For "Arrange Icons", styles would have been cleared by desktop-context-menu.
              iconsRequiringSnap.push(icon);
          }
      });

      // Snap all icons that weren't loaded from storage, or all icons if it's a forced relayout
      if (iconsRequiringSnap.length > 0) {
          if (window.SnapToGrid && typeof window.SnapToGrid.snap === 'function') {
              window.SnapToGrid.snap({
                  iconsToSnap: iconsRequiringSnap, // Pass only those needing snap
                  allDesktopIcons: allDesktopIcons, // Pass all for collision detection
                  desktopElement: desktopElement,
                  savePositionFn: saveIconPosition
                  // `snap-to-grid.js` will handle making them absolute and adding `is-positioned`
              });
          } else {
              console.warn("SnapToGrid module not found. Icons requiring snap may not be positioned correctly.");
              // Minimal fallback for iconsRequiringSnap if SnapToGrid is missing
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
      if (event.button !== 0 || document.querySelector('.desktop-context-menu.visible')) return;
      isMarqueeSelecting = true;
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
      const newLeft = Math.min(marqueeStartX, currentX), newTop = Math.min(marqueeStartY, currentY);
      const newWidth = Math.abs(currentX - marqueeStartX), newHeight = Math.abs(currentY - marqueeStartY);
      Object.assign(marqueeElement.style, { left: `${newLeft}px`, top: `${newTop}px`, width: `${newWidth}px`, height: `${newHeight}px` });

      if (newWidth > 5 || newHeight > 5) hasDragged = true; // Consider it a drag for marquee context

      const marqueeRect = marqueeElement.getBoundingClientRect();
      allDesktopIcons.forEach(icon => {
          const iconRect = icon.getBoundingClientRect();
          if (isIntersecting(marqueeRect, iconRect)) {
              if (!selectedIcons.has(icon)) selectIcon(icon, true);
          } else {
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
      // If it was just a click on desktop (no drag, no icons selected by marquee), clear selection.
      // `hasDragged` here refers to marquee drag.
      if (!hasDragged && selectedIcons.size === 0 && event.target === desktopElement) {
          clearSelection();
      }
      hasDragged = false; // Reset for next operation
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
      } else if (event.ctrlKey) { // If ctrl is pressed, toggle selection for the clicked icon
          // This is slightly different: we want to start dragging even if it's being deselected.
          // So, select it if not selected, but don't deselect yet if it was. Deselection on click happens in endIconDrag.
          if (!selectedIcons.has(iconElement)) selectIcon(iconElement, true);
      }
      // If not ctrl and icon is already selected, it's part of the group.

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
      const minX = iconAreaMetrics.iconAreaOffsetX, minY = iconAreaMetrics.iconAreaOffsetY;
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
          let newX = initialState.x + deltaX, newY = initialState.y + deltaY;
          newX = Math.max(minX, Math.min(newX, draggableWidth - icon.offsetWidth));
          newY = Math.max(minY, Math.min(newY, draggableHeight - icon.offsetHeight));
          icon.style.left = `${newX}px`; icon.style.top = `${newY}px`;
      });
  }

  function endIconDrag(event) {
      if (!primaryDraggedIcon) return;
      primaryDraggedIcon.releasePointerCapture(event.pointerId);
      document.body.classList.remove('no-select');

      if (hasDragged) {
          const iconsToSnap = Array.from(selectedIcons);
          if (window.SnapToGrid && typeof SnapToGrid.snap === 'function') {
              SnapToGrid.snap({
                  iconsToSnap: iconsToSnap,
                  allDesktopIcons: allDesktopIcons,
                  desktopElement: desktopElement,
                  savePositionFn: saveIconPosition
              });
          } else { // Fallback if no snap, just save raw positions
              selectedIcons.forEach(icon => saveIconPosition(icon.dataset.appId, icon.offsetLeft, icon.offsetTop));
          }
          selectedIcons.forEach(icon => {
              const state = draggedItemsInitialStates.get(icon);
              if (state) icon.style.zIndex = state.zIndex;
          });
      } else { // Click
          draggedItemsInitialStates.forEach((state, icon) => icon.style.zIndex = state.zIndex);
          if (event.ctrlKey) {
              toggleSelectIcon(primaryDraggedIcon);
          } else {
              // If not Ctrl, startIconDrag already made it the sole selection.
              // If it was already selected as part of a group, it remains selected.
              // To make it the *only* selected on a non-ctrl click, we'd do:
              // clearSelection(); selectIcon(primaryDraggedIcon);
              // But current behavior is more Windows-like (click on selected item in group doesn't deselect others without ctrl)
          }
      }
      primaryDraggedIcon = null; isDraggingGroup = false; draggedItemsInitialStates.clear();
      // hasDragged reset at start of next icon pointerdown
  }

  function clearLongPressAttempt() {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      longPressTargetIcon = null; longPressPointerId = null;
  }

  function onIconPointerDown(event) {
      const iconElement = event.currentTarget;
      hasDragged = false; // Reset for this interaction specifically

      if (event.button === 2 || (window.DesktopContextMenu && DesktopContextMenu.isVisible && DesktopContextMenu.isVisible())) {
          clearLongPressAttempt();
          // If right click, and context menu is available, show it.
          if (event.button === 2 && window.DesktopContextMenu && typeof DesktopContextMenu.show === 'function') {
              DesktopContextMenu.show(event, iconElement);
          }
          return;
      }

      if (event.button === 0) { // Left click or touch
          longPressTargetIcon = iconElement;
          longPressPointerDownX = event.clientX;
          longPressPointerDownY = event.clientY;
          longPressPointerId = event.pointerId;

          clearTimeout(longPressTimer);
          longPressTimer = setTimeout(() => {
              if (longPressTargetIcon && window.DesktopContextMenu && typeof DesktopContextMenu.show === 'function' && !hasDragged) {
                  // Ensure only this icon is selected for context menu unless Ctrl was held
                  if (!event.ctrlKey) {
                      selectIcon(longPressTargetIcon); // Select only this one
                  } else {
                      if (!selectedIcons.has(longPressTargetIcon)) {
                           selectIcon(longPressTargetIcon, true); // Add to selection if Ctrl is held
                      }
                  }

                  const lpEvent = { ...event, clientX: longPressPointerDownX, clientY: longPressPointerDownY, target: longPressTargetIcon, button: 0 };
                  DesktopContextMenu.show(lpEvent, longPressTargetIcon);
                  hasDragged = true; // Prevent click/drag after long press menu
                  if (primaryDraggedIcon === longPressTargetIcon) { // If drag was initiated
                      try { longPressTargetIcon.releasePointerCapture(longPressPointerId); } catch (e) {}
                      primaryDraggedIcon = null; // Cancel drag
                  }
              }
              longPressTimer = null; longPressTargetIcon = null; longPressPointerId = null;
          }, LONG_PRESS_DURATION);
          startIconDrag(event, iconElement); // Prepare for potential drag
      }
      event.stopPropagation();
  }

  function onDesktopPointerDown(event) {
      if (event.target === desktopElement) {
          clearLongPressAttempt();
          if (event.button === 0) startMarquee(event);
          // Right click on desktop is handled by desktop-context-menu.js directly
      }
  }

  function onDocumentPointerMove(event) {
      if (longPressTargetIcon) {
          const moveThreshold = 10;
          if (Math.abs(event.clientX - longPressPointerDownX) > moveThreshold || Math.abs(event.clientY - longPressPointerDownY) > moveThreshold) {
              clearLongPressAttempt();
          }
      }
      if (isMarqueeSelecting) updateMarquee(event);
      else if (primaryDraggedIcon) processDrag(event);
  }

  function onDocumentPointerUp(event) {
      const wasLongPressClearedByThisUp = !!longPressTimer;
      clearLongPressAttempt();

      if (isMarqueeSelecting) endMarquee(event);
      else if (primaryDraggedIcon) endIconDrag(event);
      else if (event.target === desktopElement && !wasLongPressClearedByThisUp && event.button === 0) {
          // If a simple click on desktop that wasn't a marquee or icon drag, and didn't just cancel a long press
          clearSelection();
      }
  }

  const debouncedCheckAndSnapIcons = debounce(() => {
      if (!desktopElement || !window.SnapToGrid || typeof SnapToGrid.getDesktopIconAreaMetrics !== 'function') return;
      allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));
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
          currentlySelected.forEach(icon => selectIcon(icon, true));
      }
  }, 300);

  function initDesktopInteractions() {
      desktopElement = document.getElementById('desktop');
      if (!desktopElement) { console.error('DesktopInteractions: Desktop element not found.'); return; }

      applyAllIconPositionsAndSnap(true); // Initial load

      allDesktopIcons.forEach(icon => {
          icon.addEventListener('pointerdown', onIconPointerDown);
          const img = icon.querySelector('img');
          if (img) img.addEventListener('dragstart', (e) => e.preventDefault());
      });

      desktopElement.addEventListener('pointerdown', onDesktopPointerDown);
      // desktopElement's contextmenu is handled by desktop-context-menu.js
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
      allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));
      let iconsToProcess = selectedIcons.size > 0 ? Array.from(selectedIcons) : allDesktopIcons.filter(icon => icon.classList.contains('is-positioned'));
      if (iconsToProcess.length === 0) iconsToProcess = [...allDesktopIcons]; // Fallback: snap all if none are positioned

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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDesktopInteractions);
  else initDesktopInteractions();

  })(window);
