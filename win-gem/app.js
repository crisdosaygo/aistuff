// app.js

import {BrowserApp} from './browser.js';
import { networkExplorerAppDefinition } from './network-explorer.js'; // ADD THIS
import { myComputerAppDefinition } from './my-computer.js';
import { notepadAppDefinition } from './notepad.js';
import { calculatorAppDefinition } from './calculator.js';

// windows awesome
const APP_DEFINITIONS = {
    networkExplorer: networkExplorerAppDefinition, // ADD THIS
    myComputer: myComputerAppDefinition,
    notepad: notepadAppDefinition,
    recycleBin: {
        title: "Recycle Bin",
        icon: "https://win98icons.alexmeub.com/icons/png/recycle_bin_empty-0.png",
        iconFull: "https://win98icons.alexmeub.com/icons/png/recycle_bin_full_cool-0.png",
        content: () => `<div style="padding:10px; text-align:center; flex-grow:1; display:flex; flex-direction:column; justify-content:center; align-items:center; background:white;"><img src="https://win98icons.alexmeub.com/icons/png/recycle_bin_empty_cool-0.png" style="width:48px; height:48px; display:block; margin-bottom:10px;"><p>Recycle Bin is empty.</p></div>`
    },
    calculator: calculatorAppDefinition,
    shutdownDialog: {
        title: "Shut Down Windows",
        icon: "https://win98icons.alexmeub.com/icons/png/shut_down_cool-0.png",
        isDialog: true,
        content: () => `
            <div style="text-align: center; padding: 20px 20px 10px 20px; background: #c0c0c0; height:100%; display:flex; flex-direction:column; justify-content:space-around;">
                <div>
                    <img src="https://win98icons.alexmeub.com/icons/png/computer_shut_down_cool-2.png" alt="Shut down" style="width: 32px; height: 32px; margin-bottom: 15px; float:left; margin-right:15px;">
                    <p style="text-align:left; margin-top:0;">Are you sure you want to:</p>
                    <div style="margin-bottom: 20px; text-align:left;">
                        <label style="display:block; margin-bottom:5px;"><input type="radio" name="shutdownAction" value="shutdown" checked> Shut down the computer?</label>
                        <label style="display:block; margin-bottom:5px;"><input type="radio" name="shutdownAction" value="restart"> Restart the computer?</label>
                        <label style="display:block;"><input type="radio" name="shutdownAction" value="msdos"> Restart in MS-DOS mode?</label>
                    </div>
                </div>
                <div style="display:flex; justify-content:center;">
                    <button class="win95-button" onclick="alert('Okay, performing action... (not really!)'); this.closest('.window').querySelector('.window-close-btn').click();">Yes</button>
                    <button class="win95-button" onclick="this.closest('.window').querySelector('.window-close-btn').click();">No</button>
                    <button class="win95-button" onclick="alert('Help not available for shutdown.');">Help</button>
                </div>
            </div>
        `
    },
    internetBrowser: {
        netscape: true,
        title: "Internet Browser",
        icon: "https://win98icons.alexmeub.com/icons/png/search_web-0.png",
        defaultWidth: 700,
        defaultHeight: 500,
        generateContent: (windowInstanceId, webviewId) => BrowserApp.generateInitialHTML(webviewId),
        initApp: (windowEl, windowInstanceId, webviewId, appDefinition) => {
            return new BrowserApp(windowEl, windowInstanceId, webviewId, appDefinition.netscape, appDefinition);
        }
    },
    internetExplorer: {
        netscape: false,
        title: "Internet Explorer",
        icon: "https://win98icons.alexmeub.com/icons/png/msie2-0.png",
        defaultWidth: 700,
        defaultHeight: 500,
        generateContent: (windowInstanceId, webviewId) => BrowserApp.generateInitialHTML(webviewId),
        initApp: (windowEl, windowInstanceId, webviewId, appDefinition) => {
            return new BrowserApp(windowEl, windowInstanceId, webviewId, appDefinition.netscape, appDefinition);
        }
    },
    netscapeNavigator: {
        netscape: true,
        title: "Netscape Navigator",
        icon: "./n2-2.png",
        defaultWidth: 700,
        defaultHeight: 500,
        generateContent: (windowInstanceId, webviewId) => BrowserApp.generateInitialHTML(webviewId),
        initApp: (windowEl, windowInstanceId, webviewId, appDefinition) => {
            return new BrowserApp(windowEl, windowInstanceId, webviewId, appDefinition.netscape, appDefinition);
        }
    },
};

// --- Utility: Debounce ---
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


document.addEventListener('DOMContentLoaded', () => {
    const clockElement = document.getElementById('clock');
    const startButton = document.getElementById('startButton');
    const startMenu = document.getElementById('startMenu');
    const desktop = document.getElementById('desktop');
    const windowTemplate = document.getElementById('windowTemplate');
    const taskbarWindows = document.getElementById('taskbarWindows');

    let highestZIndex = 100;
    let openWindows = {};
    let windowIdCounter = 0;

    window.openWindows = openWindows;
    window.focusWindow = focusWindow; // Expose focusWindow if needed by Network Explorer

    // --- Keep Windows On Screen ---
    function keepAllWindowsOnScreen() {
        if (!desktop) return;
        const desktopWidth = desktop.clientWidth;
        const desktopHeight = desktop.clientHeight;

        Object.values(openWindows).forEach(winData => {
            if (!winData || !winData.element || winData.isMinimized || winData.isMaximized) {
                return;
            }

            const windowEl = winData.element;
            let currentLeft = windowEl.offsetLeft;
            let currentTop = windowEl.offsetTop;
            const currentWidth = windowEl.offsetWidth;
            const currentHeight = windowEl.offsetHeight;

            let newLeft = currentLeft;
            let newTop = currentTop;

            // Adjust if window is beyond right edge
            if (newLeft + currentWidth > desktopWidth) {
                newLeft = desktopWidth - currentWidth;
            }
            // Adjust if window is beyond bottom edge
            if (newTop + currentHeight > desktopHeight) {
                newTop = desktopHeight - currentHeight;
            }
            // Ensure window is not off the left or top edge (pulls it to 0,0 if too large)
            if (newLeft < 0) {
                newLeft = 0;
            }
            if (newTop < 0) {
                newTop = 0;
            }

            if (newLeft !== currentLeft || newTop !== currentTop) {
                windowEl.style.left = newLeft + 'px';
                windowEl.style.top = newTop + 'px';

                // Update originalRect so maximize/restore works correctly from new position
                // and subsequent drags/resizes use this as a base.
                if (winData.originalRect) {
                    winData.originalRect.left = windowEl.style.left;
                    winData.originalRect.top = windowEl.style.top;
                    // Do NOT change originalRect.width/height here, only position
                }
            }
        });
    }

    // --- Debounced Resize Handler ---
    const debouncedKeepOnScreen = debounce(keepAllWindowsOnScreen, 250);

    if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(debouncedKeepOnScreen);
        resizeObserver.observe(desktop);
    } else {
        // Fallback for older browsers
        window.addEventListener('resize', debouncedKeepOnScreen);
    }


    // --- Clock ---
    function updateClock() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = (hours % 12) || 12;
        clockElement.textContent = `${displayHours}:${minutes} ${ampm}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // --- Start Menu ---
    startButton.addEventListener('click', (event) => {
        event.stopPropagation();
        startMenu.style.display = startMenu.style.display === 'flex' ? 'none' : 'flex';
        startButton.style.borderStyle = (startMenu.style.display === 'flex') ? 'inset' : 'outset';
    });

    document.addEventListener('click', (event) => {
        if (startMenu.style.display === 'flex' && !startMenu.contains(event.target) && !startButton.contains(event.target)) {
            startMenu.style.display = 'none';
            startButton.style.borderStyle = 'outset';
        }
        if (event.target === desktop || event.target.closest('.taskbar')) {
            if (!event.target.closest('.desktop-icon')) {
                 deselectAllDesktopIcons();
            }
        }
    });

    // --- Desktop Icon Selection ---
    function deselectAllDesktopIcons() {
        document.querySelectorAll('.desktop-icon.selected').forEach(icon => {
            icon.classList.remove('selected');
        });
    }

    // --- Window Management ---
    function createWindow(appId, dataForApp) {
        startMenu.style.display = 'none';
        startButton.style.borderStyle = 'outset';

        const appDef = APP_DEFINITIONS[appId];
        if (!appDef) {
            console.error("App definition not found for:", appId);
            return;
        }

        if (!appDef.isDialog) {
            const existingInstance = Object.values(openWindows).find(ow => ow.appId === appId && ow.element && document.body.contains(ow.element));
            if (existingInstance) {
                if (existingInstance.isMinimized) {
                    toggleMinimizeWindow(existingInstance.element);
                } else {
                    focusWindow(existingInstance.element);
                }
                return;
            }
        }

        let appInstanceSpecificData = null;
        if (appId === 'networkExplorer') {
            appInstanceSpecificData = createWindow; // Pass the createWindow function itself
        }

        const windowInstanceId = `window-${appId}-${windowIdCounter++}`;
        const windowEl = windowTemplate.content.firstElementChild.cloneNode(true);
        windowEl.dataset.appId = appId;
        windowEl.dataset.instanceId = windowInstanceId;

        windowEl.querySelector('.window-titlebar-icon').src = appDef.icon;
        windowEl.querySelector('.window-titlebar-icon').alt = appDef.title;
        windowEl.querySelector('.window-title').textContent = appDef.netscape ? 'Netscape Navigator' : appDef.title;

        let webviewId = null;
        if (appId === 'internetBrowser' || (appDef.generateContent && appDef.title === "Internet Browser")) {
            webviewId = `webview-${windowInstanceId}`;
        }

        if (appDef.generateContent && typeof appDef.generateContent === 'function') {
            windowEl.querySelector('.window-content').innerHTML = appDef.generateContent(windowInstanceId, webviewId);
        } else {
            windowEl.querySelector('.window-content').innerHTML = typeof appDef.content === 'function' ? appDef.content() : appDef.content;
        }

        let defaultWidth = appDef.defaultWidth || (appDef.isDialog ? 380 : 450);
        let defaultHeight = appDef.defaultHeight || (appDef.isDialog ? 220 : 300);

        windowEl.style.width = `${defaultWidth}px`;
        windowEl.style.height = `${defaultHeight}px`;

        if (appDef.isDialog) {
            windowEl.style.minWidth = appDef.minWidth || '300px';
            windowEl.style.minHeight = appDef.minHeight || '180px';
            windowEl.style.left = `${Math.max(0, (desktop.offsetWidth - defaultWidth) / 2)}px`;
            windowEl.style.top = `${Math.max(0, (desktop.offsetHeight - defaultHeight) / 3)}px`;
        } else {
            windowEl.style.left = `${Math.floor(Math.random() * Math.max(0, (desktop.offsetWidth - defaultWidth - 40))) + 20}px`;
            windowEl.style.top = `${Math.floor(Math.random() * Math.max(0, (desktop.offsetHeight - defaultHeight - 40))) + 20}px`;
        }

        highestZIndex++;
        windowEl.style.zIndex = highestZIndex;
        desktop.appendChild(windowEl);

        Object.values(openWindows).forEach(ow => {
            if (ow.element) {
                ow.element.classList.add('inactive');
            }
        });

        const newWindowData = {
            element: windowEl,
            taskbarButton: null,
            appId: appId,
            originalRect: {
                left: windowEl.style.left,
                top: windowEl.style.top,
                width: windowEl.style.width,
                height: windowEl.style.height
            },
            isMinimized: false,
            isMaximized: false,
            appInstance: null
        };
        openWindows[windowInstanceId] = newWindowData;

        if (appDef.initApp && typeof appDef.initApp === 'function') {
            newWindowData.appInstance = appDef.initApp(windowEl, windowInstanceId, webviewId, appDef, appInstanceSpecificData, dataForApp);
        }

        if (!appDef.isDialog) {
            makeDraggable(windowEl);
            makeResizable(windowEl);
            addWindowToTaskbar(windowEl, appDef.title, appDef.icon, windowInstanceId);
            windowEl.querySelector('.window-minimize-btn').addEventListener('click', () => toggleMinimizeWindow(windowEl));
            windowEl.querySelector('.window-maximize-btn').addEventListener('click', () => toggleMaximizeWindow(windowEl));
        } else {
            windowEl.querySelector('.window-minimize-btn').style.display = 'none';
            windowEl.querySelector('.window-maximize-btn').style.display = 'none';
            makeDraggable(windowEl);
        }

        windowEl.querySelector('.window-close-btn').addEventListener('click', () => closeWindow(windowEl));
        windowEl.addEventListener('mousedown', () => focusWindow(windowEl), true);

        focusWindow(windowEl);
        
        // Ensure the newly created window is on screen
        if (!newWindowData.isMinimized && !newWindowData.isMaximized) {
            keepSingleWindowOnScreen(windowEl, newWindowData);
        }

        if (dataForApp && dataForApp.navigateToUrl &&
            (appId === 'internetBrowser' || appId === 'internetExplorer' || appId === 'netscapeNavigator')) {

            // Need to wait for the browser app instance to be ready
            const checkBrowserReadyAndNavigate = () => {
                const winData = openWindows[windowInstanceId];
                if (winData && winData.appInstance && typeof winData.appInstance.navigateTo === 'function') {
                    winData.appInstance.navigateTo(dataForApp.navigateToUrl);
                } else if (winData && newWindowData.element && document.body.contains(newWindowData.element)) {
                    // If instance not ready yet, try again shortly
                    setTimeout(checkBrowserReadyAndNavigate, 200);
                }
            };
            setTimeout(checkBrowserReadyAndNavigate, 100); //
        }
        return windowEl;
    }

    // Helper to keep a single window on screen, used by createWindow
    function keepSingleWindowOnScreen(windowEl, winData) {
        if (!desktop || !windowEl || !winData) return;
        if (winData.isMinimized || winData.isMaximized) return;

        const desktopWidth = desktop.clientWidth;
        const desktopHeight = desktop.clientHeight;
        
        let currentLeft = windowEl.offsetLeft;
        let currentTop = windowEl.offsetTop;
        const currentWidth = windowEl.offsetWidth;
        const currentHeight = windowEl.offsetHeight;

        let newLeft = currentLeft;
        let newTop = currentTop;

        if (newLeft + currentWidth > desktopWidth) newLeft = desktopWidth - currentWidth;
        if (newTop + currentHeight > desktopHeight) newTop = desktopHeight - currentHeight;
        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;

        if (newLeft !== currentLeft || newTop !== currentTop) {
            windowEl.style.left = newLeft + 'px';
            windowEl.style.top = newTop + 'px';
            if (winData.originalRect) {
                winData.originalRect.left = windowEl.style.left;
                winData.originalRect.top = windowEl.style.top;
            }
        }
    }


    function makeResizable(element) {
        // console.log('Make resizable called', element); // For debugging
        const handles = element.querySelectorAll('.resize-handle');
        let isResizing = false;
        let currentHandle = null;
        let startX, startY, startWidth, startHeight, startLeft, startTop;

        const minWidth = parseInt(window.getComputedStyle(element).minWidth) || 150;
        const minHeight = parseInt(window.getComputedStyle(element).minHeight) || 100;

        handles.forEach(handle => {
            handle.addEventListener('pointerdown', (e) => {
                const windowData = openWindows[element.dataset.instanceId];
                // console.log('Mouse down on resize handle'); // For debugging
                if (windowData && windowData.isMaximized) return;

                e.stopPropagation();
                isResizing = true;
                // console.log('Resizing starting'); // For debugging
                currentHandle = handle;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = element.offsetWidth;
                startHeight = element.offsetHeight;
                startLeft = element.offsetLeft;
                startTop = element.offsetTop;

                focusWindow(element);
                document.body.style.cursor = window.getComputedStyle(currentHandle).cursor;
                document.body.classList.add('no-select'); // Add no-select
            });
        });

        // This is the global updateDragMove from your provided code
        globalThis.updateDragMove = (e) => {
            // console.log('Mouse moved during resize (globalThis.updateDragMove)'); // For debugging
            if (!isResizing || !currentHandle) return;
            e.preventDefault(); // This was in your provided code

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            if (currentHandle.classList.contains('resize-handle-e')) {
                newWidth = Math.max(minWidth, startWidth + dx);
            } else if (currentHandle.classList.contains('resize-handle-w')) {
                newWidth = Math.max(minWidth, startWidth - dx);
                newLeft = startLeft + dx;
                if (newWidth === minWidth) newLeft = startLeft + (startWidth - minWidth);
            }

            if (currentHandle.classList.contains('resize-handle-s')) {
                newHeight = Math.max(minHeight, startHeight + dy);
            } else if (currentHandle.classList.contains('resize-handle-n')) {
                newHeight = Math.max(minHeight, startHeight - dy);
                newTop = startTop + dy;
                if (newHeight === minHeight) newTop = startTop + (startHeight - minHeight);
            }

            if (currentHandle.classList.contains('resize-handle-se')) {
                newWidth = Math.max(minWidth, startWidth + dx);
                newHeight = Math.max(minHeight, startHeight + dy);
            } else if (currentHandle.classList.contains('resize-handle-sw')) {
                newWidth = Math.max(minWidth, startWidth - dx);
                newHeight = Math.max(minHeight, startHeight + dy);
                newLeft = startLeft + dx;
                if (newWidth === minWidth) newLeft = startLeft + (startWidth - minWidth);
            } else if (currentHandle.classList.contains('resize-handle-ne')) {
                newWidth = Math.max(minWidth, startWidth + dx);
                newHeight = Math.max(minHeight, startHeight - dy);
                newTop = startTop + dy;
                if (newHeight === minHeight) newTop = startTop + (startHeight - minHeight);
            } else if (currentHandle.classList.contains('resize-handle-nw')) {
                newWidth = Math.max(minWidth, startWidth - dx);
                newHeight = Math.max(minHeight, startHeight - dy);
                newLeft = startLeft + dx;
                newTop = startTop + dy;
                if (newWidth === minWidth) newLeft = startLeft + (startWidth - minWidth);
                if (newHeight === minHeight) newTop = startTop + (startHeight - minHeight);
            }

            const desktopRect = desktop.getBoundingClientRect();
            if (newLeft < 0) { newWidth += newLeft; newLeft = 0; }
            if (newTop < 0) { newHeight += newTop; newTop = 0; }
            if (newLeft + newWidth > desktopRect.width) { newWidth = desktopRect.width - newLeft; }
            if (newTop + newHeight > desktopRect.height) { newHeight = desktopRect.height - newTop; }

            element.style.width = `${newWidth}px`;
            element.style.height = `${newHeight}px`;
            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;
        };
        // This listener was inside makeResizable in your provided code,
        // effectively re-adding it for each window. It calls the global updateDragMove.
        document.addEventListener('pointermove', globalThis.updateDragMove);

        document.addEventListener('pointerup', () => { // Global listener
            if (isResizing) {
                isResizing = false;
                // console.log('Resizing complete'); // For debugging
                currentHandle = null;
                document.body.style.cursor = 'default';
                document.body.classList.remove('no-select'); // Remove no-select

                const windowData = openWindows[element.dataset.instanceId];
                if (windowData && !windowData.isMaximized) {
                    windowData.originalRect = {
                        left: element.style.left,
                        top: element.style.top,
                        width: element.style.width,
                        height: element.style.height,
                    };
                }
            }
        });
    }

    function focusWindow(windowEl) {
        if (!windowEl || !document.body.contains(windowEl)) return;
        const instanceId = windowEl.dataset.instanceId;
        const windowData = openWindows[instanceId];
        if (!windowData) return;

        if (windowData.isMinimized) {
            toggleMinimizeWindow(windowEl);
            return;
        }

        windowEl.classList.remove('inactive');
        Object.values(openWindows).forEach(ow => {
            if (ow.element && ow.element !== windowEl) {
                ow.element.classList.add('inactive');
            }
        });

        if (windowEl.hasAttribute('tabindex') && document.activeElement !== windowEl) {
            windowEl.focus({ preventScroll: true });
        }
        highestZIndex++;
        windowEl.style.zIndex = highestZIndex;

        document.querySelectorAll('.taskbar-button').forEach(btn => btn.classList.remove('active'));
        if (windowData.taskbarButton) {
            windowData.taskbarButton.classList.add('active');
            windowData.taskbarButton.classList.remove('minimized');
        }
        deselectAllDesktopIcons();
    }

    function closeWindow(windowEl) {
        const instanceId = windowEl.dataset.instanceId;
        if (openWindows[instanceId]) {
            if (openWindows[instanceId].taskbarButton) {
                openWindows[instanceId].taskbarButton.remove();
            }
            delete openWindows[instanceId];
        }
        windowEl.remove();
    }

    function addWindowToTaskbar(windowEl, title, iconSrc, instanceId) {
        const taskbarButton = document.createElement('button');
        taskbarButton.className = 'taskbar-button';
        taskbarButton.dataset.windowInstanceId = instanceId;

        const img = document.createElement('img');
        img.src = iconSrc;
        img.alt = "";
        taskbarButton.appendChild(img);

        const titleTextNode = document.createTextNode(title.length > 18 ? title.substring(0,15) + '...' : title);
        taskbarButton.appendChild(titleTextNode);

        taskbarButton.addEventListener('click', () => {
            const winData = openWindows[instanceId];
            if (winData) {
                if (winData.taskbarButton.classList.contains('active') && !winData.isMinimized) {
                    toggleMinimizeWindow(winData.element);
                } else {
                   focusWindow(winData.element);
                }
            }
        });
        taskbarWindows.appendChild(taskbarButton);
        openWindows[instanceId].taskbarButton = taskbarButton;
    }

    function makeDraggable(element) {
        const titleBar = element.querySelector('.window-titlebar');
        let offsetX, offsetY, isDragging = false;

        titleBar.addEventListener('pointerdown', (e) => {
            const windowData = openWindows[element.dataset.instanceId];
            if (windowData && windowData.isMaximized) return;
            if (e.target.closest('.window-controls button')) return;

            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
            titleBar.style.cursor = 'grabbing';
            document.body.classList.add('no-select'); // Add no-select
        });

        document.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            e.preventDefault(); // CORRECTED from e.preventdefault()

            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            const desktopRect = desktop.getBoundingClientRect();
            const winRect = element.getBoundingClientRect();

            newX = Math.max(0, Math.min(newX, desktopRect.width - winRect.width));
            newY = Math.max(0, Math.min(newY, desktopRect.height - winRect.height));

            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        });

        document.addEventListener('pointerup', () => {
            if (isDragging) {
                isDragging = false;
                titleBar.style.cursor = 'grab';
                document.body.classList.remove('no-select'); // Remove no-select

                // Update originalRect position after drag if not maximized
                const windowData = openWindows[element.dataset.instanceId];
                if (windowData && !windowData.isMaximized) {
                    windowData.originalRect.left = element.style.left;
                    windowData.originalRect.top = element.style.top;
                    // Width/height are not changed by drag, they remain from originalRect
                }
            }
        });
    }

    function toggleMinimizeWindow(windowEl) {
        const instanceId = windowEl.dataset.instanceId;
        const windowData = openWindows[instanceId];
        if (!windowData) return;

        windowData.isMinimized = !windowData.isMinimized;
        if (windowData.isMinimized) {
            if (!windowData.isMaximized) {
                 windowData.originalRectBeforeMinimize = { // Store current state before minimizing
                    left: windowEl.style.left,
                    top: windowEl.style.top,
                    width: windowEl.style.width,
                    height: windowEl.style.height
                };
            }
            windowEl.style.display = 'none';
            if (windowData.taskbarButton) {
                windowData.taskbarButton.classList.add('minimized');
                windowData.taskbarButton.classList.remove('active');
            }
        } else { // Un-minimizing
            windowEl.style.display = 'flex';
            if (windowData.originalRectBeforeMinimize && !windowData.isMaximized) {
                windowEl.style.left = windowData.originalRectBeforeMinimize.left;
                windowEl.style.top = windowData.originalRectBeforeMinimize.top;
                windowEl.style.width = windowData.originalRectBeforeMinimize.width;
                windowEl.style.height = windowData.originalRectBeforeMinimize.height;
            }
            // If it was maximized before minimizing, focusWindow will handle restoring maximized appearance
            // as isMaximized flag is still true.
            focusWindow(windowEl);
        }
    }

    function toggleMaximizeWindow(windowEl) {
        const instanceId = windowEl.dataset.instanceId;
        const windowData = openWindows[instanceId];
        if (!windowData || windowData.isMinimized) return;

        const maximizeBtn = windowEl.querySelector('.window-maximize-btn');
        const titleBar = windowEl.querySelector('.window-titlebar');

        if (windowData.isMaximized) {
            if (windowData.originalRect) {
                windowEl.style.left = windowData.originalRect.left;
                windowEl.style.top = windowData.originalRect.top;
                windowEl.style.width = windowData.originalRect.width;
                windowEl.style.height = windowData.originalRect.height;
            } else { // Fallback, should ideally not be needed if originalRect is always set
                const tempWidth = appDef.defaultWidth || 450; // Use appDef or general default
                const tempHeight = appDef.defaultHeight || 300;
                windowEl.style.left = `${(desktop.clientWidth - tempWidth) / 2}px`;
                windowEl.style.top = `${(desktop.clientHeight - tempHeight) / 3}px`;
                windowEl.style.width = `${tempWidth}px`;
                windowEl.style.height = `${tempHeight}px`;
            }
            windowData.isMaximized = false;
            windowEl.classList.remove('maximized');
            maximizeBtn.textContent = '1';
            maximizeBtn.title = 'Maximize';
            titleBar.style.cursor = 'grab';
        } else { // Maximizing
            // Store current normal state in originalRect before maximizing
            windowData.originalRect = {
                left: windowEl.style.left,
                top: windowEl.style.top,
                width: windowEl.style.width || `${windowEl.offsetWidth}px`,
                height: windowEl.style.height || `${windowEl.offsetHeight}px`
            };
            windowEl.style.left = '0px';
            windowEl.style.top = '0px';
            windowEl.style.width = `${desktop.clientWidth}px`;
            windowEl.style.height = `${desktop.clientHeight}px`;
            windowData.isMaximized = true;
            windowEl.classList.add('maximized');
            maximizeBtn.textContent = '2';
            maximizeBtn.title = 'Restore';
            titleBar.style.cursor = 'default';
        }
        focusWindow(windowEl);
    }

    document.querySelectorAll('.desktop-icon').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            deselectAllDesktopIcons();
            item.classList.add('selected');
        });
        item.addEventListener('dblclick', (e) => {
            const appId = item.dataset.appId;
            if (appId) createWindow(appId);
        });
    });

    document.querySelectorAll('.start-menu-item').forEach(item => {
         item.addEventListener('click', (e) => {
            if (item.classList.contains('disabled')) return;
            const appId = item.dataset.appId;
            if (item.id === 'shutdownButtonTrigger') {
                createWindow("shutdownDialog");
            } else if (appId) {
                createWindow(appId);
            }
        });
    });
});

window.addEventListener('message', ({isTrusted, data, origin}) => {
  if ( ! isTrusted ) return;
  const topOffset = window.screen.availHeight - window.visualViewport.height;
  const leftOffset = window.screen.availWidth - window.visualViewport.width;
  switch(data.type) {
    case "pointermove": {
      const {pointermove} = data;
      // const {clientX,clientY,pageX,pageY} = pointermove; // Original clientX/Y are fine
      pointermove.screenX -= window.screenX + leftOffset; // Adjust screenX/Y if needed by logic
      pointermove.screenY -= window.screenY + topOffset;
      // It seems clientX/Y are intended to be screen-relative for updateDragMove here.
      // If updateDragMove expects clientX/Y relative to viewport, these re-assignments are key.
      pointermove.clientX = pointermove.screenX; 
      pointermove.clientY = pointermove.screenY;
      pointermove.preventDefault = () => void 0; // Mock for safety
      pointermove.stopPropagation = () => void 0; // Mock for safety
      if (globalThis.updateDragMove) { // Check if function exists
          globalThis.updateDragMove(pointermove);
      }
    }; break;
    default: {
      // console.log('Unhandled message type:', data.type);
    }; break;
  }
});
