  // desktop-context-menu.js
  (function(window) {
      'use strict';

      const DESKTOP_ICON_POSITIONS_KEY = 'desktopIconPositions_win9x_style_v2'; // Consistent key
      const DESKTOP_BACKGROUND_COLOR_KEY = 'desktopBgColor_win9x';
      const DESKTOP_BACKGROUND_IMAGE_KEY = 'desktopBgImage_win9x';

      let desktopElement;
      let contextMenuElement = null;
      // allDesktopIcons is not strictly needed here anymore as arrangeIcons calls desktop-icons.js
      let displayPropertiesDialog = null;
      let currentBgColor = '#008080';
      let currentBgImage = '';

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
              displayPropertiesDialog.querySelector('input, button')?.focus(); // Focus first focusable
              return;
          }
          displayPropertiesDialog = document.createElement('div');
          displayPropertiesDialog.className = 'display-properties-dialog'; // Style this class in desktop-context-menu.css
          const initialLeft = Math.max(0, (desktopElement.clientWidth - 380) / 2); // Adjusted width
          const initialTop = Math.max(0, (desktopElement.clientHeight - 320) / 3); // Adjusted height
          displayPropertiesDialog.style.left = `${initialLeft}px`;
          displayPropertiesDialog.style.top = `${initialTop}px`;
          displayPropertiesDialog.style.zIndex = '15001';
          displayPropertiesDialog.innerHTML = `
              <div class="display-properties-dialog-titlebar">
                  <span class="display-properties-dialog-title">Display Properties</span>
                  <div class="display-properties-dialog-controls">
                      <button class="dialog-close-btn" title="Close">r</button> <!-- Marlett 'r' -->
                  </div>
              </div>
              <div class="display-properties-dialog-content">
                  <div class="display-properties-tabs">
                      <div class="display-properties-tab active" data-tab="background">Background</div>
                      <!-- Add other tabs here if needed -->
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

          // Ensure close button uses Marlett if available
          if (closeBtn.style.fontFamily.toLowerCase().includes('marlett')) {
              closeBtn.style.fontSize = '10px'; // Adjust for Marlett
          }


          function updatePreview() {
              previewEl.style.backgroundColor = colorInput.value;
              const file = imageInput.files[0];
              if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => { previewEl.style.backgroundImage = `url(${e.target.result})`; };
                  reader.readAsDataURL(file);
              } else if (imageInput.value === "") { // Only clear if explicitly cleared
                   previewEl.style.backgroundImage = 'none';
              }
              // If there's a currentBgImage and no new file selected, keep showing currentBgImage in preview
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
              imageInput.value = ""; // Clear the file input
              // currentBgImage = ''; // Don't clear currentBgImage yet, only on Apply/OK
              updatePreview(); // This will set backgroundImage to 'none' in preview
          });

          function applySettings() {
              const newBgColor = colorInput.value;
              desktopElement.style.backgroundColor = newBgColor;
              localStorage.setItem(DESKTOP_BACKGROUND_COLOR_KEY, newBgColor);
              currentBgColor = newBgColor; // Update module's current color

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
                  // This condition means "Remove Image" was clicked and preview reflects it
                  currentBgImage = '';
                  desktopElement.style.backgroundImage = 'none';
                  localStorage.removeItem(DESKTOP_BACKGROUND_IMAGE_KEY);
              }
              // If no new file and imageInput.value is not empty, it means an old file path might be there
              // but we don't re-apply it unless a new file is chosen or explicitly cleared.
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
          // Initial theme update after loading preferences
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
          hideContextMenu();
      }

      function showContextMenu(event, targetIcon = null) { // targetIcon for long press
          // Prevent menu on windows or dialogs, unless it's an icon within the desktop
          if (event.target.closest('.window:not(.desktop-icon .window)') || event.target.closest('.display-properties-dialog')) {
               // Check if it's an icon that was the target of a long press
              if (!targetIcon || (targetIcon && !targetIcon.classList.contains('desktop-icon'))) {
                  return;
              }
          }

          event.preventDefault();
          event.stopPropagation();
          if (!contextMenuElement || !desktopElement.contains(contextMenuElement)) createContextMenu();

          // If an icon was specifically targeted (e.g., by long press), ensure it's selected
          if (targetIcon && targetIcon.classList.contains('desktop-icon')) {
              if (window.Win9xDesktopUtils && typeof Win9xDesktopUtils.clearSelection === 'function' && !event.ctrlKey) {
                  Win9xDesktopUtils.clearSelection(); // Clear others if not ctrl-long-press
              }
              // Select the target icon (desktop-icons.js handles actual selection effect)
              targetIcon.classList.add('selected');
              if (window.Win9xDesktopUtils && window.Win9xDesktopUtils.selectedIcons) {
                   window.Win9xDesktopUtils.selectedIcons.add(targetIcon); // Keep internal set consistent
              }
          }


          const desktopRect = desktopElement.getBoundingClientRect();
          let x = event.clientX - desktopRect.left, y = event.clientY - desktopRect.top;
          contextMenuElement.style.display = 'block';
          const menuRect = contextMenuElement.getBoundingClientRect();
          const padding = 5;
          if (x + menuRect.width + padding > desktopElement.clientWidth) x = desktopElement.clientWidth - menuRect.width - padding;
          if (y + menuRect.height + padding > desktopElement.clientHeight) y = desktopElement.clientHeight - menuRect.height - padding;
          x = Math.max(padding, x); y = Math.max(padding, y);
          contextMenuElement.style.left = `${x}px`; contextMenuElement.style.top = `${y}px`;
          contextMenuElement.style.zIndex = '20000';
          setTimeout(() => {
              document.addEventListener('click', handleClickOutsideContextMenu, { once: true, capture: true });
              document.addEventListener('contextmenu', handleRightClickOutsideContextMenu, { once: true, capture: true });
          }, 0);
      }

      function hideContextMenu() {
          if (contextMenuElement) contextMenuElement.style.display = 'none';
      }

      function handleClickOutsideContextMenu(event) {
          if (contextMenuElement && contextMenuElement.style.display === 'block') {
              if (!contextMenuElement.contains(event.target)) hideContextMenu();
              else { // Click was inside, re-arm listeners
                  setTimeout(() => {
                      document.addEventListener('click', handleClickOutsideContextMenu, { once: true, capture: true });
                      document.addEventListener('contextmenu', handleRightClickOutsideContextMenu, { once: true, capture: true });
                  }, 0);
              }
          }
      }
      function handleRightClickOutsideContextMenu(event) {
           if (contextMenuElement && contextMenuElement.style.display === 'block') {
              if (!contextMenuElement.contains(event.target)) hideContextMenu(); // Hide if outside
              else event.preventDefault(); // Prevent native if inside our menu
              // Re-arm listeners is handled by showContextMenu if another menu is shown
          }
      }

      function arrangeIcons() {
          try { localStorage.removeItem(DESKTOP_ICON_POSITIONS_KEY); }
          catch (e) { console.error("Error clearing icon positions:", e); }

          const allIconsOnDesktop = Array.from(desktopElement.querySelectorAll('.desktop-icon'));
          allIconsOnDesktop.forEach(icon => {
              icon.style.position = ''; icon.style.left = ''; icon.style.top = '';
              icon.style.margin = ''; // Default margin from CSS will apply if any
              icon.classList.remove('is-positioned', 'selected');
          });
          if (window.Win9xDesktopUtils && typeof Win9xDesktopUtils.clearSelection === 'function') {
              Win9xDesktopUtils.clearSelection(); // Clear selection state in desktop-icons.js
          }
          if (window.Win9xDesktopUtils && typeof Win9xDesktopUtils.forceRelayoutAllIcons === 'function') {
              Win9xDesktopUtils.forceRelayoutAllIcons();
          } else {
              console.warn("forceRelayoutAllIcons not found. Icons may not reposition correctly after Arrange.");
              // As a crude fallback, reload, but this is not ideal.
              // window.location.reload();
          }
          hideContextMenu();
      }

      function initDesktopContextMenu() {
          desktopElement = document.getElementById('desktop');
          if (!desktopElement) { console.error('ContextMenu: Desktop element not found.'); return; }
          loadDesktopPreferences();
          desktopElement.addEventListener('contextmenu', showContextMenu);
          document.addEventListener('keydown', (event) => {
              if (event.key === 'Escape') {
                  if (contextMenuElement && contextMenuElement.style.display === 'block') hideContextMenu();
                  else if (displayPropertiesDialog && desktopElement.contains(displayPropertiesDialog)) {
                      const closeBtn = displayPropertiesDialog.querySelector('.dialog-close-btn');
                      if (closeBtn) closeBtn.click();
                      else { displayPropertiesDialog.remove(); displayPropertiesDialog = null; }
                  }
              }
          });
      }

      // Expose functions for long-press and other modules
      if (!window.DesktopContextMenu) window.DesktopContextMenu = {};
      window.DesktopContextMenu.show = showContextMenu;
      window.DesktopContextMenu.hide = hideContextMenu;
      window.DesktopContextMenu.isVisible = () => contextMenuElement && contextMenuElement.style.display === 'block';


      if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initDesktopContextMenu);
      } else {
          initDesktopContextMenu();
      }
      // Listener to hide menu on any pointerdown outside, slightly delayed
      document.addEventListener('pointerdown', e => {
        if (contextMenuElement && contextMenuElement.style.display === 'block' && !e.target.closest('.desktop-context-menu')) {
          setTimeout(hideContextMenu, 50); // Short delay to allow menu item click to process
        }
      }, {capture:true});

  })(window);
