// network-explorer.js

const NETWORK_BOOKMARKS_TREE_KEY = 'networkBookmarksTree_v1';

const FOLDER_ICON_CLOSED = "./directory_closed_cool-0.png";
const FOLDER_ICON_OPEN = "./directory_open_cool-0.png";
const BOOKMARK_ICON_DEFAULT = "./html-0.png";
const FAVICON_PROXY_URL = (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`;

let _createWindowFnRef = null; // To store the reference to app.js's createWindow

// --- Data Management ---
function getInitialBookmarks() {
    // Initial structure if localStorage is empty
    const initialData = [
        { id: 'root-google', parentId: null, type: 'domain', title: 'google.com', isExpanded: false },
        { id: `bm-${Date.now()}-1`, parentId: 'root-google', type: 'bookmark', title: 'Google Search', url: 'https://www.google.com' },
        { id: `bm-${Date.now()}-2`, parentId: 'root-google', type: 'bookmark', title: 'Gmail', url: 'https://mail.google.com' },
        { id: 'root-microsoft', parentId: null, type: 'domain', title: 'microsoft.com', isExpanded: false },
        { id: `bm-${Date.now()}-3`, parentId: 'root-microsoft', type: 'bookmark', title: 'Microsoft Home', url: 'https://www.microsoft.com' },
        { id: `bm-${Date.now()}-4`, parentId: null, type: 'bookmark', title: 'Web Design Museum', url: 'https://www.webdesignmuseum.org' },
    ];
    initialData.forEach(item => {
        if (item.type === 'bookmark') item.icon = getFaviconSrc(item.url);
        else if (item.type === 'domain') item.icon = FOLDER_ICON_CLOSED; // Default for domains
    });
    return initialData;
}

function loadBookmarks() {
    try {
        const stored = localStorage.getItem(NETWORK_BOOKMARKS_TREE_KEY);
        if (stored) {
            const items = JSON.parse(stored);
            // Ensure icons are set, especially for folders based on isExpanded
            items.forEach(item => {
                if (item.type === 'domain') {
                    item.icon = item.isExpanded ? FOLDER_ICON_OPEN : FOLDER_ICON_CLOSED;
                } else if (item.type === 'bookmark' && !item.icon) {
                    item.icon = getFaviconSrc(item.url);
                }
            });
            return items;
        }
    } catch (e) {
        console.error("Error reading bookmarks from localStorage:", e);
    }
    return getInitialBookmarks(); // Return default if nothing stored or error
}

function saveBookmarks(bookmarks) {
    try {
        // Before saving, ensure folder icons reflect their current closed state for persistence
        const storableBookmarks = bookmarks.map(bm => {
            if (bm.type === 'domain') {
                return { ...bm, icon: FOLDER_ICON_CLOSED }; // Always save domains as closed icon
            }
            return bm;
        });
        localStorage.setItem(NETWORK_BOOKMARKS_TREE_KEY, JSON.stringify(storableBookmarks));
    } catch (e) {
        console.error("Error saving bookmarks to localStorage:", e);
    }
}

function getDomainFromUrl(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
        return null;
    }
}

function getFaviconSrc(url) {
    const domain = getDomainFromUrl(url);
    return domain ? FAVICON_PROXY_URL(domain) : BOOKMARK_ICON_DEFAULT;
}

function generateNodeId() {
    return `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// --- Tree Rendering ---
function buildTree(items, parentId = null) {
    const tree = [];
    items.filter(item => item.parentId === parentId)
         .sort((a,b) => a.title.localeCompare(b.title)) // Sort alphabetically
         .forEach(item => {
            const children = buildTree(items, item.id);
            tree.push({ ...item, children });
         });
    return tree;
}

function renderTreeRecursive(nodes, level = 0, selectedNodeId, eventHandlers) {
    let html = '<ul>';
    nodes.forEach(node => {
        const isSelected = node.id === selectedNodeId;
        const iconSrc = (node.type === 'domain')
            ? (node.isExpanded ? FOLDER_ICON_OPEN : FOLDER_ICON_CLOSED)
            : (node.icon || BOOKMARK_ICON_DEFAULT);

        html += `
            <li data-id="${node.id}" class="${isSelected ? 'selected' : ''}" style="padding-left: ${level * 20}px;">
                <div class="tree-item-content">
                    ${node.type === 'domain' ? `<span class="tree-toggler">${node.isExpanded ? '−' : '+'}</span>` : '<span class="tree-toggler-placeholder"></span>'}
                    <img src="${iconSrc}" class="tree-item-icon" alt="" onerror="this.onerror=null; this.src='${BOOKMARK_ICON_DEFAULT}';">
                    <span class="tree-item-title" title="${node.url || node.title}">${node.title}</span>
                </div>
            </li>
        `;
        if (node.type === 'domain' && node.isExpanded && node.children.length > 0) {
            html += renderTreeRecursive(node.children, level + 1, selectedNodeId, eventHandlers);
        }
    });
    html += '</ul>';
    return html;
}

// --- App Definition ---
export const networkExplorerAppDefinition = {
    title: "Network Neighborhood",
    icon: "./network_cool_two_pcs-4.png", // A "Network" icon
    defaultWidth: 350,
    defaultHeight: 450,
    generateContent: () => `
        <div class="network-bookmarks-app">
            <div class="menu-bar">
                <div class="menu-item" data-menu="file"><u>F</u>ile</div>
                <div class="menu-item active-menu" data-menu="edit"><u>E</u>dit</div>
                <div class="menu-item" data-menu="view"><u>V</u>iew</div>
                <div class="menu-item" data-menu="help"><u>H</u>elp</div>
                <div class="dropdown-menu edit-menu">
                    <div class="dropdown-item" data-action="add">Add Bookmark...</div>
                    <div class="dropdown-item" data-action="edit">Edit Bookmark...</div>
                    <div class="dropdown-item" data-action="delete">Delete Bookmark</div>
                </div>
            </div>
            <div class="tree-view-container">
                <!-- Tree will be rendered here -->
            </div>
        </div>
        <div class="bookmark-modal" style="display:none;">
            <div class="bookmark-modal-content">
                <span class="bookmark-modal-close">×</span>
                <h3 id="bookmark-modal-title">Add Bookmark</h3>
                <label for="bookmark-title">Title:</label>
                <input type="text" id="bookmark-title" name="title">
                <label for="bookmark-url">URL:</label>
                <input type="url" id="bookmark-url" name="url">
                <label for="bookmark-parent">Parent (Domain or existing folder):</label>
                <select id="bookmark-parent">
                    <!-- Options will be populated here -->
                </select>
                <button id="bookmark-modal-save">Save</button>
            </div>
        </div>
        <style>
            .network-bookmarks-app { display: flex; flex-direction: column; height: 100%; background: #fff; }
            .menu-bar { display: flex; background-color: #DFD8C8; padding: 2px 4px; border-bottom: 1px solid #808080; flex-shrink: 0; position: relative; }
            .menu-item { padding: 2px 8px; cursor: default; user-select: none; }
            .menu-item.active-menu:hover { background-color: #000080; color: white; }
            .menu-item:not(.active-menu) { color: #808080; } /* Disabled look */

            .dropdown-menu { display: none; position: absolute; top: 100%; left: 0; background-color: #c0c0c0; border: 1px outset #fff; box-shadow: 1px 1px 3px rgba(0,0,0,0.3); z-index: 10; min-width: 150px; }
            .menu-item:hover .dropdown-menu { display: block; } /* Basic hover to show dropdown */
            .edit-menu { left: 35px; /* Approximate position under Edit */ }
            .dropdown-item { padding: 4px 20px 4px 10px; cursor: default; white-space: nowrap; }
            .dropdown-item:hover { background-color: #000080; color: white; }
            .dropdown-item.disabled { color: #808080; background-color: #c0c0c0 !important; }

            .tree-view-container { flex-grow: 1; overflow: auto; border: 1px inset #808080; padding: 5px; }
            .tree-view-container ul { list-style: none; padding-left: 0; margin: 0; }
            .tree-view-container li { padding: 2px 0; cursor: default; }
            .tree-item-content { display: flex; align-items: center; padding: 2px; }
            .tree-item-content:hover { background-color: #f0f0f0; }
            li.selected > .tree-item-content { background-color: #000080; color: white; }
            .tree-toggler { width: 16px; text-align: center; font-family: monospace; cursor: pointer; display: inline-block; }
            .tree-toggler-placeholder { width: 16px; display: inline-block; }
            .tree-item-icon { width: 16px; height: 16px; margin-right: 4px; vertical-align: middle; }
            .tree-item-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            /* Modal Styles */
            .bookmark-modal { position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); display:flex; justify-content:center; align-items:center; z-index:100; }
            .bookmark-modal-content { background: #c0c0c0; padding: 20px; border: 2px outset #fff; box-shadow: 2px 2px 5px rgba(0,0,0,0.5); min-width: 300px; }
            .bookmark-modal-content h3 { margin-top: 0; font-size: 14px; }
            .bookmark-modal-content label { display: block; margin: 8px 0 2px; font-size: 11px; }
            .bookmark-modal-content input, .bookmark-modal-content select { width: calc(100% - 10px); padding: 4px; border: 1px inset #808080; margin-bottom: 8px; font-size:12px; }
            .bookmark-modal-close { float: right; font-size: 18px; font-weight: bold; cursor: pointer; margin-top: -10px; }
            #bookmark-modal-save { background-color: #c0c0c0; border: 2px outset #dfdfdf; padding: 5px 15px; cursor: pointer; float:right; }
            #bookmark-modal-save:active { border-style: inset; }
        </style>
    `,
    initApp: (windowEl, instanceId, webviewId, appDef, createWindowFn) => {
        _createWindowFnRef = createWindowFn; // Store reference

        let bookmarks = loadBookmarks();
        let selectedNodeId = null;
        let currentEditNodeId = null; // For tracking which node is being edited

        const treeContainer = windowEl.querySelector('.tree-view-container');
        const editMenuEl = windowEl.querySelector('.edit-menu');
        const modalEl = windowEl.querySelector('.bookmark-modal');
        const modalTitleEl = modalEl.querySelector('#bookmark-modal-title');
        const titleInput = modalEl.querySelector('#bookmark-title');
        const urlInput = modalEl.querySelector('#bookmark-url');
        const parentSelect = modalEl.querySelector('#bookmark-parent');
        const saveButton = modalEl.querySelector('#bookmark-modal-save');
        const closeButton = modalEl.querySelector('.bookmark-modal-close');

        function populateParentSelect(currentEditingNodeId = null) {
            parentSelect.innerHTML = '<option value="">-- Root --</option>';
            const domainNodes = bookmarks.filter(b => b.type === 'domain' && b.id !== currentEditingNodeId);
            domainNodes.forEach(dn => {
                const option = document.createElement('option');
                option.value = dn.id;
                option.textContent = dn.title + " (Domain Folder)";
                parentSelect.appendChild(option);
            });
        }

        function openModal(mode = 'add', nodeToEdit = null) {
            currentEditNodeId = mode === 'edit' && nodeToEdit ? nodeToEdit.id : null;
            modalTitleEl.textContent = mode === 'add' ? 'Add Bookmark' : 'Edit Bookmark';
            populateParentSelect(currentEditNodeId);

            if (mode === 'edit' && nodeToEdit) {
                titleInput.value = nodeToEdit.title;
                urlInput.value = nodeToEdit.url || '';
                urlInput.disabled = nodeToEdit.type === 'domain'; // Can't change URL of domain folder
                parentSelect.value = nodeToEdit.parentId || '';
                if (nodeToEdit.type === 'domain') { // Cannot change parent of a domain folder easily for now
                    parentSelect.disabled = true;
                } else {
                    parentSelect.disabled = false;
                }
            } else {
                titleInput.value = '';
                urlInput.value = '';
                urlInput.disabled = false;
                parentSelect.value = selectedNodeId && bookmarks.find(b=>b.id === selectedNodeId)?.type === 'domain' ? selectedNodeId : '';
                parentSelect.disabled = false;
            }
            modalEl.style.display = 'flex';
            titleInput.focus();
        }

        function closeModal() {
            modalEl.style.display = 'none';
        }

        saveButton.addEventListener('click', () => {
            const title = titleInput.value.trim();
            const url = urlInput.value.trim();
            const parentId = parentSelect.value || null;

            if (!title) { alert("Title is required."); return; }

            if (currentEditNodeId) { // Editing existing node
                const nodeIndex = bookmarks.findIndex(b => b.id === currentEditNodeId);
                if (nodeIndex > -1) {
                    bookmarks[nodeIndex].title = title;
                    if (bookmarks[nodeIndex].type === 'bookmark') {
                        if (!url) { alert("URL is required for bookmarks."); return; }
                        try { new URL(url); } catch (e) { alert("Invalid URL."); return; }
                        bookmarks[nodeIndex].url = url;
                        bookmarks[nodeIndex].icon = getFaviconSrc(url);
                    }
                    // Prevent moving domain folders for simplicity, or making them children of other domains
                    if (bookmarks[nodeIndex].type !== 'domain') {
                         bookmarks[nodeIndex].parentId = parentId;
                    }
                }
            } else { // Adding new node
                if (!url) { alert("URL is required."); return; }
                try { new URL(url); } catch (e) { alert("Invalid URL."); return; }

                const domain = getDomainFromUrl(url);
                let actualParentId = parentId;
                let domainNode = null;

                if (domain) { // Try to group under existing or new domain folder
                    domainNode = bookmarks.find(b => b.type === 'domain' && b.title.toLowerCase() === domain.toLowerCase());
                    if (!domainNode) { // Create new domain folder if it doesn't exist
                        domainNode = {
                            id: generateNodeId(),
                            parentId: null, // Domain folders are root for now
                            type: 'domain',
                            title: domain,
                            isExpanded: false,
                            icon: FOLDER_ICON_CLOSED,
                            children: []
                        };
                        bookmarks.push(domainNode);
                    }
                    actualParentId = domainNode.id; // New bookmark will go under this domain
                }
                 // If no domain or user explicitly chose a parent, use that.
                // If user chose root and we have a domain, it goes under domain.
                // If user chose root and no domain, it's a root bookmark.

                const newNode = {
                    id: generateNodeId(),
                    parentId: actualParentId,
                    type: 'bookmark',
                    title: title,
                    url: url,
                    icon: getFaviconSrc(url)
                };
                bookmarks.push(newNode);
            }
            saveBookmarks(bookmarks);
            renderApp();
            closeModal();
        });
        closeButton.addEventListener('click', closeModal);


        function handleNodeInteraction(nodeId) {
            const node = bookmarks.find(b => b.id === nodeId);
            if (!node) return;

            selectedNodeId = nodeId; // Set selected

            if (node.type === 'domain') {
                node.isExpanded = !node.isExpanded;
                node.icon = node.isExpanded ? FOLDER_ICON_OPEN : FOLDER_ICON_CLOSED;
            } else if (node.type === 'bookmark' && node.url) {
                if (_createWindowFnRef) {
                    // Logic to open in browser (similar to your previous version)
                    const targetBrowserAppId = 'internetBrowser';
                    let browserWindow = null;
                    let browserAppInstance = null;
                    const openBrowsers = Object.values(window.openWindows || {}).filter(
                        ow => (ow.appId === 'internetBrowser' || ow.appId === 'internetExplorer' || ow.appId === 'netscapeNavigator') &&
                              ow.element && document.body.contains(ow.element) && !ow.isMinimized
                    );
                    if (openBrowsers.length > 0) {
                        browserWindow = openBrowsers.find(ow => !ow.element.classList.contains('inactive'))?.element || openBrowsers[0].element;
                        browserAppInstance = (window.openWindows || {})[browserWindow.dataset.instanceId]?.appInstance;
                    }

                    if (browserAppInstance && typeof browserAppInstance.navigateTo === 'function') {
                        browserAppInstance.navigateTo(node.url);
                        if (window.focusWindow) window.focusWindow(browserWindow);
                    } else {
                        const newBrowserWindow = _createWindowFnRef(targetBrowserAppId, { navigateToUrl: node.url });
                        // Navigation is handled by createWindow's dataForApp logic
                    }
                }
            }
            renderApp(); // Re-render to show selection/expansion
        }
        
        treeContainer.addEventListener('click', (event) => {
            const li = event.target.closest('li[data-id]');
            if (li) {
                handleNodeInteraction(li.dataset.id);
            }
        });
        treeContainer.addEventListener('dblclick', (event) => {
            const li = event.target.closest('li[data-id]');
            if (li) {
                const node = bookmarks.find(b => b.id === li.dataset.id);
                // Double click on bookmark also opens it, on folder it toggles.
                // Single click already handles this, but dblclick is common for open.
                if (node && node.type === 'bookmark') {
                     handleNodeInteraction(li.dataset.id); // Will re-trigger open
                }
            }
        });


        // Menu actions
        windowEl.querySelectorAll('.dropdown-item[data-action]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent menu from closing immediately
                const action = item.dataset.action;
                const selectedNode = selectedNodeId ? bookmarks.find(b => b.id === selectedNodeId) : null;
                editMenuEl.style.display = 'none'; // Hide menu after action

                if (action === 'add') {
                    openModal('add');
                } else if (action === 'edit') {
                    if (selectedNode) {
                        openModal('edit', selectedNode);
                    } else {
                        alert("Please select an item to edit.");
                    }
                } else if (action === 'delete') {
                    if (selectedNode) {
                        if (confirm(`Delete "${selectedNode.title}"? ${selectedNode.type === 'domain' ? 'This will delete all its bookmarks.' : ''}`)) {
                            let idsToDelete = [selectedNodeId];
                            if (selectedNode.type === 'domain') { // Collect children IDs
                                const childrenStack = bookmarks.filter(b => b.parentId === selectedNodeId).map(c => c.id);
                                while(childrenStack.length > 0) {
                                    const childId = childrenStack.pop();
                                    idsToDelete.push(childId);
                                    bookmarks.filter(b => b.parentId === childId).forEach(gc => childrenStack.push(gc.id));
                                }
                            }
                            bookmarks = bookmarks.filter(b => !idsToDelete.includes(b.id));
                            selectedNodeId = null;
                            saveBookmarks(bookmarks);
                            renderApp();
                        }
                    } else {
                        alert("Please select an item to delete.");
                    }
                }
            });
        });
        
        // Simple hover to show/hide dropdown for active menus
        windowEl.querySelectorAll('.menu-item.active-menu').forEach(menu => {
            const dropdown = menu.parentElement.querySelector(`.${menu.dataset.menu}-menu`);
            if (dropdown) {
                menu.addEventListener('mouseenter', () => dropdown.style.display = 'block');
                menu.addEventListener('mouseleave', () => {
                    // Basic hide, could be improved with slight delay
                    setTimeout(() => {
                        if (!dropdown.matches(':hover')) {
                             dropdown.style.display = 'none';
                        }
                    }, 200);
                });
                dropdown.addEventListener('mouseleave', () => dropdown.style.display = 'none');
            }
        });


        function renderApp() {
            const treeData = buildTree(bookmarks, null);
            treeContainer.innerHTML = renderTreeRecursive(treeData, 0, selectedNodeId, {
                onNodeClick: handleNodeInteraction
            });
            // Update edit/delete menu item states
            const editItem = editMenuEl.querySelector('[data-action="edit"]');
            const deleteItem = editMenuEl.querySelector('[data-action="delete"]');
            if (selectedNodeId) {
                editItem.classList.remove('disabled');
                deleteItem.classList.remove('disabled');
            } else {
                editItem.classList.add('disabled');
                deleteItem.classList.add('disabled');
            }
        }
        renderApp();
    }
};
