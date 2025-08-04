// public/js/search.js - Fixed search functionality
import { searchPeople, fetchLocationSuggestions } from './api-utils.js';
import { getChartInstance, openEditTree, clearCurrentEditPerson } from './chart.js';
import { showNotification } from './addPerson.js';
import { isUserAuthenticated, showLoginForm } from './auth.js';
import { chartData, handleNodeSelect, clearChartData } from './app.js';

import { searchByName, searchByLocation } from './api.js';
import { addPersonToChart, isPersonInChart } from './chart.js';
import { AvatarUtils } from './avatarUtils.js';

// Search elements
let searchForm;
let nameInput;
let locationInput;
let locationSuggestions;
let searchButton;
let clearButton;
let searchError;
let resultsCount;
let personCards;
let searchResultsDropdown;
let closeResultsBtn;

// Type-ahead state
let currentSuggestions = [];
let selectedSuggestionIndex = -1;
let debounceTimer = null;

// Default options
let searchOptions = {
    onPersonSelect: null,
};


/**
 * Set up search functionality with name and location fields
 * @param {Object} options - Search options
 */
export function setupSearch(options = {}) {
    // Merge options
    searchOptions = { ...searchOptions, ...options };

    // Get DOM elements
    searchForm = document.getElementById('search-form');
    nameInput = document.getElementById('name-input');
    locationInput = document.getElementById('location-input');
    locationSuggestions = document.getElementById('location-suggestions');
    searchButton = document.getElementById('search-button');
    clearButton = document.getElementById('clear-search-btn');
    searchError = document.getElementById('search-error');
    resultsCount = document.getElementById('results-count');
    personCards = document.getElementById('person-cards');
    searchResultsDropdown = document.querySelector('.search-results-dropdown');
    closeResultsBtn = document.getElementById('close-results-btn');

    // Debug check
    console.log('Search elements found:', {
        searchForm: !!searchForm,
        nameInput: !!nameInput,
        locationInput: !!locationInput,
        locationSuggestions: !!locationSuggestions,
        searchButton: !!searchButton,
        clearButton: !!clearButton,
        searchError: !!searchError,
        resultsCount: !!resultsCount,
        personCards: !!personCards,
        searchResultsDropdown: !!searchResultsDropdown,
        closeResultsBtn: !!closeResultsBtn
    });

    // CRITICAL: Ensure modal is hidden on startup
    if (searchResultsDropdown) {
        searchResultsDropdown.style.display = 'none';
        searchResultsDropdown.style.visibility = 'hidden';
        searchResultsDropdown.style.opacity = '0';
    }

    // Set up event listeners
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
        console.log('Search form submit handler attached');
    }

    if (searchButton) {
        searchButton.addEventListener('click', handleSearch);
        console.log('Search button click handler attached');
    }

    if (clearButton) {
        clearButton.addEventListener('click', handleClearSearch);
        console.log('Clear button click handler attached');
    }

    // Set up location type-ahead
    if (locationInput) {
        locationInput.addEventListener('input', handleLocationInput);
        locationInput.addEventListener('keydown', handleLocationKeydown);
        locationInput.addEventListener('blur', hideSuggestions);
        console.log('Location input handlers attached');
    }

    // Set up close results button
    if (closeResultsBtn) {
        closeResultsBtn.addEventListener('click', clearSearchResults);
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchResultsDropdown && isModalVisible()) {
            clearSearchResults();
        }
    });

    // Close modal when clicking outside the container
    if (searchResultsDropdown) {
        searchResultsDropdown.addEventListener('click', (e) => {
            if (e.target === searchResultsDropdown) {
                clearSearchResults();
            }
        });
    }

    // Click outside to hide suggestions
    document.addEventListener('click', (e) => {
        if (locationInput && locationSuggestions &&
            !locationInput.contains(e.target) &&
            !locationSuggestions.contains(e.target)) {
            hideSuggestions();
        }
    });

    console.log('Search component initialized');
}

/**
 * Check if modal is currently visible
 * @returns {boolean}
 */
function isModalVisible() {
    if (!searchResultsDropdown) return false;
    const computedStyle = window.getComputedStyle(searchResultsDropdown);
    return computedStyle.display === 'flex' && computedStyle.visibility !== 'hidden';
}

/**
 * Handle search form submission
 * @param {Event} e - Form submit event
 */
async function handleSearch(e) {
    e.preventDefault();
    console.log('Search handler triggered');

    // Check authentication
    if (!isUserAuthenticated()) {
        showLoginForm('search for people');
        return;
    }

    // Get search values
    const name = nameInput ? nameInput.value.trim() : '';
    const location = locationInput ? locationInput.value.trim() : '';

    // Validate input
    if (!name && !location) {
        showError('Please enter either a name or location to search');
        showSearchResults();
        return;
    }

    // Update UI
    if (searchButton) {
        searchButton.disabled = true;
        searchButton.textContent = 'Searching...';
    }

    // Clear previous results but don't hide modal yet
    clearSearchResultsContent();

    try {
        console.log(`Searching for name: "${name}", location: "${location}"`);

        const results = await searchPeople(name, location);
        console.log('Search results:', results);

        // Clear any previous errors
        if (searchError) {
            searchError.style.display = 'none';
        }

        // Display results
        if (results.length === 0) {
            if (resultsCount) {
                resultsCount.textContent = 'No people found matching your search criteria';
                resultsCount.style.display = 'block';
            }
        } else {
            // Check which people are already in the chart
            const existingIds = new Set(chartData.map(person => person.id));
            const newCount = results.filter(person => !existingIds.has(person.id)).length;

            let statusText;
            if (newCount === 0) {
                statusText = `Found ${results.length} ${results.length === 1 ? 'person' : 'people'} already in your chart`;
            } else {
                statusText = `Found ${newCount} ${newCount === 1 ? 'person' : 'people'} to add to your chart`;
            }

            if (resultsCount) {
                resultsCount.textContent = statusText;
                resultsCount.style.display = 'block';
            }

            // Create person cards for all results
            if (personCards) {
                personCards.innerHTML = '';
                results.forEach(person => {
                    const card = createPersonCard(person, existingIds.has(person.id));
                    personCards.appendChild(card);
                });
            }
        }

        // Show search results dropdown
        showSearchResults();
    } catch (error) {
        console.error('Search error:', error);
        showError(`Error searching: ${error.message}`);
        showSearchResults();
    } finally {
        // Reset UI state
        if (searchButton) {
            searchButton.disabled = false;
            searchButton.textContent = 'Search';
        }
    }
}

/**
 * Handle clear search button
 */
function handleClearSearch() {
    if (nameInput) nameInput.value = '';
    if (locationInput) locationInput.value = '';
    clearSearchResults();
    hideSuggestions();
}

/**
 * Handle location input for type-ahead functionality
 * @param {Event} e - Input event
 */
async function handleLocationInput(e) {
    const query = e.target.value.trim();

    // Clear previous timer
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    // Debounce the API call
    debounceTimer = setTimeout(async () => {
        if (query.length >= 2) {
            try {
                const suggestions = await fetchLocationSuggestions(query);
                showSuggestions(suggestions);
            } catch (error) {
                console.error('Location suggestions error:', error);
                hideSuggestions();
            }
        } else {
            hideSuggestions();
        }
    }, 300);
}

/**
 * Handle keyboard navigation in location suggestions
 * @param {Event} e - Keydown event
 */
function handleLocationKeydown(e) {
    if (!currentSuggestions.length) return;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, currentSuggestions.length - 1);
            updateSuggestionSelection();
            break;

        case 'ArrowUp':
            e.preventDefault();
            selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
            updateSuggestionSelection();
            break;

        case 'Enter':
            e.preventDefault();
            if (selectedSuggestionIndex >= 0) {
                selectSuggestion(currentSuggestions[selectedSuggestionIndex]);
            }
            break;

        case 'Escape':
            hideSuggestions();
            break;
    }
}

/**
 * Show location suggestions
 * @param {Array} suggestions - Array of location strings
 */
function showSuggestions(suggestions) {
    if (!locationSuggestions) return;

    currentSuggestions = suggestions;
    selectedSuggestionIndex = -1;

    if (suggestions.length === 0) {
        locationSuggestions.innerHTML = '<div class="no-suggestions">No locations found</div>';
        locationSuggestions.style.display = 'block';
        return;
    }

    locationSuggestions.innerHTML = suggestions.map((suggestion, index) =>
        `<div class="location-suggestion" data-index="${index}">${suggestion}</div>`
    ).join('');

    // Add click handlers to suggestions
    locationSuggestions.querySelectorAll('.location-suggestion').forEach((el, index) => {
        el.addEventListener('click', () => selectSuggestion(suggestions[index]));
    });

    locationSuggestions.style.display = 'block';
}

/**
 * Hide location suggestions
 */
function hideSuggestions() {
    setTimeout(() => {
        if (locationSuggestions) {
            locationSuggestions.style.display = 'none';
        }
        currentSuggestions = [];
        selectedSuggestionIndex = -1;
    }, 200);
}

/**
 * Update suggestion selection highlighting
 */
function updateSuggestionSelection() {
    if (!locationSuggestions) return;

    const suggestionElements = locationSuggestions.querySelectorAll('.location-suggestion');
    suggestionElements.forEach((el, index) => {
        el.classList.toggle('selected', index === selectedSuggestionIndex);
    });
}

/**
 * Select a location suggestion
 * @param {string} suggestion - Selected location
 */
function selectSuggestion(suggestion) {
    if (locationInput) {
        locationInput.value = suggestion;
        locationInput.focus();
    }
    hideSuggestions();
}



/**
 * Initialize search components
 */
function initSearchComponents() {
    searchResultsDropdown = document.getElementById('search-results-dropdown');
    searchError = document.getElementById('search-error');
    resultsCount = document.getElementById('results-count');
    personCards = document.getElementById('person-cards');
}

/**
 * Setup search event listeners
 */
function setupSearchEventListeners() {
    // Search form submission
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearchSubmit);
    }

    // Search button click
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearchClick);
    }

    // Clear button click
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearClick);
    }

    // Close results button
    const closeBtn = document.getElementById('close-results-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', clearSearchResults);
    }
}

/**
 * Show the search results dropdown
 */
function showSearchResults() {
    if (!searchResultsDropdown) return;

    console.log('Showing search results modal');

    // Force proper display
    searchResultsDropdown.style.display = 'flex';
    searchResultsDropdown.style.visibility = 'visible';
    searchResultsDropdown.style.opacity = '1';

    // Prevent body scroll when modal is open
    document.body.classList.add('modal-open');

    // Focus management for accessibility
    const closeBtn = searchResultsDropdown.querySelector('.close-results-btn');
    if (closeBtn) {
        closeBtn.focus();
    }
}

/**
 * Clear search results content only (don't hide modal)
 */
function clearSearchResultsContent() {
    if (searchError) {
        searchError.style.display = 'none';
    }

    if (resultsCount) {
        resultsCount.style.display = 'none';
    }

    if (personCards) {
        personCards.innerHTML = '';
    }
}

/**
 * Clear search results and hide modal
 */
export function clearSearchResults() {
    console.log('Clearing search results');

    if (searchResultsDropdown) {
        searchResultsDropdown.style.display = 'none';
        searchResultsDropdown.style.visibility = 'hidden';
        searchResultsDropdown.style.opacity = '0';

        // Re-enable body scroll
        document.body.classList.remove('modal-open');
    }

    clearSearchResultsContent();
}

/**
 * Show search error
 * @param {string} message - Error message
 */
function showError(message) {
    if (searchError) {
        searchError.textContent = message;
        searchError.style.display = 'block';
    }

    if (resultsCount) {
        resultsCount.style.display = 'none';
    }

    console.error('Search error:', message);
}

/**
 * Create a person card element with enhanced styling and gender color coding
 * @param {Object} person - Person data
 * @param {boolean} isInChart - Whether person is already in chart
 * @returns {HTMLElement} The card element
 */
function createPersonCard(person, isInChart) {
    const card = document.createElement('div');

    // Determine gender class for styling
    const gender = person.gender || '';
    const genderClass = gender === 'M' ? 'male' : gender === 'F' ? 'female' : 'unknown';

    card.className = `person-card ${genderClass} ${isInChart ? 'in-chart' : ''}`;
    card.dataset.personId = person.id;

    // Format person details
    const name = person.personname || 'Unknown';
    const currentLocation = person.currentlocation || '';
    const nativePlace = person.nativeplace || '';
    const birthDate = person.birthdate ? new Date(person.birthdate).toLocaleDateString() : '';

    // Generate initials for avatar
    const initials = name.split(' ').map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase();

    // Create avatar section
    const avatarSection = `
        <div class="person-avatar">
            ${person.avatar ?
            `<img src="${person.avatar}" alt="${name}" onerror="this.parentElement.innerHTML='<span class=\\'avatar-initials\\'>${initials}</span>'">` :
            `<span class="avatar-initials">${initials}</span>`
        }
        </div>
    `;

    // Create person details without gender (using color coding instead)
    const detailsArray = [];

    if (currentLocation) {
        detailsArray.push(`
            <div class="detail-item">
                <svg class="detail-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"/>
                </svg>
                <span><strong>Current Location:</strong> ${currentLocation}</span>
            </div>
        `);
    }

    if (nativePlace) {
        detailsArray.push(`
            <div class="detail-item">
                <svg class="detail-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                </svg>
                <span><strong>Native Place:</strong> ${nativePlace}</span>
            </div>
        `);
    }

    if (birthDate) {
        detailsArray.push(`
            <div class="detail-item">
                <svg class="detail-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"/>
                </svg>
                <span><strong>Birth Date:</strong> ${birthDate}</span>
            </div>
        `);
    }

    if (person.phone) {
        detailsArray.push(`
            <div class="detail-item">
                <svg class="detail-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
                <span><strong>Phone:</strong> ${person.phone}</span>
            </div>
        `);
    }

    if (person.mail_id) {
        detailsArray.push(`
            <div class="detail-item">
                <svg class="detail-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
                <span><strong>Email:</strong> ${person.mail_id}</span>
            </div>
        `);
    }

    const detailsSection = detailsArray.length > 0 ? `
        <div class="person-details">
            ${detailsArray.join('')}
        </div>
    ` : '';

    card.innerHTML = `
        ${avatarSection}
        <div class="person-info">
            <div class="person-header">
                <div>
                    <h3>${name}</h3>
                </div>
                ${isInChart ? '<span class="in-chart-badge">Already in Chart</span>' : ''}
            </div>
            ${detailsSection}
        </div>
        <div class="person-actions">
            ${!isInChart ? `<button class="add-to-chart-btn" data-person-id="${person.id}">Add to Chart</button>` : ''}
            <button class="view-details-btn" data-person-id="${person.id}">View Details</button>
        </div>
    `;

    // Add event listeners
    const addToChartBtn = card.querySelector('.add-to-chart-btn');
    const viewDetailsBtn = card.querySelector('.view-details-btn');

    if (addToChartBtn) {
        addToChartBtn.addEventListener('click', () => {
            if (searchOptions.onPersonSelect) {
                searchOptions.onPersonSelect(person);
            } else {
                handleNodeSelect(person);
            }
            if (searchResultsDropdown &&
                !searchResultsDropdown.contains(event.target) &&
                !event.target.closest('.search-container')) {
                clearSearchResults();
            }
        });
    }

    if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', () => {
            console.log('View details for person:', person.id);
        });
    }

    return card;
}

/**
 * Clear search inputs
 */
export function clearSearch() {
    if (nameInput) nameInput.value = '';
    if (locationInput) locationInput.value = '';
    clearSearchResults();
    hideSuggestions();
}

// Export for use in other modules
export { searchPeople, fetchLocationSuggestions };