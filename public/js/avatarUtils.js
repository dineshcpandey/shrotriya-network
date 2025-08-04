// public/js/avatarUtils.js - Utility functions for avatar display with fallback

/**
 * Avatar utility functions for consistent image display across the application
 */
export const AvatarUtils = {

    /**
     * Default avatar URL
     */
    DEFAULT_AVATAR: "https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg",

    /**
     * Get avatar URL from person data with fallback logic
     * @param {Object} person - Person data object
     * @returns {string} Avatar URL
     */
    getAvatarUrl(person) {
        // Handle different data structures
        const personData = person.data || person;

        // Priority 1: Check for uploaded profile image
        if (personData.profile_image_url) {
            return this.normalizeImageUrl(personData.profile_image_url, personData.profile_image_filename);
        }

        // Priority 2: Chart data structure avatar
        if (personData.avatar && personData.avatar !== this.DEFAULT_AVATAR) {
            return personData.avatar;
        }

        // Priority 3: Facebook profile picture
        if (personData.fb_id) {
            return `https://graph.facebook.com/${personData.fb_id}/picture`;
        }

        // Priority 4: Default avatar
        return this.DEFAULT_AVATAR;
    },

    /**
     * Normalize image URL to proper format
     * @param {string} imageUrl - Image URL from database
     * @param {string} filename - Image filename
     * @returns {string} Normalized URL
     */
    normalizeImageUrl(imageUrl, filename) {
        if (!imageUrl) return this.DEFAULT_AVATAR;

        // If it's already a full URL, return as-is
        if (imageUrl.startsWith('http')) {
            return imageUrl;
        }

        // If it's a relative path starting with /uploads/
        if (imageUrl.startsWith('/uploads/')) {
            // Extract filename from path
            const extractedFilename = imageUrl.split('/').pop();
            return `http://localhost:5050/api/images/serve/${extractedFilename}`;
        }

        // If we have a filename, use it directly
        if (filename) {
            return `http://localhost:5050/api/images/serve/${filename}`;
        }

        // Fallback: treat as filename
        return `http://localhost:5050/api/images/serve/${imageUrl}`;
    },

    /**
     * Get initials from person name
     * @param {Object} person - Person data object
     * @returns {string} Initials
     */
    getInitials(person) {
        const personData = person.data || person;
        const firstName = personData['first name'] || personData.personname || '';
        const lastName = personData['last name'] || '';

        const name = `${firstName} ${lastName}`.trim();
        if (!name) return '?';

        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();
    },

    /**
     * Get gender class for styling
     * @param {Object} person - Person data object
     * @returns {string} Gender class
     */
    getGenderClass(person) {
        const personData = person.data || person;
        const gender = personData.gender || '';

        if (gender === 'M' || gender === 'male') return 'male';
        if (gender === 'F' || gender === 'female') return 'female';
        return 'unknown';
    },

    /**
     * Create avatar element with proper fallback
     * @param {Object} person - Person data object
     * @param {Object} options - Options for avatar creation
     * @returns {HTMLElement} Avatar element
     */
    createAvatarElement(person, options = {}) {
        const {
            size = 'medium',
            className = '',
            showInitials = true,
            onClick = null
        } = options;

        const avatarUrl = this.getAvatarUrl(person);
        const initials = this.getInitials(person);
        const genderClass = this.getGenderClass(person);

        const avatarDiv = document.createElement('div');
        avatarDiv.className = `avatar-container ${genderClass} ${className}`;

        if (onClick) {
            avatarDiv.style.cursor = 'pointer';
            avatarDiv.addEventListener('click', onClick);
        }

        // Try to load the image
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = this.getPersonName(person);
        img.className = `avatar-image ${size}`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%';

        // Create fallback element
        const fallback = document.createElement('div');
        fallback.className = `avatar-fallback ${size}`;
        fallback.textContent = initials;
        fallback.style.display = 'none';
        fallback.style.width = '100%';
        fallback.style.height = '100%';
        fallback.style.borderRadius = '50%';
        fallback.style.display = 'flex';
        fallback.style.alignItems = 'center';
        fallback.style.justifyContent = 'center';
        fallback.style.color = 'white';
        fallback.style.fontWeight = 'bold';

        // Set fallback background based on gender
        if (genderClass === 'male') {
            fallback.style.background = 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)';
        } else if (genderClass === 'female') {
            fallback.style.background = 'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)';
        } else {
            fallback.style.background = 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
        }

        // Handle image load errors
        img.onerror = () => {
            img.style.display = 'none';
            fallback.style.display = 'flex';
        };

        // Handle image load success
        img.onload = () => {
            img.style.display = 'block';
            fallback.style.display = 'none';
        };

        avatarDiv.appendChild(img);
        avatarDiv.appendChild(fallback);

        return avatarDiv;
    },

    /**
     * Create avatar HTML string (for cases where you need HTML string)
     * @param {Object} person - Person data object
     * @param {Object} options - Options for avatar creation
     * @returns {string} Avatar HTML string
     */
    createAvatarHTML(person, options = {}) {
        const {
            size = 'medium',
            className = '',
            showInitials = true
        } = options;

        const avatarUrl = this.getAvatarUrl(person);
        const initials = this.getInitials(person);
        const genderClass = this.getGenderClass(person);
        const personName = this.getPersonName(person);

        return `
            <div class="avatar-container ${genderClass} ${className}">
                <img src="${avatarUrl}" 
                     alt="${personName}" 
                     class="avatar-image ${size}"
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="avatar-fallback ${size} ${genderClass}" 
                     style="display: none; width: 100%; height: 100%; border-radius: 50%; 
                            align-items: center; justify-content: center; color: white; font-weight: bold;
                            background: ${this.getGenderBackground(genderClass)};">
                    ${initials}
                </div>
            </div>
        `;
    },

    /**
     * Get person name from data
     * @param {Object} person - Person data object
     * @returns {string} Person name
     */
    getPersonName(person) {
        const personData = person.data || person;
        const firstName = personData['first name'] || '';
        const lastName = personData['last name'] || '';
        const fullName = `${firstName} ${lastName}`.trim();

        if (fullName) return fullName;
        if (personData.personname) return personData.personname;
        return 'Unknown';
    },

    /**
     * Get gender background gradient
     * @param {string} genderClass - Gender class
     * @returns {string} CSS gradient
     */
    getGenderBackground(genderClass) {
        if (genderClass === 'male') {
            return 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)';
        } else if (genderClass === 'female') {
            return 'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)';
        } else {
            return 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
        }
    },

    /**
     * Update existing avatar element with new person data
     * @param {HTMLElement} element - Avatar element to update
     * @param {Object} person - Person data object
     */
    updateAvatarElement(element, person) {
        if (!element) return;

        const img = element.querySelector('.avatar-image');
        const fallback = element.querySelector('.avatar-fallback');

        if (img) {
            img.src = this.getAvatarUrl(person);
            img.alt = this.getPersonName(person);
        }

        if (fallback) {
            fallback.textContent = this.getInitials(person);
            const genderClass = this.getGenderClass(person);
            fallback.style.background = this.getGenderBackground(genderClass);
        }

        // Update container class
        const genderClass = this.getGenderClass(person);
        element.className = element.className.replace(/(male|female|unknown)/, genderClass);
    }
};