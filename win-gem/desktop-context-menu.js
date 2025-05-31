// desktop-context-menu.js
(function() {
    const DESKTOP_ICON_POSITIONS_KEY = 'desktopIconPositions_win9x_style';
    const DESKTOP_BACKGROUND_COLOR_KEY = 'desktopBgColor_win9x';
    const DESKTOP_BACKGROUND_IMAGE_KEY = 'desktopBgImage_win9x';

    let desktopElement;
    let contextMenuElement = null;
    let allDesktopIcons = []; // To be populated
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
            return; 
        }
        displayPropertiesDialog = document.createElement('div');
        displayPropertiesDialog.className = 'display-properties-dialog';
        const initialLeft = Math.max(0, (desktopElement.clientWidth - 350) / 2);
        const initialTop = Math.max(0, (desktopElement.clientHeight - 300) / 3);
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
                    <fieldset>
                        <legend>Wallpaper</legend>
                        <div class="display-properties-preview" id="dpPreview"></div>
                        <label for="dpBgImageFile">Select an image (max 1MB):</label>
                        <input type="file" id="dpBgImageFile" accept="image/jpeg, image/png, image/gif, image/webp">
                        <button id="dpClearImageBtn">Remove Image</button>
                    </fieldset>
                    <fieldset>
                        <legend>Color</legend>
                        <label for="dpBgColor">Select background color:</label>
                        <input type="color" id="dpBgColor" value="${currentBgColor}">
                    </fieldset>
                </div>
                <div class="display-properties-buttons">
                    <button id="dpOkBtn">OK</button>
                    <button id="dpCancelBtn">Cancel</button>
                    <button id="dpApplyBtn">Apply</button>
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
        previewEl.style.backgroundColor = currentBgColor;
        if (currentBgImage) {
            previewEl.style.backgroundImage = `url(${currentBgImage})`;
        } else {
            previewEl.style.backgroundImage = 'none';
        }
        colorInput.value = currentBgColor;
        colorInput.addEventListener('input', () => {
            previewEl.style.backgroundColor = colorInput.value;
        });
        imageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                if (file.size > 1 * 1024 * 1024) {
                    alert("Image is too large! Please select an image under 1MB.");
                    imageInput.value = ""; 
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewEl.style.backgroundImage = `url(${e.target.result})`;
                };
                reader.readAsDataURL(file);
            }
        });
        clearImageBtn.addEventListener('click', () => {
            imageInput.value = ""; 
            previewEl.style.backgroundImage = 'none';
            previewEl.style.backgroundColor = colorInput.value; 
        });
        function applySettings() {
            currentBgColor = colorInput.value;
            desktopElement.style.backgroundColor = currentBgColor;
            localStorage.setItem(DESKTOP_BACKGROUND_COLOR_KEY, currentBgColor);
            const file = imageInput.files[0];
            if (file) { 
                if (file.size <= 1 * 1024 * 1024) { 
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        currentBgImage = e.target.result;
                        desktopElement.style.backgroundImage = `url(${currentBgImage})`;
                        desktopElement.style.backgroundSize = 'cover';
                        desktopElement.style.backgroundPosition = 'center';
                        localStorage.setItem(DESKTOP_BACKGROUND_IMAGE_KEY, currentBgImage);
                    };
                    reader.readAsDataURL(file);
                }
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
    }

    function createContextMenu() {
        if (contextMenuElement && desktopElement.contains(contextMenuElement)) {
            contextMenuElement.remove();
        }
        contextMenuElement = document.createElement('div');
        contextMenuElement.className = 'desktop-context-menu';

        const menuItems = [
            {
                text: "<u>A</u>rrange Icons",
                action: arrangeIcons,
            },
            {
                text: "<u>S</u>nap to Grid",
                action: () => {
                    if (window.Win9xDesktopUtils && typeof window.Win9xDesktopUtils.snapSelectedIconsToGrid === 'function') {
                        window.Win9xDesktopUtils.snapSelectedIconsToGrid();
                    } else {
                        alert("Snap to Grid feature not available. (desktop-icons.js not configured?)");
                    }
                }
            },
            { separator: true },
            {
                text: "<u>R</u>efresh",
                action: () => window.location.reload()
            },
            { separator: true },
            {
                text: "P<u>r</u>operties",
                action: openDisplayProperties 
            },
        ];

        menuItems.forEach((itemDef, index) => {
            if (itemDef.separator && index > 0) {
                if (contextMenuElement.lastChild && !contextMenuElement.lastChild.classList.contains('desktop-context-menu-separator')) {
                    const separator = document.createElement('div');
                    separator.className = 'desktop-context-menu-separator';
                    contextMenuElement.appendChild(separator);
                }
            }
            if (itemDef.text) {
                const menuItem = document.createElement('div');
                menuItem.className = 'desktop-context-menu-item';
                menuItem.innerHTML = itemDef.text; 
                if (itemDef.disabled) {
                    menuItem.classList.add('disabled');
                } else {
                    menuItem.addEventListener('click', (e) => {
                        e.stopPropagation(); 
                        if (typeof itemDef.action === 'function') {
                            itemDef.action(); 
                        }
                        if (itemDef.action !== openDisplayProperties) { // Keep menu for dialogs, they handle their own closing
                             hideContextMenu();
                        }
                    });
                }
                contextMenuElement.appendChild(menuItem);
            }
        });
        desktopElement.appendChild(contextMenuElement);
        hideContextMenu(); 
    }

    function showContextMenu(event) {
        if (event.target.closest('.window') || event.target.closest('.display-properties-dialog')) {
            return; 
        }
        event.preventDefault(); 
        event.stopPropagation();
        if (!contextMenuElement || !desktopElement.contains(contextMenuElement)) {
            createContextMenu(); 
        }
        const desktopRect = desktopElement.getBoundingClientRect();
        let x = event.clientX - desktopRect.left;
        let y = event.clientY - desktopRect.top;
        contextMenuElement.style.display = 'block'; 
        const menuRect = contextMenuElement.getBoundingClientRect(); 
        const padding = 5; 
        if (x + menuRect.width + padding > desktopElement.clientWidth) {
            x = desktopElement.clientWidth - menuRect.width - padding;
        }
        if (y + menuRect.height + padding > desktopElement.clientHeight) {
            y = desktopElement.clientHeight - menuRect.height - padding;
        }
        x = Math.max(padding, x); 
        y = Math.max(padding, y);
        contextMenuElement.style.left = `${x}px`;
        contextMenuElement.style.top = `${y}px`;
        contextMenuElement.style.zIndex = '20000'; 
        setTimeout(() => { 
            document.addEventListener('click', handleClickOutsideContextMenu, { once: true, capture: true });
            document.addEventListener('contextmenu', handleRightClickOutsideContextMenu, { once: true, capture: true });
        }, 0);
    }

    function hideContextMenu() {
        if (contextMenuElement) {
            contextMenuElement.style.display = 'none';
        }
    }

    function handleClickOutsideContextMenu(event) { 
        if (contextMenuElement && contextMenuElement.style.display === 'block') {
            if (!contextMenuElement.contains(event.target)) {
                hideContextMenu();
            } else {
                setTimeout(() => {
                    document.addEventListener('click', handleClickOutsideContextMenu, { once: true, capture: true });
                    document.addEventListener('contextmenu', handleRightClickOutsideContextMenu, { once: true, capture: true });
                }, 0);
            }
        }
    }
    
    function handleRightClickOutsideContextMenu(event) { 
         if (contextMenuElement && contextMenuElement.style.display === 'block') {
            if (!contextMenuElement.contains(event.target)) {
                hideContextMenu();
            } else {
                event.preventDefault(); 
                setTimeout(() => {
                    document.addEventListener('click', handleClickOutsideContextMenu, { once: true, capture: true });
                    document.addEventListener('contextmenu', handleRightClickOutsideContextMenu, { once: true, capture: true });
                }, 0);
            }
        }
    }

    function arrangeIcons() {
        if (!desktopElement) return;
        try {
            localStorage.removeItem(DESKTOP_ICON_POSITIONS_KEY);
        } catch (e) {
            console.error("Error clearing icon positions from localStorage:", e);
        }
        allDesktopIcons.forEach(icon => {
            icon.style.position = ''; 
            icon.style.left = '';
            icon.style.top = '';
            icon.style.margin = ''; 
            icon.classList.remove('is-positioned');
            icon.classList.remove('selected'); 
        });
        hideContextMenu(); 
    }

    function initDesktopContextMenu() {
        desktopElement = document.getElementById('desktop');
        if (!desktopElement) {
            console.error('ContextMenu: Desktop element (#desktop) not found.');
            return;
        }
        allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));
        loadDesktopPreferences(); 
        desktopElement.addEventListener('contextmenu', showContextMenu);
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (contextMenuElement && contextMenuElement.style.display === 'block') {
                    hideContextMenu();
                } else if (displayPropertiesDialog && desktopElement.contains(displayPropertiesDialog)) {
                    const closeBtn = displayPropertiesDialog.querySelector('.dialog-close-btn');
                    if (closeBtn) closeBtn.click(); 
                    else { 
                        displayPropertiesDialog.remove(); 
                        displayPropertiesDialog = null;
                    }
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDesktopContextMenu);
        document.addEventListener('mousedown', e => {
          console.log('click');
          if ( contextMenuElement.style.display === 'block' && !e.target.closest('.desktop-context-menu') ) {
            setTimeout(() => hideContextMenu(), 100);
          }
        }, {capture:true});
    } else {
        initDesktopContextMenu(); 
    }
})();
