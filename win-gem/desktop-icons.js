// desktop-icons.js
(function() {
    'use strict'; // Recommended for IIFEs

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

    // let clickTimeout = null; // Retained, though its direct usage wasn't prominent in the provided drag/select
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
                // This might be less relevant if snap-to-grid or drag always makes them absolute.
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

        clearSelection(); 
        document.body.classList.add('no-select');
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

    // Original endMarquee definition before potential override in init
    let originalEndMarqueeFunction = function(event) {
        if (!isMarqueeSelecting) return;
         
        desktopElement.releasePointerCapture(event.pointerId);
        if (marqueeElement) {
            marqueeElement.remove();
            marqueeElement = null;
        }
        document.body.classList.remove('no-select');
        isMarqueeSelecting = false; // Crucial: set state *before* checking target

        // This part is for the marqueeJustFinishedOnDesktop flag logic
        if (event.target === desktopElement) {
            // This event.stopPropagation() was in the original code,
            // but the marqueeJustFinishedOnDesktop mechanism is now primary.
            // Keep it if it served another purpose, or rely on the capture phase listener.
            // event.stopPropagation(); 
        }
    };
    // Assign it to endMarquee, which might be reassigned in initDesktopInteractions
    let endMarquee = originalEndMarqueeFunction;


    function isIntersecting(rectA, rectB) {
        return !(rectA.right < rectB.left || 
                   rectA.left > rectB.right || 
                   rectA.bottom < rectB.top || 
                   rectA.top > rectB.bottom);
    }

    function processDrag(event) {
        if (!primaryDraggedIcon) return;
        if (!hasDragged && (Math.abs(event.movementX) > 2 || Math.abs(event.movementY) > 2)) { // Threshold
            hasDragged = true;
        }
        if (!hasDragged) return; // Don't move if threshold not met

        const desktopStyle = window.getComputedStyle(desktopElement);
        const desktopPaddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
        const desktopPaddingTop = parseFloat(desktopStyle.paddingTop) || 0;
        
        const contentWidth = desktopElement.clientWidth; // clientWidth includes padding
        const contentHeight = desktopElement.clientHeight; // clientHeight includes padding
        // Effective draggable area:
        const draggableWidth = contentWidth - (parseFloat(desktopStyle.paddingLeft) || 0) - (parseFloat(desktopStyle.paddingRight) || 0);
        const draggableHeight = contentHeight - (parseFloat(desktopStyle.paddingTop) || 0) - (parseFloat(desktopStyle.paddingBottom) || 0);


        let newPrimaryX = event.clientX - desktopRectCache.left - desktopPaddingLeft - dragOffsetX;
        let newPrimaryY = event.clientY - desktopRectCache.top - desktopPaddingTop - dragOffsetY;
        
        newPrimaryX = Math.max(0, Math.min(newPrimaryX, draggableWidth - primaryDraggedIcon.offsetWidth));
        newPrimaryY = Math.max(0, Math.min(newPrimaryY, draggableHeight - primaryDraggedIcon.offsetHeight));

        const primaryInitialState = draggedItemsInitialStates.get(primaryDraggedIcon);
        const deltaX = newPrimaryX - primaryInitialState.x;
        const deltaY = newPrimaryY - primaryInitialState.y;

        selectedIcons.forEach(icon => {
            const initialState = draggedItemsInitialStates.get(icon);
            if (!initialState) return; // Should not happen if logic is correct

            let newX = initialState.x + deltaX;
            let newY = initialState.y + deltaY;

            newX = Math.max(0, Math.min(newX, draggableWidth - icon.offsetWidth));
            newY = Math.max(0, Math.min(newY, draggableHeight - icon.offsetHeight));
            
            icon.style.left = `${newX}px`;
            icon.style.top = `${newY}px`;
        });
    }

    // --- Dragging Logic (Single and Group) ---
    function startIconDrag(event, iconElement) {
        if (event.button !== 0) return; 
         
        hasDragged = false; 
        primaryDraggedIcon = iconElement;
        desktopRectCache = desktopElement.getBoundingClientRect(); 

        if (!event.ctrlKey && !selectedIcons.has(iconElement)) { // If not Ctrl key and icon not selected
            clearSelection();
            selectIcon(iconElement);
        } else if (!selectedIcons.has(iconElement)) { // For Ctrl key click on unselected icon
             selectIcon(iconElement, true); // Add to selection (toggleSelectIcon does this more or less)
        }
        // If icon IS selected (with or without Ctrl), drag the whole group.

        isDraggingGroup = selectedIcons.size > 0;

        const clickedIconRect = primaryDraggedIcon.getBoundingClientRect();
        const desktopStyle = window.getComputedStyle(desktopElement);
        const desktopPaddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
        const desktopPaddingTop = parseFloat(desktopStyle.paddingTop) || 0;

        dragOffsetX = event.clientX - clickedIconRect.left;
        dragOffsetY = event.clientY - clickedIconRect.top;

        draggedItemsInitialStates.clear();
        selectedIcons.forEach(icon => {
            if (window.getComputedStyle(icon).position !== 'absolute') {
                const rect = icon.getBoundingClientRect();
                icon.style.position = 'absolute';
                icon.style.left = `${rect.left - desktopRectCache.left - desktopPaddingLeft}px`;
                icon.style.top = `${rect.top - desktopRectCache.top - desktopPaddingTop}px`;
                icon.style.margin = '0';
                icon.classList.add('is-positioned');
            }
            draggedItemsInitialStates.set(icon, {
                x: icon.offsetLeft,
                y: icon.offsetTop,
                zIndex: icon.style.zIndex || ''
            });
            icon.style.zIndex = '10000'; 
        });
        
        document.body.classList.add('no-select');
        primaryDraggedIcon.setPointerCapture(event.pointerId);
    }

    function endIconDrag(event) {
        if (!primaryDraggedIcon) return;

        primaryDraggedIcon.releasePointerCapture(event.pointerId);
        document.body.classList.remove('no-select');

        if (hasDragged) { // Only save if actual drag occurred
            draggedItemsInitialStates.forEach((state, icon) => {
                icon.style.zIndex = state.zIndex; 
                const appId = icon.dataset.appId;
                if (appId) {
                    saveIconPosition(appId, icon.offsetLeft, icon.offsetTop);
                }
            });
        } else {
            // This was a click, not a drag. Selection is handled by onIconPointerDown/startIconDrag.
            // Restore z-index if it was changed optimistically
             draggedItemsInitialStates.forEach((state, icon) => {
                icon.style.zIndex = state.zIndex;
            });
        }
        
        primaryDraggedIcon = null;
        isDraggingGroup = false;
        draggedItemsInitialStates.clear();
        // hasDragged = false; // Reset here or at start of next drag
    }

    // --- Event Handlers Attachments ---
    function onIconPointerDown(event) {
        const iconElement = event.currentTarget;
        
        hasDragged = false; // Reset drag flag for this interaction

        if (event.ctrlKey) {
            toggleSelectIcon(iconElement);
            // If we want Ctrl+click to *only* select and not initiate drag,
            // we could return here. However, standard UX often allows dragging
            // the new selection state. startIconDrag will use the current selectedIcons.
        } else {
            // If not Ctrl key:
            // - If icon is NOT selected, it becomes the only selection.
            // - If icon IS selected (and it's part of a potential group),
            //   pointerdown on it prepares to drag the current selection.
            // This logic is implicitly handled by startIconDrag's check:
            // `if (!event.ctrlKey && !selectedIcons.has(iconElement))`
        }
        
        startIconDrag(event, iconElement); 
        event.stopPropagation(); 
        // event.preventDefault(); // Can be aggressive, might prevent focus or other desired defaults.
                               // Test if needed to stop app.js clicks on icons.
    }

    function onDesktopPointerDown(event) {
        if (event.target === desktopElement) {
            startMarquee(event);
            // event.stopPropagation(); // Already done if startMarquee is called and successful
        } else {
            // Click was on something else on the desktop (not an icon, not desktop itself)
            // This could be a place to clear selection if desired, and if not handled by app.js
            // clearSelection(); 
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
        // The order matters if both could be true, but they are usually exclusive
        if (isMarqueeSelecting) { 
            endMarquee(event); 
        } else if (primaryDraggedIcon) {
            endIconDrag(event);
        }
        // If neither, it might be a click on the document not handled elsewhere.
        // This is where app.js's generic deselect might fire.
        // The marqueeJustFinishedOnDesktop logic below tries to intercept this.
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
                img.addEventListener('dragstart', (e) => e.preventDefault()); 
            }
        });

        desktopElement.addEventListener('pointerdown', onDesktopPointerDown);
        document.addEventListener('pointermove', onDocumentPointerMove);
        document.addEventListener('pointerup', onDocumentPointerUp);
        document.addEventListener('pointercancel', onDocumentPointerUp); 

        // Intercept clicks on document to prevent app.js from deselecting after marquee
        document.addEventListener('click', function(event) {
            if (marqueeJustFinishedOnDesktop && event.target === desktopElement) {
                event.stopImmediatePropagation(); 
                // console.log("Desktop click propagation stopped after marquee on desktop.");
            }
            marqueeJustFinishedOnDesktop = false; 
        }, true); 

        // Re-assign endMarquee to include the flag logic
        // This shadows the `endMarquee` in the wider IIFE scope with this new version.
        const originalEndMarqueeHandler = endMarquee; // The one defined earlier in this IIFE
        endMarquee = function(event) { 
            originalEndMarqueeHandler.call(this, event); // Call original logic
            
            // Check if marquee truly ended (isMarqueeSelecting is now false) AND target was desktop
            if (isMarqueeSelecting === false && event.target === desktopElement) { 
                marqueeJustFinishedOnDesktop = true;
                // Reset flag quickly if no click follows immediately (defensive)
                setTimeout(() => { marqueeJustFinishedOnDesktop = false; }, 0);
            }
        };

        // Configure the SnapToGrid module (optional: customize grid size)
        if (window.SnapToGrid && typeof window.SnapToGrid.configure === 'function') {
            window.SnapToGrid.configure({ gridSizeX: 85, gridSizeY: 87 }); // Example values
        }
    }

    // --- Global Utilities (e.g., for context menu "Arrange Icons by Grid") ---
    if (!window.Win9xDesktopUtils) {
        window.Win9xDesktopUtils = {};
    }

    window.Win9xDesktopUtils.snapSelectedIconsToGrid = () => {
        if (!window.SnapToGrid || typeof window.SnapToGrid.snap !== 'function') {
            console.error("SnapToGrid module or its snap function not found.");
            return;
        }
        if (!desktopElement) {
            console.error("Desktop element not found for snapping.");
            return;
        }

        // Refresh the list of all icons in case some were added/removed dynamically
        allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon'));

        const iconsToProcess = selectedIcons.size > 0 ? Array.from(selectedIcons) : [...allDesktopIcons];
        
        if (iconsToProcess.length > 0) {
            window.SnapToGrid.snap({
                iconsToSnap: iconsToProcess,
                allDesktopIcons: allDesktopIcons,
                desktopElement: desktopElement,
                savePositionFn: saveIconPosition // Pass the local save function
            });
        } else {
            // console.log("Snap to Grid: No icons selected or discoverable to snap.");
        }
    };

    // Expose selectedIcons for debug button, if needed
    // window.selectedIcons = selectedIcons; // Uncomment for the debug button in HTML example

    // --- Auto-run Initialization ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDesktopInteractions);
    } else {
        initDesktopInteractions();
    }

})();
