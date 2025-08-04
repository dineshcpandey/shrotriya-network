// public/js/imageUpload.js - Enhanced Image Upload Component with Deferred Upload

/**
 * Enhanced Image Upload Component for Add/Edit Person Forms
 * Features: File validation, preview, deferred upload capability
 */

class ImageUpload {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            maxSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
            allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
            apiEndpoint: 'http://localhost:5050/api/images/upload',
            previewSize: 150, // pixels
            deferUpload: false, // NEW: Enable deferred upload mode
            ...options
        };

        this.state = {
            file: null,
            previewUrl: null,
            isUploading: false,
            uploadedImageData: null,
            error: null,
            isReady: false // NEW: Indicates if file is ready for upload
        };

        this.callbacks = {
            onFileSelect: options.onFileSelect || (() => { }),
            onUploadStart: options.onUploadStart || (() => { }),
            onUploadSuccess: options.onUploadSuccess || (() => { }),
            onUploadError: options.onUploadError || (() => { }),
            onRemove: options.onRemove || (() => { }),
            onReady: options.onReady || (() => { }) // NEW: Called when file is ready
        };

        this.init();
    }

    /**
     * Initialize the component
     */
    init() {
        if (!this.container) {
            console.error('ImageUpload: Container not found');
            return;
        }

        this.render();
        this.attachEventListeners();
    }

    /**
     * Render the upload interface
     */
    render() {
        const uploadText = this.options.deferUpload
            ? 'Image will be uploaded after creating the person'
            : 'Image will be uploaded immediately';

        this.container.innerHTML = `
            <div class="image-upload-component">
                <div class="upload-area ${this.state.file ? 'has-file' : ''}" id="upload-area">
                    <div class="upload-content">
                        <div class="upload-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                        </div>
                        <div class="upload-text">
                            <p class="upload-main-text">Click to upload or drag and drop</p>
                            <p class="upload-sub-text">PNG, JPG, WebP up to 10MB</p>
                            ${this.options.deferUpload ? `<p class="upload-note">${uploadText}</p>` : ''}
                        </div>
                    </div>
                    <input type="file" id="file-input" accept="${this.options.allowedExtensions.join(',')}" hidden>
                </div>

                <div class="preview-section" style="display: ${this.state.file ? 'block' : 'none'}">
                    <div class="preview-container">
                        <div class="preview-image">
                            <img id="preview-img" src="" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div class="preview-details">
                            <p id="file-name" class="file-name"></p>
                            <p id="file-size" class="file-size"></p>
                            <div class="file-status">
                                <span id="file-status-text" class="status-text"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="upload-actions" style="display: ${this.state.file && !this.state.isUploading ? 'block' : 'none'}">
                        ${!this.options.deferUpload ? `
                            <button id="upload-btn" class="btn btn-primary btn-sm">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7,10 12,15 17,10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                Upload
                            </button>
                        ` : ''}
                        <button id="cancel-btn" class="btn btn-secondary btn-sm">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                            Remove
                        </button>
                    </div>
                </div>

                <div id="upload-progress" class="upload-progress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <p class="progress-text">Uploading...</p>
                </div>

                <div id="upload-error" class="upload-error" style="display: none;">
                    <p id="error-message"></p>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const uploadArea = this.container.querySelector('#upload-area');
        const fileInput = this.container.querySelector('#file-input');
        const uploadBtn = this.container.querySelector('#upload-btn');
        const cancelBtn = this.container.querySelector('#cancel-btn');

        if (!uploadArea || !fileInput) return;

        // Click to open file dialog
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // File selection
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileSelect(file);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) {
                this.handleFileSelect(file);
            }
        });

        // Upload button (only if not in deferred mode)
        if (uploadBtn && !this.options.deferUpload) {
            uploadBtn.addEventListener('click', () => {
                if (this.state.file) {
                    this.uploadImage();
                }
            });
        }

        // Cancel/Remove button
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.removeImage();
            });
        }
    }

    /**
     * Handle file selection
     */
    handleFileSelect(file) {
        // Validate file
        const validation = this.validateFile(file);
        if (!validation.valid) {
            this.showError(validation.error);
            return;
        }

        this.clearError();
        this.state.file = file;
        this.state.isReady = true;

        // Generate preview
        this.generatePreview(file);

        // Update UI
        this.updateUI();

        // Update status
        this.updateFileStatus();

        // Callback
        this.callbacks.onFileSelect(file);
        this.callbacks.onReady(file);

        // Auto-upload if not in deferred mode
        if (!this.options.deferUpload) {
            // Optional: Auto-upload immediately or wait for user click
            // this.uploadImage();
        }
    }

    /**
     * Update file status display
     */
    updateFileStatus() {
        const statusText = this.container.querySelector('#file-status-text');
        if (!statusText) return;

        if (this.state.uploadedImageData) {
            statusText.textContent = 'Uploaded';
            statusText.className = 'status-text status-success';
        } else if (this.state.isReady && this.options.deferUpload) {
            statusText.textContent = 'Ready for upload';
            statusText.className = 'status-text status-ready';
        } else if (this.state.isReady) {
            statusText.textContent = 'Ready';
            statusText.className = 'status-text status-ready';
        } else {
            statusText.textContent = '';
            statusText.className = 'status-text';
        }
    }

    /**
     * Validate selected file
     */
    validateFile(file) {
        // Check file type
        if (!this.options.allowedTypes.includes(file.type)) {
            return {
                valid: false,
                error: `Invalid file type. Only ${this.options.allowedTypes.join(', ')} are allowed.`
            };
        }

        // Check file size
        if (file.size > this.options.maxSize) {
            const maxSizeMB = this.options.maxSize / (1024 * 1024);
            return {
                valid: false,
                error: `File size too large. Maximum size is ${maxSizeMB}MB.`
            };
        }

        return { valid: true };
    }

    /**
     * Generate image preview
     */
    generatePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.state.previewUrl = e.target.result;
            this.updatePreview();
        };
        reader.readAsDataURL(file);
    }

    /**
     * Update preview display
     */
    updatePreview() {
        const previewImg = this.container.querySelector('#preview-img');
        const fileName = this.container.querySelector('#file-name');
        const fileSize = this.container.querySelector('#file-size');

        if (previewImg && this.state.previewUrl) {
            previewImg.src = this.state.previewUrl;
        }

        if (fileName && this.state.file) {
            fileName.textContent = this.state.file.name;
        }

        if (fileSize && this.state.file) {
            fileSize.textContent = this.formatFileSize(this.state.file.size);
        }
    }

    /**
     * Upload image to server
     * @param {number} personId - Person ID to associate with the image
     * @param {Object} cropData - Optional crop data
     */
    async uploadImage(personId = null, cropData = null) {
        if (!this.state.file) {
            this.showError('No file selected');
            return null;
        }

        // In deferred mode, personId is required
        if (this.options.deferUpload && !personId) {
            this.showError('Person ID is required for upload');
            return null;
        }

        this.state.isUploading = true;
        this.callbacks.onUploadStart();
        this.showProgress();

        try {
            const formData = new FormData();
            formData.append('image', this.state.file);

            if (personId) {
                formData.append('personId', personId);
            }

            if (cropData) {
                formData.append('cropData', JSON.stringify(cropData));
            }

            const response = await fetch(this.options.apiEndpoint, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.state.uploadedImageData = result.data;
                this.state.isUploading = false;
                this.hideProgress();
                this.updateFileStatus();
                this.updateUI();
                this.callbacks.onUploadSuccess(result.data);
                return result.data;
            } else {
                throw new Error(result.message || 'Upload failed');
            }

        } catch (error) {
            this.state.isUploading = false;
            this.hideProgress();
            this.showError(error.message);
            this.callbacks.onUploadError(error);
            return null;
        }
    }

    /**
     * Remove selected image
     */
    removeImage() {
        this.state.file = null;
        this.state.previewUrl = null;
        this.state.uploadedImageData = null;
        this.state.isReady = false;
        this.state.error = null;

        // Reset file input
        const fileInput = this.container.querySelector('#file-input');
        if (fileInput) {
            fileInput.value = '';
        }

        this.updateUI();
        this.clearError();
        this.callbacks.onRemove();
    }

    /**
     * Update UI based on current state
     */
    updateUI() {
        const uploadArea = this.container.querySelector('#upload-area');
        const previewSection = this.container.querySelector('.preview-section');
        const uploadActions = this.container.querySelector('.upload-actions');

        if (uploadArea) {
            uploadArea.className = `upload-area ${this.state.file ? 'has-file' : ''}`;
        }

        if (previewSection) {
            previewSection.style.display = this.state.file ? 'block' : 'none';
        }

        if (uploadActions) {
            uploadActions.style.display =
                this.state.file && !this.state.isUploading ? 'block' : 'none';
        }

        if (this.state.file) {
            this.updatePreview();
        }
    }

    /**
     * Show upload progress
     */
    showProgress() {
        const progressDiv = this.container.querySelector('#upload-progress');
        const uploadActions = this.container.querySelector('.upload-actions');

        if (progressDiv) {
            progressDiv.style.display = 'block';
        }
        if (uploadActions) {
            uploadActions.style.display = 'none';
        }
    }

    /**
     * Hide upload progress
     */
    hideProgress() {
        const progressDiv = this.container.querySelector('#upload-progress');
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = this.container.querySelector('#upload-error');
        const errorMessage = this.container.querySelector('#error-message');

        if (errorDiv && errorMessage) {
            errorMessage.textContent = message;
            errorDiv.style.display = 'block';
        }

        this.state.error = message;
    }

    /**
     * Clear error message
     */
    clearError() {
        const errorDiv = this.container.querySelector('#upload-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
        this.state.error = null;
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Check if file is ready for upload
     */
    isReady() {
        return this.state.isReady && this.state.file && !this.state.isUploading;
    }

    /**
     * Check if file has been uploaded
     */
    hasUploadedImage() {
        return !!this.state.uploadedImageData;
    }

    /**
     * Get selected file
     */
    getFile() {
        return this.state.file;
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get uploaded image data
     */
    getUploadedImageData() {
        return this.state.uploadedImageData;
    }

    /**
     * Reset component
     */
    reset() {
        this.removeImage();
        this.clearError();
        this.hideProgress();
    }
}

// Export for use in other modules
export { ImageUpload };