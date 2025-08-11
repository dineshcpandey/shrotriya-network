// route-finder.js - Route Finding Application
// Following the same patterns as app.js

// Import required modules following the same pattern as app.js
import { initializeChart, updateChartData, getChartInstance } from './chart.js';
import { setupEditForm } from './editForm.js';
import { fetchInitialData } from './api.js';
import { fetchNetworkData } from './api-utils.js';
import { setupEventListeners } from './eventHandlers.js';
import { showAddPersonForm, showNotification } from './addPerson.js';
import { initAuth, isUserAuthenticated, showLoginForm, logout } from './auth.js';
import { searchPeople, fetchLocationSuggestions, makeAuthenticatedRequest } from './api-utils.js';

// Global state following the same pattern as app.js
export let chartData = [];
let selectedNode = null;
let selectedPerson1 = null;
let selectedPerson2 = null;
let routeData = null;
let isEditFormVisible = false;
let nodes = [];
let links = [];
let expandedNodes = new Set();
let routeNodes = new Set();
let d3ChartContainer = null;
let containerWidth = 1360;
let containerHeight = 700;

// Elements
const loadingIndicator = document.getElementById('loading-indicator');
const dataSourceIndicator = document.getElementById('data-source-indicator');

// Search instance management
let searchInstance1 = null;
let searchInstance2 = null;

// Function to update the chart data store (same as app.js)
export function updateChartDataStore(newData) {
    console.log("route-finder.js: Updating chart data store with", newData.length, "items");
    chartData.length = 0;
    newData.forEach(item => chartData.push(item));
}

// Initialize the application (following app.js pattern)
async function initApp() {
    console.log('Initializing Route Finder App...');

    // Initialize authentication (same as app.js)
    initAuth();

    // Set up auth-related UI (same as app.js)
    setupAuthUI();

    // Show loading indicator
    showLoading(true);
    initializeD3Container();

    try {
        // Load initial data (empty for route finder)
        const initialData = [];

        // Update chart data store (start with empty for route finder)
        updateChartDataStore(initialData);

        // Check if family-chart.js is loaded
        if (typeof window.f3 === 'undefined') {
            console.error('family-chart.js library not found! Make sure it is loaded.');
            updateDataSourceIndicator('Chart library not loaded', true);

            // Show error in chart container
            const chartContainer = document.getElementById('FamilyChart');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="chart-error-message" style="display: flex; align-items: center; justify-content: center; height: 400px; color: white; text-align: center; font-size: 18px;">
                        <div>
                            <h3>Chart Library Missing</h3>
                            <p>The family-chart.js library is not loaded.</p>
                            <p>Please make sure the script is included in the page.</p>
                        </div>
                    </div>
                `;
            }
        } else {
            console.log('family-chart.js library loaded successfully');

            // Initialize chart with empty data - this will show the empty state
            const chartContainer = document.getElementById('FamilyChart');
            if (chartContainer) {
                // Clear any existing content
                chartContainer.innerHTML = '';

                // Make sure container is visible
                chartContainer.style.display = 'block';
                chartContainer.style.width = '100%';
                chartContainer.style.height = '600px';
                chartContainer.style.backgroundColor = 'rgb(33, 33, 33)';
                chartContainer.style.color = '#fff';

                // Create initial empty state message
                const emptyStateEl = document.createElement('div');
                emptyStateEl.className = 'empty-chart-message';
                emptyStateEl.innerHTML = `
                    <div class="empty-chart-content">
                        <h2>Route Finder</h2>
                        <p>Select two people above to find and display the route between them.</p>
                        <div class="empty-chart-icon">🔍</div>
                    </div>
                `;

                chartContainer.appendChild(emptyStateEl);
            }
        }

        // Set up dual search functionality (customized for route finder)
        setupDualSearch();

        // Set up edit form (same as app.js)
        setupEditForm({
            onClose: toggleEditForm
        });

        // Set up route finder specific event handlers
        setupRouteFinderEventHandlers();

        // Set up global event handlers (same as app.js)
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

// Set up authentication UI (same as app.js)
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

            document.getElementById('login-button').addEventListener('click', showLoginForm);
            document.getElementById('logout-button').addEventListener('click', handleLogout);
        }

        const editButton = document.getElementById('edit-button');
        const addPersonButton = document.getElementById('add-person-button');

        if (editButton) editButton.setAttribute('data-auth-required', 'true');
        if (addPersonButton) addPersonButton.setAttribute('data-auth-required', 'true');
    }

    document.addEventListener('authStateChanged', handleAuthStateChange);
}

// Set up dual search functionality (customized from search.js pattern)
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

// PersonSearch class (adapted from search.js patterns)
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
        // Get DOM elements with person number suffix
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

        // Ensure modal is hidden on startup
        if (this.searchResultsDropdown) {
            this.searchResultsDropdown.style.display = 'none';
            this.searchResultsDropdown.style.visibility = 'hidden';
            this.searchResultsDropdown.style.opacity = '0';
        }
    }

    setupEventListeners() {
        // Search form submission
        if (this.searchForm) {
            this.searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        }

        if (this.searchButton) {
            this.searchButton.addEventListener('click', (e) => this.handleSearch(e));
        }

        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => this.handleClearSearch());
        }

        // Location type-ahead
        if (this.locationInput) {
            this.locationInput.addEventListener('input', (e) => this.handleLocationInput(e));
            this.locationInput.addEventListener('blur', () => {
                // Add a small delay to allow click events on suggestions to process first
                setTimeout(() => this.hideSuggestions(), 150);
            });
        }

        // Close results button
        if (this.closeResultsBtn) {
            this.closeResultsBtn.addEventListener('click', () => this.clearSearchResults());
        }

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalVisible()) {
                this.clearSearchResults();
            }
        });

        // Close modal when clicking outside
        if (this.searchResultsDropdown) {
            this.searchResultsDropdown.addEventListener('click', (e) => {
                if (e.target === this.searchResultsDropdown) {
                    this.clearSearchResults();
                }
            });
        }
    }

    async handleSearch(e) {
        e.preventDefault();
        console.log(`Search handler triggered for person ${this.personNumber}`);

        // Check authentication (same as search.js)
        if (!isUserAuthenticated()) {
            showLoginForm('search for people');
            return;
        }

        // Get search values
        const name = this.nameInput ? this.nameInput.value.trim() : '';
        const location = this.locationInput ? this.locationInput.value.trim() : '';

        // Validate input
        if (!name && !location) {
            this.showError('Please enter either a name or location to search');
            this.showSearchResults();
            return;
        }

        // Update UI
        if (this.searchButton) {
            this.searchButton.disabled = true;
            this.searchButton.textContent = 'Searching...';
        }

        // Clear previous results
        this.clearSearchResultsContent();

        try {
            console.log(`Searching for name: "${name}", location: "${location}"`);

            const results = await searchPeople(name, location);
            console.log('Search results:', results);

            // Clear errors
            if (this.searchError) {
                this.searchError.style.display = 'none';
            }

            // Display results
            if (results.length === 0) {
                if (this.resultsCount) {
                    this.resultsCount.textContent = 'No people found matching your search criteria';
                    this.resultsCount.style.display = 'block';
                }
            } else {
                if (this.resultsCount) {
                    this.resultsCount.textContent = `Found ${results.length} ${results.length === 1 ? 'person' : 'people'}`;
                    this.resultsCount.style.display = 'block';
                }

                // Create person cards
                if (this.personCards) {
                    this.personCards.innerHTML = '';
                    results.forEach(person => {
                        const card = this.createPersonCard(person);
                        this.personCards.appendChild(card);
                    });
                }
            }

            this.showSearchResults();
        } catch (error) {
            console.error('Search error:', error);
            this.showError(`Error searching: ${error.message}`);
            this.showSearchResults();
        } finally {
            if (this.searchButton) {
                this.searchButton.disabled = false;
                this.searchButton.textContent = 'Search';
            }
        }
    }

    createPersonCard(person) {
        const card = document.createElement('div');

        // Handle both flat API response and nested chart data structure
        const gender = person.gender || person.data?.gender || '';
        const genderClass = gender === 'M' ? 'male' : gender === 'F' ? 'female' : 'unknown';

        card.className = `person-card ${genderClass}`;
        card.dataset.personId = person.id;

        // Handle both flat API response (personname) and nested structure (first name, last name)
        let fullName = '';
        if (person.personname) {
            fullName = person.personname;
        } else if (person.data) {
            fullName = `${person.data["first name"] || ''} ${person.data["last name"] || ''}`.trim();
        }

        // Handle both flat API response (currentlocation) and nested structure (location)
        const location = person.currentlocation || person.data?.location || 'Unknown location';
        const genderText = gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : 'Unknown';

        // Handle avatar - API response doesn't have avatar, use default or nested structure
        const avatar = person.profile_image_url || person.data?.avatar || 'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg';

        card.innerHTML = `
            <div class="person-avatar">
                <img src="${avatar}" alt="${fullName}">
            </div>
            <div class="person-info">
                <div class="person-header">
                    <h3>${fullName}</h3>
                </div>
                <div class="person-details">
                    <div class="detail-item">
                        <span class="detail-label">Gender:</span>
                        <span class="detail-value">${genderText}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Location:</span>
                        <span class="detail-value">${location}</span>
                    </div>
                </div>
            </div>
            <div class="person-actions">
                <button class="add-to-chart-btn" data-person-id="${person.id}">Select Person</button>
            </div>
        `;

        // Add event listener
        const selectBtn = card.querySelector('.add-to-chart-btn');
        if (selectBtn) {
            selectBtn.addEventListener('click', () => {
                if (this.options.onPersonSelect) {
                    this.options.onPersonSelect(person);
                }
            });
        }

        return card;
    }

    showSearchResults() {
        if (this.searchResultsDropdown) {
            this.searchResultsDropdown.style.display = 'flex';
            this.searchResultsDropdown.style.visibility = 'visible';
            this.searchResultsDropdown.style.opacity = '1';
            document.body.classList.add('modal-open');
        }
    }

    clearSearchResults() {
        if (this.searchResultsDropdown) {
            this.searchResultsDropdown.style.display = 'none';
            this.searchResultsDropdown.style.visibility = 'hidden';
            this.searchResultsDropdown.style.opacity = '0';
            document.body.classList.remove('modal-open');
        }
        this.clearSearchResultsContent();
    }

    clearSearchResultsContent() {
        if (this.searchError) {
            this.searchError.style.display = 'none';
        }
        if (this.resultsCount) {
            this.resultsCount.style.display = 'none';
        }
        if (this.personCards) {
            this.personCards.innerHTML = '';
        }
    }

    showError(message) {
        if (this.searchError) {
            this.searchError.textContent = message;
            this.searchError.style.display = 'block';
        }
        if (this.resultsCount) {
            this.resultsCount.style.display = 'none';
        }
        console.error('Search error:', message);
    }

    handleClearSearch() {
        if (this.nameInput) this.nameInput.value = '';
        if (this.locationInput) this.locationInput.value = '';
        this.clearSearchResults();
        this.hideSuggestions();
    }

    async handleLocationInput(e) {
        const query = e.target.value.trim();
        console.log(`Person ${this.personNumber} location input:`, query);

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(async () => {
            if (query.length >= 2) {
                try {
                    console.log(`Fetching location suggestions for "${query}"...`);
                    const suggestions = await fetchLocationSuggestions(query);
                    console.log(`Received ${suggestions.length} location suggestions:`, suggestions);
                    this.showSuggestions(suggestions);
                } catch (error) {
                    console.error('Location suggestions error:', error);
                    this.hideSuggestions();
                }
            } else {
                this.hideSuggestions();
            }
        }, 300);
    }

    showSuggestions(suggestions) {
        console.log(`Person ${this.personNumber} showSuggestions called with:`, suggestions);

        if (!this.locationSuggestions) {
            console.error(`Location suggestions container not found for person ${this.personNumber}`);
            return;
        }

        // Clear existing suggestions
        this.locationSuggestions.innerHTML = '';

        if (suggestions && suggestions.length > 0) {
            suggestions.forEach((suggestion, index) => {
                console.log(`Adding suggestion ${index + 1}:`, suggestion);
                const item = document.createElement('div');
                item.className = 'location-suggestion-item';
                item.textContent = suggestion;

                // Use mousedown instead of click to fire before blur event
                const selectSuggestion = (e) => {
                    e.preventDefault(); // Prevent any default behavior
                    e.stopPropagation(); // Stop event bubbling
                    console.log(`Person ${this.personNumber} selected location:`, suggestion);
                    this.locationInput.value = suggestion;
                    this.hideSuggestions();
                };

                item.addEventListener('mousedown', selectSuggestion);
                item.addEventListener('click', selectSuggestion); // Fallback for accessibility
                this.locationSuggestions.appendChild(item);
            });
            this.locationSuggestions.style.display = 'block';
            console.log(`Person ${this.personNumber} location suggestions displayed`);
        } else {
            console.log(`Person ${this.personNumber} no suggestions to show`);
            this.hideSuggestions();
        }
    }

    hideSuggestions() {
        if (this.locationSuggestions) {
            this.locationSuggestions.style.display = 'none';
            console.log(`Person ${this.personNumber} location suggestions hidden`);
        }
    }

    isModalVisible() {
        if (!this.searchResultsDropdown) return false;
        const computedStyle = window.getComputedStyle(this.searchResultsDropdown);
        return computedStyle.display === 'flex' && computedStyle.visibility !== 'hidden';
    }
}

// Set up route finder specific event handlers
function setupRouteFinderEventHandlers() {
    // Find Route button
    const findRouteBtn = document.getElementById('find-route-btn');
    if (findRouteBtn) {
        findRouteBtn.addEventListener('click', handleFindRoute);
    }

    // Clear Selections button
    const clearSelectionsBtn = document.getElementById('clear-selections-btn');
    if (clearSelectionsBtn) {
        clearSelectionsBtn.addEventListener('click', handleClearSelections);
    }

    // Clear Chart button
    const clearButton = document.getElementById('clear-button');
    if (clearButton) {
        clearButton.addEventListener('click', handleClearChart);
    }

    // Toggle search button
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

// Set up global event handlers (same as app.js)
function setupGlobalEventHandlers() {
    // Edit button
    const editButton = document.getElementById('edit-button');
    if (editButton) {
        editButton.addEventListener('click', handleEditButtonClick);
    }

    // Add person button
    const addPersonButton = document.getElementById('add-person-button');
    if (addPersonButton) {
        addPersonButton.addEventListener('click', handleAddPersonClick);
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

    // Handle both flat API response and nested chart data structure
    let fullName = '';
    if (person.personname) {
        fullName = person.personname;
    } else if (person.data) {
        fullName = `${person.data["first name"] || ''} ${person.data["last name"] || ''}`.trim();
    }

    // Handle both flat API response (currentlocation) and nested structure (location)
    const location = person.currentlocation || person.data?.location || 'Unknown location';

    // Handle gender from flat or nested structure
    const gender = person.gender || person.data?.gender || '';
    const genderText = gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : 'Unknown';

    // Handle avatar
    const avatar = person.profile_image_url || person.data?.avatar || 'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg';

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
        showLoginForm('find routes between people');
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
        updateDataSourceIndicator('Error finding route', true);
    } finally {
        showLoading(false);
    }
}

// Display route results
async function displayRouteResults(routeData) {
    const routeInfo = document.getElementById('route-info');
    const routeDetails = document.getElementById('route-details');
    const degreeValue = document.getElementById('degree-value');
    const pathLengthValue = document.getElementById('path-length-value');

    if (!routeData.pathExists) {
        updateRouteStatus('No connection found');
        updateDataSourceIndicator('No connection found between the selected people');
        if (degreeValue) degreeValue.textContent = '∞';
        if (pathLengthValue) pathLengthValue.textContent = '0';
        if (routeDetails) routeDetails.style.display = 'block';
        return;
    }

    // Update route info
    updateRouteStatus('Route found!');
    if (degreeValue) degreeValue.textContent = routeData.degreeOfSeparation;
    if (pathLengthValue) pathLengthValue.textContent = routeData.path.length;
    if (routeDetails) routeDetails.style.display = 'block';

    // Update chart with route data
    await updateChartWithRoute(routeData);

    // Switch to chart mode to show the results
    setTimeout(() => {
        switchToChartMode();
        updateChartModeInfo(selectedPerson1, selectedPerson2, routeData);
    }, 500);

    updateDataSourceIndicator(`Route found: ${routeData.degreeOfSeparation} degrees of separation`);
}


// Initialize D3 chart container (add this to your initApp function)
function initializeD3Container() {
    d3ChartContainer = document.getElementById('d3-chart-container');
    console.log('=== D3 Container Debug ===');
    console.log('d3ChartContainer found:', !!d3ChartContainer);
    console.log('d3ChartContainer element:', d3ChartContainer);

    if (d3ChartContainer) {
        const rect = d3ChartContainer.getBoundingClientRect();
        containerWidth = rect.width;
        containerHeight = rect.height;
        console.log('Container dimensions:', { width: containerWidth, height: containerHeight });
        console.log('Container styles:', {
            display: window.getComputedStyle(d3ChartContainer).display,
            visibility: window.getComputedStyle(d3ChartContainer).visibility,
            position: window.getComputedStyle(d3ChartContainer).position
        });
    } else {
        console.error('D3 chart container not found!');
    }
}



// Update chart with route data
async function updateChartWithRoute(routeData) {
    try {
        console.log('=== Chart Update Debug ===');
        console.log('Route data received:', routeData);
        console.log('Route path length:', routeData.path ? routeData.path.length : 'No path');
        console.log('Route pathIds:', routeData.pathIds);

        // Hide the original FamilyChart and show D3 chart
        const familyChart = document.getElementById('FamilyChart');
        if (familyChart) {
            familyChart.style.display = 'none';
            console.log('FamilyChart hidden');
        }

        if (d3ChartContainer) {
            d3ChartContainer.style.display = 'block';
            console.log('D3 chart container shown');
        }

        // Convert the route path to the nested format expected by the D3 chart
        const convertedRouteData = routeData.path.map(person => {
            const converted = {
                id: person.id.toString(),
                data: person.data || {
                    "first name": person.personname ? person.personname.split(' ')[0] : '',
                    "last name": person.personname ? person.personname.split(' ').slice(1).join(' ') : '',
                    "gender": person.gender || 'U',
                    "location": person.location || '',
                    "work": person.work || ''
                },
                rels: person.rels || {
                    spouses: [],
                    children: [],
                    father: null,
                    mother: null
                },
                main: false
            };
            return converted;
        });

        console.log('Converted route data:', convertedRouteData);

        // CLEAN THE DATA to remove invalid references
        const cleanedRouteData = cleanRouteData(convertedRouteData);
        console.log('Cleaned route data:', cleanedRouteData);

        // Update chart data store with cleaned data
        updateChartDataStore(cleanedRouteData);

        // Set up route nodes for highlighting
        routeNodes.clear();
        routeData.pathIds.forEach(id => {
            routeNodes.add(id.toString());
        });
        console.log('Route nodes set:', Array.from(routeNodes));

        // Initialize D3 visualization with cleaned data
        await initializeD3Visualization(cleanedRouteData);

        console.log('Chart updated with route data successfully');
    } catch (error) {
        console.error('Error updating chart with route:', error);
        console.error('Error stack:', error.stack);
        throw error;
    }
}


async function initializeD3Visualization(data) {
    console.log('=== D3 Visualization Init Debug ===');
    console.log('Data received:', data);
    console.log('Data length:', data.length);

    if (!d3ChartContainer) {
        d3ChartContainer = document.getElementById('d3-chart-container');
        if (!d3ChartContainer) {
            console.error('D3 chart container not found, aborting visualization');
            return;
        }
    }

    // Check container dimensions
    const rect = d3ChartContainer.getBoundingClientRect();
    containerWidth = rect.width;
    containerHeight = rect.height;
    console.log('Container dimensions during init:', { width: containerWidth, height: containerHeight });

    // If dimensions are 0, use default values
    if (containerWidth === 0 || containerHeight === 0) {
        containerWidth = 1200;
        containerHeight = 600;
        console.log('Using default dimensions:', { width: containerWidth, height: containerHeight });
    }

    nodes = data.map(node => {
        const mappedNode = {
            ...node,
            x: Math.random() * (containerWidth - 200) + 100,
            y: Math.random() * (containerHeight - 200) + 100,
            type: node.main ? 'main' : (routeNodes.has(node.id) ? 'route' : 'normal')
        };
        console.log('Node mapped:', mappedNode);
        return mappedNode;
    });

    console.log('All nodes:', nodes);

    // Create a Set of all node IDs for quick lookup
    const nodeIds = new Set(nodes.map(node => node.id));
    console.log('Node IDs available:', Array.from(nodeIds));

    // Create links based on relationships - ONLY for existing nodes
    links = [];
    nodes.forEach(node => {
        // Parent relationships
        if (node.rels.father && nodeIds.has(node.rels.father)) {
            links.push({
                source: node.rels.father,
                target: node.id,
                type: 'parent'
            });
            console.log('Added parent link:', node.rels.father, '->', node.id);
        } else if (node.rels.father) {
            console.log('Skipped invalid father link:', node.rels.father, '->', node.id);
        }

        if (node.rels.mother && nodeIds.has(node.rels.mother)) {
            links.push({
                source: node.rels.mother,
                target: node.id,
                type: 'parent'
            });
            console.log('Added parent link:', node.rels.mother, '->', node.id);
        } else if (node.rels.mother) {
            console.log('Skipped invalid mother link:', node.rels.mother, '->', node.id);
        }

        // Spouse relationships
        if (node.rels.spouses && Array.isArray(node.rels.spouses)) {
            node.rels.spouses.forEach(spouseId => {
                if (nodeIds.has(spouseId)) {
                    // Only add spouse link if it doesn't already exist (to avoid duplicates)
                    const existingLink = links.find(link =>
                        (link.source === node.id && link.target === spouseId) ||
                        (link.source === spouseId && link.target === node.id)
                    );

                    if (!existingLink) {
                        links.push({
                            source: node.id,
                            target: spouseId,
                            type: 'spouse'
                        });
                        console.log('Added spouse link:', node.id, '<->', spouseId);
                    }
                } else {
                    console.log('Skipped invalid spouse link:', node.id, '<->', spouseId);
                }
            });
        }

        // Child relationships (optional - you can also derive from father/mother)
        if (node.rels.children && Array.isArray(node.rels.children)) {
            node.rels.children.forEach(childId => {
                if (nodeIds.has(childId)) {
                    // Check if this link already exists from the child's perspective
                    const existingLink = links.find(link =>
                        link.source === node.id && link.target === childId && link.type === 'parent'
                    );

                    if (!existingLink) {
                        links.push({
                            source: node.id,
                            target: childId,
                            type: 'parent'
                        });
                        console.log('Added child link:', node.id, '->', childId);
                    }
                } else {
                    console.log('Skipped invalid child link:', node.id, '->', childId);
                }
            });
        }
    });

    console.log('Links created after cleanup:', links);

    // Render the visualization
    console.log('About to render D3 visualization...');
    renderD3Visualization();

    // Auto-layout the nodes
    setTimeout(() => {
        console.log('Applying auto-layout...');
        autoLayout();
    }, 100);
}



// Render D3 visualization

function renderD3Visualization() {
    console.log('=== D3 Render Debug ===');
    console.log('Container available:', !!d3ChartContainer);
    console.log('Nodes to render:', nodes.length);
    console.log('Links to render:', links.length);

    if (!d3ChartContainer) {
        console.error('Cannot render: D3 chart container not available');
        return;
    }

    // Clear container
    d3ChartContainer.innerHTML = '';
    console.log('Container cleared');

    // Draw connection lines first
    console.log('Drawing connection lines...');
    let validLinks = 0;
    let invalidLinks = 0;

    links.forEach((link, index) => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);

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

            // Highlight route connections
            if (routeNodes.has(link.source) && routeNodes.has(link.target)) {
                line.classList.add('route');
                console.log('Route connection highlighted:', link.source, '->', link.target);
            }

            d3ChartContainer.appendChild(line);
            validLinks++;
        } else {
            console.warn('Invalid link - missing nodes:', link, 'source:', sourceNode, 'target:', targetNode);
            invalidLinks++;
        }
    });

    console.log(`Links summary: ${validLinks} valid, ${invalidLinks} invalid`);

    // Draw nodes
    console.log('Drawing nodes...');
    nodes.forEach((node, index) => {
        const nodeCard = document.createElement('div');
        nodeCard.className = `node-card ${node.type}`;
        nodeCard.setAttribute('data-id', node.id);

        // Add gender-specific styling
        if (node.data.gender === 'F') {
            nodeCard.classList.add('female');
        }

        // Add expanded styling
        if (expandedNodes.has(node.id)) {
            nodeCard.classList.add('expanded');
        }

        nodeCard.style.left = `${node.x}px`;
        nodeCard.style.top = `${node.y}px`;

        nodeCard.innerHTML = `
            <div class="node-name">${node.data['first name']} ${node.data['last name']}</div>
            <div class="node-details">📍 ${node.data.location || 'No location'}</div>
            ${node.data.work ? `<div class="node-details">💼 ${node.data.work}</div>` : ''}
            <div class="node-id">ID: ${node.id}</div>
        `;

        // Add click handler
        nodeCard.addEventListener('click', () => handleD3NodeClick(node));

        // Add drag functionality
        makeDraggable(nodeCard, node);

        d3ChartContainer.appendChild(nodeCard);
        console.log(`Node ${index} added:`, { id: node.id, x: node.x, y: node.y, type: node.type });
    });

    console.log('Rendering complete. Container children count:', d3ChartContainer.children.length);
}

function debugCurrentState() {
    console.log('=== Current State Debug ===');
    console.log('d3ChartContainer:', d3ChartContainer);
    console.log('nodes:', nodes);
    console.log('links:', links);
    console.log('routeNodes:', Array.from(routeNodes));
    console.log('expandedNodes:', Array.from(expandedNodes));

    if (d3ChartContainer) {
        console.log('Container innerHTML length:', d3ChartContainer.innerHTML.length);
        console.log('Container children count:', d3ChartContainer.children.length);
        console.log('Container display:', window.getComputedStyle(d3ChartContainer).display);
    }
}

// Call this function from the browser console to check the current state
window.debugCurrentState = debugCurrentState;

// 6. Add this to your initApp function to ensure D3 container is initialized:
// Add this line in your initApp function:
console.log('Initializing D3 container...');
initializeD3Container();

// Handle node click
function handleD3NodeClick(node) {
    selectedNode = node;
    console.log('D3 Node clicked:', node.id);

    // Simulate network expansion
    if (!expandedNodes.has(node.id)) {
        expandedNodes.add(node.id);
        renderD3Visualization();
    }
}

// Make nodes draggable
function makeDraggable(element, node) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = node.x;
        startTop = node.y;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        e.preventDefault();
    });

    function onMouseMove(e) {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        node.x = Math.max(0, Math.min(containerWidth - 200, startLeft + dx));
        node.y = Math.max(0, Math.min(containerHeight - 100, startTop + dy));

        renderD3Visualization();
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

// Auto-layout function
function autoLayout() {
    if (nodes.length === 0) return;

    // Simple linear layout for route visualization
    const spacing = Math.min(containerWidth / (nodes.length + 1), 200);
    const centerY = containerHeight / 2;

    nodes.forEach((node, index) => {
        node.x = (index + 1) * spacing;
        node.y = centerY + (Math.random() - 0.5) * 100; // Add some vertical variation
    });

    renderD3Visualization();
}

// UPDATE the switchToChartMode function to handle D3 container:
function switchToChartMode() {
    console.log('=== Switch to Chart Mode Debug ===');
    console.log('Switching to chart mode...');

    isChartMode = true;
    const app = document.querySelector('.app');
    const routeFinderBar = document.getElementById('route-finder-bar');
    const chartModeControls = document.getElementById('chart-mode-controls');
    const chartContainer = document.getElementById('d3-chart-container') || document.getElementById('FamilyChart');

    console.log('Elements found:', {
        app: !!app,
        routeFinderBar: !!routeFinderBar,
        chartModeControls: !!chartModeControls,
        chartContainer: !!chartContainer
    });

    // Update app class
    app.classList.remove('search-mode');
    app.classList.add('chart-mode');

    // Hide search controls
    if (routeFinderBar) {
        routeFinderBar.classList.add('hidden');
    }

    // Show chart mode controls
    if (chartModeControls) {
        chartModeControls.style.display = 'flex';
    }

    // Expand chart area
    if (chartContainer) {
        chartContainer.style.height = 'calc(100vh - 180px)';
        chartContainer.style.minHeight = '600px';

        console.log('Chart container updated:', chartContainer.id);

        // Update container dimensions if it's the D3 chart
        if (chartContainer.id === 'd3-chart-container') {
            const rect = chartContainer.getBoundingClientRect();
            containerWidth = rect.width;
            containerHeight = rect.height;
            console.log('Updated D3 container dimensions:', { width: containerWidth, height: containerHeight });

            // Re-render with new dimensions
            setTimeout(() => {
                console.log('Re-rendering D3 visualization with new dimensions...');
                renderD3Visualization();
            }, 300);
        }
    }

    console.log('Chart mode activated');
}

function cleanRouteData(data) {
    console.log('=== Cleaning Route Data ===');
    console.log('Data before cleaning:', data);

    // Track all existing IDs
    const allPresentIds = new Set(data.map(person => person.id));
    console.log('All present IDs:', Array.from(allPresentIds));

    const cleanedData = data.map(person => {
        const cleanedRels = {
            spouses: [],
            children: [],
            father: null,
            mother: null
        };

        // Only include relationships to people who are present
        if (person.rels.father && allPresentIds.has(person.rels.father)) {
            cleanedRels.father = person.rels.father;
        } else if (person.rels.father) {
            console.log(`Removing invalid father reference: ${person.rels.father} for person ${person.id}`);
        }

        if (person.rels.mother && allPresentIds.has(person.rels.mother)) {
            cleanedRels.mother = person.rels.mother;
        } else if (person.rels.mother) {
            console.log(`Removing invalid mother reference: ${person.rels.mother} for person ${person.id}`);
        }

        if (person.rels.spouses && Array.isArray(person.rels.spouses)) {
            cleanedRels.spouses = person.rels.spouses.filter(spouseId => {
                const isPresent = allPresentIds.has(spouseId);
                if (!isPresent) {
                    console.log(`Removing invalid spouse reference: ${spouseId} for person ${person.id}`);
                }
                return isPresent;
            });
        }

        if (person.rels.children && Array.isArray(person.rels.children)) {
            cleanedRels.children = person.rels.children.filter(childId => {
                const isPresent = allPresentIds.has(childId);
                if (!isPresent) {
                    console.log(`Removing invalid child reference: ${childId} for person ${person.id}`);
                }
                return isPresent;
            });
        }

        return {
            ...person,
            rels: cleanedRels
        };
    });

    console.log('Data after cleaning:', cleanedData);
    return cleanedData;
}

// Highlight the route path in the D3 chart
function highlightRoutePath(pathIds) {
    if (!pathIds || pathIds.length === 0) return;

    console.log('Highlighting route path:', pathIds);

    // Wait a bit longer for the chart to fully render
    setTimeout(() => {
        pathIds.forEach((id, index) => {
            // Try multiple possible selectors for the family chart nodes
            const selectors = [
                `[data-id="${id}"]`,
                `[data-person-id="${id}"]`,
                `.card_cont[data-id="${id}"]`,
                `.card[data-id="${id}"]`,
                `#FamilyChart [data-id="${id}"]`,
                `#FamilyChart .card_cont`,  // Try all card containers
                `#FamilyChart .card`,       // Try all cards
            ];

            let nodeElement = null;
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    // If multiple elements, try to find the right one by index or content
                    if (elements.length > index) {
                        nodeElement = elements[index];
                        break;
                    } else {
                        nodeElement = elements[0];
                        break;
                    }
                }
            }

            // If we still couldn't find by selectors, try finding by card content/text
            if (!nodeElement) {
                const allCards = document.querySelectorAll('#FamilyChart .card_cont, #FamilyChart .card, #FamilyChart g, #FamilyChart rect');
                for (const card of allCards) {
                    const cardContent = card.textContent || card.getAttribute('data-id') || '';
                    if (cardContent.includes(id) || card.querySelector(`[data-id="${id}"]`)) {
                        nodeElement = card;
                        break;
                    }
                }
            }

            if (nodeElement) {
                console.log(`✅ Highlighting node ${id} at index ${index}`);

                // Remove any existing highlight classes first
                nodeElement.classList.remove('route-path-highlight', 'route-path-main');

                // Add appropriate highlight class
                if (index === 0 || index === pathIds.length - 1) {
                    nodeElement.classList.add('route-path-main');
                } else {
                    nodeElement.classList.add('route-path-highlight');
                }

                // Also try to highlight child elements that might be the actual visual cards
                const childCards = nodeElement.querySelectorAll('.card, .card-inner, rect, g');
                childCards.forEach(child => {
                    if (index === 0 || index === pathIds.length - 1) {
                        child.classList.add('route-path-main');
                    } else {
                        child.classList.add('route-path-highlight');
                    }
                });
            } else {
                console.log(`⚠️ Could not find visual element for person ID: ${id} (this is normal if chart is still loading)`);
            }
        });
    }, 2000); // Wait 2 seconds for chart to fully render

    // Try highlighting again after even more time
    setTimeout(() => {
        console.log('Second attempt at highlighting...');
        highlightRoutePath(pathIds);
    }, 4000);
}

// Handle clear selections

function handleClearSelections() {
    removeSelection(1);
    removeSelection(2);

    // Hide route info
    const routeInfo = document.getElementById('route-info');
    if (routeInfo) {
        routeInfo.style.display = 'none';
    }

    // Clear D3 chart and show FamilyChart
    if (d3ChartContainer) {
        d3ChartContainer.style.display = 'none';
        d3ChartContainer.innerHTML = '<div class="d3-chart-loading">Select two people to find route</div>';
    }

    const familyChart = document.getElementById('FamilyChart');
    if (familyChart) {
        familyChart.style.display = 'block';
    }

    // Switch back to search mode
    switchToSearchMode();

    updateDataSourceIndicator('Select two people to find route');
}


// Handle node selection and network expansion (same as app.js)
async function handleNodeSelect(node) {
    selectedNode = node;
    console.log('Node selected in route finder:', node);

    const selectedInfo = document.getElementById('selected-info');
    const selectedNodeId = document.getElementById('selected-node-id');

    // Handle both flat API response and nested chart data structure
    let fullName = '';
    if (node.personname) {
        fullName = node.personname;
    } else if (node.data) {
        fullName = `${node.data["first name"] || ''} ${node.data["last name"] || ''}`.trim();
    }

    if (selectedInfo && selectedNodeId) {
        selectedInfo.style.display = 'block';
        selectedNodeId.textContent = `${fullName} (ID: ${node.id})`;
    }

    // Expand network when a node is clicked (like in original app)
    if (!node._fromSearch) {
        showLoading(true);
        try {
            console.log('Fetching network data for node:', node.id);
            const networkData = await fetchNetworkData(node.id);

            console.log('Network data received:', networkData.length, 'people');

            // Convert network data to chart format
            const convertedNetworkData = networkData.map(person => {
                // If already in correct format, return as is
                if (person.data && person.rels) {
                    return person;
                }

                // Convert flat API response to nested format
                return {
                    id: person.id.toString(),
                    data: {
                        "first name": person.data?.["first name"] || (person.personname ? person.personname.split(' ')[0] : ''),
                        "last name": person.data?.["last name"] || (person.personname ? person.personname.split(' ').slice(1).join(' ') : ''),
                        "gender": person.data?.gender || person.gender || '',
                        "birthday": person.data?.birthday || person.birthdate || null,
                        "location": person.data?.location || person.currentlocation || '',
                        "work": person.data?.work || person.worksat || '',
                        "avatar": person.data?.avatar || person.profile_image_url || "https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg",
                        "contact": {
                            "email": person.data?.contact?.email || person.mail_id || '',
                            "phone": person.data?.contact?.phone || person.phone || ''
                        },
                        "nativePlace": person.data?.nativePlace || person.nativeplace || '',
                        "desc": person.data?.desc || person.desc || '',
                        "label": person.data?.label || person.personname || ''
                    },
                    rels: person.rels || {
                        "spouses": person.spouseid ? [person.spouseid.toString()] : (person.rels?.spouses || []),
                        "children": person.rels?.children || [],
                        "father": person.fatherid ? person.fatherid.toString() : (person.rels?.father || null),
                        "mother": person.motherid ? person.motherid.toString() : (person.rels?.mother || null)
                    }
                };
            });

            // Merge with existing chart data (don't replace, expand)
            const existingIds = new Set(chartData.map(person => person.id));
            const newPeople = convertedNetworkData.filter(person => !existingIds.has(person.id));

            if (newPeople.length > 0) {
                // Update chart data store with merged data
                const mergedData = [...chartData, ...newPeople];

                // Clean relationships in the merged data to only reference present people
                const allPresentIds = new Set(mergedData.map(person => person.id));

                const cleanedMergedData = mergedData.map(person => {
                    const cleanedRels = {
                        spouses: [],
                        children: [],
                        father: null,
                        mother: null
                    };

                    // Only include relationships to people who are present
                    if (person.rels.father && allPresentIds.has(person.rels.father)) {
                        cleanedRels.father = person.rels.father;
                    }

                    if (person.rels.mother && allPresentIds.has(person.rels.mother)) {
                        cleanedRels.mother = person.rels.mother;
                    }

                    if (person.rels.spouses && Array.isArray(person.rels.spouses)) {
                        cleanedRels.spouses = person.rels.spouses.filter(spouseId => allPresentIds.has(spouseId));
                    }

                    if (person.rels.children && Array.isArray(person.rels.children)) {
                        cleanedRels.children = person.rels.children.filter(childId => allPresentIds.has(childId));
                    }

                    return {
                        ...person,
                        rels: cleanedRels
                    };
                });

                updateChartDataStore(cleanedMergedData);

                // Re-initialize chart with expanded data
                const chartContainer = document.getElementById('FamilyChart');
                if (chartContainer) {
                    chartContainer.innerHTML = '';
                    await initializeChart(cleanedMergedData, {
                        onNodeSelect: handleNodeSelect
                    });
                }

                updateDataSourceIndicator(`Network expanded: added ${newPeople.length} new people`);
                console.log(`Network expanded with ${newPeople.length} new people`);
            } else {
                updateDataSourceIndicator(`Network for ${fullName} already loaded`);
                console.log('All network people already in chart');
            }

        } catch (error) {
            console.error('Error fetching network data:', error);
            updateDataSourceIndicator(`Error loading network for ${fullName}`, true);
        } finally {
            showLoading(false);
        }
    }
}

// Other handler functions (same as app.js)
function handleClearChart() {
    updateChartDataStore([]);
    updateChartData([]);
    updateDataSourceIndicator('Chart cleared');
}

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

function handleLogout() {
    logout();
    showNotification('You have been logged out', 'info');
}

function handleEditButtonClick() {
    if (isUserAuthenticated()) {
        toggleEditForm();
    } else {
        showAuthRequired('edit family members');
    }
}

function handleAddPersonClick() {
    if (isUserAuthenticated()) {
        showAddPersonForm();
    } else {
        showAuthRequired('add new family members');
    }
}

function showAuthRequired(action) {
    const overlay = document.createElement('div');
    overlay.className = 'unauthorized-overlay';
    overlay.innerHTML = `
        <h3>Authentication Required</h3>
        <p>You need to log in to ${action}.</p>
        <button id="auth-login-button">Log In</button>
    `;

    const appMain = document.querySelector('.app-main');
    if (appMain) {
        appMain.appendChild(overlay);
        overlay.querySelector('#auth-login-button').addEventListener('click', () => {
            overlay.parentNode.removeChild(overlay);
            showLoginForm();
        });
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 5000);
    }
}

function toggleEditForm() {
    isEditFormVisible = !isEditFormVisible;
    // Implementation depends on your edit form setup
}

function updateRouteStatus(text) {
    const routeStatusText = document.getElementById('route-status-text');
    const routeInfo = document.getElementById('route-info');
    if (routeStatusText) routeStatusText.textContent = text;
    if (routeInfo) routeInfo.style.display = 'block';
}

function showLoading(show) {
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
}

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

// Mode management
let isChartMode = false;


// Switch to search mode (show search, smaller chart)

function switchToSearchMode() {
    console.log('Switching to search mode...');

    isChartMode = false;
    const app = document.querySelector('.app');
    const routeFinderBar = document.getElementById('route-finder-bar');
    const chartModeControls = document.getElementById('chart-mode-controls');
    const chartContainer = document.getElementById('d3-chart-container') || document.getElementById('FamilyChart');

    // Update app class
    app.classList.remove('chart-mode');
    app.classList.add('search-mode');

    // Show search controls
    if (routeFinderBar) {
        routeFinderBar.classList.remove('hidden');
    }

    // Hide chart mode controls
    if (chartModeControls) {
        chartModeControls.style.display = 'none';
    }

    // Resize chart area
    if (chartContainer) {
        chartContainer.style.height = '700px';

        // Update container dimensions if it's the D3 chart
        if (chartContainer.id === 'd3-chart-container') {
            const rect = chartContainer.getBoundingClientRect();
            containerWidth = rect.width;
            containerHeight = rect.height;

            // Re-render with new dimensions
            setTimeout(() => {
                renderD3Visualization();
            }, 300);
        }
    }

    console.log('Search mode activated');
}



// Update chart mode info
function updateChartModeInfo(person1, person2, routeData) {
    const chartModeInfo = document.getElementById('chart-mode-route-info');
    if (chartModeInfo && person1 && person2 && routeData) {
        const name1 = person1.personname || `${person1.data?.["first name"] || ''} ${person1.data?.["last name"] || ''}`.trim();
        const name2 = person2.personname || `${person2.data?.["first name"] || ''} ${person2.data?.["last name"] || ''}`.trim();

        chartModeInfo.textContent = `Route: ${name1} → ${name2} (${routeData.degreeOfSeparation} degrees, ${routeData.path.length} people)`;
    }
}

// Export for use in other modules
export { selectedPerson1, selectedPerson2, routeData, handleNodeSelect, switchToChartMode, switchToSearchMode };