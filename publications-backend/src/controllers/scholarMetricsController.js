const pool = require('../config/database');

const extractScholarUserId = (url) => {
    if (!url) return null;
    const match = url.match(/[?&]user=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
};

exports.getScholarMetrics = async (req, res) => {
    try {
        const { facultyId } = req.params;

        // CHANGED: faculty → faculty_profile for URL; users for name
        // google_scholar_url lives in faculty_profile, name lives in users
        const facultyResult = await pool.query(
            `SELECT fp.google_scholar_url, u.name
             FROM faculty_profile fp
             JOIN users u ON fp.user_id = u.id
             WHERE u.faculty_id = $1`,
            [facultyId]
        );

        if (facultyResult.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Faculty not found' });

        const { google_scholar_url, name } = facultyResult.rows[0];

        if (!google_scholar_url)
            return res.status(400).json({ success: false, message: 'No Google Scholar URL saved in your profile.' });

        const userId = extractScholarUserId(google_scholar_url);
        if (!userId)
            return res.status(400).json({ success: false, message: 'Could not extract Scholar user ID from the saved URL.' });

        if (!process.env.SERPAPI_KEY)
            return res.status(500).json({ success: false, message: 'SerpApi key not configured. Please add SERPAPI_KEY to your .env file.' });

        const serpUrl = new URL('https://serpapi.com/search');
        serpUrl.searchParams.set('engine', 'google_scholar_author');
        serpUrl.searchParams.set('author_id', userId);
        serpUrl.searchParams.set('api_key', process.env.SERPAPI_KEY);
        serpUrl.searchParams.set('hl', 'en');

        const serpResponse = await fetch(serpUrl.toString());
        const data = await serpResponse.json();

        if (!serpResponse.ok)
            return res.status(502).json({ success: false, message: `SerpApi error: ${data?.error || serpResponse.status}` });

        if (data.error)
            return res.status(400).json({ success: false, message: `SerpApi error: ${data.error}` });

        const table = data.cited_by?.table || [];
        const citationsRow = table.find(row => row.citations)?.citations || {};
        const hIndexRow    = table.find(row => row.h_index)?.h_index    || {};
        const i10IndexRow  = table.find(row => row.i10_index)?.i10_index || {};

        const sinceKey  = Object.keys(citationsRow).find(k => k.startsWith('since_'));
        const sinceYear = sinceKey ? sinceKey.replace('since_', '') : String(new Date().getFullYear() - 5);

        const metrics = {
            citations: { all: citationsRow.all ?? null, recent: sinceKey ? (citationsRow[sinceKey] ?? null) : null },
            hIndex:    { all: hIndexRow.all    ?? null, recent: sinceKey ? (hIndexRow[sinceKey]    ?? null) : null },
            i10Index:  { all: i10IndexRow.all  ?? null, recent: sinceKey ? (i10IndexRow[sinceKey]  ?? null) : null },
        };

        const yearlyCitations = (data.cited_by?.graph || []).map(entry => ({
            year: String(entry.year),
            citations: entry.citations,
        }));

        if (metrics.citations.all === null) {
            return res.status(200).json({
                success: false,
                message: 'SerpApi returned no metrics. The author_id may be incorrect or the profile is private.',
                metrics: null,
                yearlyCitations: [],
            });
        }

        // CHANGED: UPDATE target is faculty_profile (scholar_* columns live there in G-Learn)
        // WHERE uses subquery since faculty_id string is in users, not faculty_profile
        try {
            await pool.query(
                `UPDATE faculty_profile SET
                   scholar_citations_all    = $1,
                   scholar_citations_recent = $2,
                   scholar_h_index_all      = $3,
                   scholar_h_index_recent   = $4,
                   scholar_i10_all          = $5,
                   scholar_i10_recent       = $6,
                   scholar_last_synced      = NOW()
                 WHERE user_id = (SELECT id FROM users WHERE faculty_id = $7)`,
                [
                    metrics.citations.all    ?? 0,
                    metrics.citations.recent ?? 0,
                    metrics.hIndex.all       ?? 0,
                    metrics.hIndex.recent    ?? 0,
                    metrics.i10Index.all     ?? 0,
                    metrics.i10Index.recent  ?? 0,
                    facultyId,
                ]
            );
        } catch (saveErr) {
            console.warn('[Scholar] Could not save metrics to DB:', saveErr.message);
        }

        res.json({
            success: true,
            facultyName: name,
            scholarUserId: userId,
            sinceYear,
            metrics,
            yearlyCitations,
            publications: (data.articles || []).slice(0, 10).map(article => ({
                title:    article.title,
                link:     article.link,
                authors:  article.authors,
                year:     article.year,
                cited_by: article.cited_by?.value ?? 0,
            })),
        });

    } catch (error) {
        console.error('Scholar metrics error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch Google Scholar metrics', error: error.message });
    }
};