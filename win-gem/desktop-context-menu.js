// desktop-context-menu.js
(function() {
    const DESKTOP_ICON_POSITIONS_KEY = 'desktopIconPositions_win9x_style'; // Reuse from desktop-icons.js
    let desktopElement;
    let contextMenuElement = null;
    let allDesktopIcons = []; // To be populated

    function createContextMenu() {
        if (contextMenuElement) {
            contextMenuElement.remove();
        }

        contextMenuElement = document.createElement('div');
        contextMenuElement.className = 'desktop-context-menu';
        contextMenuElement.style.display = 'none'; // Initially hidden

        // Define menu items. Each item can have:
        // - text: The display text
        // - action: A function to execute when clicked
        // - disabled: Boolean, if true, item is grayed out
        // - separator: Boolean, if true, adds a separator before this item (if it's not the first)
        const menuItems = [
            {
                text: "<u>A</u>rrange Icons",
                action: arrangeIcons,
                // Example: submenu (not implemented in this simple version)
                // submenu: [ { text: "by Name" }, { text: "by Type" } ]
            },
            {
                text: "<u>S</u>nap to grid",
                action: () => alert("Line up Icons clicked - not yet implemented!"),
                disabled: false
            },
            { separator: true },
            {
                text: "<u>R</u>efresh",
                action: () => window.location.reload() // Simple refresh
            },
            { separator: true },
            {
                text: "<u>P</u>aste",
                action: () => alert("Paste clicked - not yet implemented!"),
                disabled: true
            },
            {
                text: "Paste <u>S</u>hortcut",
                action: () => alert("Paste Shortcut clicked - not yet implemented!"),
                disabled: true
            },
            { separator: true },
            {
                text: "<u>N</u>ew",
                action: () => alert("New clicked - not yet implemented! (Could show submenu)"),
                disabled: true // Often leads to a submenu
            },
            { separator: true },
            {
                text: "P<u>r</u>operties",
                action: () => alert("Desktop Properties clicked - not yet implemented!")
            }
        ];

        menuItems.forEach((itemDef, index) => {
            if (itemDef.separator && index > 0) {
                const separator = document.createElement('div');
                separator.className = 'desktop-context-menu-separator';
                contextMenuElement.appendChild(separator);
            }

            if (itemDef.text) {
                const menuItem = document.createElement('div');
                menuItem.className = 'desktop-context-menu-item';
                menuItem.innerHTML = itemDef.text; // Using innerHTML to render <u>underline</u> hints

                if (itemDef.disabled) {
                    menuItem.classList.add('disabled');
                } else {
                    menuItem.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent click from closing menu immediately if action is quick
                        if (typeof itemDef.action === 'function') {
                            itemDef.action();
                        }
                        hideContextMenu();
                    });
                }
                contextMenuElement.appendChild(menuItem);
            }
        });

        desktopElement.appendChild(contextMenuElement);
    }

    function showContextMenu(event) {
        event.preventDefault(); // Prevent default browser context menu
        event.stopPropagation(); // Prevent other listeners if any

        // Only show if clicking directly on desktop or an unselected icon
        // If right-clicking a selected icon, OS might show different menu (not handled here)
        if (event.target.closest('.desktop-icon')) {
            // For now, we'll let the desktop context menu appear even if an icon is right-clicked.
            // A more advanced version might show an icon-specific context menu.
        }
        
        if (!contextMenuElement) {
            createContextMenu();
        }

        // Calculate position
        const desktopRect = desktopElement.getBoundingClientRect();
        let x = event.clientX - desktopRect.left;
        let y = event.clientY - desktopRect.top;

        contextMenuElement.style.display = 'block'; // Show it first to get dimensions

        // Adjust if too close to edge
        const menuRect = contextMenuElement.getBoundingClientRect();
        if (x + menuRect.width > desktopElement.clientWidth) {
            x = desktopElement.clientWidth - menuRect.width - 5; // 5px buffer
        }
        if (y + menuRect.height > desktopElement.clientHeight) {
            y = desktopElement.clientHeight - menuRect.height - 5; // 5px buffer
        }
        x = Math.max(0, x);
        y = Math.max(0, y);

        contextMenuElement.style.left = `${x}px`;
        contextMenuElement.style.top = `${y}px`;

        // Add a listener to close the menu if clicking elsewhere
        // Use a timeout to prevent immediate closure by the same click that opened it
        setTimeout(() => {
            document.addEventListener('click', handleClickOutsideMenu, { once: true, capture: true });
            document.addEventListener('contextmenu', handleClickOutsideMenu, { once: true, capture: true }); // Also for subsequent context menu clicks
        }, 0);
    }

    function hideContextMenu() {
        if (contextMenuElement) {
            contextMenuElement.style.display = 'none';
        }
        // Clean up listeners (already done by {once: true})
    }

    function handleClickOutsideMenu(event) {
        if (contextMenuElement && contextMenuElement.style.display === 'block') {
            if (!contextMenuElement.contains(event.target)) {
                hideContextMenu();
            } else {
                // If click was inside, re-add listener as {once: true} removes it
                 setTimeout(() => {
                    document.addEventListener('click', handleClickOutsideMenu, { once: true, capture: true });
                    document.addEventListener('contextmenu', handleClickOutsideMenu, { once: true, capture: true });
                }, 0);
            }
        }
    }

    function arrangeIcons() {
        if (!desktopElement) return;
        
        // Clear any stored positions from localStorage to reset to default flow
        try {
            localStorage.removeItem(DESKTOP_ICON_POSITIONS_KEY);
        } catch (e) {
            console.error("Error clearing icon positions from localStorage:", e);
        }

        // Remove absolute positioning styles from icons
        allDesktopIcons.forEach(icon => {
            icon.style.position = ''; // Revert to CSS default (likely 'relative' or 'static')
            icon.style.left = '';
            icon.style.top = '';
            icon.style.margin = ''; // Revert to CSS default
            icon.classList.remove('is-positioned');
            icon.classList.remove('selected'); // Also deselect
        });

        // The browser's flexbox (from your main CSS for .desktop) will now re-arrange them.
        // If you have a specific grid or flow logic in desktop-icons.js that sets initial
        // non-absolute positions, you might need to re-trigger that.
        // For now, this relies on the default CSS flexbox layout of .desktop.
        
        // If desktop-icons.js applies initial non-absolute layout, a more robust way
        // would be to call a "resetLayout" function from that module if possible,
        // or simply reload the page as a brute-force method.
        // For now, clearing styles is the "soft" approach.
        alert("Icons arranged! (Positions reset to default flow layout)");
        hideContextMenu();
    }


    function initDesktopContextMenu() {
        desktopElement = document.getElementById('desktop');
        if (!desktopElement) {
            console.error('ContextMenu: Desktop element (#desktop) not found.');
            return;
        }

        // Cache icons (needed for arrangeIcons)
        allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));

        desktopElement.addEventListener('contextmenu', showContextMenu);

        // Optional: Close context menu on Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && contextMenuElement && contextMenuElement.style.display === 'block') {
                hideContextMenu();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDesktopContextMenu);
    } else {
        initDesktopContextMenu();
    }

})();
