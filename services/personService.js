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
        `SELECT wifeid as spouseid FROM network.marriages 
         WHERE husbandid = $1 
         UNION
         SELECT husbandid as spouseid  FROM network.marriages
         WHERE wifeid = $1`,
        [personId]
    );
    return result.rows.map(row => row.spouseid.toString() || row.id.toString());
}



// async function getSpouses(personId) {
//     const result = await pool.query(
//         `SELECT spouseid FROM network.person 
//          WHERE id = $1 AND spouseid IS NOT NULL
//          UNION
//          SELECT id FROM network.person 
//          WHERE spouseid = $1`,
//         [personId]
//     );
//     return result.rows.map(row => row.spouseid.toString() || row.id.toString());
// }


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
        ...[personId],
        ...spouseIds,
        ...(fatherId ? [fatherId.toString()] : []),
        ...(motherId ? [motherId.toString()] : []),
        ...childIds
    ]);

    console.log("personId: ", personId)
    console.log("fatherid: ", fatherId)
    console.log("motherId: ", motherId)
    console.log("spouseIds: ", spouseIds)
    console.log("childIds: ", childIds)
    console.log("relatedIds: ", relatedIds)

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
        spouseids, // Now an array of spouse IDs
        marriageDetails, // Array of marriage details (date, year, intercaste)
        worksat,
        nativeplace,
        phone,
        mail_id,
        living
    } = personData;

    // Generate a new ID
    const result = await pool.query('SELECT MAX(id) as max_id FROM network.person');
    const newId = (result.rows[0].max_id || 0) + 1;

    // Begin transaction
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert person without spouse ID
        await client.query(
            `INSERT INTO network.person 
             (id, personname, birthdate, gender, currentlocation, fatherid, motherid, worksat, nativeplace, phone, mail_id, living) 
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
                newId,
                personname,
                birthdate,
                gender,
                currentlocation,
                fatherid ? parseInt(fatherid) : null,
                motherid ? parseInt(motherid) : null,
                worksat,
                nativeplace,
                phone,
                mail_id,
                living
            ]
        );

        // Add marriages if spouse IDs are provided
        if (spouseids && spouseids.length > 0) {
            for (let i = 0; i < spouseids.length; i++) {
                const spouseId = parseInt(spouseids[i]);
                const details = marriageDetails && marriageDetails[i] ? marriageDetails[i] : {};

                // Determine husband and wife based on gender
                let husbandId, wifeId;
                if (gender && gender.toLowerCase() === 'male') {
                    husbandId = newId;
                    wifeId = spouseId;
                } else {
                    husbandId = spouseId;
                    wifeId = newId;
                }

                await client.query(
                    `INSERT INTO network.marriages 
                     (husbandid, wifeid, marriagedate, marriageyear, intercaste) 
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        husbandId,
                        wifeId,
                        details.marriagedate || null,
                        details.marriageyear || null,
                        details.intercaste || false
                    ]
                );
            }
        }

        await client.query('COMMIT');
        return { id: newId, message: 'Person added successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return { id: newId, message: 'Person added successfully' };
}
async function updatePerson(personId, payload) {
    const fields = [
        'personname',
        'birthdate',
        'gender',
        'currentlocation',
        'fatherid',
        'motherid',
        'spouseid',
        'worksat',
        'nativeplace',
        'phone',
        'mail_id',
        'living'
    ];

    const updates = [];
    const values = [];
    let index = 1;

    let updateSpouseQuery;

    for (const field of fields) {
        if (payload[field] !== null && payload[field] !== undefined) {
            updates.push(`${field} = $${index}`);
            console.log(payload[field])
            values.push(payload[field]);
            index++;
        }

    }


    if (updates.length === 0) {
        return null; // Nothing to update
    }

    values.push(personId); // For WHERE clause

    const updateQuery = `
        UPDATE network.person
        SET ${updates.join(', ')}
        WHERE id = $${index}
        RETURNING *;
    `;

    console.log(updateQuery); // for debugging
    console.log(values);      // for debugging

    const result = await pool.query(updateQuery, values);


    // Update the marriages table 
    if (payload['spouseid']) {
        if (payload['gender'] == 'M') {
            updateSpouseQuery = "insert into network.marriages(husbandid,wifeid) values(" + personId + "," + payload["spouseid"] + ")"
        } else if (payload['gender'] == 'F') {
            updateSpouseQuery = "insert into network.marriages(wifeid,husbandid) values(" + personId + "," + payload["spouseid"] + ")"
        }
    }

    console.log(updateSpouseQuery)
    if (updateSpouseQuery) {
        const spouseResult = await pool.query(updateSpouseQuery)
        console.log("Updated the spouse relation")
        console.log(updateSpouseQuery, '  ', spouseResult)
    }


    return result.rows[0];
}


async function addMarriage(husbandId, wifeId, marriageDate = null, marriageYear = null, intercaste = false) {
    try {
        const query = `
            INSERT INTO network.marriages 
            (husbandid, wifeid, marriagedate, marriageyear, intercaste)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`;

        const values = [husbandId, wifeId, marriageDate, marriageYear, intercaste];
        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (error) {
        console.error('Error adding marriage:', error);
        throw error;
    }
}

async function getPersonWithFamilyFunction(personId) {
    try {
        const query = `SELECT * FROM network.get_family($1)`;
        const result = await pool.query(query, [personId]);

        if (result.rows.length === 0) return null;

        const person = result.rows[0];

        // Convert the function output to your custom structure
        return mapPersonToCustomStructure(
            {
                id: parseInt(person.personid),
                personname: person.personname,
                gender: person.gender,
                currentlocation: person.currentlocation,
                nativeplace: person.nativeplace,
                date_birth: person.date_birth,
                fb_id: person.fb_id,
                mail_id: person.mail_id,
                phone: person.phone,
                fatherid: person.fatherid ? parseInt(person.fatherid) : null,
                motherid: person.motherid ? parseInt(person.motherid) : null
            },
            {
                father: person.fatherid,
                mother: person.motherid,
                spouses: person.spouse_ids || [],
                children: person.children_ids || []
            }
        );
    } catch (error) {
        console.error('Error getting person with family:', error);
        throw error;
    }
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
