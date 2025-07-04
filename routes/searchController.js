// routes/searchController.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// SEARCH for people with name AND location (either can be blank)
router.get('/', async (req, res, next) => {
    const { name, location, gender, birthdate } = req.query;

    try {
        let query = 'SELECT * FROM network.person WHERE 1=1';
        const params = [];
        let paramCounter = 1;

        // Search by name (if provided)
        if (name && name.trim() !== '') {
            query += ` AND (personname ILIKE $${paramCounter} OR name_alias ILIKE $${paramCounter})`;
            params.push(`%${name.trim()}%`);
            paramCounter++;
        }

        // Search by location (if provided)
        if (location && location.trim() !== '') {
            query += ` AND (currentlocation ILIKE $${paramCounter} OR placebirth ILIKE $${paramCounter} OR nativeplace ILIKE $${paramCounter})`;
            params.push(`%${location.trim()}%`);
            paramCounter++;
        }

        // Additional filters (existing functionality)
        if (gender) {
            query += ` AND gender ILIKE $${paramCounter}`;
            params.push(`%${gender}%`);
            paramCounter++;
        }

        if (birthdate) {
            query += ` AND birthdate = $${paramCounter}`;
            params.push(birthdate);
            paramCounter++;
        }

        // Order by relevance (name matches first, then location matches)
        query += ' ORDER BY personname ASC';

        console.log("Query to run: ", query);
        console.log("Parameters: ", params);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

// NEW ENDPOINT: Get unique locations for type-ahead functionality
router.get('/locations', async (req, res, next) => {
    const { query: searchQuery } = req.query;

    try {
        let query = `
            SELECT DISTINCT location_name
            FROM (
                SELECT TRIM(currentlocation) as location_name FROM network.person 
                WHERE currentlocation IS NOT NULL AND TRIM(currentlocation) != ''
                UNION
                SELECT TRIM(nativeplace) as location_name FROM network.person 
                WHERE nativeplace IS NOT NULL AND TRIM(nativeplace) != ''
            ) locations
            WHERE location_name IS NOT NULL
        `;

        const params = [];

        // If search query provided, filter locations
        if (searchQuery && searchQuery.trim() !== '') {
            query += ` AND location_name ILIKE $1`;
            params.push(`%${searchQuery.trim()}%`);
        }

        query += ` ORDER BY location_name ASC LIMIT 20`;

        const result = await pool.query(query, params);
        const locations = result.rows.map(row => row.location_name);

        res.json(locations);
    } catch (err) {
        next(err);
    }
});

module.exports = router;