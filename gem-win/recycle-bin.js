// recycle-bin.js
'use strict';

const RECYCLE_BIN_ITEMS_KEY = 'recycleBinItems_win9x';
const DESKTOP_ICON_POSITIONS_KEY = 'desktopIconPositions_win9x_style_v2'; // For removing icon positions

const recycleBinAppDefinition = {
    appId: 'recycleBin', // Useful to have here
    title: "Recycle Bin",
    icon: "./recycle_bin_empty-0.png", // Default empty icon
    iconFull: "./recycle_bin_full_cool-0.png", // Full icon
    defaultWidth: 400,
    defaultHeight: 300,
    generateContent: () => {
        const items = getRecycledItems();
        // The desktop icon update is handled by updateRecycleBinIconState,
        // but we ensure it's called if this window is opened.
        // updateRecycleBinIconState(); // Call it to be sure, or rely on calls from add/empty

        if (items.length === 0) {
            return `<div style="padding:10px; text-align:center; flex-grow:1; display:flex; flex-direction:column; justify-content:center; align-items:center; background:white;">
                        <img src="${recycleBinAppDefinition.icon}" style="width:48px; height:48px; display:block; margin-bottom:10px;">
                        <p>Recycle Bin is empty.</p>
                        ${generateRecycleBinActionsHTML()}
                    </div>`;
        } else {
            let itemsHTML = items.map(item =>
                `<div class="recycled-item" data-item-id="${item.id}" style="padding: 5px; border-bottom: 1px solid #eee; display:flex; align-items:center; cursor:default;">
                    <img src="${item.iconSrc}" style="width:24px; height:24px; margin-right: 8px;" alt="">
                    <span>${escapeHTML(item.name)}</span>
                </div>`
            ).join('');
            return `<div style="background:white; flex-grow:1; display:flex; flex-direction:column;">
                        <div style="padding:5px; border-bottom:1px solid #ccc; display:flex; justify-content:flex-start;">
                            ${generateRecycleBinActionsHTML()}
                        </div>
                        <div style="overflow-y:auto; flex-grow:1; padding:5px;">${itemsHTML}</div>
                    </div>`;
        }
    },
    initApp: (windowEl, windowInstanceId) => {
        // Ensure listeners are attached to dynamic content
        attachRecycleBinActionListeners(windowEl);
        updateRecycleBinIconState(); // Ensure desktop icon is correct when window opens
    },
    // Add methods that can be called externally if needed by desktop-icons.js
    // These are now part of the module's own API rather than global window object.
    api: {
        addItem,
        getDesktopIconElement,
        updateIconState: updateRecycleBinIconState // Expose for direct calls if needed
    }
};

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function (match) {
        return {
            '&': '&',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": '''
        }[match];
    });
}

function getRecycledItems() {
    try {
        const stored = localStorage.getItem(RECYCLE_BIN_ITEMS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("RecycleBin: Error getting recycled items:", e);
        return [];
    }
}

function saveRecycledItems(items) {
    try {
        localStorage.setItem(RECYCLE_BIN_ITEMS_KEY, JSON.stringify(items));
        updateRecycleBinIconState();
    } catch (e) {
        console.error("RecycleBin: Error saving recycled items:", e);
    }
}

function addItem(itemData) { // itemData = { id: appId, name: iconName, iconSrc: iconPath }
    const items = getRecycledItems();
    if (!items.find(i => i.id === itemData.id)) {
        items.push({
            id: itemData.id,
            name: itemData.name,
            iconSrc: itemData.iconSrc,
            originalAppId: itemData.id // Keep track if it was a desktop icon
        });
        saveRecycledItems(items);

        // Remove from desktop icon positions if it was a desktop icon
        if (itemData.id) { // Assuming itemData.id is the appId of the desktop icon
            try {
                const positions = JSON.parse(localStorage.getItem(DESKTOP_ICON_POSITIONS_KEY) || '{}');
                if (positions[itemData.id]) {
                    delete positions[itemData.id];
                    localStorage.setItem(DESKTOP_ICON_POSITIONS_KEY, JSON.stringify(positions));
                }
            } catch (e) {
                console.error("RecycleBin: Error removing icon position from LS:", e);
            }
        }
    }
}

function empty() {
    if (confirm("Are you sure you want to permanently delete all items in the Recycle Bin?")) {
        saveRecycledItems([]); // Save an empty array
        // Desktop icon update will happen in saveRecycledItems via updateRecycleBinIconState

        // If Recycle Bin window is open, refresh its content
        const openRecycleBinWindow = Object.values(window.openWindows || {}).find(ow => ow.appId === recycleBinAppDefinition.appId && ow.element);
        if (openRecycleBinWindow) {
            const contentArea = openRecycleBinWindow.element.querySelector('.window-content');
            if (contentArea) {
                contentArea.innerHTML = recycleBinAppDefinition.generateContent();
                attachRecycleBinActionListeners(openRecycleBinWindow.element); // Re-attach listeners
            }
        }
    }
}

function updateRecycleBinIconState() {
    const items = getRecycledItems();
    const recycleBinDesktopIconImg = getDesktopIconElement()?.querySelector('img');

    if (recycleBinDesktopIconImg) {
        recycleBinDesktopIconImg.src = items.length > 0 ? recycleBinAppDefinition.iconFull : recycleBinAppDefinition.icon;
    }
}

function getDesktopIconElement() {
    return document.querySelector(`.desktop-icon[data-app-id="${recycleBinAppDefinition.appId}"]`);
}

function generateRecycleBinActionsHTML() {
    const items = getRecycledItems();
    let actionsHTML = '';
    // Could add a "File" menu emulation here if desired.
    // For now, just the "Empty Recycle Bin" button if not empty.
    if (items.length > 0) {
        actionsHTML += `<button class="win95-button empty-recycle-bin-btn" style="margin:5px; min-width: 120px;">Empty Recycle Bin</button>`;
    }
    // Placeholder for future actions like "Restore All"
    // actionsHTML += `<button class="win95-button restore-all-btn" style="margin:5px;" disabled>Restore All Items</button>`;
    return actionsHTML;
}

function attachRecycleBinActionListeners(windowEl) {
    const emptyBtn = windowEl.querySelector('.empty-recycle-bin-btn');
    if (emptyBtn) {
        // Remove old listener to prevent duplicates if re-attaching
        emptyBtn.replaceWith(emptyBtn.cloneNode(true)); // Simple way to remove all listeners
        windowEl.querySelector('.empty-recycle-bin-btn').addEventListener('click', empty);
    }
    // Add listeners for other actions here if implemented (e.g., restore)
}

// Call this once on script load to set the initial desktop icon state
// It needs the DOM to be ready for querySelector.
function initializeRecycleBinState() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateRecycleBinIconState);
    } else {
        updateRecycleBinIconState();
    }
}
initializeRecycleBinState();


export { recycleBinAppDefinition };
