const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
require('./src/db');

const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const allowedPatterns = [
      'localhost',
      'netlify.app',
      'onrender.com',
      'render.com',
      'vercel.app'
    ];

    const isAllowed = allowedPatterns.some(pattern => origin.includes(pattern));

    if (isAllowed) {
      callback(null, true);
      return;
    }

    console.log('CORS blocked origin:', origin);
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.json({ message: '3FA server running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});