// Global event handlers

/**
 * Set up global event listeners
 */
export function setupEventListeners() {
    // Add escape key handler to close modals/panels
    document.addEventListener('keydown', handleKeydown);

    // Add resize handler
    window.addEventListener('resize', handleResize);

    console.log('Global event handlers initialized');
}

/**
 * Handle keyboard events
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeydown(e) {
    // Close edit form with escape key
    if (e.key === 'Escape') {
        const editForm = document.getElementById('edit-form');
        if (editForm && editForm.classList.contains('visible')) {
            const closeBtn = document.getElementById('close-edit-form');
            if (closeBtn) {
                closeBtn.click();
            }
        }
    }
}

/**
 * Handle window resize
 */
function handleResize() {
    // Could add responsive adjustments here if needed
}