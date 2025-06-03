// recycle-bin.js
  'use strict';

  const RECYCLE_BIN_ITEMS_KEY = 'recycleBinItems_win9x';

  // Keep a G_activeMenu object scoped to this module if needed for menu interactions
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
              name: "File", // This menu itself is enabled
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
              disabled: true, // Disable the entire Edit menu button
              items: [ /* items don't matter as much if top-level is disabled, but define for completeness */
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
              disabled: true, // Disable the entire View menu button
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
              disabled: true, // Disable the entire Help menu button
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
          updateRecycleBinIconState();
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
          getRecycledItemIds, // Crucial: this returns ALL IDs for desktop icon hiding
          updateIconState: updateRecycleBinIconState,
          restoreItem,
          emptyRecycleBin: empty
      }
  };

  let recycleBinInstances = {};

  function escapeHTML(str) {
      if (str === null || str === undefined) return '';
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
          localStorage.removeItem(RECYCLE_BIN_ITEMS_KEY);
          return [];
      }
  }

  // Returns IDs of ALL items ever put in bin (and not restored), for desktop icon hiding
  function getRecycledItemIds() {
      return getRecycledItems().map(item => item.id);
  }

  function saveRecycledItems(items) {
      try {
          localStorage.setItem(RECYCLE_BIN_ITEMS_KEY, JSON.stringify(items));
          updateRecycleBinIconState(); // Updates desktop icon based on non-permanently-deleted items
      } catch (e) {
          console.error("RecycleBin: Error saving recycled items:", e);
      }
  }

  function addItem(itemData) {
      const items = getRecycledItems();
      const existingItemIndex = items.findIndex(i => i.id === itemData.id);

      if (existingItemIndex === -1) { // Item not in bin at all
          items.push({
              id: itemData.id,
              name: itemData.name,
              iconSrc: itemData.iconSrc,
              originalAppId: itemData.originalAppId,
              dateDeleted: new Date().toISOString(),
              size: itemData.size || Math.floor(Math.random() * 1000) + 50, // Placeholder size
              isPermanentlyDeleted: false // New items are not permanently deleted
          });
      } else { // Item exists, might have been restored and re-deleted
          items[existingItemIndex].isPermanentlyDeleted = false;
          items[existingItemIndex].permanentlyDeletedDate = null; // Clear this
          items[existingItemIndex].dateDeleted = new Date().toISOString(); // Update deletion date
          // Keep original name, iconSrc, originalAppId, size if already set
          items[existingItemIndex].name = itemData.name || items[existingItemIndex].name;
          items[existingItemIndex].iconSrc = itemData.iconSrc || items[existingItemIndex].iconSrc;
      }
      saveRecycledItems(items);
  }

  function empty() { // "Empty Recycle Bin" action
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
          saveRecycledItems(items);
      }

      Object.keys(recycleBinInstances).forEach(instanceId => {
          if (recycleBinInstances[instanceId]) {
              recycleBinInstances[instanceId].selectedItemId = null;
              refreshWindowContent(instanceId);
          }
      });
  }

  function restoreItem(itemIdToRestore, windowInstanceIdToUpdate) {
      let items = getRecycledItems();
      const itemToRestore = items.find(item => item.id === itemIdToRestore);

      if (itemToRestore) {
          items = items.filter(item => item.id !== itemIdToRestore); // Completely remove from the list
          saveRecycledItems(items);

          if (window.Win9xDesktopUtils && typeof window.Win9xDesktopUtils.getDesktopIconByAppId === 'function') {
              const desktopIconEl = window.Win9xDesktopUtils.getDesktopIconByAppId(itemToRestore.originalAppId);
              if (desktopIconEl) {
                  desktopIconEl.style.display = '';
              }
          }

          if (windowInstanceIdToUpdate && recycleBinInstances[windowInstanceIdToUpdate]) {
              recycleBinInstances[windowInstanceIdToUpdate].selectedItemId = null;
              refreshWindowContent(windowInstanceIdToUpdate);
          } else {
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
      const recycleBinDesktopIconImg = getDesktopIconElement()?.querySelector('img');
      if (recycleBinDesktopIconImg) {
          recycleBinDesktopIconImg.src = displayableItems.length > 0 ? recycleBinAppDefinition.iconFull : recycleBinAppDefinition.icon;
      }
  }

  function getDesktopIconElement() {
      return document.querySelector(`.desktop-icon[data-app-id="${recycleBinAppDefinition.appId}"]`);
  }

  function refreshWindowContent(instanceId) {
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
  // Helper to escape attribute values for querySelector
  function escapeAttribute(value) {
      return value.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
  }


  function attachRecycleBinEventListeners(windowEl, instanceId) {
      const listContainer = windowEl.querySelector('.recycle-bin-list');
      if (listContainer) {
          listContainer.addEventListener('click', (event) => {
              const targetItemEl = event.target.closest('.recycled-item');
              if (targetItemEl) {
                  const itemId = targetItemEl.dataset.itemId;
                  const instance = recycleBinInstances[instanceId];
                  
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
              console.log("Select All Items action triggered for Recycle Bin");
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
          menuButton.dataset.menuName = menu.name; // Use the actual name for the dataset

          if (menu.disabled) { 
              menuButton.style.color = '#808080';
              // menuButton.style.pointerEvents = 'none'; // Already handled by updateLocalMenuState
          } else {
              menuButton.style.color = 'black';
              menuButton.addEventListener('pointerdown', (e) => {
                  e.stopPropagation();
                  if (G_recycleBinActiveMenu.dropdown && G_recycleBinActiveMenu.button !== menuButton) {
                      closeLocalActiveMenu(null, null, G_recycleBinActiveMenu);
                  }
                  toggleLocalMenuDropdown(menuButton, menu.items, windowEl, windowInstanceId, G_recycleBinActiveMenu);
              });
              menuButton.addEventListener('mouseenter', (e) => {
                  if (G_recycleBinActiveMenu.dropdown && G_recycleBinActiveMenu.button && G_recycleBinActiveMenu.button !== menuButton) {
                      closeLocalActiveMenu(G_recycleBinActiveMenu.button, G_recycleBinActiveMenu.dropdown, G_recycleBinActiveMenu);
                      toggleLocalMenuDropdown(menuButton, menu.items, windowEl, windowInstanceId, G_recycleBinActiveMenu);
                  }
              });
          }
          menuBarContainer.appendChild(menuButton);
      });
      return menuBarContainer;
  }

  function toggleLocalMenuDropdown(buttonEl, items, windowEl, windowInstanceId, activeMenuState) {
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
      dropdown.style.borderRight = '1px solid #808080';
      dropdown.style.borderBottom = '1px solid #808080';
      dropdown.style.boxShadow = '1px 1px 2px rgba(0,0,0,0.3)';
      dropdown.style.padding = '1px';
      dropdown.style.zIndex = '50000'; 
      dropdown.style.minWidth = '150px';
      dropdown.style.fontSize = '11px';

      items.forEach(item => {
          if (item.separator) {
              const sep = document.createElement('div');
              sep.style.height = '1px'; sep.style.margin = '2px 1px';
              sep.style.borderTop = '1px solid #808080'; sep.style.borderBottom = '1px solid #ffffff';
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
                      handleLocalMenuAction(item.action, windowEl, windowInstanceId);
                      closeLocalActiveMenu(buttonEl, dropdown, activeMenuState);
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
      const menuBarRect = buttonEl.closest('.window-menu-bar').getBoundingClientRect();

      dropdown.style.left = `${buttonRect.left - windowRect.left}px`;
      dropdown.style.top = `${menuBarRect.bottom - windowRect.top}px`; 
      
      windowEl.appendChild(dropdown);

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
