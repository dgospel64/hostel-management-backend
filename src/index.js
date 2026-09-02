require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const roomsRoutes = require('./routes/rooms');
const feesRoutes = require('./routes/fees');
const clearanceRoutes = require('./routes/clearance');
const maintenanceRoutes = require('./routes/maintenance');
const visitorsRoutes = require('./routes/visitors');
const complaintsRoutes = require('./routes/complaints');
const notificationsRoutes = require('./routes/notifications');
const announcementsRoutes = require('./routes/announcements');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) => { res.json({ status: 'ok', message: 'Hostel Management API is running. This is a backend service with no visual homepage — try /health to check status, or use it through the frontend app.', }); }); 

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/rooms', roomsRoutes);
app.use('/fees', feesRoutes);
app.use('/clearance', clearanceRoutes);
app.use('/maintenance', maintenanceRoutes);
app.use('/visitors', visitorsRoutes);
app.use('/complaints', complaintsRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/announcements', announcementsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

// Generic error handler, catches multer errors (e.g. file too large) too.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Hostel Management API running on port ${port}`));
