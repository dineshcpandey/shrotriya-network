/**
 * This script ensures the family-chart.js library is properly initialized
 * and available globally for React components.
 * 
 * Add this script to your public folder and include it in your index.html
 * before your React application scripts.
 */

// Check if f3 is already available
if (typeof window.f3 === 'undefined') {
    console.warn('Family Chart library (f3) not found. Loading polyfill...');

    // Create a simple placeholder to prevent errors
    window.f3 = {
        createChart: function () {
            console.error('Family Chart library not properly loaded. Please check your script tags.');
            return {
                setCardXSpacing: function () { return this; },
                setCardYSpacing: function () { return this; },
                setCardDisplay: function () { return this; },
                setOrientationVertical: function () { return this; },
                setTransitionTime: function () { return this; },
                setCard: function () {
                    return {
                        setStyle: function () { return this; },
                        setMiniTree: function () { return this; },
                        setCardDim: function () { return this; },
                        setOnCardClick: function () { return this; },
                        setOnHoverPathToMain: function () { return this; }
                    };
                },
                updateTree: function () { return this; }
            };
        },
        CardHtml: {}
    };

    // Try to load the script dynamically
    const script = document.createElement('script');
    //script.src = './family-chart.min.js';
    script.src = './family-chart.js';
    script.async = true;
    script.onload = function () {
        console.log('Family Chart library loaded successfully.');
    };
    script.onerror = function () {
        console.error('Failed to load Family Chart library.');
    };
    document.head.appendChild(script);
}

console.log('Family Chart initialization complete.');