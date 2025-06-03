// desktop-context-menu.js
  (function(window) {
      'use strict';

      const DESKTOP_ICON_POSITIONS_KEY = 'desktopIconPositions_win9x_style_v2'; // Consistent key
      const DESKTOP_BACKGROUND_COLOR_KEY = 'desktopBgColor_win9x';
      const DESKTOP_BACKGROUND_IMAGE_KEY = 'desktopBgImage_win9x';

      let desktopElement;
      let contextMenuElement = null;
      let displayPropertiesDialog = null;
      let currentBgColor = '#008080';
      let currentBgImage = '';

      // Long-press detection variables
      let longPressTimer = null;
      const LONG_PRESS_DURATION = 500; // milliseconds
      let pointerDownClientX = 0;
      let pointerDownClientY = 0;
      const MAX_MOVE_THRESHOLD = 10; // pixels to allow movement before cancelling long press

      function makeDialogDraggable(dialogElement, titleBarElement) {
          let offsetX, offsetY, isDragging = false;
          titleBarElement.addEventListener('pointerdown', (e) => {
              if (e.target.closest('button')) return;
              isDragging = true;
              const dialogRect = dialogElement.getBoundingClientRect();
              offsetX = e.clientX - dialogRect.left;
              offsetY = e.clientY - dialogRect.top;
              titleBarElement.style.cursor = 'grabbing';
              const currentZ = parseInt(window.getComputedStyle(dialogElement).zIndex) || 15000;
              dialogElement.style.zIndex = currentZ + 1;
              document.body.classList.add('no-select');
          });
          document.addEventListener('pointermove', (e) => {
              if (!isDragging) return;
              let newX = e.clientX - offsetX;
              let newY = e.clientY - offsetY;
              const vpWidth = desktopElement.clientWidth;
              const vpHeight = desktopElement.clientHeight;
              const dialogWidth = dialogElement.offsetWidth;
              const dialogHeight = dialogElement.offsetHeight;
              newX = Math.max(0, Math.min(newX, vpWidth - dialogWidth));
              newY = Math.max(0, Math.min(newY, vpHeight - dialogHeight));
              dialogElement.style.left = `${newX}px`;
              dialogElement.style.top = `${newY}px`;
          });
          document.addEventListener('pointerup', () => {
              if (isDragging) {
                  isDragging = false;
                  titleBarElement.style.cursor = 'grab';
                  document.body.classList.remove('no-select');
              }
          });
      }

      function openDisplayProperties() {
          hideContextMenu();
          if (displayPropertiesDialog && desktopElement.contains(displayPropertiesDialog)) {
              const currentZ = parseInt(window.getComputedStyle(displayPropertiesDialog).zIndex) || 15000;
              displayPropertiesDialog.style.zIndex = currentZ + 1;
              displayPropertiesDialog.querySelector('input, button')?.focus();
              return;
          }
          displayPropertiesDialog = document.createElement('div');
          displayPropertiesDialog.className = 'display-properties-dialog';
          const initialLeft = Math.max(0, (desktopElement.clientWidth - 380) / 2);
          const initialTop = Math.max(0, (desktopElement.clientHeight - 320) / 3);
          displayPropertiesDialog.style.left = `${initialLeft}px`;
          displayPropertiesDialog.style.top = `${initialTop}px`;
          displayPropertiesDialog.style.zIndex = '15001';
          displayPropertiesDialog.innerHTML = `
              <div class="display-properties-dialog-titlebar">
                  <span class="display-properties-dialog-title">Display Properties</span>
                  <div class="display-properties-dialog-controls">
                      <button class="dialog-close-btn" title="Close">r</button>
                  </div>
              </div>
              <div class="display-properties-dialog-content">
                  <div class="display-properties-tabs">
                      <div class="display-properties-tab active" data-tab="background">Background</div>
                  </div>
                  <div class="display-properties-tab-content active" data-tab-content="background">
                      <fieldset style="margin-bottom:10px;">
                          <legend>Wallpaper</legend>
                          <div class="display-properties-preview" id="dpPreview"></div>
                          <label for="dpBgImageFile" style="display:block; margin:5px 0;">Select an image (max 1MB):</label>
                          <input type="file" id="dpBgImageFile" accept="image/jpeg, image/png, image/gif, image/webp" style="margin-bottom:5px; width: calc(100% - 8px);">
                          <button id="dpClearImageBtn" class="win95-button" style="padding: 2px 8px; min-width: auto;">Remove Image</button>
                      </fieldset>
                      <fieldset>
                          <legend>Color</legend>
                          <label for="dpBgColor" style="display:block; margin:5px 0;">Select background color:</label>
                          <input type="color" id="dpBgColor" value="${currentBgColor}" style="width: 60px; height: 25px;">
                      </fieldset>
                  </div>
                  <div class="display-properties-buttons">
                      <button id="dpOkBtn" class="win95-button">OK</button>
                      <button id="dpCancelBtn" class="win95-button">Cancel</button>
                      <button id="dpApplyBtn" class="win95-button">Apply</button>
                  </div>
              </div>
          `;
          desktopElement.appendChild(displayPropertiesDialog);
          const titleBar = displayPropertiesDialog.querySelector('.display-properties-dialog-titlebar');
          makeDialogDraggable(displayPropertiesDialog, titleBar);

          const closeBtn = displayPropertiesDialog.querySelector('.dialog-close-btn');
          const okBtn = displayPropertiesDialog.querySelector('#dpOkBtn');
          const cancelBtn = displayPropertiesDialog.querySelector('#dpCancelBtn');
          const applyBtn = displayPropertiesDialog.querySelector('#dpApplyBtn');
          const colorInput = displayPropertiesDialog.querySelector('#dpBgColor');
          const imageInput = displayPropertiesDialog.querySelector('#dpBgImageFile');
          const clearImageBtn = displayPropertiesDialog.querySelector('#dpClearImageBtn');
          const previewEl = displayPropertiesDialog.querySelector('#dpPreview');

          if (closeBtn.style.fontFamily.toLowerCase().includes('marlett')) {
              closeBtn.style.fontSize = '10px';
          }

          function updatePreview() {
              previewEl.style.backgroundColor = colorInput.value;
              const file = imageInput.files[0];
              if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => { previewEl.style.backgroundImage = `url(${e.target.result})`; };
                  reader.readAsDataURL(file);
              } else if (imageInput.value === "") {
                   previewEl.style.backgroundImage = 'none';
              }
              else if (currentBgImage && !file) {
                   previewEl.style.backgroundImage = `url(${currentBgImage})`;
              }
          }

          previewEl.style.backgroundColor = currentBgColor;
          if (currentBgImage) previewEl.style.backgroundImage = `url(${currentBgImage})`;
          else previewEl.style.backgroundImage = 'none';
          colorInput.value = currentBgColor;

          colorInput.addEventListener('input', updatePreview);
          imageInput.addEventListener('change', (event) => {
              const file = event.target.files[0];
              if (file && file.size > 1 * 1024 * 1024) {
                  alert("Image is too large! Please select an image under 1MB.");
                  imageInput.value = "";
              }
              updatePreview();
          });
          clearImageBtn.addEventListener('click', () => {
              imageInput.value = "";
              updatePreview();
          });

          function applySettings() {
              const newBgColor = colorInput.value;
              desktopElement.style.backgroundColor = newBgColor;
              localStorage.setItem(DESKTOP_BACKGROUND_COLOR_KEY, newBgColor);
              currentBgColor = newBgColor;

              if (typeof window.updateThemeForDesktopBackground === 'function') {
                  window.updateThemeForDesktopBackground(newBgColor);
              }

              const file = imageInput.files[0];
              if (file && file.size <= 1 * 1024 * 1024) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                      currentBgImage = e.target.result;
                      desktopElement.style.backgroundImage = `url(${currentBgImage})`;
                      desktopElement.style.backgroundSize = 'cover';
                      desktopElement.style.backgroundPosition = 'center';
                      localStorage.setItem(DESKTOP_BACKGROUND_IMAGE_KEY, currentBgImage);
                  };
                  reader.readAsDataURL(file);
              } else if (imageInput.value === "" && previewEl.style.backgroundImage === 'none') {
                  currentBgImage = '';
                  desktopElement.style.backgroundImage = 'none';
                  localStorage.removeItem(DESKTOP_BACKGROUND_IMAGE_KEY);
              }
          }

          applyBtn.addEventListener('click', applySettings);
          okBtn.addEventListener('click', () => {
              applySettings();
              displayPropertiesDialog.remove();
              displayPropertiesDialog = null;
          });
          function closeDialogWithoutSaving() {
              displayPropertiesDialog.remove();
              displayPropertiesDialog = null;
          }
          cancelBtn.addEventListener('click', closeDialogWithoutSaving);
          closeBtn.addEventListener('click', closeDialogWithoutSaving);
          displayPropertiesDialog.querySelector('input, button')?.focus();
      }

      function loadDesktopPreferences() {
          currentBgColor = localStorage.getItem(DESKTOP_BACKGROUND_COLOR_KEY) || '#008080';
          currentBgImage = localStorage.getItem(DESKTOP_BACKGROUND_IMAGE_KEY) || '';
          desktopElement.style.backgroundColor = currentBgColor;
          if (currentBgImage) {
              desktopElement.style.backgroundImage = `url(${currentBgImage})`;
              desktopElement.style.backgroundSize = 'cover';
              desktopElement.style.backgroundPosition = 'center';
          } else {
              desktopElement.style.backgroundImage = 'none';
          }
          if (typeof window.updateThemeForDesktopBackground === 'function') {
              window.updateThemeForDesktopBackground(currentBgColor);
          }
      }

      function createContextMenu() {
          if (contextMenuElement && desktopElement.contains(contextMenuElement)) {
              contextMenuElement.remove();
          }
          contextMenuElement = document.createElement('div');
          contextMenuElement.className = 'desktop-context-menu';
          const menuItems = [
              { text: "<u>A</u>rrange Icons", action: arrangeIcons },
              { text: "<u>S</u>nap to Grid", action: () => {
                  if (window.Win9xDesktopUtils && typeof Win9xDesktopUtils.snapSelectedIconsToGrid === 'function') {
                      Win9xDesktopUtils.snapSelectedIconsToGrid();
                  } else { alert("Snap to Grid feature not available."); }
              }},
              { separator: true },
              { text: "<u>R</u>efresh", action: () => window.location.reload() },
              { separator: true },
              { text: "P<u>r</u>operties", action: openDisplayProperties },
          ];
          menuItems.forEach((itemDef, index) => {
              if (itemDef.separator && index > 0 && contextMenuElement.lastChild && !contextMenuElement.lastChild.classList.contains('desktop-context-menu-separator')) {
                  const sep = document.createElement('div'); sep.className = 'desktop-context-menu-separator'; contextMenuElement.appendChild(sep);
              }
              if (itemDef.text) {
                  const menuItem = document.createElement('div');
                  menuItem.className = 'desktop-context-menu-item';
                  menuItem.innerHTML = itemDef.text;
                  if (itemDef.disabled) menuItem.classList.add('disabled');
                  else {
                      menuItem.addEventListener('click', (e) => {
                          e.stopPropagation();
                          if (typeof itemDef.action === 'function') itemDef.action();
                          if (itemDef.action !== openDisplayProperties) hideContextMenu();
                      });
                  }
                  contextMenuElement.appendChild(menuItem);
              }
          });
          desktopElement.appendChild(contextMenuElement);
          hideContextMenu(); // Create hidden by default
      }

      function showContextMenu(event, targetIcon = null) {
          // If targetIcon is not specified (i.e., contextmenu on desktop background or long press on desktop):
          // then check if the event.target is on a window/dialog/menu itself and prevent if so.
          if (!targetIcon) {
              if (event.target.closest('.window:not(.desktop-icon .window)') || // General window (not an icon's pseudo-window)
                  event.target.closest('.display-properties-dialog') ||      // Display properties dialog
                  event.target.closest('.desktop-context-menu')) {          // The context menu itself
                  return; // Do not show menu on these elements if it's a general desktop context action
              }
          }
          // If targetIcon *is* specified, it means an icon handler explicitly called this,
          // so we assume it's valid to show the menu for that icon.

          event.preventDefault(); // Prevent native context menu
          event.stopPropagation(); // Stop event from bubbling further

          if (!contextMenuElement || !desktopElement.contains(contextMenuElement)) {
              createContextMenu();
          }

          if (targetIcon && targetIcon.classList.contains('desktop-icon')) {
              if (window.Win9xDesktopUtils && typeof Win9xDesktopUtils.clearSelection === 'function' && !event.ctrlKey && !event.metaKey) {
                  Win9xDesktopUtils.clearSelection();
              }
              targetIcon.classList.add('selected');
              if (window.Win9xDesktopUtils && window.Win9xDesktopUtils.selectedIcons) {
                   window.Win9xDesktopUtils.selectedIcons.add(targetIcon);
              }
          }

          const desktopRect = desktopElement.getBoundingClientRect();
          let x = event.clientX - desktopRect.left;
          let y = event.clientY - desktopRect.top;
          contextMenuElement.style.display = 'block';
          const menuRect = contextMenuElement.getBoundingClientRect();
          const padding = 5;
          if (x + menuRect.width + padding > desktopElement.clientWidth) x = desktopElement.clientWidth - menuRect.width - padding;
          if (y + menuRect.height + padding > desktopElement.clientHeight) y = desktopElement.clientHeight - menuRect.height - padding;
          x = Math.max(padding, x);
          y = Math.max(padding, y);
          contextMenuElement.style.left = `${x}px`;
          contextMenuElement.style.top = `${y}px`;
          contextMenuElement.style.zIndex = '20000';

          // These listeners are for hiding the menu if a click happens *outside*
          // The pointerdown at the end of the file handles general clicks outside.
          // The 'click' and 'contextmenu' listeners here are specific to *after* the menu is shown.
          setTimeout(() => {
              document.addEventListener('click', handleClickOutsideContextMenu, { once: true, capture: true });
              // Add contextmenu listener to prevent native menu if right-click happens while our menu is up
              document.addEventListener('contextmenu', handleRightClickOutsideContextMenu, { once: true, capture: true });
          }, 0);
      }

      function hideContextMenu() {
          if (contextMenuElement) contextMenuElement.style.display = 'none';
          // Clean up listeners added by showContextMenu
          document.removeEventListener('click', handleClickOutsideContextMenu, { capture: true });
          document.removeEventListener('contextmenu', handleRightClickOutsideContextMenu, { capture: true });
      }

      function handleClickOutsideContextMenu(event) {
          if (contextMenuElement && contextMenuElement.style.display === 'block') {
              if (!contextMenuElement.contains(event.target)) {
                  hideContextMenu();
              } else { // Click was inside the menu, re-arm listeners
                  document.addEventListener('click', handleClickOutsideContextMenu, { once: true, capture: true });
                  document.addEventListener('contextmenu', handleRightClickOutsideContextMenu, { once: true, capture: true });
              }
          }
      }

      function handleRightClickOutsideContextMenu(event) {
           if (contextMenuElement && contextMenuElement.style.display === 'block') {
              if (!contextMenuElement.contains(event.target)) { // Click outside
                  hideContextMenu();
                  // Potentially show a new context menu at the new location if it's on the desktop
                  // but the main 'contextmenu' listener on desktopElement should handle this.
              } else { // Click inside our menu
                  event.preventDefault(); // Prevent native context menu if right-clicking inside our custom menu
              }
          }
      }

      function arrangeIcons() {
          try { localStorage.removeItem(DESKTOP_ICON_POSITIONS_KEY); }
          catch (e) { console.error("Error clearing icon positions:", e); }

          const allIconsOnDesktop = Array.from(desktopElement.querySelectorAll('.desktop-icon'));
          allIconsOnDesktop.forEach(icon => {
              icon.style.position = ''; icon.style.left = ''; icon.style.top = '';
              icon.style.margin = '';
              icon.classList.remove('is-positioned', 'selected');
          });
          if (window.Win9xDesktopUtils && typeof Win9xDesktopUtils.clearSelection === 'function') {
              Win9xDesktopUtils.clearSelection();
          }
          if (window.Win9xDesktopUtils && typeof Win9xDesktopUtils.forceRelayoutAllIcons === 'function') {
              Win9xDesktopUtils.forceRelayoutAllIcons();
          } else {
              console.warn("forceRelayoutAllIcons not found. Icons may not reposition correctly after Arrange.");
          }
          hideContextMenu();
      }

      // --- Long-press Helper Functions ---
      function handleDesktopPointerDownForLongPress(e) {
          // Only for primary button (touch, or left mouse button if testing)
          if (e.pointerType === 'mouse' && e.button !== 0) return;

          // IMPORTANT: Do NOT trigger desktop long-press if the target is an icon,
          // a window, a dialog, or the context menu itself.
          // Icon long-press should be handled by the icon's own event listeners,
          // which would then call `DesktopContextMenu.show(e, iconElement)`.
          if (e.target.closest('.desktop-icon') ||
              e.target.closest('.window:not(.desktop-icon .window)') || // General window
              e.target.closest('.display-properties-dialog') ||
              e.target.closest('.desktop-context-menu')) {
              clearLongPressTimer(); // Just in case
              return;
          }

          pointerDownClientX = e.clientX;
          pointerDownClientY = e.clientY;

          if (longPressTimer) clearTimeout(longPressTimer); // Clear any existing timer

          longPressTimer = setTimeout(() => {
              longPressTimer = null; // Clear the timer ID

              // If a context menu (ours) is already visible, do nothing.
              // This can happen if a 'contextmenu' event fired very quickly after pointerdown.
              if (DesktopContextMenu.isVisible()) return;

              // e.preventDefault(); // Already called in showContextMenu.
              // Calling it here too early might interfere with other pointerdown logic if not careful.
              // showContextMenu will call it.

              showContextMenu(e); // Pass the original pointerdown event.
                                  // targetIcon will be null, which is correct for desktop background.
          }, LONG_PRESS_DURATION);
      }

      function clearLongPressTimer() {
          if (longPressTimer) {
              clearTimeout(longPressTimer);
              longPressTimer = null;
          }
      }

      function handleDesktopPointerMoveForLongPress(e) {
          if (longPressTimer) { // Only if a long press is pending
              const deltaX = Math.abs(e.clientX - pointerDownClientX);
              const deltaY = Math.abs(e.clientY - pointerDownClientY);
              if (deltaX > MAX_MOVE_THRESHOLD || deltaY > MAX_MOVE_THRESHOLD) {
                  clearLongPressTimer(); // Moved too much, cancel long press
              }
          }
      }
      // --- End Long-press Helper Functions ---


      function initDesktopContextMenu() {
          desktopElement = document.getElementById('desktop');
          if (!desktopElement) { console.error('ContextMenu: Desktop element not found.'); return; }

          loadDesktopPreferences();
          createContextMenu(); // Create the menu structure once, keep it hidden

          // For desktop browsers (right-click)
          desktopElement.addEventListener('contextmenu', (e) => {
              // If a long-press timer is active (meaning pointerdown happened but timer hasn't fired),
              // and a contextmenu event fires (e.g. quick right-click), cancel the long-press.
              if (longPressTimer) {
                  clearLongPressTimer();
              }

              // If the target of the right-click is an icon, do nothing here.
              // The icon itself should have a contextmenu listener that calls
              // window.DesktopContextMenu.show(e, iconElement).
              if (e.target.closest('.desktop-icon')) {
                  // e.preventDefault(); // Optional: if icon handler doesn't, this would stop native menu on icon.
                                     // But ideally, icon handler manages its own event.
                  return;
              }

              // If our custom menu is already visible (e.g., from a long press that also triggered contextmenu)
              // or if clicking on elements that shouldn't get a desktop background menu.
              if (DesktopContextMenu.isVisible() ||
                  e.target.closest('.window:not(.desktop-icon .window)') ||
                  e.target.closest('.display-properties-dialog') ||
                  e.target.closest('.desktop-context-menu')) {
                  e.preventDefault(); // Prevent native menu if ours is up or on disallowed element
                  return;
              }
              showContextMenu(e); // targetIcon will be null.
          });

          // For mobile long-press (and potentially mouse long-press if desired) on the desktop background
          desktopElement.addEventListener('pointerdown', handleDesktopPointerDownForLongPress);
          desktopElement.addEventListener('pointermove', handleDesktopPointerMoveForLongPress);
          // Use document for pointerup/leave to catch cases where pointer is released outside desktopElement
          // or finger leaves the screen.
          document.addEventListener('pointerup', clearLongPressTimer);
          document.addEventListener('pointerleave', clearLongPressTimer); // Catches mouse leaving window


          document.addEventListener('keydown', (event) => {
              if (event.key === 'Escape') {
                  if (contextMenuElement && contextMenuElement.style.display === 'block') {
                      hideContextMenu();
                  } else if (displayPropertiesDialog && desktopElement.contains(displayPropertiesDialog)) {
                      const closeBtn = displayPropertiesDialog.querySelector('.dialog-close-btn');
                      if (closeBtn) closeBtn.click();
                      else { displayPropertiesDialog.remove(); displayPropertiesDialog = null; }
                  }
              }
          });
      }

      // Expose functions for long-press on icons (from other modules) and other interactions
      if (!window.DesktopContextMenu) window.DesktopContextMenu = {};
      window.DesktopContextMenu.show = showContextMenu;
      window.DesktopContextMenu.hide = hideContextMenu;
      window.DesktopContextMenu.isVisible = () => contextMenuElement && contextMenuElement.style.display === 'block';

      if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initDesktopContextMenu);
      } else {
          initDesktopContextMenu();
      }

      // General listener to hide menu on any pointerdown outside the menu.
      // This needs to be distinct from handleClickOutsideContextMenu which is for 'click' events.
      document.addEventListener('pointerdown', (e) => {
        // Check if menu exists, is visible, and the click is NOT on the menu itself
        if (contextMenuElement &&
            contextMenuElement.style.display === 'block' &&
            !e.target.closest('.desktop-context-menu')) {
          // Use a small timeout to allow any click action on a menu item to process first
          // before hideContextMenu potentially removes listeners or the item itself.
          setTimeout(hideContextMenu, 50);
        }
      }, { capture: true }); // Use capture to catch the event early

  })(window);
