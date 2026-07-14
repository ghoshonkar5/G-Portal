const pool = require('../config/database');

const formatBook = (book) => ({
    id: book.id.toString(),
    title: book.title,
    authorName: book.author_name,
    departmentAffiliation: book.department_affiliation,
    isbnIssn: book.isbn_issn,
    publisher: book.publisher,
    monthYear: book.month_year,
    academicYear: book.academic_year,
    type: book.type,
    link: book.link,
    facultyName: book.faculty_name,
    fileUrl: book.file_url,
    fileName: book.file_name,
    fileType: book.file_type,
    lastEditedBy: book.last_edited_by || null,
    lastEditedAt: book.last_edited_at || null,
});

exports.getAllBooks = async (req, res) => {
    try {
        const { academicYear, facultyId, type } = req.query;
        // CHANGED: faculty → faculty_profile + users
        let query = `SELECT b.*, u.name as faculty_name, u.department, u.faculty_id as faculty_code
                     FROM books_chapters b
                     JOIN faculty_profile fp ON b.faculty_id = fp.id
                     JOIN users u ON fp.user_id = u.id
                     WHERE 1=1`;
        const params = [];
        let paramCount = 1;
        if (academicYear) { query += ` AND b.academic_year = $${paramCount}`; params.push(academicYear); paramCount++; }
        if (facultyId)    { query += ` AND u.faculty_id = $${paramCount}`;    params.push(facultyId);    paramCount++; }
        if (type)         { query += ` AND b.type = $${paramCount}`;           params.push(type);         paramCount++; }
        query += ` ORDER BY b.created_at DESC`;
        const result = await pool.query(query, params);
        res.json({ success: true, count: result.rows.length, data: result.rows.map(formatBook) });
    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({ success: false, message: 'Error fetching books', error: error.message });
    }
};

exports.getBooksByFaculty = async (req, res) => {
    try {
        // CHANGED: faculty → faculty_profile + users
        const result = await pool.query(
            `SELECT b.*, u.name as faculty_name, u.department, u.faculty_id as faculty_code
             FROM books_chapters b
             JOIN faculty_profile fp ON b.faculty_id = fp.id
             JOIN users u ON fp.user_id = u.id
             WHERE u.faculty_id = $1
             ORDER BY b.created_at DESC`,
            [req.params.facultyId]
        );
        res.json({ success: true, count: result.rows.length, data: result.rows.map(formatBook) });
    } catch (error) {
        console.error('Get faculty books error:', error);
        res.status(500).json({ success: false, message: 'Error fetching faculty books', error: error.message });
    }
};

exports.createBook = async (req, res) => {
    try {
        const { title, authorName, departmentAffiliation, isbnIssn, publisher, monthYear, academicYear, type, link, fileUrl, fileName, fileType } = req.body;

        // CHANGED: identity lookup dropped — facultyProfileId comes from token directly
        const facultyDbId = req.user.facultyProfileId;

        const titleCheck = await pool.query(
            'SELECT id FROM books_chapters WHERE faculty_id = $1 AND LOWER(title) = LOWER($2)',
            [facultyDbId, title]
        );
        if (titleCheck.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'A book/chapter with this title already exists in your portfolio.' });
        }

        const result = await pool.query(
            `INSERT INTO books_chapters (faculty_id, title, author_name, department_affiliation, isbn_issn, publisher, month_year, academic_year, type, link, file_url, file_name, file_type)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
            [facultyDbId, title, authorName, departmentAffiliation, isbnIssn, publisher, monthYear, academicYear, type, link, fileUrl, fileName, fileType]
        );
        res.status(201).json({ success: true, message: 'Book/Chapter created successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Create book error:', error);
        res.status(500).json({ success: false, message: 'Error creating book', error: error.message });
    }
};

exports.updateBook = async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = req.body;
        const fields = [], values = [];
        let paramCount = 1;

        const fieldMap = {
            title: 'title',
            authorName: 'author_name',
            departmentAffiliation: 'department_affiliation',
            subject: 'department_affiliation',
            isbnIssn: 'isbn_issn',
            isbn: 'isbn_issn',
            publisher: 'publisher',
            monthYear: 'month_year',
            publicationDate: 'month_year',
            academicYear: 'academic_year',
            type: 'type',
            link: 'link',
            fileUrl: 'file_url',
            fileName: 'file_name',
            fileType: 'file_type',
            lastEditedBy: 'last_edited_by',
        };

        const addedColumns = new Set();
        for (const [key, dbColumn] of Object.entries(fieldMap)) {
            if (updateFields[key] !== undefined && !addedColumns.has(dbColumn)) {
                fields.push(`${dbColumn} = $${paramCount}`);
                values.push(updateFields[key]);
                paramCount++;
                addedColumns.add(dbColumn);
            }
        }

        if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

        fields.push(`updated_at = NOW() AT TIME ZONE 'UTC'`);
        fields.push(`last_edited_at = NOW() AT TIME ZONE 'UTC'`);
        values.push(id);

        const result = await pool.query(
            `UPDATE books_chapters SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Book/Chapter not found' });
        res.json({ success: true, message: 'Book/Chapter updated successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({ success: false, message: 'Error updating book', error: error.message });
    }
};

exports.deleteBook = async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM books_chapters WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Book/Chapter not found' });
        res.json({ success: true, message: 'Book/Chapter deleted successfully' });
    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({ success: false, message: 'Error deleting book', error: error.message });
    }
};

exports.exportBooksCSV = async (req, res) => {
    try {
        const { facultyId, fromYear, toYear, type, columns } = req.query;
        const selectedColumns = columns ? columns.split(',') : null;

        // CHANGED: faculty → faculty_profile + users
        let query = `SELECT b.*, u.name as faculty_name
                     FROM books_chapters b
                     JOIN faculty_profile fp ON b.faculty_id = fp.id
                     JOIN users u ON fp.user_id = u.id
                     WHERE 1=1`;
        const params = [];
        let paramCount = 1;

        if (facultyId) { query += ` AND u.faculty_id = $${paramCount}`; params.push(facultyId); paramCount++; }
        if (fromYear)  { query += ` AND EXTRACT(YEAR FROM TO_DATE(b.month_year, 'Mon YYYY')) >= $${paramCount}`; params.push(fromYear); paramCount++; }
        if (toYear)    { query += ` AND EXTRACT(YEAR FROM TO_DATE(b.month_year, 'Mon YYYY')) <= $${paramCount}`; params.push(toYear);   paramCount++; }
        if (type)      { query += ` AND b.type = $${paramCount}`;        params.push(type);      paramCount++; }
        query += ` ORDER BY b.created_at DESC`;

        const result = await pool.query(query, params);

        const ALL_COLUMNS = [
            { key: 'title',                 header: 'Title',                  get: r => r.title || '' },
            { key: 'authorName',            header: 'Author Name',            get: r => r.author_name || '' },
            { key: 'departmentAffiliation', header: 'Department Affiliation', get: r => r.department_affiliation || '' },
            { key: 'isbnIssn',              header: 'ISBN/ISSN',              get: r => r.isbn_issn || '' },
            { key: 'publisher',             header: 'Publisher',              get: r => r.publisher || '' },
            { key: 'monthYear',             header: 'Month & Year',           get: r => r.month_year || '' },
            { key: 'academicYear',          header: 'Academic Year',          get: r => r.academic_year || '' },
            { key: 'type',                  header: 'Type',                   get: r => r.type || '' },
            { key: 'link',                  header: 'Link',                   get: r => r.link || '' },
        ];

        const cols = selectedColumns
            ? ALL_COLUMNS.filter(c => selectedColumns.includes(c.key))
            : ALL_COLUMNS;

        const escape = val => `"${String(val).replace(/"/g, '""')}"`;
        const header = cols.map(c => escape(c.header)).join(',');
        const rows = result.rows.map(r => cols.map(c => escape(c.get(r))).join(','));
        const csv = [header, ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="books_${facultyId}_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Export books CSV error:', error);
        res.status(500).json({ success: false, message: 'Error exporting books', error: error.message });
    }
};