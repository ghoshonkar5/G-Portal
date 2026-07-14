const pool = require('../config/database');

const formatConf = (conf) => ({
    id: conf.id.toString(),
    title: conf.title,
    conferenceName: conf.conference_name,
    date: conf.date,
    authors: conf.authors,
    type: conf.type,
    doi: conf.doi,
    indexing: conf.indexing,
    link: conf.link,
    academicYear: conf.academic_year,
    host: conf.host,
    facultyName: conf.faculty_name,
    fileUrl: conf.file_url,
    fileName: conf.file_name,
    fileType: conf.file_type,
    lastEditedBy: conf.last_edited_by || null,
    lastEditedAt: conf.last_edited_at || null,
});

exports.getAllConferences = async (req, res) => {
    try {
        const { academicYear, facultyId, type } = req.query;
        // CHANGED: faculty → faculty_profile + users
        let query = `SELECT c.*, u.name as faculty_name, u.department, u.faculty_id as faculty_code
                     FROM conferences c
                     JOIN faculty_profile fp ON c.faculty_id = fp.id
                     JOIN users u ON fp.user_id = u.id
                     WHERE 1=1`;
        const params = [];
        let paramCount = 1;
        if (academicYear) { query += ` AND c.academic_year = $${paramCount}`; params.push(academicYear); paramCount++; }
        if (facultyId)    { query += ` AND u.faculty_id = $${paramCount}`;    params.push(facultyId);    paramCount++; }
        if (type)         { query += ` AND c.type = $${paramCount}`;           params.push(type);         paramCount++; }
        query += ` ORDER BY c.date DESC`;
        const result = await pool.query(query, params);
        res.json({ success: true, count: result.rows.length, data: result.rows.map(formatConf) });
    } catch (error) {
        console.error('Get conferences error:', error);
        res.status(500).json({ success: false, message: 'Error fetching conferences', error: error.message });
    }
};

exports.getConferencesByFaculty = async (req, res) => {
    try {
        // CHANGED: faculty → faculty_profile + users
        const result = await pool.query(
            `SELECT c.*, u.name as faculty_name, u.department, u.faculty_id as faculty_code
             FROM conferences c
             JOIN faculty_profile fp ON c.faculty_id = fp.id
             JOIN users u ON fp.user_id = u.id
             WHERE u.faculty_id = $1
             ORDER BY c.date DESC`,
            [req.params.facultyId]
        );
        res.json({ success: true, count: result.rows.length, data: result.rows.map(formatConf) });
    } catch (error) {
        console.error('Get faculty conferences error:', error);
        res.status(500).json({ success: false, message: 'Error fetching faculty conferences', error: error.message });
    }
};

exports.createConference = async (req, res) => {
    try {
        const { title, conferenceName, date, authors, type, doi, indexing, link, academicYear, host, fileUrl, fileName, fileType } = req.body;

        // CHANGED: identity lookup dropped — facultyProfileId comes from token directly
        const facultyDbId = req.user.facultyProfileId;

        const titleCheck = await pool.query(
            'SELECT id FROM conferences WHERE faculty_id = $1 AND LOWER(title) = LOWER($2)',
            [facultyDbId, title]
        );
        if (titleCheck.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'A conference with this title already exists in your portfolio.' });
        }

        const result = await pool.query(
            `INSERT INTO conferences (faculty_id, title, conference_name, date, authors, type, doi, indexing, link, academic_year, host, file_url, file_name, file_type)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
            [facultyDbId, title, conferenceName, date, authors, type, doi, indexing, link, academicYear, host, fileUrl, fileName, fileType]
        );
        res.status(201).json({ success: true, message: 'Conference created successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Create conference error:', error);
        res.status(500).json({ success: false, message: 'Error creating conference', error: error.message });
    }
};

exports.updateConference = async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = req.body;
        const fields = [], values = [];
        let paramCount = 1;

        const fieldMap = {
            title: 'title', conferenceName: 'conference_name', date: 'date',
            authors: 'authors', type: 'type', doi: 'doi', indexing: 'indexing',
            link: 'link', academicYear: 'academic_year', host: 'host',
            fileUrl: 'file_url', fileName: 'file_name', fileType: 'file_type',
            lastEditedBy: 'last_edited_by',
        };

        for (const [key, dbColumn] of Object.entries(fieldMap)) {
            if (updateFields[key] !== undefined) {
                fields.push(`${dbColumn} = $${paramCount}`);
                values.push(updateFields[key]);
                paramCount++;
            }
        }

        if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
        fields.push(`updated_at = NOW() AT TIME ZONE 'UTC'`);
        fields.push(`last_edited_at = NOW() AT TIME ZONE 'UTC'`);
        values.push(id);

        const result = await pool.query(
            `UPDATE conferences SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Conference not found' });
        res.json({ success: true, message: 'Conference updated successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Update conference error:', error);
        res.status(500).json({ success: false, message: 'Error updating conference', error: error.message });
    }
};

exports.deleteConference = async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM conferences WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Conference not found' });
        res.json({ success: true, message: 'Conference deleted successfully' });
    } catch (error) {
        console.error('Delete conference error:', error);
        res.status(500).json({ success: false, message: 'Error deleting conference', error: error.message });
    }
};

exports.exportConferencesCSV = async (req, res) => {
    try {
        const { facultyId, fromYear, toYear, type, columns } = req.query;
        const selectedColumns = columns ? columns.split(',') : null;

        // CHANGED: faculty → faculty_profile + users
        let query = `SELECT c.*, u.name as faculty_name
                     FROM conferences c
                     JOIN faculty_profile fp ON c.faculty_id = fp.id
                     JOIN users u ON fp.user_id = u.id
                     WHERE 1=1`;
        const params = [];
        let paramCount = 1;

        if (facultyId) { query += ` AND u.faculty_id = $${paramCount}`; params.push(facultyId); paramCount++; }
        if (fromYear)  { query += ` AND EXTRACT(YEAR FROM c.date) >= $${paramCount}`; params.push(fromYear); paramCount++; }
        if (toYear)    { query += ` AND EXTRACT(YEAR FROM c.date) <= $${paramCount}`; params.push(toYear);   paramCount++; }
        if (type)      { query += ` AND c.type = $${paramCount}`;        params.push(type);      paramCount++; }
        query += ` ORDER BY c.date DESC`;

        const result = await pool.query(query, params);

        const ALL_COLUMNS = [
            { key: 'title',          header: 'Title',          get: r => r.title || '' },
            { key: 'conferenceName', header: 'Conference Name', get: r => r.conference_name || '' },
            { key: 'date',           header: 'Date',            get: r => r.date ? new Date(r.date).toLocaleDateString('en-IN') : '' },
            { key: 'authors',        header: 'Authors',         get: r => Array.isArray(r.authors) ? r.authors.join('; ') : (r.authors || '') },
            { key: 'type',           header: 'Type',            get: r => r.type || '' },
            { key: 'academicYear',   header: 'Academic Year',   get: r => r.academic_year || '' },
            { key: 'host',           header: 'Host',            get: r => r.host || '' },
            { key: 'doi',            header: 'DOI',             get: r => r.doi || '' },
            { key: 'indexing',       header: 'Indexing',        get: r => r.indexing || '' },
            { key: 'link',           header: 'Link',            get: r => r.link || '' },
        ];

        const cols = selectedColumns
            ? ALL_COLUMNS.filter(c => selectedColumns.includes(c.key))
            : ALL_COLUMNS;

        const escape = val => `"${String(val).replace(/"/g, '""')}"`;
        const header = cols.map(c => escape(c.header)).join(',');
        const rows = result.rows.map(r => cols.map(c => escape(c.get(r))).join(','));
        const csv = [header, ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="conferences_${facultyId}_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Export conferences CSV error:', error);
        res.status(500).json({ success: false, message: 'Error exporting conferences', error: error.message });
    }
};