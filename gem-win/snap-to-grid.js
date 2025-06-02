// snap-to-grid.js
(function(window) {
    'use strict';

    const DEFAULT_GRID_SIZE_X = 85;
    const DEFAULT_GRID_SIZE_Y = 87;
    const DEFAULT_DESKTOP_PADDING = 5; // New: Padding around the desktop for icons

    let config = {
        gridSizeX: DEFAULT_GRID_SIZE_X,
        gridSizeY: DEFAULT_GRID_SIZE_Y,
        desktopPadding: DEFAULT_DESKTOP_PADDING // Store padding in config
    };

    // --- Helper Functions ---

    function getDesktopMetrics(desktopElement) {
        const desktopStyle = window.getComputedStyle(desktopElement);
        // These are the visual paddings of the desktop element itself
        const visualPaddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
        const visualPaddingTop = parseFloat(desktopStyle.paddingTop) || 0;
        const visualPaddingRight = parseFloat(desktopStyle.paddingRight) || 0;
        const visualPaddingBottom = parseFloat(desktopStyle.paddingBottom) || 0;

        // Effective area for icons, considering the configured internal padding
        const iconAreaPadding = config.desktopPadding;

        const totalHorizontalPadding = visualPaddingLeft + visualPaddingRight + (2 * iconAreaPadding);
        const totalVerticalPadding = visualPaddingTop + visualPaddingBottom + (2 * iconAreaPadding);

        // The contentWidth/Height for icon placement starts *after* the visual padding AND our internal iconAreaPadding
        const contentWidthForIcons = desktopElement.clientWidth - totalHorizontalPadding;
        const contentHeightForIcons = desktopElement.clientHeight - totalVerticalPadding;
        
        const maxCols = Math.max(1, Math.floor(contentWidthForIcons / config.gridSizeX));
        const maxRows = Math.max(1, Math.floor(contentHeightForIcons / config.gridSizeY));

        return {
            // Offset for placing icons: visual padding + our internal icon area padding
            iconAreaOffsetX: visualPaddingLeft + iconAreaPadding,
            iconAreaOffsetY: visualPaddingTop + iconAreaPadding,
            // Actual width/height available for the grid of icons
            contentWidthForGrid: contentWidthForIcons,
            contentHeightForGrid: contentHeightForIcons,
            maxCols,
            maxRows
        };
    }

    /**
     * Calculates the grid cell {row, col} for a given pixel position (relative to desktop's padded content box).
     */
    function getCellFromPosition(x, y, desktopMetrics) {
        // Adjust x, y to be relative to the start of the icon grid area
        const xInGrid = x - desktopMetrics.iconAreaOffsetX;
        const yInGrid = y - desktopMetrics.iconAreaOffsetY;

        const col = Math.max(0, Math.min(desktopMetrics.maxCols - 1, Math.round(xInGrid / config.gridSizeX)));
        const row = Math.max(0, Math.min(desktopMetrics.maxRows - 1, Math.round(yInGrid / config.gridSizeY)));
        return { col, row };
    }

    /**
     * Builds a Set of occupied "row_col" strings for all icons *not* in the current snapping batch.
     */
    function getInitiallyOccupiedCells(allDesktopIcons, iconsBeingSnappedSet, desktopMetrics) {
        const occupied = new Set();
        allDesktopIcons.forEach(icon => {
            if (!iconsBeingSnappedSet.has(icon) && icon.classList.contains('is-positioned')) {
                const { col, row } = getCellFromPosition(icon.offsetLeft, icon.offsetTop, desktopMetrics);
                occupied.add(`${row}_${col}`);
            }
        });
        return occupied;
    }

    /**
     * Finds the next available cell.
     */
    function findNextAvailableCell(targetRow, targetCol, occupiedCells, desktopMetrics) {
        let r = Math.max(0, Math.min(targetRow, desktopMetrics.maxRows - 1)); // Clamp initial row
        let c = Math.max(0, Math.min(targetCol, desktopMetrics.maxCols - 1)); // Clamp initial col
        const { maxRows, maxCols } = desktopMetrics;

        for (let i = 0; i < maxRows * maxCols; i++) {
            if (!occupiedCells.has(`${r}_${c}`)) {
                return { row: r, col: c };
            }
            r++;
            if (r >= maxRows) {
                r = 0;
                c++;
                if (c >= maxCols) {
                    c = 0;
                }
            }
        }
        return null;
    }


    // --- Main Snapping Logic ---
    function snapIconsToGrid(iconsToSnap, allDesktopIcons, desktopElement, savePositionFn) {
        if (!desktopElement || !iconsToSnap || iconsToSnap.length === 0) {
            return;
        }

        const desktopMetrics = getDesktopMetrics(desktopElement);
        if (desktopMetrics.maxCols <= 0 || desktopMetrics.maxRows <= 0) {
            console.warn("SnapToGrid: Not enough space on desktop for even one icon cell with current padding.");
            // Optionally, force icons to 0,0 or handle differently
            iconsToSnap.forEach(icon => {
                icon.style.left = `${desktopMetrics.iconAreaOffsetX}px`;
                icon.style.top = `${desktopMetrics.iconAreaOffsetY}px`;
                 if (icon.dataset.appId && typeof savePositionFn === 'function') {
                    savePositionFn(icon.dataset.appId, desktopMetrics.iconAreaOffsetX, desktopMetrics.iconAreaOffsetY);
                }
            });
            return;
        }

        const iconsBeingSnappedSet = new Set(iconsToSnap);
        const occupiedCells = getInitiallyOccupiedCells(allDesktopIcons, iconsBeingSnappedSet, desktopMetrics);

        const sortedIconsToSnap = [...iconsToSnap].sort((a, b) => {
            // Sort by current on-screen position primarily, then by original DOM order as fallback
            const aIsPositioned = a.classList.contains('is-positioned');
            const bIsPositioned = b.classList.contains('is-positioned');

            if (aIsPositioned && bIsPositioned) {
                 if (a.offsetTop !== b.offsetTop) return a.offsetTop - b.offsetTop;
                 return a.offsetLeft - b.offsetLeft;
            } else if (aIsPositioned) {
                return -1; // Positioned icons first
            } else if (bIsPositioned) {
                return 1;
            }
            // If neither is positioned, maintain original order (or could use data-app-id)
            return 0; 
        });

        sortedIconsToSnap.forEach(icon => {
            const iconRect = icon.getBoundingClientRect(); // Get this once
            const parentRect = desktopElement.getBoundingClientRect();

            if (!icon.classList.contains('is-positioned') || window.getComputedStyle(icon).position !== 'absolute') {
                icon.style.position = 'absolute';
                // Calculate position relative to desktop's content box (ignoring desktop's own CSS padding)
                icon.style.left = `${iconRect.left - parentRect.left - (parseFloat(window.getComputedStyle(desktopElement).paddingLeft) || 0)}px`;
                icon.style.top = `${iconRect.top - parentRect.top - (parseFloat(window.getComputedStyle(desktopElement).paddingTop) || 0)}px`;
                icon.style.margin = '0';
                icon.classList.add('is-positioned');
            }

            const preferredCell = getCellFromPosition(icon.offsetLeft, icon.offsetTop, desktopMetrics);
            const finalCell = findNextAvailableCell(preferredCell.row, preferredCell.col, occupiedCells, desktopMetrics);

            if (finalCell) {
                // Calculate snappedX/Y relative to the start of the icon grid area
                let snappedX = desktopMetrics.iconAreaOffsetX + (finalCell.col * config.gridSizeX);
                let snappedY = desktopMetrics.iconAreaOffsetY + (finalCell.row * config.gridSizeY);

                // Ensure icon (its top-left corner) doesn't go outside the overall desktop content area
                // (This is a fallback, grid logic should prevent this if maxCols/Rows are correct)
                snappedX = Math.max(desktopMetrics.iconAreaOffsetX, snappedX);
                snappedY = Math.max(desktopMetrics.iconAreaOffsetY, snappedY);
                
                // Also ensure the icon's right/bottom edge doesn't exceed the icon area
                snappedX = Math.min(snappedX, desktopMetrics.iconAreaOffsetX + desktopMetrics.contentWidthForGrid - icon.offsetWidth);
                snappedY = Math.min(snappedY, desktopMetrics.iconAreaOffsetY + desktopMetrics.contentHeightForGrid - icon.offsetHeight);


                icon.style.left = `${snappedX}px`;
                icon.style.top = `${snappedY}px`;
                occupiedCells.add(`${finalCell.row}_${finalCell.col}`);

                const appId = icon.dataset.appId;
                if (appId && typeof savePositionFn === 'function') {
                    savePositionFn(appId, snappedX, snappedY);
                }
            }
        });
    }

    // --- Public API ---
    const SnapToGrid = {
        configure: function(newConfig) {
            if (newConfig) {
                if (typeof newConfig.gridSizeX === 'number') config.gridSizeX = newConfig.gridSizeX;
                if (typeof newConfig.gridSizeY === 'number') config.gridSizeY = newConfig.gridSizeY;
                if (typeof newConfig.desktopPadding === 'number') config.desktopPadding = newConfig.desktopPadding;
            }
        },
        snap: function(params) {
            snapIconsToGrid(
                params.iconsToSnap,
                params.allDesktopIcons,
                params.desktopElement,
                params.savePositionFn
            );
        },
        // Expose for checking off-screen status
        getDesktopIconAreaMetrics: function(desktopEl) {
            return getDesktopMetrics(desktopEl || document.getElementById('desktop'));
        }
    };
    window.SnapToGrid = SnapToGrid;
})(window);
