// notepad.js

export const notepadAppDefinition = {
    title: "Untitled - Notepad",
    icon: "https://win98icons.alexmeub.com/icons/png/notepad-0.png",
    defaultWidth: 500,
    defaultHeight: 400,
    content: () => `
        <div id="notepad-app" style="display: flex; flex-direction: column; height: 100%; font-size:11px; background: #c0c0c0;">
            <div class="notepad-menu-bar" style="padding: 2px 3px; border-bottom: 1px solid #808080; background: #c0c0c0; display:flex; flex-shrink:0; position:relative;">
                <div class="notepad-menu-item" data-action="file"><u>F</u>ile</div>
                <div class="notepad-menu-item disabled" data-action="edit" style="margin-left:8px;"><u>E</u>dit</div>
                <div class="notepad-menu-item disabled" data-action="search" style="margin-left:8px;"><u>S</u>earch</div>
                <div class="notepad-menu-item disabled" data-action="help" style="margin-left:8px;"><u>H</u>elp</div>
                <div id="notepad-file-dropdown" class="notepad-dropdown-menu" style="display:none; position:absolute; /* top is set by JS */ /* left is set by JS */ background:#c0c0c0; border:1px outset #dfdfdf; box-shadow: 1px 1px 3px rgba(0,0,0,0.4); z-index:10; padding:1px;">
                    <div class="notepad-dropdown-item" data-action="new"><u>N</u>ew</div>
                    <div class="notepad-dropdown-item" data-action="open"><u>O</u>pen...</div>
                    <div class="notepad-dropdown-item" data-action="save"><u>S</u>ave</div>
                    <div class="notepad-dropdown-item" data-action="saveas">Save <u>A</u>s...</div>
                    <div class="notepad-dropdown-separator" style="height:1px; background:#808080; margin:2px 1px; border-bottom:1px solid #fff;"></div>
                    <div class="notepad-dropdown-item" data-action="exit">E<u>x</u>it</div>
                </div>
            </div>
            <textarea id="notepad-textarea" style="width: calc(100% - 2px); height: calc(100% - 25px); border: 1px inset #808080; font-family: 'Lucida Console', 'Courier New', monospace; font-size:12px; resize:none; box-sizing: border-box; padding:2px; margin:1px; background:white;" placeholder=""></textarea>
        </div>
        <style>
            .notepad-menu-item { cursor:default; padding: 0 3px; }
            .notepad-menu-item:not(.disabled):hover { background:#000080; color:white; }
            .notepad-menu-item.disabled { color: #808080; cursor:default; } /* Disabled style */
            .notepad-dropdown-menu { min-width: 120px; }
            .notepad-dropdown-item { padding: 2px 15px 2px 10px; cursor:default; white-space:nowrap; }
            .notepad-dropdown-item:hover { background:#000080; color:white; }
            /* Disabled style for dropdown items if ever needed */
            /* .notepad-dropdown-item.disabled { color: #808080; background: #c0c0c0 !important; } */
            /* .notepad-dropdown-item.disabled:hover { color: #808080; } */
        </style>
        `,
    initApp: (windowEl, windowInstanceId, webviewId, appDefinition) => {
        const textArea = windowEl.querySelector('#notepad-textarea');
        const menuBar = windowEl.querySelector('.notepad-menu-bar');
        const fileDropdown = windowEl.querySelector('#notepad-file-dropdown');
        const windowTitleEl = windowEl.querySelector('.window-title');

        let currentFileHandle = null;
        let currentFileName = "Untitled";
        let unsavedChanges = false;

        const updateTitle = () => {
            const newTitle = `${unsavedChanges ? '*' : ''}${currentFileName} - Notepad`;
            if (windowTitleEl) windowTitleEl.textContent = newTitle;
            // Potentially call a global function here to update taskbar title if app.js supports it
            // e.g., if (typeof globalUpdateTaskbarTitle === 'function') globalUpdateTaskbarTitle(windowInstanceId, newTitle);
        };

        textArea.addEventListener('input', () => {
            if (!unsavedChanges) {
                unsavedChanges = true;
                updateTitle();
            }
        });

        const closeFileDropdown = () => {
            if (fileDropdown) fileDropdown.style.display = 'none';
            document.removeEventListener('click', outsideClickListener, { capture: true }); // Ensure capture matches for removal
        };

        const outsideClickListener = (event) => {
            // Check if the click is outside the file dropdown AND outside the "File" menu item itself
            if (fileDropdown && !fileDropdown.contains(event.target) && 
                menuBar.querySelector('[data-action="file"]') && 
                !menuBar.querySelector('[data-action="file"]').contains(event.target)) {
                closeFileDropdown();
            }
        };

        menuBar.addEventListener('click', (e) => {
            const targetMenuItem = e.target.closest('.notepad-menu-item');
            if (!targetMenuItem || targetMenuItem.classList.contains('disabled')) {
                // If clicked on a disabled item or not on a menu item, do nothing.
                // Also, if a dropdown is open and click is on another menu item, close it.
                if (fileDropdown.style.display === 'block' && !targetMenuItem.dataset.action === 'file') {
                    closeFileDropdown();
                }
                return;
            }

            const action = targetMenuItem.dataset.action;

            if (action === 'file') {
                if (fileDropdown.style.display === 'block') {
                    closeFileDropdown();
                } else {
                    // Position the dropdown right below the "File" menu item
                    fileDropdown.style.left = targetMenuItem.offsetLeft + 'px';
                    fileDropdown.style.top = (targetMenuItem.parentElement.offsetHeight) + 1 + 'px';
                    fileDropdown.style.display = 'block';
                    // Add listener to close dropdown when clicking outside
                    // Use capture to catch clicks on other elements before they might stop propagation
                    document.addEventListener('click', outsideClickListener, { capture: true });
                }
            } else {
                // For other actions (Edit, Search, Help), they are disabled by class,
                // but if somehow clicked, this would be the fallback.
                // alert(`Notepad ${action} menu clicked - not implemented`);
                closeFileDropdown(); // Close file dropdown if it's open
            }
        });

        fileDropdown.addEventListener('click', async (e) => {
            const targetDropdownItem = e.target.closest('.notepad-dropdown-item');
            if (!targetDropdownItem) return;

            const action = targetDropdownItem.dataset.action;
            closeFileDropdown(); // Close menu after action

            switch (action) {
                case 'new':
                    if (unsavedChanges && !confirm("You have unsaved changes. Are you sure you want to start a new file?")) return;
                    textArea.value = '';
                    currentFileHandle = null;
                    currentFileName = "Untitled";
                    unsavedChanges = false;
                    updateTitle();
                    break;
                case 'open':
                    if (unsavedChanges && !confirm("You have unsaved changes. Are you sure you want to open a new file?")) return;
                    await openFile();
                    break;
                case 'save':
                    await saveFile();
                    break;
                case 'saveas':
                    await saveFileAs();
                    break;
                case 'exit':
                    if (unsavedChanges && !confirm("You have unsaved changes. Are you sure you want to exit?")) return;
                    // Find the close button of the window this notepad instance is in
                    const parentWindow = windowEl.closest('.window');
                    if (parentWindow) {
                        const closeBtn = parentWindow.querySelector('.window-close-btn');
                        if (closeBtn) closeBtn.click();
                    }
                    break;
            }
        });

        async function openFile() {
            if ('showOpenFilePicker' in window) {
                try {
                    const [handle] = await window.showOpenFilePicker({
                        types: [{
                            description: 'Text Documents',
                            accept: { 'text/plain': ['.txt', '.text', '.log', '.md', '.js', '.html', '.css', '.json', '.xml'] }
                        }],
                        multiple: false
                    });
                    const file = await handle.getFile();
                    const contents = await file.text();
                    textArea.value = contents;
                    currentFileHandle = handle;
                    currentFileName = handle.name;
                    unsavedChanges = false;
                    updateTitle();
                } catch (err) {
                    if (err.name === 'AbortError') {
                        console.log('File open aborted by user.');
                    } else {
                        console.error('Error opening file:', err);
                        // Removed the aggressive retry confirm
                        alert('Failed to open file: ' + err.message);
                    }
                }
            } else {
                // Fallback to <input type="file">
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.txt,.text,.log,.md,.js,.html,.css,.json,.xml';
                input.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            textArea.value = e.target.result;
                            currentFileHandle = null; 
                            currentFileName = file.name;
                            unsavedChanges = false;
                            updateTitle();
                        };
                        reader.readAsText(file);
                    }
                };
                input.style.display = 'none'; // Keep it hidden
                document.body.appendChild(input); // Required for Safari on iOS to work
                input.click();
                document.body.removeChild(input); // Clean up
            }
        }

        async function saveFileContent(handle) {
            try {
                const writable = await handle.createWritable();
                await writable.write(textArea.value);
                await writable.close();
                currentFileName = handle.name;
                unsavedChanges = false;
                updateTitle();
                return true;
            } catch (err) {
                console.error('Error saving file:', err);
                alert('Error saving file: ' + err.message);
                return false;
            }
        }

        async function saveFile() {
            if (currentFileHandle) {
                await saveFileContent(currentFileHandle);
            } else {
                await saveFileAs(); // If no handle, always trigger "Save As"
            }
        }
        
        function isSafari() {
            return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        }

        async function saveFileAs() {
            // Safari Print Fallback
            if (isSafari() && !('showSaveFilePicker' in window)) {
                try {
                    const printFrame = document.createElement('iframe');
                    printFrame.style.position = 'absolute';
                    printFrame.style.width = '0';
                    printFrame.style.height = '0';
                    printFrame.style.border = '0';
                    document.body.appendChild(printFrame);
                    
                    const frameDoc = printFrame.contentDocument || printFrame.contentWindow.document;
                    frameDoc.open();
                    // Preserve line breaks and spaces for printing
                    frameDoc.write('<html><head><title>' + currentFileName + '</title></head><body><pre>' + textArea.value.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">") + '</pre></body></html>');
                    frameDoc.close();
                    
                    printFrame.contentWindow.focus(); // Focus is important for print dialog
                    printFrame.contentWindow.print();
                    
                    // Clean up the iframe after a delay (print dialog might be async)
                    setTimeout(() => {
                        document.body.removeChild(printFrame);
                    }, 1000);

                    // Note: Printing doesn't really "save" the file or clear unsavedChanges flag
                    // This is purely a workaround to get the content out.
                    // User might still consider it unsaved.
                    // For this demo, we'll assume printing "gets it out" enough.
                    // unsavedChanges = false; 
                    // updateTitle();

                } catch (printErr) {
                    console.error("Error during print fallback:", printErr);
                    alert("Could not initiate print. Please copy the content manually.");
                }
                return; // End here for Safari print fallback
            }

            // Standard File System Access API or Blob download
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: currentFileName === "Untitled" ? "Untitled.txt" : currentFileName,
                        types: [{
                            description: 'Text Documents',
                            accept: { 'text/plain': ['.txt'] }
                        }],
                    });
                    currentFileHandle = handle;
                    await saveFileContent(handle);
                } catch (err) {
                    if (err.name === 'AbortError') {
                        console.log('File save aborted by user.');
                    } else {
                        console.error('Error saving file as:', err);
                        alert('Error saving file as: ' + err.message);
                    }
                }
            } else {
                // Fallback to Blob download (for non-Safari browsers without FS API)
                const blob = new Blob([textArea.value], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = currentFileName === "Untitled" ? "Untitled.txt" : currentFileName;
                document.body.appendChild(a); // Append for Firefox
                a.click();
                document.body.removeChild(a); // Clean up
                URL.revokeObjectURL(url);
                // unsavedChanges = false; // Assuming download means "saved" for this context
                // updateTitle();
            }
        }

        // Initialize
        updateTitle();
    }
};
