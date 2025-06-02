(function() {
'use strict';

const DESKTOP_ICON_POSITIONS_KEY = 'desktopIconPositions_win9x_style';
let desktopElement;
let allDesktopIcons = []; // Will be populated in applyInitialPositions and refreshed

let selectedIcons = new Set();
let primaryDraggedIcon = null; // The icon directly interacted with during a drag
let isDraggingGroup = false; // True if multiple selected icons are being dragged
let dragOffsetX, dragOffsetY; // Mouse offset within the primary dragged icon
let draggedItemsInitialStates = new Map(); // Stores initial state of icons being dragged
let isMarqueeSelecting = false;
let marqueeElement = null;
let marqueeStartX, marqueeStartY; // Marquee start relative to desktop padding
let desktopRectCache; // Cached desktop bounding rect for performance
let hasDragged = false; // Flag to distinguish click from drag for icons

// --- NEW Flags for refined click handling ---
let marqueeJustFinishedOnDesktop = false; // True if the last pointerup was on the desktop ending a marquee
let significantMarqueeOccurred = false; // True if the marquee was large enough or selected icons

// --- Debounce Utility ---
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
    allDesktopIcons = Array.from(desktopElement.querySelectorAll('.desktop-icon')); // Refresh the list

    allDesktopIcons.forEach(icon => {
        const appId = icon.dataset.appId;
        if (appId && positions[appId]) {
            const pos = positions[appId];
            icon.style.position = 'absolute';
            icon.style.left = `${pos.x}px`;
            icon.style.top = `${pos.y}px`;
            icon.style.margin = '0'; // Remove flow layout margin
            icon.classList.add('is-positioned');
        } else {
            // Ensure icons not in storage but potentially affected by prior absolute positioning
            // are reset or correctly styled for flow if that's the default.
            // For this setup, if not 'is-positioned', it implies flow layout or initial state.
            // We might need to ensure 'position: relative' if CSS doesn't default to it for marquee.
            if (window.getComputedStyle(icon).position === 'static') {
                 icon.style.position = 'relative'; // Allows offsetLeft/Top for marquee even in flow
            }
        }
    });
}

// --- Selection Management ---
function clearSelection() {
    selectedIcons.forEach(icon => {
        icon.classList.remove('selected');
        // Assuming IconSelectionEffect is globally available if used
        if (window.IconSelectionEffect && typeof window.IconSelectionEffect.removeSelectionEffect === 'function') {
            window.IconSelectionEffect.removeSelectionEffect(icon.querySelector('img'));
        }
    });
    selectedIcons.clear();
}

function selectIcon(iconElement, isAdditive = false) {
    if (!isAdditive) {
        clearSelection();
    }
    if (iconElement && !selectedIcons.has(iconElement)) {
        selectedIcons.add(iconElement);
        iconElement.classList.add('selected');
        if (window.IconSelectionEffect && typeof window.IconSelectionEffect.applySelectionEffect === 'function') {
            window.IconSelectionEffect.applySelectionEffect(iconElement.querySelector('img'));
        }
    }
}

function toggleSelectIcon(iconElement) {
    if (selectedIcons.has(iconElement)) {
        selectedIcons.delete(iconElement);
        iconElement.classList.remove('selected');
        if (window.IconSelectionEffect && typeof window.IconSelectionEffect.removeSelectionEffect === 'function') {
            window.IconSelectionEffect.removeSelectionEffect(iconElement.querySelector('img'));
        }
    } else {
        selectedIcons.add(iconElement);
        iconElement.classList.add('selected');
        if (window.IconSelectionEffect && typeof window.IconSelectionEffect.applySelectionEffect === 'function') {
            window.IconSelectionEffect.applySelectionEffect(iconElement.querySelector('img'));
        }
    }
}

// --- Marquee Logic ---
function startMarquee(event) {
    if (event.button !== 0) return; // Only left click

    // Reset flags at the start of a new marquee attempt
    significantMarqueeOccurred = false;
    marqueeJustFinishedOnDesktop = false; // This flag is primarily set in endMarquee

    isMarqueeSelecting = true;
    desktopRectCache = desktopElement.getBoundingClientRect();

    const desktopStyle = window.getComputedStyle(desktopElement);
    const paddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(desktopStyle.paddingTop) || 0;

    marqueeStartX = event.clientX - desktopRectCache.left - paddingLeft;
    marqueeStartY = event.clientY - desktopRectCache.top - paddingTop;

    marqueeElement = document.createElement('div');
    marqueeElement.className = 'marquee-select-box'; // Ensure this class is styled in CSS
    marqueeElement.style.left = `${marqueeStartX}px`;
    marqueeElement.style.top = `${marqueeStartY}px`;
    marqueeElement.style.width = '0px';
    marqueeElement.style.height = '0px';
    desktopElement.appendChild(marqueeElement);

    clearSelection(); // Always clear previous icon selections when starting a marquee
    document.body.classList.add('no-select'); // Prevent text selection during marquee
    desktopElement.setPointerCapture(event.pointerId); // Capture pointer events on the desktop
}

function updateMarquee(event) {
    if (!isMarqueeSelecting || !marqueeElement) return;

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

    if (newWidth > 5 || newHeight > 5) { // Threshold for visual marquee
        significantMarqueeOccurred = true;
    }

    const marqueeRect = marqueeElement.getBoundingClientRect();
    let iconsWereSelectedThisUpdate = false;
    allDesktopIcons.forEach(icon => {
        const iconRect = icon.getBoundingClientRect(); // Get live rect of each icon
        if (isIntersecting(marqueeRect, iconRect)) {
            if (!selectedIcons.has(icon)) {
                selectedIcons.add(icon);
                icon.classList.add('selected');
                if (window.IconSelectionEffect && typeof window.IconSelectionEffect.applySelectionEffect === 'function') {
                    window.IconSelectionEffect.applySelectionEffect(icon.querySelector('img'));
                }
                iconsWereSelectedThisUpdate = true;
            }
        } else {
            if (selectedIcons.has(icon)) {
                selectedIcons.delete(icon);
                icon.classList.remove('selected');
                if (window.IconSelectionEffect && typeof window.IconSelectionEffect.removeSelectionEffect === 'function') {
                    window.IconSelectionEffect.removeSelectionEffect(icon.querySelector('img'));
                }
            }
        }
    });
    if (iconsWereSelectedThisUpdate) {
        significantMarqueeOccurred = true; // Selecting icons also makes it significant
    }
}

function endMarquee(event) {
    if (!isMarqueeSelecting) return;

    desktopElement.releasePointerCapture(event.pointerId);
    if (marqueeElement) {
        const marqueeWidth = parseFloat(marqueeElement.style.width) || 0;
        const marqueeHeight = parseFloat(marqueeElement.style.height) || 0;
        if (marqueeWidth > 5 || marqueeHeight > 5) {
            significantMarqueeOccurred = true;
        }
        marqueeElement.remove();
        marqueeElement = null;
    }
    document.body.classList.remove('no-select');
    isMarqueeSelecting = false;

    if (selectedIcons.size > 0) { // If any icons are selected by the end, it was significant
        significantMarqueeOccurred = true;
    }

    if (event.target === desktopElement) {
        marqueeJustFinishedOnDesktop = true;
        // The click listener will use marqueeJustFinishedOnDesktop and significantMarqueeOccurred
    }
}

function isIntersecting(rectA, rectB) {
    return !(rectA.right < rectB.left ||
             rectA.left > rectB.right ||
             rectA.bottom < rectB.top ||
             rectA.top > rectB.bottom);
}

// --- Dragging Logic ---
function startIconDrag(event, iconElement) {
    if (event.button !== 0) return; // Only left click

    hasDragged = false; // Reset drag flag
    primaryDraggedIcon = iconElement;
    desktopRectCache = desktopElement.getBoundingClientRect(); // Cache for drag calculations

    // Selection logic:
    // If Ctrl is not pressed and the clicked icon is not already selected, clear previous and select current.
    if (!event.ctrlKey && !selectedIcons.has(iconElement)) {
        clearSelection();
        selectIcon(iconElement);
    } else if (event.ctrlKey && !selectedIcons.has(iconElement)) {
        // If Ctrl is pressed and icon is not selected, add it to selection.
        selectIcon(iconElement, true); // isAdditive = true
    }
    // If Ctrl is pressed and icon IS selected, it remains selected (toggleSelectIcon handles removal on click if needed, but here we start drag)
    // If no Ctrl and icon IS selected, it remains selected as part of the group.

    isDraggingGroup = selectedIcons.size > 0; // Dragging whatever is selected

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
        const originalInlinePosition = icon.style.position; // Store original inline style
        const originalInlineMargin = icon.style.margin;   // Store original inline style

        // If icon was in flow layout, convert to absolute for dragging
        if (iconStyle.position !== 'absolute') {
            wasFlowLayout = true;
            const rect = icon.getBoundingClientRect(); // Get its position before changing
            icon.style.position = 'absolute';
            icon.style.left = `${rect.left - desktopRectCache.left - desktopPaddingLeft}px`;
            icon.style.top = `${rect.top - desktopRectCache.top - desktopPaddingTop}px`;
            icon.style.margin = '0'; // Remove flow margins
            if (!icon.classList.contains('is-positioned')) { // Mark as positioned
                icon.classList.add('is-positioned');
            }
        }
        draggedItemsInitialStates.set(icon, {
            x: icon.offsetLeft,
            y: icon.offsetTop,
            zIndex: icon.style.zIndex || '', // Store original zIndex
            wasFlowLayout: wasFlowLayout,
            originalInlinePosition: originalInlinePosition, // Keep for potential revert
            originalInlineMargin: originalInlineMargin     // Keep for potential revert
        });
        icon.style.zIndex = '10000'; // Bring to front while dragging
    });

    document.body.classList.add('no-select');
    primaryDraggedIcon.setPointerCapture(event.pointerId);
}

function processDrag(event) {
    if (!primaryDraggedIcon) return;

    if (!hasDragged && (Math.abs(event.movementX) > 2 || Math.abs(event.movementY) > 2)) {
        hasDragged = true; // Confirmed drag, not just a click
    }
    if (!hasDragged) return; // Don't process minor movements as drag yet

    const desktopStyle = window.getComputedStyle(desktopElement);
    const desktopPaddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
    const desktopPaddingTop = parseFloat(desktopStyle.paddingTop) || 0;

    // Use SnapToGrid metrics if available for boundary checks
    const iconAreaMetrics = (window.SnapToGrid && typeof window.SnapToGrid.getDesktopIconAreaMetrics === 'function') ?
                            window.SnapToGrid.getDesktopIconAreaMetrics(desktopElement) :
                            { iconAreaOffsetX: 0, iconAreaOffsetY: 0, contentWidthForGrid: desktopElement.clientWidth, contentHeightForGrid: desktopElement.clientHeight };

    const draggableWidth = iconAreaMetrics.iconAreaOffsetX + iconAreaMetrics.contentWidthForGrid;
    const draggableHeight = iconAreaMetrics.iconAreaOffsetY + iconAreaMetrics.contentHeightForGrid;
    const minX = iconAreaMetrics.iconAreaOffsetX;
    const minY = iconAreaMetrics.iconAreaOffsetY;


    // Calculate new position for the primary dragged icon
    let newPrimaryX = event.clientX - desktopRectCache.left - desktopPaddingLeft - dragOffsetX;
    let newPrimaryY = event.clientY - desktopRectCache.top - desktopPaddingTop - dragOffsetY;

    // Constrain primary icon within desktop boundaries
    newPrimaryX = Math.max(minX, Math.min(newPrimaryX, draggableWidth - primaryDraggedIcon.offsetWidth));
    newPrimaryY = Math.max(minY, Math.min(newPrimaryY, draggableHeight - primaryDraggedIcon.offsetHeight));

    const primaryInitialState = draggedItemsInitialStates.get(primaryDraggedIcon);
    if (!primaryInitialState) return; // Should not happen
    const deltaX = newPrimaryX - primaryInitialState.x;
    const deltaY = newPrimaryY - primaryInitialState.y;

    // Move all selected icons by the same delta
    selectedIcons.forEach(icon => {
        const initialState = draggedItemsInitialStates.get(icon);
        if (!initialState) return;

        let newX = initialState.x + deltaX;
        let newY = initialState.y + deltaY;

        // Constrain each icon within desktop boundaries
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

    if (hasDragged) { // If a drag actually occurred
        draggedItemsInitialStates.forEach((state, icon) => {
            icon.style.zIndex = state.zIndex; // Restore original zIndex
            const appId = icon.dataset.appId;
            if (appId) {
                saveIconPosition(appId, icon.offsetLeft, icon.offsetTop);
            }
            // Ensure it's marked as positioned after dragging
            if (!icon.classList.contains('is-positioned')) {
                 icon.classList.add('is-positioned');
            }
        });
    } else { // If it was just a click (or very minor movement treated as click)
        // Revert any temporary style changes made in startIconDrag IF it was a flow layout item
        draggedItemsInitialStates.forEach((state, icon) => {
            icon.style.zIndex = state.zIndex; // Restore zIndex
            if (state.wasFlowLayout) {
                icon.style.position = state.originalInlinePosition || ''; // Revert to original e.g. 'relative' or ''
                icon.style.left = '';   // Clear absolute positioning
                icon.style.top = '';    // Clear absolute positioning
                icon.style.margin = state.originalInlineMargin || ''; // Revert margin
                icon.classList.remove('is-positioned'); // No longer absolutely positioned by drag

                // Clean up empty style attributes
                if (!icon.style.position) icon.style.removeProperty('position');
                if (!icon.style.margin) icon.style.removeProperty('margin');
            }
        });
        // Handle click-based selection (toggle if Ctrl, regular select if not)
        // This part is tricky because startIconDrag already handled initial selection.
        // If !hasDragged, it implies the click was meant for selection adjustment.
        if (event.ctrlKey) {
            // toggleSelectIcon(primaryDraggedIcon); // This was already handled effectively by startIconDrag
        } else {
            // selectIcon(primaryDraggedIcon); // This was also handled by startIconDrag
        }
    }

    primaryDraggedIcon = null;
    isDraggingGroup = false;
    draggedItemsInitialStates.clear();
    // hasDragged is reset at the start of the next pointerdown
}

// --- Event Handlers Attachments ---
function onIconPointerDown(event) {
    const iconElement = event.currentTarget;
    // hasDragged is reset here for icon drag start
    hasDragged = false;

    // If it's a right-click, or if a context menu is already open, bail for now
    // Context menu logic should handle its own interactions.
    if (event.button === 2 || document.querySelector('.desktop-context-menu.visible')) {
        return;
    }

    // The actual selection logic is now better handled inside startIconDrag based on Ctrl key
    // to correctly form the group *before* calculating offsets.
    // If not Ctrl and not already selected, clear+select happens in startIconDrag.
    // If Ctrl, toggle happens in startIconDrag (though toggleSelectIcon not directly called there).
    // Here, we mostly ensure that the drag process begins.
    startIconDrag(event, iconElement);
    event.stopPropagation(); // Stop propagation to prevent desktop marquee if click is on an icon
}

function onDesktopPointerDown(event) {
    if (event.target === desktopElement) { // Only if the click is directly on the desktop
        if (event.button === 0) { // Only left click for marquee
            startMarquee(event);
        }
        // For other clicks (e.g. right-click for context menu), they are handled by other listeners
        // or default browser behavior if not captured.
    }
    // If click is on an icon, onIconPointerDown will handle it and stop propagation.
}

function onDocumentPointerMove(event) {
    if (isMarqueeSelecting) {
        updateMarquee(event);
    } else if (primaryDraggedIcon) {
        processDrag(event);
    }
}

function onDocumentPointerUp(event) { // This handles pointerup for both marquee and icon drag
    if (isMarqueeSelecting) {
        endMarquee(event);
    } else if (primaryDraggedIcon) {
        endIconDrag(event);
    }
    // Flags marqueeJustFinishedOnDesktop and significantMarqueeOccurred are set within endMarquee
    // The global click listener will use them.
}

// --- Check and Snap Icons if Offscreen (on resize) ---
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

            const minX = iconAreaMetrics.iconAreaOffsetX;
            const minY = iconAreaMetrics.iconAreaOffsetY;
            const maxX = iconAreaMetrics.iconAreaOffsetX + iconAreaMetrics.contentWidthForGrid;
            const maxY = iconAreaMetrics.iconAreaOffsetY + iconAreaMetrics.contentHeightForGrid;

            if (iconLeft < minX || iconTop < minY || iconRight > maxX || iconBottom > maxY) {
                anIconIsOffscreen = true;
                break; // Found one, no need to check further
            }
        }
    }

    if (anIconIsOffscreen) {
        // console.log("An icon is offscreen, triggering snap to grid for all positioned icons.");
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
function initDesktopInteractions() {
    desktopElement = document.getElementById('desktop');
    if (!desktopElement) {
        console.error('DesktopInteractions: Desktop element (#desktop) not found.');
        return;
    }

    applyInitialPositions(); // Applies stored positions and populates allDesktopIcons

    allDesktopIcons.forEach(icon => {
        icon.addEventListener('pointerdown', onIconPointerDown);
        const img = icon.querySelector('img');
        if (img) img.addEventListener('dragstart', (e) => e.preventDefault()); // Prevent native image drag
    });

    desktopElement.addEventListener('pointerdown', onDesktopPointerDown);
    document.addEventListener('pointermove', onDocumentPointerMove);
    document.addEventListener('pointerup', onDocumentPointerUp);
    document.addEventListener('pointercancel', onDocumentPointerUp); // Handle cancel same as up

    // Global Click Listener (Capture Phase) - Refined
    document.addEventListener('click', function(event) {
        if (marqueeJustFinishedOnDesktop && event.target === desktopElement) {
            if (significantMarqueeOccurred) {
                // console.log('Click on desktop after SIGNIFICANT marquee. Stopping propagation.');
                event.stopImmediatePropagation();
            } else {
                // console.log('Click on desktop after NON-SIGNIFICANT marquee. Clearing selection, allowing propagation.');
                clearSelection(); // If it was a tiny marquee/click, clear selection from other interactions
            }
        }
        // Reset flags after this click event has been processed by all relevant listeners
        marqueeJustFinishedOnDesktop = false;
        significantMarqueeOccurred = false;
    }, true); // Use capture phase to act before other click listeners

    // Configure SnapToGrid if available
    if (window.SnapToGrid && typeof window.SnapToGrid.configure === 'function') {
        window.SnapToGrid.configure({
            gridSizeX: 85, // Example values, adjust as needed
            gridSizeY: 87,
            desktopPadding: 10 // Padding from desktop edges for icon placement
        });
    }

    // Initial check and setup for responsive snapping
    checkAndSnapIconsIfOffscreen();
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

    let iconsToProcess;
    if (selectedIcons.size > 0) {
        iconsToProcess = Array.from(selectedIcons);
    } else {
        // If no icons are selected, snap all icons that are currently absolutely positioned.
        // If none are positioned, snap ALL icons (useful for initial layout or after a reset).
        iconsToProcess = allDesktopIcons.filter(icon => icon.classList.contains('is-positioned'));
        if (iconsToProcess.length === 0) {
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

// --- DOM Ready ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDesktopInteractions);
} else {
    initDesktopInteractions(); // защиты от дурака (Handle if script loaded after DOMContentLoaded)
}
})();
