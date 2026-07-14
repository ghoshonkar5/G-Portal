const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded profile photos statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

// Simple health check
app.get('/', (req, res) => {
    res.json({ success: true, message: 'G-Portal Auth Service is running' });
});

const PORT = process.env.PORT || 5003;

app.listen(PORT, () => {
    console.log(`🔐 Auth Service running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
});