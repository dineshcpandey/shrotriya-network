// services/routeService.js
const pool = require('../config/db');
const { mapPersonToCustomStructure } = require('../mappers/personMapper');

/**
 * Build relationship graph from database
 * Returns adjacency list representation
 */
async function buildRelationshipGraph() {
    const relationships = new Map();

    try {
        // Get all parent-child relationships
        const parentChildQuery = `
            SELECT id, fatherid, motherid 
            FROM network.person 
            WHERE fatherid IS NOT NULL OR motherid IS NOT NULL
        `;
        const parentChildResult = await pool.query(parentChildQuery);

        // Get all marriage relationships
        const marriageQuery = `
            SELECT husbandid, wifeid 
            FROM network.marriages
        `;
        const marriageResult = await pool.query(marriageQuery);

        // Build adjacency list
        const addConnection = (personId, relatedId) => {
            if (!relationships.has(personId)) {
                relationships.set(personId, new Set());
            }
            if (!relationships.has(relatedId)) {
                relationships.set(relatedId, new Set());
            }
            relationships.get(personId).add(relatedId);
            relationships.get(relatedId).add(personId);
        };

        // Add parent-child relationships (bidirectional)
        for (const row of parentChildResult.rows) {
            if (row.fatherid) {
                addConnection(row.id, row.fatherid);
            }
            if (row.motherid) {
                addConnection(row.id, row.motherid);
            }
        }

        // Add marriage relationships (bidirectional)
        for (const row of marriageResult.rows) {
            addConnection(row.husbandid, row.wifeid);
        }

        console.log(`Built relationship graph with ${relationships.size} people`);
        return relationships;

    } catch (error) {
        console.error('Error building relationship graph:', error);
        throw error;
    }
}

/**
 * Find shortest path between two people using BFS
 * Returns array of person IDs in path
 */
async function findShortestPath(startPersonId, endPersonId) {
    if (startPersonId === endPersonId) {
        return [startPersonId];
    }

    const graph = await buildRelationshipGraph();
    const startId = parseInt(startPersonId);
    const endId = parseInt(endPersonId);

    // Check if both persons exist in graph
    if (!graph.has(startId) || !graph.has(endId)) {
        return []; // No path possible
    }

    // BFS implementation
    const queue = [startId];
    const visited = new Set([startId]);
    const parent = new Map();

    while (queue.length > 0) {
        const currentId = queue.shift();

        // If we reached the target, reconstruct path
        if (currentId === endId) {
            const path = [];
            let current = endId;

            while (current !== undefined) {
                path.unshift(current);
                current = parent.get(current);
            }

            return path;
        }

        // Explore neighbors
        const neighbors = graph.get(currentId) || new Set();
        for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) {
                visited.add(neighborId);
                parent.set(neighborId, currentId);
                queue.push(neighborId);
            }
        }
    }

    return []; // No path found
}

/**
 * Get full person data for a single person
 */
async function getPersonData(personId) {
    try {
        const personQuery = await pool.query(
            'SELECT * FROM network.person WHERE id = $1',
            [personId]
        );

        if (personQuery.rows.length === 0) return null;
        const person = personQuery.rows[0];

        // Get relationships
        const [spouses, children] = await Promise.all([
            getSpouses(personId),
            getChildren(personId)
        ]);

        return mapPersonToCustomStructure(person, {
            spouses,
            father: person.fatherid,
            mother: person.motherid,
            children
        });

    } catch (error) {
        console.error('Error getting person data:', error);
        throw error;
    }
}

/**
 * Get spouses for a person
 */
async function getSpouses(personId) {
    const result = await pool.query(
        `SELECT wifeid as spouseid FROM network.marriages 
         WHERE husbandid = $1 
         UNION
         SELECT husbandid as spouseid FROM network.marriages
         WHERE wifeid = $1`,
        [personId]
    );
    return result.rows.map(row => row.spouseid.toString());
}

/**
 * Get children for a person
 */
async function getChildren(personId) {
    const result = await pool.query(
        `SELECT id FROM network.person 
         WHERE fatherid = $1 OR motherid = $1`,
        [personId]
    );
    return result.rows.map(row => row.id.toString());
}

/**
 * Main function: Find route between two people and return full data
 */
async function findRouteBetweenPeople(startPersonId, endPersonId) {
    try {
        console.log(`Finding route from ${startPersonId} to ${endPersonId}`);

        // Find shortest path (array of person IDs)
        const pathIds = await findShortestPath(startPersonId, endPersonId);

        if (pathIds.length === 0) {
            console.log('No path found between the two people');
            return {
                path: [],
                pathExists: false,
                degreeOfSeparation: 0
            };
        }

        console.log(`Found path with ${pathIds.length} nodes:`, pathIds);

        // Get full person data for each person in path
        const pathData = [];
        for (const personId of pathIds) {
            const personData = await getPersonData(personId);
            if (personData) {
                pathData.push(personData);
            }
        }

        return {
            path: pathData,
            pathExists: true,
            degreeOfSeparation: pathIds.length - 1,
            pathIds: pathIds
        };

    } catch (error) {
        console.error('Error finding route between people:', error);
        throw error;
    }
}

/**
 * Optimized version using bidirectional BFS for better performance
 */
async function findShortestPathBidirectional(startPersonId, endPersonId) {
    if (startPersonId === endPersonId) {
        return [startPersonId];
    }

    const graph = await buildRelationshipGraph();
    const startId = parseInt(startPersonId);
    const endId = parseInt(endPersonId);

    if (!graph.has(startId) || !graph.has(endId)) {
        return [];
    }

    // Two-directional BFS
    const frontQueue = [startId];
    const backQueue = [endId];
    const frontVisited = new Map([[startId, null]]);
    const backVisited = new Map([[endId, null]]);

    while (frontQueue.length > 0 || backQueue.length > 0) {
        // Expand from start
        if (frontQueue.length > 0) {
            const currentId = frontQueue.shift();
            const neighbors = graph.get(currentId) || new Set();

            for (const neighborId of neighbors) {
                if (backVisited.has(neighborId)) {
                    // Found intersection - reconstruct path
                    return reconstructBidirectionalPath(
                        frontVisited, backVisited,
                        startId, endId, currentId, neighborId
                    );
                }

                if (!frontVisited.has(neighborId)) {
                    frontVisited.set(neighborId, currentId);
                    frontQueue.push(neighborId);
                }
            }
        }

        // Expand from end
        if (backQueue.length > 0) {
            const currentId = backQueue.shift();
            const neighbors = graph.get(currentId) || new Set();

            for (const neighborId of neighbors) {
                if (frontVisited.has(neighborId)) {
                    // Found intersection - reconstruct path
                    return reconstructBidirectionalPath(
                        frontVisited, backVisited,
                        startId, endId, neighborId, currentId
                    );
                }

                if (!backVisited.has(neighborId)) {
                    backVisited.set(neighborId, currentId);
                    backQueue.push(neighborId);
                }
            }
        }
    }

    return [];
}

/**
 * Reconstruct path from bidirectional BFS
 */
function reconstructBidirectionalPath(frontVisited, backVisited, startId, endId, meetingPoint1, meetingPoint2) {
    const path = [];

    // Build path from start to meeting point
    let current = meetingPoint1;
    while (current !== null) {
        path.unshift(current);
        current = frontVisited.get(current);
    }

    // Add meeting point 2 and build path to end
    path.push(meetingPoint2);
    current = backVisited.get(meetingPoint2);
    while (current !== null) {
        path.push(current);
        current = backVisited.get(current);
    }

    return path;
}

module.exports = {
    findRouteBetweenPeople,
    findShortestPath,
    findShortestPathBidirectional,
    buildRelationshipGraph
};