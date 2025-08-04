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
            this.locationInput.addEventListener('blur', () => this.hideSuggestions());
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
        // Implementation for location suggestions
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

    updateDataSourceIndicator(`Route found: ${routeData.degreeOfSeparation} degrees of separation`);
}

// Update chart with route data
async function updateChartWithRoute(routeData) {
    try {
        console.log('Updating chart with route data:', routeData);

        // Convert the route path to the nested format expected by the chart
        const convertedRouteData = routeData.path.map(person => {
            // If the person data is already in the correct nested format, use it as is
            if (person.data && person.rels) {
                return person;
            }

            // Otherwise, convert from flat to nested format
            return {
                id: person.id.toString(),
                data: person.data || {
                    "first name": person.personname ? person.personname.split(' ')[0] : '',
                    "last name": person.personname ? person.personname.split(' ').slice(1).join(' ') : '',
                    "gender": person.gender || '',
                    "birthday": person.birthday || person.birthdate || null,
                    "location": person.location || person.currentlocation || '',
                    "work": person.work || person.worksat || '',
                    "avatar": person.avatar || person.profile_image_url || "https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg",
                    "contact": {
                        "email": person.mail_id || '',
                        "phone": person.phone || ''
                    },
                    "nativePlace": person.nativeplace || '',
                    "desc": person.desc || '',
                    "label": person.personname || ''
                },
                rels: person.rels || {
                    "spouses": person.spouseid ? [person.spouseid.toString()] : [],
                    "children": [],
                    "father": person.fatherid ? person.fatherid.toString() : null,
                    "mother": person.motherid ? person.motherid.toString() : null
                }
            };
        });

        console.log('Converted route data:', convertedRouteData);

        // Clean the relationship data - only keep relationships to people who are actually present
        const presentIds = new Set(convertedRouteData.map(person => person.id));

        const cleanedRouteData = convertedRouteData.map(person => {
            const cleanedRels = {
                spouses: [],
                children: [],
                father: null,
                mother: null
            };

            // Only include relationships to people who are present in the route data
            if (person.rels.father && presentIds.has(person.rels.father)) {
                cleanedRels.father = person.rels.father;
            }

            if (person.rels.mother && presentIds.has(person.rels.mother)) {
                cleanedRels.mother = person.rels.mother;
            }

            if (person.rels.spouses && Array.isArray(person.rels.spouses)) {
                cleanedRels.spouses = person.rels.spouses.filter(spouseId => presentIds.has(spouseId));
            }

            if (person.rels.children && Array.isArray(person.rels.children)) {
                cleanedRels.children = person.rels.children.filter(childId => presentIds.has(childId));
            }

            return {
                ...person,
                rels: cleanedRels
            };
        });

        console.log('Cleaned route data for chart:', cleanedRouteData);

        // Update chart data store
        updateChartDataStore(cleanedRouteData);

        // Re-initialize the chart with the new data
        const chartContainer = document.getElementById('FamilyChart');
        if (chartContainer) {
            console.log('Chart container found, initializing chart...');

            // Clear existing chart
            chartContainer.innerHTML = '';

            // Make sure container is visible and has proper dimensions
            chartContainer.style.display = 'block';
            chartContainer.style.width = '100%';
            chartContainer.style.height = '600px';
            chartContainer.style.backgroundColor = 'rgb(33, 33, 33)';
            chartContainer.style.color = '#fff';

            // Initialize new chart with route data
            try {
                await initializeChart(cleanedRouteData, {
                    onNodeSelect: handleNodeSelect
                });
                console.log('Chart initialized successfully');
            } catch (chartError) {
                console.error('Chart initialization failed:', chartError);

                // Show fallback message if chart fails to load
                chartContainer.innerHTML = `
                    <div class="chart-error-message" style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; text-align: center; font-size: 18px;">
                        <div>
                            <h3>Chart Loading Issue</h3>
                            <p>Route found but chart visualization failed to load.</p>
                            <p>Route: ${cleanedRouteData.map(p => p.data["first name"] + " " + p.data["last name"]).join(' → ')}</p>
                            <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
                        </div>
                    </div>
                `;
            }
        } else {
            console.error('Chart container not found!');
        }

        // Highlight the route path after a short delay to ensure chart is rendered
        setTimeout(() => {
            highlightRoutePath(routeData.pathIds);
        }, 1000);

        console.log('Chart updated with route data successfully');
    } catch (error) {
        console.error('Error updating chart with route:', error);
        throw error;
    }
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
    console.log('Clearing selections...');

    // Clear selected persons
    selectedPerson1 = null;
    selectedPerson2 = null;

    // Clear displays
    const person1Display = document.getElementById('person1-display');
    const person2Display = document.getElementById('person2-display');

    if (person1Display) person1Display.innerHTML = '<span class="no-selection">No person selected</span>';
    if (person2Display) person2Display.innerHTML = '<span class="no-selection">No person selected</span>';

    // Clear search inputs
    if (searchInstance1) {
        searchInstance1.handleClearSearch();
    }
    if (searchInstance2) {
        searchInstance2.handleClearSearch();
    }

    // Update find route button
    updateFindRouteButton();

    // Clear chart and show initial empty state
    const chartContainer = document.getElementById('FamilyChart');
    if (chartContainer) {
        chartContainer.innerHTML = '';

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

    // Clear route data
    routeData = null;

    // Clear any route highlighting
    document.querySelectorAll('.route-path-highlight, .route-path-main').forEach(el => {
        el.classList.remove('route-path-highlight', 'route-path-main');
    });

    // Reset route info
    const routeInfo = document.getElementById('route-info');
    const routeDetails = document.getElementById('route-details');
    if (routeInfo) routeInfo.style.display = 'none';
    if (routeDetails) routeDetails.style.display = 'none';
    updateRouteStatus('Select two people to find route');

    updateDataSourceIndicator('Select two people to find route');
    console.log('Selections cleared successfully');
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

// Export for use in other modules
export { selectedPerson1, selectedPerson2, routeData, handleNodeSelect };