const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cron = require('node-cron');
const potentialFlagRoutes = require('./routes/potentialFlagRoutes');
const adminStatsRoutes = require('./routes/adminStatsRoutes');


dotenv.config();

const authRoutes = require('./routes/authRoutes');
const publicationRoutes = require('./routes/publicationRoutes');
const conferenceRoutes = require('./routes/conferenceRoutes');
const bookRoutes = require('./routes/bookRoutes');
const scholarRoutes = require('./routes/scholarRoutes');
const scopusRoutes = require('./routes/scopusRoutes');
const flagRoutes = require('./routes/flagRoutes');
const wosRoutes = require('./routes/wosRoutes');
const journalRankingsRoutes = require('./routes/journalRankingsRoutes');
const krcRoutes = require('./routes/krcRoutes');


const { runNightlyScopusSync } = require('./controllers/scopusController');
const { runNightlyWosSync } = require('./controllers/wosController');

const app = express();

// ✅ Middleware FIRST — before any routes
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ✅ Routes AFTER middleware
app.use('/api/auth', authRoutes);
app.use('/api/publications', publicationRoutes);
app.use('/api/conferences', conferenceRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/scholar', scholarRoutes);
app.use('/api/scopus', scopusRoutes);
app.use('/api/flags', flagRoutes);
app.use('/api/wos', wosRoutes);
app.use('/api/journal-rankings', journalRankingsRoutes);
app.use('/api/krc', krcRoutes);
app.use('/api/potential-flags', potentialFlagRoutes);
app.use('/api/admin/stats', adminStatsRoutes);


app.get('/', (req, res) => {
  res.json({ message: '🚀 GITAM Backend API is running!', status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'GITAM Backend API is healthy', database: 'Connected to Neon PostgreSQL' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'File too large. Maximum size is 50MB.' });
  }
  res.status(500).json({ success: false, message: 'Something went wrong!', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 GITAM Backend Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`💾 Database: Neon PostgreSQL`);
  console.log(`\nPress Ctrl+C to stop\n`);

  // Scopus nightly sync — 2:00 AM IST
  cron.schedule('0 2 * * *', () => {
    console.log('⏰ [Cron] Starting nightly Scopus sync...');
    runNightlyScopusSync();
  }, { timezone: 'Asia/Kolkata' });

  // WoS nightly sync — 3:30 AM IST (offset to avoid overlap with Scopus)
  cron.schedule('30 3 * * *', () => {
    console.log('⏰ [Cron] Starting nightly WoS sync...');
    runNightlyWosSync();
  }, { timezone: 'Asia/Kolkata' });

  console.log('⏰ Nightly Scopus sync scheduled at 2:00 AM IST');
  console.log('⏰ Nightly WoS sync scheduled at 3:30 AM IST');
});