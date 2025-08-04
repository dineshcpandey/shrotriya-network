// route-finder.js - Route Finding Application with Custom Visualization
// Following the same patterns as the existing route-finder.js

// Import only existing modules based on your actual codebase
import { initializeChart, updateChartData, getChartInstance } from './chart.js';
import { setupEditForm } from './editForm.js';
import { fetchNetworkData } from './api-utils.js';
import { initAuth, isUserAuthenticated, showLoginForm, logout } from './auth.js';
import { searchPeople, fetchLocationSuggestions, makeAuthenticatedRequest } from './api-utils.js';

// Global state following the same pattern as existing route-finder.js
export let chartData = [];
let selectedNode = null;
let selectedPerson1 = null;
let selectedPerson2 = null;
let routeData = null;
let isEditFormVisible = false;
let isChartMode = false;

// Elements
const loadingIndicator = document.getElementById('loading-indicator');
const dataSourceIndicator = document.getElementById('data-source-indicator');

// Search instance management
let searchInstance1 = null;
let searchInstance2 = null;

// Custom visualization variables
let visualizationNodes = [];
let visualizationLinks = [];
let routeNodeIds = new Set();

// Chart dimensions
const containerWidth = 1360;
const containerHeight = 700;

// Function to update the chart data store (same as existing)
export function updateChartDataStore(newData) {
    console.log("route-finder.js: Updating chart data store with", newData.length, "items");
    chartData.length = 0;
    newData.forEach(item => chartData.push(item));
}

// Initialize the application (following existing pattern)
async function initApp() {
    console.log('Initializing Route Finder App...');

    // Initialize authentication (same as existing)
    initAuth();

    // Set up auth-related UI (same as existing)
    setupAuthUI();

    // Show loading indicator
    showLoading(true);

    try {
        // Load initial data (empty for route finder)
        const initialData = [];

        // Update chart data store (start with empty for route finder)
        updateChartDataStore(initialData);

        // Set up dual search functionality
        setupDualSearch();

        // Set up edit form (same as existing)
        setupEditForm({
            onClose: toggleEditForm
        });

        // Set up route finder specific event handlers
        setupRouteFinderEventHandlers();

        // Set up global event handlers
        setupGlobalEventHandlers();

        // Initialize in search mode
        switchToSearchMode();

        // Update indicators
        showLoading(false);
        updateDataSourceIndicator('Select two people to find route');

        console.log('Route Finder application initialized successfully');
    } catch (error) {
        console.error('Error initializing Route Finder application:', error);
        showLoading(false);
        updateDataSourceIndicator('Error loading data', true);
    }
}

// Set up authentication UI (same as existing)
function setupAuthUI() {
    if (!document.getElementById('auth-container')) {
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

            headerControls.insertBefore(authContainer, headerControls.firstChild);

            document.getElementById('login-button').addEventListener('click', () => showLoginForm());
            document.getElementById('logout-button').addEventListener('click', handleLogout);
        }

        const editButton = document.getElementById('edit-button');
        const addPersonButton = document.getElementById('add-person-button');

        if (editButton) editButton.setAttribute('data-auth-required', 'true');
        if (addPersonButton) addPersonButton.setAttribute('data-auth-required', 'true');
    }

    document.addEventListener('authStateChanged', handleAuthStateChange);
}

// Set up dual search functionality (same as existing)
function setupDualSearch() {
    console.log('Setting up dual search functionality...');

    // Create search instance for person 1
    searchInstance1 = new PersonSearch(1, {
        onPersonSelect: (person) => selectPerson(person, 1)
    });

    // Create search instance for person 2
    searchInstance2 = new PersonSearch(2, {
        onPersonSelect: (person) => selectPerson(person, 2)
    });

    console.log('Dual search setup complete');
}

// PersonSearch class (same as existing)
class PersonSearch {
    constructor(personNumber, options = {}) {
        this.personNumber = personNumber;
        this.options = options;
        this.currentSuggestions = [];
        this.selectedSuggestionIndex = -1;
        this.debounceTimer = null;

        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.searchForm = document.getElementById(`search-form-${this.personNumber}`);
        this.nameInput = document.getElementById(`name-input-${this.personNumber}`);
        this.locationInput = document.getElementById(`location-input-${this.personNumber}`);
        this.locationSuggestions = document.getElementById(`location-suggestions-${this.personNumber}`);
        this.searchButton = document.getElementById(`search-button-${this.personNumber}`);
        this.clearButton = document.getElementById(`clear-search-btn-${this.personNumber}`);
        this.searchError = document.getElementById(`search-error-${this.personNumber}`);
        this.resultsCount = document.getElementById(`results-count-${this.personNumber}`);
        this.personCards = document.getElementById(`person-cards-${this.personNumber}`);
        this.searchResultsDropdown = document.getElementById(`search-results-dropdown-${this.personNumber}`);
        this.closeResultsBtn = document.getElementById(`close-results-btn-${this.personNumber}`);
    }

    setupEventListeners() {
        if (this.searchForm) {
            this.searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        }

        if (this.locationInput) {
            this.locationInput.addEventListener('input', (e) => {
                this.handleLocationInput(e.target.value);
            });
            this.locationInput.addEventListener('blur', () => {
                setTimeout(() => this.hideSuggestions(), 300);
            });
        }

        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        if (this.closeResultsBtn) {
            this.closeResultsBtn.addEventListener('click', () => {
                this.clearSearchResults();
            });
        }

        document.addEventListener('click', (e) => {
            if (this.searchResultsDropdown && !this.searchResultsDropdown.contains(e.target)) {
                this.clearSearchResults();
            }
        });
    }

    async performSearch() {
        const name = this.nameInput?.value?.trim() || '';
        const location = this.locationInput?.value?.trim() || '';

        if (!name && !location) {
            this.showError('Please enter a name or location to search');
            return;
        }

        if (!isUserAuthenticated()) {
            showLoginForm();
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const results = await searchPeople(name, location);
            this.displayResults(results);
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    displayResults(results) {
        if (!this.personCards || !this.searchResultsDropdown) return;

        this.personCards.innerHTML = '';

        if (results.length === 0) {
            this.personCards.innerHTML = '<div class="no-results">No people found matching your search.</div>';
        } else {
            results.forEach(person => {
                const card = this.createPersonCard(person);
                this.personCards.appendChild(card);
            });
        }

        this.updateResultsCount(results.length);
        this.showSearchResults();
    }

    createPersonCard(person) {
        const card = document.createElement('div');
        card.className = 'person-card';

        const fullName = person.personname ||
            (person.data ? `${person.data["first name"] || ''} ${person.data["last name"] || ''}`.trim() : 'Unknown');
        const location = person.currentlocation || person.data?.location || 'Unknown location';
        const gender = person.gender || person.data?.gender || '';
        const genderText = gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : 'Unknown';
        const avatar = person.profile_image_url || person.data?.avatar ||
            'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg';

        card.innerHTML = `
            <div class="person-card-content">
                <img src="${avatar}" alt="${fullName}" class="person-avatar">
                <div class="person-info">
                    <div class="person-name">${fullName}</div>
                    <div class="person-details">${genderText} • ${location}</div>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            if (this.options.onPersonSelect) {
                this.options.onPersonSelect(person);
            }
        });

        return card;
    }

    async handleLocationInput(query) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(async () => {
            if (query.length >= 2) {
                try {
                    const suggestions = await fetchLocationSuggestions(query);
                    this.showSuggestions(suggestions);
                } catch (error) {
                    console.error('Location suggestions error:', error);
                }
            } else {
                this.hideSuggestions();
            }
        }, 300);
    }

    showSuggestions(suggestions) {
        if (this.locationSuggestions && suggestions.length > 0) {
            this.locationSuggestions.innerHTML = '';
            suggestions.forEach(suggestion => {
                const item = document.createElement('div');
                item.className = 'location-suggestion-item';
                item.textContent = suggestion;
                item.addEventListener('click', () => {
                    this.locationInput.value = suggestion;
                    this.hideSuggestions();
                });
                this.locationSuggestions.appendChild(item);
            });
            this.locationSuggestions.style.display = 'block';
        }
    }

    hideSuggestions() {
        if (this.locationSuggestions) {
            this.locationSuggestions.style.display = 'none';
        }
    }

    showSearchResults() {
        if (this.searchResultsDropdown) {
            this.searchResultsDropdown.style.display = 'flex';
            this.searchResultsDropdown.style.visibility = 'visible';
            this.searchResultsDropdown.style.opacity = '1';
        }
    }

    clearSearchResults() {
        if (this.searchResultsDropdown) {
            this.searchResultsDropdown.style.display = 'none';
            this.searchResultsDropdown.style.visibility = 'hidden';
            this.searchResultsDropdown.style.opacity = '0';
        }
    }

    clearSearch() {
        if (this.nameInput) this.nameInput.value = '';
        if (this.locationInput) this.locationInput.value = '';
        this.hideSuggestions();
        this.clearSearchResults();
        this.hideError();
    }

    showLoading(show) {
        if (this.searchButton) {
            this.searchButton.disabled = show;
            this.searchButton.textContent = show ? 'Searching...' : 'Search';
        }
    }

    showError(message) {
        if (this.searchError) {
            this.searchError.textContent = message;
            this.searchError.style.display = 'block';
        }
    }

    hideError() {
        if (this.searchError) {
            this.searchError.style.display = 'none';
        }
    }

    updateResultsCount(count) {
        if (this.resultsCount) {
            this.resultsCount.textContent = `${count} results found`;
        }
    }

    isModalVisible() {
        if (!this.searchResultsDropdown) return false;
        const computedStyle = window.getComputedStyle(this.searchResultsDropdown);
        return computedStyle.display === 'flex' && computedStyle.visibility !== 'hidden';
    }
}

// Person selection handler
function selectPerson(person, personNumber) {
    console.log(`Person ${personNumber} selected:`, person);

    if (personNumber === 1) {
        selectedPerson1 = person;
        updatePersonDisplay(person, 1);
        if (searchInstance1) {
            searchInstance1.clearSearchResults();
        }
    } else {
        selectedPerson2 = person;
        updatePersonDisplay(person, 2);
        if (searchInstance2) {
            searchInstance2.clearSearchResults();
        }
    }

    updateFindRouteButton();
}

// Update person display
function updatePersonDisplay(person, personNumber) {
    const displayElement = document.getElementById(`person${personNumber}-display`);
    if (!displayElement) return;

    let fullName = '';
    if (person.personname) {
        fullName = person.personname;
    } else if (person.data) {
        fullName = `${person.data["first name"] || ''} ${person.data["last name"] || ''}`.trim();
    }

    const location = person.currentlocation || person.data?.location || 'Unknown location';
    const gender = person.gender || person.data?.gender || '';
    const genderText = gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : 'Unknown';
    const avatar = person.profile_image_url || person.data?.avatar ||
        'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg';

    displayElement.innerHTML = `
        <div class="selected-person-card">
            <img src="${avatar}" 
                 alt="${fullName}" class="selected-person-avatar">
            <div class="selected-person-info">
                <div class="selected-person-name">${fullName}</div>
                <div class="selected-person-details">${genderText} • ${location}</div>
            </div>
            <button class="remove-selection-btn" onclick="removeSelection(${personNumber})">&times;</button>
        </div>
    `;
}

// Remove person selection
function removeSelection(personNumber) {
    if (personNumber === 1) {
        selectedPerson1 = null;
        const display = document.getElementById('person1-display');
        if (display) display.innerHTML = '<span class="no-selection">No person selected</span>';
    } else {
        selectedPerson2 = null;
        const display = document.getElementById('person2-display');
        if (display) display.innerHTML = '<span class="no-selection">No person selected</span>';
    }
    updateFindRouteButton();
}

// Update find route button state
function updateFindRouteButton() {
    const findRouteBtn = document.getElementById('find-route-btn');
    if (findRouteBtn) {
        findRouteBtn.disabled = !(selectedPerson1 && selectedPerson2);
    }
}

// Handle find route button click
async function handleFindRoute() {
    if (!selectedPerson1 || !selectedPerson2) {
        alert('Please select two people first');
        return;
    }

    if (selectedPerson1.id === selectedPerson2.id) {
        alert('Please select two different people');
        return;
    }

    if (!isUserAuthenticated()) {
        showLoginForm();
        return;
    }

    showLoading(true);
    updateRouteStatus('Finding route...');

    try {
        const response = await makeAuthenticatedRequest(`/api/details/${selectedPerson1.id}/route/${selectedPerson2.id}`);

        if (!response.ok) {
            throw new Error(`Route API error: ${response.status}`);
        }

        routeData = await response.json();
        await displayRouteResults(routeData);

    } catch (error) {
        console.error('Error finding route:', error);
        updateRouteStatus('Error finding route. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Display route results using custom visualization
async function displayRouteResults(routeData) {
    console.log('Displaying route results:', routeData);

    if (!routeData.pathExists) {
        updateRouteStatus('No connection found between the selected people');
        showEmptyVisualization('No route found between the selected people.');
        return;
    }

    // Update route info
    updateRouteStatus(`Route found! ${routeData.degreeOfSeparation} degrees of separation`);
    updateRouteDetails(routeData);

    // Initialize custom visualization
    initializeCustomVisualization(routeData);
}

// Initialize custom visualization with route data
function initializeCustomVisualization(routeData) {
    console.log('Initializing custom visualization with route data:', routeData);

    const container = document.getElementById('custom-chart-container');
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';

    // Extract route node IDs
    routeNodeIds = new Set(routeData.pathIds.map(id => id.toString()));

    // Convert route data to visualization format
    visualizationNodes = routeData.path.map((person, index) => {
        let nodeType = 'route';
        if (index === 0 || index === routeData.path.length - 1) {
            nodeType = 'main'; // Start and end points
        }

        return {
            id: person.id.toString(),
            data: person.data,
            rels: person.rels,
            x: 0,
            y: 0,
            type: nodeType
        };
    });

    // Create links between consecutive nodes in the route
    visualizationLinks = [];
    for (let i = 0; i < visualizationNodes.length - 1; i++) {
        const sourceNode = visualizationNodes[i];
        const targetNode = visualizationNodes[i + 1];

        let linkType = 'route';
        if (sourceNode.rels.children && sourceNode.rels.children.includes(targetNode.id)) {
            linkType = 'parent';
        } else if (sourceNode.rels.spouses && sourceNode.rels.spouses.includes(targetNode.id)) {
            linkType = 'spouse';
        } else if (targetNode.rels.children && targetNode.rels.children.includes(sourceNode.id)) {
            linkType = 'parent';
        }

        visualizationLinks.push({
            source: sourceNode.id,
            target: targetNode.id,
            type: linkType
        });
    }

    // Position nodes and render
    layoutNodes();
    renderCustomVisualization();

    // Show legend
    const legend = document.getElementById('route-legend');
    if (legend) legend.style.display = 'block';
}

// Layout nodes in a path
function layoutNodes() {
    const nodeCount = visualizationNodes.length;
    const startX = 100;
    const endX = containerWidth - 300;
    const centerY = containerHeight / 2 - 50;

    if (nodeCount === 1) {
        visualizationNodes[0].x = containerWidth / 2 - 100;
        visualizationNodes[0].y = centerY;
    } else {
        const stepX = (endX - startX) / (nodeCount - 1);

        visualizationNodes.forEach((node, index) => {
            node.x = startX + (index * stepX);
            node.y = centerY + (index % 2 === 0 ? 0 : 100);
        });
    }
}

// Render the custom visualization
function renderCustomVisualization() {
    const container = document.getElementById('custom-chart-container');
    if (!container) return;

    // Clear container
    container.innerHTML = '';

    // Draw connection lines first
    visualizationLinks.forEach(link => {
        const sourceNode = visualizationNodes.find(n => n.id === link.source);
        const targetNode = visualizationNodes.find(n => n.id === link.target);

        if (sourceNode && targetNode) {
            const line = document.createElement('div');
            line.className = `connection-line ${link.type}`;

            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;

            line.style.left = `${sourceNode.x + 80}px`;
            line.style.top = `${sourceNode.y + 40}px`;
            line.style.width = `${length}px`;
            line.style.transform = `rotate(${angle}deg)`;
            line.classList.add('route');

            container.appendChild(line);
        }
    });

    // Draw nodes
    visualizationNodes.forEach(node => {
        const nodeCard = document.createElement('div');
        nodeCard.className = `node-card ${node.type}`;
        nodeCard.setAttribute('data-id', node.id);

        if (node.data.gender === 'F') {
            nodeCard.classList.add('female');
        }

        nodeCard.style.left = `${node.x}px`;
        nodeCard.style.top = `${node.y}px`;

        const fullName = `${node.data['first name'] || ''} ${node.data['last name'] || ''}`.trim();
        const location = node.data.location || 'Unknown location';
        const work = node.data.work || '';

        nodeCard.innerHTML = `
            <div class="node-name">${fullName}</div>
            <div class="node-details">📍 ${location}</div>
            ${work ? `<div class="node-details">💼 ${work}</div>` : ''}
            <div class="node-id">ID: ${node.id}</div>
        `;

        nodeCard.addEventListener('click', () => handleNodeClick(node));
        container.appendChild(nodeCard);
    });

    const legend = document.getElementById('route-legend');
    if (legend) {
        legend.style.display = 'block';
    }
}

// Handle node click
function handleNodeClick(node) {
    console.log('Node clicked:', node.id);
    selectedNode = node;
}

// Handle node selection and network expansion (same as existing route-finder.js)
async function handleNodeSelect(node) {
    selectedNode = node;
    console.log('Node selected in route finder:', node);

    // Handle both flat API response and nested chart data structure
    let fullName = '';
    if (node.personname) {
        fullName = node.personname;
    } else if (node.data) {
        fullName = `${node.data["first name"] || ''} ${node.data["last name"] || ''}`.trim();
    }

    // You can add more node selection logic here if needed
    console.log('Selected node:', fullName, 'ID:', node.id);
}

// Show empty visualization state
function showEmptyVisualization(message) {
    const container = document.getElementById('custom-chart-container');
    if (!container) return;

    container.innerHTML = `
        <div class="chart-empty">
            <div>
                <h3>No Route Found</h3>
                <p>${message}</p>
                <p>Try selecting different people to find a connection.</p>
            </div>
        </div>
    `;

    const legend = document.getElementById('route-legend');
    if (legend) legend.style.display = 'none';
}

// Update route status
function updateRouteStatus(message) {
    const statusElement = document.getElementById('route-status-text');
    if (statusElement) {
        statusElement.textContent = message;
    }

    const routeInfo = document.getElementById('route-info');
    if (routeInfo) {
        routeInfo.style.display = 'block';
    }
}

// Update route details
function updateRouteDetails(routeData) {
    const degreeElement = document.getElementById('degree-value');
    const pathLengthElement = document.getElementById('path-length-value');
    const routeDetails = document.getElementById('route-details');

    if (degreeElement) {
        degreeElement.textContent = routeData.degreeOfSeparation;
    }

    if (pathLengthElement) {
        pathLengthElement.textContent = routeData.pathIds.length;
    }

    if (routeDetails) {
        routeDetails.style.display = 'block';
    }
}

// Show/hide loading indicator
function showLoading(show) {
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
}

// Set up route finder specific event handlers
function setupRouteFinderEventHandlers() {
    const findRouteBtn = document.getElementById('find-route-btn');
    if (findRouteBtn) {
        findRouteBtn.addEventListener('click', handleFindRoute);
    }

    const clearSelectionsBtn = document.getElementById('clear-selections-btn');
    if (clearSelectionsBtn) {
        clearSelectionsBtn.addEventListener('click', handleClearSelections);
    }

    const clearButton = document.getElementById('clear-button');
    if (clearButton) {
        clearButton.addEventListener('click', handleClearChart);
    }

    const toggleSearchBtn = document.getElementById('toggle-search-btn');
    if (toggleSearchBtn) {
        toggleSearchBtn.addEventListener('click', () => {
            if (isChartMode) {
                switchToSearchMode();
            } else {
                switchToChartMode();
            }
        });
    }
}

// Handle clear selections
function handleClearSelections() {
    selectedPerson1 = null;
    selectedPerson2 = null;
    routeData = null;

    const person1Display = document.getElementById('person1-display');
    const person2Display = document.getElementById('person2-display');

    if (person1Display) person1Display.innerHTML = '<span class="no-selection">No person selected</span>';
    if (person2Display) person2Display.innerHTML = '<span class="no-selection">No person selected</span>';

    const routeInfo = document.getElementById('route-info');
    const routeDetails = document.getElementById('route-details');
    if (routeInfo) routeInfo.style.display = 'none';
    if (routeDetails) routeDetails.style.display = 'none';

    updateRouteStatus('Select two people to find route');
    updateFindRouteButton();

    const container = document.getElementById('custom-chart-container');
    if (container) {
        container.innerHTML = `
            <div class="chart-empty">
                <div>
                    <h3>Route Visualization</h3>
                    <p>Select two people above and click "Find Route" to see their connection path.</p>
                </div>
            </div>
        `;
    }

    const legend = document.getElementById('route-legend');
    if (legend) legend.style.display = 'none';

    console.log('Selections cleared successfully');
}

// Handle clear chart
function handleClearChart() {
    handleClearSelections();

    if (searchInstance1) searchInstance1.clearSearch();
    if (searchInstance2) searchInstance2.clearSearch();
}

// Set up global event handlers
function setupGlobalEventHandlers() {
    const editButton = document.getElementById('edit-button');
    if (editButton) {
        editButton.addEventListener('click', handleEditButtonClick);
    }

    const addPersonButton = document.getElementById('add-person-button');
    if (addPersonButton) {
        addPersonButton.addEventListener('click', handleAddPersonClick);
    }
}

// Handle edit button click
function handleEditButtonClick() {
    if (!selectedNode) {
        alert('Please select a person from the visualization first');
        return;
    }

    if (!isUserAuthenticated()) {
        showLoginForm();
        return;
    }

    console.log('Edit button clicked for node:', selectedNode);
}

// Handle add person click
function handleAddPersonClick() {
    if (!isUserAuthenticated()) {
        showLoginForm();
        return;
    }

    console.log('Add person button clicked');
}

// Switch between modes
function switchToSearchMode() {
    isChartMode = false;
    const routeFinderBar = document.getElementById('route-finder-bar');
    const chartModeControls = document.getElementById('chart-mode-controls');

    if (routeFinderBar) routeFinderBar.style.display = 'block';
    if (chartModeControls) chartModeControls.style.display = 'none';
}

function switchToChartMode() {
    isChartMode = true;
    const routeFinderBar = document.getElementById('route-finder-bar');
    const chartModeControls = document.getElementById('chart-mode-controls');

    if (routeFinderBar) routeFinderBar.style.display = 'none';
    if (chartModeControls) chartModeControls.style.display = 'block';
}

// Auth state change handler
function handleAuthStateChange(event) {
    const { isAuthenticated, currentUser } = event.detail;

    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay && currentUser) {
        usernameDisplay.textContent = currentUser.displayName || currentUser.username;
    }

    if (!isAuthenticated && isEditFormVisible) {
        toggleEditForm();
    }
}

// Handle logout
function handleLogout() {
    logout();
}

// Toggle edit form
function toggleEditForm() {
    isEditFormVisible = !isEditFormVisible;
}

// Update data source indicator
function updateDataSourceIndicator(text, isError = false) {
    if (dataSourceIndicator) {
        dataSourceIndicator.textContent = text;
        dataSourceIndicator.style.color = isError ? '#e74c3c' : '#ffffff';
    }
}

// Make functions globally accessible
window.removeSelection = removeSelection;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Export for use in other modules
export { selectedPerson1, selectedPerson2, routeData, handleNodeSelect };