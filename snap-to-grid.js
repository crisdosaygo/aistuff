// snap-to-grid.js
(function(window) {
    'use strict';

    const DEFAULT_GRID_SIZE_X = 85; // Default horizontal grid size
    const DEFAULT_GRID_SIZE_Y = 87; // Default vertical grid size

    let config = {
        gridSizeX: DEFAULT_GRID_SIZE_X,
        gridSizeY: DEFAULT_GRID_SIZE_Y,
    };

    // --- Helper Functions ---

    function getDesktopMetrics(desktopElement) {
        const desktopStyle = window.getComputedStyle(desktopElement);
        const paddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
        const paddingTop = parseFloat(desktopStyle.paddingTop) || 0;
        const paddingRight = parseFloat(desktopStyle.paddingRight) || 0;
        const paddingBottom = parseFloat(desktopStyle.paddingBottom) || 0;

        const contentWidth = desktopElement.clientWidth - paddingLeft - paddingRight;
        const contentHeight = desktopElement.clientHeight - paddingTop - paddingBottom;

        const maxCols = Math.floor(contentWidth / config.gridSizeX);
        const maxRows = Math.floor(contentHeight / config.gridSizeY);
        
        return {
            paddingLeft,
            paddingTop,
            contentWidth,
            contentHeight,
            maxCols,
            maxRows
        };
    }

    /**
     * Calculates the grid cell {row, col} for a given pixel position.
     */
    function getCellFromPosition(x, y, desktopMetrics) {
        const col = Math.max(0, Math.min(desktopMetrics.maxCols - 1, Math.round(x / config.gridSizeX)));
        const row = Math.max(0, Math.min(desktopMetrics.maxRows - 1, Math.round(y / config.gridSizeY)));
        return { col, row };
    }

    /**
     * Builds a Set of occupied "row_col" strings for all icons *not* in the current snapping batch.
     */
    function getInitiallyOccupiedCells(allDesktopIcons, iconsBeingSnappedSet, desktopMetrics) {
        const occupied = new Set();
        allDesktopIcons.forEach(icon => {
            if (!iconsBeingSnappedSet.has(icon) && icon.classList.contains('is-positioned')) {
                // Only consider icons already positioned by us or via drag
                const { col, row } = getCellFromPosition(icon.offsetLeft, icon.offsetTop, desktopMetrics);
                occupied.add(`${row}_${col}`);
            }
        });
        return occupied;
    }

    /**
     * Finds the next available cell, starting from (targetRow, targetCol),
     * searching downwards, then wrapping to the next column top, etc.
     */
    function findNextAvailableCell(targetRow, targetCol, occupiedCells, desktopMetrics) {
        let r = targetRow;
        let c = targetCol;
        const { maxRows, maxCols } = desktopMetrics;

        // Safety break after checking all cells once
        for (let i = 0; i < maxRows * maxCols; i++) {
            if (!occupiedCells.has(`${r}_${c}`)) {
                return { row: r, col: c };
            }
            // Move down
            r++;
            if (r >= maxRows) {
                // Reached bottom of column, move to next column, top row
                r = 0;
                c++;
                if (c >= maxCols) {
                    // Reached end of all columns, wrap to first column
                    c = 0;
                }
            }
        }
        // console.warn("SnapToGrid: Could not find an available cell. Desktop might be full.");
        return null; // Or throw error, or return original target if all full
    }


    // --- Main Snapping Logic ---

    /**
     * Snaps a collection of icons to the grid, handling conflicts.
     * @param {HTMLElement[]} iconsToSnap - Array of icon elements to snap.
     * @param {HTMLElement[]} allDesktopIcons - All icons on the desktop (for occupancy check).
     * @param {HTMLElement} desktopElement - The desktop container element.
     * @param {function} savePositionFn - Function to call to save an icon's position.
     *                                     (e.g., (appId, x, y) => void)
     */
    function snapIconsToGrid(iconsToSnap, allDesktopIcons, desktopElement, savePositionFn) {
        if (!desktopElement || !iconsToSnap || iconsToSnap.length === 0) {
            // console.log("SnapToGrid: No desktop element or icons to snap.");
            return;
        }

        const desktopMetrics = getDesktopMetrics(desktopElement);
        const iconsBeingSnappedSet = new Set(iconsToSnap);
        
        // Get cells occupied by icons *not* part of the current snap batch
        const occupiedCells = getInitiallyOccupiedCells(allDesktopIcons, iconsBeingSnappedSet, desktopMetrics);

        // Sort icons by current visual position (top-then-left) to make deconfliction more predictable.
        // This helps if multiple selected icons are near each other.
        const sortedIconsToSnap = [...iconsToSnap].sort((a, b) => {
            if (a.offsetTop !== b.offsetTop) {
                return a.offsetTop - b.offsetTop;
            }
            return a.offsetLeft - b.offsetLeft;
        });

        sortedIconsToSnap.forEach(icon => {
            // Ensure icon is absolutely positioned
            if (!icon.classList.contains('is-positioned') && window.getComputedStyle(icon).position !== 'absolute') {
                const rect = icon.getBoundingClientRect();
                const parentRect = desktopElement.getBoundingClientRect();
                icon.style.position = 'absolute';
                icon.style.left = `${rect.left - parentRect.left - desktopMetrics.paddingLeft}px`;
                icon.style.top = `${rect.top - parentRect.top - desktopMetrics.paddingTop}px`;
                icon.style.margin = '0';
                icon.classList.add('is-positioned');
            }

            // Determine the icon's preferred grid cell based on its current position
            const preferredCell = getCellFromPosition(icon.offsetLeft, icon.offsetTop, desktopMetrics);
            
            // Find the actual cell to place it, resolving conflicts
            const finalCell = findNextAvailableCell(preferredCell.row, preferredCell.col, occupiedCells, desktopMetrics);

            if (finalCell) {
                let snappedX = finalCell.col * config.gridSizeX;
                let snappedY = finalCell.row * config.gridSizeY;

                // Ensure it stays within desktop boundaries after snapping (pixel-perfect for icon width/height)
                snappedX = Math.max(0, Math.min(snappedX, desktopMetrics.contentWidth - icon.offsetWidth));
                snappedY = Math.max(0, Math.min(snappedY, desktopMetrics.contentHeight - icon.offsetHeight));
                
                icon.style.left = `${snappedX}px`;
                icon.style.top = `${snappedY}px`;

                // Mark this cell as occupied for subsequent icons in *this snapping batch*
                occupiedCells.add(`${finalCell.row}_${finalCell.col}`);

                const appId = icon.dataset.appId;
                if (appId && typeof savePositionFn === 'function') {
                    savePositionFn(appId, snappedX, snappedY);
                }
            } else {
                // console.warn(`SnapToGrid: Could not place icon ${icon.dataset.appId || 'unknown'}, no available cell found.`);
                // Potentially leave icon as is, or move to a default "overflow" spot
            }
        });
    }

    // --- Public API ---
    const SnapToGrid = {
        /**
         * Configures the grid snapping behavior.
         * @param {object} newConfig - Configuration object.
         * @param {number} [newConfig.gridSizeX] - Horizontal grid cell size.
         * @param {number} [newConfig.gridSizeY] - Vertical grid cell size.
         */
        configure: function(newConfig) {
            if (newConfig) {
                if (typeof newConfig.gridSizeX === 'number') {
                    config.gridSizeX = newConfig.gridSizeX;
                }
                if (typeof newConfig.gridSizeY === 'number') {
                    config.gridSizeY = newConfig.gridSizeY;
                }
            }
        },

        /**
         * Snaps the provided icons to the grid.
         * @param {object} params
         * @param {HTMLElement[]} params.iconsToSnap - Array of icon elements to snap.
         * @param {HTMLElement[]} params.allDesktopIcons - All icons on the desktop.
         * @param {HTMLElement} params.desktopElement - The desktop container element.
         * @param {function} params.savePositionFn - Function to save icon positions.
         */
        snap: function(params) {
            snapIconsToGrid(
                params.iconsToSnap,
                params.allDesktopIcons,
                params.desktopElement,
                params.savePositionFn
            );
        }
    };

    // Expose to global window object (or use a module system if available)
    window.SnapToGrid = SnapToGrid;

})(window);
