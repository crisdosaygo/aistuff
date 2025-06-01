// desktop-icons.js
(function() {
    'use strict';

    const DESKTOP_ICON_POSITIONS_KEY = 'desktopIconPositions_win9x_style';
    let desktopElement;
    let allDesktopIcons = [];

    let selectedIcons = new Set();
    let primaryDraggedIcon = null;
    let isDraggingGroup = false;
    let dragOffsetX, dragOffsetY;
    let draggedItemsInitialStates = new Map();
    let isMarqueeSelecting = false;
    let marqueeElement = null;
    let marqueeStartX, marqueeStartY;
    let desktopRectCache;
    let hasDragged = false;

    // --- Debounce Utility --- (Add this if not globally available)
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const context = this;
            const later = () => {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // --- LocalStorage Persistence ---
    function getStoredPositions() {
        try {
            const stored = localStorage.getItem(DESKTOP_ICON_POSITIONS_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (e) { console.error("LS Error (get):", e); return {}; }
    }

    function saveIconPosition(appId, x, y) {
        const positions = getStoredPositions();
        positions[appId] = { x, y };
        try {
            localStorage.setItem(DESKTOP_ICON_POSITIONS_KEY, JSON.stringify(positions));
        } catch (e) { console.error("LS Error (save):", e); }
    }

    function applyInitialPositions() {
        if (!desktopElement) return;
        const positions = getStoredPositions();
        allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon')); // Refresh here

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
                if (window.getComputedStyle(icon).position === 'static') {
                    icon.style.position = 'relative'; // For marquee interaction if not positioned
                }
            }
        });
    }

    // --- Selection Management (clearSelection, selectIcon, toggleSelectIcon) ---
    // ... (these functions remain the same as your current version) ...
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


    // --- Marquee Logic (startMarquee, updateMarquee, endMarquee, isIntersecting) ---
    // ... (these functions remain the same as your current version) ...
    function startMarquee(event) {
        if (event.button !== 0) return; 

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
    
    let originalEndMarqueeFunction = function(event) {
        if (!isMarqueeSelecting) return;

        desktopElement.releasePointerCapture(event.pointerId);
        if (marqueeElement) {
            marqueeElement.remove();
            marqueeElement = null;
        }
        document.body.classList.remove('no-select');
        isMarqueeSelecting = false; 

        if (event.target === desktopElement) {
            // Stop propagation logic is handled by marqueeJustFinishedOnDesktop flag
        }
    };
    let endMarquee = originalEndMarqueeFunction;


    function isIntersecting(rectA, rectB) {
        return !(rectA.right < rectB.left ||
                   rectA.left > rectB.right ||
                   rectA.bottom < rectB.top ||
                   rectA.top > rectB.bottom);
    }

    // --- Dragging Logic (startIconDrag, processDrag, endIconDrag) ---
    // ... (these functions remain the same as your current version, which includes the wasFlowLayout logic) ...
    function startIconDrag(event, iconElement) {
        if (event.button !== 0) return;

        hasDragged = false;
        primaryDraggedIcon = iconElement;
        desktopRectCache = desktopElement.getBoundingClientRect();

        if (!event.ctrlKey && !selectedIcons.has(iconElement)) {
            clearSelection();
            selectIcon(iconElement);
        } else if (event.ctrlKey && !selectedIcons.has(iconElement)) { 
            selectIcon(iconElement, true); 
        }
        
        isDraggingGroup = selectedIcons.size > 0;

        const clickedIconRect = primaryDraggedIcon.getBoundingClientRect();
        const desktopStyle = window.getComputedStyle(desktopElement);
        const desktopPaddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
        const desktopPaddingTop = parseFloat(desktopStyle.paddingTop) || 0;

        dragOffsetX = event.clientX - clickedIconRect.left;
        dragOffsetY = event.clientY - clickedIconRect.top;

        draggedItemsInitialStates.clear();
        selectedIcons.forEach(icon => {
            let wasFlowLayout = false;
            const iconStyle = window.getComputedStyle(icon);
            const originalInlinePosition = icon.style.position; 
            const originalInlineMargin = icon.style.margin;

            if (iconStyle.position !== 'absolute') {
                wasFlowLayout = true;
                const rect = icon.getBoundingClientRect();
                icon.style.position = 'absolute';
                icon.style.left = `${rect.left - desktopRectCache.left - desktopPaddingLeft}px`;
                icon.style.top = `${rect.top - desktopRectCache.top - desktopPaddingTop}px`;
                icon.style.margin = '0'; 
                if (!icon.classList.contains('is-positioned')) {
                    icon.classList.add('is-positioned');
                }
            }
            draggedItemsInitialStates.set(icon, {
                x: icon.offsetLeft,
                y: icon.offsetTop,
                zIndex: icon.style.zIndex || '',
                wasFlowLayout: wasFlowLayout,
                originalInlinePosition: originalInlinePosition, 
                originalInlineMargin: originalInlineMargin   
            });
            icon.style.zIndex = '10000'; 
        });

        document.body.classList.add('no-select');
        primaryDraggedIcon.setPointerCapture(event.pointerId);
    }

    function processDrag(event) {
        if (!primaryDraggedIcon) return;
        if (!hasDragged && (Math.abs(event.movementX) > 2 || Math.abs(event.movementY) > 2)) { 
            hasDragged = true;
        }
        if (!hasDragged) return; 

        const desktopStyle = window.getComputedStyle(desktopElement);
        const desktopPaddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
        const desktopPaddingTop = parseFloat(desktopStyle.paddingTop) || 0;
        
        // Use SnapToGrid's metrics to define draggable area, respecting icon padding
        const iconAreaMetrics = window.SnapToGrid.getDesktopIconAreaMetrics(desktopElement);
        const draggableWidth = iconAreaMetrics.iconAreaOffsetX + iconAreaMetrics.contentWidthForGrid;
        const draggableHeight = iconAreaMetrics.iconAreaOffsetY + iconAreaMetrics.contentHeightForGrid;
        const minX = iconAreaMetrics.iconAreaOffsetX;
        const minY = iconAreaMetrics.iconAreaOffsetY;

        let newPrimaryX = event.clientX - desktopRectCache.left - desktopPaddingLeft - dragOffsetX;
        let newPrimaryY = event.clientY - desktopRectCache.top - desktopPaddingTop - dragOffsetY;

        // Clamp primary icon to the icon area
        newPrimaryX = Math.max(minX, Math.min(newPrimaryX, draggableWidth - primaryDraggedIcon.offsetWidth));
        newPrimaryY = Math.max(minY, Math.min(newPrimaryY, draggableHeight - primaryDraggedIcon.offsetHeight));

        const primaryInitialState = draggedItemsInitialStates.get(primaryDraggedIcon);
        const deltaX = newPrimaryX - primaryInitialState.x;
        const deltaY = newPrimaryY - primaryInitialState.y;

        selectedIcons.forEach(icon => {
            const initialState = draggedItemsInitialStates.get(icon);
            if (!initialState) return; 

            let newX = initialState.x + deltaX;
            let newY = initialState.y + deltaY;

            // Clamp each icon to the icon area
            newX = Math.max(minX, Math.min(newX, draggableWidth - icon.offsetWidth));
            newY = Math.max(minY, Math.min(newY, draggableHeight - icon.offsetHeight));

            icon.style.left = `${newX}px`;
            icon.style.top = `${newY}px`;
        });
    }

    function endIconDrag(event) {
        if (!primaryDraggedIcon) return;

        primaryDraggedIcon.releasePointerCapture(event.pointerId);
        document.body.classList.remove('no-select');

        if (hasDragged) { 
            draggedItemsInitialStates.forEach((state, icon) => {
                icon.style.zIndex = state.zIndex; 
                const appId = icon.dataset.appId;
                if (appId) {
                    saveIconPosition(appId, icon.offsetLeft, icon.offsetTop);
                }
                if (!icon.classList.contains('is-positioned')) {
                     icon.classList.add('is-positioned');
                }
            });
        } else { 
            draggedItemsInitialStates.forEach((state, icon) => {
                icon.style.zIndex = state.zIndex; 
                if (state.wasFlowLayout) {
                    icon.style.position = state.originalInlinePosition || ''; 
                    icon.style.left = '';   
                    icon.style.top = '';    
                    icon.style.margin = state.originalInlineMargin || ''; 
                    icon.classList.remove('is-positioned');
                    if (!icon.style.position) icon.style.removeProperty('position');
                    if (!icon.style.margin) icon.style.removeProperty('margin');
                }
            });
        }
        primaryDraggedIcon = null;
        isDraggingGroup = false;
        draggedItemsInitialStates.clear();
    }


    // --- Event Handlers Attachments (onIconPointerDown, onDesktopPointerDown, onDocumentPointerMove, onDocumentPointerUp) ---
    // ... (these functions remain the same as your current version) ...
    function onIconPointerDown(event) {
        const iconElement = event.currentTarget;
        hasDragged = false; 
        if (event.ctrlKey) {
            toggleSelectIcon(iconElement);
        }
        startIconDrag(event, iconElement);
        event.stopPropagation();
    }

    function onDesktopPointerDown(event) {
        if (event.target === desktopElement) {
            startMarquee(event);
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
            endMarquee(event);
        } else if (primaryDraggedIcon) {
            endIconDrag(event);
        }
    }

    // --- NEW: Check and Snap Icons if Offscreen ---
    function checkAndSnapIconsIfOffscreen() {
        if (!desktopElement || !window.SnapToGrid || typeof window.SnapToGrid.getDesktopIconAreaMetrics !== 'function') {
            return;
        }
        allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon')); // Refresh
        const iconAreaMetrics = window.SnapToGrid.getDesktopIconAreaMetrics(desktopElement);
        let anIconIsOffscreen = false;

        for (const icon of allDesktopIcons) {
            if (icon.classList.contains('is-positioned')) { // Only check absolutely positioned icons
                const iconLeft = icon.offsetLeft;
                const iconTop = icon.offsetTop;
                const iconRight = iconLeft + icon.offsetWidth;
                const iconBottom = iconTop + icon.offsetHeight;

                // Check against the effective icon placement area
                const minX = iconAreaMetrics.iconAreaOffsetX;
                const minY = iconAreaMetrics.iconAreaOffsetY;
                const maxX = iconAreaMetrics.iconAreaOffsetX + iconAreaMetrics.contentWidthForGrid;
                const maxY = iconAreaMetrics.iconAreaOffsetY + iconAreaMetrics.contentHeightForGrid;

                if (iconLeft < minX || iconTop < minY || iconRight > maxX || iconBottom > maxY) {
                    anIconIsOffscreen = true;
                    break; 
                }
            }
        }

        if (anIconIsOffscreen) {
            console.log("An icon is offscreen, triggering snap to grid for all positioned icons.");
            // Snap all positioned icons. If some are selected, snap only selected.
            // For this case, we want to ensure all offscreen icons are handled, so snap all.
            const currentlySelected = new Set(selectedIcons); // Preserve current selection
            clearSelection(); // Snap all by clearing selection temporarily
            
            if (window.Win9xDesktopUtils && typeof window.Win9xDesktopUtils.snapSelectedIconsToGrid === 'function') {
                window.Win9xDesktopUtils.snapSelectedIconsToGrid(); // This will snap all if selection is empty
            }
            
            // Restore selection
            currentlySelected.forEach(icon => selectIcon(icon, true));
        }
    }

    const debouncedCheckAndSnapIcons = debounce(checkAndSnapIconsIfOffscreen, 300);

    // --- Initialization ---
    let marqueeJustFinishedOnDesktop = false;

    function initDesktopInteractions() {
        desktopElement = document.getElementById('desktop');
        if (!desktopElement) {
            console.error('DesktopInteractions: Desktop element (#desktop) not found.');
            return;
        }
        
        applyInitialPositions(); // This now refreshes allDesktopIcons

        allDesktopIcons.forEach(icon => {
            icon.addEventListener('pointerdown', onIconPointerDown);
            const img = icon.querySelector('img');
            if (img) img.addEventListener('dragstart', (e) => e.preventDefault());
        });

        desktopElement.addEventListener('pointerdown', onDesktopPointerDown);
        document.addEventListener('pointermove', onDocumentPointerMove);
        document.addEventListener('pointerup', onDocumentPointerUp);
        document.addEventListener('pointercancel', onDocumentPointerUp);

        document.addEventListener('click', function(event) {
            if (marqueeJustFinishedOnDesktop && event.target === desktopElement) {
                event.stopImmediatePropagation();
            }
            marqueeJustFinishedOnDesktop = false;
        }, true);

        const originalEndMarqueeHandler = endMarquee;
        endMarquee = function(event) {
            originalEndMarqueeHandler.call(this, event);
            if (isMarqueeSelecting === false && event.target === desktopElement) {
                marqueeJustFinishedOnDesktop = true;
                setTimeout(() => { marqueeJustFinishedOnDesktop = false; }, 0);
            }
        };

        if (window.SnapToGrid && typeof window.SnapToGrid.configure === 'function') {
            window.SnapToGrid.configure({ 
                gridSizeX: 85, 
                gridSizeY: 87,
                desktopPadding: 10 // Example: 10px padding for icons from desktop edge
            });
        }

        // Initial check on load
        checkAndSnapIconsIfOffscreen();

        // Listen for desktop resize
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(debouncedCheckAndSnapIcons);
            resizeObserver.observe(desktopElement);
        } else {
            window.addEventListener('resize', debouncedCheckAndSnapIcons);
        }
    }

    // --- Global Utilities ---
    if (!window.Win9xDesktopUtils) window.Win9xDesktopUtils = {};
    window.Win9xDesktopUtils.snapSelectedIconsToGrid = () => {
        if (!window.SnapToGrid || typeof window.SnapToGrid.snap !== 'function') {
            console.error("SnapToGrid module or its snap function not found.");
            return;
        }
        if (!desktopElement) {
            console.error("Desktop element not found for snapping.");
            return;
        }
        allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon')); // Refresh

        // If icons are selected, snap only those. Otherwise, snap all *positioned* icons.
        let iconsToProcess;
        if (selectedIcons.size > 0) {
            iconsToProcess = Array.from(selectedIcons);
        } else {
            iconsToProcess = allDesktopIcons.filter(icon => icon.classList.contains('is-positioned'));
            if (iconsToProcess.length === 0) { // If no icons are positioned, snap all icons
                iconsToProcess = [...allDesktopIcons];
            }
        }
        
        if (iconsToProcess.length > 0) {
            window.SnapToGrid.snap({
                iconsToSnap: iconsToProcess,
                allDesktopIcons: allDesktopIcons,
                desktopElement: desktopElement,
                savePositionFn: saveIconPosition
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDesktopInteractions);
    } else {
        initDesktopInteractions();
    }
})();
