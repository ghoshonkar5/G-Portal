const { getAuthorPosition } = require('../utils/authorPosition');

const pool = require('../config/database');

const WOS_API_KEY  = process.env.WOS_API_KEY;
const WOS_BASE     = 'https://api.clarivate.com/apis/wos-starter/v1';
const { lookupJournalMetrics } = require('./journalRankingsController');
const { autoCreateIfIncomplete } = require('./potentialFlagController');


console.log('[WoS] API Key loaded:', WOS_API_KEY ? `${WOS_API_KEY.substring(0, 6)}...` : 'NOT FOUND');

// ── Helper: extract ResearcherID from WoS URL ─────────────────────
const extractWosResearcherId = (url) => {
  if (!url) return null;
  const match = url.match(/\/author\/record\/([A-Z0-9\-]+)/i);
  return match ? match[1] : null;
};

// ── Helper: derive academic year ──────────────────────────────────
const toAcademicYear = (year) => {
  const y = parseInt(year);
  if (isNaN(y)) return null;
  return `${y}-${y + 1}`;
};

// ── Helper: derive monthYear string ───────────────────────────────
const toMonthYear = (coverDate) => {
  if (!coverDate) return '';
  const parts = coverDate.split('-');
  if (parts.length < 2) return '';
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const month = months[parseInt(parts[1]) - 1] || 'January';
  return `${month} ${parts[0]}`;
};

// ── Helper: format authors array ──────────────────────────────────
const formatAuthors = (authorsArr) => {
  if (!authorsArr || !Array.isArray(authorsArr)) return [];
  return authorsArr.map(a => a.displayName || a.wosStandard || '').filter(Boolean);
};

// ── Detect authors column type once on startup ────────────────────
let authorsColumnTypes = { publications: true, conferences: true, books_chapters: false };

const detectAuthorsColumnType = async () => {
  for (const table of ['publications', 'conferences', 'books_chapters']) {
    try {
      const result = await pool.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'authors'
      `, [table]);
      if (result.rows.length > 0) {
        authorsColumnTypes[table] = result.rows[0].data_type === 'ARRAY';
        console.log(`[WoS] ${table}.authors → ${result.rows[0].data_type}`);
      }
    } catch (e) {
      console.warn(`[WoS] Could not detect authors type for ${table}`);
    }
  }
};
detectAuthorsColumnType();

// ── Prepare authors value based on column type ────────────────────
const authorsValue = (authorsArr, table = 'publications') => {
  const arr = formatAuthors(authorsArr);
  if (authorsColumnTypes[table]) return arr;
  return arr.join('; ');
};

// ── Map WoS docType → target table ───────────────────────────────
const getTargetTable = (docType) => {
  const dt = (docType || '').toLowerCase();
  if (dt.includes('proceedings') || dt.includes('conference')) return 'conferences';
  if (dt.includes('book') || dt.includes('chapter') || dt.includes('review')) return 'books_chapters';
  return 'publications';
};

// ── Build a pub object from a WoS document entry ─────────────────
const entryToPub = (doc) => {
  const source      = doc.source || {};
  const names       = doc.names  || {};
  const links       = doc.links  || {};
  const citations   = doc.citations || [];

  const year        = source.publishYear ? String(source.publishYear) : '';
  const coverDate   = source.publishMonth
    ? `${year}-${String(source.publishMonth).padStart(2, '0')}-01`
    : '';
  const doi         = (links.identifiers || []).find(i => i.type === 'doi')?.value || '';
  const pageRange   = String(source.pages || '');
  const [startPage, lastPage] = pageRange.includes('-')
    ? pageRange.split('-')
    : [pageRange, ''];

  const timesCited  = (citations.find(c => c.db === 'WOS') || {}).count || 0;

  return {
    title:        doc.title || '',
    journal:      source.sourceTitle || '',
    authors:      names.authors || [],
    citations:    parseInt(timesCited) || 0,
    year,
    monthYear:    toMonthYear(coverDate),
    academicYear: toAcademicYear(year),
    volume:       source.volume || '',
    issue:        source.issue  || '',
    startPage:    (startPage || '').trim(),
    lastPage:     (lastPage  || '').trim(),
    doi,
    link:         doi ? `https://doi.org/${doi}` : (links.record || ''),
    indexing:     'WoS',
    docType:      doc.docType?.join(', ') || '',
    source:       'wos',
    uid:          doc.uid || '',
  };
};

// ── Paginated fetch from WoS Starter API ─────────────────────────
const fetchAllPubs = async (researcherId, maxResults = 500) => {
  const pubs = [];
  let page  = 1;
  const limit = 50;
  let totalResults = Infinity;

  while (pubs.length < totalResults && pubs.length < maxResults) {
    const url = `${WOS_BASE}/documents?q=AI%3D${encodeURIComponent(researcherId)}&db=WOS&limit=${limit}&page=${page}`;

    console.log('[WoS] Requesting URL:', url);

    const res = await fetch(url, {
      headers: {
        'X-ApiKey': WOS_API_KEY,
        'Accept':   'application/json',
      },
    });

    console.log('[WoS] Response status:', res.status);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[WoS] API error response:', res.status, body);
      const err = new Error(`WoS API error: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();

    if (page === 1) {
      totalResults = parseInt(data.metadata?.total || '0');
      console.log(`[WoS] Total results for ${researcherId}: ${totalResults}`);
      if (totalResults === 0) break;
    }

    const hits = data.hits || [];
    if (hits.length === 0) break;

    for (const doc of hits) pubs.push(entryToPub(doc));

    page++;
    if (hits.length < limit) break;
  }

  return { pubs, totalResults };
};

// ── Fetch author-level metrics from WoS ──────────────────────────
const fetchAuthorProfile = async (researcherId) => {
  try {
    const { pubs } = await fetchAllPubs(researcherId, 500);
    if (!pubs || pubs.length === 0) return null;

    const totalCitations  = pubs.reduce((sum, p) => sum + (p.citations || 0), 0);
    const documentCount   = pubs.length;

    const sorted = pubs.map(p => p.citations || 0).sort((a, b) => b - a);
    let hIndex = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] >= i + 1) hIndex = i + 1;
      else break;
    }

    return { hIndex, citationCount: totalCitations, documentCount };
  } catch (err) {
    console.warn('[WoS] fetchAuthorProfile error:', err.message);
    return null;
  }
};

// ── Check duplicate in DB ─────────────────────────────────────────
const checkDuplicate = async (dbFacultyId, pub) => {
  const table = getTargetTable(pub.docType);
  if (pub.doi) {
    const existing = await pool.query(
      `SELECT id, indexing FROM ${table} WHERE faculty_id = $1 AND doi = $2`,
      [dbFacultyId, pub.doi]
    );
    if (existing.rows.length > 0) return existing.rows[0];
  }
  const existingByTitle = await pool.query(
    `SELECT id, indexing FROM ${table} WHERE faculty_id = $1 AND LOWER(title) = LOWER($2)`,
    [dbFacultyId, pub.title]
  );
  return existingByTitle.rows.length > 0 ? existingByTitle.rows[0] : null;
};

// ── Insert one publication into the right table ───────────────────
const insertPublication = async (dbFacultyId, pub, facultyName = '') => {
  const table = getTargetTable(pub.docType);

  if (table === 'conferences') {
    await pool.query(
      `INSERT INTO conferences
        (faculty_id, title, conference_name, date, authors, indexing,
         doi, link, academic_year, type, wos_citations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        dbFacultyId,
        pub.title        || '',
        pub.journal      || '',
        pub.year ? `${pub.year}-01-01` : null,
        authorsValue(pub.authors, 'conferences'),
        'WoS',
        pub.doi          || '',
        pub.link         || '',
        pub.academicYear || '',
        'International',
        pub.citations    || 0,
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
        pub.title        || '',
        authorsValue(pub.authors, 'books_chapters'),
        pub.journal      || '',
        pub.monthYear    || '',
        pub.academicYear || '',
        'Book Chapter',
        pub.link         || '',
      ]
    );
  } else {
    let quartile = '', sjrScore = '', citeScore = '';
    try {
      const metrics = await lookupJournalMetrics(null, pub.journal || null, parseInt(pub.year) || new Date().getFullYear());
      if (metrics) {
        quartile  = metrics.quartile   || '';
        sjrScore  = metrics.sjr_score  ? String(metrics.sjr_score) : '';
        citeScore = metrics.cite_score || '';
      }
    } catch (e) {
      console.warn('[WoS] Quartile lookup failed for', pub.journal, ':', e.message);
    }

    const wosInserted = await pool.query(
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
        pub.title        || '',
        pub.journal      || '',
        quartile,
        '',
        citeScore,
        sjrScore,
        pub.citations || 0,
        0,
        0,
        authorsValue(pub.authors, 'publications'),
        'WoS',
        pub.docType      || '',
        '',
        getAuthorPosition(
          Array.isArray(pub.authors)
            ? pub.authors.map(a => a.displayName || a.wosStandard || a).filter(Boolean)
            : [],
          facultyName
        ) || '',
        pub.volume       || '',
        pub.issue        || '',
        pub.startPage    || '',
        pub.lastPage     || '',
        pub.monthYear    || '',
        pub.academicYear || '',
        '',
        pub.doi          || '',
        pub.link         || '',
        'web_of_science'
      ]
    );
    await autoCreateIfIncomplete(wosInserted.rows[0].id);
  }
};

// ── Preview: fetch WoS publications (no save) ────────────────────
exports.previewWos = async (req, res) => {
  try {
    if (!WOS_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'WoS API key not configured. Please set WOS_API_KEY in your environment variables.',
      });
    }

    const { facultyId } = req.params;

    const facultyResult = await pool.query(
      `SELECT fp.id, fp.wos_url, fp.wos_url_2, fp.wos_url_3, u.name
       FROM faculty_profile fp
       JOIN users u ON fp.user_id = u.id
       WHERE u.faculty_id = $1`,
      [facultyId]
    );
    if (facultyResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    const faculty = facultyResult.rows[0];

    // ── Multi-URL support (mirrors Scopus) ───────────────────────
    const wosUrls = [faculty.wos_url, faculty.wos_url_2, faculty.wos_url_3].filter(Boolean);

    if (wosUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No Web of Science URL saved in your profile. Please update your profile first.',
      });
    }

    const researcherIds = wosUrls.map(extractWosResearcherId).filter(Boolean);
    if (researcherIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract Researcher ID from the WoS URL. It should look like: https://www.webofscience.com/wos/author/record/AAG-6911-2021',
      });
    }

    let allPubs = [];
    let totalResults = 0;

    for (const researcherId of researcherIds) {
      try {
        const result = await fetchAllPubs(researcherId, 200);
        allPubs = allPubs.concat(result.pubs);
        totalResults += result.totalResults;
      } catch (err) {
        if (err.status === 401) {
          return res.status(401).json({
            success: false,
            message: 'WoS API authentication failed. The API key may be invalid.',
          });
        }
        throw err;
      }
    }

    // Deduplicate across accounts: DOI wins, then lowercase title
    const seen = new Set();
    const pubs = allPubs.filter(p => {
      const key = p.doi ? `doi:${p.doi.toLowerCase()}` : `title:${p.title.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const totalCitations = pubs.reduce((s, p) => s + (p.citations || 0), 0);
    const sorted         = pubs.map(p => p.citations || 0).sort((a, b) => b - a);
    let hIndex = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] >= i + 1) hIndex = i + 1;
      else break;
    }

    res.json({
      success: true,
      count: pubs.length,
      totalInWos: totalResults,
      authorProfile: { hIndex, citationCount: totalCitations, documentCount: pubs.length },
      researcherIds,
      data: pubs,
    });

  } catch (error) {
    console.error('WoS preview error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch from WoS', error: error.message });
  }
};

// ── Import selected WoS publications to DB ────────────────────────
exports.importWos = async (req, res) => {
  try {
    const { facultyId }    = req.params;
    const { publications } = req.body;

    if (!publications || !Array.isArray(publications) || publications.length === 0) {
      return res.status(400).json({ success: false, message: 'No publications provided for import' });
    }

    const facultyResult = await pool.query(
      `SELECT fp.id, fp.wos_url, fp.wos_url_2, fp.wos_url_3, u.name
       FROM faculty_profile fp
       JOIN users u ON fp.user_id = u.id
       WHERE u.faculty_id = $1`,
      [facultyId]
    );
    if (facultyResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    const { id: dbFacultyId, name: facultyName, wos_url, wos_url_2, wos_url_3 } = facultyResult.rows[0];

    let imported = 0, skipped = 0;
    const errors = [];

    for (const pub of publications) {
      try {
        const existingRow = await checkDuplicate(dbFacultyId, pub);
        if (existingRow) {
          const currentIndexing = existingRow.indexing || '';
          if (!currentIndexing.includes('WoS')) {
            const newIndexing = currentIndexing ? `${currentIndexing}, WoS` : 'WoS';
            await pool.query(
              `UPDATE ${getTargetTable(pub.docType)} SET indexing = $1 WHERE id = $2`,
              [newIndexing, existingRow.id]
            );
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

    // Save metrics using primary (first valid) researcher ID
    const researcherId = extractWosResearcherId(wos_url)
      || extractWosResearcherId(wos_url_2)
      || extractWosResearcherId(wos_url_3);

    if (researcherId) {
      try {
        const profile = await fetchAuthorProfile(researcherId);
        if (profile) {
          await pool.query(
            `UPDATE faculty_profile SET
               wos_citation_count = $1,
               wos_h_index        = $2,
               wos_doc_count      = $3,
               wos_last_synced    = NOW()
             WHERE user_id = (SELECT id FROM users WHERE faculty_id = $4)`,
            [profile.citationCount, profile.hIndex, profile.documentCount, facultyId]
          );
          console.log(`[WoS Import] Metrics saved for ${facultyId}: h-index=${profile.hIndex}, citations=${profile.citationCount}`);
        }
      } catch (profileErr) {
        console.warn('[WoS Import] Could not save author metrics:', profileErr.message);
      }
    }

    res.json({
      success: true,
      message: `WoS import complete: ${imported} imported, ${skipped} skipped (duplicates)${errors.length ? `, ${errors.length} failed` : ''}`,
      imported, skipped, errors,
    });

  } catch (error) {
    console.error('WoS import error:', error);
    res.status(500).json({ success: false, message: 'Import failed', error: error.message });
  }
};

// ── Sync: auto-sync all WoS publications for one faculty ──────────
exports.syncWos = async (req, res) => {
  try {
    if (!WOS_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'WoS API key not configured. Please set WOS_API_KEY in environment variables.',
      });
    }

    const { facultyId } = req.params;

    const facultyResult = await pool.query(
      `SELECT fp.id, fp.wos_url, fp.wos_url_2, fp.wos_url_3, u.name
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

    // ── Multi-URL support ─────────────────────────────────────────
    const wosUrls = [row.wos_url, row.wos_url_2, row.wos_url_3].filter(Boolean);
    const researcherIds = wosUrls.map(extractWosResearcherId).filter(Boolean);

    if (researcherIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid WoS URL in profile. Please save your Web of Science profile URL in profile settings.',
      });
    }

    let allPubs = [];
    for (const researcherId of researcherIds) {
      try {
        const result = await fetchAllPubs(researcherId, 500);
        allPubs = allPubs.concat(result.pubs);
      } catch (err) {
        return res.status(err.status === 401 ? 401 : 502).json({
          success: false,
          message: err.status === 401
            ? 'WoS API authentication failed. The API key may be invalid.'
            : `WoS API error: ${err.status ?? err.message ?? 'unknown'}`,
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

    console.log('[WoS Sync] Pubs fetched:', pubs.length);
    if (pubs.length > 0) console.log('[WoS Sync] Sample pub:', JSON.stringify(pubs[0], null, 2));

    let imported = 0, skipped = 0;
    const insertErrors = [];

    for (const pub of pubs) {
      try {
        const existingRow = await checkDuplicate(dbFacultyId, pub);
        console.log('[WoS Sync] Processing:', pub.title, '| table:', getTargetTable(pub.docType), '| duplicate:', !!existingRow);

        if (existingRow) {
          const currentIndexing = existingRow.indexing || '';
          if (!currentIndexing.includes('WoS')) {
            const newIndexing = currentIndexing ? `${currentIndexing}, WoS` : 'WoS';
            await pool.query(
              `UPDATE ${getTargetTable(pub.docType)} SET indexing = $1 WHERE id = $2`,
              [newIndexing, existingRow.id]
            );
          }
          skipped++;
          continue;
        }
        await insertPublication(dbFacultyId, pub, facultyName);
        imported++;
        console.log('[WoS Sync] ✅ Inserted:', pub.title);
      } catch (err) {
        console.error(`Sync insert error for "${pub.title}":`, err.message);
        insertErrors.push({ title: pub.title, error: err.message });
      }
    }

    try {
      const citationsList = pubs.map(p => p.citations || 0).sort((a, b) => b - a);
      let hIndex = 0;
      for (let i = 0; i < citationsList.length; i++) {
        if (citationsList[i] >= i + 1) hIndex = i + 1;
        else break;
      }
      const totalCitations = citationsList.reduce((s, c) => s + c, 0);

      await pool.query(
        `UPDATE faculty_profile SET
           wos_citation_count = $1,
           wos_h_index        = $2,
           wos_doc_count      = $3,
           wos_last_synced    = NOW()
         WHERE user_id = (SELECT id FROM users WHERE faculty_id = $4)`,
        [totalCitations, hIndex, pubs.length, facultyId]
      );
    } catch (profileErr) {
      console.warn('[WoS] Could not save author metrics:', profileErr.message);
      await pool.query(
        `UPDATE faculty_profile SET wos_last_synced = NOW() WHERE user_id = (SELECT id FROM users WHERE faculty_id = $1)`,
        [facultyId]
      ).catch(() => {});
    }

    console.log(`[WoS Sync] facultyId=${facultyId}: ${imported} imported, ${skipped} skipped, ${insertErrors.length} errors`);

    res.json({
      success: true,
      message: `WoS sync complete: ${imported} new publications imported, ${skipped} already existed${insertErrors.length ? `, ${insertErrors.length} failed` : ''}`,
      imported,
      skipped,
      total: pubs.length,
      errors: insertErrors.length,
    });

  } catch (error) {
    console.error('WoS sync error:', error);
    res.status(500).json({ success: false, message: 'Sync failed', error: error.message });
  }
};

// ── Nightly sync: runs for ALL faculty ───────────────────────────
const runNightlyWosSync = async () => {
  if (!WOS_API_KEY) {
    console.error('[WoS NightlySync] WOS_API_KEY not set, skipping.');
    return;
  }

  try {
    const { rows: facultyList } = await pool.query(
      `SELECT u.faculty_id, fp.id, fp.wos_url, fp.wos_url_2, fp.wos_url_3, u.name
       FROM faculty_profile fp
       JOIN users u ON fp.user_id = u.id
       WHERE fp.wos_url IS NOT NULL AND fp.wos_url != ''`
    );

    console.log(`[WoS NightlySync] Found ${facultyList.length} faculty with WoS URLs`);

    let totalImported = 0, totalSkipped = 0, totalFailed = 0;

    for (const faculty of facultyList) {
      try {
        const wosUrls = [faculty.wos_url, faculty.wos_url_2, faculty.wos_url_3].filter(Boolean);
        const researcherIds = wosUrls.map(extractWosResearcherId).filter(Boolean);

        if (researcherIds.length === 0) {
          console.warn(`[WoS NightlySync] Could not extract ResearcherID for ${faculty.name}, skipping`);
          continue;
        }

        let allPubs = [];
        try {
          for (const researcherId of researcherIds) {
            const result = await fetchAllPubs(researcherId, 500);
            allPubs = allPubs.concat(result.pubs);
          }
        } catch (err) {
          console.error(`[WoS NightlySync] API error for ${faculty.name}:`, err.message);
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
              if (pub.doi) {
                await pool.query(
                  `UPDATE ${table} SET wos_citations=$1 WHERE faculty_id=$2 AND doi=$3`,
                  [pub.citations, faculty.id, pub.doi]
                ).catch(() => {});
              }
              const currentIndexing = existingRow.indexing || '';
              if (!currentIndexing.includes('WoS')) {
                const newIndexing = currentIndexing ? `${currentIndexing}, WoS` : 'WoS';
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
            console.error(`[WoS NightlySync] Insert error for "${pub.title}":`, err.message);
          }
        }

        try {
          const sorted = pubs.map(p => p.citations || 0).sort((a, b) => b - a);
          let hIndex = 0;
          for (let i = 0; i < sorted.length; i++) {
            if (sorted[i] >= i + 1) hIndex = i + 1;
            else break;
          }
          const totalCitations = sorted.reduce((s, c) => s + c, 0);
          await pool.query(
            `UPDATE faculty_profile SET
               wos_citation_count = $1,
               wos_h_index        = $2,
               wos_doc_count      = $3,
               wos_last_synced    = NOW()
             WHERE id = $4`,
            [totalCitations, hIndex, pubs.length, faculty.id]
          );
        } catch { /* non-fatal */ }

        console.log(`[WoS NightlySync] ${faculty.name}: ${imported} new, ${skipped} updated/skipped`);
        totalImported += imported;
        totalSkipped  += skipped;

        await new Promise(r => setTimeout(r, 1000));

      } catch (err) {
        console.error(`[WoS NightlySync] Failed for ${faculty.name}:`, err.message);
        totalFailed++;
      }
    }

    console.log(`[WoS NightlySync] ✅ Done — ${totalImported} imported, ${totalSkipped} updated/skipped, ${totalFailed} faculty failed`);

  } catch (err) {
    console.error('[WoS NightlySync] Fatal error:', err.message);
  }
};

exports.runNightlyWosSync = runNightlyWosSync;

// ── Admin: manually trigger sync for all faculty ──────────────────
exports.syncAll = async (req, res) => {
  res.json({ success: true, message: 'WoS nightly sync triggered manually, running in background...' });
  runNightlyWosSync();
};

// ── GET /api/wos/metrics/:facultyId ──────────────────────────────
exports.getMetrics = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const facResult = await pool.query(
      `SELECT fp.id, fp.wos_citation_count, fp.wos_h_index, fp.wos_doc_count, fp.wos_last_synced, fp.wos_url, fp.wos_url_2, fp.wos_url_3
       FROM faculty_profile fp
       JOIN users u ON fp.user_id = u.id
       WHERE u.faculty_id = $1`,
      [facultyId]
    );
    if (facResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    const row         = facResult.rows[0];
    const dbFacultyId = row.id;

     let hIndex = row.wos_h_index !== null ? parseInt(row.wos_h_index) : null;
    if (hIndex === null || hIndex === 0) {
      const researcherIds = [row.wos_url, row.wos_url_2, row.wos_url_3]
        .map(extractWosResearcherId).filter(Boolean);
      if (researcherIds.length > 0) {
        try {
          const profile = await fetchAuthorProfile(researcherIds[0]);
          if (profile) {
            hIndex = profile.hIndex;
            await pool.query(
              `UPDATE faculty_profile SET
                 wos_h_index        = $1,
                 wos_citation_count = $2,
                 wos_doc_count      = $3
               WHERE user_id = (SELECT id FROM users WHERE faculty_id = $4)`,
              [profile.hIndex, profile.citationCount, profile.documentCount, facultyId]
            );
          }
        } catch (e) {
          console.warn('[WoS getMetrics] Could not fetch h-index from API:', e.message);
        }
      }
      hIndex = hIndex ?? 0;
    }

    const sinceYear = new Date().getFullYear() - 4;

    const recentCiteResult = await pool.query(
      `SELECT COALESCE(SUM(wos_citations), 0)::int AS recent_citations
       FROM publications
       WHERE faculty_id = $1
         AND indexing ILIKE '%wos%'
         AND (
           NULLIF(SPLIT_PART(academic_year, '-', 1), '')::int >= $2
           OR
           NULLIF(SPLIT_PART(month_year, ' ', 2), '')::int >= $2
         )`,
      [dbFacultyId, sinceYear]
    );

    const recentCiteConf = await pool.query(
      `SELECT COALESCE(SUM(wos_citations), 0)::int AS recent_citations
       FROM conferences
       WHERE faculty_id = $1
         AND indexing ILIKE '%wos%'
         AND NULLIF(SPLIT_PART(academic_year, '-', 1), '')::int >= $2`,
      [dbFacultyId, sinceYear]
    );

    const recentDocPub = await pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM publications
       WHERE faculty_id = $1
         AND indexing ILIKE '%wos%'
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
         AND indexing ILIKE '%wos%'
         AND NULLIF(SPLIT_PART(academic_year, '-', 1), '')::int >= $2`,
      [dbFacultyId, sinceYear]
    );

    const recentCitations = (recentCiteResult.rows[0]?.recent_citations ?? 0)
                          + (recentCiteConf.rows[0]?.recent_citations   ?? 0);
    const recentDocCount  = (recentDocPub.rows[0]?.cnt  ?? 0)
                          + (recentDocConf.rows[0]?.cnt  ?? 0);

    const recentPapersResult = await pool.query(
      `SELECT wos_citations FROM publications
       WHERE faculty_id = $1
         AND indexing ILIKE '%wos%'
         AND (
           NULLIF(SPLIT_PART(academic_year, '-', 1), '')::int >= $2
           OR
           NULLIF(SPLIT_PART(month_year, ' ', 2), '')::int >= $2
         )
       UNION ALL
       SELECT wos_citations FROM conferences
       WHERE faculty_id = $1
         AND indexing ILIKE '%wos%'
         AND NULLIF(SPLIT_PART(academic_year, '-', 1), '')::int >= $2`,
      [dbFacultyId, sinceYear]
    );

    const citationsList = recentPapersResult.rows
      .map(r => parseInt(r.wos_citations || '0'))
      .sort((a, b) => b - a);

    let recentHIndex = 0;
    for (let i = 0; i < citationsList.length; i++) {
      if (citationsList[i] >= i + 1) recentHIndex = i + 1;
      else break;
    }

    res.json({
      success:        true,
      citationCount:  row.wos_citation_count || 0,
      hIndex,
      docCount:       row.wos_doc_count      || 0,
      lastSynced:     row.wos_last_synced    || null,
      recentCitations,
      recentHIndex,
      recentDocCount,
      sinceYear,
    });

  } catch (error) {
    console.error('WoS getMetrics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/wos/last-synced/:facultyId ──────────────────────────
exports.getLastSynced = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const result = await pool.query(
      `SELECT fp.wos_last_synced
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
      lastSynced: result.rows[0].wos_last_synced || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/wos/yearly-stats/:facultyId ─────────────────────────
exports.getYearlyStats = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const facResult = await pool.query(
      `SELECT fp.id, fp.wos_citation_count
       FROM faculty_profile fp
       JOIN users u ON fp.user_id = u.id
       WHERE u.faculty_id = $1`,
      [facultyId]
    );
    if (facResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    const { id: dbFacultyId, wos_citation_count } = facResult.rows[0];
    const totalCitationCount = parseInt(wos_citation_count || '0');

    const pubResult = await pool.query(
      `SELECT
         COALESCE(
           NULLIF(SPLIT_PART(academic_year, '-', 1), ''),
           NULLIF(SPLIT_PART(month_year, ' ', 2), '')
         ) AS year,
         COUNT(*)::int                          AS docs,
         COALESCE(SUM(wos_citations), 0)::int   AS citations
       FROM publications
       WHERE faculty_id = $1
         AND indexing ILIKE '%wos%'
       GROUP BY year
       ORDER BY year ASC`,
      [dbFacultyId]
    );

    const confResult = await pool.query(
      `SELECT
         NULLIF(SPLIT_PART(academic_year, '-', 1), '') AS year,
         COUNT(*)::int                           AS docs,
         COALESCE(SUM(wos_citations), 0)::int    AS citations
       FROM conferences
       WHERE faculty_id = $1
         AND indexing ILIKE '%wos%'
       GROUP BY year
       ORDER BY year ASC`,
      [dbFacultyId]
    );

    const docsByYear    = {};
    const dbCitesByYear = {};

    for (const row of [...pubResult.rows, ...confResult.rows]) {
      const yr = String(row.year || '').slice(0, 4);
      if (!yr || isNaN(Number(yr))) continue;
      docsByYear[yr]    = (docsByYear[yr]    || 0) + Number(row.docs);
      dbCitesByYear[yr] = (dbCitesByYear[yr] || 0) + Number(row.citations);
    }

    let citByYear = { ...dbCitesByYear };

    const summedCitations = Object.values(citByYear).reduce((s, v) => s + v, 0);
    if (summedCitations === 0 && totalCitationCount > 0 && Object.keys(docsByYear).length > 0) {
      const totalDocs = Object.values(docsByYear).reduce((s, v) => s + v, 0);
      for (const yr of Object.keys(docsByYear)) {
        citByYear[yr] = Math.round((docsByYear[yr] / totalDocs) * totalCitationCount);
      }
    }

    const allYears = new Set([...Object.keys(docsByYear), ...Object.keys(citByYear)]);

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
    console.error('WoS getYearlyStats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};