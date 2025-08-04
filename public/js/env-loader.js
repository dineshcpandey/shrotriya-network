// Environment variables loader for frontend
// This script should be loaded before any other scripts that need configuration

(function () {
    // Function to load environment variables from server
    async function loadEnvironmentConfig() {
        try {
            // Try to fetch environment config from server
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();

                // Merge with default config
                window.CONFIG = {
                    ...window.CONFIG,
                    ...config
                };

                console.log('Environment configuration loaded from server');
                return;
            }
        } catch (error) {
            console.log('Could not load config from server, using defaults');
        }

        // Fallback to default configuration if server config is not available
        if (!window.CONFIG) {
            console.log('Using default configuration');
        }
    }

    // Load config when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadEnvironmentConfig);
    } else {
        loadEnvironmentConfig();
    }
})();
