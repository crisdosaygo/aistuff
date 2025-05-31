// desktop-context-menu.js
(function() {
    const DESKTOP_ICON_POSITIONS_KEY = 'desktopIconPositions_win9x_style';
    const DESKTOP_BACKGROUND_COLOR_KEY = 'desktopBgColor_win9x';
    const DESKTOP_BACKGROUND_IMAGE_KEY = 'desktopBgImage_win9x';

    let desktopElement;
    let contextMenuElement = null;
    let allDesktopIcons = []; // To be populated
    let displayPropertiesDialog = null;
    let currentBgColor = '#008080'; // Default Teal, will be overridden by localStorage if set
    let currentBgImage = ''; // Will be overridden by localStorage if set

    // --- Helper to make dialogs draggable (simplified) ---
    function makeDialogDraggable(dialogElement, titleBarElement) {
        let offsetX, offsetY, isDragging = false;

        titleBarElement.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button')) return; 
            isDragging = true;
            const dialogRect = dialogElement.getBoundingClientRect();
            offsetX = e.clientX - dialogRect.left;
            offsetY = e.clientY - dialogRect.top;
            titleBarElement.style.cursor = 'grabbing';
            // Ensure dialog is brought to front, relative to other potential dialogs from this module
            const currentZ = parseInt(window.getComputedStyle(dialogElement).zIndex) || 15000;
            dialogElement.style.zIndex = currentZ + 1; 
            document.body.classList.add('no-select'); // Prevent text selection during drag
        });

        document.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            
            const vpWidth = desktopElement.clientWidth; // Constrain to desktop
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

    // --- Display Properties Dialog Logic ---
    function openDisplayProperties() {
        hideContextMenu(); // Close context menu first
        if (displayPropertiesDialog && document.body.contains(displayPropertiesDialog)) {
            // If already open, just bring to front
            const currentZ = parseInt(window.getComputedStyle(displayPropertiesDialog).zIndex) || 15000;
            displayPropertiesDialog.style.zIndex = currentZ + 1;
            return; 
        }

        displayPropertiesDialog = document.createElement('div');
        displayPropertiesDialog.className = 'display-properties-dialog';
        // Center the dialog initially
        const initialLeft = Math.max(0, (desktopElement.clientWidth - 350) / 2); // 350 is min-width
        const initialTop = Math.max(0, (desktopElement.clientHeight - 300) / 3);  // 300 is min-height
        displayPropertiesDialog.style.left = `${initialLeft}px`;
        displayPropertiesDialog.style.top = `${initialTop}px`;
        displayPropertiesDialog.style.zIndex = '15001'; // Higher than context menu, initial value

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
                    <!-- <div class="display-properties-tab" data-tab="appearance">Appearance</div> -->
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
                <!-- <div class="display-properties-tab-content" data-tab-content="appearance"> ... </div> -->
                <div class="display-properties-buttons">
                    <button id="dpOkBtn">OK</button>
                    <button id="dpCancelBtn">Cancel</button>
                    <button id="dpApplyBtn">Apply</button>
                </div>
            </div>
        `;
        // Append to desktop so it's within its coordinate system for dragging bounds
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

        // Initialize preview with current desktop settings
        previewEl.style.backgroundColor = currentBgColor;
        if (currentBgImage) {
            previewEl.style.backgroundImage = `url(${currentBgImage})`;
        } else {
            previewEl.style.backgroundImage = 'none';
        }
        colorInput.value = currentBgColor;

        // Event Listeners for dialog controls
        colorInput.addEventListener('input', () => {
            previewEl.style.backgroundColor = colorInput.value;
            // If user changes color, and no image is actively selected or previewed, remove image from preview
            if (!imageInput.files[0] && (previewEl.style.backgroundImage && previewEl.style.backgroundImage !== 'none')) {
                 // This logic might be too aggressive, let's simplify: image takes precedence.
                 // If user changes color, preview shows that color as base.
            }
        });

        imageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                if (file.size > 1 * 1024 * 1024) { // 1MB limit
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
            // Preview should now just show the selected color
            previewEl.style.backgroundColor = colorInput.value; 
        });

        function applySettings() {
            // Apply Color
            currentBgColor = colorInput.value;
            desktopElement.style.backgroundColor = currentBgColor;
            localStorage.setItem(DESKTOP_BACKGROUND_COLOR_KEY, currentBgColor);

            // Apply Image
            const file = imageInput.files[0];
            if (file) { // A new file is selected
                if (file.size <= 1 * 1024 * 1024) { // Redundant check, but safe
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
                // Image was explicitly cleared (input is empty AND preview shows no image)
                currentBgImage = '';
                desktopElement.style.backgroundImage = 'none';
                localStorage.removeItem(DESKTOP_BACKGROUND_IMAGE_KEY);
            }
            // If no new file and input wasn't cleared, the existing currentBgImage (if any) remains.
        }

        applyBtn.addEventListener('click', applySettings);
        okBtn.addEventListener('click', () => {
            applySettings();
            displayPropertiesDialog.remove();
            displayPropertiesDialog = null;
        });
        function closeDialogWithoutSaving() {
            // Revert preview to actual current settings before closing
            // This is if user made changes in dialog but hit Cancel/Close
            // (Not strictly necessary as dialog is removed, but good practice if it were just hidden)
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

    // --- Context Menu Creation & Logic ---
    function createContextMenu() {
        if (contextMenuElement && desktopElement.contains(contextMenuElement)) {
            contextMenuElement.remove(); // Remove existing if any
        }

        contextMenuElement = document.createElement('div');
        contextMenuElement.className = 'desktop-context-menu';
        // Style display none will be set after appending, by hideContextMenu initially

        const menuItems = [
            {
                text: "<u>A</u>rrange Icons",
                action: arrangeIcons,
            },
            // {
            //     text: "<u>L</u>ine up Icons", // Or "Snap to grid"
            //     action: () => alert("Line up Icons - not yet implemented!"),
            //     disabled: true 
            // },
            { separator: true },
            {
                text: "<u>R</u>efresh",
                action: () => window.location.reload()
            },
            { separator: true },
            {
                text: "P<u>r</u>operties",
                action: openDisplayProperties 
            }
        ];

        menuItems.forEach((itemDef, index) => {
            if (itemDef.separator && index > 0) {
                // Ensure separator is not added if previous item was also a separator or menu is empty
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
                            itemDef.action(); // Actions like openDisplayProperties will handle hiding the context menu
                        }
                        // For simple actions that don't open dialogs, explicitly hide.
                        if (itemDef.action !== openDisplayProperties) {
                             hideContextMenu();
                        }
                    });
                }
                contextMenuElement.appendChild(menuItem);
            }
        });

        desktopElement.appendChild(contextMenuElement);
        hideContextMenu(); // Ensure it's hidden after creation and appending
    }

    function showContextMenu(event) {
        // Prevent context menu on existing windows or dialogs from this module
        if (event.target.closest('.window') || event.target.closest('.display-properties-dialog')) {
            // If it's on our dialog, we might want a specific dialog context menu later, but not the desktop one.
            // For now, just return and let the default browser context menu appear or do nothing.
            return; 
        }
        
        event.preventDefault(); 
        event.stopPropagation();
        
        // If another context menu (e.g. browser default on an input) was open, this click should close it.
        // Our own `hideContextMenu` will be called by `handleClickOutside...` if applicable.

        if (!contextMenuElement || !desktopElement.contains(contextMenuElement)) {
            createContextMenu(); // Create if not exists or was removed
        }

        const desktopRect = desktopElement.getBoundingClientRect();
        let x = event.clientX - desktopRect.left;
        let y = event.clientY - desktopRect.top;

        contextMenuElement.style.display = 'block'; 
        const menuRect = contextMenuElement.getBoundingClientRect(); // Get dimensions *after* display:block

        // Adjust if too close to edge
        const padding = 5; // Buffer from edge
        if (x + menuRect.width + padding > desktopElement.clientWidth) {
            x = desktopElement.clientWidth - menuRect.width - padding;
        }
        if (y + menuRect.height + padding > desktopElement.clientHeight) {
            y = desktopElement.clientHeight - menuRect.height - padding;
        }
        x = Math.max(padding, x); // Ensure not off-screen left/top
        y = Math.max(padding, y);

        contextMenuElement.style.left = `${x}px`;
        contextMenuElement.style.top = `${y}px`;
        contextMenuElement.style.zIndex = '20000'; // Ensure it's on top

        // Add listeners to close the menu
        setTimeout(() => { // Defer to next tick to avoid self-closing
            document.addEventListener('click', handleClickOutsideContextMenu, { once: true, capture: true });
            document.addEventListener('contextmenu', handleRightClickOutsideContextMenu, { once: true, capture: true });
        }, 0);
    }

    function hideContextMenu() {
        if (contextMenuElement) {
            contextMenuElement.style.display = 'none';
        }
        // The {once: true} option automatically removes the listeners after they fire.
    }

    function handleClickOutsideContextMenu(event) { // For LEFT clicks
        if (contextMenuElement && contextMenuElement.style.display === 'block') {
            if (!contextMenuElement.contains(event.target)) {
                hideContextMenu();
            } else {
                // Click was inside the menu, but not on an actionable item that closes it.
                // Re-arm the listener. (Actions on items should close the menu themselves).
                setTimeout(() => {
                    document.addEventListener('click', handleClickOutsideContextMenu, { once: true, capture: true });
                    // Also re-arm right-click listener if left click was inside
                    document.addEventListener('contextmenu', handleRightClickOutsideContextMenu, { once: true, capture: true });
                }, 0);
            }
        }
    }
    
    function handleRightClickOutsideContextMenu(event) { // For RIGHT clicks
         if (contextMenuElement && contextMenuElement.style.display === 'block') {
            if (!contextMenuElement.contains(event.target)) {
                // Right-click happened outside the current menu. Hide current.
                // The new contextmenu event (from this right-click) will then be processed by `showContextMenu`.
                hideContextMenu();
            } else {
                // Right-click was inside the menu. Menu stays open. Re-arm listeners.
                event.preventDefault(); // Prevent browser default context menu if right-click is inside our menu
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
        // Desktop flexbox rules will now apply.
        // alert("Icons arranged!"); // Optional feedback
        hideContextMenu(); // Ensure menu closes after action
    }

    // --- Initialization ---
    function initDesktopContextMenu() {
        desktopElement = document.getElementById('desktop');
        if (!desktopElement) {
            console.error('ContextMenu: Desktop element (#desktop) not found.');
            return;
        }
        
        // Populate allDesktopIcons after DOM is ready
        allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));
        
        loadDesktopPreferences(); // Load and apply saved background settings

        desktopElement.addEventListener('contextmenu', showContextMenu);

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (contextMenuElement && contextMenuElement.style.display === 'block') {
                    hideContextMenu();
                } else if (displayPropertiesDialog && desktopElement.contains(displayPropertiesDialog)) {
                    // Find the cancel/close button logic for the dialog instead of just removing
                    const closeBtn = displayPropertiesDialog.querySelector('.dialog-close-btn');
                    if (closeBtn) closeBtn.click(); // Simulate click on its close button
                    else { // Fallback
                        displayPropertiesDialog.remove(); 
                        displayPropertiesDialog = null;
                    }
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDesktopContextMenu);
    } else {
        initDesktopContextMenu(); // DOMContentLoaded has already fired
    }

})();
