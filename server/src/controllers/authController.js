const bcrypt = require('bcrypt');
const otplib = require('otplib');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

const rpName = '3FA Project';
const rpID = 'localhost';
const origin = 'http://localhost:5173'; // Vite default frontend port

// temp in-memory store for challenges (fine for dev/demo, swap for DB/session in production)
const challengeStore = {};

async function logEvent(userId, eventType, success, details = null, req = null) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    await pool.query(
      'INSERT INTO auth_logs (user_id, event_type, success, ip_address, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, eventType, success, ip, details]
    );
  } catch (err) {
    console.error('Log event error:', err.message);
  }
}

async function register(req, res) {
  const { email, password, security_question, security_answer } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if ((security_question && !security_answer) || (!security_question && security_answer)) {
    return res.status(400).json({ error: 'Security question and answer must be provided together' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const securityAnswerHash = security_answer ? await bcrypt.hash(security_answer.trim(), SALT_ROUNDS) : null;

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, security_question, security_answer_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, created_at`,
      [email, passwordHash, security_question || null, securityAnswerHash]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      await logEvent(null, 'login_attempt', false, `Unknown email: ${email}`, req);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minsLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({ error: `Account locked. Try again in ${minsLeft} minute(s)` });
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      const attempts = user.failed_login_attempts + 1;

      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        await pool.query(
          'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
          [attempts, lockUntil, user.id]
        );
        await logEvent(user.id, 'login_attempt', false, 'Account locked after max attempts', req);
        return res.status(423).json({ error: 'Too many failed attempts. Account locked for 15 minutes' });
      }

      await pool.query('UPDATE users SET failed_login_attempts = $1 WHERE id = $2', [attempts, user.id]);
      await logEvent(user.id, 'login_attempt', false, 'Wrong password', req);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id]
    );

    await logEvent(user.id, 'login_attempt', true, 'Factor 1 passed', req);

    const nextStep = user.security_question ? 'security_question' : 'otp';

    res.status(200).json({
      message: 'Factor 1 passed (password correct)',
      userId: user.id,
      nextStep,
      securityQuestion: user.security_question || null
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function verifySecurityQuestion(req, res) {
  const { userId, answer } = req.body;

  if (!userId || !answer) {
    return res.status(400).json({ error: 'userId and answer required' });
  }

  try {
    const result = await pool.query(
      'SELECT security_question, security_answer_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    if (!user.security_question || !user.security_answer_hash) {
      return res.status(400).json({ error: 'No security question configured for this user' });
    }

    const isValid = await bcrypt.compare(answer.trim(), user.security_answer_hash);
    if (!isValid) {
      await logEvent(userId, 'security_question', false, 'Incorrect security answer', req);
      return res.status(401).json({ error: 'Incorrect security answer' });
    }

    await logEvent(userId, 'security_question', true, 'Security question answered correctly', req);

    res.status(200).json({
      message: 'Security question verified',
      userId,
      nextStep: 'otp'
    });
  } catch (err) {
    console.error('Security question verify error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function setupTotp(req, res) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    const result = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const secret = otplib.generateSecret();

    await pool.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret, userId]);

    const otpauthUrl = otplib.generateURI({
      strategy: 'totp',
      issuer: '3FA-Project',
      label: user.email,
      secret
    });

    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    res.status(200).json({
      message: 'Scan this QR code with Google Authenticator or similar app',
      qrCode: qrCodeDataUrl,
      manualEntryKey: secret
    });
  } catch (err) {
    console.error('TOTP setup error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function verifyTotp(req, res) {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ error: 'userId and token required' });
  }

  try {
    const result = await pool.query('SELECT totp_secret FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { totp_secret } = result.rows[0];
    if (!totp_secret) {
      return res.status(400).json({ error: 'TOTP not set up for this user' });
    }

    const isValid = await otplib.verify({
      strategy: 'totp',
      secret: totp_secret,
      token
    });

    if (!isValid) {
      await logEvent(userId, 'otp_verify', false, 'Invalid OTP code', req);
      return res.status(401).json({ error: 'Invalid or expired OTP code' });
    }

    await logEvent(userId, 'otp_verify', true, 'Factor 2 passed', req);

    res.status(200).json({
      message: 'Factor 2 passed (OTP correct)',
      userId,
      nextStep: 'webauthn'
    });
  } catch (err) {
    console.error('TOTP verify error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function generateWebauthnRegistration(req, res) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];

    const existingCreds = await pool.query(
      'SELECT credential_id FROM webauthn_credentials WHERE user_id = $1',
      [userId]
    );

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user.email,
      attestationType: 'none',
      excludeCredentials: existingCreds.rows.map(cred => ({
        id: cred.credential_id
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    });

    challengeStore[userId] = options.challenge;

    res.status(200).json(options);
  } catch (err) {
    console.error('WebAuthn registration options error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function verifyWebauthnRegistration(req, res) {
  const { userId, response } = req.body;

  if (!userId || !response) {
    return res.status(400).json({ error: 'userId and response required' });
  }

  try {
    const expectedChallenge = challengeStore[userId];
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'No pending challenge for this user' });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'WebAuthn registration verification failed' });
    }

    const { credential } = verification.registrationInfo;

    await pool.query(
      'INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_type) VALUES ($1, $2, $3, $4, $5)',
      [
        userId,
        credential.id,
        Buffer.from(credential.publicKey).toString('base64'),
        credential.counter,
        response.response.authenticatorAttachment || 'platform'
      ]
    );

    delete challengeStore[userId];

    res.status(200).json({ message: 'Passkey registered successfully' });
  } catch (err) {
    console.error('WebAuthn registration verify error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function generateWebauthnAuthentication(req, res) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    const credsResult = await pool.query(
      'SELECT credential_id FROM webauthn_credentials WHERE user_id = $1',
      [userId]
    );

    if (credsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No passkey registered for this user' });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials: credsResult.rows.map(cred => ({
        id: cred.credential_id
      }))
    });

    challengeStore[userId] = options.challenge;

    res.status(200).json(options);
  } catch (err) {
    console.error('WebAuthn auth options error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function verifyWebauthnAuthentication(req, res) {
  const { userId, response } = req.body;

  if (!userId || !response) {
    return res.status(400).json({ error: 'userId and response required' });
  }

  try {
    const expectedChallenge = challengeStore[userId];
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'No pending challenge for this user' });
    }

    const credResult = await pool.query(
      'SELECT * FROM webauthn_credentials WHERE credential_id = $1 AND user_id = $2',
      [response.id, userId]
    );

    if (credResult.rows.length === 0) {
      return res.status(400).json({ error: 'Credential not found' });
    }

    const credential = credResult.rows[0];

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.credential_id,
        publicKey: Buffer.from(credential.public_key, 'base64'),
        counter: Number(credential.counter)
      }
    });

    if (!verification.verified) {
      await logEvent(userId, 'webauthn_verify', false, 'Verification failed', req);
      return res.status(401).json({ error: 'WebAuthn authentication failed' });
    }

    await pool.query(
      'UPDATE webauthn_credentials SET counter = $1 WHERE credential_id = $2',
      [verification.authenticationInfo.newCounter, response.id]
    );

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);

    delete challengeStore[userId];

    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // set true when using HTTPS in production
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    await logEvent(userId, 'webauthn_verify', true, 'Factor 3 passed - full 3FA complete', req);

    res.status(200).json({
      message: 'Factor 3 passed (WebAuthn verified). All 3 factors complete.',
      userId,
      authenticated: true
    });
  } catch (err) {
    console.error('WebAuthn auth verify error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  register,
  login,
  verifySecurityQuestion,
  setupTotp,
  verifyTotp,
  generateWebauthnRegistration,
  verifyWebauthnRegistration,
  generateWebauthnAuthentication,
  verifyWebauthnAuthentication
};