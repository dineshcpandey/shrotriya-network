function mapPersonToCustomStructure(dbPerson, relationships = {}) {
    const [firstName = '', ...rest] = (dbPerson.personname || '').split(' ');
    const lastName = rest.join(' ');
    console.log("inside mapPersonToCustomStructure");
    console.log(dbPerson.id);

    // Helper function to generate image URL
    const generateImageUrl = (filename) => {
        if (!filename) return null;

        // Handle different image sizes - prioritize thumbnail for avatar display
        const baseUrl = 'http://localhost:5050/api/images/serve';

        // If filename already contains size indicator, use as-is
        if (filename.includes('-thumb') || filename.includes('-medium') || filename.includes('-large')) {
            return `${baseUrl}/${filename}`;
        }

        // Otherwise, try to construct thumbnail URL
        const extension = filename.split('.').pop();
        const nameWithoutExt = filename.replace(`.${extension}`, '');
        const thumbnailFilename = `${nameWithoutExt}-thumb.${extension}`;

        return `${baseUrl}/${thumbnailFilename}`;
    };

    // Determine avatar URL priority:
    // 1. Uploaded profile image from database (if exists)
    // 2. Facebook profile image (if fb_id exists)
    // 3. Default avatar image
    let avatarUrl = 'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg';
    let hasUploadedImage = false;

    if (dbPerson.profile_image_url && dbPerson.profile_image_filename) {
        // Use uploaded profile image from database
        const imageUrl = generateImageUrl(dbPerson.profile_image_filename);
        if (imageUrl) {
            avatarUrl = imageUrl;
            hasUploadedImage = true;
        }
    } else if (dbPerson.fb_id) {
        // Fallback to Facebook profile image
        avatarUrl = `https://graph.facebook.com/${dbPerson.fb_id}/picture`;
    }

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
            "avatar": avatarUrl,
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
            "label": `${firstName} ${lastName}`,
            // Adding profile image metadata for reference
            "hasUploadedImage": hasUploadedImage,
            "profileImageFilename": dbPerson.profile_image_filename || null,
            "profileImageUrl": dbPerson.profile_image_url || null,
            "imageUploadDate": dbPerson.image_upload_date || null
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