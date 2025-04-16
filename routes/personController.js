// personController.js
const express = require('express');
const { getPersonWithRelationships, getNetworkPeople, searchPeople, addPerson, updatePerson } = require('../services/personService');

const router = express.Router();

// 🔍 Search route — supports name OR location via query params
router.get('/search', async (req, res) => {
    try {
        const { name, location } = req.query;

        console.log("inside Search Route ", name);
        if (!name && !location) {
            return res.status(400).json({ message: 'Please provide a name or location to search.' });
        }

        const people = await searchPeople({ name, location });
        res.json(people);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).send(err.message);
    }
});

// To add new Person
router.post('/add', async (req, res) => {
    try {
        const result = await addPerson(req.body);
        res.status(201).json(result);
    } catch (err) {
        console.error('Error adding person:', err);
        res.status(500).json({ message: err.message });
    }
});


router.get('/:id', async (req, res) => {
    try {
        console.log("personController ");
        const person = await getPersonWithRelationships(req.params.id);
        if (!person) return res.status(404).send('Person not found');
        res.json(person);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get('/:id/network', async (req, res) => {
    try {
        console.log("personController ");
        const person = await getNetworkPeople(req.params.id);
        if (!person) return res.status(404).send('Person not found');
        res.json(person);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.put('/:id', async (req, res) => {
    try {
        const updatedPerson = await updatePerson(req.params.id, req.body);
        if (!updatedPerson) return res.status(404).send('Person not found');
        res.json(updatedPerson);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating person');
    }
});

module.exports = router;