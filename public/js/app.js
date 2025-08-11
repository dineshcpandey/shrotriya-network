// Main app entry point
import { initializeChart, updateChartData, getChartInstance } from './chart.js';
import { setupSearch, clearSearchResults } from './search.js';
import { setupEditForm, openEditForm } from './editForm.js';
import { fetchInitialData, fetchNetworkData } from './api.js';
import { setupControlPanel } from './controlPanel.js';
import { setupEventListeners } from './eventHandlers.js';
import { showAddPersonForm } from './addPerson.js';
import { initAuth, isUserAuthenticated, showLoginForm, logout } from './auth.js';

import { AvatarUtils } from './avatarUtils.js';
import { ChartAvatarEnhancer } from './chartAvatarEnhancer.js';


// Global state
export let chartData = [];
let selectedNode = null;
let highlightModeEnabled = false;
let isEditFormVisible = false;

// Elements
const loadingIndicator = document.getElementById('loading-indicator');
const dataSourceIndicator = document.getElementById('data-source-indicator');

// Function to update the chart data store
export function updateChartDataStore(newData) {

    console.log("app.js: Updating chart data store with", newData.length, "items");
    console.dir(newData)
    // Replace the entire array content
    chartData.length = 0;
    newData.forEach(item => chartData.push(item));
    console.log("Chart Data")
    console.dir(chartData)
}

// Initialize the application
async function initApp() {
    // Initialize authentication
    initAuth();

    // Set up auth-related UI
    setupAuthUI();

    // Show loading indicator
    showLoading(true);

    try {
        // Load initial data
        const initialData = await fetchInitialData();

        // Update chart data store
        updateChartDataStore(initialData);

        // Initialize chart with data
        await initializeChart(chartData, {
            onNodeSelect: handleNodeSelect
        });

        // Set up search functionality
        setupSearch({
            onPersonSelect: handleAddPersonFromSearch
        });

        // Set up edit form
        setupEditForm({
            onClose: toggleEditForm
        });

        // Set up control panel
        setupControlPanel({
            onEditClick: handleEditButtonClick,
            onHighlightToggle: toggleHighlightMode,
            onResetClick: resetChart,
            onDownloadClick: downloadChartData,
            onClearClick: clearChartData,
            onAddPersonClick: handleAddPersonClick
        });

        // Set up global event handlers
        setupEventListeners();

        // Update indicators
        showLoading(false);
        updateDataSourceIndicator('Initial data loaded');

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        showLoading(false);
        updateDataSourceIndicator('Error loading data', true);
    }
}

/**
 * Set up authentication UI elements
 */
function setupAuthUI() {
    // Create auth UI elements if they don't exist
    if (!document.getElementById('auth-container')) {
        // Create auth container in header
        const headerControls = document.querySelector('.header-controls');
        if (headerControls) {
            const authContainer = document.createElement('div');
            authContainer.id = 'auth-container';
            authContainer.className = 'auth-buttons';
            authContainer.innerHTML = `
                <div id="auth-user-display" class="auth-user-display" style="display: none;">
                    <span class="user-icon">👤</span>
                    <span id="username-display"></span>
                </div>
                <button id="login-button">Log In</button>
                <button id="logout-button" style="display: none;">Log Out</button>
            `;

            // Insert before the first child of header controls
            headerControls.insertBefore(authContainer, headerControls.firstChild);

            // Add event listeners
            document.getElementById('login-button').addEventListener('click', showLoginForm);
            document.getElementById('logout-button').addEventListener('click', handleLogout);
        }

        // Add auth-required data attribute to edit and add buttons
        const editButton = document.getElementById('edit-button');
        const addPersonButton = document.getElementById('add-person-button');

        if (editButton) editButton.setAttribute('data-auth-required', 'true');
        if (addPersonButton) addPersonButton.setAttribute('data-auth-required', 'true');
    }

    // Listen for auth state changes
    document.addEventListener('authStateChanged', handleAuthStateChange);
}

/**
 * Handle authentication state change
 * @param {CustomEvent} event - The auth state change event
 */
function handleAuthStateChange(event) {
    const { isAuthenticated, currentUser } = event.detail;

    // Update username display
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay && currentUser) {
        usernameDisplay.textContent = currentUser.displayName || currentUser.username;
    }

    // If user was editing and got logged out, close the edit form
    if (!isAuthenticated && isEditFormVisible) {
        toggleEditForm();
    }
}

/**
 * Handle logout button click
 */
function handleLogout() {
    logout();
    showNotification('You have been logged out', 'info');
}

/**
 * Handle edit button click with auth check
 */
function handleEditButtonClick() {
    if (isUserAuthenticated()) {
        toggleEditForm();
    } else {
        showAuthRequired('edit family members');
    }
}

/**
 * Handle add person button click with auth check
 */
function handleAddPersonClick() {
    if (isUserAuthenticated()) {
        addNewPerson();
    } else {
        showAuthRequired('add new family members');
    }
}

/**
 * Show authentication required message
 * @param {string} action - The action requiring authentication
 */
function showAuthRequired(action) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'unauthorized-overlay';
    overlay.innerHTML = `
        <h3>Authentication Required</h3>
        <p>You need to log in to ${action}.</p>
        <button id="auth-login-button">Log In</button>
    `;

    // Add to main content area
    const appMain = document.querySelector('.app-main');
    if (appMain) {
        appMain.appendChild(overlay);

        // Add event listener to login button
        overlay.querySelector('#auth-login-button').addEventListener('click', () => {
            // Remove overlay
            overlay.parentNode.removeChild(overlay);
            // Show login form
            showLoginForm();
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 5000);
    }
}

// Handle node selection
/**
 * Handle node selection
 * @param {Object} node - The selected node
 */
async function handleNodeSelect(node) {
    selectedNode = node;

    // Update selected node info in UI
    const selectedInfo = document.getElementById('selected-info');
    const selectedNodeId = document.getElementById('selected-node-id');
    const fullName = `${node.data["first name"] || ''} ${node.data["last name"] || ''}`.trim();

    if (selectedInfo && selectedNodeId) {
        selectedInfo.style.display = 'block';
        selectedNodeId.textContent = `${fullName} (ID: ${node.id})`;
    }

    // Clear search results when a node is selected
    clearSearchResults();

    // Check if edit form is currently visible and update it with the new person
    const editForm = document.getElementById('edit-form');
    const editBtn = document.getElementById('edit-button');

    if (editForm && editForm.classList.contains('visible') && isEditFormVisible) {
        console.log('Edit form is open, updating with new person:', node);
        try {
            // Update the edit form with the new person's details
            openEditForm(node);

            // Update the edit button text to reflect the current person
            if (editBtn) {
                editBtn.textContent = 'Close Edit Form';
                editBtn.classList.add('active');
            }

            // Show notification that the form has been updated
            showNotification(`Edit form updated for ${fullName}`, 'info');
        } catch (error) {
            console.error('Error updating edit form with new person:', error);
            showNotification('Error updating edit form', 'error');
        }
    }

    // Only fetch network data if this is coming from a direct chart click,
    // not from a search highlight (to avoid unnecessary API calls)
    if (!node._fromSearch) {
        // Fetch network data for this node
        showLoading(true);
        try {
            const networkData = await fetchNetworkData(node.id);

            // Update chart data with network data
            await updateChartData(networkData);

            // Log the updated chart data size for verification
            console.log("app.js: After update, chart data has", chartData.length, "items");

            updateDataSourceIndicator(`Network data loaded for ID: ${node.id}`);
        } catch (error) {
            console.error('Error fetching network data:', error);
            updateDataSourceIndicator(`Error loading network for ID: ${node.id}`, true);
        } finally {
            showLoading(false);
        }
    }
}

/**
 * Handle adding a person from search to the chart
 * @param {Object} person - The person to add
 */
async function handleAddPersonFromSearch(person) {
    // Check if user is authenticated
    if (!isUserAuthenticated()) {
        showAuthRequired('add family members to the chart');
        return;
    }

    console.log('Adding person to chart:', person);

    // Show loading indicator
    showLoading(true);

    try {
        // Clear the chart first (without confirmation)
        clearChartData(false);

        // Create a sanitized copy of the person to prevent errors with non-existent relationships
        const sanitizedPerson = {
            id: person.id,
            data: { ...person.data },
            rels: { "spouses": [], "Children": [] }
            //rels: person.rels || {}  // Use existing rels or empty object
        };

        // Add sanitized person to chart data
        //chartData.push(sanitizedPerson);

        // Initialize chart with the single person
        await initializeChart([sanitizedPerson], {
            onNodeSelect: handleNodeSelect
        });

        // Important: Fetch network data for this person
        console.log(`Fetching network data for ID: ${sanitizedPerson.id}`);
        const networkData = await fetchNetworkData(sanitizedPerson.id);

        // Update chart with network data
        await updateChartData(networkData);

        // Update UI indicators
        const fullName = `${sanitizedPerson.data["first name"] || ''} ${sanitizedPerson.data["last name"] || ''}`.trim();
        updateDataSourceIndicator(`Added ${fullName} with ${networkData.length} connections`);

        // Clear search results
        clearSearchResults();
    } catch (error) {
        console.error('Error adding person to chart:', error);
        updateDataSourceIndicator('Error adding person to chart', true);
    } finally {
        showLoading(false);
    }
}

// Toggle edit form visibility
function toggleEditForm() {
    // Check if a node is selected
    if (!selectedNode) {
        // Show a notification to the user
        showNotification('Please select a person to edit first', 'error');
        console.warn('No node selected for editing');
        return;
    }

    isEditFormVisible = !isEditFormVisible;

    const editForm = document.getElementById('edit-form');
    const editBtn = document.getElementById('edit-button');

    if (editForm && editBtn) {
        if (isEditFormVisible) {
            // Initialize form with selected node
            try {
                // Use the specialized openEditForm function from editForm.js
                openEditForm(selectedNode);

                editBtn.classList.add('active');
                editBtn.textContent = 'Close Edit Form';
            } catch (error) {
                console.error("Error opening edit form:", error);

                // Show error notification
                showNotification('Error opening edit form', 'error');

                // Reset toggle state
                isEditFormVisible = false;
            }
        } else {
            editForm.classList.remove('visible');
            editBtn.classList.remove('active');
            editBtn.textContent = 'Edit Person';

            // Clear the form content when closing
            const editFormContent = document.getElementById('edit-form-content');
            if (editFormContent) {
                editFormContent.innerHTML = '';
            }

            // Import and call the function to clear the current edit person reference
            import('./chart.js').then(module => {
                if (module.clearCurrentEditPerson) {
                    module.clearCurrentEditPerson();
                }
            });
        }
    }
}

// Toggle highlight mode
function toggleHighlightMode() {
    highlightModeEnabled = !highlightModeEnabled;

    const highlightBtn = document.getElementById('highlight-button');

    if (highlightBtn) {
        if (highlightModeEnabled) {
            highlightBtn.classList.add('active');
            highlightBtn.textContent = 'Show All Nodes';

            // Apply highlighting if we have a selected node
            if (selectedNode) {
                applyHighlighting(selectedNode.id);
            }
        } else {
            highlightBtn.classList.remove('active');
            highlightBtn.textContent = 'Highlight Connected Nodes';

            // Remove highlighting
            removeHighlighting();
        }
    }
}

// Apply highlighting to connected nodes
function applyHighlighting(nodeId) {
    const chart = getChartInstance();
    const cardEl = document.querySelector(`.card_cont div[data-id="${nodeId}"]`);

    if (chart && chart.onEnterPathToMain && cardEl) {
        try {
            // We can use the onEnterPathToMain method provided by f3
            chart.onEnterPathToMain({ target: cardEl }, { data: { id: nodeId } });
            console.log('Highlighting applied to node:', nodeId);
        } catch (error) {
            console.error('Error applying highlighting:', error);
        }
    }
}

// Remove highlighting
function removeHighlighting() {
    const chart = getChartInstance();

    if (chart && chart.onLeavePathToMain) {
        try {
            chart.onLeavePathToMain();
            console.log('Highlighting removed');
        } catch (error) {
            console.error('Error removing highlighting:', error);
        }
    }
}

// Reset chart
async function resetChart() {
    showLoading(true);

    try {
        // Load initial data again
        const initialData = await fetchInitialData();

        // Update chart data store
        updateChartDataStore(initialData);

        // Reinitialize chart
        await initializeChart(chartData, {
            onNodeSelect: handleNodeSelect
        });

        // Reset state
        selectedNode = null;
        highlightModeEnabled = false;
        isEditFormVisible = false;

        // Update UI
        const selectedInfo = document.getElementById('selected-info');
        const highlightBtn = document.getElementById('highlight-button');

        if (selectedInfo) {
            selectedInfo.style.display = 'none';
        }

        if (highlightBtn) {
            highlightBtn.disabled = true;
            highlightBtn.classList.remove('active');
            highlightBtn.textContent = 'Highlight Connected Nodes';
        }

        // Close edit form if open
        if (isEditFormVisible) {
            toggleEditForm();
        }

        updateDataSourceIndicator('Chart reset to initial data');
    } catch (error) {
        console.error('Error resetting chart:', error);
        updateDataSourceIndicator('Error resetting chart', true);
    } finally {
        showLoading(false);
    }
}

/**
 * Clear all chart data
 * @param {boolean} showConfirm - Whether to show confirmation dialog
 */
function clearChartData(showConfirm = true) {
    // Check if authenticated for destructive action
    if (showConfirm && !isUserAuthenticated()) {
        showAuthRequired('clear the chart data');
        return;
    }

    // Show confirmation dialog if requested
    if (showConfirm && !confirm('Are you sure you want to clear all chart data? This action cannot be undone.')) {
        return; // User canceled
    }

    showLoading(true);

    try {
        // Clear chart data completely
        updateChartDataStore([]);

        // Get the chart container
        const chartContainer = document.getElementById('FamilyChart');
        if (chartContainer) {
            // Clear any existing chart
            chartContainer.innerHTML = '';

            // Create empty state message, but only if we're not about to add a new person
            if (showConfirm) {
                const emptyStateEl = document.createElement('div');
                emptyStateEl.className = 'empty-chart-message';
                emptyStateEl.innerHTML = `
                    <div class="empty-chart-content">
                        <h2>Family Tree is Empty</h2>
                        <p>Use the search function to find and add people to your family tree.</p>
                        <div class="empty-chart-icon">👪</div>
                    </div>
                `;

                // Add to chart container
                chartContainer.appendChild(emptyStateEl);
            }
        }

        // Reset application state
        selectedNode = null;

        // Update selected node info
        const selectedInfo = document.getElementById('selected-info');
        if (selectedInfo) {
            selectedInfo.style.display = 'none';
        }

        // Close edit form if open
        if (isEditFormVisible) {
            toggleEditForm();
        }

        if (showConfirm) {
            // Only show this message if we're doing a user-initiated clear
            updateDataSourceIndicator('Chart data cleared');
        }
    } catch (error) {
        console.error('Error clearing chart data:', error);
        updateDataSourceIndicator('Error clearing chart data', true);
    } finally {
        showLoading(false);
    }
}

/**
 * Create a new person and add them to the chart
 */
function addNewPerson() {
    // Show the new add person modal instead of using prompts
    showAddPersonForm();
}

// Download chart data as JSON
function downloadChartData() {
    const blob = new Blob([JSON.stringify(chartData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family-chart-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Show or hide loading indicator
function showLoading(show) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
}

/**
 * Update data source indicator
 * @param {string} message - Message to display
 * @param {boolean} isError - Whether this is an error message
 */
function updateDataSourceIndicator(message, isError = false) {
    const dataSourceIndicator = document.getElementById('data-source-indicator');
    if (dataSourceIndicator) {
        dataSourceIndicator.textContent = message;
        dataSourceIndicator.style.backgroundColor = isError ? 'rgba(231, 76, 60, 0.7)' : 'rgba(0, 0, 0, 0.7)';
    }
}

/**
 * Show a notification
 * @param {string} message - The notification message
 * @param {string} type - Notification type ('success', 'error', 'info')
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after animation duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Export functions and state that other modules might need
// Helper functions for edit form state management
/**
 * Get the current edit form visibility state
 * @returns {boolean} Whether the edit form is visible
 */
export function getEditFormVisibility() {
    return isEditFormVisible;
}

/**
 * Set the edit form visibility state
 * @param {boolean} visible - Whether the edit form should be visible
 */
export function setEditFormVisibility(visible) {
    isEditFormVisible = visible;
}

export {
    selectedNode,
    handleNodeSelect,
    handleAddPersonFromSearch,
    toggleEditForm,
    toggleHighlightMode,
    resetChart,
    clearChartData,
    addNewPerson,
    downloadChartData,
    showLoading,
    updateDataSourceIndicator,
    showNotification
};