// Data utilities

/**
 * Merge network data with existing chart data
 * @param {Array} chartData - Existing chart data array
 * @param {Array} networkData - New network data to merge
 * @returns {Array} - Merged data
 */
export function mergeNetworkData(chartData, networkData) {
    // Clone the chart data to avoid mutating the original
    console.log("dataUtils.js: Merging network data", networkData.length, "items into chart data", chartData.length, "items");

    const updatedData = JSON.parse(JSON.stringify(chartData));

    // Process each person in the network data
    networkData.forEach(newPerson => {
        // Check if this person already exists in our chart data
        const existingPersonIndex = updatedData.findIndex(p => p.id === newPerson.id);

        if (existingPersonIndex >= 0) {
            // Person exists - merge the data and relationships
            const existingPerson = updatedData[existingPersonIndex];

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
            updatedData.push(newPerson);
        }
    });

    // After merging, clean up any invalid references and ensure bidirectional relationships
    const cleanedData = cleanInvalidReferences(updatedData);
    console.log("dataUtils.js: After merging, cleaned data has", cleanedData.length, "items");

    return cleanedData;
}

/**
 * Remove references to non-existent IDs
 * @param {Array} data - The chart data to clean
 * @returns {Array} - Cleaned data
 */
export function cleanInvalidReferences(data) {

    console.log("dataUtils.js: Cleaning invalid references from", data.length, "items");
    console.dir(data)
    // Clone the data to avoid unexpected mutations
    const processedData = JSON.parse(JSON.stringify(data));

    // Track all existing IDs
    const existingIds = new Set(processedData.map(item => item.id));

    // Clean up invalid references in each person's relationships
    processedData.forEach(person => {
        if (!person.rels) return;

        // Check and clean father reference
        if (person.rels.father && !existingIds.has(person.rels.father)) {
            console.log(`dataUtils.js: Removing invalid father reference: ${person.rels.father} for person ${person.id}`);
            delete person.rels.father;
        }

        // Check and clean mother reference
        if (person.rels.mother && !existingIds.has(person.rels.mother)) {
            console.log(`dataUtils.js: Removing invalid mother reference: ${person.rels.mother} for person ${person.id}`);
            delete person.rels.mother;
        }

        // Check and clean spouse references
        if (person.rels.spouses && Array.isArray(person.rels.spouses)) {
            person.rels.spouses = person.rels.spouses.filter(spouseId => {
                const isValid = existingIds.has(spouseId);
                if (!isValid) {
                    console.log(`dataUtils.js: Removing invalid spouse reference: ${spouseId} for person ${person.id}`);
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
                    console.log(`dataUtils.js: Removing invalid child reference: ${childId} for person ${person.id}`);
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
    return ensureBidirectionalRelationships(processedData);
}

/**
 * Ensure all relationships are properly connected in both directions
 * @param {Array} data - The chart data to process
 * @returns {Array} - Processed data with bidirectional relationships
 */
export function ensureBidirectionalRelationships(data) {
    console.log("dataUtils.js: Ensuring bidirectional relationships for", data.length, "items");

    // Clone the data to avoid unexpected mutations
    const processedData = JSON.parse(JSON.stringify(data));

    processedData.forEach(person => {
        if (!person.rels) {
            person.rels = {};
            return;
        }

        // Handle parent-child relationships
        if (person.rels.children && Array.isArray(person.rels.children)) {
            person.rels.children.forEach(childId => {
                const child = processedData.find(p => p.id === childId);
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
        if (person.rels.father) {
            const father = processedData.find(p => p.id === person.rels.father);
            if (father) {
                father.rels = father.rels || {};
                father.rels.children = father.rels.children || [];
                if (!father.rels.children.includes(person.id)) {
                    father.rels.children.push(person.id);
                }
            }
        }

        // Handle mother-child relationships
        if (person.rels.mother) {
            const mother = processedData.find(p => p.id === person.rels.mother);
            if (mother) {
                mother.rels = mother.rels || {};
                mother.rels.children = mother.rels.children || [];
                if (!mother.rels.children.includes(person.id)) {
                    mother.rels.children.push(person.id);
                }
            }
        }

        // Handle spouse relationships
        if (person.rels.spouses && Array.isArray(person.rels.spouses)) {
            person.rels.spouses.forEach(spouseId => {
                const spouse = processedData.find(p => p.id === spouseId);
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

    return processedData;
}