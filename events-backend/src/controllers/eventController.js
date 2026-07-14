const pool = require('../config/database');
const ExcelJS = require('exceljs');
const csv = require('fast-csv');
const fs = require('fs');
const path = require('path');

const VALID_EVENT_TYPES = ['Conference', 'Workshop', 'Seminar', 'FDP', 'Webinar', 'Guest Lecture', 'Training', 'Hackathon', 'Other'];
const VALID_ROLES = ['Attendee', 'Speaker', 'Organizer', 'Resource Person', 'Chair', 'Panelist', 'Mentor', 'Judge'];
const VALID_LEVELS = ['International', 'National', 'State', 'Local', 'Institutional'];
const VALID_MODES = ['Online', 'Offline', 'Hybrid'];

const validateEventFields = (data) => {
  const errors = {};
  if (!data.event_title) errors.event_title = 'Event title is required';
  if (!data.event_type) errors.event_type = 'Event type is required';
  else if (!VALID_EVENT_TYPES.includes(data.event_type)) errors.event_type = 'Invalid event type';
  if (!data.role_at_event) errors.role_at_event = 'Role is required';
  else if (!VALID_ROLES.includes(data.role_at_event)) errors.role_at_event = 'Invalid role';
  if (!data.level) errors.level = 'Level is required';
  else if (!VALID_LEVELS.includes(data.level)) errors.level = 'Invalid level';
  if (!data.organizer) errors.organizer = 'Organizer is required';
  if (!data.mode) errors.mode = 'Mode is required';
  else if (!VALID_MODES.includes(data.mode)) errors.mode = 'Invalid mode';
  if (!data.start_date) errors.start_date = 'Start date is required';
  if (!data.end_date) errors.end_date = 'End date is required';
  if (data.start_date && data.end_date && new Date(data.end_date) < new Date(data.start_date)) {
    errors.end_date = 'End date must be on or after start date';
  }
  return errors;
};

const computeDocsStatus = (certUrls, photoUrls) => {
  const hasCert  = certUrls.length > 0;
  const hasPhoto = photoUrls.length > 0;
  if (hasCert && hasPhoto)   return 'complete';
  if (hasCert && !hasPhoto)  return 'pending_photo';
  if (!hasCert && hasPhoto)  return 'pending_cert';
  return 'pending_both';
};

// GET /api/events/mine
const getMine = async (req, res) => {
  const { search, status, event_type } = req.query;

  try {
    // CHANGED: req.user.id -> req.user.facultyProfileId (×4 below)
    const deleted = await pool.query(
      `DELETE FROM events
       WHERE faculty_id = $1
         AND docs_status != 'complete'
         AND document_deadline IS NOT NULL
         AND document_deadline < NOW()
       RETURNING id, event_title`,
      [req.user.facultyProfileId]
    );
    const deletedDrafts = await pool.query(
      `DELETE FROM events
       WHERE faculty_id = $1
         AND status = 'draft'
         AND created_at < NOW() - INTERVAL '7 days'
       RETURNING id, event_title`,
      [req.user.facultyProfileId]
    );
    const auto_deleted = [...deleted.rows, ...deletedDrafts.rows];

    let query = 'SELECT * FROM events WHERE faculty_id = $1';
    const params = [req.user.facultyProfileId];
    let idx = 2;

    if (search)     { query += ` AND event_title ILIKE $${idx++}`;  params.push(`%${search}%`); }
    if (status)     { query += ` AND status = $${idx++}`;           params.push(status); }
    if (event_type) { query += ` AND event_type = $${idx++}`;       params.push(event_type); }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ events: result.rows, auto_deleted });

  } catch (err) {
    console.error('getMine error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/events
const createEvent = async (req, res) => {
  const { status = 'draft', ...data } = req.body;

  const certificateUrls = req.files?.certificates?.map(f => `/uploads/${f.filename}`) || [];
  const photoUrls       = req.files?.photos?.map(f => `/uploads/${f.filename}`) || [];

  if (status === 'submitted') {
    const errors = validateEventFields(data);
    if (Object.keys(errors).length > 0) return res.status(400).json({ errors });
  }

  const docsStatus = status === 'submitted'
    ? computeDocsStatus(certificateUrls, photoUrls)
    : 'complete';

  try {
    // CHANGED: req.user.id -> req.user.facultyProfileId
    const result = await pool.query(
      `INSERT INTO events
         (faculty_id, event_title, event_type, role_at_event, level, organizer, venue, mode,
          start_date, end_date, description, certificate_urls, photo_urls, status, docs_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [req.user.facultyProfileId, data.event_title, data.event_type, data.role_at_event, data.level,
       data.organizer, data.venue, data.mode, data.start_date, data.end_date,
       data.description, certificateUrls, photoUrls, status, docsStatus]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createEvent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/events/:id
const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { status = 'draft', ...data } = req.body;

  try {
    // CHANGED: req.user.id -> req.user.facultyProfileId (×2 below)
    const existing = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND faculty_id = $2',
      [id, req.user.facultyProfileId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Event not found' });

    const existingEvent = existing.rows[0];
    const newCerts  = req.files?.certificates?.map(f => `/uploads/${f.filename}`) || [];
    const newPhotos = req.files?.photos?.map(f => `/uploads/${f.filename}`) || [];

    const certificateUrls = newCerts.length > 0
      ? [...existingEvent.certificate_urls, ...newCerts]
      : existingEvent.certificate_urls;
    const photoUrls = newPhotos.length > 0
      ? [...existingEvent.photo_urls, ...newPhotos]
      : existingEvent.photo_urls;

    if (status === 'submitted') {
      const errors = validateEventFields(data);
      if (Object.keys(errors).length > 0) return res.status(400).json({ errors });
    }

    let newDocsStatus = existingEvent.docs_status;
    let clearDeadline = false;

    if (existingEvent.import_batch_id && existingEvent.docs_status !== 'complete') {
      newDocsStatus = computeDocsStatus(certificateUrls, photoUrls);
      if (newDocsStatus === 'complete') clearDeadline = true;
    }

    const result = await pool.query(
      `UPDATE events SET
         event_title=$1, event_type=$2, role_at_event=$3, level=$4, organizer=$5,
         venue=$6, mode=$7, start_date=$8, end_date=$9, description=$10,
         certificate_urls=$11, photo_urls=$12, status=$13,
         docs_status=$14,
         document_deadline = CASE WHEN $15 THEN NULL ELSE document_deadline END,
         updated_at=NOW()
       WHERE id=$16 AND faculty_id=$17
       RETURNING *`,
      [data.event_title, data.event_type, data.role_at_event, data.level, data.organizer,
       data.venue, data.mode, data.start_date, data.end_date, data.description,
       certificateUrls, photoUrls, status,
       newDocsStatus, clearDeadline,
       id, req.user.facultyProfileId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateEvent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/events/:id
const deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    // CHANGED: req.user.id -> req.user.facultyProfileId
    const result = await pool.query(
      'DELETE FROM events WHERE id = $1 AND faculty_id = $2 RETURNING id',
      [id, req.user.facultyProfileId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('deleteEvent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/events/bulk-import
const bulkImport = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });
  const isPreview = req.query.preview === 'true';

  const parsedRows = [];
  let rowNumber = 0;

  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv.parse({ headers: true, trim: true }))
        .on('data', (row) => {
          rowNumber++;
          const errors = [];
          if (!row.event_title)   errors.push('event_title is required');
          if (!row.event_type)    errors.push('event_type is required');
          else if (!VALID_EVENT_TYPES.includes(row.event_type))  errors.push(`event_type '${row.event_type}' is not valid`);
          if (!row.role_at_event) errors.push('role_at_event is required');
          else if (!VALID_ROLES.includes(row.role_at_event))     errors.push(`role_at_event '${row.role_at_event}' is not valid`);
          if (!row.level)         errors.push('level is required');
          else if (!VALID_LEVELS.includes(row.level))            errors.push(`level '${row.level}' is not valid`);
          if (!row.organizer)     errors.push('organizer is required');
          if (!row.mode)          errors.push('mode is required');
          else if (!VALID_MODES.includes(row.mode))              errors.push(`mode '${row.mode}' is not valid`);
          if (!row.start_date)    errors.push('start_date is required');
          if (!row.end_date)      errors.push('end_date is required');
          parsedRows.push({ row: rowNumber, data: row, errors });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    const validRows   = parsedRows.filter(r => r.errors.length === 0);
    const invalidRows = parsedRows.filter(r => r.errors.length > 0);

    const duplicates = [];
    const toInsert   = [];
    for (const item of validRows) {
      // CHANGED: req.user.id -> req.user.facultyProfileId
      const dup = await pool.query(
        `SELECT id FROM events WHERE faculty_id = $1 AND LOWER(event_title) = LOWER($2) AND start_date = $3`,
        [req.user.facultyProfileId, item.data.event_title, item.data.start_date]
      );
      if (dup.rows.length > 0) duplicates.push(item);
      else toInsert.push(item);
    }

    fs.unlinkSync(req.file.path);

    if (isPreview) {
      return res.json({
        preview: true,
        valid:      toInsert.map(i => ({ row: i.row, ...i.data })),
        duplicates: duplicates.map(i => ({ row: i.row, ...i.data })),
        invalid:    invalidRows.map(i => ({ row: i.row, reason: i.errors.join('; '), ...i.data })),
      });
    }

    // CHANGED: req.user.id -> req.user.facultyProfileId (batch id + insert)
    const batchId = `${req.user.facultyProfileId}_${Date.now()}`;
    let inserted = 0;
    const dbErrors = [];

    for (const item of toInsert) {
      try {
        await pool.query(
          `INSERT INTO events
             (faculty_id, event_title, event_type, role_at_event, level, organizer, venue, mode,
              start_date, end_date, description, certificate_urls, photo_urls, status,
              docs_status, import_batch_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'submitted','pending_both',$14)`,
          [req.user.facultyProfileId, item.data.event_title, item.data.event_type, item.data.role_at_event,
           item.data.level, item.data.organizer, item.data.venue || null, item.data.mode,
           item.data.start_date, item.data.end_date, item.data.description || null,
           [], [], batchId]
        );
        inserted++;
      } catch (err) {
        dbErrors.push({ row: item.row, reason: err.message });
      }
    }

    res.json({
      inserted,
      batch_id: inserted > 0 ? batchId : null,
      skipped_duplicates: duplicates.length,
      failed: invalidRows.length + dbErrors.length,
      duplicate_list: duplicates.map(i => ({ row: i.row, event_title: i.data.event_title, start_date: i.data.start_date })),
      errors: [
        ...invalidRows.map(i => ({ row: i.row, reason: i.errors.join('; ') })),
        ...dbErrors,
      ],
    });

  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('bulkImport error:', err);
    res.status(500).json({ error: 'Failed to process CSV' });
  }
};

// PUT /api/events/batch/:batchId/deadline
const setBatchDeadline = async (req, res) => {
  const { batchId } = req.params;
  const { hours } = req.body;

  if (![24, 48, 72].includes(Number(hours))) {
    return res.status(400).json({ error: 'value must be 24, 48, or 72' });
  }

  try {
    // CHANGED: req.user.id -> req.user.facultyProfileId
    const result = await pool.query(
      `UPDATE events
       SET document_deadline = NOW() + ($1 || ' hours')::interval
       WHERE import_batch_id = $2
         AND faculty_id = $3
         AND docs_status != 'complete'
       RETURNING id`,
      [String(hours), batchId, req.user.facultyProfileId]
    );

    res.json({ updated: result.rows.length, hours: Number(hours) });
  } catch (err) {
    console.error('setBatchDeadline error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/events/mine/export
const mineExport = async (req, res) => {
  const {
    title_search, organizer_search,
    event_type, role_at_event, level, mode,
    status, docs_status,
    date_from, date_to,
    has_photo, has_certificate, no_attachments,
    duration, source,
    sort
  } = req.query;

  try {
    // CHANGED: req.user.id -> req.user.facultyProfileId
    let query = `SELECT * FROM events WHERE faculty_id = $1`;
    const params = [req.user.facultyProfileId];
    let idx = 2;

    if (title_search)     { query += ` AND event_title ILIKE $${idx++}`;    params.push(`%${title_search}%`); }
    if (organizer_search) { query += ` AND organizer ILIKE $${idx++}`;      params.push(`%${organizer_search}%`); }
    if (event_type)       { query += ` AND event_type = ANY($${idx++})`;    params.push(event_type.split(',')); }
    if (role_at_event)    { query += ` AND role_at_event = ANY($${idx++})`; params.push(role_at_event.split(',')); }
    if (level)            { query += ` AND level = ANY($${idx++})`;         params.push(level.split(',')); }
    if (mode)             { query += ` AND mode = ANY($${idx++})`;          params.push(mode.split(',')); }

    if (status && status !== 'all') {
      query += ` AND status = $${idx++}`; params.push(status);
    }

    if (docs_status) {
      if (docs_status === 'any_pending') {
        query += ` AND docs_status != 'complete'`;
      } else {
        query += ` AND docs_status = $${idx++}`; params.push(docs_status);
      }
    }

    if (date_from) { query += ` AND start_date >= $${idx++}`; params.push(date_from); }
    if (date_to)   { query += ` AND end_date <= $${idx++}`;   params.push(date_to); }

    if (has_photo === 'true')        { query += ` AND array_length(photo_urls, 1) > 0`; }
    if (has_certificate === 'true')  { query += ` AND array_length(certificate_urls, 1) > 0`; }
    if (no_attachments === 'true')   { query += ` AND array_length(photo_urls, 1) IS NULL AND array_length(certificate_urls, 1) IS NULL`; }

    if (duration === 'single') { query += ` AND start_date = end_date`; }
    if (duration === 'multi')  { query += ` AND end_date > start_date`; }

    if (source === 'manual')   { query += ` AND import_batch_id IS NULL`; }
    if (source === 'imported') { query += ` AND import_batch_id IS NOT NULL`; }

    const sortMap = {
      oldest:     'created_at ASC',
      date_asc:   'start_date ASC',
      title_az:   'event_title ASC',
      level_high: `CASE level WHEN 'International' THEN 1 WHEN 'National' THEN 2 WHEN 'State' THEN 3 WHEN 'Local' THEN 4 ELSE 5 END`,
      newest:     'created_at DESC',
    };
    query += ` ORDER BY ${sortMap[sort] || 'created_at DESC'}`;

    const result = await pool.query(query, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Events');

    sheet.columns = [
      { header: 'Event Title',   key: 'event_title',   width: 30 },
      { header: 'Event Type',    key: 'event_type',    width: 15 },
      { header: 'Role at Event', key: 'role_at_event', width: 15 },
      { header: 'Level',         key: 'level',         width: 15 },
      { header: 'Organizer',     key: 'organizer',     width: 25 },
      { header: 'Venue',         key: 'venue',         width: 20 },
      { header: 'Mode',          key: 'mode',          width: 10 },
      { header: 'Start Date',    key: 'start_date',    width: 15 },
      { header: 'End Date',      key: 'end_date',       width: 15 },
      { header: 'Description',   key: 'description',   width: 30 },
      { header: 'Status',        key: 'status',        width: 10 },
      { header: 'Docs Status',   key: 'docs_status',   width: 15 },
      { header: 'Source',        key: 'import_batch_id', width: 12 },
      { header: 'Submitted On',  key: 'created_at',    width: 20 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006B64' } };

    result.rows.forEach(event => {
      sheet.addRow({
        ...event,
        import_batch_id: event.import_batch_id ? 'CSV Import' : 'Manual',
        start_date: event.start_date ? new Date(event.start_date).toLocaleDateString('en-GB') : '',
        end_date:   event.end_date   ? new Date(event.end_date).toLocaleDateString('en-GB')   : '',
        created_at: event.created_at ? new Date(event.created_at).toLocaleDateString('en-GB') : '',
      });
    });

    const today = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    // NOTE: still uses req.user.faculty_id (the human-readable code, e.g. "FAC001") for the filename — unrelated to the facultyProfileId change, this is just a display string
    res.setHeader('Content-Disposition', `attachment; filename=my-events-${req.user.facultyId}-${today}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('mineExport error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/events/all — admin
const getAll = async (req, res) => {
  const {
    search, event_type, level, mode, role_at_event, department, status,
    academic_year, start_date, end_date, month,
    has_photos, has_certificates, multi_day_only,
    sort_by, page = 1, limit = 20
  } = req.query;

  // CHANGED: JOIN now goes through faculty_profile, since events.faculty_id -> faculty_profile.id, not users.id
  let query = `SELECT e.*, u.name as faculty_name, u.faculty_id as faculty_code, u.department, u.designation
               FROM events e
               JOIN faculty_profile fp ON e.faculty_id = fp.id
               JOIN users u ON fp.user_id = u.id
               WHERE 1=1`;
  const params = [];
  let idx = 1;

  if (search) {
    query += ` AND (e.event_title ILIKE $${idx} OR u.name ILIKE $${idx} OR u.faculty_id ILIKE $${idx} OR e.organizer ILIKE $${idx})`;
    params.push(`%${search}%`); idx++;
  }
  if (event_type)    { query += ` AND e.event_type = ANY($${idx++})`;    params.push(event_type.split(',')); }
  if (level)         { query += ` AND e.level = ANY($${idx++})`;         params.push(level.split(',')); }
  if (mode)          { query += ` AND e.mode = ANY($${idx++})`;          params.push(mode.split(',')); }
  if (role_at_event) { query += ` AND e.role_at_event = ANY($${idx++})`; params.push(role_at_event.split(',')); }
  if (department)    { query += ` AND u.department = ANY($${idx++})`;    params.push(department.split(',')); }
  if (status)        { query += ` AND e.status = $${idx++}`;             params.push(status); }
  if (academic_year && !start_date) {
    const [startY] = academic_year.split('-');
    query += ` AND e.start_date >= $${idx++} AND e.start_date <= $${idx++}`;
    params.push(`${startY}-07-01`, `${parseInt(startY) + 1}-06-30`);
  }
  if (start_date)        { query += ` AND e.start_date >= $${idx++}`;              params.push(start_date); }
  if (end_date)          { query += ` AND e.end_date <= $${idx++}`;                params.push(end_date); }
  if (month)             { query += ` AND EXTRACT(MONTH FROM e.start_date) = $${idx++}`; params.push(month); }
  if (has_photos === 'true')       { query += ` AND array_length(e.photo_urls, 1) > 0`; }
  if (has_certificates === 'true') { query += ` AND array_length(e.certificate_urls, 1) > 0`; }
  if (multi_day_only === 'true')   { query += ` AND e.end_date > e.start_date`; }

  const sortMap = {
    date_asc:     'e.start_date ASC',
    faculty_name: 'u.name ASC',
    event_title:  'e.event_title ASC',
    level: `CASE e.level WHEN 'International' THEN 1 WHEN 'National' THEN 2 WHEN 'State' THEN 3 WHEN 'Local' THEN 4 ELSE 5 END`
  };
  query += ` ORDER BY ${sortMap[sort_by] || 'e.created_at DESC'}`;

  try {
    const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) as sub`, params);
    const total = parseInt(countResult.rows[0].count);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);
    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('getAll error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/events/export — admin
const adminExport = async (req, res) => {
  const {
    search, organizer_search,
    event_type, level, mode, role_at_event,
    department, designation, status, docs_status,
    academic_year, start_date, end_date, month,
    has_photos, has_certificates,
    source, duration
  } = req.query;

  // CHANGED: same JOIN fix as getAll
  let query = `SELECT e.*, u.name as faculty_name, u.faculty_id as faculty_code, u.department, u.designation
               FROM events e
               JOIN faculty_profile fp ON e.faculty_id = fp.id
               JOIN users u ON fp.user_id = u.id
               WHERE 1=1`;
  const params = [];
  let idx = 1;

  if (search) {
    query += ` AND (e.event_title ILIKE $${idx} OR u.name ILIKE $${idx} OR u.faculty_id ILIKE $${idx} OR e.organizer ILIKE $${idx})`;
    params.push(`%${search}%`); idx++;
  }

  if (organizer_search) {
    query += ` AND e.organizer ILIKE $${idx++}`;
    params.push(`%${organizer_search}%`);
  }

  if (event_type)    { query += ` AND e.event_type = ANY($${idx++})`;    params.push(event_type.split(',')); }
  if (level)         { query += ` AND e.level = ANY($${idx++})`;         params.push(level.split(',')); }
  if (mode)          { query += ` AND e.mode = ANY($${idx++})`;          params.push(mode.split(',')); }
  if (role_at_event) { query += ` AND e.role_at_event = ANY($${idx++})`; params.push(role_at_event.split(',')); }
  if (department)    { query += ` AND u.department = ANY($${idx++})`;    params.push(department.split(',')); }

  if (designation) {
    query += ` AND u.designation = $${idx++}`;
    params.push(designation);
  }

  if (status && status !== 'All') {
    query += ` AND e.status = $${idx++}`;
    params.push(status);
  }

  if (docs_status && docs_status !== 'All') {
    if (docs_status === 'any_pending') {
      query += ` AND e.docs_status != 'complete'`;
    } else {
      query += ` AND e.docs_status = $${idx++}`;
      params.push(docs_status);
    }
  }

  if (academic_year && !start_date) {
    const [startY] = academic_year.split('-');
    query += ` AND e.start_date >= $${idx++} AND e.start_date <= $${idx++}`;
    params.push(`${startY}-07-01`, `${parseInt(startY) + 1}-06-30`);
  }

  if (start_date) { query += ` AND e.start_date >= $${idx++}`; params.push(start_date); }
  if (end_date)   { query += ` AND e.end_date <= $${idx++}`;   params.push(end_date); }

  if (month) {
    query += ` AND EXTRACT(MONTH FROM e.start_date) = $${idx++}`;
    params.push(parseInt(month));
  }

  if (has_photos === 'true')       { query += ` AND array_length(e.photo_urls, 1) > 0`; }
  if (has_certificates === 'true') { query += ` AND array_length(e.certificate_urls, 1) > 0`; }

  if (source === 'manual')   { query += ` AND e.import_batch_id IS NULL`; }
  if (source === 'imported') { query += ` AND e.import_batch_id IS NOT NULL`; }

  if (duration === 'single') { query += ` AND e.start_date = e.end_date`; }
  if (duration === 'multi')  { query += ` AND e.end_date > e.start_date`; }

  query += ' ORDER BY e.created_at DESC';

  try {
    const result = await pool.query(query, params);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Events');

    sheet.columns = [
      { header: 'Faculty Name',  key: 'faculty_name',     width: 20 },
      { header: 'Faculty ID',    key: 'faculty_code',     width: 15 },
      { header: 'Department',    key: 'department',       width: 20 },
      { header: 'Designation',   key: 'designation',      width: 20 },
      { header: 'Event Title',   key: 'event_title',      width: 30 },
      { header: 'Event Type',    key: 'event_type',       width: 15 },
      { header: 'Role at Event', key: 'role_at_event',    width: 15 },
      { header: 'Level',         key: 'level',            width: 15 },
      { header: 'Organizer',     key: 'organizer',        width: 25 },
      { header: 'Venue',         key: 'venue',            width: 20 },
      { header: 'Mode',          key: 'mode',             width: 10 },
      { header: 'Start Date',    key: 'start_date',       width: 15 },
      { header: 'End Date',      key: 'end_date',         width: 15 },
      { header: 'Description',   key: 'description',      width: 30 },
      { header: 'Status',        key: 'status',           width: 10 },
      { header: 'Docs Status',   key: 'docs_status',      width: 15 },
      { header: 'Source',        key: 'import_batch_id',  width: 12 },
      { header: 'Submitted On',  key: 'created_at',       width: 20 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006B64' } };

    result.rows.forEach(event => {
      sheet.addRow({
        ...event,
        import_batch_id: event.import_batch_id ? 'CSV Import' : 'Manual',
        start_date: event.start_date ? new Date(event.start_date).toLocaleDateString('en-GB') : '',
        end_date:   event.end_date   ? new Date(event.end_date).toLocaleDateString('en-GB')   : '',
        created_at: event.created_at ? new Date(event.created_at).toLocaleDateString('en-GB') : '',
      });
    });

    const today = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=events-export-${today}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('adminExport error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/events/:id/deadline
const setSingleDeadline = async (req, res) => {
  const { id } = req.params;
  const { hours } = req.body;

  if (![24, 48, 72].includes(Number(hours))) {
    return res.status(400).json({ error: 'hours must be 24, 48, or 72' });
  }

  try {
    // CHANGED: req.user.id -> req.user.facultyProfileId
    const result = await pool.query(
      `UPDATE events
       SET document_deadline = NOW() + ($1 || ' hours')::interval
       WHERE id = $2
         AND faculty_id = $3
         AND docs_status != 'complete'
       RETURNING id`,
      [String(hours), id, req.user.facultyProfileId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found or already complete' });
    res.json({ updated: true, hours: Number(hours) });
  } catch (err) {
    console.error('setSingleDeadline error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getMine, createEvent, updateEvent, deleteEvent,
  bulkImport, setBatchDeadline, setSingleDeadline,
  mineExport, getAll, adminExport
};