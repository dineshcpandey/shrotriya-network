// Visualization Controls Module
// Provides multiple view modes, layouts, and interactive features for the family tree

import { getChartInstance } from './chart.js';

// Visualization modes enum
export const VISUALIZATION_MODES = {
    OVERVIEW: 'overview',
    FOCUS: 'focus',
    DETAIL: 'detail',
    COMPACT: 'compact'
};

// Layout types enum
export const LAYOUT_TYPES = {
    VERTICAL: 'vertical',
    HORIZONTAL: 'horizontal',
    RADIAL: 'radial',
    NETWORK: 'network'
};

// Card styles enum
export const CARD_STYLES = {
    RECTANGULAR: 'rectangular',
    CIRCULAR: 'circular',
    MINIMAL: 'minimal',
    EXTENDED: 'extended'
};

// Custom card templates for different visualization styles
export const CARD_TEMPLATES = {
    RECTANGULAR: {
        template: 'rectangular',
        dimensions: { w: 250, h: 150 },
        displayFields: [["first name", "last name"], ["birthday"]]
    },
    CIRCULAR: {
        template: 'circular',
        dimensions: { w: 120, h: 120 },
        displayFields: [["first name"]]
    },
    MINIMAL: {
        template: 'minimal',
        dimensions: { w: 200, h: 80 },
        displayFields: [["first name", "last name"]]
    },
    EXTENDED: {
        template: 'extended',
        dimensions: { w: 300, h: 200 },
        displayFields: [["first name", "last name"], ["birthday"], ["location"], ["work"]]
    },
    COMPACT: {
        template: 'compact',
        dimensions: { w: 150, h: 100 },
        displayFields: [["first name"]]
    }
};

// Global state
let currentChart = null;
let currentData = [];
let focusPersonId = null;
let visualizationState = {
    mode: VISUALIZATION_MODES.DETAIL,
    layout: LAYOUT_TYPES.VERTICAL,
    cardStyle: CARD_STYLES.MINIMAL,
    maxGenerations: 0,
    showCollapsed: false,
    animationSpeed: 1000,
    cardDimensions: { w: 200, h: 80 },
    spacing: { x: 230, y: 110 }


};

/**
 * Clear old rectangular preferences to force new minimal defaults
 */
function clearOldPreferences() {
    try {
        const savedPreferences = localStorage.getItem('familyTree_vizPreferences');
        if (savedPreferences) {
            const preferences = JSON.parse(savedPreferences);

            // Check if saved preferences are old rectangular defaults
            if (preferences.cardStyle === 'rectangular' &&
                preferences.cardDimensions?.w === 250 &&
                preferences.cardDimensions?.h === 150) {
                console.log('🔄 Clearing old rectangular default preferences');
                localStorage.removeItem('familyTree_vizPreferences');
                return true;
            }
        }
    } catch (error) {
        console.error('Error checking old preferences:', error);
        localStorage.removeItem('familyTree_vizPreferences');
    }
    return false;
}

/**
 * Initialize visualization controls
 * @param {Object} chart - The family tree chart instance
 * @param {Array} data - The chart data
 */
export function initializeVisualizationControls(chart, data) {
    currentChart = chart;
    currentData = data;

    console.log('🔧 Initial visualization state:', visualizationState);

    createVisualizationUI();
    setupEventListeners();
    setupKeyboardShortcuts();
    setupAdvancedInteractions();
    startPerformanceMonitoring();

    // Load preferences AFTER setting up UI
    loadVisualizationPreferences();

    console.log('🔧 Final visualization state after loading preferences:', visualizationState);

    // Create mini map if enabled
    if (visualizationState.showMiniMap) {
        setTimeout(createMiniMap, 1000); // Delay to ensure chart is rendered
    }

    console.log('Visualization controls initialized with advanced features');
}

/**
 * Create the visualization control UI
 */
function createVisualizationUI() {
    // Remove existing controls if any
    const existingControls = document.getElementById('visualization-controls');
    if (existingControls) {
        existingControls.remove();
    }

    // Create main controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'visualization-controls';
    controlsContainer.className = 'viz-controls-container';

    controlsContainer.innerHTML = `
        <div class="viz-controls-header">
            <h3>🔧 Visualization Controls</h3>
            <button class="viz-toggle-btn" id="viz-toggle">⚙️</button>
        </div>
        
        <div class="viz-controls-content" id="viz-controls-content">
            <!-- View Mode Section -->
            <div class="viz-section">
                <h4>📋 View Mode</h4>
                <div class="viz-button-group">
                    <button class="viz-btn" data-mode="overview" title="Show entire family tree">Overview</button>
                    <button class="viz-btn" data-mode="focus" title="Focus on selected person">Focus</button>
                    <button class="viz-btn active" data-mode="detail" title="Detailed view with all information">Detail</button>
                    <button class="viz-btn" data-mode="compact" title="Compact view for large families">Compact</button>
                </div>
            </div>
            
            <!-- Layout Section -->
            <div class="viz-section">
                <h4>🏗️ Layout</h4>
                <div class="viz-button-group">
                    <button class="viz-btn layout-btn active" data-layout="vertical" title="Traditional vertical family tree">Vertical</button>
                    <button class="viz-btn layout-btn" data-layout="horizontal" title="Horizontal family tree">Horizontal</button>
                    <button class="viz-btn layout-btn" data-layout="radial" title="Radial layout centered on focus person">Radial</button>
                </div>
            </div>
            
            <!-- Card Style Section -->
            <div class="viz-section">
                <h4>🃏 Card Style</h4>
                <div class="viz-button-group">
                    <button class="viz-btn card-btn" data-card="rectangular" title="Standard rectangular cards">Rectangle</button>
                    <button class="viz-btn card-btn" data-card="circular" title="Circular avatar cards">Circle</button>
                    <button class="viz-btn card-btn active" data-card="minimal" title="Minimal information cards">Minimal</button>
                    <button class="viz-btn card-btn" data-card="extended" title="Extended information cards">Extended</button>
                </div>
            </div>
            
            <!-- Controls Section -->
            <div class="viz-section">
                <h4>🎛️ Controls</h4>
                
                <div class="viz-control-row">
                    <label for="max-generations">Max Generations:</label>
                    <select id="max-generations">
                        <option value="0">All</option>
                        <option value="1">1 Generation</option>
                        <option value="2">2 Generations</option>
                        <option value="3">3 Generations</option>
                        <option value="4">4 Generations</option>
                    </select>
                </div>
                
                <div class="viz-control-row">
                    <label for="animation-speed">Animation Speed:</label>
                    <input type="range" id="animation-speed" min="200" max="2000" value="1000" step="100">
                    <span id="speed-value">1000ms</span>
                </div>
                
                <div class="viz-control-row">
                    <label for="card-spacing">Card Spacing:</label>
                    <input type="range" id="card-spacing" min="150" max="400" value="230" step="10">
                    <span id="spacing-value">230px</span>
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="viz-section">
                <h4>⚡ Actions</h4>
                <div class="viz-action-buttons">
                    <button class="viz-action-btn" id="center-chart" title="Center chart on main person">📍 Center</button>
                    <button class="viz-action-btn" id="fit-screen" title="Fit entire tree to screen">🔍 Fit to Screen</button>
                    <button class="viz-action-btn" id="export-view" title="Export current view">💾 Export</button>
                    <button class="viz-action-btn" id="reset-view" title="Reset to default view">🔄 Reset</button>
                    <button class="viz-action-btn" id="show-shortcuts" title="Show keyboard shortcuts">⌨️ Shortcuts</button>
                    <button class="viz-action-btn" id="fullscreen-mode" title="Toggle fullscreen mode">🖥️ Fullscreen</button>
                </div>
            </div>
            
            <!-- Mini Map -->
            <div class="viz-section">
                <h4>🗺️ Mini Map</h4>
                <div class="mini-map-container" id="mini-map"></div>
                <div class="viz-control-row">
                    <label>
                        <input type="checkbox" id="show-minimap" checked> Show Mini Map
                    </label>
                </div>
            </div>
        </div>
    `;

    // Insert controls into the page
    const targetContainer = document.querySelector('.app-main') || document.querySelector('.main-content') || document.body;
    targetContainer.appendChild(controlsContainer);
}

/**
 * Setup event listeners for all controls
 */
function setupEventListeners() {
    // Toggle controls visibility
    document.getElementById('viz-toggle').addEventListener('click', toggleControls);

    // View mode buttons
    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.addEventListener('click', (e) => handleModeChange(e.target.dataset.mode));
    });

    // Layout buttons
    document.querySelectorAll('[data-layout]').forEach(btn => {
        btn.addEventListener('click', (e) => handleLayoutChange(e.target.dataset.layout));
    });

    // Card style buttons
    document.querySelectorAll('[data-card]').forEach(btn => {
        btn.addEventListener('click', (e) => handleCardStyleChange(e.target.dataset.card));
    });

    // Range controls
    document.getElementById('animation-speed').addEventListener('input', handleAnimationSpeedChange);
    document.getElementById('card-spacing').addEventListener('input', handleSpacingChange);

    // Select controls
    document.getElementById('max-generations').addEventListener('change', handleMaxGenerationsChange);

    // Action buttons
    document.getElementById('center-chart').addEventListener('click', centerChart);
    document.getElementById('fit-screen').addEventListener('click', fitToScreen);
    document.getElementById('export-view').addEventListener('click', exportView);
    document.getElementById('reset-view').addEventListener('click', resetView);
    document.getElementById('show-shortcuts').addEventListener('click', toggleKeyboardHelp);
    document.getElementById('fullscreen-mode').addEventListener('click', toggleFullscreen);

    // Mini map toggle
    document.getElementById('show-minimap').addEventListener('change', toggleMiniMap);
}

/**
 * Toggle controls panel visibility
 */
function toggleControls() {
    const content = document.getElementById('viz-controls-content');
    const toggle = document.getElementById('viz-toggle');

    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '⚙️';
    } else {
        content.style.display = 'none';
        toggle.textContent = '📊';
    }
}

/**
 * Handle view mode changes
 */
function handleModeChange(mode) {
    visualizationState.mode = mode;

    // Update active button
    document.querySelectorAll('[data-mode]').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

    // Apply mode-specific configurations
    switch (mode) {
        case VISUALIZATION_MODES.OVERVIEW:
            applyOverviewMode();
            break;
        case VISUALIZATION_MODES.FOCUS:
            applyFocusMode();
            break;
        case VISUALIZATION_MODES.DETAIL:
            applyDetailMode();
            break;
        case VISUALIZATION_MODES.COMPACT:
            applyCompactMode();
            break;
    }

    updateChart();
}

/**
 * Handle layout changes
 */
function handleLayoutChange(layout) {
    visualizationState.layout = layout;

    // Update active button
    document.querySelectorAll('[data-layout]').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-layout="${layout}"]`).classList.add('active');

    applyLayoutChange(layout);
    updateChart();
}

/**
 * Handle card style changes
 */
function handleCardStyleChange(cardStyle) {
    visualizationState.cardStyle = cardStyle;

    // Update active button
    document.querySelectorAll('[data-card]').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-card="${cardStyle}"]`).classList.add('active');

    applyCardStyleChange(cardStyle);
    updateChart();

    // Save preferences when card style changes
    saveVisualizationPreferences();
}

/**
 * Apply overview mode settings
 */
function applyOverviewMode() {
    visualizationState.cardDimensions = { w: 180, h: 120 };
    visualizationState.spacing = { x: 200, y: 140 };
    visualizationState.maxGenerations = 0;
    visualizationState.showCollapsed = true;
}

/**
 * Apply focus mode settings
 */
function applyFocusMode() {
    if (!focusPersonId || !currentData) return;

    const focusPerson = currentData.find(p => p.id === focusPersonId);
    if (!focusPerson) return;

    // Mark focus person as main
    currentData.forEach(p => {
        p.data.main = false;
    });
    focusPerson.data.main = true;

    // Filter to show only immediate family
    const immediateFamilyIds = new Set([focusPersonId]);

    // Add parents
    if (focusPerson.rels.father) immediateFamilyIds.add(focusPerson.rels.father);
    if (focusPerson.rels.mother) immediateFamilyIds.add(focusPerson.rels.mother);

    // Add spouses
    if (focusPerson.rels.spouses) {
        focusPerson.rels.spouses.forEach(id => immediateFamilyIds.add(id));
    }

    // Add children
    if (focusPerson.rels.children) {
        focusPerson.rels.children.forEach(id => immediateFamilyIds.add(id));
    }

    // Add siblings (people with same parents)
    currentData.forEach(person => {
        if (person.id !== focusPersonId &&
            ((person.rels.father && person.rels.father === focusPerson.rels.father) ||
                (person.rels.mother && person.rels.mother === focusPerson.rels.mother))) {
            immediateFamilyIds.add(person.id);
        }
    });

    const filteredData = currentData.filter(person => immediateFamilyIds.has(person.id));

    if (currentChart) {
        currentChart.updateData(filteredData);
        currentChart.updateTree();
    }
}

/**
 * Apply detail mode settings
 */
function applyDetailMode() {
    // Keep current card style when switching to detail mode
    console.log('Applying detail mode with current card style:', visualizationState.cardStyle);
    if (visualizationState.cardStyle === CARD_STYLES.MINIMAL) {
        visualizationState.cardDimensions = { w: 200, h: 80 };
        visualizationState.spacing = { x: 230, y: 110 };
    } else {
        visualizationState.cardDimensions = { w: 250, h: 150 };
        visualizationState.spacing = { x: 280, y: 180 };
    }
    visualizationState.maxGenerations = 0;
    visualizationState.showCollapsed = false;
}

/**
 * Apply compact mode settings
 */
function applyCompactMode() {
    visualizationState.cardDimensions = { w: 150, h: 100 };
    visualizationState.spacing = { x: 170, y: 120 };
    visualizationState.maxGenerations = 0;
    visualizationState.showCollapsed = true;
}

/**
 * Apply layout changes
 */
function applyLayoutChange(layout) {
    if (!currentChart) return;

    switch (layout) {
        case LAYOUT_TYPES.VERTICAL:
            currentChart.setOrientationVertical();
            break;
        case LAYOUT_TYPES.HORIZONTAL:
            currentChart.setOrientationHorizontal();
            break;
        case LAYOUT_TYPES.RADIAL:
            // Radial layout would require custom implementation
            console.log('Radial layout - coming soon');
            break;
    }
}

/**
 * Apply card style changes
 */
function applyCardStyleChange(cardStyle) {
    if (!currentChart) return;

    // Update card dimensions based on style
    switch (cardStyle) {
        case CARD_STYLES.CIRCULAR:
            visualizationState.cardDimensions = { w: 120, h: 120 };
            break;
        case CARD_STYLES.MINIMAL:
            visualizationState.cardDimensions = { w: 200, h: 80 };
            break;
        case CARD_STYLES.EXTENDED:
            visualizationState.cardDimensions = { w: 300, h: 200 };
            break;
        default: // RECTANGULAR
            visualizationState.cardDimensions = { w: 250, h: 150 };
    }
}

/**
 * Handle animation speed changes
 */
function handleAnimationSpeedChange(e) {
    const speed = parseInt(e.target.value);
    visualizationState.animationSpeed = speed;
    document.getElementById('speed-value').textContent = `${speed}ms`;

    if (currentChart) {
        currentChart.setTransitionTime(speed);
    }
}

/**
 * Handle spacing changes
 */
function handleSpacingChange(e) {
    const spacing = parseInt(e.target.value);
    visualizationState.spacing.x = spacing;
    visualizationState.spacing.y = Math.round(spacing * 0.7); // Maintain aspect ratio

    document.getElementById('spacing-value').textContent = `${spacing}px`;
    updateChart();
}

/**
 * Handle max generations changes
 */
function handleMaxGenerationsChange(e) {
    visualizationState.maxGenerations = parseInt(e.target.value);
    updateChart();
}

/**
 * Update the chart with current visualization settings
 */
function updateChart() {
    if (!currentChart) return;

    try {
        // Get chart instances
        const chartInstance = getChartInstance();

        // Apply spacing and transition settings to chart
        currentChart
            .setCardXSpacing(visualizationState.spacing.x)
            .setCardYSpacing(visualizationState.spacing.y)
            .setTransitionTime(visualizationState.animationSpeed);

        // Apply card dimensions to card instance
        if (chartInstance.card) {
            chartInstance.card.setCardDim(visualizationState.cardDimensions);
        }

        // Update the chart
        currentChart.updateTree();

        console.log('Chart updated with new visualization settings');
    } catch (error) {
        console.error('Error updating chart:', error);
    }
}

/**
 * Center chart on main person
 */
function centerChart() {
    if (currentChart && currentChart.cardToMiddle) {
        currentChart.cardToMiddle();
    }
}

/**
 * Fit chart to screen
 */
function fitToScreen() {
    if (currentChart && currentChart.treeFit) {
        currentChart.treeFit();
    }
}

/**
 * Export current view
 */
function exportView() {
    exportFamilyTree('png');
}

/**
 * Reset view to defaults
 */
function resetView() {
    visualizationState = {
        mode: VISUALIZATION_MODES.DETAIL,
        layout: LAYOUT_TYPES.VERTICAL,
        cardStyle: CARD_STYLES.MINIMAL,
        maxGenerations: 0,
        showCollapsed: false,
        animationSpeed: 1000,
        cardDimensions: { w: 200, h: 80 },
        spacing: { x: 230, y: 110 }
    };

    // Reset UI controls
    document.querySelector('[data-mode="detail"]').classList.add('active');
    document.querySelectorAll('[data-mode]').forEach(btn => {
        if (btn.dataset.mode !== 'detail') btn.classList.remove('active');
    });

    document.querySelector('[data-layout="vertical"]').classList.add('active');
    document.querySelectorAll('[data-layout]').forEach(btn => {
        if (btn.dataset.layout !== 'vertical') btn.classList.remove('active');
    });

    document.querySelector('[data-card="minimal"]').classList.add('active');
    document.querySelectorAll('[data-card]').forEach(btn => {
        if (btn.dataset.card !== 'minimal') btn.classList.remove('active');
    });

    // Reset controls
    document.getElementById('animation-speed').value = 1000;
    document.getElementById('speed-value').textContent = '1000ms';
    document.getElementById('card-spacing').value = 230;
    document.getElementById('spacing-value').textContent = '230px';
    document.getElementById('max-generations').value = 0;

    updateChart();
}

/**
 * Toggle mini map visibility
 */
function toggleMiniMap(e) {
    const showMiniMap = e.target.checked;
    const miniMapContainer = document.getElementById('mini-map');

    if (showMiniMap) {
        miniMapContainer.style.display = 'block';
        // Initialize mini map if needed
    } else {
        miniMapContainer.style.display = 'none';
    }
}

/**
 * Set focus person for focus mode
 */
export function setFocusPerson(personId) {
    focusPersonId = personId;

    if (visualizationState.mode === VISUALIZATION_MODES.FOCUS) {
        updateChart();
    }
}

/**
 * Get current visualization state
 */
export function getVisualizationState() {
    return { ...visualizationState };
}

/**
 * Update data reference
 */
export function updateData(newData) {
    currentData = newData;
}

/**
 * Apply visualization configuration to chart
 */
export function applyVisualizationConfig() {
    if (!currentChart) return;

    try {
        // Get chart instances
        const chartInstance = getChartInstance();

        // Apply spacing and transition settings to chart
        currentChart
            .setCardXSpacing(visualizationState.spacing.x)
            .setCardYSpacing(visualizationState.spacing.y)
            .setTransitionTime(visualizationState.animationSpeed);

        // Apply card dimensions to card instance
        if (chartInstance.card) {
            chartInstance.card.setCardDim(visualizationState.cardDimensions);
        }

        console.log('Applied visualization configuration');
    } catch (error) {
        console.error('Error applying visualization config:', error);
    }
}

/**
 * Generation filtering functionality
 */
function applyGenerationFiltering(data, maxGenerations, focusPersonId) {
    if (maxGenerations === 0) return data; // Show all

    if (!focusPersonId) {
        // If no focus person, find the main person or use first person
        const mainPerson = data.find(p => p.data.main) || data[0];
        focusPersonId = mainPerson?.id;
    }

    if (!focusPersonId) return data;

    const filteredPeople = new Set();
    const queue = [{ id: focusPersonId, generation: 0 }];

    while (queue.length > 0) {
        const { id, generation } = queue.shift();

        if (generation > maxGenerations) continue;

        filteredPeople.add(id);
        const person = data.find(p => p.id === id);

        if (person && generation < maxGenerations) {
            // Add parents
            if (person.rels.father) queue.push({ id: person.rels.father, generation: generation + 1 });
            if (person.rels.mother) queue.push({ id: person.rels.mother, generation: generation + 1 });

            // Add children
            if (person.rels.children) {
                person.rels.children.forEach(childId => {
                    queue.push({ id: childId, generation: generation + 1 });
                });
            }

            // Add spouses
            if (person.rels.spouses) {
                person.rels.spouses.forEach(spouseId => {
                    queue.push({ id: spouseId, generation: generation });
                });
            }
        }
    }

    return data.filter(person => filteredPeople.has(person.id));
}

/**
 * Collapse/expand functionality for family branches
 */
function toggleFamilyBranch(personId, collapse = true) {
    if (!currentChart) return;

    const person = currentData.find(p => p.id === personId);
    if (!person) return;

    // Toggle the collapsed state
    if (collapse) {
        if (!person.data._rels) person.data._rels = {};

        // Hide children
        if (person.rels.children && person.rels.children.length > 0) {
            person.data._rels.children = [...person.rels.children];
            person.rels.children = [];
        }
    } else {
        // Show children
        if (person.data._rels && person.data._rels.children) {
            person.rels.children = [...person.data._rels.children];
            delete person.data._rels.children;
        }
    }

    currentChart.updateData(currentData);
    currentChart.updateTree();
}

/**
 * Advanced search and highlight functionality
 */
function highlightPerson(personId) {
    if (!currentChart) return;

    // Remove existing highlights
    document.querySelectorAll('.person-card.highlighted').forEach(card => {
        card.classList.remove('highlighted');
    });

    // Add highlight to specific person
    const personCard = document.querySelector(`[data-id="${personId}"]`);
    if (personCard) {
        personCard.classList.add('highlighted');

        // Scroll to person
        personCard.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

/**
 * Export functionality
 */
function exportFamilyTree(format = 'png') {
    const svg = document.querySelector('#FamilyChart svg');
    if (!svg) {
        showNotification('No family tree to export', 'error');
        return;
    }

    try {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function () {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const link = document.createElement('a');
            link.download = `family-tree-${new Date().toISOString().split('T')[0]}.${format}`;
            link.href = canvas.toDataURL(`image/${format}`);
            link.click();

            showNotification('Family tree exported successfully!', 'success');
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Export failed. Please try again.', 'error');
    }
}

/**
 * Mini map implementation
 */
function createMiniMap() {
    const miniMapContainer = document.getElementById('mini-map');
    if (!miniMapContainer || !currentChart) return;

    miniMapContainer.innerHTML = '';

    // Create simplified version of the family tree
    const miniMapData = currentData.map(person => ({
        id: person.id,
        x: person.x || 0,
        y: person.y || 0,
        name: person.data['first name'] || 'Unknown'
    }));

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 300 120');

    miniMapData.forEach(person => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', (person.x / 10) + 150);
        circle.setAttribute('cy', (person.y / 10) + 60);
        circle.setAttribute('r', '3');
        circle.setAttribute('fill', 'rgba(255, 255, 255, 0.7)');
        circle.setAttribute('stroke', 'rgba(255, 255, 255, 0.9)');
        circle.setAttribute('stroke-width', '0.5');
        circle.style.cursor = 'pointer';

        circle.addEventListener('click', () => {
            setFocusPerson(person.id);
            if (currentChart.cardToCenter) {
                currentChart.cardToCenter(person.id);
            }
        });

        svg.appendChild(circle);
    });

    miniMapContainer.appendChild(svg);
}

/**
 * Keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Only trigger if not typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key.toLowerCase()) {
            case 'c':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    centerChart();
                }
                break;
            case 'f':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    fitToScreen();
                }
                break;
            case 'r':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    resetView();
                }
                break;
            case 'e':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    exportView();
                }
                break;
            case '1':
                handleModeChange(VISUALIZATION_MODES.OVERVIEW);
                break;
            case '2':
                handleModeChange(VISUALIZATION_MODES.FOCUS);
                break;
            case '3':
                handleModeChange(VISUALIZATION_MODES.DETAIL);
                break;
            case '4':
                handleModeChange(VISUALIZATION_MODES.COMPACT);
                break;
        }
    });
}

/**
 * Toggle keyboard shortcuts help
 */
function toggleKeyboardHelp() {
    let helpElement = document.querySelector('.viz-keyboard-help');

    if (!helpElement) {
        // Create keyboard help element
        helpElement = document.createElement('div');
        helpElement.className = 'viz-keyboard-help';
        helpElement.innerHTML = `
            <h4>⌨️ Keyboard Shortcuts</h4>
            <ul>
                <li><span>Ctrl+C</span> <span class="key">Center Chart</span></li>
                <li><span>Ctrl+F</span> <span class="key">Fit to Screen</span></li>
                <li><span>Ctrl+R</span> <span class="key">Reset View</span></li>
                <li><span>Ctrl+E</span> <span class="key">Export</span></li>
                <li><span>1</span> <span class="key">Overview Mode</span></li>
                <li><span>2</span> <span class="key">Focus Mode</span></li>
                <li><span>3</span> <span class="key">Detail Mode</span></li>
                <li><span>4</span> <span class="key">Compact Mode</span></li>
                <li><span>Esc</span> <span class="key">Close Help</span></li>
            </ul>
        `;
        document.body.appendChild(helpElement);

        // Close on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && helpElement.classList.contains('show')) {
                helpElement.classList.remove('show');
            }
        });

        // Close when clicking outside
        helpElement.addEventListener('click', function (e) {
            if (e.target === helpElement) {
                helpElement.classList.remove('show');
            }
        });
    }

    helpElement.classList.toggle('show');
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
    const chartContainer = document.getElementById('FamilyChart');
    if (!chartContainer) return;

    if (!document.fullscreenElement) {
        chartContainer.requestFullscreen().then(() => {
            showNotification('Entered fullscreen mode. Press Esc to exit.', 'info');
        }).catch(err => {
            showNotification('Could not enter fullscreen mode.', 'error');
        });
    } else {
        document.exitFullscreen();
    }
}

/**
 * Auto-save visualization preferences
 */
function saveVisualizationPreferences() {
    const preferences = {
        mode: visualizationState.mode,
        layout: visualizationState.layout,
        cardStyle: visualizationState.cardStyle,
        spacing: visualizationState.spacing,
        animationSpeed: visualizationState.animationSpeed,
        showMiniMap: visualizationState.showMiniMap,
        maxGenerations: visualizationState.maxGenerations
    };

    localStorage.setItem('familyTree_vizPreferences', JSON.stringify(preferences));
}

/**
 * Load visualization preferences
 */
function loadVisualizationPreferences() {
    try {
        const saved = localStorage.getItem('familyTree_vizPreferences');
        if (saved) {
            const preferences = JSON.parse(saved);

            // Only load preferences if they don't conflict with new defaults
            // This ensures new minimal default takes precedence over old rectangular preferences
            if (preferences.cardStyle === CARD_STYLES.RECTANGULAR) {
                console.log('Ignoring old rectangular preference, using new minimal default');
                // Don't load old rectangular preferences, keep minimal as default
                return;
            }

            // Apply saved preferences only if they match current defaults or are intentional changes
            Object.assign(visualizationState, preferences);

            // Update UI to match loaded preferences
            updateUIFromState();

            console.log('Loaded visualization preferences');
        }
    } catch (error) {
        console.warn('Could not load visualization preferences:', error);
    }
}

/**
 * Update UI controls to match current state
 */
function updateUIFromState() {
    // Update mode buttons
    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === visualizationState.mode);
    });

    // Update layout buttons
    document.querySelectorAll('[data-layout]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layout === visualizationState.layout);
    });

    // Update card style buttons
    document.querySelectorAll('[data-card]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.card === visualizationState.cardStyle);
    });

    // Update controls
    const animationSlider = document.getElementById('animation-speed');
    const spacingSlider = document.getElementById('card-spacing');
    const generationsSelect = document.getElementById('max-generations');
    const miniMapCheckbox = document.getElementById('show-minimap');

    if (animationSlider) {
        animationSlider.value = visualizationState.animationSpeed;
        document.getElementById('speed-value').textContent = `${visualizationState.animationSpeed}ms`;
    }

    if (spacingSlider) {
        spacingSlider.value = visualizationState.spacing.x;
        document.getElementById('spacing-value').textContent = `${visualizationState.spacing.x}px`;
    }

    if (generationsSelect) {
        generationsSelect.value = visualizationState.maxGenerations;
    }

    if (miniMapCheckbox) {
        miniMapCheckbox.checked = visualizationState.showMiniMap;
    }
}

/**
 * Performance monitoring
 */
function startPerformanceMonitoring() {
    let frameCount = 0;
    let lastTime = performance.now();

    function measureFPS() {
        frameCount++;
        const currentTime = performance.now();

        if (currentTime - lastTime >= 1000) {
            const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));

            // Update performance indicator if exists
            const perfIndicator = document.getElementById('performance-indicator');
            if (perfIndicator) {
                perfIndicator.textContent = `${fps} FPS`;
                perfIndicator.className = fps > 30 ? 'good' : fps > 15 ? 'okay' : 'poor';
            }

            frameCount = 0;
            lastTime = currentTime;
        }

        requestAnimationFrame(measureFPS);
    }

    requestAnimationFrame(measureFPS);
}

/**
 * Advanced chart interactions
 */
function setupAdvancedInteractions() {
    if (!currentChart) return;

    // Double-click to focus
    document.addEventListener('dblclick', (e) => {
        const personCard = e.target.closest('.person-card');
        if (personCard && personCard.dataset.id) {
            setFocusPerson(personCard.dataset.id);
            handleModeChange(VISUALIZATION_MODES.FOCUS);
        }
    });

    // Right-click context menu
    document.addEventListener('contextmenu', (e) => {
        const personCard = e.target.closest('.person-card');
        if (personCard && personCard.dataset.id) {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY, personCard.dataset.id);
        }
    });
}

/**
 * Show context menu for person card
 */
function showContextMenu(x, y, personId) {
    // Remove existing context menu
    document.querySelectorAll('.context-menu').forEach(menu => menu.remove());

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.innerHTML = `
        <div class="context-menu-item" data-action="focus">🎯 Focus on Person</div>
        <div class="context-menu-item" data-action="highlight">✨ Highlight Person</div>
        <div class="context-menu-item" data-action="hide">👁️ Hide Branch</div>
        <div class="context-menu-item" data-action="export-branch">📤 Export Branch</div>
    `;

    // Add event listeners
    menu.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action) {
            handleContextMenuAction(action, personId);
            menu.remove();
        }
    });

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', () => menu.remove(), { once: true });
    }, 100);

    document.body.appendChild(menu);
}

/**
 * Handle context menu actions
 */
function handleContextMenuAction(action, personId) {
    switch (action) {
        case 'focus':
            setFocusPerson(personId);
            handleModeChange(VISUALIZATION_MODES.FOCUS);
            break;
        case 'highlight':
            highlightPerson(personId);
            break;
        case 'hide':
            toggleFamilyBranch(personId, true);
            break;
        case 'export-branch':
            // Implementation for exporting specific branch
            showNotification('Branch export feature coming soon!', 'info');
            break;
    }
}

// Enhanced notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.viz-notification').forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `viz-notification viz-notification-${type}`;
    notification.innerHTML = `
        <div class="viz-notification-content">
            <span class="viz-notification-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span class="viz-notification-message">${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}