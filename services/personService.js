const pool = require('../config/db');
const { mapPersonToCustomStructure } = require('../mappers/personMapper');

async function getPersonWithRelationships(personId) {
    console.log("trying to get main person with id: ", personId);

    const personQuery = await pool.query(
        'SELECT * FROM network.person WHERE id = $1',
        [personId]
    );

    if (personQuery.rows.length === 0) return null;
    const person = personQuery.rows[0];

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
}

async function getSpouses(personId) {
    const result = await pool.query(
        `SELECT spouseid FROM network.person 
         WHERE id = $1 AND spouseid IS NOT NULL
         UNION
         SELECT id FROM network.person 
         WHERE spouseid = $1`,
        [personId]
    );
    return result.rows.map(row => row.spouseid.toString() || row.id.toString());
}

async function getChildren(personId) {
    const result = await pool.query(
        `SELECT id FROM network.person 
         WHERE fatherid = $1 OR motherid = $1`,
        [personId]
    );
    return result.rows.map(row => row.id.toString());
}

// ✅ New function: returns the full structure of related people
async function getNetworkPeople(personId) {
    const mainQuery = await pool.query(
        'SELECT * FROM network.person WHERE id = $1',
        [personId]
    );
    if (mainQuery.rows.length === 0) return [];

    const person = mainQuery.rows[0];
    const fatherId = person.fatherid;
    const motherId = person.motherid;

    const [spouseIds, childIds] = await Promise.all([
        getSpouses(personId),
        getChildren(personId)
    ]);

    // Gather all unique IDs (string format)
    const relatedIds = new Set([
        ...spouseIds,
        ...(fatherId ? [fatherId.toString()] : []),
        ...(motherId ? [motherId.toString()] : []),
        ...childIds
    ]);

    const relatedPeople = await Promise.all(
        Array.from(relatedIds).map(id => getPersonWithRelationships(id))
    );

    // Filter out nulls in case some IDs don’t exist
    return relatedPeople.filter(p => p !== null);
}


async function searchPeople({ name, location }) {
    console.log("Inside searchPeople", name);
    const clauses = [];
    const values = [];

    if (name) {
        clauses.push(`personname ILIKE $${values.length + 1}`);
        values.push(`%${name}%`);
    }

    if (location) {
        clauses.push(`currentlocation ILIKE $${values.length + 1}`);
        values.push(`%${location}%`);
    }

    if (clauses.length === 0) return [];

    const query = `
        SELECT * FROM network.person
        WHERE ${clauses.join(' AND ')}
        LIMIT 20
    `;

    const result = await pool.query(query, values);

    const people = await Promise.all(
        result.rows.map(person =>
            getPersonWithRelationships(person.id)
        )
    );

    return people.filter(p => p !== null);
}

// To add new Person to the database 

async function addPerson(personData) {
    const {
        personname,
        birthdate,
        gender,
        currentlocation,
        fatherid,
        motherid,
        spouseid,
        worksat,
        nativeplace,
        phone,
        mail_id,
        living
    } = personData;

    console.log("Tryint to add a new person with data ", personData)
    // Generate a new ID (you can also use SERIAL in DB instead)
    const result = await pool.query('SELECT MAX(id) as max_id FROM network.person');
    const newId = (result.rows[0].max_id || 0) + 1;

    await pool.query(
        `INSERT INTO network.person 
         (id, personname, birthdate, gender, currentlocation, fatherid, motherid, spouseid, worksat, nativeplace, phone, mail_id, living) 
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
            newId,
            personname,
            birthdate,
            gender,
            currentlocation,
            fatherid ? parseInt(fatherid) : null,
            motherid ? parseInt(motherid) : null,
            spouseid ? parseInt(spouseid) : null,
            worksat,
            nativeplace,
            phone,
            mail_id,
            living
        ]
    );

    return { id: newId, message: 'Person added successfully' };
}

async function updatePerson(personId, payload) {
    const {
        personname,
        birthdate,
        gender,
        currentlocation,
        fatherid,
        motherid,
        spouseid,
        worksat,
        nativeplace,
        phone,
        mail_id,
        living
    } = payload;

    const updateQuery = `
        UPDATE network.person SET
            personname = $1,
            birthdate = $2,
            gender = $3,
            currentlocation = $4,
            fatherid = $5,
            motherid = $6,
            spouseid = $7,
            worksat = $8,
            nativeplace = $9,
            phone = $10,
            mail_id = $11,
            living = $12
        WHERE id = $13
        RETURNING *;
    `;

    const result = await pool.query(updateQuery, [
        personname, birthdate, gender, currentlocation,
        fatherid, motherid, spouseid,
        worksat, nativeplace, phone, mail_id, living,
        personId
    ]);

    return result.rows[0];
}


module.exports = {
    getPersonWithRelationships,
    getSpouses,
    getChildren,
    getNetworkPeople,
    searchPeople,
    addPerson,
    updatePerson
};
