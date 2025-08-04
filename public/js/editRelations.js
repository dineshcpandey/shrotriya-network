// editRelations.js - Search functionality for relatives in Edit Person form

import { searchByName } from './api.js';
import { updatePersonData, fetchNetworkData } from './api.js';
import { chartData, updateChartDataStore } from './app.js';
import { updateChartData } from './chart.js';
import { showNotification } from './addPerson.js';

// Global variables to store selected relatives
let currentPerson = null;
let selectedRelatives = {
    father: null,
    mother: null,
    spouse: null
};

// Flag to track if edit relations has been initialized
let isInitialized = false;
let isLoading = false;

/**
 * Initialize edit relations functionality
 * @param {Object} person - The person being edited
 */
export function initEditRelations(person) {
    // If already initialized, clean up previous state
    if (isInitialized) {
        // Find and remove any existing relationship sections to avoid duplication
        const existingSections = document.querySelectorAll('.edit-relationships-section');
        existingSections.forEach(section => {
            if (section.parentNode) {
                section.parentNode.removeChild(section);
            }
        });
    }

    // Store reference to current person
    currentPerson = person;

    // Reset selected relatives
    selectedRelatives = {
        father: null,
        mother: null,
        spouse: null
    };

    // First load the relationships we already have
    loadCurrentRelationships();

    // Add the relations section to the edit form
    addRelationsSectionToForm();

    // Mark as initialized
    isInitialized = true;

    // Fetch network data for this person to ensure we have all relationships
    // This happens asynchronously and will update the UI when complete
    loadNetworkDataForPerson(person);

    console.log('Edit relations initialized for person:', person.id);
}

/**
 * Load network data for the person being edited
 * @param {Object} person - The person being edited
 * @returns {Promise<void>}
 */
async function loadNetworkDataForPerson(person) {
    // Prevent multiple simultaneous loads
    if (isLoading) return;

    try {
        isLoading = true;

        // Show a subtle loading indicator in the edit form
        const editForm = document.getElementById('edit-form-content');
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'relationship-loading-indicator';
        loadingIndicator.innerHTML = 'Loading family data...';
        if (editForm) editForm.appendChild(loadingIndicator);

        console.log('Fetching network data for person:', person.id);

        // Fetch the network data
        const networkData = await fetchNetworkData(person.id);

        // Update chart data with the network data
        await updateChartData(networkData);

        // Now reload the relationships with the updated data
        loadCurrentRelationships();

        // And update the UI
        updateRelationshipsUI();

        console.log('Successfully loaded network data and updated relationships');

        // Show a notification
        showNotification('Family relationships loaded', 'info');

    } catch (error) {
        console.error('Error loading network data for person:', error);
    } finally {
        isLoading = false;

        // Remove the loading indicator
        const loadingIndicator = document.querySelector('.relationship-loading-indicator');
        if (loadingIndicator && loadingIndicator.parentNode) {
            loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
    }
}

/**
 * Load current relationships from the person being edited
 */
function loadCurrentRelationships() {
    if (!currentPerson || !currentPerson.rels) {
        console.log('No relationships found for current person');
        return;
    }
    console.log("Current Person")
    console.dir(currentPerson)
    console.log('Loading current relationships for person:', currentPerson.id);
    console.log('Current relationships:', JSON.stringify(currentPerson.rels));

    // Load father if exists - Support both father and fatherid properties
    // Sometimes data has 'father', sometimes it has 'fatherid' - handle both
    const fatherId = currentPerson.rels.father || currentPerson.rels.fatherid;
    if (fatherId) {
        // Look in chartData for father
        const father = chartData.find(p => p.id === fatherId);
        if (father) {
            console.log('Found father data:', father.id);
            selectedRelatives.father = father;
        } else {
            console.log('Father ID exists but not found in chartData:', fatherId);
            // Create a placeholder object for the father
            selectedRelatives.father = {
                id: fatherId,
                data: {
                    "first name": "ID:",
                    "last name": fatherId,
                    "avatar": null
                }
            };
        }
    } else {
        console.log('No father relationship found');
    }

    // Load mother if exists - Support both mother and motherid properties
    const motherId = currentPerson.rels.mother || currentPerson.rels.motherid;
    if (motherId) {
        const mother = chartData.find(p => p.id === motherId);
        if (mother) {
            console.log('Found mother data:', mother.id);
            selectedRelatives.mother = mother;
        } else {
            console.log('Mother ID exists but not found in chartData:', motherId);
            // Create a placeholder object for the mother
            selectedRelatives.mother = {
                id: motherId,
                data: {
                    "first name": "ID:",
                    "last name": motherId,
                    "avatar": null
                }
            };
        }
    } else {
        console.log('No mother relationship found');
    }

    // Load spouse if exists (first spouse in the list)
    if (currentPerson.rels.spouses && currentPerson.rels.spouses.length > 0) {
        const spouseId = currentPerson.rels.spouses[0];
        const spouse = chartData.find(p => p.id === spouseId);
        if (spouse) {
            console.log('Found spouse data:', spouse.id);
            selectedRelatives.spouse = spouse;
        } else {
            console.log('Spouse ID exists but not found in chartData:', spouseId);
            // Create a placeholder object for the spouse
            selectedRelatives.spouse = {
                id: spouseId,
                data: {
                    "first name": "ID:",
                    "last name": spouseId,
                    "avatar": null
                }
            };
        }
    } else if (currentPerson.rels.spouseid) {
        // Support for spouseid property as well
        const spouseId = currentPerson.rels.spouseid;
        const spouse = chartData.find(p => p.id === spouseId);
        if (spouse) {
            console.log('Found spouse data from spouseid:', spouse.id);
            selectedRelatives.spouse = spouse;
        } else {
            console.log('Spouse ID exists (spouseid) but not found in chartData:', spouseId);
            // Create a placeholder object for the spouse
            selectedRelatives.spouse = {
                id: spouseId,
                data: {
                    "first name": "ID:",
                    "last name": spouseId,
                    "avatar": null
                }
            };
        }
    } else {
        console.log('No spouse relationship found');
    }

    // Debug log the selected relatives
    console.log('Selected relatives after loading:', {
        father: selectedRelatives.father ? selectedRelatives.father.id : null,
        mother: selectedRelatives.mother ? selectedRelatives.mother.id : null,
        spouse: selectedRelatives.spouse ? selectedRelatives.spouse.id : null
    });
}

/**
 * Add relations section to the edit form
 */
function addRelationsSectionToForm() {
    // Get the form container 
    const editFormContent = document.getElementById('edit-form-content');

    // Find the existing form - this is the f3-form added by the library
    const familyForm = editFormContent.querySelector('#familyForm');

    if (!familyForm) {
        console.error('Family form not found in edit form content');
        return;
    }

    // Check if we already added our relationships section
    if (familyForm.querySelector('.edit-relationships-section')) {
        console.log('Relationships section already exists, skipping');
        return;
    }

    // Add the relationships section after the form fields but before the buttons
    const buttonsSection = familyForm.querySelector('.f3-form-buttons') ||
        familyForm.querySelector('button[type="submit"]') ||
        familyForm.querySelector('input[type="submit"]') ||
        familyForm.lastElementChild;

    if (!buttonsSection) {
        console.log('No buttons section found, appending relationships section to form');
        // Just append to the end of the form if no buttons found
        const relationshipsSection = document.createElement('div');
        relationshipsSection.className = 'edit-relationships-section';
        relationshipsSection.id = 'custom-relationships-section';
        relationshipsSection.innerHTML = createRelationshipsSectionHTML();
        familyForm.appendChild(relationshipsSection);
    } else {
        // Create the relationships section
        const relationshipsSection = document.createElement('div');
        relationshipsSection.className = 'edit-relationships-section';
        relationshipsSection.id = 'custom-relationships-section';
        relationshipsSection.innerHTML = createRelationshipsSectionHTML();

        // Insert before buttons
        familyForm.insertBefore(relationshipsSection, buttonsSection);
    }

    // Setup event listeners for relationship search
    setupRelationshipEventListeners();

    // Update UI with current relationships
    updateRelationshipsUI();
}

/**
 * Create HTML for relationships section
 */
function createRelationshipsSectionHTML() {
    return `
    <h3 class="relationships-heading">Search for Family Members</h3>
    
    <div class="form-field relationship-field">
        <label>Search for Father</label>
        <div class="relationship-selector" id="father-selector">
            <div class="relationship-search-container">
                <input type="text" class="relationship-search" data-rel-type="father" placeholder="Enter name to search...">
                <div class="search-results" data-for="father"></div>
            </div>
            <div class="selected-relative" data-for="father">
                <p class="no-selection">No father selected</p>
            </div>
        </div>
    </div>
    
    <div class="form-field relationship-field">
        <label>Search for Mother</label>
        <div class="relationship-selector" id="mother-selector">
            <div class="relationship-search-container">
                <input type="text" class="relationship-search" data-rel-type="mother" placeholder="Enter name to search...">
                <div class="search-results" data-for="mother"></div>
            </div>
            <div class="selected-relative" data-for="mother">
                <p class="no-selection">No mother selected</p>
            </div>
        </div>
    </div>
    
    <div class="form-field relationship-field">
        <label>Search for Spouse</label>
        <div class="relationship-selector" id="spouse-selector">
            <div class="relationship-search-container">
                <input type="text" class="relationship-search" data-rel-type="spouse" placeholder="Enter name to search...">
                <div class="search-results" data-for="spouse"></div>
            </div>
            <div class="selected-relative" data-for="spouse">
                <p class="no-selection">No spouse selected</p>
            </div>
        </div>
    </div>
    
    <div class="relationship-section-helper">
        <small>Type a name above to search and select family members</small>
    </div>
    `;
}

/**
 * Setup event listeners for relationship search
 */
function setupRelationshipEventListeners() {
    // Get all search inputs
    const searchInputs = document.querySelectorAll('.relationship-search');

    searchInputs.forEach(input => {
        input.addEventListener('input', debounce(handleRelationshipSearch, 300));
        input.addEventListener('focus', (e) => {
            // Close any other open search results
            const allResults = document.querySelectorAll('.search-results');
            allResults.forEach(results => {
                if (results !== e.target.parentNode.querySelector('.search-results')) {
                    results.style.display = 'none';
                }
            });
        });
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.relationship-search-container')) {
            const allResults = document.querySelectorAll('.search-results');
            allResults.forEach(results => {
                results.style.display = 'none';
            });
        }
    });
}

/**
 * Update UI to show currently selected relationships
 */
function updateRelationshipsUI() {
    // Update Father UI
    updateRelativeUI('father');

    // Update Mother UI
    updateRelativeUI('mother');

    // Update Spouse UI
    updateRelativeUI('spouse');
}

/**
 * Update UI for a specific relationship type
 * @param {string} relType - Relationship type ('father', 'mother', 'spouse')
 */
function updateRelativeUI(relType) {
    const selectedContainer = document.querySelector(`.selected-relative[data-for="${relType}"]`);
    if (!selectedContainer) return;

    const relative = selectedRelatives[relType];

    if (!relative) {
        selectedContainer.innerHTML = `<p class="no-selection">No ${relType} selected</p>`;
        return;
    }

    const fullName = relative.data["first name"] && relative.data["last name"]
        ? `${relative.data["first name"]} ${relative.data["last name"]}`.trim()
        : relative.id;

    const isPlaceholder = relative.data["first name"] === "ID:";
    const avatar = relative.data.avatar || 'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg';

    selectedContainer.innerHTML = `
        <div class="selected-person ${isPlaceholder ? 'placeholder-person' : ''}" data-person-id="${relative.id}">
            <img src="${avatar}" class="selected-avatar">
            <span class="selected-name">${isPlaceholder ? 'ID: ' + relative.id + ' (not loaded)' : fullName}</span>
            <button type="button" class="remove-relative-btn" data-rel-type="${relType}">&times;</button>
        </div>
    `;

    // Add event listener to remove button
    const removeBtn = selectedContainer.querySelector('.remove-relative-btn');
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeRelative(relType);
    });
}

/**
 * Handle relationship search input
 * @param {Event} e - Input event
 */
async function handleRelationshipSearch(e) {
    const input = e.target;
    const searchTerm = input.value.trim();
    const relType = input.dataset.relType;
    const resultsContainer = input.parentNode.querySelector(`.search-results[data-for="${relType}"]`);

    // Clear previous results
    resultsContainer.innerHTML = '';

    if (searchTerm.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }

    try {
        // Show loading indicator
        resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';
        resultsContainer.style.display = 'block';

        // Perform search
        const results = await searchByName(searchTerm);

        // Filter results based on relationship type and current person
        let filteredResults = results.filter(person => person.id !== currentPerson.id); // Exclude self

        // For mother, only show females
        if (relType === 'mother') {
            filteredResults = filteredResults.filter(person => person.data.gender === 'F');
        }

        // For father, only show males
        if (relType === 'father') {
            filteredResults = filteredResults.filter(person => person.data.gender === 'M');
        }

        // Clear loading and display results
        resultsContainer.innerHTML = '';

        if (filteredResults.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No matching people found</div>';
            return;
        }

        // Create result items
        filteredResults.forEach(person => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.dataset.personId = person.id;

            const fullName = `${person.data["first name"] || ''} ${person.data["last name"] || ''}`.trim();
            const location = person.data.location || 'Unknown location';
            const gender = person.data.gender === 'M' ? 'Male' : person.data.gender === 'F' ? 'Female' : 'Unknown';

            resultItem.innerHTML = `
                <div class="result-avatar">
                    <img src="${person.data.avatar || 'default-avatar.png'}" alt="${fullName}">
                </div>
                <div class="result-info">
                    <div class="result-name">${fullName}</div>
                    <div class="result-details">${gender} · ${location}</div>
                </div>
            `;

            // Add click handler
            resultItem.addEventListener('click', () => {
                selectRelative(person, relType);
                resultsContainer.style.display = 'none';
                input.value = ''; // Clear the input
            });

            resultsContainer.appendChild(resultItem);
        });

    } catch (error) {
        console.error('Error searching for relatives:', error);
        resultsContainer.innerHTML = '<div class="search-error">Error performing search</div>';
    }
}

/**
 * Select a relative
 * @param {Object} person - Selected person
 * @param {string} relType - Relationship type
 */
function selectRelative(person, relType) {
    // Store selected relative
    selectedRelatives[relType] = person;

    // Update UI
    updateRelativeUI(relType);

    // Update relationships in person object
    updatePersonRelationships();

    console.log(`Selected ${relType}:`, person.id);
}

/**
 * Remove a selected relative
 * @param {string} relType - Relationship type
 */
function removeRelative(relType) {
    // Remove from selected relatives
    selectedRelatives[relType] = null;

    // Update UI
    updateRelativeUI(relType);

    // Update relationships in person object
    updatePersonRelationships();

    console.log(`Removed ${relType}`);
}

/**
 * Update relationships in the person object
 */
function updatePersonRelationships() {
    if (!currentPerson) return;

    // Update father
    currentPerson.rels.father = selectedRelatives.father ? selectedRelatives.father.id : null;

    // Update mother
    currentPerson.rels.mother = selectedRelatives.mother ? selectedRelatives.mother.id : null;

    // Update spouse - handle array for spouses
    if (selectedRelatives.spouse) {
        if (!currentPerson.rels.spouses) {
            currentPerson.rels.spouses = [];
        }

        // Check if this spouse is already in the list
        if (!currentPerson.rels.spouses.includes(selectedRelatives.spouse.id)) {
            // Clear existing spouses (optional - remove this if you want to support multiple spouses)
            currentPerson.rels.spouses = [];
            // Add the new spouse
            currentPerson.rels.spouses.push(selectedRelatives.spouse.id);
        }
    } else {
        // No spouse selected, clear the list (optional - adjust based on your requirements)
        if (currentPerson.rels.spouses) {
            currentPerson.rels.spouses = [];
        }
    }

    console.log('Updated relationships in person object:', currentPerson.rels);
}

/**
 * Save relationships to backend
 * This should be called when the main form is submitted
 * @returns {Promise} Promise resolving when relationships are saved
 */
export async function saveRelationships() {
    if (!currentPerson) return Promise.resolve();

    try {
        // First make sure our relationship data is up-to-date
        updatePersonRelationships();

        // For each selected relative, update their relationships too
        const updatePromises = [];

        // // Update father's children list
        // if (selectedRelatives.father) {
        //     updatePromises.push(
        //         updateRelativeRelationship(selectedRelatives.father, 'children', currentPerson.id)
        //     );
        // }

        // // Update mother's children list
        // if (selectedRelatives.mother) {
        //     updatePromises.push(
        //         updateRelativeRelationship(selectedRelatives.mother, 'children', currentPerson.id)
        //     );
        // }

        // Update spouse's spouses list
        if (selectedRelatives.spouse) {
            updatePromises.push(
                updateRelativeRelationship(selectedRelatives.spouse, 'spouses', currentPerson.id)
            );
        }

        // Wait for all updates to complete
        await Promise.all(updatePromises);

        // Finally update chart data with our changes
        await updateChartData([currentPerson]);

        return true;
    } catch (error) {
        console.error('Error saving relationships:', error);
        throw error;
    }
}

/**
 * Update a relative's relationship with the current person
 * @param {Object} relative - The relative to update
 * @param {string} relType - Relationship type on the relative's side
 * @param {string} personId - ID of the current person
 * @returns {Promise} Promise resolving when relationship is updated
 */
async function updateRelativeRelationship(relative, relType, personId) {
    try {
        // Clone the relative to avoid mutations
        const updatedRelative = JSON.parse(JSON.stringify(relative));

        // Convert personId to string for consistency
        personId = String(personId);

        // For array relationships (children, spouses)
        if (!updatedRelative.rels[relType]) {
            updatedRelative.rels[relType] = [];
        }

        // Add current person to relationship if not already there
        // First convert all IDs to strings to prevent type mismatches
        const existingIds = updatedRelative.rels[relType].map(id => String(id));
        if (!existingIds.includes(personId)) {
            updatedRelative.rels[relType].push(personId);
        }

        // Handle parent relationship (for children)
        if (relType === 'children') {
            // If we're a father adding a child to our children array
            if (currentPerson.data.gender === 'M') {
                updatedRelative.rels.father = personId;
            }
            // If we're a mother adding a child to our children array
            else if (currentPerson.data.gender === 'F') {
                updatedRelative.rels.mother = personId;
            }
        }

        // Update person in the backend
        await updatePersonData(relative.id, updatedRelative);

        console.log(`Updated ${relType} relationship for person ${relative.id} with ${personId}`);
        return true;
    } catch (error) {
        console.error(`Error updating ${relType} relationship:`, error);
        throw error;
    }
}

/**
 * Debounce function for search input
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}