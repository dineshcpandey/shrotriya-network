// Avatar Management Module
// This module handles avatar upload, display, edit, and delete functionality

let currentPersonId = null;
let currentAvatarData = null;
let cropper = null;

// Configuration
const AVATAR_CONFIG = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    cropAspectRatio: 1, // Square crop
    cropBoxSize: 200,
    outputSize: { width: 150, height: 150 }
};

/**
 * Initialize avatar functionality in the edit form
 * @param {string} personId - The ID of the person being edited
 * @param {Object} personData - Current person data
 */
export function initializeAvatarManager(personId, personData) {
    currentPersonId = personId;
    currentAvatarData = extractAvatarData(personData);

    console.log('Initializing avatar manager for person:', personId);

    // Find the avatar container in the form and enhance it
    setTimeout(() => {
        enhanceAvatarField();
    }, 100);
}

/**
 * Extract avatar data from person data
 * @param {Object} personData - Person data object
 * @returns {Object} Avatar data
 */
function extractAvatarData(personData) {
    return {
        url: personData.data?.avatar || null,
        hasUploadedImage: personData.data?.hasUploadedImage || false,
        filename: personData.data?.imageFilename || null,
        uploadDate: personData.data?.imageUploadDate || null
    };
}

/**
 * Enhance the avatar field in the form with upload/edit/delete functionality
 */
function enhanceAvatarField() {
    const editFormContent = document.getElementById('edit-form-content');
    if (!editFormContent) return;

    // Find the avatar field
    const avatarField = findAvatarField(editFormContent);
    if (!avatarField) {
        console.log('Avatar field not found in form');
        return;
    }

    console.log('Enhancing avatar field');

    // Replace the basic avatar field with our enhanced avatar manager
    const avatarContainer = createAvatarContainer();

    // Replace the existing avatar field
    avatarField.replaceWith(avatarContainer);

    // Initialize the avatar display
    updateAvatarDisplay();
}

/**
 * Find the avatar field in the form
 * @param {Element} formContainer - The form container element
 * @returns {Element|null} The avatar field element
 */
function findAvatarField(formContainer) {
    // Look for avatar-related fields
    const avatarInput = formContainer.querySelector('input[name="avatar"]');
    if (avatarInput) {
        return avatarInput.closest('.f3-form-field') || avatarInput.parentElement;
    }

    // Look for any field containing "avatar" in its content
    const formFields = formContainer.querySelectorAll('.f3-form-field');
    for (const field of formFields) {
        if (field.textContent.toLowerCase().includes('avatar')) {
            return field;
        }
    }

    return null;
}

/**
 * Create the enhanced avatar container
 * @returns {Element} Avatar container element
 */
function createAvatarContainer() {
    const container = document.createElement('div');
    container.className = 'avatar-manager-container f3-form-field';

    container.innerHTML = `
        <label class="f3-form-label">Profile Picture</label>
        <div class="avatar-display-section">
            <div class="avatar-preview">
                <img id="avatar-preview-img" src="" alt="Avatar" style="display: none;">
                <div id="avatar-placeholder" class="avatar-placeholder">
                    <i class="avatar-icon">👤</i>
                    <span>No photo</span>
                </div>
            </div>
            <div class="avatar-info">
                <div id="avatar-status" class="avatar-status"></div>
                <div class="avatar-actions">
                    <button type="button" id="upload-avatar-btn" class="avatar-btn primary">
                        📁 Upload Photo
                    </button>
                    <button type="button" id="edit-avatar-btn" class="avatar-btn secondary" style="display: none;">
                        ✏️ Edit
                    </button>
                    <button type="button" id="delete-avatar-btn" class="avatar-btn danger" style="display: none;">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Hidden file input -->
        <input type="file" id="avatar-file-input" accept="image/*" style="display: none;">
        
        <!-- Crop modal -->
        <div id="avatar-crop-modal" class="avatar-crop-modal" style="display: none;">
            <div class="avatar-crop-content">
                <div class="avatar-crop-header">
                    <h3>Crop Your Photo</h3>
                    <button type="button" id="crop-modal-close" class="close-button">&times;</button>
                </div>
                <div class="avatar-crop-body">
                    <img id="crop-image" src="" alt="Crop preview">
                </div>
                <div class="avatar-crop-footer">
                    <button type="button" id="crop-cancel-btn" class="avatar-btn secondary">Cancel</button>
                    <button type="button" id="crop-save-btn" class="avatar-btn primary">Save Photo</button>
                </div>
            </div>
        </div>
    `;

    // Add event listeners
    addAvatarEventListeners(container);

    return container;
}

/**
 * Add event listeners to avatar elements
 * @param {Element} container - Avatar container element
 */
function addAvatarEventListeners(container) {
    const uploadBtn = container.querySelector('#upload-avatar-btn');
    const editBtn = container.querySelector('#edit-avatar-btn');
    const deleteBtn = container.querySelector('#delete-avatar-btn');
    const fileInput = container.querySelector('#avatar-file-input');
    const cropModal = container.querySelector('#avatar-crop-modal');
    const cropModalClose = container.querySelector('#crop-modal-close');
    const cropCancelBtn = container.querySelector('#crop-cancel-btn');
    const cropSaveBtn = container.querySelector('#crop-save-btn');

    // Upload button
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Edit button (re-crop existing image)
    editBtn.addEventListener('click', () => {
        if (currentAvatarData.url) {
            initializeCropper(currentAvatarData.url);
        }
    });

    // Delete button
    deleteBtn.addEventListener('click', handleDeleteAvatar);

    // Crop modal close
    cropModalClose.addEventListener('click', closeCropModal);
    cropCancelBtn.addEventListener('click', closeCropModal);

    // Crop save
    cropSaveBtn.addEventListener('click', handleCropSave);

    // Modal background click to close
    cropModal.addEventListener('click', (e) => {
        if (e.target === cropModal) {
            closeCropModal();
        }
    });
}

/**
 * Handle file selection for avatar upload
 * @param {Event} event - File input change event
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    if (!validateFile(file)) {
        return;
    }

    // Read file and initialize cropper
    const reader = new FileReader();
    reader.onload = (e) => {
        initializeCropper(e.target.result);
    };
    reader.readAsDataURL(file);
}

/**
 * Validate uploaded file
 * @param {File} file - Selected file
 * @returns {boolean} Is file valid
 */
function validateFile(file) {
    // Check file size
    if (file.size > AVATAR_CONFIG.maxFileSize) {
        alert(`File is too large. Maximum size is ${AVATAR_CONFIG.maxFileSize / (1024 * 1024)}MB`);
        return false;
    }

    // Check file type
    if (!AVATAR_CONFIG.allowedTypes.includes(file.type)) {
        alert('Invalid file type. Please select a JPG, PNG, or WebP image.');
        return false;
    }

    return true;
}

/**
 * Initialize the image cropper
 * @param {string} imageSrc - Image source URL or data URL
 */
function initializeCropper(imageSrc) {
    const cropModal = document.getElementById('avatar-crop-modal');
    const cropImage = document.getElementById('crop-image');

    if (!cropModal || !cropImage) return;

    // Set image source
    cropImage.src = imageSrc;

    // Show modal
    cropModal.style.display = 'flex';

    // Destroy existing cropper if any
    if (cropper) {
        cropper.destroy();
    }

    // Initialize new cropper
    cropImage.onload = () => {
        cropper = new Cropper(cropImage, {
            aspectRatio: AVATAR_CONFIG.cropAspectRatio,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 1,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            ready: function () {
                // Set initial crop box size
                const containerData = cropper.getContainerData();
                const size = Math.min(containerData.width, containerData.height) * 0.8;
                cropper.setCropBoxData({
                    width: size,
                    height: size
                });
            }
        });
    };
}

/**
 * Close the crop modal
 */
function closeCropModal() {
    const cropModal = document.getElementById('avatar-crop-modal');
    if (cropModal) {
        cropModal.style.display = 'none';
    }

    if (cropper) {
        cropper.destroy();
        cropper = null;
    }

    // Clear file input
    const fileInput = document.getElementById('avatar-file-input');
    if (fileInput) {
        fileInput.value = '';
    }
}

/**
 * Handle crop save
 */
async function handleCropSave() {
    if (!cropper || !currentPersonId) return;

    try {
        // Show loading state
        const cropSaveBtn = document.getElementById('crop-save-btn');
        const originalText = cropSaveBtn.textContent;
        cropSaveBtn.textContent = 'Saving...';
        cropSaveBtn.disabled = true;

        // Get cropped canvas
        const canvas = cropper.getCroppedCanvas({
            width: AVATAR_CONFIG.outputSize.width,
            height: AVATAR_CONFIG.outputSize.height,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        // Convert to blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.9);
        });

        // Upload image
        const result = await uploadAvatarImage(blob);

        if (result.success) {
            // Update current avatar data
            currentAvatarData = {
                url: result.data.urls.thumbnail,
                hasUploadedImage: true,
                filename: result.data.filename,
                uploadDate: new Date().toISOString()
            };

            // Update display
            updateAvatarDisplay();

            // Update the form's avatar field value for saving
            updateFormAvatarValue(result.data.urls.thumbnail);

            // Close modal
            closeCropModal();

            // Show success message
            showAvatarMessage('Avatar updated successfully!', 'success');

        } else {
            throw new Error(result.message || 'Upload failed');
        }

    } catch (error) {
        console.error('Error saving avatar:', error);
        showAvatarMessage('Failed to save avatar: ' + error.message, 'error');
    } finally {
        // Reset button
        const cropSaveBtn = document.getElementById('crop-save-btn');
        if (cropSaveBtn) {
            cropSaveBtn.textContent = originalText;
            cropSaveBtn.disabled = false;
        }
    }
}

/**
 * Upload avatar image to server
 * @param {Blob} imageBlob - Cropped image blob
 * @returns {Promise<Object>} Upload result
 */
async function uploadAvatarImage(imageBlob) {
    const formData = new FormData();
    formData.append('image', imageBlob, 'avatar.jpg');
    formData.append('personId', currentPersonId);

    const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData
    });

    return await response.json();
}

/**
 * Handle avatar deletion
 */
async function handleDeleteAvatar() {
    if (!currentPersonId || !currentAvatarData.hasUploadedImage) return;

    if (!confirm('Are you sure you want to delete your profile picture?')) {
        return;
    }

    try {
        // Show loading state
        const deleteBtn = document.getElementById('delete-avatar-btn');
        const originalText = deleteBtn.textContent;
        deleteBtn.textContent = 'Deleting...';
        deleteBtn.disabled = true;

        // Get the image ID first
        const imageData = await getPersonImages(currentPersonId);
        if (imageData.success && imageData.data.length > 0) {
            const imageId = imageData.data[0].id;

            // Delete the image
            const response = await fetch(`/api/images/${imageId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                // Reset avatar data
                currentAvatarData = {
                    url: getDefaultAvatarUrl(),
                    hasUploadedImage: false,
                    filename: null,
                    uploadDate: null
                };

                // Update display
                updateAvatarDisplay();

                // Update form value
                updateFormAvatarValue(currentAvatarData.url);

                // Show success message
                showAvatarMessage('Avatar deleted successfully!', 'success');

            } else {
                throw new Error(result.message || 'Delete failed');
            }
        }

    } catch (error) {
        console.error('Error deleting avatar:', error);
        showAvatarMessage('Failed to delete avatar: ' + error.message, 'error');
    } finally {
        // Reset button
        const deleteBtn = document.getElementById('delete-avatar-btn');
        if (deleteBtn) {
            deleteBtn.textContent = originalText;
            deleteBtn.disabled = false;
        }
    }
}

/**
 * Get person images from server
 * @param {string} personId - Person ID
 * @returns {Promise<Object>} Images data
 */
async function getPersonImages(personId) {
    const response = await fetch(`/api/images/person/${personId}`);
    return await response.json();
}

/**
 * Update the avatar display
 */
function updateAvatarDisplay() {
    const avatarImg = document.getElementById('avatar-preview-img');
    const avatarPlaceholder = document.getElementById('avatar-placeholder');
    const avatarStatus = document.getElementById('avatar-status');
    const editBtn = document.getElementById('edit-avatar-btn');
    const deleteBtn = document.getElementById('delete-avatar-btn');

    if (!avatarImg || !avatarPlaceholder || !avatarStatus) return;

    if (currentAvatarData.hasUploadedImage && currentAvatarData.url) {
        // Show uploaded image
        avatarImg.src = currentAvatarData.url;
        avatarImg.style.display = 'block';
        avatarPlaceholder.style.display = 'none';

        // Update status
        const uploadDate = currentAvatarData.uploadDate ?
            new Date(currentAvatarData.uploadDate).toLocaleDateString() : 'Unknown';
        avatarStatus.textContent = `Custom photo (uploaded ${uploadDate})`;
        avatarStatus.className = 'avatar-status uploaded';

        // Show edit/delete buttons
        if (editBtn) editBtn.style.display = 'inline-block';
        if (deleteBtn) deleteBtn.style.display = 'inline-block';

    } else if (currentAvatarData.url && !isDefaultAvatar(currentAvatarData.url)) {
        // Show Facebook or other external image
        avatarImg.src = currentAvatarData.url;
        avatarImg.style.display = 'block';
        avatarPlaceholder.style.display = 'none';

        // Update status
        avatarStatus.textContent = 'Using external photo (Facebook/other)';
        avatarStatus.className = 'avatar-status external';

        // Show only upload button (can't edit external images)
        if (editBtn) editBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';

    } else {
        // Show placeholder
        avatarImg.style.display = 'none';
        avatarPlaceholder.style.display = 'flex';

        // Update status
        avatarStatus.textContent = 'No custom photo uploaded';
        avatarStatus.className = 'avatar-status none';

        // Hide edit/delete buttons
        if (editBtn) editBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
    }
}

/**
 * Check if URL is a default avatar
 * @param {string} url - Avatar URL
 * @returns {boolean} Is default avatar
 */
function isDefaultAvatar(url) {
    const defaultPatterns = [
        'no-user-profile-picture',
        'depositphotos',
        'default-avatar',
        'placeholder'
    ];

    return defaultPatterns.some(pattern => url.includes(pattern));
}

/**
 * Get default avatar URL
 * @returns {string} Default avatar URL
 */
function getDefaultAvatarUrl() {
    return 'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg';
}

/**
 * Update the form's avatar field value
 * @param {string} avatarUrl - New avatar URL
 */
function updateFormAvatarValue(avatarUrl) {
    // Find any hidden avatar input in the form
    const editFormContent = document.getElementById('edit-form-content');
    if (!editFormContent) return;

    let avatarInput = editFormContent.querySelector('input[name="avatar"]');
    if (!avatarInput) {
        // Create hidden input if it doesn't exist
        avatarInput = document.createElement('input');
        avatarInput.type = 'hidden';
        avatarInput.name = 'avatar';
        editFormContent.appendChild(avatarInput);
    }

    avatarInput.value = avatarUrl;

    // Trigger change event for form handling
    avatarInput.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Show avatar-related message
 * @param {string} message - Message text
 * @param {string} type - Message type (success, error, info)
 */
function showAvatarMessage(message, type = 'info') {
    const avatarStatus = document.getElementById('avatar-status');
    if (!avatarStatus) return;

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `avatar-message ${type}`;
    messageEl.textContent = message;

    // Insert after status
    avatarStatus.parentNode.insertBefore(messageEl, avatarStatus.nextSibling);

    // Remove after 3 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, 3000);
}

/**
 * Load and display existing avatar for a person
 * @param {string} personId - Person ID
 * @param {Object} personData - Person data
 */
export async function loadExistingAvatar(personId, personData) {
    try {
        // First check if there's already avatar data in personData
        if (personData.data?.hasUploadedImage) {
            currentAvatarData = extractAvatarData(personData);
            return;
        }

        // Otherwise, fetch from server
        const imageData = await getPersonImages(personId);
        if (imageData.success && imageData.data.length > 0) {
            const latestImage = imageData.data[0];
            currentAvatarData = {
                url: latestImage.url,
                hasUploadedImage: true,
                filename: latestImage.filename,
                uploadDate: latestImage.created_at
            };
        } else {
            // Use existing avatar from personData or default
            currentAvatarData = {
                url: personData.data?.avatar || getDefaultAvatarUrl(),
                hasUploadedImage: false,
                filename: null,
                uploadDate: null
            };
        }

    } catch (error) {
        console.error('Error loading existing avatar:', error);
        // Fallback to existing data
        currentAvatarData = extractAvatarData(personData);
    }
}

/**
 * Clean up avatar manager (destroy cropper, etc.)
 */
export function cleanupAvatarManager() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }

    currentPersonId = null;
    currentAvatarData = null;

    // Close crop modal if open
    const cropModal = document.getElementById('avatar-crop-modal');
    if (cropModal) {
        cropModal.style.display = 'none';
    }
}

// Add Cropper.js if not already loaded
function ensureCropperLoaded() {
    return new Promise((resolve) => {
        if (window.Cropper) {
            resolve();
            return;
        }

        // Load Cropper.js CSS
        if (!document.querySelector('link[href*="cropper.min.css"]')) {
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
            document.head.appendChild(css);
        }

        // Load Cropper.js script
        if (!document.querySelector('script[src*="cropper.min.js"]')) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        } else {
            resolve();
        }
    });
}

// Initialize Cropper.js when module loads
ensureCropperLoaded();
