const pool = require('../config/database');

const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY;
const SCOPUS_BASE = 'https://api.elsevier.com/content';

// ── CSV parsing helpers ───────────────────────────────────────────
const splitSemicolonLine = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (c === ';' && !inQuotes) {
            result.push(cur); cur = '';
        } else {
            cur += c;
        }
    }
    result.push(cur);
    return result;
};

const clean = (val) => (val || '').trim().replace(/^"|"$/g, '');


// ── Helper: normalize ISSN to 8 digits no hyphen ─────────────────
const normalizeISSN = (issn) => {
    if (!issn) return null;
    return issn.replace(/[-\s]/g, '').trim().toUpperCase();
};

// ── Helper: extract year from academic_year or month_year ─────────
const extractYear = (academicYear, monthYear) => {
    if (academicYear) {
        const y = parseInt(academicYear.split('-')[0]);
        if (!isNaN(y)) return y;
    }
    if (monthYear) {
        const parts = monthYear.split(' ');
        const y = parseInt(parts[parts.length - 1]);
        if (!isNaN(y)) return y;
    }
    return null;
};

// ── Scopus Serial Title API fallback ─────────────────────────────
const fetchFromScopusSerialAPI = async (issn) => {
    if (!SCOPUS_API_KEY || !issn) return null;
    try {
        const res = await fetch(
            `${SCOPUS_BASE}/serial/title/issn/${issn}`,
            { headers: { 'X-ELS-APIKey': SCOPUS_API_KEY, 'Accept': 'application/json' } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const entry = data?.['serial-metadata-response']?.entry?.[0];
        if (!entry) return null;

        const quartile = entry?.['SJRQuartileList']?.['SJRQuartile']?.[0]?.['$'] || null;
        const sjrScore = entry?.['SJRList']?.['SJR']?.[0]?.['$'] || null;
        const citeScore = entry?.['citeScoreYearInfoList']?.['citeScoreCurrentMetric'] || null;

        if (!quartile && !citeScore) return null;

        return {
            quartile:   quartile  || '',
            sjr_score:  sjrScore  ? parseFloat(sjrScore) : null,
            cite_score: citeScore || '',
            source:     'scopus_api',
        };
    } catch (e) {
        console.warn('[JournalRankings] Scopus Serial API error:', e.message);
        return null;
    }
};

// ── Core lookup: ISSN + year → metrics ───────────────────────────
// Called by scopusController, scholarController, wosController
exports.lookupJournalMetrics = async (issn, journalName, year) => {
    const normISSN = normalizeISSN(issn);
    const pubYear  = parseInt(year) || new Date().getFullYear();

    // 1. Exact ISSN + exact year
    if (normISSN) {
        const exact = await pool.query(
            `SELECT quartile, sjr_score, '' AS cite_score, 'scimago' AS source
             FROM journal_rankings
             WHERE (issn = $1 OR issn_e = $1) AND year = $2
             LIMIT 1`,
            [normISSN, pubYear]
        );
        if (exact.rows.length > 0) return exact.rows[0];

        // 2. ISSN + closest year <= pubYear (handles gap years)
        const closest = await pool.query(
            `SELECT quartile, sjr_score, '' AS cite_score, 'scimago' AS source
             FROM journal_rankings
             WHERE (issn = $1 OR issn_e = $1) AND year <= $2
             ORDER BY year DESC
             LIMIT 1`,
            [normISSN, pubYear]
        );
        if (closest.rows.length > 0) return closest.rows[0];
    }

    // 3. Journal name match + exact year
    if (journalName) {
        const byName = await pool.query(
            `SELECT quartile, sjr_score, '' AS cite_score, 'scimago' AS source
             FROM journal_rankings
             WHERE LOWER(journal_name) = LOWER($1) AND year = $2
             LIMIT 1`,
            [journalName.trim(), pubYear]
        );
        if (byName.rows.length > 0) return byName.rows[0];

        // 4. Journal name + closest year <= pubYear
        const byNameClosest = await pool.query(
            `SELECT quartile, sjr_score, '' AS cite_score, 'scimago' AS source
             FROM journal_rankings
             WHERE LOWER(journal_name) = LOWER($1) AND year <= $2
             ORDER BY year DESC
             LIMIT 1`,
            [journalName.trim(), pubYear]
        );
        if (byNameClosest.rows.length > 0) return byNameClosest.rows[0];
    }

    // 5. Scopus Serial Title API fallback
    if (normISSN) {
        const apiResult = await fetchFromScopusSerialAPI(normISSN);
        if (apiResult) return apiResult;
    }

    return null;
};

// ── POST /api/journal-rankings/import-csv?year=2024 ──────────────
exports.importScimagoCSV = async (req, res) => {
    try {
        // Auto-detect year from filename (e.g. "scimagojr 2023.csv")
        let year = parseInt(req.query.year);
        if (!year && req.file?.originalname) {
            const match = req.file.originalname.match(/(\d{4})/);
            if (match) year = parseInt(match[1]);
        }
        if (!year || year < 1990 || year > 2100) {
            return res.status(400).json({
                success: false,
                message: 'Could not detect year. Either name your file "scimagojr YYYY.csv" or pass ?year=YYYY in the URL.',
            });
        }

        // Check if this year already has data
        const existing = await pool.query(
            'SELECT COUNT(*)::int AS count FROM journal_rankings WHERE year = $1',
            [year]
        );
        if (existing.rows[0].count > 0) {
            return res.status(409).json({
                success: false,
                alreadyExists: true,
                year,
                existingCount: existing.rows[0].count,
                message: `Year ${year} already has ${existing.rows[0].count.toLocaleString()} entries. Delete it first before re-importing.`,
            });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
        }

        const text = req.file.buffer.toString('utf-8');
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        if (lines.length < 2) {
            return res.status(400).json({ success: false, message: 'CSV file appears empty' });
        }

        // Scimago uses semicolon delimiter
        const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));

        const colIdx = {
            title:    headers.findIndex(h => h.toLowerCase() === 'title'),
            issn:     headers.findIndex(h => h.toLowerCase() === 'issn'),
            sjr:      headers.findIndex(h => h.toLowerCase() === 'sjr'),
            quartile: headers.findIndex(h => h.toLowerCase().includes('quartile')),
            publisher:headers.findIndex(h => h.toLowerCase() === 'publisher'),
            country:  headers.findIndex(h => h.toLowerCase() === 'country'),
            categories: headers.findIndex(h => h.toLowerCase() === 'categories'),
        };

        if (colIdx.title === -1 || colIdx.quartile === -1) {
            return res.status(400).json({
                success: false,
                message: 'Could not find required columns (Title, Quartile) in CSV. Make sure this is a Scimago export.',
                foundHeaders: headers,
            });
        }

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cells = splitSemicolonLine(line);
            const rawTitle    = clean(cells[colIdx.title]);
            const rawISSN     = clean(cells[colIdx.issn]);
            const rawSJR      = clean(cells[colIdx.sjr]);
            const rawQuartile = clean(cells[colIdx.quartile]);

            if (!rawTitle || !rawQuartile || rawQuartile === '-') continue;

            // ISSN field: "12345678, 87654321" — split into print + electronic
            let issn = null, issnE = null;
            if (rawISSN) {
                const parts = rawISSN.split(',').map(s => normalizeISSN(s.trim()));
                issn  = parts[0] || null;
                issnE = parts[1] || null;
            }

            // SJR: European locale uses comma as decimal separator
            const sjrScore = rawSJR
                ? parseFloat(rawSJR.replace(',', '.'))
                : null;

            rows.push([
                issn,
                issnE,
                rawTitle,
                year,
                rawQuartile,
                isNaN(sjrScore) ? null : sjrScore,
                colIdx.categories !== -1 ? clean(cells[colIdx.categories]) : null,
                colIdx.publisher  !== -1 ? clean(cells[colIdx.publisher])  : null,
                colIdx.country    !== -1 ? clean(cells[colIdx.country])    : null,
            ]);
        }

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid rows found in CSV after parsing' });
        }

        // Bulk insert in batches of 500
        const BATCH = 500;
        let inserted = 0;
        for (let i = 0; i < rows.length; i += BATCH) {
            const batch = rows.slice(i, i + BATCH);
            const values = [];
            const placeholders = batch.map((row, idx) => {
                const base = idx * 9;
                values.push(...row);
                return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9})`;
            });
            await pool.query(
                `INSERT INTO journal_rankings
                    (issn, issn_e, journal_name, year, quartile, sjr_score, subject_area, publisher, country)
                 VALUES ${placeholders.join(',')}
                 ON CONFLICT DO NOTHING`,
                values
            );
            inserted += batch.length;
        }

        res.json({
            success: true,
            message: `Imported ${inserted} journal rankings for year ${year}`,
            year,
            inserted,
            parsed: rows.length,
        });

    } catch (error) {
        console.error('[JournalRankings] importScimagoCSV error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/journal-rankings/stats ──────────────────────────────
exports.getStats = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*)::int AS total_rows,
                MIN(year)     AS earliest_year,
                MAX(year)     AS latest_year,
                COUNT(DISTINCT year)::int AS year_count
            FROM journal_rankings
        `);
        const byYear = await pool.query(`
            SELECT year, COUNT(*)::int AS count
            FROM journal_rankings
            GROUP BY year
            ORDER BY year DESC
        `);
        res.json({
            success: true,
            stats: result.rows[0],
            byYear: byYear.rows,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── POST /api/journal-rankings/backfill-quartiles ─────────────────
exports.backfillQuartiles = async (req, res) => {
    // Respond immediately — runs in background
    res.json({ success: true, message: 'Backfill started in background. Check server logs for progress.' });

    try {
        const { rows } = await pool.query(`
            SELECT id, journal, academic_year, month_year, doi
            FROM publications
            WHERE (quartile IS NULL OR quartile = '')
              AND journal IS NOT NULL AND journal != ''
        `);

        console.log(`[Backfill] Starting quartile backfill for ${rows.length} publications`);
        let updated = 0, skipped = 0, failed = 0;

        for (const pub of rows) {
            try {
                const year = extractYear(pub.academic_year, pub.month_year);
                const metrics = await exports.lookupJournalMetrics(null, pub.journal, year);

                if (metrics?.quartile) {
                    await pool.query(
  `UPDATE publications
   SET quartile = $1, sjr_score = $2, cite_score = $3
   WHERE id = $4`,
  [metrics.quartile || '', metrics.sjr_score ? String(metrics.sjr_score) : '', metrics.cite_score || '', pub.id]
);
                    updated++;
                } else {
                    skipped++;
                }

                // Rate limit Scopus API calls
                await new Promise(r => setTimeout(r, 150));
            } catch (e) {
                console.error(`[Backfill] Failed for pub id=${pub.id}:`, e.message);
                failed++;
            }
        }

        console.log(`[Backfill] Done — updated: ${updated}, skipped: ${skipped}, failed: ${failed}`);
    } catch (err) {
        console.error('[Backfill] Fatal error:', err.message);
    }
};

// ── DELETE /api/journal-rankings/year/:year ───────────────────────
exports.deleteByYear = async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        if (!year || year < 1990 || year > 2100) {
            return res.status(400).json({ success: false, message: 'Invalid year' });
        }
        const result = await pool.query(
            'DELETE FROM journal_rankings WHERE year = $1',
            [year]
        );
        res.json({
            success: true,
            message: `Deleted ${result.rowCount} entries for year ${year}`,
            deleted: result.rowCount,
            year,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── DELETE /api/journal-rankings/all ─────────────────────────────
exports.deleteAll = async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM journal_rankings');
        res.json({
            success: true,
            message: `Deleted all ${result.rowCount} journal ranking entries`,
            deleted: result.rowCount,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};