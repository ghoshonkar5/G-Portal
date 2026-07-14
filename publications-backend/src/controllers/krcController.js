const pool = require('../config/database');
const XLSX = require('xlsx');

// ── Parse uploaded file into { headers[], dataRows[][] } ──────────────────────
// Handles both .xlsx/.xls (SheetJS) and .csv (manual parser)
function parseUploadedFile(fileBuffer, originalName) {
    const isExcel = /\.(xlsx|xls)$/i.test(originalName || '');

    if (isExcel) {
        const wb = XLSX.read(fileBuffer, { type: 'buffer', cellText: true, cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // sheet_to_json with header:1 gives array of arrays
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (rows.length < 2) return { headers: [], dataRows: [] };
        const headers = rows[0].map(h => String(h ?? '').trim().toLowerCase());
        const dataRows = rows.slice(1).map(r =>
            headers.map((_, i) => String(r[i] ?? '').trim())
        );
        return { headers, dataRows };
    }

    // CSV fallback
    const text = fileBuffer.toString('utf-8');
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return { headers: [], dataRows: [] };
    const rawHeaders = splitCommaLine(lines[0]);
    const headers = rawHeaders.map(h => clean(h).toLowerCase());
    const dataRows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) dataRows.push(splitCommaLine(line));
    }
    return { headers, dataRows };
}

// ── CSV parsing helpers ───────────────────────────────────────────
const splitCommaLine = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
            else { inQuotes = !inQuotes; }
        } else if (c === ',' && !inQuotes) {
            result.push(cur); cur = '';
        } else {
            cur += c;
        }
    }
    result.push(cur);
    return result;
};

const clean = (val) => (val || '').trim().replace(/^"|"$/g, '');

// ── Normalize journal title for matching ──────────────────────────
const normalizeTitle = (title) => {
    if (!title) return '';
    return title
        .toLowerCase()
        .trim()
        .replace(/\s+\d+\s*\(\d+\)\s*$/, '')
        .replace(/\s+vol\.?\s*\d+.*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const normalizeISSN = (val) => {
    if (!val) return null;
    const s = String(val).replace(/[-\s]/g, '').trim();
    return s || null;
};

const parseNum = (cells, idx) => {
    if (idx === -1 || idx >= cells.length) return null;
    const v = String(cells[idx] ?? '').replace(',', '.');
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
};

const parseIntVal = (cells, idx) => {
    if (idx === -1 || idx >= cells.length) return null;
    const v = String(cells[idx] ?? '');
    const n = parseInt(v);
    return isNaN(n) ? null : n;
};

// ── POST /api/krc/import-csv ──────────────────────────────────────
exports.importKRCCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { headers, dataRows } = parseUploadedFile(req.file.buffer, req.file.originalname);

        if (headers.length === 0) {
            return res.status(400).json({ success: false, message: 'File appears empty or unreadable' });
        }

        // Flexible column finder
        const col = (needle) =>
            headers.findIndex(h => h.includes(needle.toLowerCase()));

        // ASJC code: prefer a column that has 'asjc code' but NOT 'sub-subject';
        // fall back to any column containing 'asjc code' (covers Scopus KRC format)
        const asjcCodeIdx = (() => {
            const strict = headers.findIndex(h =>
                h.includes('asjc code') && !h.includes('sub-subject')
            );
            if (strict !== -1) return strict;
            return headers.findIndex(h => h.includes('asjc code'));
        })();

        const colIdx = {
            scopusSourceId:  col('scopus source id'),
            title:           col('title'),
            citationCount:   col('citation count'),
            scholarlyOutput: col('scholarly output'),
            percentCited:    col('percent cited'),
            citeScore:       col('citescore'),
            snip:            col('snip'),
            sjr:             col('sjr'),
            asjcCode:        asjcCodeIdx,
            subjectArea:     col('sub-subject area'),
            percentile:      col('percentile'),
            rank:            headers.findIndex(h => h.trim() === 'rank'),
            rankOutOf:       col('rank out of'),
            publisher:       col('publisher'),
            quartile:        col('quartile'),
            top10:           col('top 10'),
            printISSN:       col('print issn'),
            eISSN:           col('e-issn'),
        };

        if (colIdx.title === -1) {
            return res.status(400).json({
                success: false,
                message: 'Could not find Title column. Confirm this is a KRC Scopus CSV/XLSX.',
                foundHeaders: headers,
            });
        }

        const rows = [];
        for (const cells of dataRows) {
            const title = String(cells[colIdx.title] ?? '').trim();
            if (!title) continue;

            const titleNorm = normalizeTitle(title);

            // Parse quartile: "Q1"→1, "Q2"→2, plain 4→4
            let quartile = null;
            if (colIdx.quartile !== -1 && colIdx.quartile < cells.length) {
                const q = String(cells[colIdx.quartile] ?? '');
                const match = q.match(/(\d)/);
                if (match) quartile = parseInt(match[1]);
            }

            // Parse top 10%: "TRUE"/"FALSE"/"Yes"/"1"/true/false
            let top10 = null;
            if (colIdx.top10 !== -1 && colIdx.top10 < cells.length) {
                const t = String(cells[colIdx.top10] ?? '').toLowerCase();
                top10 = (t === 'true' || t === '1' || t === 'yes');
            }

            const getCell = (idx) =>
                idx !== -1 && idx < cells.length ? String(cells[idx] ?? '').trim() || null : null;

            rows.push([
                getCell(colIdx.scopusSourceId),          // $1
                title,                                    // $2
                titleNorm,                                // $3
                parseIntVal(cells, colIdx.citationCount), // $4
                parseIntVal(cells, colIdx.scholarlyOutput),// $5
                parseNum(cells, colIdx.percentCited),     // $6
                parseNum(cells, colIdx.citeScore),        // $7
                parseNum(cells, colIdx.snip),             // $8
                parseNum(cells, colIdx.sjr),              // $9
                getCell(colIdx.asjcCode),                 // $10
                getCell(colIdx.subjectArea),              // $11
                parseNum(cells, colIdx.percentile),       // $12
                parseIntVal(cells, colIdx.rank),          // $13
                parseIntVal(cells, colIdx.rankOutOf),     // $14
                getCell(colIdx.publisher),                // $15
                quartile,                                 // $16
                top10,                                    // $17
                normalizeISSN(getCell(colIdx.printISSN)), // $18
                normalizeISSN(getCell(colIdx.eISSN)),     // $19
            ]);
        }

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid rows found after parsing' });
        }

        // Bulk insert in batches of 500
        const BATCH = 500;
        let inserted = 0;
        for (let i = 0; i < rows.length; i += BATCH) {
            const batch = rows.slice(i, i + BATCH);
            const values = [];
            const placeholders = batch.map((row, idx) => {
                const base = idx * 19;
                values.push(...row);
                return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},$${base+13},$${base+14},$${base+15},$${base+16},$${base+17},$${base+18},$${base+19})`;
            });
            await pool.query(
                `INSERT INTO krc_journals
                    (scopus_source_id, title, title_norm, citation_count, scholarly_output,
                     percent_cited, cite_score, snip, sjr, asjc_code, sub_subject_area,
                     percentile, rank, rank_out_of, publisher, quartile, top_10_percent,
                     print_issn, e_issn)
                 VALUES ${placeholders.join(',')}`,
                values
            );
            inserted += batch.length;
        }

        res.json({
            success: true,
            message: `Imported ${inserted} KRC journal entries`,
            inserted,
            parsed: rows.length,
        });

    } catch (error) {
        console.error('[KRC] importKRCCSV error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── DELETE /api/krc/clear ─────────────────────────────────────────
exports.clearKRC = async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM krc_journals');
        res.json({
            success: true,
            message: `Cleared all KRC journal data (${result.rowCount} rows deleted)`,
        });
    } catch (error) {
        console.error('[KRC] clearKRC error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/krc/stats ────────────────────────────────────────────
exports.getKRCStats = async (req, res) => {
    try {
        const totals = await pool.query(`
            SELECT
                COUNT(*)::int                  AS total_rows,
                COUNT(DISTINCT title_norm)::int AS distinct_journals,
                MAX(uploaded_at)               AS last_uploaded_at
            FROM krc_journals
        `);
        const byQuartile = await pool.query(`
            SELECT
                quartile,
                COUNT(DISTINCT title_norm)::int AS count
            FROM krc_journals
            WHERE quartile IS NOT NULL
            GROUP BY quartile
            ORDER BY quartile ASC
        `);
        res.json({
            success: true,
            stats: totals.rows[0],
            byQuartile: byQuartile.rows,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── GET /api/krc/faculty/:id ──────────────────────────────────────
exports.getKRCForFaculty = async (req, res) => {
    try {
        const { id } = req.params;

        const pubsResult = await pool.query(
    `SELECT p.id, p.title, p.journal, p.authors,
            p.position_of_author, p.month_year, p.academic_year
     FROM publications p
     JOIN faculty_profile fp ON fp.id = p.faculty_id
     JOIN users u ON u.id = fp.user_id
     WHERE u.faculty_id = $1
     ORDER BY p.id DESC`,
    [id]
);
        const publications = pubsResult.rows;

        if (publications.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const journalNorms = [
            ...new Set(
                publications
                    .map(p => normalizeTitle(p.journal || ''))
                    .filter(Boolean)
            )
        ];

        let krcRows = [];
        if (journalNorms.length > 0) {
            const placeholders = journalNorms.map((_, i) => `$${i + 1}`).join(', ');
            const krcResult = await pool.query(
                `SELECT * FROM krc_journals
                 WHERE title_norm = ANY(ARRAY[${placeholders}])
                 ORDER BY quartile ASC NULLS LAST`,
                journalNorms
            );
            krcRows = krcResult.rows;
        }

        const krcMap = {};
        for (const row of krcRows) {
            if (!krcMap[row.title_norm]) krcMap[row.title_norm] = [];
            krcMap[row.title_norm].push({
                subjectArea:   row.sub_subject_area,
                asjcCode:      row.asjc_code,
                citationCount: row.citation_count,
                percentCited:  row.percent_cited,
                citeScore:     row.cite_score,
                snip:          row.snip,
                sjr:           row.sjr,
                percentile:    row.percentile,
                rank:          row.rank,
                rankOutOf:     row.rank_out_of,
                publisher:     row.publisher,
                quartile:      row.quartile,
                top10Percent:  row.top_10_percent,
            });
        }

        const data = publications.map(pub => {
            const norm = normalizeTitle(pub.journal || '');
            const krcMatches = krcMap[norm] || [];
            const bestMatch = krcMatches.length > 0
                ? krcMatches.reduce((best, cur) => {
                    if (best.quartile === null) return cur;
                    if (cur.quartile === null) return best;
                    return cur.quartile < best.quartile ? cur : best;
                  })
                : null;

            return {
                pubId:            pub.id,
                title:            pub.title,
                journal:          pub.journal,
                authors:          pub.authors,
                positionOfAuthor: pub.position_of_author,
                monthYear:        pub.month_year,
                academicYear:     pub.academic_year,
                krcMatches,
                bestMatch,
            };
        });

        res.json({ success: true, data });

    } catch (error) {
        console.error('[KRC] getKRCForFaculty error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};