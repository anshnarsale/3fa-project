const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getDashboard, logout } = require('../controllers/dashboardController');

router.get('/', requireAuth, getDashboard);
router.post('/logout', requireAuth, logout);

module.exports = router;