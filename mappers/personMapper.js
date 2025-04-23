function mapPersonToCustomStructure(dbPerson, relationships = {}) {
    const [firstName = '', ...rest] = (dbPerson.personname || '').split(' ');
    const lastName = rest.join(' ');
    console.log("inside mapPersonToCustomStructure");
    console.log(dbPerson.id);

    // Create the base structure
    const result = {
        id: dbPerson.id.toString(),
        rels: {
            spouses: relationships.spouses || [],
            children: relationships.children || []
        },
        data: {
            "first name": firstName,
            "last name": lastName,
            "birthday": dbPerson.yr_birth || dbPerson.date_birth || null,
            "avatar": dbPerson.fb_id
                ? `https://graph.facebook.com/${dbPerson.fb_id}/picture`
                : 'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg',
            "gender": dbPerson.gender && dbPerson.gender.length > 0
                ? dbPerson.gender.charAt(0).toUpperCase()
                : 'U',
            "location": dbPerson.currentlocation || null,
            "contact": {
                "email": dbPerson.mail_id || null,
                "phone": dbPerson.phone || null
            },
            "work": dbPerson.worksat || null,
            "nativePlace": dbPerson.nativeplace || null,
            // Adding the new properties
            "desc": `${dbPerson.nativeplace || ''} ${dbPerson.currentlocation || ''} ${dbPerson.worksat || ''}`,
            "label": `${firstName} ${lastName}`
        }
    };

    // Conditionally add father and mother if they are not null or undefined
    if (relationships.father !== null && relationships.father !== undefined) {
        result.rels.father = relationships.father.toString();
    }

    if (relationships.mother !== null && relationships.mother !== undefined) {
        result.rels.mother = relationships.mother.toString();
    }

    return result;
}

module.exports = {
    mapPersonToCustomStructure
};
