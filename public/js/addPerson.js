// addPerson.js - Complete implementation with deferred image upload

import { createNewPerson, updatePersonData } from './api.js';
import { updateChartData } from './chart.js';
import { searchByName } from './api.js';
import { chartData } from './app.js';
import { isUserAuthenticated, showLoginForm } from './auth.js';
import { ImageUpload } from './imageUpload.js';
import { ImageUtils } from './imageUtils.js';

// Global state for selected relatives
let selectedRelatives = {
    father: null,
    mother: null,
    spouse: null,
    children: []
};
let personImageUpload = null;

/**
 * Show the add person form
 */
function showAddPersonForm() {
    // Check if user is authenticated
    if (!isUserAuthenticated()) {
        showAuthRequired('add new family members');
        return;
    }

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    document.body.appendChild(backdrop);

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'add-person-modal';

    // Create form content with both basic info and relationships sections
    modal.innerHTML = createModalContent();

    document.body.appendChild(modal);

    // Add event listeners
    setupFormEventListeners(modal);

    // Initialize image upload with deferred mode
    setTimeout(() => {
        initializeImageUploadForModal(modal);
    }, 100);

    // Add animation
    setTimeout(() => {
        backdrop.classList.add('visible');
        modal.classList.add('visible');
    }, 10);
}

/**
 * Initialize image upload for modal with deferred upload
 */
function initializeImageUploadForModal(modal) {
    console.log('Initializing image upload for modal...');

    // Set up the image tab click handler
    const imageTabBtn = modal.querySelector('.tab-btn[data-tab="image"]');
    if (imageTabBtn) {
        imageTabBtn.addEventListener('click', (e) => {
            // Deactivate all tabs
            modal.querySelectorAll('.tab-btn').forEach(tb => tb.classList.remove('active'));
            // Hide all tab panes  
            modal.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            // Activate clicked tab
            e.target.classList.add('active');
            // Show image tab pane
            const imageTabPane = modal.querySelector('#image-tab');
            if (imageTabPane) {
                imageTabPane.classList.add('active');
            }
        });
    }

    // Initialize the image upload component with deferred upload enabled
    setTimeout(() => {
        const container = document.getElementById('person-image-upload-container');
        if (container) {
            personImageUpload = new ImageUpload('person-image-upload-container', {
                maxSize: 10 * 1024 * 1024,
                previewSize: 120,
                deferUpload: true, // Enable deferred upload mode
                onFileSelect: handleImageFileSelect,
                onReady: handleImageReady,
                onUploadSuccess: handleImageUploadSuccess,
                onUploadError: handleImageUploadError,
                onRemove: handleImageRemove
            });
        }
    }, 200);
}

/**
 * Handle image file selection
 */
function handleImageFileSelect(file) {
    console.log('Image file selected:', file.name);

    // Show visual feedback that image is ready
    updateFormValidationState();
}

/**
 * Handle image ready state (file selected and validated)
 */
function handleImageReady(file) {
    console.log('Image ready for upload:', file.name);

    // Update UI to show image is ready
    showNotification('Image ready! It will be uploaded after creating the person.', 'info');

    // Update form validation state
    updateFormValidationState();
}

/**
 * Handle successful image upload
 */
function handleImageUploadSuccess(imageData) {
    console.log('Image uploaded successfully:', imageData);

    // Show success notification
    showNotification('Image uploaded successfully!', 'success');
}

/**
 * Handle image upload error
 */
function handleImageUploadError(error) {
    console.error('Image upload failed:', error);

    // Show error notification
    showNotification(`Image upload failed: ${error.message}`, 'error');
}

/**
 * Handle image removal
 */
function handleImageRemove() {
    console.log('Image removed');

    // Update form validation state
    updateFormValidationState();
}

/**
 * Update form validation state based on image upload
 */
function updateFormValidationState() {
    const submitBtn = document.querySelector('#add-person-form .submit-btn');
    if (submitBtn) {
        // Enable submit button (image is optional)
        submitBtn.disabled = false;

        // Update button text if image is ready
        if (personImageUpload && personImageUpload.isReady()) {
            submitBtn.textContent = 'Create Person with Image';
        } else {
            submitBtn.textContent = 'Create Person';
        }
    }
}

/**
 * Create the modal content HTML
 */
function createModalContent() {
    return `
        <div class="add-person-header">
            <h2>Add New Person</h2>
            <button class="close-modal-btn">&times;</button>
        </div>
        
        <form id="add-person-form" class="add-person-form">
            <div class="form-tabs">
                <button type="button" class="tab-btn active" data-tab="basic-info">Basic Information</button>
                <button type="button" class="tab-btn" data-tab="image">Image</button>
                <button type="button" class="tab-btn" data-tab="relationships">Relationships</button>
            </div>
            
            <div class="tab-content">
                <!-- Basic Information Tab -->
                <div class="tab-pane active" id="basic-info-tab">
                    <div class="form-field">
                        <label>First Name <span class="required">*</span></label>
                        <input type="text" name="first-name" required>
                    </div>
                    
                    <div class="form-field">
                        <label>Last Name <span class="required">*</span></label>
                        <input type="text" name="last-name" required>
                    </div>
                    
                    <div class="form-field">
                        <label>Gender <span class="required">*</span></label>
                        <div class="radio-group">
                            <label><input type="radio" name="gender" value="M" checked> Male</label>
                            <label><input type="radio" name="gender" value="F"> Female</label>
                        </div>
                    </div>
                    
                    <div class="form-field">
                        <label>Birthday</label>
                        <input type="text" name="birthday" placeholder="YYYY-MM-DD">
                    </div>
                    
                    <div class="form-field">
                        <label>Location</label>
                        <input type="text" name="location">
                    </div>
                    
                    <div class="form-field">
                        <label>Work</label>
                        <input type="text" name="work">
                    </div>
                    
                    <div class="form-field">
                        <label>Avatar URL</label>
                        <input type="text" name="avatar" value="https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg">
                    </div>
                    
                    <div class="form-actions tab-nav">
                        <button type="button" class="next-tab-btn" data-next-tab="image">Next: Add Image</button>
                    </div>
                </div>
                
                <!-- Image Tab -->
                <div class="tab-pane" id="image-tab">
                    <div class="image-upload-section">
                        <h3>Profile Image</h3>
                        <p class="section-description">Upload a profile image for this person. The image will be uploaded after creating the person.</p>
                        <div id="person-image-upload-container"></div>
                        
                        <div class="image-upload-tips">
                            <h4>Tips for best results:</h4>
                            <ul>
                                <li>Use clear, well-lit photos</li>
                                <li>Square images work best for profile photos</li>
                                <li>Maximum file size: 10MB</li>
                                <li>Supported formats: JPG, PNG, WebP</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="form-actions tab-nav">
                        <button type="button" class="prev-tab-btn" data-prev-tab="basic-info">Back: Basic Info</button>
                        <button type="button" class="next-tab-btn" data-next-tab="relationships">Next: Add Relationships</button>
                    </div>
                </div>
                
                <!-- Relationships Tab -->
                <div class="tab-pane" id="relationships-tab">
                    <div class="form-field">
                        <label>Father</label>
                        <div class="relationship-selector" id="father-selector">
                            <input type="text" class="relationship-search" data-rel-type="father" placeholder="Search for father...">
                            <div class="search-results" data-for="father"></div>
                            <div class="selected-relative" data-for="father">
                                <p class="no-selection">No father selected</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-field">
                        <label>Mother</label>
                        <div class="relationship-selector" id="mother-selector">
                            <input type="text" class="relationship-search" data-rel-type="mother" placeholder="Search for mother...">
                            <div class="search-results" data-for="mother"></div>
                            <div class="selected-relative" data-for="mother">
                                <p class="no-selection">No mother selected</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-field">
                        <label>Spouse</label>
                        <div class="relationship-selector" id="spouse-selector">
                            <input type="text" class="relationship-search" data-rel-type="spouse" placeholder="Search for spouse...">
                            <div class="search-results" data-for="spouse"></div>
                            <div class="selected-relative" data-for="spouse">
                                <p class="no-selection">No spouse selected</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-field">
                        <label>Children</label>
                        <div class="relationship-selector" id="children-selector">
                            <input type="text" class="relationship-search" data-rel-type="children" placeholder="Search for children...">
                            <div class="search-results" data-for="children"></div>
                            <div class="selected-relatives" data-for="children">
                                <p class="no-selection">No children selected</p>
                                <div class="selected-children-list"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions tab-nav">
                        <button type="button" class="prev-tab-btn" data-prev-tab="image">Back: Image</button>
                        <button type="submit" class="submit-btn">Create Person</button>
                    </div>
                </div>
            </div>
        </form>
    `;
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

/**
 * Set up event listeners for the add person form
 * @param {HTMLElement} modal - The modal container
 */
function setupFormEventListeners(modal) {
    // Close button
    const closeBtn = modal.querySelector('.close-modal-btn');
    closeBtn.addEventListener('click', closeModal);

    // Tab navigation
    const tabBtns = modal.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Deactivate all tabs
            tabBtns.forEach(tb => tb.classList.remove('active'));

            // Hide all tab panes
            modal.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

            // Activate clicked tab
            e.target.classList.add('active');

            // Show corresponding tab pane
            const tabId = e.target.dataset.tab;
            modal.querySelector(`#${tabId}-tab`).classList.add('active');
        });
    });

    // Next/Prev tab buttons
    modal.querySelectorAll('.next-tab-btn, .prev-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetTab = e.target.dataset.nextTab || e.target.dataset.prevTab;
            modal.querySelector(`.tab-btn[data-tab="${targetTab}"]`).click();
        });
    });

    // Relationship search inputs
    const searchInputs = modal.querySelectorAll('.relationship-search');
    searchInputs.forEach(input => {
        input.addEventListener('input', debounce(handleRelationshipSearch, 300));
    });

    // Form submission
    const form = modal.querySelector('#add-person-form');
    form.addEventListener('submit', handleAddPersonSubmit);

    // Close if clicking outside the modal
    const backdrop = document.querySelector('.modal-backdrop');
    backdrop.addEventListener('click', closeModal);
    modal.addEventListener('click', e => e.stopPropagation());
}

/**
 * Handle relationship search input
 * @param {Event} e - Input event
 */
async function handleRelationshipSearch(e) {
    // Check if user is still authenticated
    if (!isUserAuthenticated()) {
        showNotification("Your session has expired. Please log in again.", "error");
        closeModal();
        showAuthRequired('search for relatives');
        return;
    }

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

        // Filter results based on relationship type
        let filteredResults = results;

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
            const gender = person.data.gender === 'M' ? 'Male' : 'Female';

            resultItem.innerHTML = `
                <div class="result-avatar">
                    <img src="${person.data.avatar || 'default-avatar.png'}" alt="${fullName}">
                </div>
                <div class="result-info">
                    <div class="result-name">${fullName}</div>
                    <div class="result-details">${gender} • ${location}</div>
                </div>
            `;

            // Add click handler
            resultItem.addEventListener('click', () => {
                selectRelative(person, relType);
                resultsContainer.style.display = 'none';
                input.value = '';
            });

            resultsContainer.appendChild(resultItem);
        });

        resultsContainer.style.display = 'block';

    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = '<div class="search-error">Search failed. Please try again.</div>';
    }
}

/**
 * Select a relative
 * @param {Object} person - The selected person
 * @param {string} relType - Relationship type
 */
function selectRelative(person, relType) {
    if (relType === 'children') {
        // Add to children array
        if (!selectedRelatives.children.some(child => child.id === person.id)) {
            selectedRelatives.children.push(person);
        }
        updateSelectedChildrenUI();
    } else {
        // Set single relationship
        selectedRelatives[relType] = person;
        updateSelectedRelativeUI(relType);
    }
}

/**
 * Update UI for selected relative
 * @param {string} relType - Relationship type
 */
function updateSelectedRelativeUI(relType) {
    const selectedContainer = document.querySelector(`.selected-relative[data-for="${relType}"]`);
    const person = selectedRelatives[relType];

    if (!person) {
        selectedContainer.innerHTML = `<p class="no-selection">No ${relType} selected</p>`;
        return;
    }

    const fullName = `${person.data["first name"] || ''} ${person.data["last name"] || ''}`.trim();
    const avatar = person.data.avatar || 'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg';

    selectedContainer.innerHTML = `
        <div class="selected-person" data-person-id="${person.id}">
            <img src="${avatar}" class="selected-avatar">
            <span class="selected-name">${fullName}</span>
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
 * Update UI for selected children
 */
function updateSelectedChildrenUI() {
    const childrenList = document.querySelector('.selected-children-list');
    const noSelection = document.querySelector('.selected-relatives[data-for="children"] .no-selection');

    if (selectedRelatives.children.length === 0) {
        childrenList.innerHTML = '';
        noSelection.style.display = 'block';
        return;
    }

    noSelection.style.display = 'none';
    childrenList.innerHTML = '';

    selectedRelatives.children.forEach(child => {
        const fullName = `${child.data["first name"] || ''} ${child.data["last name"] || ''}`.trim();
        const childItem = document.createElement('div');
        childItem.className = 'selected-child';
        childItem.dataset.personId = child.id;
        childItem.innerHTML = `
            <img src="${child.data.avatar || 'default-avatar.png'}" class="selected-avatar">
            <span class="selected-name">${fullName}</span>
            <button type="button" class="remove-child-btn" data-child-id="${child.id}">&times;</button>
        `;

        childrenList.appendChild(childItem);

        // Add event listener to remove button
        const removeBtn = childItem.querySelector('.remove-child-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeChild(child.id);
        });
    });
}

/**
 * Remove a selected relative
 * @param {string} relType - Relationship type
 */
function removeRelative(relType) {
    selectedRelatives[relType] = null;
    updateSelectedRelativeUI(relType);
}

/**
 * Remove a selected child
 * @param {string} childId - Child ID
 */
function removeChild(childId) {
    selectedRelatives.children = selectedRelatives.children.filter(child => child.id !== childId);
    updateSelectedChildrenUI();
}

/**
 * Handle form submission for adding a new person with deferred image upload
 * @param {Event} e - Submit event
 */
async function handleAddPersonSubmit(e) {
    e.preventDefault();

    // Check if user is still authenticated
    if (!isUserAuthenticated()) {
        showNotification("Your session has expired. Please log in again.", "error");
        closeModal();
        showAuthRequired('add a new person');
        return;
    }

    const form = e.target;
    const submitBtn = form.querySelector('.submit-btn');
    const hasImage = personImageUpload && personImageUpload.isReady();

    try {
        // Show loading state
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Person...';

        // Gather form data
        const firstName = form.querySelector('input[name="first-name"]').value;
        const lastName = form.querySelector('input[name="last-name"]').value;
        const gender = form.querySelector('input[name="gender"]:checked').value;
        const birthday = form.querySelector('input[name="birthday"]').value || null;
        const location = form.querySelector('input[name="location"]').value || '';
        const work = form.querySelector('input[name="work"]').value || '';
        const avatar = form.querySelector('input[name="avatar"]').value || 'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg';

        // Build person data object
        const personData = {
            personname: `${firstName} ${lastName}`,
            birthdate: birthday,
            gender: gender,
            currentlocation: location,
            fatherid: selectedRelatives.father ? selectedRelatives.father.id : null,
            motherid: selectedRelatives.mother ? selectedRelatives.mother.id : null,
            spouseid: selectedRelatives.spouse ? selectedRelatives.spouse.id : null,
            worksat: work,
            nativeplace: '',
            phone: null,
            mail_id: null,
            living: "Y",
            data: {
                "first name": firstName,
                "last name": lastName,
                "gender": gender,
                "birthday": birthday,
                "location": location,
                "work": work,
                "avatar": avatar,
                "contact": {
                    "email": "",
                    "phone": ""
                },
                "nativePlace": ""
            },
            rels: {
                father: selectedRelatives.father ? selectedRelatives.father.id : null,
                mother: selectedRelatives.mother ? selectedRelatives.mother.id : null,
                spouses: selectedRelatives.spouse ? [selectedRelatives.spouse.id] : [],
                children: selectedRelatives.children.map(child => child.id)
            }
        };

        console.log('Creating person with data:', personData);

        // Step 1: Create person first
        const response = await createNewPerson(personData);
        const newPersonId = response.id;

        console.log('Person created with ID:', newPersonId);

        // Step 2: Upload image if available
        if (hasImage) {
            try {
                submitBtn.textContent = 'Uploading Image...';

                console.log('Uploading image for person:', newPersonId);

                // Upload the image with the new person ID
                const imageData = await personImageUpload.uploadImage(newPersonId);

                if (imageData) {
                    console.log('Image uploaded successfully:', imageData);
                    showNotification('Person created and image uploaded successfully!', 'success');
                } else {
                    console.warn('Image upload failed, but person was created');
                    showNotification('Person created successfully, but image upload failed.', 'warning');
                }

            } catch (imageError) {
                console.error('Image upload failed:', imageError);
                showNotification('Person created successfully, but image upload failed.', 'warning');
                // Don't fail the entire operation if image upload fails
            }
        } else {
            showNotification('Person added successfully!', 'success');
        }

        // Step 3: Create complete person object with permanent ID
        const newPerson = {
            id: newPersonId,
            data: personData.data,
            rels: personData.rels
        };

        // Step 4: Update relationships of connected people
        await updateConnectedPeopleRelationships(newPersonId);

        // Step 5: Update chart data
        await updateChartData([newPerson]);

        // Step 6: Close modal and reset form
        closeModal();

    } catch (error) {
        console.error('Error adding person:', error);

        // Show error notification
        showNotification(`Error adding person: ${error.message}`, 'error');

        // Reset submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

/**
 * Update relationships of connected people
 * @param {string} newPersonId - New person ID
 */
async function updateConnectedPeopleRelationships(newPersonId) {
    console.log("addPerson.js updateConnectedPeopleRelationships", newPersonId);
    console.log("selectedRelatives:", selectedRelatives);

    const updatePromises = [];

    // Update father if selected
    if (selectedRelatives.father) {
        const fatherUpdate = updatePersonRelationship(
            selectedRelatives.father,
            'children',
            newPersonId
        );
        updatePromises.push(fatherUpdate);
    }

    // Update mother if selected
    if (selectedRelatives.mother) {
        const motherUpdate = updatePersonRelationship(
            selectedRelatives.mother,
            'children',
            newPersonId
        );
        updatePromises.push(motherUpdate);
    }

    // Update spouse if selected
    if (selectedRelatives.spouse) {
        const spouseUpdate = updatePersonRelationship(
            selectedRelatives.spouse,
            'spouses',
            newPersonId
        );
        updatePromises.push(spouseUpdate);
    }

    // Update children if selected
    for (const child of selectedRelatives.children) {
        const childUpdate = updatePersonRelationship(
            child,
            child.data.gender === 'M' ? 'father' : 'mother',
            newPersonId,
            true // Single value, not array
        );
        updatePromises.push(childUpdate);
    }

    // Wait for all updates to complete
    await Promise.all(updatePromises);
}

/**
 * Update a specific relationship for a person
 * @param {Object} person - Person to update
 * @param {string} relType - Relationship type
 * @param {string} newPersonId - New person ID
 * @param {boolean} isSingleValue - Whether this is a single value (not array)
 */
async function updatePersonRelationship(person, relType, newPersonId, isSingleValue = false) {
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

        if (!updatedPerson.rels[relType].includes(newPersonId)) {
            updatedPerson.rels[relType].push(newPersonId);
        }
    }

    // Update person in the backend
    return updatePersonData(person.id, updatedPerson);
}

/**
 * Close the modal
 */
function closeModal() {
    const backdrop = document.querySelector('.modal-backdrop');
    const modal = document.querySelector('.add-person-modal');

    if (backdrop && modal) {
        // Add closing animation
        backdrop.classList.remove('visible');
        modal.classList.remove('visible');

        // Remove elements after animation completes
        setTimeout(() => {
            if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
            if (modal.parentNode) modal.parentNode.removeChild(modal);

            // Reset selected relatives
            selectedRelatives = {
                father: null,
                mother: null,
                spouse: null,
                children: []
            };

            // Reset image upload component
            if (personImageUpload) {
                personImageUpload.reset();
                personImageUpload = null;
            }
        }, 300);
    }
}

/**
 * Show a notification
 * @param {string} message - The notification message
 * @param {string} type - Notification type ('success', 'error', 'info', 'warning')
 */
function showNotification(message, type = 'info') {
    // Use ImageUtils notification if available
    if (typeof ImageUtils !== 'undefined' && ImageUtils.showNotification) {
        ImageUtils.showNotification(message, type);
        return;
    }

    // Fallback notification
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
 * Get current image upload state
 */
export function getImageUploadState() {
    return {
        hasImage: personImageUpload ? personImageUpload.isReady() : false,
        isUploaded: personImageUpload ? personImageUpload.hasUploadedImage() : false,
        isUploading: personImageUpload ? personImageUpload.getState().isUploading : false,
        file: personImageUpload ? personImageUpload.getFile() : null
    };
}

/**
 * Upload image for an existing person (utility function)
 */
export async function uploadPersonImage(personId) {
    if (!personImageUpload || !personImageUpload.isReady()) {
        return null;
    }

    try {
        const imageData = await personImageUpload.uploadImage(personId);
        return imageData;
    } catch (error) {
        console.error('Failed to upload person image:', error);
        throw error;
    }
}

// Export necessary functions
export {
    showAddPersonForm,
    closeModal,
    showNotification
};