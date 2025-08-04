// Functions for handling relative addition
import { createNewPerson, updatePersonData } from './api.js';
import { updateChartData } from './chart.js';
import { chartData, updateChartDataStore } from './app.js';

// Store references to the current operation
let currentNewRelativeData = null;
let currentOriginalPerson = null;
let isAddingRelative = false;

/**
 * Initialize relative addition functionality
 * @param {Object} options - Configuration options
 */
export function initAddRelative(options = {}) {
    // Setup any initial configuration
    console.log('Add relative functionality initialized');
}

/**
 * Handle when a new relative card is clicked
 * @param {Object} newRelativeData - The new relative placeholder data
 * @param {Object} originalPerson - The original person being edited
 */
export function handleNewRelativeClick(newRelativeData, originalPerson) {
    console.log('Add relative clicked:', newRelativeData);

    // Store references for later use
    currentNewRelativeData = newRelativeData;
    currentOriginalPerson = originalPerson;
    isAddingRelative = true;

    // The relationship data is already established by the library
    // We just need to use it when creating the new person

    // Get the relationship type
    const relType = newRelativeData._new_rel_data.rel_type;
    console.log("OriginalPerson :", originalPerson)
    console.log("newRelativeData._new_rel_data :", newRelativeData._new_rel_data)


    // Create form data with pre-populated values
    const formData = createPrePopulatedData(relType, originalPerson);
    console.log("formData :", formData)


    // Open the edit form with this data
    openEditFormForNewRelative(formData, relType);
}

/**
 * Create pre-populated data based on relationship type
 * @param {string} relType - The relationship type (father, mother, spouse, son, daughter)
 * @param {Object} originalPerson - The original person being edited
 * @returns {Object} Pre-populated form data
 */
function createPrePopulatedData(relType, originalPerson) {
    // Default avatar
    const defaultAvatar = "https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg";

    // Determine default gender based on relationship type
    const gender = (relType === 'father' || relType === 'son') ? 'M' :
        (relType === 'mother' || relType === 'daughter') ? 'F' : '';

    // Create the pre-populated data
    return {
        data: {
            "first name": "",
            "last name": originalPerson.data["last name"] || "", // Default to same last name
            "gender": gender,
            "avatar": defaultAvatar,
            "location": "",
            "birthday": null,
            "work": "",
            "contact": {
                "email": "",
                "phone": ""
            },
            "nativePlace": ""
        },
        rels: createRelationshipsData(relType, originalPerson)
    };
}

/**
 * Create relationship data based on relationship type
 * @param {string} relType - The relationship type 
 * @param {Object} originalPerson - The original person
 * @returns {Object} Relationship data
 */
function createRelationshipsData(relType, originalPerson) {
    console.log("AddRelative createRelationshipsData ", originalPerson)
    const rels = {};

    switch (relType) {
        case 'father':
            rels.children = [originalPerson.id];
            break;
        case 'mother':
            rels.children = [originalPerson.id];
            break;
        case 'spouse':
            rels.spouses = [originalPerson.id];
            break;
        case 'son':
        case 'daughter':
            // Set parent based on original person's gender
            if (originalPerson.data.gender === 'M') {
                rels.father = originalPerson.id;
                console.log("addRelative.js createRelationshipsData Added Father: ", originalPerson.id)
            } else {
                rels.mother = originalPerson.id;
                console.log("addRelative.js createRelationshipsData Added Father: ", originalPerson.id)
            }
            break;
    }

    return rels;
}

/**
 * Open the edit form configured for adding a new relative
 * @param {Object} formData - Pre-populated form data
 * @param {string} relType - The relationship type
 */
function openEditFormForNewRelative(formData, relType) {
    // Get elements
    const editForm = document.getElementById('edit-form');
    const editFormTitle = document.getElementById('edit-form-title');
    const editFormContent = document.getElementById('edit-form-content');

    if (!editForm || !editFormTitle || !editFormContent) {
        console.error('Edit form elements not found');
        return;
    }

    // Format relationship type for display
    const formattedRelType = capitalizeFirst(relType);

    // Clear previous content
    editFormContent.innerHTML = '';

    // Update title
    editFormTitle.textContent = `Add New ${formattedRelType}`;

    // Show the form
    editForm.classList.add('visible');

    // Create a custom form for adding a relative
    createAddRelativeForm(editFormContent, formData, relType);
}

/**
 * Create a custom form for adding a relative
 * @param {HTMLElement} container - The container element
 * @param {Object} formData - Pre-populated form data
 * @param {string} relType - The relationship type
 */
function createAddRelativeForm(container, formData, relType) {
    // Create form element
    const form = document.createElement('form');
    form.id = 'add-relative-form';
    form.className = 'f3-form';
    form.dataset.relType = relType;

    // Add form fields
    const formHtml = `
        <div class="f3-radio-group">
            <label>
                <input type="radio" name="gender" value="M" ${formData.data.gender === 'M' ? 'checked' : ''}>
                Male
            </label>
            <label>
                <input type="radio" name="gender" value="F" ${formData.data.gender === 'F' ? 'checked' : ''}>
                Female
            </label>
        </div>
        
        <div class="f3-form-field">
            <label>First Name</label>
            <input type="text" name="first-name" value="${formData.data["first name"]}" placeholder="First Name" required>
        </div>
        
        <div class="f3-form-field">
            <label>Last Name</label>
            <input type="text" name="last-name" value="${formData.data["last name"]}" placeholder="Last Name" required>
        </div>
        
        <div class="f3-form-field">
            <label>Birthday</label>
            <input type="text" name="birthday" value="${formData.data.birthday || ''}" placeholder="Birthday">
        </div>
        
        <div class="f3-form-field">
            <label>Avatar URL</label>
            <input type="text" name="avatar" value="${formData.data.avatar}" placeholder="Avatar URL">
        </div>
        
        <div class="f3-form-field">
            <label>Location</label>
            <input type="text" name="location" value="${formData.data.location || ''}" placeholder="Location">
        </div>
        
        <div class="f3-form-field">
            <label>Work</label>
            <input type="text" name="work" value="${formData.data.work || ''}" placeholder="Work">
        </div>
        
        <div class="f3-form-buttons">
            <button type="button" class="f3-cancel-btn">Cancel</button>
            <button type="submit" class="create-button">Create ${capitalizeFirst(relType)}</button>
        </div>
    `;

    form.innerHTML = formHtml;

    // Add event listeners
    form.addEventListener('submit', handleAddRelativeSubmit);

    const cancelBtn = form.querySelector('.f3-cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            // Find and click the existing close button
            const closeBtn = document.getElementById('close-edit-form');
            if (closeBtn) closeBtn.click();
        });
    }

    // Add the form to the container
    container.appendChild(form);
}


/**
 * Handle submission of the add relative form
 * @param {Event} e - The submit event
 */
async function handleAddRelativeSubmit(e) {
    e.preventDefault();
    console.log("Add Relatives.js handleAddRelativeSubmit")

    try {
        // Get the form and relationship type
        const form = e.target;
        const relType = form.dataset.relType;

        if (!currentOriginalPerson || !currentNewRelativeData) {
            throw new Error('Missing reference to original person data');
        }

        // Show loading indicator
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';
        }

        // Get form values
        const formData = {
            "first name": form.querySelector('input[name="first-name"]').value,
            "last name": form.querySelector('input[name="last-name"]').value,
            "gender": form.querySelector('input[name="gender"]:checked').value,
            "birthday": form.querySelector('input[name="birthday"]').value || null,
            "avatar": form.querySelector('input[name="avatar"]').value,
            "location": form.querySelector('input[name="location"]').value || "",
            "work": form.querySelector('input[name="work"]').value || "",
            "contact": {
                "email": "",
                "phone": ""
            },
            "nativePlace": ""
        };

        // Important: Use the relationship data that's already in the new relative placeholder
        // This already includes the correct parental relationships from the context
        const rels = currentNewRelativeData.rels || {};
        console.log("Form Data")
        console.dir(formData)
        // Create the new person object
        const newPersonData = {
            personname: `${formData["first name"]} ${formData["last name"]}`,
            birthdate: formData.birthday,
            gender: formData.gender,
            currentlocation: formData.location,
            // Use the relationship data from the placeholder
            fatherid: rels.father || null,
            motherid: rels.mother || null,
            spouseid: rels.spouses && rels.spouses.length > 0 ? rels.spouses[0] : null,
            worksat: formData.work,
            nativeplace: formData.nativePlace,
            phone: null,
            mail_id: null,
            living: "Y",
            data: formData,
            rels: rels
        };

        // Call API to create new person
        const response = await createNewPerson(newPersonData);

        // Extract the permanent ID from the API response
        const permanentId = response.id;

        console.log('New person created with permanent ID:', permanentId);

        // Create a complete person object with the permanent ID
        const newPerson = {
            id: permanentId,
            data: formData,
            rels: rels // Keep the relationship data from the placeholder
        };

        // IMPORTANT FIX: Update the original person with the permanent ID of the new relative
        // depending on the relationship type
        await updateOriginalPersonWithPermanentId(currentOriginalPerson.id, permanentId, relType);
        console.log("After Calling updateOriginalPersonWithPermanentId", currentOriginalPerson.id)
        // Now update the relationships of all connected people (parents, spouse, etc.)
        // This was moved after updating the original person to ensure correct order
        await updateConnectedPeopleRelationships(permanentId, rels);
        console.log("After Calling updateConnectedPeopleRelationships", rels)
        // Update chart data with the permanent ID
        console.log("New Person is ")
        console.dir(newPerson)
        await updateChartWithNewRelative(newPerson);
        console.log("After Calling updateChartWithNewRelative", newPerson)
        // Show success message
        showSuccessMessage(form.parentNode, newPerson, relType);

        // Reset state
        isAddingRelative = false;

    } catch (error) {
        console.error('Error adding relative:', error);

        // Show error message
        const errorMsg = document.createElement('div');
        errorMsg.className = 'form-status-message error';
        errorMsg.textContent = `Error creating relative: ${error.message}`;
        e.target.parentNode.appendChild(errorMsg);

        // Remove error message after 5 seconds
        setTimeout(() => {
            if (errorMsg.parentNode) {
                errorMsg.parentNode.removeChild(errorMsg);
            }
        }, 5000);

        // Re-enable submit button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = `Create ${capitalizeFirst(e.target.dataset.relType)}`;
        }
    }
}

/**
 * New function to specifically update the original person with the permanent ID
 * @param {string} originalPersonId - ID of the original person
 * @param {string} permanentId - Permanent ID of the new relative
 * @param {string} relType - Relationship type
 */
async function updateOriginalPersonWithPermanentId(originalPersonId, permanentId, relType) {
    try {
        // Get the original person from chartData
        const originalPerson = chartData.find(p => p.id === originalPersonId);

        if (!originalPerson) {
            throw new Error(`Original person with ID ${originalPersonId} not found`);
        }

        // Clone to avoid direct mutation
        const updatedPerson = JSON.parse(JSON.stringify(originalPerson));

        // Update the specific relationship based on type
        switch (relType) {
            case 'father':
                updatedPerson.rels.father = permanentId;
                break;
            case 'mother':
                updatedPerson.rels.mother = permanentId;
                break;
            case 'spouse':
                if (!updatedPerson.rels.spouses) updatedPerson.rels.spouses = [];
                // Remove any old references to the temporary ID if present
                updatedPerson.rels.spouses = updatedPerson.rels.spouses.filter(id =>
                    id !== currentNewRelativeData.id // Remove temporary ID
                );
                // Add the permanent ID
                if (!updatedPerson.rels.spouses.includes(permanentId)) {
                    updatedPerson.rels.spouses.push(permanentId);
                }
                break;
            case 'son':
            case 'daughter':
                if (!updatedPerson.rels.children) updatedPerson.rels.children = [];
                // Remove any old references to the temporary ID if present
                updatedPerson.rels.children = updatedPerson.rels.children.filter(id =>
                    id !== currentNewRelativeData.id // Remove temporary ID
                );
                // Add the permanent ID
                if (!updatedPerson.rels.children.includes(permanentId)) {
                    updatedPerson.rels.children.push(permanentId);
                }
                break;
        }

        console.log(`Updating original person ${originalPersonId} with new ${relType} ID: ${permanentId}`);

        // Update the person in the backend
        const result = await updatePersonData(originalPersonId, updatedPerson);

        // Update local chart data
        const existingIndex = chartData.findIndex(p => p.id === originalPersonId);
        if (existingIndex >= 0) {
            chartData[existingIndex] = result || updatedPerson;
        }

        return result;
    } catch (error) {
        console.error(`Error updating original person with permanent ID:`, error);
        throw error;
    }
}



/**
 * Update relationships of connected people
 * @param {string} newPersonId - New person ID
 * @param {Object} relationships - Relationship data from placeholder
 */

async function updateConnectedPeopleRelationships(newPersonId, relationships) {
    console.log("Updating connected people relationships for new person:", newPersonId);
    console.log("Relationship data:", relationships);

    const updatePromises = [];

    // Update father if this new person is someone's child
    if (relationships.father) {
        const father = chartData.find(p => p.id === relationships.father);
        if (father) {
            console.log(`Updating father ${father.id} to add child ${newPersonId}`);
            const fatherUpdate = updatePersonRelationship(
                father,
                'children',
                newPersonId
            );
            updatePromises.push(fatherUpdate);
        }
    }

    // Update mother if this new person is someone's child
    if (relationships.mother) {
        const mother = chartData.find(p => p.id === relationships.mother);
        if (mother) {
            console.log(`Updating mother ${mother.id} to add child ${newPersonId}`);
            const motherUpdate = updatePersonRelationship(
                mother,
                'children',
                newPersonId
            );
            updatePromises.push(motherUpdate);
        }
    }

    // Update spouses if this new person is someone's spouse
    if (relationships.spouses && relationships.spouses.length > 0) {
        for (const spouseId of relationships.spouses) {
            const spouse = chartData.find(p => p.id === spouseId);
            if (spouse) {
                console.log(`Updating spouse ${spouse.id} to add spouse ${newPersonId}`);
                const spouseUpdate = updatePersonRelationship(
                    spouse,
                    'spouses',
                    newPersonId
                );
                updatePromises.push(spouseUpdate);
            }
        }
    }

    // Update children if this new person is a parent
    if (relationships.children && relationships.children.length > 0) {
        // FIX: Get the gender from the right location
        // First look for the gender in the formData that was used to create the person
        const newPerson = chartData.find(p => p.id === newPersonId);
        let gender;

        if (newPerson && newPerson.data && newPerson.data.gender) {
            // Get gender from the chart data
            gender = newPerson.data.gender;
        } else if (currentNewRelativeData && currentNewRelativeData.data && currentNewRelativeData.data.gender) {
            // Or get it from the current form data if available
            gender = currentNewRelativeData.data.gender;
        } else {
            // Default to male if we can't determine gender (you might want a different default)
            console.warn("Could not determine gender, defaulting to male");
            gender = 'M';
        }

        for (const childId of relationships.children) {
            const child = chartData.find(p => p.id === childId);
            if (child) {
                const relType = gender === 'M' ? 'father' : 'mother';
                console.log(`Updating child ${child.id} to set ${relType} to ${newPersonId}`);
                const childUpdate = updatePersonRelationship(
                    child,
                    relType,
                    newPersonId,
                    true // isSingleValue
                );
                updatePromises.push(childUpdate);
            }
        }
    }

    // Wait for all updates to complete
    const results = await Promise.allSettled(updatePromises);

    // Log any errors
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(`Failed to update relationship #${index}:`, result.reason);
        }
    });

    return results;
}

/**
 * Update the original person's relationships
 * @param {Object} originalPerson - The original person
 * @param {Object} newPerson - The newly created person
 * @param {string} relType - The relationship type
 * @returns {Promise<Object>} The updated original person
 */
async function updateOriginalPersonRelationships(originalPerson, newPerson, relType) {
    console.log(" updateOriginalPersonRelationships originalPerson", originalPerson)
    console.log(" newPerson", newPerson)
    console.log(" relType", relType)
    // Clone the original person to avoid direct mutation
    const updatedPerson = JSON.parse(JSON.stringify(originalPerson));

    // Update relationships based on type
    switch (relType) {
        case 'father':
            updatedPerson.rels.father = newPerson.id;
            break;
        case 'mother':
            updatedPerson.rels.mother = newPerson.id;
            break;
        case 'spouse':
            if (!updatedPerson.rels.spouses) updatedPerson.rels.spouses = [];
            if (!updatedPerson.rels.spouses.includes(newPerson.id)) {
                updatedPerson.rels.spouses.push(newPerson.id);
            }
            break;
        case 'son':
        case 'daughter':
            if (!updatedPerson.rels.children) updatedPerson.rels.children = [];
            if (!updatedPerson.rels.children.includes(newPerson.id)) {
                console.log("Commented this ")
                updatedPerson.rels.children.push(newPerson.id);
            }
            break;
    }

    // Update the original person in the backend
    return updatePersonData(originalPerson.id, updatedPerson);
}


/**
 * Update the original person's relationships with the permanent ID
 * @param {Object} originalPerson - The original person
 * @param {string|number} permanentId - The permanent ID returned from the API
 * @param {string} relType - The relationship type
 * @returns {Promise<Object>} The updated original person
 */
async function updateOriginalPersonRelationshipsWithPermanentId(originalPerson, permanentId, relType) {
    // Clone the original person to avoid direct mutation
    const updatedPerson = JSON.parse(JSON.stringify(originalPerson));

    // Convert permanentId to string to ensure consistent comparison
    const permanentIdStr = String(permanentId);

    // Update relationships based on type
    switch (relType) {
        case 'father':
            updatedPerson.rels.father = permanentIdStr;
            break;
        case 'mother':
            updatedPerson.rels.mother = permanentIdStr;
            break;
        case 'spouse':
            if (!updatedPerson.rels.spouses) updatedPerson.rels.spouses = [];

            // Remove any temporary IDs that might have been added
            updatedPerson.rels.spouses = updatedPerson.rels.spouses.filter(id =>
                id !== currentNewRelativeData.id // Filter out the temporary ID
            );

            // Add the permanent ID if not already present
            if (!updatedPerson.rels.spouses.includes(permanentIdStr)) {
                updatedPerson.rels.spouses.push(permanentIdStr);
            }
            break;
        case 'son':
        case 'daughter':
            if (!updatedPerson.rels.children) updatedPerson.rels.children = [];

            // Remove any temporary IDs that might have been added
            updatedPerson.rels.children = updatedPerson.rels.children.filter(id =>
                id !== currentNewRelativeData.id // Filter out the temporary ID
            );

            // Add the permanent ID if not already present
            if (!updatedPerson.rels.children.includes(permanentIdStr)) {
                updatedPerson.rels.children.push(permanentIdStr);
            }
            break;
    }

    console.log('Updating original person relationships with permanent ID:', permanentIdStr);
    console.log('Updated rels:', updatedPerson.rels);

    // Update the original person in the backend
    return updatePersonData(originalPerson.id, updatedPerson);
}


/**
 * Update chart with new relative data
 * @param {Object} newPerson - The newly created person
 * @returns {Promise<void>}
 */

async function updateChartWithNewRelative(newPerson) {
    try {
        console.log('Updating chart with new relative:', newPerson);

        // Ensure gender is properly set in the data structure as expected by the chart library
        if (!newPerson.data.gender && newPerson.data["gender"]) {
            // Copy gender to the expected property location if it's in a different place
            newPerson.data.gender = newPerson.data["gender"];
        }

        // Ensure all required data fields exist
        if (!newPerson.data) newPerson.data = {};
        if (!newPerson.rels) newPerson.rels = {};

        // Make sure gender has a default value if not set
        if (!newPerson.data.gender) {
            console.warn('Gender not found for new person, defaulting to Male');
            newPerson.data.gender = 'M';
        }

        // Validate required fields for chart library
        const requiredFields = ['first name', 'last name', 'gender', 'avatar'];
        requiredFields.forEach(field => {
            if (!newPerson.data[field] && field !== 'avatar') {
                console.warn(`Missing required field: ${field}, setting default`);
                newPerson.data[field] = field === 'gender' ? 'M' : '';
            }
        });

        // Add default avatar if not provided
        if (!newPerson.data.avatar) {
            newPerson.data.avatar = "https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg";
        }

        // Add the new person to the local chart data
        const existingIndex = chartData.findIndex(p => p.id === newPerson.id);
        if (existingIndex >= 0) {
            // Update existing person
            chartData[existingIndex] = newPerson;
        } else {
            // Add new person
            chartData.push(newPerson);
        }

        console.log('Person added to chartData, updating chart display');

        // Check the actual structure before updating the chart
        console.log('New person data structure:', JSON.stringify(newPerson));

        // Update the chart
        await updateChartData([newPerson]);

        return true;
    } catch (error) {
        console.error('Error updating chart with new relative:', error);
        throw error;
    }
}



/**
 * Update a specific relationship for a person
 * @param {Object} person - Person to update
 * @param {string} relType - Relationship type
 * @param {string} newPersonId - New person ID
 * @param {boolean} isSingleValue - Whether this is a single value (not array)
 */

async function updatePersonRelationship(person, relType, newPersonId, isSingleValue = false) {
    try {
        // Convert all IDs to strings for consistency
        newPersonId = String(newPersonId);

        // Clone the person to avoid mutations
        const updatedPerson = JSON.parse(JSON.stringify(person));

        if (isSingleValue) {
            // For single-value relationships (father, mother)
            updatedPerson.rels[relType] = newPersonId;
        } else {
            // For array relationships (children, spouses)
            if (!updatedPerson.rels[relType]) {
                updatedPerson.rels[relType] = [];
            }

            // Ensure all IDs are strings
            updatedPerson.rels[relType] = updatedPerson.rels[relType].map(id => String(id));

            if (!updatedPerson.rels[relType].includes(newPersonId)) {
                updatedPerson.rels[relType].push(newPersonId);
            }
        }

        // Update person in the backend
        const result = await updatePersonData(person.id, updatedPerson);

        // Update local chart data
        const existingIndex = chartData.findIndex(p => p.id === person.id);
        if (existingIndex >= 0) {
            chartData[existingIndex] = result || updatedPerson;
        }

        console.log(`Successfully updated ${relType} relationship for person ${person.id} with ${newPersonId}`);
        return result;
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

/**
 * Show success message after adding a relative
 * @param {HTMLElement} container - The container element
 * @param {Object} newPerson - The newly created person
 * @param {string} relType - The relationship type
 */
function showSuccessMessage(container, newPerson, relType) {
    // Clear the form
    container.innerHTML = '';

    // Create success summary
    const successSummary = document.createElement('div');
    successSummary.className = 'update-success-summary';

    // Format the data for display
    const firstName = newPerson.data["first name"] || '';
    const lastName = newPerson.data["last name"] || '';
    const location = newPerson.data.location || 'Not specified';
    const gender = newPerson.data.gender === 'M' ? 'Male' :
        newPerson.data.gender === 'F' ? 'Female' : 'Not specified';

    successSummary.innerHTML = `
        <h3>Added New ${capitalizeFirst(relType)}</h3>
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
        ${newPerson.data.birthday ? `
            <div class="summary-item">
                <span class="summary-label">Birthday:</span>
                <span class="summary-value">${newPerson.data.birthday}</span>
            </div>
        ` : ''}
    `;

    // Add a close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-edit-form-btn';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => {
        // Find and click the existing close button
        const existingCloseBtn = document.getElementById('close-edit-form');
        if (existingCloseBtn) {
            existingCloseBtn.click();
        }
    });

    successSummary.appendChild(closeBtn);

    // Add to the container
    container.appendChild(successSummary);
}

/**
 * Helper function to capitalize first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} The capitalized string
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Check if we're currently adding a relative
 * @returns {boolean} True if adding a relative
 */
export function isCurrentlyAddingRelative() {
    return isAddingRelative;
}

/**
 * Reset the add relative state
 */
export function resetAddRelativeState() {
    currentNewRelativeData = null;
    currentOriginalPerson = null;
    isAddingRelative = false;
}