  'use strict';

  const RECYCLE_BIN_ITEMS_KEY = 'recycleBinItems_win9x';

  const G_recycleBinActiveMenu = { button: null, dropdown: null, outsideClickListener: null };

  const recycleBinAppDefinition = {
      appId: 'recycleBin',
      title: "Recycle Bin",
      icon: "./recycle_bin_empty-0.png",
      iconFull: "./recycle_bin_full_cool-0.png",
      defaultWidth: 550,
      defaultHeight: 400,
      menuBar: [
          {
              name: "File",
              items: [
                  { name: "Restore", action: "restoreSelectedItem", disabled: true, shortcut: "" },
                  { separator: true },
                  { name: "Empty Recycle Bin", action: "emptyRecycleBin", disabled: true, shortcut: "" },
                  { separator: true },
                  { name: "Close", action: "closeWindow", disabled: false, shortcut: "" }
              ]
          },
          {
              name: "Edit",
              disabled: true,
              items: [
                  { name: "Undo", action: "undo", disabled: true, shortcut: "Ctrl+Z" },
                  { separator: true },
                  { name: "Cut", action: "cut", disabled: true, shortcut: "Ctrl+X" },
                  { name: "Copy", action: "copy", disabled: true, shortcut: "Ctrl+C" },
                  { name: "Paste", action: "paste", disabled: true, shortcut: "Ctrl+V" },
                  { separator: true },
                  { name: "Select All", action: "selectAllItems", disabled: true, shortcut: "Ctrl+A" },
                  { name: "Invert Selection", action: "invertSelection", disabled: true, shortcut: "" }
              ]
          },
          {
              name: "View",
              disabled: true,
              items: [
                  { name: "Toolbar", action: "toggleToolbar", checked: true, disabled: true },
                  { name: "Status Bar", action: "toggleStatusBar", checked: true, disabled: true },
                  { separator: true },
                  { name: "Large Icons", type: "radio", group: "viewMode", action: "viewLargeIcons", checked: false, disabled: true },
                  { name: "Small Icons", type: "radio", group: "viewMode", action: "viewSmallIcons", checked: false, disabled: true },
                  { name: "List", type: "radio", group: "viewMode", action: "viewList", checked: false, disabled: true },
                  { name: "Details", type: "radio", group: "viewMode", action: "viewDetails", checked: true, disabled: false },
                  { separator: true },
                  { name: "Arrange Icons", disabled: true, subMenu: [ /* Placeholder */ ]},
                  { name: "Line up Icons", action: "lineUpIcons", disabled: true },
                  { separator: true },
                  { name: "Refresh", action: "refreshView", disabled: false },
                  { name: "Options...", action: "viewOptions", disabled: true }
              ]
          },
          {
              name: "Help",
              disabled: true,
              items: [
                  { name: "Help Topics", action: "helpTopics", disabled: true },
                  { separator: true },
                  { name: "About Recycle Bin", action: "aboutRecycleBin", disabled: true }
              ]
          }
      ],
      generateContent: (windowInstanceId) => {
          const displayableItems = getRecycledItems().filter(item => !item.isPermanentlyDeleted);
          let selectedItemId = recycleBinInstances[windowInstanceId]?.selectedItemId;

          if (selectedItemId && !displayableItems.find(item => item.id === selectedItemId)) {
              selectedItemId = null;
              if (recycleBinInstances[windowInstanceId]) {
                   recycleBinInstances[windowInstanceId].selectedItemId = null;
              }
          }

          let listHTML = `
              <div class="recycle-bin-header" style="display: flex; border-bottom: 1px solid #808080; background-color: #c0c0c0; font-weight: normal; flex-shrink: 0;">
                  <div style="width: 60%; padding: 2px 5px; border-right: 1px solid #808080; box-shadow: 1px 0 0 #fff inset; text-align:left;">Name</div>
                  <div style="width: 40%; padding: 2px 5px; text-align:left;">Date Deleted</div>
              </div>
              <div class="recycle-bin-list" style="flex-grow: 1; overflow-y: auto; background-color: white;">`;

          if (displayableItems.length === 0) {
              listHTML += `<div style="padding: 20px; text-align: center; color: #555;">Recycle Bin is empty.</div>`;
          } else {
              displayableItems.forEach(item => {
                  const isSelected = item.id === selectedItemId;
                  listHTML += `
                      <div class="recycled-item ${isSelected ? 'selected' : ''}" data-item-id="${item.id}"
                           style="display: flex; padding: 3px 5px; border-bottom: 1px solid #f0f0f0; cursor: default; user-select:none; background-color: ${isSelected ? 'var(--theme-color-active-titlebar, #000080)' : 'white'}; color: ${isSelected ? 'white' : 'black'};">
                          <div style="width: 60%; display: flex; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                              <img src="${item.iconSrc || './dialog_question-0.png'}" style="width:16px; height:16px; margin-right: 5px;" alt="">
                              ${escapeHTML(item.name)}
                          </div>
                          <div style="width: 40%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                              ${item.dateDeleted ? new Date(item.dateDeleted).toLocaleString() : 'Unknown'}
                          </div>
                      </div>`;
              });
          }
          listHTML += `</div>`;

          const totalSizeOfDisplayable = displayableItems.reduce((acc, item) => acc + (item.size || 0), 0);
          const sizeStr = totalSizeOfDisplayable > 1024 ? (totalSizeOfDisplayable/1024).toFixed(1) + ' KB' : totalSizeOfDisplayable + ' bytes';
          const selectedItemCount = selectedItemId ? 1 : 0;
          const statusText = displayableItems.length > 0
              ? `${displayableItems.length} object(s)` + (selectedItemCount > 0 ? ` | ${selectedItemCount} object(s) selected` : '')
              : '0 object(s)';

          const statusBarHTML = `
              <div class="recycle-bin-statusbar" style="border-top: 1px solid #808080; padding: 2px 5px; font-size: 11px; background-color: #c0c0c0; display:flex; justify-content:space-between; flex-shrink:0;">
                  <span>${statusText}</span>
                  <span>${displayableItems.length > 0 ? sizeStr : ''}</span>
              </div>`;

          return `<div class="recycle-bin-main-content" style="display: flex; flex-direction: column; height: 100%;">
                      ${listHTML}
                      ${statusBarHTML}
                  </div>`;
      },
      initApp: (windowEl, windowInstanceId, webviewId, appDef) => {
          const menuBarEl = createLocalMenuBar(appDef, windowEl, windowInstanceId);
          if (menuBarEl) {
              const contentArea = windowEl.querySelector('.window-content');
              contentArea.style.display = 'flex';
              contentArea.style.flexDirection = 'column';
              contentArea.style.padding = '0';

              const mainContentContainer = contentArea.querySelector('.recycle-bin-main-content');
              if (mainContentContainer) {
                   contentArea.insertBefore(menuBarEl, mainContentContainer);
              } else {
                   contentArea.prepend(menuBarEl);
              }
          }

          recycleBinInstances[windowInstanceId] = {
              windowEl: windowEl,
              selectedItemId: null,
              appDef: appDef,
              menuBarElement: menuBarEl
          };

          attachRecycleBinEventListeners(windowEl, windowInstanceId);
          updateRecycleBinIconState(); // Initial icon state for the bin
          updateLocalMenuState(windowInstanceId);
      },
      onAppDestroy: (windowInstanceId) => {
          if (G_recycleBinActiveMenu.dropdown && recycleBinInstances[windowInstanceId]?.menuBarElement?.contains(G_recycleBinActiveMenu.button)) {
              closeLocalActiveMenu(null, null, G_recycleBinActiveMenu);
          }
          delete recycleBinInstances[windowInstanceId];
      },
      api: {
          addItem,
          getDesktopIconElement,
          getRecycledItemIds,
          updateIconState: updateRecycleBinIconState, // Expose to be callable externally if needed, though saveRecycledItems handles it
          restoreItem,
          emptyRecycleBin: empty
      }
  };

  let recycleBinInstances = {};

  function escapeHTML(str) {
      if (str === null || str === undefined) return '';
      // Adjusted to match your original: '&' should be '&'
      return String(str).replace(/[&<>"']/g, function (match) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[match];
      });
  }

  function getRecycledItems() {
      try {
          const stored = localStorage.getItem(RECYCLE_BIN_ITEMS_KEY);
          if (stored === null) return [];
          if (stored === "[]" || stored === "") return [];
          const parsed = JSON.parse(stored);
          return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
          console.error("RecycleBin: Error getting/parsing recycled items:", e, "Raw value was:", localStorage.getItem(RECYCLE_BIN_ITEMS_KEY));
          localStorage.removeItem(RECYCLE_BIN_ITEMS_KEY); // Clear corrupted data
          return [];
      }
  }

  function getRecycledItemIds() {
      return getRecycledItems().map(item => item.id);
  }

  function saveRecycledItems(items) {
      try {
          localStorage.setItem(RECYCLE_BIN_ITEMS_KEY, JSON.stringify(items));
          updateRecycleBinIconState(); // Update desktop icon (full/empty) - NOW MORE ROBUST
          // Also, tell desktop icons module to refresh its state because recycled items changed
          if (window.Win9xDesktopUtils && typeof window.Win9xDesktopUtils.refreshIconStateAndListeners === 'function') {
            window.Win9xDesktopUtils.refreshIconStateAndListeners();
          }
          // --- START: NEW - UPDATE START MENU STATE ---
          if (window.Win9xSystem && typeof window.Win9xSystem.updateStartMenuItemsState === 'function') {
              window.Win9xSystem.updateStartMenuItemsState();
          }
          // --- END: NEW - UPDATE START MENU STATE ---
      } catch (e) {
          console.error("RecycleBin: Error saving recycled items:", e);
      }
  }

  function addItem(itemData) { // Called when an item is "deleted" to the recycle bin
      const items = getRecycledItems();
      const existingItemIndex = items.findIndex(i => i.id === itemData.id);

      if (existingItemIndex === -1) {
          items.push({
              id: itemData.id,
              name: itemData.name,
              iconSrc: itemData.iconSrc,
              originalAppId: itemData.originalAppId, // This is key for restoring apps
              dateDeleted: new Date().toISOString(),
              size: itemData.size || Math.floor(Math.random() * 1000) + 50,
              isPermanentlyDeleted: false
          });
      } else { // Item was already in bin (e.g. restored then re-deleted), update its state
          items[existingItemIndex].isPermanentlyDeleted = false;
          items[existingItemIndex].permanentlyDeletedDate = null;
          items[existingItemIndex].dateDeleted = new Date().toISOString(); // Update deletion date
          items[existingItemIndex].name = itemData.name || items[existingItemIndex].name;
          items[existingItemIndex].iconSrc = itemData.iconSrc || items[existingItemIndex].iconSrc;
      }
      saveRecycledItems(items); // This will trigger desktop refresh via its internal call
  }

  function empty() { // Empty Recycle Bin action
      const items = getRecycledItems();
      let changed = false;
      items.forEach(item => {
          if (!item.isPermanentlyDeleted) {
              item.isPermanentlyDeleted = true;
              item.permanentlyDeletedDate = new Date().toISOString();
              changed = true;
          }
      });

      if (changed) {
          saveRecycledItems(items); // This will trigger desktop refresh
      }

      // Refresh UI of any open recycle bin windows
      Object.keys(recycleBinInstances).forEach(instanceId => {
          if (recycleBinInstances[instanceId]) {
              recycleBinInstances[instanceId].selectedItemId = null;
              refreshWindowContent(instanceId); // This updates the content of the Recycle Bin window
          }
      });
  }

  function restoreItem(itemIdToRestore, windowInstanceIdToUpdate) {
      let items = getRecycledItems();
      const itemToRestore = items.find(item => item.id === itemIdToRestore);

      if (itemToRestore) {
          // Remove from recycled items list
          items = items.filter(item => item.id !== itemIdToRestore);
          // Save changes. This call is crucial as it also triggers Win9xDesktopUtils.refreshIconStateAndListeners()
          saveRecycledItems(items);

          // After saveRecycledItems has updated the desktop state (making the icon potentially visible again)
          // we can try to select it.
          if (window.Win9xDesktopUtils &&
              typeof window.Win9xDesktopUtils.getDesktopIconByAppId === 'function' &&
              typeof window.Win9xDesktopUtils.selectIcon === 'function') {

              // originalAppId should be the desktop icon's data-app-id
              const desktopIconEl = window.Win9xDesktopUtils.getDesktopIconByAppId(itemToRestore.originalAppId);
              if (desktopIconEl) {
                  // The icon should now be visible and interactive due to refreshIconStateAndListeners
                  // Now, select it.
                  if (window.Win9xDesktopUtils.clearSelection) window.Win9xDesktopUtils.clearSelection();
                  window.Win9xDesktopUtils.selectIcon(desktopIconEl);
                  // Optional: Scroll into view if needed
                  // desktopIconEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
          }

          // Refresh the current Recycle Bin window UI
          if (windowInstanceIdToUpdate && recycleBinInstances[windowInstanceIdToUpdate]) {
              recycleBinInstances[windowInstanceIdToUpdate].selectedItemId = null;
              refreshWindowContent(windowInstanceIdToUpdate);
          } else { // Or all open recycle bin windows if specific one not provided
              Object.keys(recycleBinInstances).forEach(id => {
                  if (recycleBinInstances[id]) {
                      recycleBinInstances[id].selectedItemId = null;
                      refreshWindowContent(id);
                  }
              });
          }
      }
  }

  function updateRecycleBinIconState() {
      const displayableItems = getRecycledItems().filter(item => !item.isPermanentlyDeleted);
      const recycleBinDesktopIcon = getDesktopIconElement(); // The main div.desktop-icon for the bin

      if (recycleBinDesktopIcon) {
          const recycleBinDesktopIconImg = recycleBinDesktopIcon.querySelector('img');
          if (recycleBinDesktopIconImg) {
              const newSrc = displayableItems.length > 0 ? recycleBinAppDefinition.iconFull : recycleBinAppDefinition.icon;

              const currentActualBaseSrc = recycleBinDesktopIconImg.dataset.originalSrc || recycleBinDesktopIconImg.src;

              if (currentActualBaseSrc !== newSrc || recycleBinDesktopIconImg.src !== newSrc) {
                  if (window.IconSelectionEffect && recycleBinDesktopIconImg.dataset.originalSrc) {
                      // Temporarily remove the selection effect to get to the true base src
                      // Note: Your IconSelectionEffect.removeSelectionEffect doesn't clear dataset.originalSrc itself
                      // it just sets img.src = dataset.originalSrc.
                      window.IconSelectionEffect.removeSelectionEffect(recycleBinDesktopIconImg);
                  }

                  // Now, set the img.src to the new required base state (full or empty).
                  recycleBinDesktopIconImg.src = newSrc;

                  // Crucially, clear dataset.originalSrc.
                  // This ensures that if IconSelectionEffect.applySelectionEffect is called next,
                  // it uses the 'newSrc' as the base to store in dataset.originalSrc.
                  // And if removeSelectionEffect is called when dataset.originalSrc is undefined,
                  // it correctly uses the current img.src (which is newSrc) as the original.
                  delete recycleBinDesktopIconImg.dataset.originalSrc;
              }
          }
      }
  }

  function getDesktopIconElement() { // Gets the Recycle Bin's own desktop icon
      return document.querySelector(`.desktop-icon[data-app-id="${recycleBinAppDefinition.appId}"]`);
  }

  function refreshWindowContent(instanceId) { // Refreshes the content of an open Recycle Bin window
      const instance = recycleBinInstances[instanceId];
      if (instance && instance.windowEl) {
          const mainContentArea = instance.windowEl.querySelector('.recycle-bin-main-content');
          if (mainContentArea) {
              const newContentHTML = recycleBinAppDefinition.generateContent(instanceId);
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = newContentHTML;
              const newListAndStatus = tempDiv.querySelector('.recycle-bin-main-content').innerHTML;
              mainContentArea.innerHTML = newListAndStatus;

              attachRecycleBinEventListeners(instance.windowEl, instanceId);
              updateLocalMenuState(instanceId);
          }
      }
  }

  function updateLocalMenuState(windowInstanceId) {
      const instance = recycleBinInstances[windowInstanceId];
      if (!instance || !instance.menuBarElement) return;

      const displayableItems = getRecycledItems().filter(item => !item.isPermanentlyDeleted);
      const canRestore = !!instance.selectedItemId && displayableItems.some(item => item.id === instance.selectedItemId);
      const canEmpty = displayableItems.length > 0;
      const canSelectAll = displayableItems.length > 0;

      instance.appDef.menuBar.forEach(menu => {
          const menuButton = instance.menuBarElement.querySelector(`.menu-bar-button[data-menu-name="${escapeAttribute(menu.name)}"]`);
          if (menuButton) {
              if (menu.disabled) {
                  menuButton.style.color = '#808080';
                  menuButton.style.pointerEvents = 'none';
              } else {
                  menuButton.style.color = 'black';
                  menuButton.style.pointerEvents = 'auto';
              }
          }
          menu.items.forEach(item => {
              if (item.action === "restoreSelectedItem") item.disabled = !canRestore;
              if (item.action === "emptyRecycleBin") item.disabled = !canEmpty;
              if (item.action === "selectAllItems") item.disabled = !canSelectAll;
          });
      });
  }

  function escapeAttribute(value) {
      if (!value) return '';
      return value.replace(/([!"#$%&'()*+,./:;<=>?@[\]^`{|}~])/g, '\\$1');
  }

  function attachRecycleBinEventListeners(windowEl, instanceId) {
      const listContainer = windowEl.querySelector('.recycle-bin-list');
      if (listContainer) {
          listContainer.addEventListener('click', (event) => {
              const targetItemEl = event.target.closest('.recycled-item');
              const instance = recycleBinInstances[instanceId];
              if (!instance) return;

              if (targetItemEl) {
                  const itemId = targetItemEl.dataset.itemId;

                  listContainer.querySelectorAll('.recycled-item.selected').forEach(sel => {
                      sel.classList.remove('selected');
                      sel.style.backgroundColor = 'white';
                      sel.style.color = 'black';
                  });

                  const displayableItems = getRecycledItems().filter(i => !i.isPermanentlyDeleted);
                  if (!displayableItems.find(i => i.id === itemId)) {
                      instance.selectedItemId = null;
                  } else if (instance.selectedItemId === itemId && !event.ctrlKey) {
                      instance.selectedItemId = null;
                  } else {
                      instance.selectedItemId = itemId;
                      targetItemEl.classList.add('selected');
                      targetItemEl.style.backgroundColor = 'var(--theme-color-active-titlebar, #000080)';
                      targetItemEl.style.color = 'white';
                  }
                  updateLocalMenuState(instanceId);
                  refreshWindowContent(instanceId);
              } else {
                if (instance.selectedItemId && !event.ctrlKey) {
                    instance.selectedItemId = null;
                    updateLocalMenuState(instanceId);
                    refreshWindowContent(instanceId);
                }
              }
          });
      }
  }

  function handleLocalMenuAction(actionName, windowEl, instanceId) {
      const instance = recycleBinInstances[instanceId];
      if (!instance) return;
      switch (actionName) {
          case "emptyRecycleBin":
              if (getRecycledItems().filter(item => !item.isPermanentlyDeleted).length > 0) {
                  empty();
              }
              break;
          case "restoreSelectedItem":
              if (instance.selectedItemId) {
                  restoreItem(instance.selectedItemId, instanceId);
              }
              break;
          case "closeWindow":
              windowEl.querySelector('.window-close-btn')?.click();
              break;
          case "selectAllItems":
              console.log("Select All Items action triggered for Recycle Bin (view)");
              const displayItems = getRecycledItems().filter(i => !i.isPermanentlyDeleted);
              if (displayItems.length > 0 && !instance.selectedItemId && displayItems[0]) {
                  instance.selectedItemId = displayItems[0].id;
                  refreshWindowContent(instanceId);
                  updateLocalMenuState(instanceId);
              }
              break;
          case "refreshView":
              refreshWindowContent(instanceId);
              break;
          default:
              console.log(`Recycle Bin action: ${actionName} not yet implemented.`);
      }
  }

  function createLocalMenuBar(appDef, windowEl, windowInstanceId) {
      if (!appDef.menuBar) return null;
      const menuBarContainer = document.createElement('div');
      menuBarContainer.className = 'window-menu-bar';
      menuBarContainer.style.backgroundColor = '#c0c0c0';
      menuBarContainer.style.padding = '1px 2px';
      menuBarContainer.style.display = 'flex';
      menuBarContainer.style.borderBottom = '1px solid #808080';
      menuBarContainer.style.boxShadow = '0 1px 0 #ffffff';
      menuBarContainer.style.userSelect = 'none';
      menuBarContainer.style.height = '21px';
      menuBarContainer.style.boxSizing = 'border-box';
      menuBarContainer.style.flexShrink = '0';

      appDef.menuBar.forEach(menu => {
          const menuButton = document.createElement('div');
          menuButton.className = 'menu-bar-button';
          menuButton.textContent = menu.name;
          menuButton.style.padding = '2px 6px';
          menuButton.style.marginRight = '1px';
          menuButton.style.cursor = 'default';
          menuButton.style.fontSize = '11px';
          menuButton.style.lineHeight = '15px';
          menuButton.dataset.menuName = menu.name;

          if (menu.disabled) {
              menuButton.style.color = '#808080';
          } else {
              menuButton.style.color = 'black';
              menuButton.addEventListener('pointerdown', (e) => {
                  e.stopPropagation();
                  if (G_recycleBinActiveMenu.dropdown && G_recycleBinActiveMenu.button !== menuButton) {
                      closeLocalActiveMenu(null, null, G_recycleBinActiveMenu);
                  }
                  toggleLocalMenuDropdown(menuButton, menu.items, windowEl, windowInstanceId, G_recycleBinActiveMenu, appDef);
              });
              menuButton.addEventListener('mouseenter', (e) => {
                  if (G_recycleBinActiveMenu.dropdown && G_recycleBinActiveMenu.button && G_recycleBinActiveMenu.button !== menuButton) {
                      closeLocalActiveMenu(G_recycleBinActiveMenu.button, G_recycleBinActiveMenu.dropdown, G_recycleBinActiveMenu);
                      toggleLocalMenuDropdown(menuButton, menu.items, windowEl, windowInstanceId, G_recycleBinActiveMenu, appDef);
                  }
              });
          }
          menuBarContainer.appendChild(menuButton);
      });
      return menuBarContainer;
  }

  function toggleLocalMenuDropdown(buttonEl, items, windowEl, windowInstanceId, activeMenuState, appDef) {
      if (activeMenuState.dropdown && activeMenuState.button === buttonEl) {
          closeLocalActiveMenu(buttonEl, activeMenuState.dropdown, activeMenuState);
          return;
      }
      closeLocalActiveMenu(null, null, activeMenuState);

      buttonEl.style.backgroundColor = 'var(--theme-color-active-titlebar, #000080)';
      buttonEl.style.color = 'white';

      const dropdown = document.createElement('div');
      dropdown.className = 'menu-dropdown';
      dropdown.style.position = 'absolute';
      dropdown.style.backgroundColor = '#c0c0c0';
      dropdown.style.borderTop = '1px solid #dfdfdf';
      dropdown.style.borderLeft = '1px solid #dfdfdf';
      dropdown.style.borderRight = '1px solid #000000';
      dropdown.style.borderBottom = '1px solid #000000';
      dropdown.style.boxShadow = '1px 1px 0px #808080, 2px 2px 0px #808080';
      dropdown.style.padding = '1px';
      dropdown.style.zIndex = '50000';
      dropdown.style.minWidth = '150px';
      dropdown.style.fontSize = '11px';

      const currentMenuDefinition = appDef.menuBar.find(m => m.name === buttonEl.dataset.menuName);
      const currentItems = currentMenuDefinition ? currentMenuDefinition.items : items;

      currentItems.forEach(item => {
          if (item.separator) {
              const sep = document.createElement('div');
              sep.style.height = '1px'; sep.style.margin = '2px 1px';
              sep.style.borderTop = '1px solid #808080';
              sep.style.borderBottom = '1px solid #ffffff';
              dropdown.appendChild(sep);
          } else {
              const menuItemEl = document.createElement('div');
              menuItemEl.className = 'menu-dropdown-item';
              menuItemEl.innerHTML = `<span>${escapeHTML(item.name)}</span>`;
              menuItemEl.style.padding = '3px 20px 3px 25px';
              menuItemEl.style.position = 'relative';
              menuItemEl.style.whiteSpace = 'nowrap';

              if (item.disabled) {
                  menuItemEl.style.color = '#808080';
                  menuItemEl.style.cursor = 'default';
              } else {
                  menuItemEl.style.cursor = 'default';
                  menuItemEl.addEventListener('mouseenter', () => {
                      if (!item.disabled) {
                          menuItemEl.style.backgroundColor = 'var(--theme-color-active-titlebar, #000080)';
                          menuItemEl.style.color = 'white';
                          const shortcutSpan = menuItemEl.querySelector('.menu-shortcut');
                          if(shortcutSpan) shortcutSpan.style.color = 'white';
                      }
                  });
                  menuItemEl.addEventListener('mouseleave', () => {
                       if (!item.disabled) {
                          menuItemEl.style.backgroundColor = '';
                          menuItemEl.style.color = 'black';
                          const shortcutSpan = menuItemEl.querySelector('.menu-shortcut');
                          if(shortcutSpan) shortcutSpan.style.color = 'black';
                      }
                  });
                  menuItemEl.addEventListener('click', (e) => {
                      e.stopPropagation();
                      if (!item.disabled) {
                          handleLocalMenuAction(item.action, windowEl, windowInstanceId);
                          closeLocalActiveMenu(buttonEl, dropdown, activeMenuState);
                      }
                  });
              }
              if (item.shortcut) {
                  const shortcutEl = document.createElement('span');
                  shortcutEl.className = 'menu-shortcut';
                  shortcutEl.textContent = item.shortcut;
                  shortcutEl.style.position = 'absolute';
                  shortcutEl.style.right = '10px';
                  shortcutEl.style.color = item.disabled ? '#808080' : 'black';
                  menuItemEl.appendChild(shortcutEl);
              }
              dropdown.appendChild(menuItemEl);
          }
      });

      const buttonRect = buttonEl.getBoundingClientRect();
      const windowRect = windowEl.getBoundingClientRect();
      const menuBarEl = buttonEl.closest('.window-menu-bar');
      const menuBarRect = menuBarEl ? menuBarEl.getBoundingClientRect() : buttonRect;

      const contentArea = windowEl.querySelector('.window-content');
      if (contentArea && contentArea.contains(menuBarEl)) {
        windowEl.appendChild(dropdown);
        dropdown.style.left = `${buttonRect.left - windowRect.left}px`;
        dropdown.style.top = `${menuBarRect.bottom - windowRect.top}px`;
      } else {
        windowEl.appendChild(dropdown);
        dropdown.style.left = `${buttonEl.offsetLeft}px`;
        dropdown.style.top = `${buttonEl.offsetTop + buttonEl.offsetHeight}px`;
      }

      activeMenuState.button = buttonEl;
      activeMenuState.dropdown = dropdown;

      activeMenuState.outsideClickListener = (event) => {
          if (activeMenuState.dropdown &&
              !activeMenuState.dropdown.contains(event.target) &&
              !buttonEl.contains(event.target)
             ) {
              closeLocalActiveMenu(activeMenuState.button, activeMenuState.dropdown, activeMenuState);
          }
      };
      setTimeout(() => document.addEventListener('pointerdown', activeMenuState.outsideClickListener, { capture: true, once: true }), 0);
  }

  function closeLocalActiveMenu(buttonEl, dropdownEl, activeMenuState) {
      const btnToClear = buttonEl || activeMenuState?.button;
      const dropToClear = dropdownEl || activeMenuState?.dropdown;

      if (btnToClear) {
          btnToClear.style.backgroundColor = '';
          btnToClear.style.color = 'black';
      }
      if (dropToClear) {
          dropToClear.remove();
      }
      if (activeMenuState) {
          if (activeMenuState.outsideClickListener) {
              document.removeEventListener('pointerdown', activeMenuState.outsideClickListener, { capture: true });
          }
          activeMenuState.button = null;
          activeMenuState.dropdown = null;
          activeMenuState.outsideClickListener = null;
      }
  }

  function initializeRecycleBinState() {
      if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', updateRecycleBinIconState);
      } else {
          updateRecycleBinIconState();
      }
  }
  initializeRecycleBinState();

export { recycleBinAppDefinition };
