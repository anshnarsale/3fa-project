const pool = require('../db');

async function getDashboard(req, res) {
  try {
    const result = await pool.query(
      'SELECT email, last_login, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.status(200).json({
      message: 'Welcome to your secure dashboard',
      email: user.email,
      lastLogin: user.last_login,
      accountCreated: user.created_at,
      factorsVerified: {
        password: true,
        securityQuestion: true,
        otp: true,
        webauthn: true
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function logout(req, res) {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
}

module.exports = { getDashboard, logout };