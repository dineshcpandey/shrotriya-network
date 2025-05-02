const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Get marriages for a person
router.get('/person/:id', async (req, res) => {
    try {
        const personId = parseInt(req.params.id);

        const query = `
            SELECT m.*, 
                h.personname as husband_name, 
                w.personname as wife_name
            FROM network.marriages m
            JOIN network.person h ON m.husbandid = h.id
            JOIN network.person w ON m.wifeid = w.id
            WHERE m.husbandid = $1 OR m.wifeid = $1
        `;

        const result = await pool.query(query, [personId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting marriages:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add a new marriage
router.post('/', async (req, res) => {
    try {
        const { husbandId, wifeId, marriageDate, marriageYear, intercaste } = req.body;

        if (!husbandId || !wifeId) {
            return res.status(400).json({ error: 'Husband ID and Wife ID are required' });
        }

        // Verify that both husband and wife exist
        const peopleQuery = 'SELECT id, gender FROM network.person WHERE id IN ($1, $2)';
        const peopleResult = await pool.query(peopleQuery, [husbandId, wifeId]);

        if (peopleResult.rows.length !== 2) {
            return res.status(404).json({ error: 'One or both persons not found' });
        }

        // Check gender if available (optional validation)
        const husband = peopleResult.rows.find(p => p.id === husbandId);
        const wife = peopleResult.rows.find(p => p.id === wifeId);

        if (husband.gender && husband.gender.toLowerCase() !== 'male') {
            return res.status(400).json({ error: 'Husband must be male' });
        }

        if (wife.gender && wife.gender.toLowerCase() !== 'female') {
            return res.status(400).json({ error: 'Wife must be female' });
        }

        // Insert the marriage
        const query = `
            INSERT INTO network.marriages 
            (husbandid, wifeid, marriagedate, marriageyear, intercaste)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`;

        const values = [husbandId, wifeId, marriageDate, marriageYear, intercaste];
        const result = await pool.query(query, values);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding marriage:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update a marriage
router.put('/:husbandId/:wifeId', async (req, res) => {
    try {
        const husbandId = parseInt(req.params.husbandId);
        const wifeId = parseInt(req.params.wifeId);
        const { marriageDate, marriageYear, intercaste } = req.body;

        const query = `
            UPDATE network.marriages
            SET marriagedate = COALESCE($3, marriagedate),
                marriageyear = COALESCE($4, marriageyear),
                intercaste = COALESCE($5, intercaste)
            WHERE husbandid = $1 AND wifeid = $2
            RETURNING *`;

        const values = [husbandId, wifeId, marriageDate, marriageYear, intercaste];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Marriage not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating marriage:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete a marriage
router.delete('/:husbandId/:wifeId', async (req, res) => {
    try {
        const husbandId = parseInt(req.params.husbandId);
        const wifeId = parseInt(req.params.wifeId);

        const query = 'DELETE FROM network.marriages WHERE husbandid = $1 AND wifeid = $2 RETURNING *';
        const result = await pool.query(query, [husbandId, wifeId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Marriage not found' });
        }

        res.json({ message: 'Marriage deleted successfully', marriage: result.rows[0] });
    } catch (error) {
        console.error('Error deleting marriage:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;