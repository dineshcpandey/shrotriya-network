// routes/people.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET all people
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM network.person ORDER BY id');
        console.log("Returning from People");
        console.dir(result.rowCount)
        res.json(result.rows);

    } catch (err) {
        next(err);
    }
});

// GET a single person by ID
router.get('/:id', async (req, res, next) => {
    const personId = parseInt(req.params.id);

    try {
        const result = await pool.query('SELECT * FROM network.person WHERE id = $1', [personId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Person not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// GET a single person by ID
router.get('/:id', async (req, res, next) => {
    const personId = parseInt(req.params.id);

    try {
        const result = await pool.query('SELECT * FROM network.person WHERE id = $1', [personId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Person not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});


// ADD a new person
router.post('/', async (req, res, next) => {
    const {
        id, personname, birthdate, fatherid, motherid, spouseid, gender,
        currentlocation, entityname, placebirth, nativeplace, locationmatric,
        date_birth, worksat, living, yr_birth, name_alias, fb_id, mail_id, phone
    } = req.body;

    // Basic validation
    if (!id || !personname) {
        return res.status(400).json({ error: 'Person ID and name are required' });
    }

    try {
        // Check if ID already exists
        const checkResult = await pool.query('SELECT id FROM network.person WHERE id = $1', [id]);
        if (checkResult.rows.length > 0) {
            return res.status(409).json({ error: 'Person with this ID already exists' });
        }

        const query = `
      INSERT INTO network.person (
        id, personname, birthdate, fatherid, motherid, spouseid, gender, 
        currentlocation, entityname, placebirth, nativeplace, locationmatric, 
        date_birth, worksat, living, yr_birth, name_alias, fb_id, mail_id, phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

        const values = [
            id, personname, birthdate, fatherid, motherid, spouseid, gender,
            currentlocation, entityname, placebirth, nativeplace, locationmatric,
            date_birth, worksat, living, yr_birth, name_alias, fb_id, mail_id, phone
        ];

        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// UPDATE an existing person
router.put('/:id', async (req, res, next) => {
    const personId = parseInt(req.params.id);
    const {
        personname, birthdate, fatherid, motherid, spouseid, gender,
        currentlocation, entityname, placebirth, nativeplace, locationmatric,
        date_birth, worksat, living, yr_birth, name_alias, fb_id, mail_id, phone
    } = req.body;

    try {
        // Check if person exists
        const checkResult = await pool.query('SELECT id FROM network.person WHERE id = $1', [personId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Person not found' });
        }

        const query = `
      UPDATE network.person SET
        personname = COALESCE($1, personname),
        birthdate = COALESCE($2, birthdate),
        fatherid = COALESCE($3, fatherid),
        motherid = COALESCE($4, motherid),
        spouseid = COALESCE($5, spouseid),
        gender = COALESCE($6, gender),
        currentlocation = COALESCE($7, currentlocation),
        entityname = COALESCE($8, entityname),
        placebirth = COALESCE($9, placebirth),
        nativeplace = COALESCE($10, nativeplace),
        locationmatric = COALESCE($11, locationmatric),
        date_birth = COALESCE($12, date_birth),
        worksat = COALESCE($13, worksat),
        living = COALESCE($14, living),
        yr_birth = COALESCE($15, yr_birth),
        name_alias = COALESCE($16, name_alias),
        fb_id = COALESCE($17, fb_id),
        mail_id = COALESCE($18, mail_id),
        phone = COALESCE($19, phone)
      WHERE id = $20
      RETURNING *
    `;

        const values = [
            personname, birthdate, fatherid, motherid, spouseid, gender,
            currentlocation, entityname, placebirth, nativeplace, locationmatric,
            date_birth, worksat, living, yr_birth, name_alias, fb_id, mail_id, phone,
            personId
        ];

        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// DELETE a person
router.delete('/:id', async (req, res, next) => {
    const personId = parseInt(req.params.id);

    try {
        // Check if person exists and if they're referenced by others
        const checkFamilyQuery = `
      SELECT id FROM network.person 
      WHERE fatherid = $1 OR motherid = $1 OR spouseid = $1
    `;
        const familyResult = await pool.query(checkFamilyQuery, [personId]);

        if (familyResult.rows.length > 0) {
            return res.status(409).json({
                error: 'Cannot delete person because they are referenced by other people in the database',
                references: familyResult.rows
            });
        }

        const result = await pool.query('DELETE FROM network.person WHERE id = $1 RETURNING *', [personId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Person not found' });
        }

        res.json({ message: 'Person deleted successfully', person: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// GET family network data for a person
router.get('/:id/network', async (req, res, next) => {
    const personId = parseInt(req.params.id);

    try {
        // Get the person
        const personResult = await pool.query('SELECT * FROM network.person WHERE id = $1', [personId]);

        if (personResult.rows.length === 0) {
            return res.status(404).json({ error: 'Person not found' });
        }

        const person = personResult.rows[0];
        const network = { person };

        // Get parents
        if (person.fatherid || person.motherid) {
            const parentsQuery = `
        SELECT * FROM network.person 
        WHERE id IN ($1, $2)
        AND id IS NOT NULL
      `;

            const parentsParams = [
                person.fatherid || null,
                person.motherid || null
            ].filter(id => id !== null);

            if (parentsParams.length > 0) {
                const parentsQueryFormatted = `
          SELECT * FROM network.person 
          WHERE id IN (${parentsParams.map((_, i) => `$${i + 1}`).join(', ')})
        `;

                const parentsResult = await pool.query(parentsQueryFormatted, parentsParams);
                network.parents = parentsResult.rows;
            } else {
                network.parents = [];
            }
        } else {
            network.parents = [];
        }

        // Get spouse
        if (person.spouseid) {
            const spouseResult = await pool.query('SELECT * FROM network.person WHERE id = $1', [person.spouseid]);
            network.spouse = spouseResult.rows.length > 0 ? spouseResult.rows[0] : null;
        } else {
            network.spouse = null;
        }

        // Get children (people who have this person as mother or father)
        const childrenQuery = `
      SELECT * FROM network.person 
      WHERE fatherid = $1 OR motherid = $1
      ORDER BY birthdate, id
    `;

        const childrenResult = await pool.query(childrenQuery, [personId]);
        network.children = childrenResult.rows;

        // Get siblings (people who share at least one parent with the person)
        let siblingsQuery = '';
        const siblingsParams = [];

        if (person.fatherid && person.motherid) {
            // Full siblings (same mother and father)
            siblingsQuery = `
        SELECT * FROM network.person 
        WHERE (fatherid = $1 AND motherid = $2)
        AND id != $3
        ORDER BY birthdate, id
      `;
            siblingsParams.push(person.fatherid, person.motherid, personId);
        } else if (person.fatherid) {
            // Paternal siblings (same father)
            siblingsQuery = `
        SELECT * FROM network.person 
        WHERE fatherid = $1
        AND id != $2
        ORDER BY birthdate, id
      `;
            siblingsParams.push(person.fatherid, personId);
        } else if (person.motherid) {
            // Maternal siblings (same mother)
            siblingsQuery = `
        SELECT * FROM network.person 
        WHERE motherid = $1
        AND id != $2
        ORDER BY birthdate, id
      `;
            siblingsParams.push(person.motherid, personId);
        }

        if (siblingsQuery) {
            const siblingsResult = await pool.query(siblingsQuery, siblingsParams);
            network.siblings = siblingsResult.rows;
        } else {
            network.siblings = [];
        }

        res.json(network);
    } catch (err) {
        next(err);
    }
});


// Add this to your routes/people.js file

// GET extended family network data (multiple generations)
router.get('/:id/extended-network', async (req, res, next) => {
    const personId = parseInt(req.params.id);
    const generations = parseInt(req.query.generations || 3); // Default 3 generations

    try {
        // Get the starting person
        const personResult = await pool.query('SELECT * FROM network.person WHERE id = $1', [personId]);

        if (personResult.rows.length === 0) {
            return res.status(404).json({ error: 'Person not found' });
        }

        // Initialize the network with the starting person
        const networkMap = new Map();
        const queue = [];

        // Add starting person to both map and queue
        networkMap.set(personId, personResult.rows[0]);
        queue.push({
            id: personId,
            generation: 0,
            direction: 'center' // This is our starting point
        });

        // Process the queue to build the network
        while (queue.length > 0) {
            const current = queue.shift();

            // Skip if we've reached our generation limit in a particular direction
            if (
                (current.direction === 'up' && current.generation >= generations) ||
                (current.direction === 'down' && current.generation >= generations)
            ) {
                continue;
            }

            const person = networkMap.get(current.id);

            // Add parents (going up in generations)
            if (person.fatherid && !networkMap.has(person.fatherid)) {
                const fatherResult = await pool.query('SELECT * FROM network.person WHERE id = $1', [person.fatherid]);
                if (fatherResult.rows.length > 0) {
                    networkMap.set(person.fatherid, fatherResult.rows[0]);
                    queue.push({
                        id: person.fatherid,
                        generation: current.generation + 1,
                        direction: 'up'
                    });
                }
            }

            if (person.motherid && !networkMap.has(person.motherid)) {
                const motherResult = await pool.query('SELECT * FROM network.person WHERE id = $1', [person.motherid]);
                if (motherResult.rows.length > 0) {
                    networkMap.set(person.motherid, motherResult.rows[0]);
                    queue.push({
                        id: person.motherid,
                        generation: current.generation + 1,
                        direction: 'up'
                    });
                }
            }

            // Add spouse
            if (person.spouseid && !networkMap.has(person.spouseid)) {
                const spouseResult = await pool.query('SELECT * FROM network.person WHERE id = $1', [person.spouseid]);
                if (spouseResult.rows.length > 0) {
                    networkMap.set(person.spouseid, spouseResult.rows[0]);
                    // Don't increase generation for spouse, but check their parents
                    queue.push({
                        id: person.spouseid,
                        generation: current.generation,
                        direction: current.direction
                    });
                }
            }

            // Add children (going down in generations)
            const childrenQuery = `
                SELECT * FROM network.person 
                WHERE fatherid = $1 OR motherid = $1
                ORDER BY birthdate, id
            `;

            const childrenResult = await pool.query(childrenQuery, [current.id]);
            for (const child of childrenResult.rows) {
                if (!networkMap.has(child.id)) {
                    networkMap.set(child.id, child);
                    queue.push({
                        id: child.id,
                        generation: current.generation + 1,
                        direction: 'down'
                    });
                }
            }
        }

        // Convert map to array for response
        const networkArray = Array.from(networkMap.values());

        res.json({
            startPerson: personId,
            count: networkArray.length,
            network: networkArray
        });

    } catch (err) {
        next(err);
    }
});

module.exports = router;