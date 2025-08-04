// Global variables
let chartData = [];
let f3Chart;
let loadingIndicator;
const API_BASE_URL = 'http://localhost:5050/api/details';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Load initial data
    loadInitialData();

    // Setup loading indicator reference
    loadingIndicator = document.getElementById('loading-indicator');
});

// Function to load initial data
function loadInitialData() {
    fetch('./data/data5.json')
        .then(res => res.json())
        .then(data => {
            // Initialize with the data
            chartData = data;
            createChart(chartData);
            document.getElementById('data-source-indicator').textContent = 'Initial data loaded';
        })
        .catch(err => console.error('Failed to load initial data', err));
}

// Function to fetch network data from the API
async function fetchNetworkData(personId) {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/${personId}/network`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const networkData = await response.json();
        console.log(`Family-Chart-app.js ---Received network data for ID ${personId}:`, networkData);

        // Merge this data with existing data
        mergeNetworkData(networkData);

        // Update the chart
        updateChart();

        document.getElementById('data-source-indicator').textContent =
            `Network data loaded for ID: ${personId}`;
    } catch (error) {
        console.error('Error fetching network data:', error);
        document.getElementById('data-source-indicator').textContent =
            `Error loading network for ID: ${personId}`;
    } finally {
        showLoading(false);
    }
}

// Function to merge network data with existing chart data
function mergeNetworkData(networkData) {
    // Process each person in the network data
    console.log("mergeNetworkData New Data")
    console.dir(networkData)
    console.log("mergeNetworkData chartData")
    console.dir(chartData)
    networkData.forEach(newPerson => {
        // Check if this person already exists in our chart data
        const existingPersonIndex = chartData.findIndex(p => p.id === newPerson.id);

        if (existingPersonIndex >= 0) {
            // Person exists - merge the data and relationships
            const existingPerson = chartData[existingPersonIndex];

            // Merge data properties
            existingPerson.data = { ...existingPerson.data, ...newPerson.data };

            // Merge relationships carefully
            existingPerson.rels = existingPerson.rels || {};
            if (newPerson.rels) {
                // Handle father
                if (newPerson.rels.father) {
                    existingPerson.rels.father = newPerson.rels.father;
                }

                // Handle mother
                if (newPerson.rels.mother) {
                    existingPerson.rels.mother = newPerson.rels.mother;
                }

                // Handle spouses as an array
                if (newPerson.rels.spouses && newPerson.rels.spouses.length > 0) {
                    existingPerson.rels.spouses = existingPerson.rels.spouses || [];
                    newPerson.rels.spouses.forEach(spouseId => {
                        if (!existingPerson.rels.spouses.includes(spouseId)) {
                            existingPerson.rels.spouses.push(spouseId);
                        }
                    });
                }

                // Handle children as an array
                if (newPerson.rels.children && newPerson.rels.children.length > 0) {
                    existingPerson.rels.children = existingPerson.rels.children || [];
                    newPerson.rels.children.forEach(childId => {
                        if (!existingPerson.rels.children.includes(childId)) {
                            existingPerson.rels.children.push(childId);
                        }
                    });
                }
            }
        } else {
            // This is a new person - add to chart data
            chartData.push(newPerson);
        }
    });

    // After merging, clean up any invalid references
    chartData = cleanInvalidReferences(chartData);
}

// Function to remove references to non-existent IDs
function cleanInvalidReferences(data) {
    // Clone the data to avoid unexpected mutations
    console.dir(data)
    const processedData = JSON.parse(JSON.stringify(data));

    // Track all existing IDs
    const existingIds = new Set(processedData.map(item => item.id));

    // Clean up invalid references in each person's relationships
    processedData.forEach(person => {
        if (!person.rels) return;

        // Check and clean father reference
        if (person.rels.father && !existingIds.has(person.rels.father)) {
            console.log(`Removing invalid father reference: ${person.rels.father} for person ${person.id}`);
            delete person.rels.father;
        }

        // Check and clean mother reference
        if (person.rels.mother && !existingIds.has(person.rels.mother)) {
            console.log(`Removing invalid mother reference: ${person.rels.mother} for person ${person.id}`);
            delete person.rels.mother;
        }

        // Check and clean spouse references
        if (person.rels.spouses && Array.isArray(person.rels.spouses)) {
            person.rels.spouses = person.rels.spouses.filter(spouseId => {
                const isValid = existingIds.has(spouseId);
                if (!isValid) {
                    console.log(`Removing invalid spouse reference: ${spouseId} for person ${person.id}`);
                }
                return isValid;
            });
            // If no spouses left, remove the property
            if (person.rels.spouses.length === 0) {
                delete person.rels.spouses;
            }
        }

        // Check and clean children references
        if (person.rels.children && Array.isArray(person.rels.children)) {
            person.rels.children = person.rels.children.filter(childId => {
                const isValid = existingIds.has(childId);
                if (!isValid) {
                    console.log(`family-chart-app.js -- Removing invalid child reference: ${childId} for person ${person.id}`);
                }
                return isValid;
            });
            // If no children left, remove the property
            if (person.rels.children.length === 0) {
                delete person.rels.children;
            }
        }
    });

    // Ensure bidirectional relationships
    ensureBidirectionalRelationships(processedData);

    return processedData;
}

// Function to ensure all relationships are properly connected in both directions
function ensureBidirectionalRelationships(data) {
    data.forEach(person => {
        const rels = person.rels || {};

        // Handle parent-child relationships
        if (rels.children && Array.isArray(rels.children)) {
            rels.children.forEach(childId => {
                const child = data.find(p => p.id === childId);
                if (child) {
                    child.rels = child.rels || {};
                    if (person.data.gender === "M" && child.rels.father !== person.id) {
                        child.rels.father = person.id;
                    } else if (person.data.gender === "F" && child.rels.mother !== person.id) {
                        child.rels.mother = person.id;
                    }
                }
            });
        }

        // Handle father-child relationships
        if (rels.father) {
            const father = data.find(p => p.id === rels.father);
            if (father) {
                father.rels = father.rels || {};
                father.rels.children = father.rels.children || [];
                if (!father.rels.children.includes(person.id)) {
                    father.rels.children.push(person.id);
                }
            }
        }

        // Handle mother-child relationships
        if (rels.mother) {
            const mother = data.find(p => p.id === rels.mother);
            if (mother) {
                mother.rels = mother.rels || {};
                mother.rels.children = mother.rels.children || [];
                if (!mother.rels.children.includes(person.id)) {
                    mother.rels.children.push(person.id);
                }
            }
        }

        // Handle spouse relationships
        if (rels.spouses && Array.isArray(rels.spouses)) {
            rels.spouses.forEach(spouseId => {
                const spouse = data.find(p => p.id === spouseId);
                if (spouse) {
                    spouse.rels = spouse.rels || {};
                    spouse.rels.spouses = spouse.rels.spouses || [];
                    if (!spouse.rels.spouses.includes(person.id)) {
                        spouse.rels.spouses.push(person.id);
                    }
                }
            });
        }
    });
}

// Function to update existing chart with new data
function updateChart() {
    if (f3Chart) {
        f3Chart.updateData(chartData);
        f3Chart.updateTree({ initial: true });
    }
}

// Show or hide loading indicator
function showLoading(show) {
    if (show) {
        loadingIndicator.style.display = 'block';
    } else {
        loadingIndicator.style.display = 'none';
    }
}

// Create chart function
function createChart(data) {
    f3Chart = f3.createChart('#FamilyChart', data)
        .setTransitionTime(1000)
        .setCardXSpacing(250)
        .setCardYSpacing(150)
        .setOrientationVertical()
        .setSingleParentEmptyCard(false);

    const f3Card = f3Chart.setCard(f3.CardHtml)
        .setCardDisplay([["first name", "last name"], ["birthday"]])
        .setCardDim({})
        .setMiniTree(true)
        .setStyle('imageRect')
        .setOnHoverPathToMain();

    const f3EditTree = f3Chart.editTree()
        .fixed(true)
        .setFields(["first name", "last name", "birthday", "avatar"])
        .setEditFirst(true);

    f3EditTree.setEdit();

    f3Card.setOnCardClick((e, d) => {
        console.log("Card clicked - ID:", d.data.id);

        // Fetch network data for this person
        fetchNetworkData(d.data.id);

        // Still allow the original functionality
        if (f3EditTree.isAddingRelative()) return;
        f3Card.onCardClickDefault(e, d);
    });

    f3Chart.updateTree({ initial: true });
    f3EditTree.open(f3Chart.getMainDatum());

    // Create UI buttons
    createUIControls();
}

// Create UI control buttons
function createUIControls() {
    console.log("createUIControls -->")
    const chartContainer = document.getElementById("FamilyChart");

    // Create reset button
    const resetBtn = document.createElement('button');
    resetBtn.innerText = 'Reset Chart';
    resetBtn.className = 'switch-data-btn';
    resetBtn.onclick = () => {
        loadInitialData();
    };
    chartContainer.appendChild(resetBtn);

    // Download Button
    const downloadBtn = document.createElement('button');
    downloadBtn.innerText = 'Download JSON';
    downloadBtn.className = 'download-btn';
    downloadBtn.onclick = () => {
        const blob = new Blob([JSON.stringify(chartData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `family-chart-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    chartContainer.appendChild(downloadBtn);
}