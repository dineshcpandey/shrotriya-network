// Chart functionality

import { mergeNetworkData, cleanInvalidReferences } from './dataUtils.js';
import { chartData as appChartData, chartData, updateChartDataStore, showNotification } from './app.js';
import { fetchNetworkData, updatePersonData } from './api.js';
import { handleNewRelativeClick, isCurrentlyAddingRelative, resetAddRelativeState } from './addRelative.js';
import { saveRelationshipsOnSubmit } from './editForm.js';
import { isUserAuthenticated, showLoginForm } from './auth.js';




// Global chart instance
let f3Chart = null;
let f3Card = null;
let f3EditTree = null;
// Track the currently edited person
let currentEditPerson = null;

/**
 * Handle form submission for person edits
 * @param {Object} currentEditPerson - The person being edited
 * @returns {Promise} - Promise resolving to the updated person
 */
function handleFormSubmission(currentEditPerson) {
    try {
        // Get the edit form elements
        const editForm = document.getElementById('edit-form');
        const editFormContent = document.getElementById('edit-form-content');

        if (!editFormContent) {
            throw new Error("Edit form content element not found");
        }

        // Show a status message in the form
        const statusMsg = document.createElement('div');
        statusMsg.className = 'form-status-message';
        statusMsg.textContent = 'Saving changes...';
        editFormContent.appendChild(statusMsg);

        // Call the API to update the person data, and also save relationships
        return Promise.all([
            updatePersonData(currentEditPerson.id, currentEditPerson),
            saveRelationshipsOnSubmit(currentEditPerson) // Save the relationships
        ])
            .then(() => {
                // Update the status message
                statusMsg.className = 'form-status-message success';
                statusMsg.textContent = 'Changes saved successfully!';

                // Clear any previously shown success summaries
                const existingSummaries = editFormContent.querySelectorAll('.update-success-summary');
                existingSummaries.forEach(summary => summary.remove());

                const familyForm = document.getElementById('familyForm');
                console.log("Got the familyForm ", familyForm)
                if (familyForm) {
                    // To be fixed I don't want .parentNode.parentNode
                    familyForm.parentNode.parentNode.style.display = 'none';
                }

                // Create a success summary with data highlights
                const successSummary = document.createElement('div');
                successSummary.className = 'update-success-summary';

                // Format the updated data for display
                const firstName = currentEditPerson.data["first name"] || '';
                const lastName = currentEditPerson.data["last name"] || '';
                const location = currentEditPerson.data.location || 'Not specified';
                const gender = currentEditPerson.data.gender === 'M' ? 'Male' :
                    currentEditPerson.data.gender === 'F' ? 'Female' : 'Not specified';

                successSummary.innerHTML = `
                <h3>Updated Information</h3>
                <div class="summary-item">
                    <span class="summary-label">Name:</span>
                    <span class="summary-value">${firstName} ${lastName}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Gender:</span>
                    <span class="summary-value">${gender}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Location:</span>
                    <span class="summary-value">${location}</span>
                </div>
                ${currentEditPerson.data.birthday ? `
                    <div class="summary-item">
                        <span class="summary-label">Birthday:</span>
                        <span class="summary-value">${currentEditPerson.data.birthday}</span>
                    </div>
                ` : ''}
                
                <!-- Display relationship information in the summary -->
                ${currentEditPerson.rels.father ? `
                    <div class="summary-item">
                        <span class="summary-label">Father:</span>
                        <span class="summary-value">ID: ${currentEditPerson.rels.father}</span>
                    </div>
                ` : ''}
                ${currentEditPerson.rels.mother ? `
                    <div class="summary-item">
                        <span class="summary-label">Mother:</span>
                        <span class="summary-value">ID: ${currentEditPerson.rels.mother}</span>
                    </div>
                ` : ''}
                ${currentEditPerson.rels.spouses && currentEditPerson.rels.spouses.length > 0 ? `
                    <div class="summary-item">
                        <span class="summary-label">Spouse:</span>
                        <span class="summary-value">ID: ${currentEditPerson.rels.spouses[0]}</span>
                    </div>
                ` : ''}
            `;

                // Add a close button
                const closeBtn = document.createElement('button');
                closeBtn.className = 'close-edit-form-btn';
                closeBtn.textContent = 'Close';
                closeBtn.addEventListener('click', () => {
                    // Find and click the existing close button to reuse its functionality
                    const existingCloseBtn = document.getElementById('close-edit-form');
                    if (existingCloseBtn) {
                        existingCloseBtn.click();
                    }
                });

                successSummary.appendChild(closeBtn);

                // Add to the form content
                editFormContent.appendChild(successSummary);

                // Remove the status message after a delay - but keep the summary
                setTimeout(() => {
                    if (statusMsg.parentNode) {
                        statusMsg.parentNode.removeChild(statusMsg);
                    }
                }, 3000);

                console.log('Form updated with success summary');
                return currentEditPerson;
            });
    } catch (error) {
        console.error('Error handling form submission:', error);
        throw error;
    }
}

/**
 * Check if a person is already in the chart
 * @param {string} personId - The person ID to check
 * @returns {boolean} True if person is in chart, false otherwise
 */
export function isPersonInChart(personId) {
    return chartData.some(person => person.id === personId);
}

/**
 * Add a person to the chart
 * @param {Object} person - The person data to add
 * @returns {Promise<void>}
 */
export async function addPersonToChart(person) {
    try {
        console.log('Adding person to chart:', person.id);

        // Check if person is already in chart
        if (isPersonInChart(person.id)) {
            console.log('Person already in chart:', person.id);
            return;
        }

        // Convert the person data to the chart format if needed
        const chartPerson = convertPersonToChartFormat(person);

        // Add the person to the chart data
        const updatedChartData = [...chartData, chartPerson];

        // Update the central store
        updateChartDataStore(updatedChartData);

        // Update the chart display
        await updateChartData([chartPerson]);

        console.log('Person added to chart successfully:', person.id);

    } catch (error) {
        console.error('Error adding person to chart:', error);
        throw error;
    }
}

/**
 * Convert person data from search/API format to chart format
 * @param {Object} person - Person data from search/API
 * @returns {Object} Person data in chart format
 */
function convertPersonToChartFormat(person) {
    // If person is already in chart format, return as-is
    if (person.data && person.rels) {
        return person;
    }

    // Convert from API/search format to chart format
    const [firstName = '', ...rest] = (person.personname || '').split(' ');
    const lastName = rest.join(' ');

    // Determine avatar URL with priority: uploaded image > Facebook > default
    let avatarUrl = 'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg';

    if (person.profile_image_url) {
        // If it's a relative path, make it absolute
        if (person.profile_image_url.startsWith('/uploads/')) {
            const imageServeUrl = window.CONFIG?.IMAGE_SERVE_URL || 'http://localhost:5050/api/images/serve';
            avatarUrl = `${imageServeUrl}/${person.profile_image_filename}`;
        } else if (person.profile_image_url.startsWith('http')) {
            avatarUrl = person.profile_image_url;
        } else {
            const imageServeUrl = window.CONFIG?.IMAGE_SERVE_URL || 'http://localhost:5050/api/images/serve';
            avatarUrl = `${imageServeUrl}/${person.profile_image_url}`;
        }
    } else if (person.fb_id) {
        const facebookGraphUrl = window.CONFIG?.FACEBOOK_GRAPH_URL || 'https://graph.facebook.com';
        avatarUrl = `${facebookGraphUrl}/${person.fb_id}/picture`;
    }

    return {
        id: person.id.toString(),
        rels: {
            spouses: [],
            children: [],
            // Add father/mother if they exist
            ...(person.fatherid && { father: person.fatherid.toString() }),
            ...(person.motherid && { mother: person.motherid.toString() })
        },
        data: {
            "first name": firstName,
            "last name": lastName,
            "birthday": person.birthdate || person.yr_birth || person.date_birth || null,
            "avatar": avatarUrl,
            "gender": person.gender && person.gender.length > 0
                ? person.gender.charAt(0).toUpperCase()
                : 'U',
            "location": person.currentlocation || null,
            "contact": {
                "email": person.mail_id || null,
                "phone": person.phone || null
            },
            "work": person.worksat || null,
            "nativePlace": person.nativeplace || null,
            "desc": `${person.nativeplace || ''} ${person.currentlocation || ''} ${person.worksat || ''}`,
            "label": `${firstName} ${lastName}`,
            // Add image metadata for enhanced display
            "hasUploadedImage": !!person.profile_image_url,
            "imageFilename": person.profile_image_filename || null,
            "imageUploadDate": person.image_upload_date || null
        }
    };
}

/**
 * Remove a person from the chart
 * @param {string} personId - The person ID to remove
 * @returns {Promise<void>}
 */
export async function removePersonFromChart(personId) {
    try {
        console.log('Removing person from chart:', personId);

        // Check if person is in chart
        if (!isPersonInChart(personId)) {
            console.log('Person not in chart:', personId);
            return;
        }

        // Remove the person from chart data
        const updatedChartData = chartData.filter(person => person.id !== personId);

        // Update the central store
        updateChartDataStore(updatedChartData);

        // Update the chart display
        await updateChartData(updatedChartData);

        console.log('Person removed from chart successfully:', personId);

    } catch (error) {
        console.error('Error removing person from chart:', error);
        throw error;
    }
}

/**
 * Get a person from the chart by ID
 * @param {string} personId - The person ID to get
 * @returns {Object|null} The person data or null if not found
 */
export function getPersonFromChart(personId) {
    return chartData.find(person => person.id === personId) || null;
}


/**
 * Update a person in the chart
 * @param {string} personId - The person ID to update
 * @param {Object} updatedData - The updated person data
 * @returns {Promise<void>}
 */
export async function updatePersonInChart(personId, updatedData) {
    try {
        console.log('Updating person in chart:', personId);

        // Find the person in chart data
        const personIndex = chartData.findIndex(person => person.id === personId);

        if (personIndex === -1) {
            console.log('Person not found in chart:', personId);
            return;
        }

        // Update the person data
        const updatedPerson = convertPersonToChartFormat(updatedData);
        chartData[personIndex] = updatedPerson;

        // Update the chart display
        await updateChartData([updatedPerson]);

        console.log('Person updated in chart successfully:', personId);

    } catch (error) {
        console.error('Error updating person in chart:', error);
        throw error;
    }
}
/**
 * Get all people in the chart
 * @returns {Array} Array of all people in the chart
 */
export function getAllPeopleInChart() {
    return [...chartData];
}

/**
 * Get chart statistics
 * @returns {Object} Chart statistics
 */
export function getChartStats() {
    return {
        totalPeople: chartData.length,
        males: chartData.filter(p => p.data.gender === 'M').length,
        females: chartData.filter(p => p.data.gender === 'F').length,
        unknown: chartData.filter(p => p.data.gender === 'U').length,
        withImages: chartData.filter(p => p.data.hasUploadedImage).length
    };
}

/**
 * Initialize the family chart
 * @param {Array} data - Chart data
 * @param {Object} options - Chart options
 * @returns {Promise<void>}
 */
export async function initializeChart(data, options = {}) {
    const { onNodeSelect } = options;

    // Ensure f3 is available
    if (typeof window.f3 === 'undefined') {
        console.error('f3 library not found. Make sure family-chart.js is loaded.');
        throw new Error('f3 library not found');
    }

    console.log('Initializing chart with data:', data.length, 'items');

    try {
        // Get chart container
        const chartContainer = document.getElementById('FamilyChart');
        if (!chartContainer) {
            throw new Error('Chart container not found');
        }

        // Clear any existing chart
        chartContainer.innerHTML = '';

        // If no data provided, display empty state message
        if (!data || data.length === 0) {
            const emptyStateEl = document.createElement('div');
            emptyStateEl.className = 'empty-chart-message';
            emptyStateEl.innerHTML = `
                <div class="empty-chart-content">
                    <h2>Family Tree is Empty</h2>
                    <p>Use the search function to find and add people to your family tree.</p>
                    <div class="empty-chart-icon">👪</div>
                </div>
            `;

            chartContainer.appendChild(emptyStateEl);
            return null; // Return early, no chart to create
        }

        // Create new chart instance
        f3Chart = window.f3.createChart('#FamilyChart', data)
            .setTransitionTime(1000)
            .setCardXSpacing(250)
            .setCardYSpacing(150)
            .setOrientationVertical()
            .setSingleParentEmptyCard(false);

        // Set up card
        f3Card = f3Chart.setCard(window.f3.CardHtml)
            .setCardDisplay([["first name", "last name"], ["birthday"]])
            .setCardDim({})
            .setMiniTree(true)
            .setStyle('imageRect')
            .setOnHoverPathToMain();

        // Set up edit tree
        // Get the edit-form-content container for the edit form
        const editFormContent = document.getElementById('edit-form-content');
        console.log("editFormContent ", editFormContent);

        if (!editFormContent) {
            console.error('Edit form content element not found');
        }

        // Initialize the edit tree with the correct container
        f3EditTree = f3Chart.editTree();

        // Configure the edit tree to use our specific container
        f3EditTree.cont = editFormContent;

        // Set up the fields we want to edit
        f3EditTree.setFields([
            "first name",
            "last name",
            "birthday",
            "avatar",
            "gender",
            "location",
            "work"
        ])
            .fixed(true)  // Keep the form fixed in position
            .setEditFirst(true)  // Start in edit mode
            .setOnChange(async () => {
                try {
                    // Check if user is authenticated
                    if (!isUserAuthenticated()) {
                        showNotification("Authentication required to save changes", "error");
                        throw new Error("Authentication required");
                    }

                    // Use the currentEditPerson variable since the onChange callback doesn't pass datum
                    if (!currentEditPerson) {
                        console.error("Form change handler: No current edit person found");
                        throw new Error("No person data available for update");
                    }

                    console.log("Form submitted for:", currentEditPerson.id);

                    // Use the shared form submission handler
                    await handleFormSubmission(currentEditPerson);

                } catch (error) {
                    console.error('Error updating person data:', error);

                    // Show error message in the edit form content
                    const editFormContent = document.getElementById('edit-form-content');
                    if (editFormContent) {
                        const errorMsg = document.createElement('div');
                        errorMsg.className = 'form-status-message error';
                        errorMsg.textContent = `Error saving changes: ${error.message}`;
                        editFormContent.appendChild(errorMsg);

                        // Remove the error message after a delay
                        setTimeout(() => {
                            if (errorMsg.parentNode) {
                                errorMsg.parentNode.removeChild(errorMsg);
                            }
                        }, 5000);
                    }
                }
            });

        // Initialize the edit tree component
        f3EditTree.init();

        // Set up editing mode
        f3EditTree.setEdit();

        // Set up card click handler
        f3Card.setOnCardClick((e, d) => {
            console.log('Card clicked - ID:', d.data.id);

            // Check if this is a new relative card
            if (d.data._new_rel_data) {
                // Check authentication before allowing to add relative
                if (!isUserAuthenticated()) {
                    showAuthRequiredForFeature('add relatives');
                    return;
                }

                // This is a new relative card, handle it with our custom implementation
                const mainNode = f3Chart.getMainDatum();
                handleNewRelativeClick(d.data, mainNode);
                return; // Prevent default handling
            }

            // Prevent default click behavior if adding relative
            if (f3EditTree.isAddingRelative() || isCurrentlyAddingRelative()) return;

            // Notify caller of node selection
            if (onNodeSelect) {
                onNodeSelect(d.data);
            }

            // Default behavior (change main node)
            f3Card.onCardClickDefault(e, d);
        });


        // Update tree initially
        f3Chart.updateTree({ initial: true });

        console.log('Chart initialization complete');
        return f3Chart;
    } catch (error) {
        console.error('Error initializing chart:', error);
        throw error;
    }
}

/**
 * Show authentication required message for chart features
 * @param {string} feature - The feature requiring authentication
 */
function showAuthRequiredForFeature(feature) {
    showNotification(`You need to log in to ${feature}`, 'error');

    // Optionally show login form after a delay
    setTimeout(() => {
        if (confirm(`Would you like to log in to ${feature}?`)) {
            showLoginForm();
        }
    }, 1000);
}

/**
 * Update chart data with new network data
 * @param {Array} networkData - New network data to merge
 * @returns {Promise<void>}
 */
export async function updateChartData(networkData) {
    if (!f3Chart) {
        console.error('Chart not initialized');
        return;
    }

    try {
        console.log("Chart.js: Updating chart data with new network data:", networkData.length, "items");

        // Get the latest chart data from the app
        const currentChartData = appChartData.slice();

        // Merge network data with existing data
        const mergedData = mergeNetworkData(currentChartData, networkData);

        // Update the central store in app.js
        updateChartDataStore(mergedData);
        console.log("Logging from chart.js line 329")
        console.dir(chartData)
        // Update chart
        f3Chart.updateData(mergedData);
        f3Chart.updateTree();

        console.log('Chart data updated successfully');
    } catch (error) {
        console.error('Error updating chart data:', error);
        throw error;
    }
}

/**
 * Open edit tree for a specific person
 * @param {Object} person - The person data to edit
 */
export function openEditTree(person) {
    console.log("Chart.js openEditTree ", person);

    // Check if user is authenticated before opening edit form
    if (!isUserAuthenticated()) {
        showAuthRequiredForFeature('edit family members');

        // Close the edit form if it's open
        const editForm = document.getElementById('edit-form');
        if (editForm && editForm.classList.contains('visible')) {
            editForm.classList.remove('visible');
        }

        return;
    }

    if (!f3Chart) {
        console.error('Chart not initialized');
        return;
    }

    try {
        // Get the edit form content div
        const editFormContent = document.getElementById('edit-form-content');
        if (!editFormContent) {
            console.error('Edit form content element not found');
            return;
        }

        // Clear any previous edit tree instance
        if (f3EditTree) {
            // Try to clean up the old instance
            try {
                f3EditTree.destroy();
                console.log('Previous edit tree instance destroyed');
            } catch (err) {
                console.log('No destroy method available or error:', err);
            }
        }

        // Reinitialize the edit tree
        f3EditTree = f3Chart.editTree();

        // Configure the edit tree to use our specific container
        f3EditTree.cont = editFormContent;

        // Set up the fields we want to edit
        f3EditTree.setFields([
            "first name",
            "last name",
            "birthday",
            "avatar",
            "gender",
            "location",
            "work"
        ])
            .fixed(true)  // Keep the form fixed in position
            .setEditFirst(true)  // Start in edit mode
            .setOnChange(async () => {
                try {
                    // Check if user is authenticated
                    if (!isUserAuthenticated()) {
                        showNotification("Authentication required to save changes", "error");
                        throw new Error("Authentication required");
                    }

                    // Use the currentEditPerson variable since the onChange callback doesn't pass datum
                    if (!currentEditPerson) {
                        console.error("Form change handler: No current edit person found");
                        throw new Error("No person data available for update");
                    }

                    console.log("Form submitted for:", currentEditPerson.id);

                    // Use the shared form submission handler
                    await handleFormSubmission(currentEditPerson);

                } catch (error) {
                    console.error('Error updating person data:', error);

                    // Show error message
                    const editFormContent = document.getElementById('edit-form-content');
                    if (editFormContent) {
                        const errorMsg = document.createElement('div');
                        errorMsg.className = 'form-status-message error';
                        errorMsg.textContent = `Error saving changes: ${error.message}`;
                        editFormContent.appendChild(errorMsg);

                        // Remove the error message after a delay
                        setTimeout(() => {
                            if (errorMsg.parentNode) {
                                errorMsg.parentNode.removeChild(errorMsg);
                            }
                        }, 5000);
                    }
                }
            });

        // Initialize the edit tree component
        f3EditTree.init();

        // Set up editing mode
        f3EditTree.setEdit();

        // Store the person being edited
        currentEditPerson = person;
        console.log('Editing person:', currentEditPerson.id);

        // Open edit form for this person
        f3EditTree.open({ data: person });
        console.log('Edit tree opened for person:', person.id);
    } catch (error) {
        console.error('Error opening edit tree:', error);
        currentEditPerson = null; // Reset on error
    }
}

/**
 * Clear current edit person reference
 */
export function clearCurrentEditPerson() {
    currentEditPerson = null;
    console.log('Cleared current edit person reference');
}

/**
 * Get the chart instance
 * @returns {Object} The chart instance
 */
export function getChartInstance() {
    return {
        chart: f3Chart,
        card: f3Card,
        editTree: f3EditTree,
        onEnterPathToMain: f3Card?.onEnterPathToMain.bind(f3Card),
        onLeavePathToMain: f3Card?.onLeavePathToMain.bind(f3Card)
    };
}

/**
 * Reset the chart
 */
export function resetChart() {
    f3Chart = null;
    f3Card = null;
    f3EditTree = null;
    currentEditPerson = null;
}