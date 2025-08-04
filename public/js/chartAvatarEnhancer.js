// public/js/chartAvatarEnhancer.js - Enhance chart with proper avatar display

import { AvatarUtils } from './avatarUtils.js';

/**
 * Chart Avatar Enhancer - Enhances the family tree chart with proper avatar display
 * This module intercepts chart rendering and ensures proper image display with fallbacks
 */
export const ChartAvatarEnhancer = {

    /**
     * Initialize the chart avatar enhancer
     */
    init() {
        console.log('Chart Avatar Enhancer initialized');
        this.setupMutationObserver();
        this.enhanceExistingAvatars();
    },

    /**
     * Setup mutation observer to watch for new chart nodes
     */
    setupMutationObserver() {
        const chartContainer = document.getElementById('FamilyChart');
        if (!chartContainer) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.enhanceAvatarsInElement(node);
                        }
                    });
                }
            });
        });

        observer.observe(chartContainer, {
            childList: true,
            subtree: true
        });
    },

    /**
     * Enhance existing avatars in the chart
     */
    enhanceExistingAvatars() {
        const chartContainer = document.getElementById('FamilyChart');
        if (chartContainer) {
            this.enhanceAvatarsInElement(chartContainer);
        }
    },

    /**
     * Enhance avatars in a specific element
     * @param {Element} element - The element to enhance
     */
    enhanceAvatarsInElement(element) {
        // Find all chart cards
        const chartCards = element.querySelectorAll('.f3 .card');
        chartCards.forEach(card => this.enhanceChartCard(card));

        // Find all images in chart cards
        const chartImages = element.querySelectorAll('.f3 .card img');
        chartImages.forEach(img => this.enhanceChartImage(img));
    },

    /**
     * Enhance a single chart card
     * @param {Element} card - The chart card element
     */
    enhanceChartCard(card) {
        if (!card.dataset.enhanced) {
            // Get person data from the card
            const personData = this.extractPersonDataFromCard(card);

            if (personData) {
                // Find the image element
                const img = card.querySelector('img');
                if (img) {
                    this.enhanceChartImage(img, personData);
                }

                // Mark as enhanced
                card.dataset.enhanced = 'true';
            }
        }
    },

    /**
     * Extract person data from chart card
     * @param {Element} card - The chart card element
     * @returns {Object|null} Person data object
     */
    extractPersonDataFromCard(card) {
        try {
            // Try to get person data from various sources
            const personId = card.dataset.personId || card.id;

            // If we have access to chart data, get person from there
            if (typeof chartData !== 'undefined' && chartData) {
                const person = chartData.find(p => p.id === personId);
                if (person) return person;
            }

            // Otherwise, extract from DOM
            const nameElement = card.querySelector('.card-label');
            const name = nameElement ? nameElement.textContent.trim() : '';

            // Try to determine gender from card classes
            let gender = 'U';
            if (card.classList.contains('card-male')) gender = 'M';
            else if (card.classList.contains('card-female')) gender = 'F';

            return {
                id: personId,
                data: {
                    'first name': name.split(' ')[0] || '',
                    'last name': name.split(' ').slice(1).join(' ') || '',
                    'gender': gender,
                    'avatar': card.querySelector('img')?.src || ''
                }
            };
        } catch (error) {
            console.warn('Could not extract person data from card:', error);
            return null;
        }
    },

    /**
     * Enhance a chart image with proper fallback
     * @param {HTMLImageElement} img - The image element
     * @param {Object} personData - Person data (optional)
     */
    enhanceChartImage(img, personData = null) {
        if (img.dataset.enhanced) return;

        // Mark as enhanced to prevent duplicate processing
        img.dataset.enhanced = 'true';

        // Get person data if not provided
        if (!personData) {
            const card = img.closest('.card');
            if (card) {
                personData = this.extractPersonDataFromCard(card);
            }
        }

        // Get the proper avatar URL
        const avatarUrl = personData ? AvatarUtils.getAvatarUrl(personData) : img.src;

        // Update the image source if it's different
        if (avatarUrl && avatarUrl !== img.src) {
            img.src = avatarUrl;
        }

        // Create fallback element
        const fallback = this.createChartFallback(img, personData);

        // Handle image load errors
        img.onerror = () => {
            console.warn('Chart image failed to load:', img.src);
            this.showFallback(img, fallback);
        };

        // Handle successful load
        img.onload = () => {
            this.hideFallback(fallback);
        };

        // Insert fallback element
        if (fallback && img.parentNode) {
            img.parentNode.insertBefore(fallback, img.nextSibling);
        }
    },

    /**
     * Create fallback element for chart image
     * @param {HTMLImageElement} img - The image element
     * @param {Object} personData - Person data
     * @returns {HTMLElement} Fallback element
     */
    createChartFallback(img, personData) {
        const fallback = document.createElement('div');
        fallback.className = 'chart-avatar-fallback';
        fallback.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: none;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 24px;
            border-radius: 50%;
            background: ${this.getGenderGradient(personData)};
            z-index: 1;
        `;

        // Add initials
        const initials = personData ? AvatarUtils.getInitials(personData) : '?';
        fallback.textContent = initials;

        return fallback;
    },

    /**
     * Get gender gradient for fallback
     * @param {Object} personData - Person data
     * @returns {string} CSS gradient
     */
    getGenderGradient(personData) {
        if (!personData) return 'linear-gradient(135deg, #6c757d, #495057)';

        const genderClass = AvatarUtils.getGenderClass(personData);
        return AvatarUtils.getGenderBackground(genderClass);
    },

    /**
     * Show fallback element
     * @param {HTMLImageElement} img - The image element
     * @param {HTMLElement} fallback - The fallback element
     */
    showFallback(img, fallback) {
        if (fallback) {
            img.style.display = 'none';
            fallback.style.display = 'flex';
        }
    },

    /**
     * Hide fallback element
     * @param {HTMLElement} fallback - The fallback element
     */
    hideFallback(fallback) {
        if (fallback) {
            fallback.style.display = 'none';
        }
    },

    /**
     * Update chart person data (call when person data changes)
     * @param {Object} personData - Updated person data
     */
    updatePersonData(personData) {
        if (!personData || !personData.id) return;

        // Find the chart card for this person
        const chartContainer = document.getElementById('FamilyChart');
        if (!chartContainer) return;

        const card = chartContainer.querySelector(`[data-person-id="${personData.id}"], #${personData.id}`);
        if (!card) return;

        // Reset enhancement flag
        card.dataset.enhanced = 'false';

        // Find and update the image
        const img = card.querySelector('img');
        if (img) {
            img.dataset.enhanced = 'false';
            this.enhanceChartImage(img, personData);
        }
    },

    /**
     * Refresh all chart avatars
     */
    refreshAllAvatars() {
        const chartContainer = document.getElementById('FamilyChart');
        if (!chartContainer) return;

        // Reset all enhancement flags
        chartContainer.querySelectorAll('[data-enhanced]').forEach(el => {
            el.dataset.enhanced = 'false';
        });

        // Re-enhance all avatars
        this.enhanceExistingAvatars();
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ChartAvatarEnhancer.init();
});

// Also initialize if the script is loaded after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ChartAvatarEnhancer.init();
    });
} else {
    ChartAvatarEnhancer.init();
}