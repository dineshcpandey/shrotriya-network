// api-utils.js - Utility functions for making authenticated API requests

import { getAuthToken, getAuthHeaders, logout } from './auth.js';

// Base API URL for your backend
const API_BASE_URL = window.CONFIG?.BASE_URL || 'http://localhost:5050';

/**
 * Make an authenticated API request
 * @param {string} endpoint - The API endpoint (relative to API_BASE_URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} The fetch response
 */
export async function makeAuthenticatedRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const requestOptions = {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, requestOptions);

        // Check if token is expired (401 Unauthorized)
        if (response.status === 401) {
            console.warn('Authentication token expired, logging out user');
            await logout();
            throw new Error('Authentication expired. Please log in again.');
        }

        return response;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

/**
 * Make a GET request to an authenticated endpoint
 * @param {string} endpoint - The API endpoint
 * @returns {Promise<any>} The response data
 */
export async function apiGet(endpoint) {
    const response = await makeAuthenticatedRequest(endpoint, {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(`API GET request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Make a POST request to an authenticated endpoint
 * @param {string} endpoint - The API endpoint
 * @param {Object} data - The data to send
 * @returns {Promise<any>} The response data
 */
export async function apiPost(endpoint, data) {
    const response = await makeAuthenticatedRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`API POST request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Make a PUT request to an authenticated endpoint
 * @param {string} endpoint - The API endpoint
 * @param {Object} data - The data to send
 * @returns {Promise<any>} The response data
 */
export async function apiPut(endpoint, data) {
    const response = await makeAuthenticatedRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`API PUT request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Make a DELETE request to an authenticated endpoint
 * @param {string} endpoint - The API endpoint
 * @returns {Promise<any>} The response data
 */
export async function apiDelete(endpoint) {
    const response = await makeAuthenticatedRequest(endpoint, {
        method: 'DELETE'
    });

    if (!response.ok) {
        throw new Error(`API DELETE request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update the existing API functions to use authentication
 */

// Update your existing API_BASE_URL for details endpoints
const DETAILS_API_BASE_URL = window.CONFIG?.API_BASE_URL || 'http://localhost:5050/api/details';

/**
 * Fetch network data for a specific person (authenticated)
 * @param {string} personId - The ID of the person
 * @returns {Promise<Array>} The network data for the person
 */
export async function fetchNetworkData(personId) {
    try {
        const response = await makeAuthenticatedRequest(`/api/details/${personId}/network`);

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
 * Search for people by name (authenticated)
 * @param {string} name - Name to search for
 * @returns {Promise<Array>} Search results
 */
export async function searchByName(name) {
    try {
        const response = await makeAuthenticatedRequest(`/api/search?name=${encodeURIComponent(name)}`);

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
 * Search for people by location (authenticated)
 * @param {string} location - Location to search for
 * @returns {Promise<Array>} Search results
 */
export async function searchByLocation(location) {
    try {
        const response = await makeAuthenticatedRequest(`/api/search?location=${encodeURIComponent(location)}`);

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
 * Create a new person (authenticated)
 * @param {Object} personData - The person data
 * @returns {Promise<Object>} The created person
 */
export async function createPerson(personData) {
    try {
        const response = await makeAuthenticatedRequest('/api/persons', {
            method: 'POST',
            body: JSON.stringify(personData)
        });

        if (!response.ok) {
            throw new Error(`Create person API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Person created successfully:', data);
        return data;
    } catch (error) {
        console.error('Error creating person:', error);
        throw error;
    }
}

/**
 * Update an existing person (authenticated)
 * @param {string} personId - The ID of the person
 * @param {Object} personData - The updated person data
 * @returns {Promise<Object>} The updated person
 */
export async function updatePerson(personId, personData) {
    try {
        const response = await makeAuthenticatedRequest(`/api/persons/${personId}`, {
            method: 'PUT',
            body: JSON.stringify(personData)
        });

        if (!response.ok) {
            throw new Error(`Update person API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Person updated successfully:', data);
        return data;
    } catch (error) {
        console.error('Error updating person:', error);
        throw error;
    }
}

/**
 * Delete a person (authenticated)
 * @param {string} personId - The ID of the person
 * @returns {Promise<Object>} The deletion result
 */
export async function deletePerson(personId) {
    try {
        const response = await makeAuthenticatedRequest(`/api/persons/${personId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Delete person API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Person deleted successfully:', data);
        return data;
    } catch (error) {
        console.error('Error deleting person:', error);
        throw error;
    }
}

/**
 * Get marriages for a person (authenticated)
 * @param {string} personId - The ID of the person
 * @returns {Promise<Array>} The marriage records
 */
export async function getPersonMarriages(personId) {
    try {
        const response = await makeAuthenticatedRequest(`/api/marriages/person/${personId}`);

        if (!response.ok) {
            throw new Error(`Get marriages API error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Marriages for person ${personId}:`, data);
        return data;
    } catch (error) {
        console.error('Error getting person marriages:', error);
        throw error;
    }
}

/**
 * Create a new marriage record (authenticated)
 * @param {Object} marriageData - The marriage data
 * @returns {Promise<Object>} The created marriage record
 */
export async function createMarriage(marriageData) {
    try {
        const response = await makeAuthenticatedRequest('/api/marriages', {
            method: 'POST',
            body: JSON.stringify(marriageData)
        });

        if (!response.ok) {
            throw new Error(`Create marriage API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Marriage created successfully:', data);
        return data;
    } catch (error) {
        console.error('Error creating marriage:', error);
        throw error;
    }
}

// public/js/api-utils.js (Updated sections)

/**
 * Search for people by name and/or location (either can be blank)
 * @param {string} name - Name to search for (optional)
 * @param {string} location - Location to search for (optional)
 * @returns {Promise<Array>} Search results
 */
export async function searchPeople(name = '', location = '') {
    try {
        const params = new URLSearchParams();

        if (name && name.trim() !== '') {
            params.append('name', name.trim());
        }

        if (location && location.trim() !== '') {
            params.append('location', location.trim());
        }

        const response = await makeAuthenticatedRequest(`/api/search?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`Search API error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Search results for name "${name}" and location "${location}":`, data.length, 'items');
        return data;
    } catch (error) {
        console.error('Error searching people:', error);
        throw error;
    }
}

/**
 * Get location suggestions for type-ahead functionality
 * @param {string} query - Search query for locations
 * @returns {Promise<Array>} Array of location names
 */
export async function fetchLocationSuggestions(query = '') {
    try {
        console.log(`Fetching location suggestions for query: "${query}"`);
        const params = new URLSearchParams();

        if (query && query.trim() !== '') {
            params.append('query', query.trim());
        }

        const url = `/api/search/locations?${params.toString()}`;
        console.log(`Making request to: ${url}`);

        const response = await makeAuthenticatedRequest(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Location API error: ${response.status} - ${errorText}`);
            throw new Error(`Location API error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Location suggestions for query "${query}":`, data.length, 'items');
        console.log('Location suggestions data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching location suggestions:', error);
        throw error;
    }
}


/**
 * Find route between two people (add this function to your existing api-utils.js)
 * @param {string} person1Id - ID of first person
 * @param {string} person2Id - ID of second person  
 * @returns {Promise<Object>} Route data
 */
export async function findRouteBetweenPeople(person1Id, person2Id) {
    try {
        const response = await makeAuthenticatedRequest(`/api/details/${person1Id}/route/${person2Id}`);

        if (!response.ok) {
            throw new Error(`Route API error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Route found between ${person1Id} and ${person2Id}:`, data);
        return data;
    } catch (error) {
        console.error('Error finding route between people:', error);
        throw error;
    }
}