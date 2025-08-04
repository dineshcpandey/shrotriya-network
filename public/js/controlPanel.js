// Control Panel functionality

// Default options
let controlOptions = {
    onEditClick: null,
    onHighlightToggle: null,
    onResetClick: null,
    onDownloadClick: null,
    onClearClick: null,
    onAddPersonClick: null
};

/**
 * Set up control panel functionality
 * @param {Object} options - Control panel options
 */
export function setupControlPanel(options = {}) {
    // Merge options
    controlOptions = { ...controlOptions, ...options };

    // Set up event listeners for header controls
    setupHeaderControls();

    // Set up event listener for selected info
    setupSelectedInfo();

    console.log('Control panel functionality initialized');
}

/**
 * Set up event listeners for header control buttons
 */
function setupHeaderControls() {
    // Edit Person button
    if (controlOptions.onEditClick) {
        const editButton = document.getElementById('edit-button');
        if (editButton) {
            editButton.addEventListener('click', controlOptions.onEditClick);
        } else {
            console.warn('Edit button not found');
        }
    }

    // Add Person button
    if (controlOptions.onAddPersonClick) {
        const addPersonButton = document.getElementById('add-person-button');
        if (addPersonButton) {
            addPersonButton.addEventListener('click', controlOptions.onAddPersonClick);
        } else {
            console.warn('Add person button not found');
        }
    }

    // Clear Chart button
    if (controlOptions.onClearClick) {
        const clearButton = document.getElementById('clear-button');
        if (clearButton) {
            clearButton.addEventListener('click', controlOptions.onClearClick);
        } else {
            console.warn('Clear button not found');
        }
    }
}

/**
 * Set up event listener for selected info element
 */
function setupSelectedInfo() {
    // Nothing to do here anymore as we're just displaying info
    // The selected info is updated elsewhere in the code
}

/**
 * Update selected node information
 * @param {Object} node - Selected node data
 */
export function updateSelectedNodeInfo(node) {
    const selectedInfo = document.getElementById('selected-info');
    const selectedNodeId = document.getElementById('selected-node-id');

    if (!selectedInfo || !selectedNodeId) return;

    if (node) {
        selectedInfo.style.display = 'block';
        selectedNodeId.textContent = node.id;
    } else {
        selectedInfo.style.display = 'none';
    }
}

/**
 * Update edit button state
 * @param {boolean} isActive - Whether edit mode is active
 */
export function updateEditButtonState(isActive) {
    const editButton = document.getElementById('edit-button');
    if (!editButton) return;

    if (isActive) {
        editButton.classList.add('active');
        editButton.textContent = 'Close Edit Form';
    } else {
        editButton.classList.remove('active');
        editButton.textContent = 'Edit Person';
    }
}