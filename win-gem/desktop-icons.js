// desktop-icons.js
(function() {
    const DESKTOP_ICON_POSITIONS_KEY = 'desktopIconPositions_win9x_style';
    let desktopElement;
    let allDesktopIcons = []; // Cache of all discoverable desktop icon elements

    // --- State Variables ---
    let selectedIcons = new Set();

    let primaryDraggedIcon = null; // The specific icon mouse interaction started on for a drag
    let isDraggingGroup = false;
    let dragOffsetX, dragOffsetY;
    let draggedItemsInitialStates = new Map(); // Stores {iconElement: {x, y, zIndex}} for items being dragged

    let isMarqueeSelecting = false;
    let marqueeElement = null;
    let marqueeStartX, marqueeStartY;
    let desktopRectCache; // To cache desktop's bounding rect during drag/marquee

    let clickTimeout = null; // For distinguishing click from drag start for selection
    let hasDragged = false; // Flag to check if actual dragging occurred

    // --- LocalStorage Persistence ---
    function getStoredPositions() {
        try {
            const stored = localStorage.getItem(DESKTOP_ICON_POSITIONS_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error("Error reading icon positions from localStorage:", e);
            return {};
        }
    }

    function saveIconPosition(appId, x, y) {
        const positions = getStoredPositions();
        positions[appId] = { x, y };
        try {
            localStorage.setItem(DESKTOP_ICON_POSITIONS_KEY, JSON.stringify(positions));
        } catch (e) {
            console.error("Error saving icon positions to localStorage:", e);
        }
    }

    function applyInitialPositions() {
        if (!desktopElement) return;
        const positions = getStoredPositions();
        
        allDesktopIcons.forEach(icon => {
            const appId = icon.dataset.appId;
            if (appId && positions[appId]) {
                const pos = positions[appId];
                icon.style.position = 'absolute';
                icon.style.left = `${pos.x}px`;
                icon.style.top = `${pos.y}px`;
                icon.style.margin = '0';
                icon.classList.add('is-positioned');
            } else {
                // Ensure icons not in localStorage are relatively positioned for z-index with marquee
                if (window.getComputedStyle(icon).position === 'static') {
                    icon.style.position = 'relative';
                }
            }
        });
    }

    // --- Selection Management ---
    function clearSelection() {
        selectedIcons.forEach(icon => icon.classList.remove('selected'));
        selectedIcons.clear();
    }

    function selectIcon(iconElement, isAdditive = false) {
        if (!isAdditive) {
            clearSelection();
        }
        if (iconElement && !selectedIcons.has(iconElement)) {
            selectedIcons.add(iconElement);
            iconElement.classList.add('selected');
        }
    }

    function toggleSelectIcon(iconElement) {
        if (selectedIcons.has(iconElement)) {
            selectedIcons.delete(iconElement);
            iconElement.classList.remove('selected');
        } else {
            selectedIcons.add(iconElement);
            iconElement.classList.add('selected');
        }
    }
    
    // --- Marquee Logic ---
    function startMarquee(event) {
        if (event.button !== 0) return; // Only primary button

        isMarqueeSelecting = true;
        desktopRectCache = desktopElement.getBoundingClientRect();
        
        // Adjust for desktop padding if icons are positioned relative to content box
        const desktopStyle = window.getComputedStyle(desktopElement);
        const paddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
        const paddingTop = parseFloat(desktopStyle.paddingTop) || 0;

        marqueeStartX = event.clientX - desktopRectCache.left - paddingLeft;
        marqueeStartY = event.clientY - desktopRectCache.top - paddingTop;

        marqueeElement = document.createElement('div');
        marqueeElement.className = 'marquee-select-box';
        marqueeElement.style.left = `${marqueeStartX}px`;
        marqueeElement.style.top = `${marqueeStartY}px`;
        marqueeElement.style.width = '0px';
        marqueeElement.style.height = '0px';
        desktopElement.appendChild(marqueeElement);

        clearSelection(); // Start with a clean slate for marquee
        document.body.classList.add('no-select'); // Prevent text selection
        desktopElement.setPointerCapture(event.pointerId);
    }

    function updateMarquee(event) {
        if (!isMarqueeSelecting) return;

        const desktopStyle = window.getComputedStyle(desktopElement);
        const paddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
        const paddingTop = parseFloat(desktopStyle.paddingTop) || 0;

        let currentX = event.clientX - desktopRectCache.left - paddingLeft;
        let currentY = event.clientY - desktopRectCache.top - paddingTop;

        const newLeft = Math.min(marqueeStartX, currentX);
        const newTop = Math.min(marqueeStartY, currentY);
        const newWidth = Math.abs(currentX - marqueeStartX);
        const newHeight = Math.abs(currentY - marqueeStartY);

        marqueeElement.style.left = `${newLeft}px`;
        marqueeElement.style.top = `${newTop}px`;
        marqueeElement.style.width = `${newWidth}px`;
        marqueeElement.style.height = `${newHeight}px`;

        // Update selection based on marquee
        const marqueeRect = marqueeElement.getBoundingClientRect();
        allDesktopIcons.forEach(icon => {
            const iconRect = icon.getBoundingClientRect();
            if (isIntersecting(marqueeRect, iconRect)) {
                if (!selectedIcons.has(icon)) {
                    selectedIcons.add(icon);
                    icon.classList.add('selected');
                }
            } else {
                if (selectedIcons.has(icon)) {
                    selectedIcons.delete(icon);
                    icon.classList.remove('selected');
                }
            }
        });
    }

    function endMarquee(event) {
        if (!isMarqueeSelecting) return;
         
        desktopElement.releasePointerCapture(event.pointerId);
        if (marqueeElement) {
            marqueeElement.remove();
            marqueeElement = null;
        }
        document.body.classList.remove('no-select');
        isMarqueeSelecting = false;

        // Prevent app.js from clearing selection if click originated on desktop for marquee
        if (event.target === desktopElement) {
            event.stopPropagation(); // This might prevent the document click in app.js
        }
    }

    function isIntersecting(rectA, rectB) {
        return !(rectA.right < rectB.left || 
                   rectA.left > rectB.right || 
                   rectA.bottom < rectB.top || 
                   rectA.top > rectB.bottom);
    }

    // --- Dragging Logic (Single and Group) ---
    function startIconDrag(event, iconElement) {
        if (event.button !== 0) return; // Only primary mouse button
         
        hasDragged = false; // Reset drag flag
        primaryDraggedIcon = iconElement;
        desktopRectCache = desktopElement.getBoundingClientRect(); // Cache for boundary checks

        // If the clicked icon isn't part of the current selection, reset selection to just this icon.
        // (Unless a modifier like Ctrl is used - not implemented here for simplicity)
        if (!selectedIcons.has(iconElement)) {
            clearSelection();
            selectIcon(iconElement);
        }
        // Now, all icons in `selectedIcons` will be dragged.
        isDraggingGroup = selectedIcons.size > 0; // Could be 1 or more

        const clickedIconRect = primaryDraggedIcon.getBoundingClientRect();
        dragOffsetX = event.clientX - clickedIconRect.left;
        dragOffsetY = event.clientY - clickedIconRect.top;

        draggedItemsInitialStates.clear();
        selectedIcons.forEach(icon => {
            // Ensure icons are absolutely positioned for dragging
            if (window.getComputedStyle(icon).position !== 'absolute') {
                const rect = icon.getBoundingClientRect();
                const parentRect = desktopElement.getBoundingClientRect();
                icon.style.position = 'absolute';
                icon.style.left = `${rect.left - parentRect.left - (parseFloat(window.getComputedStyle(desktopElement).paddingLeft) || 0)}px`;
                icon.style.top = `${rect.top - parentRect.top - (parseFloat(window.getComputedStyle(desktopElement).paddingTop) || 0)}px`;
                icon.style.margin = '0';
                icon.classList.add('is-positioned');
            }
            draggedItemsInitialStates.set(icon, {
                x: icon.offsetLeft,
                y: icon.offsetTop,
                zIndex: icon.style.zIndex || ''
            });
            icon.style.zIndex = '10000'; // Bring all dragged icons to front
        });
        
        document.body.classList.add('no-select');
        primaryDraggedIcon.setPointerCapture(event.pointerId);
    }

    function processDrag(event) {
        if (!primaryDraggedIcon) return;
        hasDragged = true; // Mark that dragging has occurred

        const desktopStyle = window.getComputedStyle(desktopElement);
        const desktopPaddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
        const desktopPaddingTop = parseFloat(desktopStyle.paddingTop) || 0;
        const desktopPaddingRight = parseFloat(desktopStyle.paddingRight) || 0;
        const desktopPaddingBottom = parseFloat(desktopStyle.paddingBottom) || 0;
        
        const contentWidth = desktopElement.clientWidth - desktopPaddingLeft - desktopPaddingRight;
        const contentHeight = desktopElement.clientHeight - desktopPaddingTop - desktopPaddingBottom;

        // Calculate new position for the primary dragged icon
        let newPrimaryX = event.clientX - desktopRectCache.left - desktopPaddingLeft - dragOffsetX;
        let newPrimaryY = event.clientY - desktopRectCache.top - desktopPaddingTop - dragOffsetY;
        
        // Boundary check for the primary dragged icon
        newPrimaryX = Math.max(0, Math.min(newPrimaryX, contentWidth - primaryDraggedIcon.offsetWidth));
        newPrimaryY = Math.max(0, Math.min(newPrimaryY, contentHeight - primaryDraggedIcon.offsetHeight));

        const primaryInitialState = draggedItemsInitialStates.get(primaryDraggedIcon);
        const deltaX = newPrimaryX - primaryInitialState.x;
        const deltaY = newPrimaryY - primaryInitialState.y;

        // Move all selected icons by the same delta
        selectedIcons.forEach(icon => {
            const initialState = draggedItemsInitialStates.get(icon);
            let newX = initialState.x + deltaX;
            let newY = initialState.y + deltaY;

            // Individual boundary checks for each icon in the group
            // This can cause "compression" at edges if group is large.
            // A simpler Win9x behavior might be that if ANY icon hits boundary, group stops.
            // For now, let's allow individual clamping.
            newX = Math.max(0, Math.min(newX, contentWidth - icon.offsetWidth));
            newY = Math.max(0, Math.min(newY, contentHeight - icon.offsetHeight));
            
            icon.style.left = `${newX}px`;
            icon.style.top = `${newY}px`;
        });
    }

    function endIconDrag(event) {
        if (!primaryDraggedIcon) return;

        primaryDraggedIcon.releasePointerCapture(event.pointerId);
        document.body.classList.remove('no-select');

        draggedItemsInitialStates.forEach((state, icon) => {
            icon.style.zIndex = state.zIndex; // Restore original z-index
            const appId = icon.dataset.appId;
            if (appId) {
                saveIconPosition(appId, icon.offsetLeft, icon.offsetTop);
            }
        });

        // If it was just a click without dragging, handle selection.
        // The `app.js` also has click handlers. We need to be careful.
        // If `hasDragged` is false, this was a click.
        // The `pointerdown` on icon already handled basic selection.
        // If `event.preventDefault()` was called in `onIconPointerDown`, `app.js` click might be suppressed.
        if (!hasDragged) {
            // This logic is now mostly handled by onIconPointerDown based on whether icon was already selected
            // If user clicked an icon, and it wasn't already selected, it became the sole selection.
            // If it was selected, it remained selected (along with others if group).
            // No further selection change needed here for a simple click if hasDragged is false.
        }
        
        primaryDraggedIcon = null;
        isDraggingGroup = false;
        draggedItemsInitialStates.clear();
        hasDragged = false; // Reset for next interaction
    }

    // --- Event Handlers Attachments ---
    function onIconPointerDown(event) {
        const iconElement = event.currentTarget;
        // If CTRL key is pressed, toggle selection (classic multi-select)
        if (event.ctrlKey) {
            toggleSelectIcon(iconElement);
            // Prevent drag initiation on Ctrl+click if desired, or allow dragging of toggled selection
            // For now, let Ctrl+click just be for selection, no immediate drag start.
            // To allow drag after Ctrl+click, we'd need to call startIconDrag here conditionally.
            // For simplicity, current startIconDrag will re-evaluate selection.
        } else {
             // If clicked icon is not already selected, simple click selects it and deselects others.
             // If clicked icon *is* selected, pointerdown initiates drag of current selection.
             // This logic is handled within startIconDrag.
        }
        startIconDrag(event, iconElement); // Always try to start drag, it will use current selection
        event.stopPropagation(); // Stop propagation to desktop handler
        event.preventDefault();  // Attempt to prevent default browser actions and `app.js` click handlers
    }

    function onDesktopPointerDown(event) {
        // Only trigger marquee if the direct target is the desktop itself
        if (event.target === desktopElement) {
            // Check if any icon is selected. If so, and click is on desktop, clear selection.
            // This happens in startMarquee() or could be explicit here.
            // If user clicks desktop, clear existing selection unless starting marquee immediately changes it.
            // The current `startMarquee` calls `clearSelection()`.
            startMarquee(event);
            // Important: If we stop propagation here, app.js document click won't fire
            // to deselect icons. This is good if our module handles all selection.
            event.stopPropagation(); 
        }
    }
    
    function onDocumentPointerMove(event) {
        if (isMarqueeSelecting) {
            updateMarquee(event);
        } else if (primaryDraggedIcon) {
            processDrag(event);
        }
    }

    function onDocumentPointerUp(event) {
        if (isMarqueeSelecting) {
            endMarquee(event); // Pass event to allow stopPropagation if target is desktop
        } else if (primaryDraggedIcon) {
            endIconDrag(event);
        }
    }

    // --- Initialization ---
    let marqueeJustFinishedOnDesktop = false;

    function initDesktopInteractions() {
        desktopElement = document.getElementById('desktop');
        if (!desktopElement) {
            console.error('DesktopInteractions: Desktop element (#desktop) not found.');
            return;
        }
        allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));

        applyInitialPositions();

        allDesktopIcons.forEach(icon => {
            icon.addEventListener('pointerdown', onIconPointerDown);
            const img = icon.querySelector('img');
            if (img) {
                img.addEventListener('dragstart', (e) => e.preventDefault()); // Prevent native image drag
            }
        });

        desktopElement.addEventListener('pointerdown', onDesktopPointerDown);
        document.addEventListener('pointermove', onDocumentPointerMove);
        document.addEventListener('pointerup', onDocumentPointerUp);
        document.addEventListener('pointercancel', onDocumentPointerUp); // Treat cancel like up

        // Intercept clicks on document to prevent app.js from deselecting after marquee
        // This capture listener runs before app.js's bubbling document click listener
        document.addEventListener('click', function(event) {
            if (marqueeJustFinishedOnDesktop && event.target === desktopElement) {
                event.stopImmediatePropagation(); // Critical: Stop app.js's deselect logic
                // console.log("Desktop click propagation stopped after marquee.");
            }
            marqueeJustFinishedOnDesktop = false; // Reset flag
        }, true); // Run in capture phase

         // Modify endMarquee to set this flag
         // Redefine endMarquee locally if it was already defined, or ensure flag is set correctly
         const originalEndMarquee = endMarquee; // if endMarquee is already in this scope
         endMarquee = function(event) { // Shadowing or re-assigning
             originalEndMarquee.call(this, event); // Call original logic
             if (isMarqueeSelecting === false && event.target === desktopElement) { // Check if marquee truly ended on desktop
                 marqueeJustFinishedOnDesktop = true;
                 // Reset flag quickly if no click follows immediately
                 setTimeout(() => { marqueeJustFinishedOnDesktop = false; }, 0);
             }
         }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDesktopInteractions);
    } else {
        initDesktopInteractions();
    }

})();
