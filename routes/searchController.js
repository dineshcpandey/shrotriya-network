// routes/search.js
const express = require('express');


const router = express.Router();
const pool = require('../config/db');



// SEARCH for people
router.get('/', async (req, res, next) => {
    const { name, location, gender, birthdate } = req.query;

    try {
        let query = 'SELECT * FROM network.person WHERE 1=1';
        const params = [];
        let paramCounter = 1;

        if (name) {
            query += ` AND (personname ILIKE $${paramCounter} OR name_alias ILIKE $${paramCounter})`;
            params.push(`%${name}%`);
            paramCounter++;
        }

        if (location) {
            query += ` AND (currentlocation ILIKE $${paramCounter} OR placebirth ILIKE $${paramCounter} OR nativeplace ILIKE $${paramCounter})`;
            params.push(`%${location}%`);
            paramCounter++;
        }

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
        console.log("Query to run : ", query)
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

module.exports = router;