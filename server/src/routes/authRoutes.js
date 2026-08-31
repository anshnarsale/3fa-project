const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  register,
  login,
  verifySecurityQuestion,
  setupTotp,
  verifyTotp,
  generateWebauthnRegistration,
  verifyWebauthnRegistration,
  generateWebauthnAuthentication,
  verifyWebauthnAuthentication
} = require('../controllers/authController');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // max 20 requests per IP per window across auth routes
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 10, // stricter for OTP guessing
  message: { error: 'Too many OTP attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

router.use(authLimiter);

const registerValidation = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required')
];

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/security-question/verify', verifySecurityQuestion);
router.post('/totp/setup', setupTotp);
router.post('/totp/verify', otpLimiter, verifyTotp);
router.post('/webauthn/register/options', generateWebauthnRegistration);
router.post('/webauthn/register/verify', verifyWebauthnRegistration);
router.post('/webauthn/auth/options', generateWebauthnAuthentication);
router.post('/webauthn/auth/verify', verifyWebauthnAuthentication);

module.exports = router;