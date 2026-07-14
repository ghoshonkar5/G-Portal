const jwt = require('jsonwebtoken');

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            facultyProfileId: user.faculty_profile_id,
            facultyId: user.faculty_id,
            role: user.role,
            email: user.email,
            tokenVersion: user.token_version,
            profileCompleted: user.profile_completed,  // added
            firstLogin: user.first_login,              // added
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

const formatUser = (row) => ({
    id: row.id,
    facultyProfileId: row.faculty_profile_id,
    facultyId: row.faculty_id,
    faculty_id: row.faculty_id,           // snake_case alias for events module
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    designation: row.designation,
    mobile: row.mobile,
    isActive: row.is_active,
    firstLogin: row.first_login,
    profileCompleted: row.profile_completed,
    // URL fields
    googleScholarUrl: row.google_scholar_url || null,
    scopusUrl: row.scopus_url || null,
    scopusUrl2: row.scopus_url_2 || null,
    scopusUrl3: row.scopus_url_3 || null,
    wosUrl: row.wos_url || null,
    wosUrl2: row.wos_url_2 || null,
    wosUrl3: row.wos_url_3 || null,
    // Extended profile
    researchArea: row.research_area || null,
    officeRoom: row.office_room || null,
    officeHours: row.office_hours || null,
    coursesTaught: row.courses_taught || null,
    roles: row.roles || null,
    linkedinUrl: row.linkedin_url || null,
    websiteUrl: row.website_url || null,
    profilePhoto: row.profile_photo || null,
    yearsOfExperience: row.years_of_experience || null,
});

module.exports = { generateToken, formatUser };