// network-explorer.js

const NETWORK_BOOKMARKS_TREE_KEY = 'networkBookmarksTree_v2'; // Incremented version for new structure

// Updated Icon Paths (as per your last version)
const ENTIRE_NETWORK_ICON = "./entire_network_globe-0.png"; // Assuming this is your "Entire Network" icon
const FOLDER_ICON_CLOSED = "./computer_2-1.png";
const FOLDER_ICON_OPEN = "./network_three_pcs-0.png";
const BOOKMARK_ICON_DEFAULT = "./html-0.png";
const FAVICON_PROXY_URL = (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`;

const ROOT_NODE_ID = 'entire-network-root';

let _createWindowFnRef = null;

// --- Data Management ---
function getInitialBookmarks() {
    const initialData = [
        // The "Entire Network" root node
        { id: ROOT_NODE_ID, parentId: null, type: 'root', title: 'Entire Network', isExpanded: true, icon: ENTIRE_NETWORK_ICON },

        // Domains are now children of "Entire Network"
        { id: 'domain-google', parentId: ROOT_NODE_ID, type: 'domain', title: 'google.com', isExpanded: false },
        { id: `bm-${Date.now()}-1`, parentId: 'domain-google', type: 'bookmark', title: 'Google Search', url: 'https://www.google.com' },
        { id: `bm-${Date.now()}-2`, parentId: 'domain-google', type: 'bookmark', title: 'Gmail', url: 'https://mail.google.com' },

        { id: 'domain-microsoft', parentId: ROOT_NODE_ID, type: 'domain', title: 'microsoft.com', isExpanded: false },
        { id: `bm-${Date.now()}-3`, parentId: 'domain-microsoft', type: 'bookmark', title: 'Microsoft Home', url: 'https://www.microsoft.com' },

        // Bookmarks directly under "Entire Network"
        { id: `bm-${Date.now()}-4`, parentId: ROOT_NODE_ID, type: 'bookmark', title: 'Web Design Museum', url: 'https://www.webdesignmuseum.org' },
    ];
    initialData.forEach(item => {
        if (item.type === 'bookmark') item.icon = getFaviconSrc(item.url);
        else if (item.type === 'domain') item.icon = FOLDER_ICON_CLOSED;
        // Root icon is already set
    });
    return initialData;
}

function loadBookmarks() {
    try {
        const stored = localStorage.getItem(NETWORK_BOOKMARKS_TREE_KEY);
        if (stored) {
            const items = JSON.parse(stored);
            // Ensure root node exists if data is loaded
            if (!items.find(item => item.id === ROOT_NODE_ID)) {
                items.unshift({ id: ROOT_NODE_ID, parentId: null, type: 'root', title: 'Entire Network', isExpanded: true, icon: ENTIRE_NETWORK_ICON });
            }
            items.forEach(item => {
                if (item.type === 'domain') {
                    item.icon = item.isExpanded ? FOLDER_ICON_OPEN : FOLDER_ICON_CLOSED;
                } else if (item.type === 'bookmark' && !item.icon) {
                    item.icon = getFaviconSrc(item.url);
                } else if (item.type === 'root') {
                    item.icon = ENTIRE_NETWORK_ICON; // Ensure root icon
                    if (typeof item.isExpanded === 'undefined') item.isExpanded = true; // Default root to expanded
                }
            });
            return items;
        }
    } catch (e) {
        console.error("Error reading bookmarks from localStorage:", e);
    }
    return getInitialBookmarks();
}

function saveBookmarks(bookmarks) {
    try {
        const storableBookmarks = bookmarks.map(bm => {
            let iconToSave = bm.icon;
            if (bm.type === 'domain') iconToSave = FOLDER_ICON_CLOSED;
            else if (bm.type === 'root') iconToSave = ENTIRE_NETWORK_ICON;
            return { ...bm, icon: iconToSave }; // Save domains with closed icon, root with its icon
        });
        localStorage.setItem(NETWORK_BOOKMARKS_TREE_KEY, JSON.stringify(storableBookmarks));
    } catch (e) {
        console.error("Error saving bookmarks to localStorage:", e);
    }
}

function getDomainFromUrl(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch (e) { return null; }
}

function getFaviconSrc(url) {
    const domain = getDomainFromUrl(url);
    return domain ? FAVICON_PROXY_URL(domain) : BOOKMARK_ICON_DEFAULT;
}

function generateNodeId(prefix = 'node') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// --- Tree Rendering ---
function buildTree(items, parentId = null) {
    const tree = [];
    items.filter(item => item.parentId === parentId)
         .sort((a, b) => {
             // Keep 'root' type first if it's among siblings (shouldn't happen if parentId is null for root only)
             if (a.type === 'root') return -1;
             if (b.type === 'root') return 1;
             // Then sort by type: 'domain' folders before 'bookmark' files
             if (a.type === 'domain' && b.type === 'bookmark') return -1;
             if (a.type === 'bookmark' && b.type === 'domain') return 1;
             // Then sort alphabetically by title
             return a.title.localeCompare(b.title);
         })
         .forEach(item => {
            const children = buildTree(items, item.id);
            tree.push({ ...item, children });
         });
    return tree;
}

function renderTreeRecursive(nodes, level = 0, selectedNodeId, eventHandlers, isLastChildStack = []) {
    let html = '<ul class="tree-level">';
    nodes.forEach((node, index) => {
        const isSelected = node.id === selectedNodeId;
        let iconSrc = node.icon;
        if (node.type === 'domain') {
            iconSrc = node.isExpanded ? FOLDER_ICON_OPEN : FOLDER_ICON_CLOSED;
        } else if (node.type === 'root') {
            iconSrc = ENTIRE_NETWORK_ICON; // Root always uses its specific icon
        } else {
            iconSrc = node.icon || BOOKMARK_ICON_DEFAULT;
        }

        const isLast = index === nodes.length - 1;
        let currentIsLastStack = [...isLastChildStack, isLast];

        let lineClass = "tree-line-item";
        if (isLast) lineClass += " last-child";
        if (level === 0 && node.type === 'root') lineClass += " root-node-li";


        html += `
            <li data-id="${node.id}" class="${isSelected ? 'selected' : ''} ${lineClass}" style="--level: ${level};">
                <div class="tree-item-connector-container">`;
        // Draw connector lines based on parent's last-child status
        for (let i = 0; i < level; i++) {
            html += `<span class="tree-line ${isLastChildStack[i] ? 'empty' : 'vertical'}"></span>`;
        }
        html += `<span class="tree-line ${isLast ? 'end-node' : 'tee-node'}"></span>
                </div>
                <div class="tree-item-content">
                    ${(node.type === 'domain' || node.type === 'root') && node.children.length > 0 ? `<span class="tree-toggler">${node.isExpanded ? '−' : '+'}</span>` : '<span class="tree-toggler-placeholder"></span>'}
                    <img src="${iconSrc}" class="tree-item-icon" alt="" onerror="this.onerror=null; this.src='${BOOKMARK_ICON_DEFAULT}';">
                    <span class="tree-item-title" title="${node.url || node.title}">${node.title}</span>
                </div>
            </li>
        `;
        if ((node.type === 'domain' || node.type === 'root') && node.isExpanded && node.children.length > 0) {
            html += renderTreeRecursive(node.children, level + 1, selectedNodeId, eventHandlers, currentIsLastStack);
        }
    });
    html += '</ul>';
    return html;
}


// --- App Definition ---
export const networkExplorerAppDefinition = {
    title: "Network Neighborhood", // Updated title
    icon: "./network_normal_two_pcs-0.png", // Use the "Entire Network" icon for the app itself
    activeTitleBarColor: "#808000",
    defaultWidth: 350,
    defaultHeight: 450,
    generateContent: () => `
        <div class="network-bookmarks-app">
            <div class="menu-bar">
                <div class="menu-item" data-menu="file"><u>F</u>ile</div>
                <div class="menu-item" data-menu="edit"><u>E</u>dit</div>
                <div class="menu-item" data-menu="view"><u>V</u>iew</div>
                <div class="menu-item" data-menu="help"><u>H</u>elp</div>
                <div class="dropdown-menu edit-menu">
                    <div class="dropdown-item" data-action="add">Add Item...</div>
                    <div class="dropdown-item" data-action="edit">Edit Item...</div>
                    <div class="dropdown-item" data-action="delete">Delete Item</div>
                </div>
            </div>
            <div class="tree-view-container">
                <!-- Tree will be rendered here -->
            </div>
        </div>
        <div class="bookmark-modal" style="display:none;">
            <div class="bookmark-modal-content">
                <span class="bookmark-modal-close">×</span>
                <h3 id="bookmark-modal-title">Add Item</h3>
                <label for="bookmark-type">Type:</label>
                <select id="bookmark-type">
                    <option value="bookmark">Bookmark (URL)</option>
                    <option value="domain">Folder (Domain Group)</option>
                </select>
                <label for="bookmark-title">Title:</label>
                <input type="text" id="bookmark-title" name="title">
                <label for="bookmark-url" class="url-field">URL:</label>
                <input type="url" id="bookmark-url" name="url" class="url-field">
                <label for="bookmark-parent">Parent:</label>
                <select id="bookmark-parent">
                    <!-- Options will be populated here -->
                </select>
                <button id="bookmark-modal-save">Save</button>
            </div>
        </div>
        <style>
            .network-bookmarks-app { display: flex; flex-direction: column; height: 100%; background: #fff; }
            .menu-bar { display: flex; background-color: #c0c0c0; padding: 2px 4px; border-bottom: 1px solid #808080; flex-shrink: 0; position: relative; }
            .menu-item { padding: 2px 8px; cursor: default; user-select: none; }
            .menu-item.active-menu:hover { background-color: #000080; color: white; }
            .menu-item:not(.active-menu) { color: #808080; }

            .dropdown-menu { display: none; position: absolute; top: 100%; left: 0; background-color: #c0c0c0; border: 1px outset #fff; box-shadow: 1px 1px 3px rgba(0,0,0,0.3); z-index: 10; min-width: 150px; }
            .menu-item:hover .dropdown-menu { display: block; }
            .edit-menu { left: 35px; }
            .dropdown-item { padding: 4px 20px 4px 10px; cursor: default; white-space: nowrap; }
            .dropdown-item:hover { background-color: #000080; color: white; }
            .dropdown-item.disabled { color: #808080; background-color: #c0c0c0 !important; }

            .tree-view-container { flex-grow: 1; overflow: auto; border: 1px inset #808080; padding: 5px; font-family: "MS Sans Serif", "Tahoma", Arial, sans-serif; font-size: 11px;}
            .tree-view-container ul { list-style: none; padding-left: 0; margin: 0; }
            .tree-view-container li { /* padding: 1px 0; */ cursor: default; position: relative; display: flex; align-items: flex-start; }
            .tree-item-content { display: flex; align-items: center; padding: 1px 2px; flex-grow: 1; }
            li:not(.root-node-li) .tree-item-content:hover { background-color: #e0e0e0; } /* Lighter hover */
            li.selected > .tree-item-content { border: thin dotted; }
            
            .tree-toggler { width: 8px; height: 8px; border: thin solid; text-align: center; font-family: monospace; cursor: pointer; display: inline-flex; align-items:center; justify-content:center; margin-right: 2px; }
            .tree-toggler-placeholder { display: none; }
            .tree-item-icon { width: 16px; height: 16px; margin-right: 4px; vertical-align: middle; }
            .tree-item-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 16px; }

            /* Dashed lines for tree view */
            .tree-item-connector-container { display: flex; position: relative; align-self: stretch; }
            .tree-line { width: 16px; /* Half of padding-left per level effectively */ background-repeat: no-repeat; background-position: center center; }
            .tree-line.vertical { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M8 0 V16' stroke='%23808080' stroke-dasharray='1 1'/%3E%3C/svg%3E"); }
            .tree-line.tee-node { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M8 0 V8 H16' stroke='%23808080' stroke-dasharray='1 1' fill='none'/%3E%3C/svg%3E"); }
            .tree-line.end-node { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M8 0 V8 H16' stroke='%23808080' stroke-dasharray='1 1' fill='none'/%3E%3C/svg%3E"); } /* Same as tee for now, can be L-shape */
            .tree-line.empty { background-image: none; }
            li.root-node-li > .tree-item-connector-container { display: none; } /* No lines for the absolute root's content */
            li.root-node-li { padding-left: 0 !important; }


            /* Modal Styles */
            .bookmark-modal { position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); display:flex; justify-content:center; align-items:center; z-index:100; }
            .bookmark-modal-content { background: #c0c0c0; padding: 20px; border: 2px outset #fff; box-shadow: 2px 2px 5px rgba(0,0,0,0.5); min-width: 320px; }
            .bookmark-modal-content h3 { margin-top: 0; font-size: 14px; }
            .bookmark-modal-content label { display: block; margin: 8px 0 2px; font-size: 11px; }
            .bookmark-modal-content input, .bookmark-modal-content select { width: calc(100% - 10px); padding: 4px; border: 1px inset #808080; margin-bottom: 8px; font-size:12px; }
            .bookmark-modal-close { float: right; font-size: 18px; font-weight: bold; cursor: pointer; margin-top: -10px; }
            #bookmark-modal-save { background-color: #c0c0c0; border: 2px outset #dfdfdf; padding: 5px 15px; cursor: pointer; float:right; }
            #bookmark-modal-save:active { border-style: inset; }
            .url-field { display: block; } /* Ensure URL field visibility can be toggled */
        </style>
    `,
    initApp: (windowEl, instanceId, webviewId, appDef, createWindowFn) => {
        _createWindowFnRef = createWindowFn;

        let bookmarks = loadBookmarks();
        let selectedNodeId = ROOT_NODE_ID; // Default selection to root
        let currentEditNodeId = null;

        const treeContainer = windowEl.querySelector('.tree-view-container');
        const editMenuEl = windowEl.querySelector('.edit-menu');
        const modalEl = windowEl.querySelector('.bookmark-modal');
        const modalTitleEl = modalEl.querySelector('#bookmark-modal-title');
        const typeSelect = modalEl.querySelector('#bookmark-type');
        const titleInput = modalEl.querySelector('#bookmark-title');
        const urlInput = modalEl.querySelector('#bookmark-url');
        const urlLabel = modalEl.querySelector('label[for="bookmark-url"]');
        const parentSelect = modalEl.querySelector('#bookmark-parent');
        const saveButton = modalEl.querySelector('#bookmark-modal-save');
        const closeButton = modalEl.querySelector('.bookmark-modal-close');

        typeSelect.addEventListener('change', () => {
            const isBookmark = typeSelect.value === 'bookmark';
            urlInput.style.display = isBookmark ? 'block' : 'none';
            urlLabel.style.display = isBookmark ? 'block' : 'none';
            if (!isBookmark) urlInput.value = ''; // Clear URL if making a folder
        });

        function populateParentSelect(currentEditingNodeId = null, currentEditingType = 'bookmark') {
            parentSelect.innerHTML = ''; // Clear existing options
            
            // Add "Entire Network" (root) as the first option
            const rootOption = document.createElement('option');
            rootOption.value = ROOT_NODE_ID;
            rootOption.textContent = "Entire Network (Root)";
            parentSelect.appendChild(rootOption);

            // Add other domain/folder nodes
            const folderNodes = bookmarks.filter(b => (b.type === 'domain' || b.type === 'root') && b.id !== currentEditingNodeId);
            
            // Simple flat list for now; could be hierarchical if many folders
            folderNodes.forEach(dn => {
                if (dn.id === ROOT_NODE_ID) return; // Already added
                const option = document.createElement('option');
                option.value = dn.id;
                option.textContent = dn.title + (dn.type === 'domain' ? " (Domain Folder)" : " (Folder)");
                parentSelect.appendChild(option);
            });
        }


        function openModal(mode = 'add', nodeToEdit = null) {
            currentEditNodeId = mode === 'edit' && nodeToEdit ? nodeToEdit.id : null;
            modalTitleEl.textContent = mode === 'add' ? 'Add Item' : 'Edit Item';
            
            const currentType = mode === 'edit' && nodeToEdit ? nodeToEdit.type : 'bookmark';
            typeSelect.value = currentType;
            typeSelect.disabled = (mode === 'edit'); // Cannot change type when editing

            const isBookmark = typeSelect.value === 'bookmark';
            urlInput.style.display = isBookmark ? 'block' : 'none';
            urlLabel.style.display = isBookmark ? 'block' : 'none';

            populateParentSelect(currentEditNodeId, currentType);

            if (mode === 'edit' && nodeToEdit) {
                titleInput.value = nodeToEdit.title;
                urlInput.value = nodeToEdit.url || '';
                parentSelect.value = nodeToEdit.parentId || ROOT_NODE_ID; // Default to root if no parent
                if (nodeToEdit.id === ROOT_NODE_ID) { // Cannot edit parent of root
                    parentSelect.disabled = true;
                } else {
                    parentSelect.disabled = false;
                }
            } else { // Add mode
                titleInput.value = '';
                urlInput.value = '';
                // Default parent to selected node if it's a folder, otherwise root
                const potentialParent = selectedNodeId ? bookmarks.find(b => b.id === selectedNodeId) : null;
                if (potentialParent && (potentialParent.type === 'domain' || potentialParent.type === 'root')) {
                    parentSelect.value = selectedNodeId;
                } else {
                    parentSelect.value = ROOT_NODE_ID;
                }
                parentSelect.disabled = false;
            }
            modalEl.style.display = 'flex';
            titleInput.focus();
        }

        function closeModal() {
            modalEl.style.display = 'none';
        }

        saveButton.addEventListener('click', () => {
            const type = typeSelect.value;
            const title = titleInput.value.trim();
            const url = urlInput.value.trim();
            let parentId = parentSelect.value; // This will be ROOT_NODE_ID if "Entire Network" is selected

            if (!title) { alert("Title is required."); return; }
            if (type === 'bookmark' && !url) { alert("URL is required for bookmarks."); return; }
            if (type === 'bookmark') {
                try { new URL(url); } catch (e) { alert("Invalid URL."); return; }
            }

            if (currentEditNodeId) { // Editing
                const nodeIndex = bookmarks.findIndex(b => b.id === currentEditNodeId);
                if (nodeIndex > -1) {
                    bookmarks[nodeIndex].title = title;
                    if (bookmarks[nodeIndex].type === 'bookmark') {
                        bookmarks[nodeIndex].url = url;
                        bookmarks[nodeIndex].icon = getFaviconSrc(url);
                    }
                    // Only allow changing parent if not the root node
                    if (bookmarks[nodeIndex].id !== ROOT_NODE_ID) {
                        bookmarks[nodeIndex].parentId = parentId;
                    }
                }
            } else { // Adding new
                const newNode = {
                    id: generateNodeId(type),
                    parentId: parentId,
                    type: type,
                    title: title,
                    isExpanded: false, // New folders are collapsed by default
                };
                if (type === 'bookmark') {
                    newNode.url = url;
                    newNode.icon = getFaviconSrc(url);
                } else { // domain/folder
                    newNode.icon = FOLDER_ICON_CLOSED;
                }
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

            selectedNodeId = nodeId;

            if (node.type === 'domain' || node.type === 'root') {
                node.isExpanded = !node.isExpanded;
                // Icon update is handled by renderTreeRecursive
            } else if (node.type === 'bookmark' && node.url) {
                if (_createWindowFnRef) {
                    const targetBrowserAppId = 'internetBrowser';
                    let browserWindow = null;
                    let browserAppInstance = null;
                    const openBrowsers = Object.values(window.openWindows || {}).filter(
                        ow => (ow.appId === targetBrowserAppId || ow.appId === 'internetExplorer' || ow.appId === 'netscapeNavigator') &&
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
                        _createWindowFnRef(targetBrowserAppId, { navigateToUrl: node.url });
                    }
                }
            }
            renderApp();
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
                if (node && node.type === 'bookmark') {
                     handleNodeInteraction(li.dataset.id);
                }
            }
        });

        windowEl.querySelectorAll('.dropdown-item[data-action]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                const selectedNode = selectedNodeId ? bookmarks.find(b => b.id === selectedNodeId) : null;
                editMenuEl.style.display = 'none';

                if (action === 'add') {
                    openModal('add');
                } else if (action === 'edit') {
                    if (selectedNode) {
                        if (selectedNode.id === ROOT_NODE_ID) {
                            alert("Cannot edit the 'Entire Network' root item."); return;
                        }
                        openModal('edit', selectedNode);
                    } else { alert("Please select an item to edit."); }
                } else if (action === 'delete') {
                    if (selectedNode) {
                        if (selectedNode.id === ROOT_NODE_ID) {
                            alert("Cannot delete the 'Entire Network' root item."); return;
                        }
                        if (confirm(`Delete "${selectedNode.title}"? ${selectedNode.type === 'domain' ? 'This will delete all its contents.' : ''}`)) {
                            let idsToDelete = [selectedNodeId];
                            if (selectedNode.type === 'domain' || selectedNode.type === 'root') {
                                const stack = bookmarks.filter(b => b.parentId === selectedNodeId).map(c => c.id);
                                while(stack.length > 0) {
                                    const childId = stack.pop();
                                    idsToDelete.push(childId);
                                    bookmarks.filter(b => b.parentId === childId).forEach(gc => stack.push(gc.id));
                                }
                            }
                            bookmarks = bookmarks.filter(b => !idsToDelete.includes(b.id));
                            selectedNodeId = ROOT_NODE_ID; // Reselect root after delete
                            saveBookmarks(bookmarks);
                            renderApp();
                        }
                    } else { alert("Please select an item to delete."); }
                }
            });
        });
        
        windowEl.querySelectorAll('.menu-item.active-menu').forEach(menu => {
            const dropdown = menu.parentElement.querySelector(`.${menu.dataset.menu}-menu`);
            if (dropdown) {
                menu.addEventListener('click', (e) => { // Changed to click to toggle
                    e.stopPropagation();
                    const isVisible = dropdown.style.display === 'block';
                    document.querySelectorAll('.dropdown-menu').forEach(d => d.style.display = 'none'); // Hide others
                    dropdown.style.display = isVisible ? 'none' : 'block';
                });
                // Hide dropdown if clicked outside
                document.addEventListener('click', (e) => {
                    if (!menu.contains(e.target) && !dropdown.contains(e.target)) {
                        dropdown.style.display = 'none';
                    }
                }, true); // Use capture to catch clicks early
            }
        });

        function renderApp() {
            const treeData = buildTree(bookmarks, null); // Start building from true null parent
            treeContainer.innerHTML = renderTreeRecursive(treeData, 0, selectedNodeId, {});
            
            const editItem = editMenuEl.querySelector('[data-action="edit"]');
            const deleteItem = editMenuEl.querySelector('[data-action="delete"]');
            const selectedNode = selectedNodeId ? bookmarks.find(b => b.id === selectedNodeId) : null;

            if (selectedNode && selectedNode.id !== ROOT_NODE_ID) {
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
