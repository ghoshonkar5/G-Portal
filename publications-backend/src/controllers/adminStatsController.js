const pool = require('../config/database');

// ── A. GET /api/admin/stats/timeseries ────────────────────────────
// Returns publication/conference/book counts grouped by academic year
exports.getTimeseries = async (req, res) => {
    try {
        const [pubs, confs, books] = await Promise.all([
            pool.query(`SELECT academic_year, COUNT(*)::int AS count FROM publications WHERE academic_year IS NOT NULL GROUP BY academic_year`),
            pool.query(`SELECT academic_year, COUNT(*)::int AS count FROM conferences WHERE academic_year IS NOT NULL GROUP BY academic_year`),
            pool.query(`SELECT academic_year, COUNT(*)::int AS count FROM books_chapters WHERE academic_year IS NOT NULL GROUP BY academic_year`),
        ]);

        const yearSet = new Set();
        [pubs, confs, books].forEach(r => r.rows.forEach(row => {
            if (row.academic_year) yearSet.add(row.academic_year);
        }));
        const years = [...yearSet].sort((a, b) => {
            const ya = parseInt(String(a).split('-')[0]) || 0;
            const yb = parseInt(String(b).split('-')[0]) || 0;
            return ya - yb;
        });

        const toMap = (rows) => {
            const m = {};
            rows.forEach(r => { m[r.academic_year] = r.count; });
            return m;
        };
        const pm = toMap(pubs.rows), cm = toMap(confs.rows), bm = toMap(books.rows);

        res.json({
            success: true,
            data: {
                years,
                series: [
                    { name: 'Publications', color: '#006B64', values: years.map(y => pm[y] || 0) },
                    { name: 'Conferences',  color: '#4cb19f', values: years.map(y => cm[y] || 0) },
                    { name: 'Books',        color: '#f59e0b', values: years.map(y => bm[y] || 0) },
                ],
            },
        });
    } catch (error) {
        console.error('Timeseries error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── B. GET /api/admin/stats/quartile-distribution ─────────────────
// Returns Q1/Q2/Q3/Q4/N/A counts from publications
exports.getQuartileDistribution = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT COALESCE(NULLIF(TRIM(quartile), ''), 'N/A') AS quartile,
                    COUNT(*)::int AS count
             FROM publications
             GROUP BY COALESCE(NULLIF(TRIM(quartile), ''), 'N/A')
             ORDER BY quartile`
        );
        const colorMap = { Q1: '#16a34a', Q2: '#2563eb', Q3: '#f97316', Q4: '#ef4444', 'N/A': '#94a3b8' };
        const ordered = ['Q1', 'Q2', 'Q3', 'Q4', 'N/A'];
        const countMap = {};
        result.rows.forEach(r => { countMap[r.quartile] = r.count; });

        const data = ordered
            .filter(q => countMap[q] != null)
            .map(q => ({ label: q, value: countMap[q], color: colorMap[q] || '#94a3b8' }));

        // Include any unexpected quartile values at the end
        result.rows.forEach(r => {
            if (!ordered.includes(r.quartile)) {
                data.push({ label: r.quartile, value: r.count, color: '#94a3b8' });
            }
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Quartile distribution error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── C. GET /api/admin/stats/by-department?type=publications|conferences|books
// Returns row count by department for the chosen table
exports.getDeptDistribution = async (req, res) => {
    try {
        const allowed = { publications: 'publications', conferences: 'conferences', books: 'books_chapters' };
        const type = req.query.type || 'publications';
        const table = allowed[type];
        if (!table) {
            return res.status(400).json({ success: false, message: 'Invalid type param. Allowed: publications, conferences, books' });
        }

        const result = await pool.query(
            `SELECT COALESCE(u.department, 'Unknown') AS dept, COUNT(*)::int AS value
             FROM ${table} t
             JOIN faculty_profile fp ON t.faculty_id = fp.id
             JOIN users u ON fp.user_id = u.id
             WHERE u.department IS NOT NULL AND TRIM(u.department) != ''
             GROUP BY u.department
             ORDER BY value DESC`
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Dept distribution error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── D. GET /api/admin/stats/top-contributors?limit=6 ─────────────
// Returns top faculty by publication count, with Q1 count
exports.getTopContributors = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 6, 20);

        const result = await pool.query(
            `SELECT u.name,
                    u.department AS dept,
                    COUNT(*)::int AS pubs,
                    COUNT(*) FILTER (WHERE p.quartile = 'Q1')::int AS q1_count
             FROM publications p
             JOIN faculty_profile fp ON p.faculty_id = fp.id
             JOIN users u ON fp.user_id = u.id
             GROUP BY u.id, u.name, u.department
             ORDER BY pubs DESC
             LIMIT $1`,
            [limit]
        );

        res.json({
            success: true,
            data: result.rows.map(r => ({
                name: r.name,
                dept: r.dept || 'Unknown',
                pubs: r.pubs,
                q1: r.q1_count,
            })),
        });
    } catch (error) {
        console.error('Top contributors error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── E. GET /api/admin/stats/overview-counts ───────────────────────
// Returns aggregate counts: active faculty, pending flags, pubs, confs, books
exports.getOverviewCounts = async (req, res) => {
    try {
        const [faculty, pubs, confs, books] = await Promise.all([
            pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'faculty' AND is_active = true`),
            pool.query(`SELECT COUNT(*)::int AS count FROM publications`),
            pool.query(`SELECT COUNT(*)::int AS count FROM conferences`),
            pool.query(`SELECT COUNT(*)::int AS count FROM books_chapters`),
        ]);

        // Count pending flags — use try-catch in case flags table doesn't exist yet
        let pendingFlags = 0;
        try {
            const flagsRes = await pool.query(`SELECT COUNT(*)::int AS count FROM flags WHERE status != 'resolved'`);
            pendingFlags = flagsRes.rows[0].count;
        } catch (e) {
            console.warn('Could not count flags (table may not exist):', e.message);
        }

        // Q1+Q2 ratio
        let q1q2Ratio = 0;
        try {
            const qRes = await pool.query(
                `SELECT
                    COUNT(*) FILTER (WHERE quartile IN ('Q1', 'Q2'))::float / NULLIF(COUNT(*), 0) * 100 AS ratio
                 FROM publications`
            );
            q1q2Ratio = parseFloat(qRes.rows[0].ratio) || 0;
        } catch (e) {
            console.warn('Could not compute Q1+Q2 ratio:', e.message);
        }

        res.json({
            success: true,
            data: {
                publications:  pubs.rows[0].count,
                conferences:   confs.rows[0].count,
                books:         books.rows[0].count,
                activeFaculty: faculty.rows[0].count,
                pendingFlags,
                q1q2Ratio:     Math.round(q1q2Ratio * 10) / 10,
            },
        });
    } catch (error) {
        console.error('Overview counts error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
