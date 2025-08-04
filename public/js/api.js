// API service functions

const API_BASE_URL = window.CONFIG?.API_BASE_URL || 'http://localhost:5050/api/details';
//const API_BASE_URL = 'http://192.168.1.37:5050/api/details';


/**
 * Fetch initial family tree data
 * @returns {Promise<Array>} The initial chart data
 */
export async function fetchInitialData() {
    try {
        const response = await fetch('./data/data6.json');
        if (!response.ok) {
            throw new Error(`Failed to load initial data: ${response.status}`);
        }
        const data = await response.json();
        console.log('Initial data loaded:', data.length, 'items');
        return data;
    } catch (error) {
        console.error('Error fetching initial data:', error);
        throw error;
    }
}

/**
 * Fetch network data for a specific person
 * @param {string} personId - The ID of the person
 * @returns {Promise<Array>} The network data for the person
 */
export async function fetchNetworkData(personId) {
    try {
        const response = await fetch(`${API_BASE_URL}/${personId}/network`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        console.log(`API.js Received network data for ID ${personId}:`, data.length, 'items');
        return data;
    } catch (error) {
        console.error('Error fetching network data:', error);
        throw error;
    }
}

/**
 * Search for people by name
 * @param {string} name - Name to search for
 * @returns {Promise<Array>} Search results
 */
export async function searchByName(name) {
    try {
        const response = await fetch(`${API_BASE_URL}/search?name=${encodeURIComponent(name)}`);
        if (!response.ok) {
            throw new Error(`Search API error: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Search results for name "${name}":`, data.length, 'items');
        return data;
    } catch (error) {
        console.error('Error searching by name:', error);
        throw error;
    }
}

/**
 * Search for people by location
 * @param {string} location - Location to search for
 * @returns {Promise<Array>} Search results
 */
export async function searchByLocation(location) {
    try {
        const response = await fetch(`${API_BASE_URL}/search?location=${encodeURIComponent(location)}`);
        if (!response.ok) {
            throw new Error(`Search API error: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Search results for location "${location}":`, data.length, 'items');
        return data;
    } catch (error) {
        console.error('Error searching by location:', error);
        throw error;
    }
}

/**
 * Update person data
 * @param {string} personId - The ID of the person to update
 * @param {Object} personData - The updated person data
 * @returns {Promise<Object>} The updated person data
 */
export async function updatePersonData(personId, personData) {
    try {
        // Format the data according to the API requirements
        const apiPayload = formatPersonDataForApi(personData);

        // Make the PUT request
        const response = await fetch(`${API_BASE_URL}/${personId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiPayload)
        });

        if (!response.ok) {
            throw new Error(`Update API error: ${response.status}`);
        }

        // Get the response data - this will be in flat format from the API
        const flatData = await response.json();
        console.log(`API returned flat data for ID ${personId}:`, flatData);

        // Convert the flat data to the nested structure needed by the chart
        const nestedData = {
            id: flatData.id.toString(),
            data: {
                "first name": flatData.personname ? flatData.personname.split(' ')[0] : '',
                "last name": flatData.personname ? flatData.personname.split(' ').slice(1).join(' ') : '',
                "gender": flatData.gender || '',
                "birthday": flatData.birthdate || null,
                "location": flatData.currentlocation || '',
                "work": flatData.worksat || '',
                "avatar": personData.data?.avatar || (window.CONFIG?.DEFAULT_AVATAR_URL || "https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg"),
                "contact": {
                    "email": flatData.mail_id || '',
                    "phone": flatData.phone || ''
                },
                "nativePlace": flatData.nativeplace || ''
            },
            rels: {
                "father": flatData.fatherid ? flatData.fatherid.toString() : null,
                "mother": flatData.motherid ? flatData.motherid.toString() : null,
                "spouses": flatData.spouseid ? [flatData.spouseid.toString()] : [],
                // Preserve children from the original data since it may not be in the API response
                "children": personData.rels?.children || []
            }
        };

        console.log(`Converted to nested structure for chart library:`, nestedData);
        return nestedData;
    } catch (error) {
        console.error('Error updating person data:', error);
        throw error;
    }
}


/**
 * Format person data for API
 * @param {Object} personData - The person data from the chart
 * @returns {Object} Formatted data for the API
 */

function formatPersonDataForApi(personData) {
    // Extract data from the nested structure
    const firstName = personData.data?.["first name"] || "";
    const lastName = personData.data?.["last name"] || "";
    const gender = personData.data?.gender || "";
    const location = personData.data?.location || "";
    const birthday = personData.data?.birthday || null;
    const work = personData.data?.work || null;

    // Extract relationship info from the nested structure
    const rels = personData.rels || {};
    const fatherId = rels.father || null;
    const motherId = rels.mother || null;
    const spouseId = rels.spouses && rels.spouses.length > 0 ? rels.spouses[0] : null;

    // Create the API payload with all possible fields
    return {
        personname: `${firstName} ${lastName}`.trim(),
        birthdate: birthday,
        gender: gender,
        currentlocation: location,
        fatherid: fatherId,
        motherid: motherId,
        spouseid: spouseId,
        worksat: work,
        nativeplace: personData.data?.nativePlace || null,
        phone: personData.data?.contact?.phone || null,
        mail_id: personData.data?.contact?.email || null,
        living: "Y",
        // Include the original data structure for reference
        data: personData.data || {},
        rels: rels || {}
    };
}

/**
 * Create a new person with relationship data
 * @param {Object} personData - The person data to create
 * @returns {Promise<Object>} The created person data
 */
export async function createNewPerson(personData) {
    try {
        // Format the data according to the API requirements
        const apiPayload = formatPersonDataForApi(personData);

        // Make the POST request to create the new person
        const response = await fetch(`${API_BASE_URL}/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiPayload)
        });

        if (!response.ok) {
            throw new Error(`Create person API error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Created new person:`, data);
        return data;
    } catch (error) {
        console.error('Error creating new person:', error);
        throw error;
    }
}