// Edit Form functionality - Updated with relationship search support
import { getChartInstance, openEditTree, clearCurrentEditPerson } from './chart.js';
import { resetAddRelativeState } from './addRelative.js';
import { initEditRelations, saveRelationships } from './editRelations.js';

// Elements
const editForm = document.getElementById('edit-form');
const editFormContent = document.getElementById('edit-form-content');
const closeEditFormBtn = document.getElementById('close-edit-form');

// Default options
let editOptions = {
    onClose: null,
};

/**
 * Set up edit form functionality
 * @param {Object} options - Edit form options
 */
export function setupEditForm(options = {}) {
    // Merge options
    editOptions = { ...editOptions, ...options };

    // Set up close button
    if (closeEditFormBtn) {
        closeEditFormBtn.addEventListener('click', handleClose);
    }

    // Add stylesheet for edit relations
    addRelationsStylesheet();

    console.log('Edit form initialized');
}

/**
 * Add the CSS stylesheet for edit relations
 */
function addRelationsStylesheet() {
    // Check if stylesheet is already added
    if (document.getElementById('edit-relations-styles')) return;

    const link = document.createElement('link');
    link.id = 'edit-relations-styles';
    link.rel = 'stylesheet';
    link.href = './styles/editRelations.css';
    document.head.appendChild(link);
}

/**
 * Open edit form for a specific person
 * @param {Object} person - Person data
 */
export function openEditForm(person) {
    console.log("editForm.js openEditForm ", person);

    if (!editForm || !editFormContent) {
        console.error('Edit form elements not found');
        return;
    }

    try {
        // ⚠️ IMPORTANT: Clear the edit form content completely first
        editFormContent.innerHTML = '';
        console.log("Inside editForm.js ", person);

        // Make form visible
        editForm.classList.add('visible');

        // Set title
        const editFormTitle = document.getElementById('edit-form-title');
        if (editFormTitle && person) {
            console.log("Got the edit-form-title ", editFormTitle);
            editFormTitle.textContent = `Edit: ${person.data["first name"] || ''} ${person.data["last name"] || ''}`;
        }

        // Wait a brief moment before opening the edit tree - this helps with timing issues
        console.log("Trying to open openEditTree", person);
        setTimeout(() => {
            // Open edit tree form for this person using direct function
            openEditTree(person);

            // Initialize edit relations after a slight delay to ensure the f3 form is rendered
            setTimeout(() => {
                initEditRelations(person);
            }, 100);
        }, 50);        // Add a mutation observer to detect when the family form is added to the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === 1 && node.querySelector && node.querySelector('#familyForm')) {
                            // We found the family form, initialize edit relations
                            initEditRelations(person);
                            observer.disconnect();
                            break;
                        }
                    }
                }
            });
        });        // Start observing the edit form content
        observer.observe(editFormContent, { childList: true, subtree: true });

        console.log('Edit form opened for person:', person.id);
    } catch (error) {
        console.error('Error opening edit form:', error);
    }
}

/**
 * Hook into the form submission process to save relationships
 * This function should be called by the chart.js when handling form submission
 * @param {Object} person - The person being edited
 * @returns {Promise} Promise resolving when relationships are saved
 */
export async function saveRelationshipsOnSubmit(person) {
    try {
        return await saveRelationships();
    } catch (error) {
        console.error('Error saving relationships on submit:', error);
        throw error;
    }
}

/**
 * Close edit form
 */
export function closeEditForm() {
    if (editForm) {
        editForm.classList.remove('visible');
    }

    // Clear the form content when closing
    if (editFormContent) {
        editFormContent.innerHTML = '';
    }

    // Clear the current edit person reference
    clearCurrentEditPerson();

    // Also reset the add relative state
    resetAddRelativeState();

    console.log('Edit form closed and cleared');
}

/**
 * Handle close button click
 */
function handleClose() {
    closeEditForm();

    if (editOptions.onClose) {
        editOptions.onClose();
    }
}