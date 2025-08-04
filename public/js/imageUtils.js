// public/js/imageUtils.js - Shared Image Utilities

/**
 * Image utility functions for upload, validation, and processing
 */

export const ImageUtils = {

    /**
     * API Configuration
     */
    API: {
        BASE_URL: window.CONFIG?.IMAGE_BASE_URL || 'http://localhost:5050/api/images',
        UPLOAD_ENDPOINT: window.CONFIG?.IMAGE_BASE_URL ? `${window.CONFIG.IMAGE_BASE_URL}/upload` : 'http://localhost:5050/api/images/upload',
        SERVE_ENDPOINT: window.CONFIG?.IMAGE_SERVE_URL || 'http://localhost:5050/api/images/serve',
        PERSON_IMAGES_ENDPOINT: window.CONFIG?.IMAGE_BASE_URL ? `${window.CONFIG.IMAGE_BASE_URL}/person` : 'http://localhost:5050/api/images/person'
    },

    /**
     * File validation constants
     */
    VALIDATION: {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp']
    },

    /**
     * Validate image file
     * @param {File} file - File to validate
     * @returns {Object} Validation result
     */
    validateImageFile(file) {
        if (!file) {
            return { valid: false, error: 'No file provided' };
        }

        // Check if it's a file object
        if (!(file instanceof File)) {
            return { valid: false, error: 'Invalid file object' };
        }

        // Check file type
        if (!this.VALIDATION.ALLOWED_TYPES.includes(file.type.toLowerCase())) {
            return {
                valid: false,
                error: `Invalid file type. Supported formats: ${this.VALIDATION.ALLOWED_TYPES.join(', ')}`
            };
        }

        // Check file size
        if (file.size > this.VALIDATION.MAX_FILE_SIZE) {
            const maxSizeMB = this.VALIDATION.MAX_FILE_SIZE / (1024 * 1024);
            return {
                valid: false,
                error: `File too large. Maximum size: ${maxSizeMB}MB`
            };
        }

        // Check file name
        if (!file.name || file.name.trim() === '') {
            return { valid: false, error: 'Invalid file name' };
        }

        return { valid: true };
    },

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted size string
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Generate image preview URL from file
     * @param {File} file - Image file
     * @returns {Promise<string>} Preview URL
     */
    generatePreviewUrl(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                resolve(e.target.result);
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsDataURL(file);
        });
    },

    /**
     * Upload image to server
     * @param {File} file - Image file to upload
     * @param {number} personId - ID of person (optional)
     * @param {Object} options - Upload options
     * @returns {Promise<Object>} Upload result
     */
    async uploadImage(file, personId = null, options = {}) {
        // Validate file first
        const validation = this.validateImageFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const formData = new FormData();
        formData.append('image', file);

        if (personId) {
            formData.append('personId', personId);
        }

        // Add any additional options
        if (options.cropData) {
            formData.append('cropData', JSON.stringify(options.cropData));
        }

        try {
            const response = await fetch(this.API.UPLOAD_ENDPOINT, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Upload failed: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Upload failed');
            }

            return result.data;

        } catch (error) {
            console.error('Image upload error:', error);
            throw error;
        }
    },

    /**
     * Get images for a person
     * @param {number} personId - Person ID
     * @returns {Promise<Array>} Array of image data
     */
    async getPersonImages(personId) {
        try {
            const response = await fetch(`${this.API.PERSON_IMAGES_ENDPOINT}/${personId}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch images: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Failed to fetch images');
            }

            return result.data || [];

        } catch (error) {
            console.error('Error fetching person images:', error);
            throw error;
        }
    },

    /**
     * Delete an image
     * @param {number} imageId - Image ID to delete
     * @returns {Promise<boolean>} Success status
     */
    async deleteImage(imageId) {
        try {
            const response = await fetch(`${this.API.BASE_URL}/${imageId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Failed to delete image: ${response.status}`);
            }

            const result = await response.json();
            return result.success;

        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    },

    /**
     * Generate image URL for serving
     * @param {string} filename - Image filename
     * @returns {string} Full image URL
     */
    getImageUrl(filename) {
        if (!filename) return '';
        return `${this.API.SERVE_ENDPOINT}/${filename}`;
    },

    /**
     * Generate avatar URL for person
     * @param {Object} imageData - Image data from API
     * @param {string} size - Size variant (thumbnail, medium, large)
     * @returns {string} Avatar URL
     */
    getAvatarUrl(imageData, size = 'thumbnail') {
        if (!imageData || !imageData.urls) {
            return this.getDefaultAvatarUrl();
        }

        return imageData.urls[size] || imageData.urls.thumbnail || this.getDefaultAvatarUrl();
    },

    /**
     * Get default avatar URL
     * @returns {string} Default avatar URL
     */
    getDefaultAvatarUrl() {
        return window.CONFIG?.DEFAULT_AVATAR_URL || "https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg";
    },

    /**
     * Create image element with fallback
     * @param {string} src - Image source URL
     * @param {Object} options - Image options
     * @returns {HTMLImageElement} Image element
     */
    createImageElement(src, options = {}) {
        const img = document.createElement('img');
        img.src = src || this.getDefaultAvatarUrl();
        img.alt = options.alt || 'Profile image';
        img.className = options.className || '';

        // Add error handler for fallback
        img.onerror = () => {
            if (img.src !== this.getDefaultAvatarUrl()) {
                img.src = this.getDefaultAvatarUrl();
            }
        };

        return img;
    },

    /**
     * Resize image to fit dimensions while maintaining aspect ratio
     * @param {string} imageUrl - Source image URL
     * @param {number} maxWidth - Maximum width
     * @param {number} maxHeight - Maximum height
     * @returns {Promise<string>} Resized image data URL
     */
    async resizeImage(imageUrl, maxWidth, maxHeight) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate new dimensions
                let { width, height } = img;

                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // Draw resized image
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageUrl;
        });
    },

    /**
     * Check if browser supports required features
     * @returns {Object} Feature support status
     */
    checkBrowserSupport() {
        return {
            fileAPI: !!(window.File && window.FileReader && window.FileList && window.Blob),
            dragDrop: 'draggable' in document.createElement('div'),
            canvas: !!document.createElement('canvas').getContext,
            fetch: typeof fetch !== 'undefined'
        };
    },

    /**
     * Show notification (integrate with your notification system)
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    showNotification(message, type = 'info') {
        // This should integrate with your existing notification system
        console.log(`${type.toUpperCase()}: ${message}`);

        // You can replace this with your app's notification system
        if (window.showNotification && typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        }
    }
};

// Default export for ES6 modules
export default ImageUtils;