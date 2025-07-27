// routes/routeController.js
const express = require('express');
const { findRouteBetweenPeople, buildRelationshipGraph } = require('../services/routeService');

const router = express.Router();

/**
 * Find route between two people
 * GET /api/details/:id1/route/:id2
 */
router.get('/:id1/route/:id2', async (req, res) => {
    try {
        const { id1, id2 } = req.params;

        // Validate IDs
        const personId1 = parseInt(id1);
        const personId2 = parseInt(id2);

        if (isNaN(personId1) || isNaN(personId2)) {
            return res.status(400).json({
                error: 'Invalid person IDs provided'
            });
        }

        console.log(`Finding route from person ${personId1} to person ${personId2}`);

        // Find route between people
        const result = await findRouteBetweenPeople(personId1, personId2);

        if (!result.pathExists) {
            return res.status(404).json({
                message: 'No connection found between the two people',
                pathExists: false,
                degreeOfSeparation: 0,
                path: []
            });
        }

        // Return the path data in the same format as /network endpoint
        res.json({
            pathExists: true,
            degreeOfSeparation: result.degreeOfSeparation,
            pathIds: result.pathIds,
            path: result.path  // Array of person objects in your existing format
        });

    } catch (error) {
        console.error('Error finding route:', error);
        res.status(500).json({
            error: 'Internal server error while finding route',
            message: error.message
        });
    }
});

/**
 * Get relationship graph statistics
 * GET /api/details/graph/stats
 */
router.get('/graph/stats', async (req, res) => {
    try {
        const graph = await buildRelationshipGraph();

        const stats = {
            totalPeople: graph.size,
            totalConnections: Array.from(graph.values()).reduce((sum, connections) => sum + connections.size, 0) / 2,
            averageConnections: graph.size > 0 ? Array.from(graph.values()).reduce((sum, connections) => sum + connections.size, 0) / graph.size : 0,
            isolatedPeople: Array.from(graph.values()).filter(connections => connections.size === 0).length
        };

        res.json(stats);

    } catch (error) {
        console.error('Error getting graph stats:', error);
        res.status(500).json({
            error: 'Internal server error while getting graph statistics',
            message: error.message
        });
    }
});

/**
 * Find all people within N degrees of separation
 * GET /api/details/:id/connections/:degrees
 */
router.get('/:id/connections/:degrees', async (req, res) => {
    try {
        const { id, degrees } = req.params;
        const personId = parseInt(id);
        const maxDegrees = parseInt(degrees);

        if (isNaN(personId) || isNaN(maxDegrees) || maxDegrees < 1 || maxDegrees > 6) {
            return res.status(400).json({
                error: 'Invalid person ID or degrees (must be 1-6)'
            });
        }

        const connections = await findConnectionsWithinDegrees(personId, maxDegrees);

        res.json({
            personId,
            maxDegrees,
            connections
        });

    } catch (error) {
        console.error('Error finding connections:', error);
        res.status(500).json({
            error: 'Internal server error while finding connections',
            message: error.message
        });
    }
});

/**
 * Helper function to find all connections within N degrees
 */
async function findConnectionsWithinDegrees(startPersonId, maxDegrees) {
    const graph = await buildRelationshipGraph();
    const startId = parseInt(startPersonId);

    if (!graph.has(startId)) {
        return [];
    }

    const visited = new Set();
    const result = [];

    // BFS with degree tracking
    const queue = [{ personId: startId, degree: 0 }];
    visited.add(startId);

    while (queue.length > 0) {
        const { personId, degree } = queue.shift();

        if (degree > 0) {  // Don't include the start person
            result.push({ personId, degree });
        }

        if (degree < maxDegrees) {
            const neighbors = graph.get(personId) || new Set();
            for (const neighborId of neighbors) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    queue.push({ personId: neighborId, degree: degree + 1 });
                }
            }
        }
    }

    // Sort by degree, then by person ID
    result.sort((a, b) => {
        if (a.degree !== b.degree) {
            return a.degree - b.degree;
        }
        return a.personId - b.personId;
    });

    return result;
}

module.exports = router;