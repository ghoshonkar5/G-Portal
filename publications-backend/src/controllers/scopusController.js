const { getAuthorPosition } = require('../utils/authorPosition');

const pool = require('../config/database');

const SCOPUS_API_KEY = process.env.SCOPUS_API_KEY;
const SCOPUS_BASE = 'https://api.elsevier.com/content';
const { lookupJournalMetrics } = require('./journalRankingsController');
const { autoCreateIfIncomplete } = require('./potentialFlagController');

// ── Helper: extract Scopus Author ID from URL ────────────────────
const extractScopusAuthorId = (url) => {
  if (!url) return null;
  const match = url.match(/authorId=(\d+)/i);
  return match ? match[1] : null;
};

// ── Helper: derive academic year ─────────────────────────────────
const toAcademicYear = (year) => {
  const y = parseInt(year);
  if (isNaN(y)) return null;
  return `${y}-${y + 1}`;
};

// ── Helper: derive monthYear string ──────────────────────────────
const toMonthYear = (coverDate) => {
  if (!coverDate) return '';
  const parts = coverDate.split('-');
  if (parts.length < 2) return '';
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const month = months[parseInt(parts[1]) - 1] || 'January';
  return `${month} ${parts[0]}`;
};

// ── Helper: format authors for text[] column ──────────────────────
const formatAuthors = (authorsStr) => {
  if (!authorsStr) return [];
  const parts = authorsStr.split(';').map(a => a.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [authorsStr.trim()];
};

// ── Detect authors column type once on startup ────────────────────
let authorsColumnIsArray = true;

const detectAuthorsColumnType = async () => {
  try {
    const result = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'publications' AND column_name = 'authors'
    `);
    if (result.rows.length > 0) {
      const dtype = result.rows[0].data_type;
      authorsColumnIsArray = (dtype === 'ARRAY');
      console.log(`[Scopus] authors column type: ${dtype} → treating as ${authorsColumnIsArray ? 'array' : 'text'}`);
    }
  } catch (e) {
    console.warn('[Scopus] Could not detect authors column type, defaulting to array');
  }
};
detectAuthorsColumnType();

// ── Prepare authors value based on column type ────────────────────
const authorsValue = (authorsStr) => {
  if (authorsColumnIsArray) return formatAuthors(authorsStr);
  return authorsStr || '';
};

// ── Map Scopus docType → target table ─────────────────────────────
const getTargetTable = (docType) => {
  const dt = (docType || '').toLowerCase();
  if (dt.includes('conference')) return 'conferences';
  if (dt.includes('book') || dt.includes('chapter')) return 'books_chapters';
  return 'publications';
};

// ── Shared: build a pub object from a Scopus entry ────────────────
const entryToPub = (entry) => {
  const doi = entry['prism:doi'] || '';
  const coverDate = entry['prism:coverDate'] || '';
  const year = coverDate ? coverDate.split('-')[0] : '';
  const pageRange = entry['prism:pageRange'] || '';
  const [startPage, lastPage] = pageRange.includes('-')
    ? pageRange.split('-')
    : [pageRange, ''];
  return {
    title:        entry['dc:title'] || '',
    journal:      entry['prism:publicationName'] || '',
    authors:      entry['dc:creator'] || '',
    citations:    parseInt(entry['citedby-count'] || '0') || 0,
    year,
    monthYear:    toMonthYear(coverDate),
    academicYear: toAcademicYear(year),
    volume:       entry['prism:volume'] || '',
    issue:        entry['prism:issueIdentifier'] || '',
    startPage:    startPage.trim(),
    lastPage:     (lastPage || '').trim(),
    doi,
    link:         doi ? `https://doi.org/${doi}` : (entry['prism:url'] || ''),
    indexing:     'Scopus',
    docType:      entry['subtypeDescription'] || '',
    source:       'scopus',
    issn:         (entry['prism:issn'] || entry['prism:eIssn'] || '').replace(/-/g, ''),
  };
};

// ── Shared: paginated fetch from Scopus search API ────────────────
const fetchAllPubs = async (authorId, maxResults = 500) => {
  const pubs = [];
  let start = 0;
  const count = 25;
  let totalResults = Infinity;

  while (pubs.length < totalResults && pubs.length < maxResults) {
    const searchRes = await fetch(
`${SCOPUS_BASE}/search/scopus?query=AU-ID(${authorId})&field=dc:title,prism:publicationName,prism:coverDate,dc:creator,prism:doi,citedby-count,prism:volume,prism:issueIdentifier,prism:pageRange,subtypeDescription,prism:url,prism:issn,prism:eIssn&count=${count}&start=${start}`,

{ headers: { 'X-ELS-APIKey': SCOPUS_API_KEY, 'Accept': 'application/json' } }
    );

    if (!searchRes.ok) {
      const err = new Error(`Scopus API error: ${searchRes.status}`);
      err.status = searchRes.status;
      throw err;
    }

    const searchData = await searchRes.json();
    const results = searchData?.['search-results'];
    if (!results) break;

    if (start === 0) {
      totalResults = parseInt(results['opensearch:totalResults'] || '0');
      if (totalResults === 0) break;
    }

    const entries = results.entry || [];
    if (entries.length === 0) break;

    for (const entry of entries) pubs.push(entryToPub(entry));

    start += count;
    if (entries.length < count) break;
  }

  return { pubs, totalResults };
};

// ── Shared: fetch author profile metrics ─────────────────────────
const fetchAuthorProfile = async (authorId) => {
  const profileRes = await fetch(
    `${SCOPUS_BASE}/author/author_id/${authorId}?field=h-index,citation-count,document-count,affiliation-current`,
    { headers: { 'X-ELS-APIKey': SCOPUS_API_KEY, 'Accept': 'application/json' } }
  );
if (!profileRes.ok) {
  console.log('[DEBUG] fetchAuthorProfile API failed:', profileRes.status, profileRes.statusText);
  return null;
}  const profileData = await profileRes.json();
console.log('[DEBUG] full API response:', JSON.stringify(profileData, null, 2)); // ← ADD HERE

  // The Scopus Author Retrieval API returns h-index at the TOP LEVEL of
  // author-retrieval-response[0], NOT inside coredata.
  // citation-count and document-count ARE inside coredata.
  const authorResponse = profileData?.['author-retrieval-response']?.[0];
  if (!authorResponse) return null;
 console.log('[DEBUG fetchAuthorProfile] raw response:', JSON.stringify(profileData, null, 2));
  console.log('[DEBUG fetchAuthorProfile] authorResponse keys:', Object.keys(authorResponse || {}));
  console.log('[DEBUG fetchAuthorProfile] h-index value:', authorResponse?.['h-index']);
  const coredata = authorResponse?.coredata;
  if (!coredata) return null;

  return {
    hIndex:        parseInt(authorResponse['h-index']      || '0'),  // top-level
    citationCount: parseInt(coredata['citation-count']     || '0'),  // in coredata
    documentCount: parseInt(coredata['document-count']     || '0'),  // in coredata
  };
};

// ── NEW: Fetch per-year citation counts from Citation Overview API ─
const fetchYearlyCitationsFromAPI = async (authorId) => {
  try {
    const curYear = new Date().getFullYear();
    const res = await fetch(
      `${SCOPUS_BASE}/author/citation-count?author_id=${authorId}&date=2000-${curYear}`,
      { headers: { 'X-ELS-APIKey': SCOPUS_API_KEY, 'Accept': 'application/json' } }
    );
    if (!res.ok) {
      console.warn(`[Scopus] Citation Overview API returned ${res.status} — falling back to DB`);
      return null;
    }
    const data = await res.json();
    const entries = data?.['author-citation-response']?.['citation-range']?.entry || [];
    if (!Array.isArray(entries) || entries.length === 0) return null;

    return entries.map(e => ({
      year:      String(e['@name'] || e['year'] || ''),
      citations: parseInt(e['$'] || e['citationCount'] || '0'),
    })).filter(e => e.year && !isNaN(Number(e.year)));
  } catch (err) {
    console.warn('[Scopus] Citation Overview API error:', err.message);
    return null;
  }
};

// ── Shared: check duplicate and insert one pub ────────────────────
const checkDuplicate = async (dbFacultyId, pub) => {
  const table = getTargetTable(pub.docType);
  if (pub.doi) {
    const existing = await pool.query(
`SELECT ${table === 'books_chapters' ? 'id' : 'id, indexing'} FROM ${table} WHERE faculty_id = $1 AND doi = $2`,      [dbFacultyId, pub.doi]
    );
    if (existing.rows.length > 0) return existing.rows[0];
  }
  const existingByTitle = await pool.query(
`SELECT ${table === 'books_chapters' ? 'id' : 'id, indexing'} FROM ${table} WHERE faculty_id = $1 AND LOWER(title) = LOWER($2)`,    [dbFacultyId, pub.title]
  );
  return existingByTitle.rows.length > 0 ? existingByTitle.rows[0] : null;
};

const insertPublication = async (dbFacultyId, pub, facultyName = '') => {
  const table = getTargetTable(pub.docType);

  if (table === 'conferences') {
    await pool.query(
      `INSERT INTO conferences
        (faculty_id, title, conference_name, date, authors, indexing,
         doi, link, academic_year, type, scopus_citations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        dbFacultyId,
        pub.title || '',
        pub.journal || '',
        pub.year ? `${pub.year}-01-01` : null,
        authorsValue(pub.authors),
        'Scopus',
        pub.doi || '',
        pub.link || '',
        pub.academicYear || '',
        'International',
        pub.citations || 0,
      ]
    );
  } else if (table === 'books_chapters') {
    await pool.query(
      `INSERT INTO books_chapters
        (faculty_id, title, author_name, publisher,
         month_year, academic_year, type, link)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        dbFacultyId,
        pub.title || '',
        pub.authors || '',
        pub.journal || '',
        pub.monthYear || '',
        pub.academicYear || '',
        'Book Chapter',
        pub.link || '',
      ]
    );
} else {
    // ── Enrich with journal quartile metrics ──────────────────────
    let quartile = '', sjrScore = '', citeScore = '';
    try {
      const metrics = await lookupJournalMetrics(
        pub.issn || null,
        pub.journal || null,
        parseInt(pub.year) || new Date().getFullYear()
      );
      if (metrics) {
        quartile  = metrics.quartile   || '';
        sjrScore  = metrics.sjr_score  ? String(metrics.sjr_score) : '';
        citeScore = metrics.cite_score || '';
      }
    } catch (e) {
      console.warn('[Scopus] Quartile lookup failed for', pub.journal, ':', e.message);
    }

     const scopusInserted = await pool.query(
      `INSERT INTO publications
        (faculty_id, title, journal, quartile, impact_factor, cite_score, sjr_score,
 wos_citations, scopus_citations, google_citations,
 authors, indexing, area_of_paper, apa_format, position_of_author,
 volume, issue, start_page, last_page, month_year, academic_year,
 list_of_paper_from_journal, doi, link, source)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
RETURNING id`,
      [
        dbFacultyId,
        pub.title || '',
        pub.journal || '',
         quartile,
        '',
        citeScore,
        sjrScore,
        0,
        pub.citations || 0,
        0,
        authorsValue(pub.authors),
        'Scopus',
        pub.docType || '',
        '',
        getAuthorPosition(
          Array.isArray(pub.authors)
            ? pub.authors
            : pub.authors ? pub.authors.split(';').map(a => a.trim()).filter(Boolean) : [],
          facultyName
        ) || '',
        pub.volume || '',
        pub.issue || '',
        pub.startPage || '',
        pub.lastPage || '',
        pub.monthYear || '',
        pub.academicYear || '',
        '',
        pub.doi || '',
        pub.link || '',
        'scopus'
      ]
    );
    await autoCreateIfIncomplete(scopusInserted.rows[0].id);
  }
};

// ── Preview: fetch Scopus publications (no save) ──────────────────
exports.previewScopus = async (req, res) => {
  try {
    if (!SCOPUS_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Scopus API key not configured. Please set SCOPUS_API_KEY in your environment variables.'
      });
    }

    const { facultyId } = req.params;

    const facultyResult = await pool.query(
      `SELECT fp.id, fp.scopus_url, fp.scopus_url_2, fp.scopus_url_3, u.name
       FROM faculty_profile fp
       JOIN users u ON fp.user_id = u.id
       WHERE u.faculty_id = $1`,
      [facultyId]
    );
    if (facultyResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    const faculty = facultyResult.rows[0];

    const scopusUrls = [faculty.scopus_url, faculty.scopus_url_2, faculty.scopus_url_3]
      .filter(Boolean);

    if (scopusUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No Scopus URL saved in your profile. Please update your profile first.'
      });
    }

    const authorIds = scopusUrls.map(extractScopusAuthorId).filter(Boolean);
    if (authorIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract Author ID from your Scopus URL(s). Format should be: https://www.scopus.com/authid/detail.uri?authorId=XXXXXXXXXX'
      });
    }

    // Fetch from all accounts, merge and deduplicate by DOI then title
    const authorProfile = await fetchAuthorProfile(authorIds[0]);
    let allPubs = [];
    let totalResults = 0;

    for (const authorId of authorIds) {
      try {
        const result = await fetchAllPubs(authorId, 200);
        allPubs = allPubs.concat(result.pubs);
        totalResults += result.totalResults;
      } catch (err) {
        if (err.status === 401) {
          return res.status(401).json({
            success: false,
            message: 'Scopus API authentication failed. You may need to be on the college network, or the API key may be invalid.'
          });
        }
        throw err;
      }
    }

    // Deduplicate: DOI wins, then lowercase title
    const seen = new Set();
    const pubs = allPubs.filter(p => {
      const key = p.doi ? `doi:${p.doi.toLowerCase()}` : `title:${p.title.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({
      success: true,
      count: pubs.length,
      totalInScopus: totalResults,
      authorProfile,
      authorIds,
      data: pubs,
    });

  } catch (error) {
    console.error('Scopus preview error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch from Scopus', error: error.message });
  }
};

// ── Import selected Scopus publications to DB ─────────────────────
// FIX: Now also saves h-index, citation count, doc count from author profile
exports.importScopus = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { publications } = req.body;

    if (!publications || !Array.isArray(publications) || publications.length === 0) {
      return res.status(400).json({ success: false, message: 'No publications provided for import' });
    }

    const facultyResult = await pool.query(
        `SELECT fp.id, fp.scopus_url, fp.scopus_url_2, fp.scopus_url_3, u.name
         FROM faculty_profile fp
         JOIN users u ON fp.user_id = u.id
         WHERE u.faculty_id = $1`,
        [facultyId]
    );
    if (facultyResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
const { id: dbFacultyId, name: facultyName, scopus_url, scopus_url_2, scopus_url_3 } = facultyResult.rows[0];
    let imported = 0, skipped = 0;
    const errors = [];

    for (const pub of publications) {
      try {
const existingRow = await checkDuplicate(dbFacultyId, pub);
if (existingRow) {
  const table = getTargetTable(pub.docType);
  if (table !== 'books_chapters') {
    const updates = [];
    const values = [];
    let idx = 1;
    if (pub.citations > 0) {
      updates.push(`scopus_citations = $${idx++}`);
      values.push(pub.citations);
    }
    const currentIndexing = existingRow.indexing || '';
    if (!currentIndexing.includes('Scopus')) {
      updates.push(`indexing = $${idx++}`);
      values.push(currentIndexing ? `${currentIndexing}, Scopus` : 'Scopus');
    }
    if (updates.length > 0) {
      values.push(existingRow.id);
      await pool.query(
        `UPDATE ${table} SET ${updates.join(', ')} WHERE id = $${idx}`,
        values
      );
    }
  }
  skipped++;
  continue;
}  

await insertPublication(dbFacultyId, pub, facultyName);
        imported++;
      } catch (err) {
        console.error(`Failed to import "${pub.title}":`, err.message);
        errors.push(pub.title);
      }
    }

    // ── FIX: Save author-level metrics (h-index, citations, doc count) ──
    // importScopus was missing this — so h-index was never written to DB
    // when faculty used Import instead of Sync.
    const authorId = extractScopusAuthorId(scopus_url)
      || extractScopusAuthorId(scopus_url_2)
      || extractScopusAuthorId(scopus_url_3);
    if (authorId) {
      try {
        const profile = await fetchAuthorProfile(authorId);
        if (profile) {
          await pool.query(
            `UPDATE faculty_profile SET
               scopus_citation_count = $1,
               scopus_h_index        = $2,
               scopus_doc_count      = $3,
               scopus_last_synced    = NOW()
             WHERE user_id = (SELECT id FROM users WHERE faculty_id = $4)`,
            [profile.citationCount, profile.hIndex, profile.documentCount, facultyId]
          );
          console.log(`[Import] Saved author metrics for ${facultyId}: h-index=${profile.hIndex}, citations=${profile.citationCount}`);
        }
      } catch (profileErr) {
        // Non-fatal: import still succeeded, just metrics not saved
        console.warn('[Import] Could not save author metrics:', profileErr.message);
      }
    }

    res.json({
      success: true,
      message: `Scopus import complete: ${imported} imported, ${skipped} skipped (duplicates)${errors.length ? `, ${errors.length} failed` : ''}`,
      imported, skipped, errors,
    });

  } catch (error) {
    console.error('Scopus import error:', error);
    res.status(500).json({ success: false, message: 'Import failed', error: error.message });
  }
};

// ── Sync: auto-sync all Scopus publications for one faculty ───────
exports.syncScopus = async (req, res) => {
  try {
    if (!SCOPUS_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Scopus API key not configured. Please set SCOPUS_API_KEY in environment variables.'
      });
    }

    const { facultyId } = req.params;

    const facultyResult = await pool.query(
        `SELECT fp.id, fp.scopus_url, fp.scopus_url_2, fp.scopus_url_3, u.name
         FROM faculty_profile fp
         JOIN users u ON fp.user_id = u.id
         WHERE u.faculty_id = $1`,
        [facultyId]
    );
    if (facultyResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    const row = facultyResult.rows[0];
const dbFacultyId = row.id;
const facultyName = row.name;

    const scopusUrls = [row.scopus_url, row.scopus_url_2, row.scopus_url_3].filter(Boolean);
    const authorIds = scopusUrls.map(extractScopusAuthorId).filter(Boolean);

    if (authorIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid Scopus URL in profile. Please save your Scopus profile URL in profile settings.'
      });
    }

    let allPubs = [];
    for (const authorId of authorIds) {
      try {
        const result = await fetchAllPubs(authorId, 500);
        allPubs = allPubs.concat(result.pubs);
      } catch (err) {
        return res.status(err.status === 401 ? 401 : 502).json({
          success: false,
          message: err.status === 401
            ? 'Scopus API authentication failed. Please ensure you are on the college network.'
            : `Scopus API error: ${err.status}`
        });
      }
    }

    // Deduplicate across accounts
    const seen = new Set();
    const pubs = allPubs.filter(p => {
      const key = p.doi ? `doi:${p.doi.toLowerCase()}` : `title:${p.title.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const authorId = authorIds[0]; // primary for metrics

    let imported = 0, skipped = 0;
    const insertErrors = [];

    for (const pub of pubs) {
      try {
const existingRow = await checkDuplicate(dbFacultyId, pub);
if (existingRow) {
  const table = getTargetTable(pub.docType);
  if (table !== 'books_chapters') {
    const updates = [];
    const values = [];
    let idx = 1;
    // Always update scopus_citations if we have a value
    if (pub.citations > 0) {
      updates.push(`scopus_citations = $${idx++}`);
      values.push(pub.citations);
    }
    // Update indexing if Scopus not already there
    const currentIndexing = existingRow.indexing || '';
    if (!currentIndexing.includes('Scopus')) {
      updates.push(`indexing = $${idx++}`);
      values.push(currentIndexing ? `${currentIndexing}, Scopus` : 'Scopus');
    }
    if (updates.length > 0) {
      values.push(existingRow.id);
      await pool.query(
        `UPDATE ${table} SET ${updates.join(', ')} WHERE id = $${idx}`,
        values
      );
    }
  }
  skipped++;
  continue;
}    


await insertPublication(dbFacultyId, pub, facultyName);
        imported++;
      } catch (err) {
        console.error(`Sync insert error for "${pub.title}":`, err.message);
        insertErrors.push({ title: pub.title, error: err.message });
      }
    }

console.log(`[Sync] facultyId=${facultyId}: ${imported} imported, ${skipped} skipped, ${insertErrors.length} errors`);

    // Send success response immediately — don't let metrics API failure block it
    res.json({
      success: true,
      message: `Scopus sync complete: ${imported} new publications imported, ${skipped} already existed${insertErrors.length ? `, ${insertErrors.length} failed` : ''}`,
      imported,
      skipped,
      total: pubs.length,
      errors: insertErrors.length,
    });

    // Save author-level metrics after response (non-blocking)
    try {
      const profile = await fetchAuthorProfile(authorId);
      if (profile) {
        await pool.query(
          `UPDATE faculty_profile SET
             scopus_citation_count = $1,
             scopus_h_index        = $2,
             scopus_doc_count      = $3,
             scopus_last_synced    = NOW()
           WHERE user_id = (SELECT id FROM users WHERE faculty_id = $4)`,
          [profile.citationCount, profile.hIndex, profile.documentCount, facultyId]
        );
      } else {
        await pool.query(
          `UPDATE faculty_profile SET scopus_last_synced = NOW() WHERE user_id = (SELECT id FROM users WHERE faculty_id = $1)`,
          [facultyId]
        );
      }
    } catch (profileErr) {
      console.warn('[Scopus] Could not save author metrics:', profileErr.message);
      await pool.query(
        `UPDATE faculty_profile SET scopus_last_synced = NOW() WHERE user_id = (SELECT id FROM users WHERE faculty_id = $1)`,
        [facultyId]
      ).catch(() => {});
    }

  } catch (error) {
    console.error('Scopus sync error:', error);
    res.status(500).json({ success: false, message: 'Sync failed', error: error.message });
  }
};

// ── Nightly sync: runs for ALL faculty ───────────────────────────
const runNightlyScopusSync = async () => {
  if (!SCOPUS_API_KEY) {
    console.error('[NightlySync] SCOPUS_API_KEY not set, skipping.');
    return;
  }

  try {
    const { rows: facultyList } = await pool.query(
      `SELECT u.faculty_id, fp.id, fp.scopus_url, fp.scopus_url_2, fp.scopus_url_3, u.name
       FROM faculty_profile fp
       JOIN users u ON fp.user_id = u.id
       WHERE fp.scopus_url IS NOT NULL AND fp.scopus_url != ''`
    );

    console.log(`[NightlySync] Found ${facultyList.length} faculty with Scopus URLs`);

    let totalImported = 0, totalSkipped = 0, totalFailed = 0;

    for (const faculty of facultyList) {
      try {
        const scopusUrls = [faculty.scopus_url, faculty.scopus_url_2, faculty.scopus_url_3].filter(Boolean);
        const authorIds = scopusUrls.map(extractScopusAuthorId).filter(Boolean);
        if (authorIds.length === 0) {
          console.warn(`[NightlySync] Could not extract Author ID for ${faculty.name}, skipping`);
          continue;
        }
        const authorId = authorIds[0]; // primary for metrics

        let allPubs = [];
        try {
          for (const aid of authorIds) {
            const result = await fetchAllPubs(aid, 500);
            allPubs = allPubs.concat(result.pubs);
          }
        } catch (err) {
          console.error(`[NightlySync] API error for ${faculty.name}:`, err.message);
          totalFailed++;
          continue;
        }

        // Deduplicate across accounts
        const seen = new Set();
        const pubs = allPubs.filter(p => {
          const key = p.doi ? `doi:${p.doi.toLowerCase()}` : `title:${p.title.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        let imported = 0, skipped = 0;

        for (const pub of pubs) {
          try {
            const existingRow = await checkDuplicate(faculty.id, pub);
if (existingRow) {
  const table = getTargetTable(pub.docType);
  // Update citations
  if (pub.doi) {
    await pool.query(
      `UPDATE ${table} SET scopus_citations=$1 WHERE faculty_id=$2 AND doi=$3`,
      [pub.citations, faculty.id, pub.doi]
    ).catch(() => {});
  }
  // Update indexing if needed
  const currentIndexing = existingRow.indexing || '';
  if (!currentIndexing.includes('Scopus')) {
    const newIndexing = currentIndexing ? `${currentIndexing}, Scopus` : 'Scopus';
    await pool.query(
      `UPDATE ${table} SET indexing = $1 WHERE id = $2`,
      [newIndexing, existingRow.id]
    ).catch(() => {});
  }
  skipped++;
  continue;
}
            await insertPublication(faculty.id, pub, faculty.name);
            imported++;
          } catch (err) {
            console.error(`[NightlySync] Insert error for "${pub.title}":`, err.message);
          }
        }

        // Save metrics and timestamp
        try {
          const profile = await fetchAuthorProfile(authorId);
          if (profile) {
            await pool.query(
              `UPDATE faculty_profile SET
                 scopus_citation_count = $1,
                 scopus_h_index        = $2,
                 scopus_doc_count      = $3,
                 scopus_last_synced    = NOW()
               WHERE id = $4`,
              [profile.citationCount, profile.hIndex, profile.documentCount, faculty.id]
            );
          } else {
            await pool.query(
              `UPDATE faculty_profile SET scopus_last_synced = NOW() WHERE id = $1`,
              [faculty.id]
            );
          }
        } catch { /* non-fatal */ }

        console.log(`[NightlySync] ${faculty.name}: ${imported} new, ${skipped} updated/skipped`);
        totalImported += imported;
        totalSkipped  += skipped;

        await new Promise(r => setTimeout(r, 500));

      } catch (err) {
        console.error(`[NightlySync] Failed for ${faculty.name}:`, err.message);
        totalFailed++;
      }
    }

    console.log(`[NightlySync] ✅ Done — ${totalImported} imported, ${totalSkipped} updated/skipped, ${totalFailed} faculty failed`);

  } catch (err) {
    console.error('[NightlySync] Fatal error:', err.message);
  }
};

exports.runNightlyScopusSync = runNightlyScopusSync;

// ── Admin: manually trigger sync for all faculty ──────────────────
exports.syncAll = async (req, res) => {
  res.json({ success: true, message: 'Nightly sync triggered manually, running in background...' });
  runNightlyScopusSync();
};

// ── GET /api/scopus/metrics/:facultyId ────────────────────────────
// FIX: Added recentHIndex calculation. Fixed NULL h-index returning 0.
exports.getMetrics = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const facResult = await pool.query(
      `SELECT fp.id, fp.scopus_citation_count, fp.scopus_h_index, fp.scopus_doc_count, fp.scopus_last_synced, fp.scopus_url
       FROM faculty_profile fp
       JOIN users u ON fp.user_id = u.id
       WHERE u.faculty_id = $1`,
      [facultyId]
    );
    if (facResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    const row         = facResult.rows[0];
        console.log('[DEBUG getMetrics] scopus_h_index from DB:', row.scopus_h_index, typeof row.scopus_h_index);
    const dbFacultyId = row.id;

    // ── FIX: If h-index is NULL or 0 in DB, fetch it live from Scopus API ──
    // Treats 0 same as NULL — a real h-index of 0 is extremely rare and means
    // no papers have any citations, so fetching live is always safe here.
    // Once fetched, it's persisted so subsequent loads are instant.
    let hIndex = row.scopus_h_index !== null ? parseInt(row.scopus_h_index) : null;
     console.log('[DEBUG getMetrics] parsed hIndex:', hIndex, '— will fetch API?', hIndex === null || hIndex === 0);
    if (hIndex === null || hIndex === 0) {
      const authorId = extractScopusAuthorId(row.scopus_url);
      if (authorId) {
        try {
          const profile = await fetchAuthorProfile(authorId);
          if (profile) {
            hIndex = profile.hIndex;
            // Persist all three — always overwrite so stale 0s get corrected
            await pool.query(
              `UPDATE faculty_profile SET
                 scopus_h_index        = $1,
                 scopus_citation_count = $2,
                 scopus_doc_count      = $3
               WHERE user_id = (SELECT id FROM users WHERE faculty_id = $4)`,
              [profile.hIndex, profile.citationCount, profile.documentCount, facultyId]
            );
          }
        } catch (e) {
          console.warn('[getMetrics] Could not fetch h-index from API:', e.message);
        }
      }
      hIndex = hIndex ?? 0;
    }

    const sinceYear = new Date().getFullYear() - 4;

    // ── Recent citations (publications only — conferences rarely have year-filtered citations) ──
    const recentCiteResult = await pool.query(
      `SELECT COALESCE(SUM(scopus_citations), 0)::int AS recent_citations
       FROM publications
       WHERE faculty_id = $1
         AND indexing ILIKE '%scopus%'
         AND (
           NULLIF(SPLIT_PART(academic_year, '-', 1), '')::int >= $2
           OR
           NULLIF(SPLIT_PART(month_year, ' ', 2), '')::int >= $2
         )`,
      [dbFacultyId, sinceYear]
    );

    // ── Also count recent citations from conferences ──────────────
    const recentCiteConf = await pool.query(
      `SELECT COALESCE(SUM(scopus_citations), 0)::int AS recent_citations
       FROM conferences
       WHERE faculty_id = $1
         AND indexing ILIKE '%scopus%'
         AND NULLIF(SPLIT_PART(academic_year, '-', 1), '')::int >= $2`,
      [dbFacultyId, sinceYear]
    );

    const recentDocPub = await pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM publications
       WHERE faculty_id = $1
         AND indexing ILIKE '%scopus%'
         AND (
           NULLIF(SPLIT_PART(academic_year, '-', 1), '')::int >= $2
           OR
           NULLIF(SPLIT_PART(month_year, ' ', 2), '')::int >= $2
         )`,
      [dbFacultyId, sinceYear]
    );
    const recentDocConf = await pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM conferences
       WHERE faculty_id = $1
         AND indexing ILIKE '%scopus%'
         AND NULLIF(SPLIT_PART(academic_year, '-', 1), '')::int >= $2`,
      [dbFacultyId, sinceYear]
    );

    const recentCitations = (recentCiteResult.rows[0]?.recent_citations ?? 0)
                          + (recentCiteConf.rows[0]?.recent_citations   ?? 0);
    const recentDocCount  = (recentDocPub.rows[0]?.cnt  ?? 0)
                          + (recentDocConf.rows[0]?.cnt  ?? 0);

    // ── FIX: Compute recentHIndex from per-paper citations since sinceYear ──
    // h-index = largest h such that h papers each have >= h citations.
    // We compute it from the papers published since sinceYear.
    const recentPapersResult = await pool.query(
      `SELECT scopus_citations FROM publications
       WHERE faculty_id = $1
         AND indexing ILIKE '%scopus%'
         AND (
           NULLIF(SPLIT_PART(academic_year, '-', 1), '')::int >= $2
           OR
           NULLIF(SPLIT_PART(month_year, ' ', 2), '')::int >= $2
         )
       UNION ALL
       SELECT scopus_citations FROM conferences
       WHERE faculty_id = $1
         AND indexing ILIKE '%scopus%'
         AND NULLIF(SPLIT_PART(academic_year, '-', 1), '')::int >= $2`,
      [dbFacultyId, sinceYear]
    );

    const citationsList = recentPapersResult.rows
      .map(r => parseInt(r.scopus_citations || '0'))
      .sort((a, b) => b - a); // descending

    let recentHIndex = 0;
    for (let i = 0; i < citationsList.length; i++) {
      if (citationsList[i] >= i + 1) recentHIndex = i + 1;
      else break;
    }

    res.json({
      success:          true,
      citationCount:    row.scopus_citation_count || 0,
      hIndex,                      // FIX: was row.scopus_h_index || 0 (NULL → 0 bug)
      docCount:         row.scopus_doc_count      || 0,
      lastSynced:       row.scopus_last_synced    || null,
      recentCitations,             // FIX: now includes conferences too
      recentHIndex,                // FIX: was never computed before
      recentDocCount,
      sinceYear,
    });
  } catch (error) {
    console.error('getMetrics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/scopus/last-synced/:facultyId ────────────────────────
exports.getLastSynced = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const result = await pool.query(
      `SELECT fp.scopus_last_synced
       FROM faculty_profile fp
       JOIN users u ON fp.user_id = u.id
       WHERE u.faculty_id = $1`,
      [facultyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    res.json({
      success:    true,
      lastSynced: result.rows[0].scopus_last_synced || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/scopus/yearly-stats/:facultyId ───────────────────────
exports.getYearlyStats = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const facResult = await pool.query(
      `SELECT fp.id, fp.scopus_url, fp.scopus_citation_count
       FROM faculty_profile fp
       JOIN users u ON fp.user_id = u.id
       WHERE u.faculty_id = $1`,
      [facultyId]
    );
    if (facResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    const { id: dbFacultyId, scopus_url, scopus_citation_count } = facResult.rows[0];
    const authorId = extractScopusAuthorId(scopus_url);
    const totalCitationCount = parseInt(scopus_citation_count || '0');

    // ── 1. Try Citation Overview API for real per-year citations ──
    let apiYearlyCitations = null;
    if (authorId && SCOPUS_API_KEY) {
      apiYearlyCitations = await fetchYearlyCitationsFromAPI(authorId);
    }

    // ── 2. Get doc counts per year from DB ────────────────────────
    const pubResult = await pool.query(
      `SELECT
         COALESCE(
           NULLIF(SPLIT_PART(academic_year, '-', 1), ''),
           NULLIF(SPLIT_PART(month_year, ' ', 2), '')
         ) AS year,
         COUNT(*)::int                           AS docs,
         COALESCE(SUM(scopus_citations), 0)::int AS citations
       FROM publications
       WHERE faculty_id = $1
         AND indexing ILIKE '%scopus%'
       GROUP BY year
       ORDER BY year ASC`,
      [dbFacultyId]
    );

    const confResult = await pool.query(
      `SELECT
         NULLIF(SPLIT_PART(academic_year, '-', 1), '') AS year,
         COUNT(*)::int                            AS docs,
         COALESCE(SUM(scopus_citations), 0)::int  AS citations
       FROM conferences
       WHERE faculty_id = $1
         AND indexing ILIKE '%scopus%'
       GROUP BY year
       ORDER BY year ASC`,
      [dbFacultyId]
    );

    // ── 3. Merge doc counts by year ───────────────────────────────
    const docsByYear    = {};
    const dbCitesByYear = {};

    for (const row of [...pubResult.rows, ...confResult.rows]) {
      const yr = String(row.year || '').slice(0, 4);
      if (!yr || isNaN(Number(yr))) continue;
      docsByYear[yr]    = (docsByYear[yr]    || 0) + Number(row.docs);
      dbCitesByYear[yr] = (dbCitesByYear[yr] || 0) + Number(row.citations);
    }

    // ── 4. Build final citation map ───────────────────────────────
    let citByYear = {};

    if (apiYearlyCitations && apiYearlyCitations.length > 0) {
      console.log('[Scopus] Using Citation Overview API data for yearly chart');
      apiYearlyCitations.forEach(e => { citByYear[e.year] = e.citations; });
    } else {
      console.log('[Scopus] Citation Overview API unavailable — using DB citation counts');
      citByYear = { ...dbCitesByYear };

      const summedCitations = Object.values(citByYear).reduce((s, v) => s + v, 0);
      if (summedCitations === 0 && totalCitationCount > 0 && Object.keys(docsByYear).length > 0) {
        console.log('[Scopus] All per-pub citations are 0 — distributing total proportionally by doc count');
        const totalDocs = Object.values(docsByYear).reduce((s, v) => s + v, 0);
        for (const yr of Object.keys(docsByYear)) {
          citByYear[yr] = Math.round((docsByYear[yr] / totalDocs) * totalCitationCount);
        }
      }
    }

    // ── 5. Merge all years and build response ─────────────────────
    const allYears = new Set([
      ...Object.keys(docsByYear),
      ...Object.keys(citByYear),
    ]);

    if (allYears.size === 0) {
      return res.json({ success: true, yearly: [] });
    }

    const yearly = [...allYears]
      .filter(yr => yr && !isNaN(Number(yr)))
      .sort((a, b) => Number(a) - Number(b))
      .map(year => ({
        year,
        docs:      docsByYear[year]  || 0,
        citations: citByYear[year]   || 0,
      }));

    res.json({ success: true, yearly });

  } catch (error) {
    console.error('getYearlyStats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── One-time: backfill scopus_citations for existing conference rows ──
exports.backfillConferenceCitations = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.doi, c.faculty_id 
       FROM conferences c
       WHERE c.indexing ILIKE '%scopus%' 
         AND c.doi IS NOT NULL 
         AND c.doi != ''
         AND (c.scopus_citations IS NULL OR c.scopus_citations = 0)`
    );

    let updated = 0;
    for (const row of rows) {
      try {
        const res2 = await fetch(
          `${SCOPUS_BASE}/search/scopus?query=DOI(${row.doi})&field=citedby-count`,
          { headers: { 'X-ELS-APIKey': SCOPUS_API_KEY, 'Accept': 'application/json' } }
        );
        if (!res2.ok) continue;
        const data = await res2.json();
        const entry = data?.['search-results']?.entry?.[0];
        if (!entry) continue;
        const citations = parseInt(entry['citedby-count'] || '0');
        await pool.query(
          `UPDATE conferences SET scopus_citations = $1 WHERE id = $2`,
          [citations, row.id]
        );
        updated++;
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.warn(`[Backfill] Failed for DOI ${row.doi}:`, e.message);
      }
    }

    res.json({ success: true, message: `Backfilled ${updated} conference rows` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};