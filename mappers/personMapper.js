function mapPersonToCustomStructure(dbPerson, relationships = {}) {
    const [firstName = '', ...rest] = (dbPerson.personname || '').split(' ');
    const lastName = rest.join(' ');
    console.log("inside mapPersonToCustomStructure")
    return {
        id: dbPerson.id.toString(),
        rels: {
            spouses: relationships.spouses || [],
            father: relationships.father || null,
            mother: relationships.mother || null,
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
            "nativePlace": dbPerson.nativeplace || null
        }
    };
}

module.exports = {
    mapPersonToCustomStructure
};
