// Configuration file for frontend environment variables
// Since frontend JavaScript can't directly access .env files, we define the configuration here

// You can override these values by setting them in your deployment environment
const CONFIG = {
    API_BASE_URL: window.API_BASE_URL || 'http://localhost:5050/api/details',
    AUTH_BASE_URL: window.AUTH_BASE_URL || 'http://localhost:5050/auth',
    IMAGE_BASE_URL: window.IMAGE_BASE_URL || 'http://localhost:5050/api/images',
    IMAGE_SERVE_URL: window.IMAGE_SERVE_URL || 'http://localhost:5050/api/images/serve',
    BASE_URL: window.BASE_URL || 'http://localhost:5050',
    DEFAULT_AVATAR_URL: window.DEFAULT_AVATAR_URL || 'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg',
    FACEBOOK_GRAPH_URL: window.FACEBOOK_GRAPH_URL || 'https://graph.facebook.com'
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Make available globally
window.CONFIG = CONFIG;
