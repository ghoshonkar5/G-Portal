const { getAuthorPosition } = require('../utils/authorPosition');

const pool = require('../config/database');
const { lookupJournalMetrics } = require('./journalRankingsController');
const { autoCreateIfIncomplete } = require('./potentialFlagController');

// ── Helper: extract Scholar author ID from URL ───────────────────
const extractScholarUserId = (url) => {
  if (!url) return null;
  const match = url.match(/[?&]user=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

// ── Helper: derive academic year from a date string ──────────────
const toAcademicYear = (dateStr) => {
  if (!dateStr) return null;
  const year = parseInt(String(dateStr).slice(0, 4));
  if (isNaN(year)) return null;
  return `${year}-${year + 1}`;
};

// ── Helper: title similarity score (word overlap) ────────────────
const titleSimilarity = (a, b) => {
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
};

// ── Helper: detect similar publications within a list ────────────
// Returns array of { imported: pub, skipped: pub, reason: string }
const detectSimilarities = (publications) => {
  const similarityFlags = [];
  const skippedIndices = new Set();

  for (let i = 0; i < publications.length; i++) {
    if (skippedIndices.has(i)) continue;
    for (let j = i + 1; j < publications.length; j++) {
      if (skippedIndices.has(j)) continue;
      const pubA = publications[i];
      const pubB = publications[j];

      const sim = titleSimilarity(pubA.title, pubB.title);
      const sameYear = pubA.year && pubB.year && pubA.year === pubB.year;

      const reasons = [];
      if (sim >= 0.7) reasons.push(`titles are ${Math.round(sim * 100)}% similar`);
      if (sameYear) reasons.push(`both published in ${pubA.year}`);

      // Flag if title similarity >= 0.7 AND same year
      // OR if title similarity is very high (>= 0.85) regardless of year
      if ((sim >= 0.7 && sameYear) || sim >= 0.85) {
        similarityFlags.push({
          imported: pubA,
          skipped: pubB,
          reason: `These publications have ${reasons.join(' and ')}. We imported "${pubA.title}" and skipped "${pubB.title}". Please review if they are different papers.`,
          similarity: Math.round(sim * 100),
        });
        skippedIndices.add(j);
      }
    }
  }

  return { similarityFlags, skippedIndices };
};

// ── Fetch Google Scholar profile page via backend (avoids CORS) ──
// @route  GET /api/scholar/preview/:facultyId
// @access Private
exports.previewScholar = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const facultyResult = await pool.query(
    `SELECT fp.id, u.name, fp.google_scholar_url
     FROM faculty_profile fp
     JOIN users u ON fp.user_id = u.id
     WHERE u.faculty_id = $1`,
    [facultyId]
);
if (facultyResult.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Faculty not found' });
}
const dbFacultyId = facultyResult.rows[0].id;
const facultyName = facultyResult.rows[0].name;
const scholarUrl = facultyResult.rows[0].google_scholar_url;

    if (!scholarUrl) {
      return res.status(400).json({
        success: false,
        message: 'No Google Scholar URL saved in your profile. Please update your profile first.'
      });
    }

    const userId = extractScholarUserId(scholarUrl);
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract Scholar user ID from the saved URL. Please check the URL in your profile.'
      });
    }

    const fetchUrl = `https://scholar.google.com/citations?user=${userId}&hl=en&sortby=pubdate&pagesize=100`;

    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      }
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: `Google Scholar returned status ${response.status}. This may be a temporary block — please try again in a few minutes.`
      });
    }

    const html = await response.text();
    console.log('[Scholar] HTML length:', html.length, '| Has gsc_a_tr:', html.includes('gsc_a_tr'));

    const publications = parseScholarHtml(html, facultyName);


    if (publications.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: 'No publications found on this Google Scholar profile, or the page format has changed.'
      });
    }

    res.json({
  success: true,
  count: publications.length,
  data: publications,
  scholarUserId: userId,
  facultyName: facultyName
});

  } catch (error) {
    console.error('Scholar preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch from Google Scholar',
      error: error.message
    });
  }
};

// ── Import selected publications from Scholar preview ────────────
// @route  POST /api/scholar/import/:facultyId
// @access Private
exports.importScholar = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { publications } = req.body;

    if (!publications || !Array.isArray(publications) || publications.length === 0) {
      return res.status(400).json({ success: false, message: 'No publications provided for import' });
    }

    const facultyResult = await pool.query(
    `SELECT fp.id, u.name
     FROM faculty_profile fp
     JOIN users u ON fp.user_id = u.id
     WHERE u.faculty_id = $1`,
    [facultyId]
);
if (facultyResult.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Faculty not found' });
}
const dbFacultyId = facultyResult.rows[0].id;
const facultyName = facultyResult.rows[0].name;

    // ── Step 1: detect similarities within the incoming list ─────
    const { similarityFlags, skippedIndices } = detectSimilarities(publications);
    const filteredPublications = publications.filter((_, i) => !skippedIndices.has(i));

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const pub of filteredPublications) {
      try {
        // Skip duplicate by DOI if present
        if (pub.doi) {
          const existing = await pool.query(
            'SELECT id FROM publications WHERE faculty_id = $1 AND doi = $2',
            [dbFacultyId, pub.doi]
          );
          if (existing.rows.length > 0) {
            skipped++;
            continue;
          }
        }

        // Skip/update duplicate by title
        const existingByTitle = await pool.query(
          'SELECT id, indexing FROM publications WHERE faculty_id = $1 AND LOWER(title) = LOWER($2)',
          [dbFacultyId, pub.title]
        );
        if (existingByTitle.rows.length > 0) {
          const existing = existingByTitle.rows[0];
          const currentIndexing = existing.indexing || '';
          if (!currentIndexing.includes('Google Scholar')) {
            const newIndexing = currentIndexing ? `${currentIndexing}, Google Scholar` : 'Google Scholar';
            await pool.query(
              'UPDATE publications SET indexing = $1 WHERE id = $2',
              [newIndexing, existing.id]
            );
          }
          skipped++;
          continue;
        }

         let quartile = pub.quartile || '';
        let sjrScore = pub.impactFactor || '';
        let citeScore = pub.citeScore || '';
        if (!quartile && pub.journal) {
          try {
            const metrics = await lookupJournalMetrics(null, pub.journal, parseInt(pub.year) || new Date().getFullYear());
            if (metrics) {
              quartile  = metrics.quartile   || '';
              sjrScore  = metrics.sjr_score  ? String(metrics.sjr_score) : '';
              citeScore = metrics.cite_score || '';
            }
          } catch (e) {
            console.warn('[Scholar] Quartile lookup failed for', pub.journal, ':', e.message);
          }
        }

          const scholarInserted = await pool.query(
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
            '',         // impact_factor — user fills manually
            citeScore,
            sjrScore,   // sjr_score
            0,
            0,
            pub.citations || 0,
            pub.authors ? pub.authors.split(',').map(a => a.trim()).filter(Boolean) : [],
pub.indexing || 'Google Scholar',
pub.areaOfPaper || '',
pub.apaFormat || '',
getAuthorPosition(
  pub.authors ? pub.authors.split(',').map(a => a.trim()).filter(Boolean) : [],
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
            'google_scholar'
          ]
        );
        await autoCreateIfIncomplete(scholarInserted.rows[0].id);
        imported++;
      } catch (err) {
        console.error(`Failed to import publication "${pub.title}":`, err.message, err.detail || '');
        errors.push({ title: pub.title, reason: err.message });
      }
    }

    res.json({
      success: true,
      message: `Import complete: ${imported} imported, ${skipped} skipped (duplicates)${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      imported,
      skipped,
      errors,
      // ── NEW: send similarity report back to frontend ──
      similarityReport: similarityFlags,
    });

  } catch (error) {
    console.error('Scholar import error:', error);
    res.status(500).json({ success: false, message: 'Import failed', error: error.message });
  }
};

// ── CSV Import ───────────────────────────────────────────────────
// @route  POST /api/scholar/import-csv/:facultyId
// @access Private
exports.importCSV = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { rows } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No CSV rows provided' });
    }

    const facultyResult = await pool.query(
  'SELECT id, name FROM faculty WHERE faculty_id = $1',
  [facultyId]
);
if (facultyResult.rows.length === 0) {
  return res.status(404).json({ success: false, message: 'Faculty not found' });
}
const dbFacultyId = facultyResult.rows[0].id;
const facultyName = facultyResult.rows[0].name;

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const row of rows) {
  try {
    const title = row.Title || row.title || '';
    if (!title.trim()) continue;

    const authors = row.Authors || row.authors || '';
    const journal = row['Source title'] || row['source title'] || row.Journal || row.journal || '';
    const year = row.Year || row.year || '';
    const volume = row.Volume || row.volume || '';
    const issue = row.Issue || row.issue || '';
    const startPage = row['Page start'] || row['page start'] || row['Start Page'] || '';
    const lastPage = row['Page end'] || row['page end'] || row['End Page'] || '';
    const doi = row.DOI || row.doi || '';
    const link = row.Link || row.link || row.URL || row.url || (doi ? `https://doi.org/${doi}` : '');
    const citations = parseInt(row['Cited by'] || row['cited by'] || row.Citations || row.citations || '0') || 0;
    const docType = (row['Document Type'] || row['document type'] || row.Type || '').toLowerCase();
    const monthYear = year ? `January ${year}` : '';
    const academicYear = year ? `${year}-${parseInt(year) + 1}` : '';

    // ── Route by document type ──────────────────────────────
    const isConference = docType.includes('conference');
    const isBook = docType.includes('book');

    if (isConference) {
      // Check duplicate in conferences
      const existing = await pool.query(
        'SELECT id FROM conferences WHERE faculty_id = $1 AND LOWER(title) = LOWER($2)',
        [dbFacultyId, title]
      );
      if (existing.rows.length > 0) { skipped++; continue; }

      await pool.query(
        `INSERT INTO conferences (faculty_id, title, conference_name, date, authors, type, doi, indexing, link, academic_year, host)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          dbFacultyId, title,
          journal,
          year ? `${year}-01-01` : null,
          authors ? authors.split(',').map(a => a.trim()).filter(Boolean) : [],
          'International',
          doi, 'Scopus CSV', link, academicYear, ''
        ]
      );

    } else if (isBook) {
      // Check duplicate in books_chapters
      const existing = await pool.query(
        'SELECT id FROM books_chapters WHERE faculty_id = $1 AND LOWER(title) = LOWER($2)',
        [dbFacultyId, title]
      );
      if (existing.rows.length > 0) { skipped++; continue; }

      await pool.query(
        `INSERT INTO books_chapters (faculty_id, title, author_name, department_affiliation, isbn_issn, publisher, month_year, academic_year, type, link)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          dbFacultyId, title,
          authors, '', doi,
          journal, monthYear, academicYear,
          docType.includes('chapter') ? 'Book Chapter' : 'Book',
          link
        ]
      );

    } else {
      // Default → publications (Articles, Reviews, etc.)
      const existing = await pool.query(
        'SELECT id, indexing FROM publications WHERE faculty_id = $1 AND LOWER(title) = LOWER($2)',
        [dbFacultyId, title]
      );
      if (existing.rows.length > 0) {
        const currentIndexing = existing.rows[0].indexing || '';
        if (!currentIndexing.includes('Scopus')) {
          await pool.query(
            'UPDATE publications SET indexing = $1 WHERE id = $2',
            [currentIndexing ? `${currentIndexing}, Scopus` : 'Scopus', existing.rows[0].id]
          );
        }
        skipped++; continue;
      }

       let csvQuartile = '', csvSjr = '', csvCiteScore = '';
      if (journal) {
        try {
          const metrics = await lookupJournalMetrics(null, journal, parseInt(year) || new Date().getFullYear());
          if (metrics) {
            csvQuartile  = metrics.quartile   || '';
            csvSjr       = metrics.sjr_score  ? String(metrics.sjr_score) : '';
            csvCiteScore = metrics.cite_score || '';
          }
        } catch (e) {
          console.warn('[CSV] Quartile lookup failed for', journal, ':', e.message);
        }
      }

      const csvInserted = await pool.query(
        `INSERT INTO publications
          (faculty_id, title, journal, quartile, impact_factor, cite_score, sjr_score,
           wos_citations, scopus_citations, google_citations,
           authors, indexing, area_of_paper, apa_format, position_of_author,
           volume, issue, start_page, last_page, month_year, academic_year,
           list_of_paper_from_journal, doi, link, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
         RETURNING id`,
        [
          dbFacultyId, title, journal, csvQuartile, '', csvCiteScore, csvSjr,
          0, citations, 0,
          authors ? authors.split(',').map(a => a.trim()).filter(Boolean) : [],
          'Scopus CSV', docType, '',
getAuthorPosition(
  authors ? authors.split(',').map(a => a.trim()).filter(Boolean) : [],
  facultyName
) || '',
          volume, issue, startPage, lastPage,
          monthYear, academicYear,
          '', doi, link, 'scopus'
        ]
      );
      await autoCreateIfIncomplete(csvInserted.rows[0].id);
    }

    imported++;
  } catch (err) {
    console.error('CSV row import error:', err.message);
    errors.push(row.Title || 'Unknown');
  }
}

    res.json({
      success: true,
      message: `CSV import complete: ${imported} imported, ${skipped} skipped (duplicates)${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      imported,
      skipped,
      errors
    });

  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ success: false, message: 'CSV import failed', error: error.message });
  }
};

// ── HTML Parser: extract publications from Scholar profile page ──
function parseScholarHtml(html, facultyName) {
  const publications = [];

const rowRegex = /<tr class="gsc_a_tr[^"]*">([\s\S]*?)<\/tr>/g;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];

    // Title
    const titleMatch = row.match(/class="gsc_a_at"[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) continue;
    let title = decodeHtmlEntities(titleMatch[1].trim());
    if (!title) continue;

    // Article link
const linkMatch = row.match(/(?:data-href|href)="(\/citations\?[^"]*view_citation[^"]*)"/);
    const link = linkMatch
      ? `https://scholar.google.com${linkMatch[1].replace(/&amp;/g, '&')}`
      : '';

    // Authors + journal
    const grayMatches = [...row.matchAll(/class="gs_gray"[^>]*>([\s\S]*?)<\/div>/g)];
    const authorsRaw = grayMatches[0] ? stripHtml(grayMatches[0][1]) : '';
    const venueRaw = grayMatches[1] ? stripHtml(grayMatches[1][1]) : '';

    // ── Malformed title recovery ─────────────────────────────────
    // Scholar sometimes shows a corrupt entry where the title field
    // contains a citation artifact (e.g. `Aditya,"`) and the real
    // title is embedded in the venue line.
    // Detection: title is very short OR ends with ," or is non-alphabetic
    const isMalformedTitle = (
      title.length < 10 ||
      title.endsWith(',"') ||
      title.endsWith(',"') ||
      !/[a-zA-Z]{3,}/.test(title)
    );

    if (isMalformedTitle && venueRaw) {
      // Try to extract real title from venue line
      // Venue line format: "Real Title," Journal Name ...
      // OR: Real Title," IEEE Conference ...
      const recoveredMatch = venueRaw.match(/^"?(.+?)(?:,"|,?\s+(?:IEEE|ACM|Springer|Elsevier|Journal|International|Proceedings))/i);
      if (recoveredMatch && recoveredMatch[1].length > 10) {
        title = recoveredMatch[1].trim();
      } else {
        // Can't recover — skip this entry
        console.log(`[Scholar] Skipping malformed entry with unrecoverable title: "${title}"`);
        continue;
      }
    }

    // Citations count
    const citMatch = row.match(/class="gsc_a_ac[^"]*"[^>]*>(\d+)<\/a>/);
    const citations = citMatch ? parseInt(citMatch[1]) : 0;

    // Year
    const yearMatch = row.match(/class="gsc_a_h[^"]*"[^>]*>(\d{4})<\/span>/);
    const year = yearMatch ? yearMatch[1] : '';

    let volume = '';
    let startPage = '';
    let lastPage = '';

    const volMatch = venueRaw.match(/,\s*(?:vol\.?|volume)\s*(\S+)/i);
    if (volMatch) { volume = volMatch[1].replace(/,/g, ''); }

    const ppMatch = venueRaw.match(/,\s*pp\.?\s*([\d]+)[-–]([\d]+)/i);
    if (ppMatch) { startPage = ppMatch[1]; lastPage = ppMatch[2]; }

    const journalClean = venueRaw.split(',')[0].trim();

    const monthYear = year ? `January ${year}` : '';
    const academicYear = year ? toAcademicYear(year) : '';

    const authorsClean = authorsRaw || (facultyName || '');
    const apa = `${authorsClean} (${year || 'n.d.'}). ${title}. ${journalClean}${volume ? `, ${volume}` : ''}${startPage ? `, ${startPage}-${lastPage}` : ''}.`;

    publications.push({
      title,
      journal: journalClean,
      authors: authorsClean,
      citations,
      year,
      monthYear,
      academicYear,
      volume,
      issue: '',
      startPage,
      lastPage,
      doi: '',
      link,
      apaFormat: apa,
      indexing: 'Google Scholar',
      quartile: '',
      impactFactor: '',
      citeScore: '',
      areaOfPaper: '',
      positionOfAuthor: '',
      source: 'google_scholar',
    });
  }

  return publications;
}

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/,&quot;/g, '')
    .replace(/&quot;,/g, '');
}