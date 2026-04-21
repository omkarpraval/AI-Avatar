require('dotenv').config();
const express = require('express');
const cors = require('cors');

const aiRoutes = require('./routes/ai');
const uploadRoutes = require('./routes/upload');

const app = express();

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / curl / Postman
      if (!origin) return cb(null, true);
      // Allow configured origin and any localhost port in dev
      if (origin === CLIENT_ORIGIN) return cb(null, true);
      if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
      return cb(new Error('CORS blocked for origin: ' + origin));
    },
  })
);

app.use(
  express.json({
    limit: '20mb',
  })
);

app.use('/api', uploadRoutes);
app.use('/api', aiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Basic error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`LuminaLearn backend listening on http://localhost:${PORT}`);
  });
}

module.exports = app;

