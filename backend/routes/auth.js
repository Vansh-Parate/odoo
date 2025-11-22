import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { pool } from '../db/index.js';
import { sendOTPEmail } from '../services/email.js';
import crypto from 'crypto';

const router = express.Router();

// Rate limiters
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: { ok: false, error: 'Too many signup attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { ok: false, error: 'Too many OTP verification attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { ok: false, error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper: Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Hash OTP (using SHA256)
function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// Helper: Compare OTP
function compareOTP(inputOTP, storedOTP) {
  // Normalize input: trim and ensure string
  const normalizedInput = String(inputOTP || '').trim();
  
  // If stored OTP is already hashed (64 chars), hash input and compare
  if (storedOTP && storedOTP.length === 64) {
    const inputHash = hashOTP(normalizedInput);
    return inputHash === storedOTP;
  }
  // Otherwise, direct comparison (plain text - should not happen in production)
  return normalizedInput === storedOTP;
}

/**
 * POST /api/auth/signup
 * Create a new user account and send OTP
 */
router.post(
  '/signup',
  signupLimiter,
  [
    body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req, res) => {
    try {
      // Log incoming request (without sensitive data)
      console.log(`[SIGNUP] Request received for email: ${req.body.email?.substring(0, 5)}...`);

      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log(`[SIGNUP] Validation failed: ${errors.array()[0].msg}`);
        return res.status(400).json({
          ok: false,
          error: errors.array()[0].msg,
        });
      }

      const { name, email, password } = req.body;

      // Check if user exists
      let userResult;
      try {
        userResult = await pool.query(
          'SELECT id, is_verified, password_hash FROM users WHERE email = $1',
          [email]
        );
      } catch (dbError) {
        console.error('[SIGNUP] Database query error:', dbError);
        console.error('[SIGNUP] Error code:', dbError.code);
        console.error('[SIGNUP] Error message:', dbError.message);
        console.error('[SIGNUP] Error detail:', dbError.detail);
        
        // Check if table doesn't exist
        if (dbError.code === '42P01') {
          return res.status(500).json({
            ok: false,
            error: 'Database tables not initialized. Please run: npm run db:auth',
          });
        }
        
        // Check if column doesn't exist
        if (dbError.code === '42703') {
          return res.status(500).json({
            ok: false,
            error: 'Database schema outdated. Please run: npm run db:auth',
          });
        }
        
        throw dbError;
      }

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        
        // If user exists and is verified, return conflict
        if (user.is_verified) {
          console.log(`[SIGNUP] User already exists and verified: ${email}`);
          return res.status(409).json({
            ok: false,
            error: 'User already exists',
          });
        }

        console.log(`[SIGNUP] User exists but not verified, generating new OTP: ${email}`);

        // User exists but not verified - generate new OTP
        const otp = generateOTP();
        const expiresInMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES || '10');
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
        
        // Hash password if not already set
        if (!user.password_hash) {
          const passwordHash = await bcrypt.hash(password, 10);
          await pool.query(
            'UPDATE users SET password_hash = $1, name = $2 WHERE id = $3',
            [passwordHash, name, user.id]
          );
        }

        // Delete old signup OTPs for this email
        await pool.query("DELETE FROM email_otps WHERE email = $1 AND purpose = 'signup'", [email]);

        // Store OTP (hashed) with purpose='signup'
        const otpHash = hashOTP(otp);
        await pool.query(
          'INSERT INTO email_otps (user_id, email, otp, purpose, expires_at) VALUES ($1, $2, $3, $4, $5)',
          [user.id, email, otpHash, 'signup', expiresAt]
        );

        // Send email (with error handling)
        try {
          await sendOTPEmail(email, otp, expiresInMinutes, 'signup');
          console.log(`[SIGNUP] OTP sent successfully to ${email}`);
        } catch (emailError) {
          console.error('[SIGNUP] Email sending failed:', emailError);
          // Don't fail the request if email fails in dev mode
        if (process.env.NODE_ENV === 'production') {
          // In production, rollback OTP creation
          await pool.query("DELETE FROM email_otps WHERE email = $1 AND purpose = 'signup'", [email]);
          return res.status(503).json({
            ok: false,
            error: 'Failed to send OTP email. Please try again later.',
          });
        }
          // In dev, continue (OTP logged to console)
        }

        return res.json({
          ok: true,
          message: 'OTP sent to email',
        });
      }

      // New user - create account
      console.log(`[SIGNUP] Creating new user: ${email}`);
      const passwordHash = await bcrypt.hash(password, 10);
      
      let insertResult;
      try {
        insertResult = await pool.query(
          'INSERT INTO users (name, email, password_hash, is_verified) VALUES ($1, $2, $3, $4) RETURNING id',
          [name, email, passwordHash, false]
        );
      } catch (dbError) {
        console.error('[SIGNUP] Database insert error:', dbError);
        console.error('[SIGNUP] Error code:', dbError.code);
        console.error('[SIGNUP] Error message:', dbError.message);
        console.error('[SIGNUP] Error detail:', dbError.detail);
        
        // Handle unique constraint violation (race condition)
        if (dbError.code === '23505') {
          console.log(`[SIGNUP] Unique constraint violation (race condition): ${email}`);
          return res.status(409).json({
            ok: false,
            error: 'User already exists',
          });
        }
        
        // Check if table doesn't exist
        if (dbError.code === '42P01') {
          return res.status(500).json({
            ok: false,
            error: 'Database tables not initialized. Please run: npm run db:auth',
          });
        }
        
        throw dbError;
      }

      const userId = insertResult.rows[0].id;

      // Generate OTP
      const otp = generateOTP();
      const expiresInMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES || '10');
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      // Store OTP (hashed) with purpose='signup'
      const otpHash = hashOTP(otp);
      try {
        await pool.query(
          'INSERT INTO email_otps (user_id, email, otp, purpose, expires_at) VALUES ($1, $2, $3, $4, $5)',
          [userId, email, otpHash, 'signup', expiresAt]
        );
      } catch (otpError) {
        console.error('[SIGNUP] OTP insertion error:', otpError);
        // Clean up user if OTP insertion fails
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        throw otpError;
      }

      // Send email (with error handling)
      try {
        await sendOTPEmail(email, otp, expiresInMinutes, 'signup');
        console.log(`[SIGNUP] OTP sent successfully to ${email}`);
      } catch (emailError) {
        console.error('[SIGNUP] Email sending failed:', emailError);
        // Don't fail the request if email fails in dev mode
        if (process.env.NODE_ENV === 'production') {
          // In production, clean up user and OTP
          await pool.query("DELETE FROM email_otps WHERE email = $1 AND purpose = 'signup'", [email]);
          await pool.query('DELETE FROM users WHERE id = $1', [userId]);
          return res.status(503).json({
            ok: false,
            error: 'Failed to send OTP email. Please try again later.',
          });
        }
        // In dev, continue (OTP logged to console)
      }

      return res.json({
        ok: true,
        message: 'OTP sent to email',
      });
    } catch (error) {
      console.error('[SIGNUP] Unexpected error:', error);
      console.error('[SIGNUP] Error stack:', error.stack);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/auth/verify-otp
 * Verify OTP and activate user account
 */
router.post(
  '/verify-otp',
  otpLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          ok: false,
          error: errors.array()[0].msg,
        });
      }

      // Normalize and trim inputs
      const email = (req.body.email || '').toLowerCase().trim();
      const otp = String(req.body.otp || '').trim();
      const purpose = (req.body.purpose || 'signup').toLowerCase().trim();

      // Debug logging (dev only)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[VERIFY-OTP] Request: email=${email.substring(0, 5)}..., otp=${otp}, purpose=${purpose}`);
      }

      // Find latest non-expired OTP with matching purpose
      const otpResult = await pool.query(
        `SELECT id, user_id, otp, purpose, expires_at, attempts, created_at
         FROM email_otps 
         WHERE email = $1 AND purpose = $2 AND expires_at > NOW() 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [email, purpose]
      );

      if (otpResult.rows.length === 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[VERIFY-OTP] No OTP found for email=${email}, purpose=${purpose}`);
        }
        return res.status(400).json({
          ok: false,
          error: 'otp_expired',
          message: 'OTP expired or not found',
        });
      }

      const otpRecord = otpResult.rows[0];

      // Check expiry with consistent time comparison
      const now = new Date();
      const expiresAt = new Date(otpRecord.expires_at);
      if (now >= expiresAt) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[VERIFY-OTP] OTP expired: now=${now.toISOString()}, expires_at=${expiresAt.toISOString()}`);
        }
        return res.status(400).json({
          ok: false,
          error: 'otp_expired',
          message: 'OTP has expired',
        });
      }

      // Check attempts
      if (otpRecord.attempts >= 5) {
        // Invalidate OTP
        await pool.query('DELETE FROM email_otps WHERE id = $1', [otpRecord.id]);
        return res.status(401).json({
          ok: false,
          error: 'Too many failed attempts. Please request a new OTP',
        });
      }

      // Debug logging (dev only)
      if (process.env.NODE_ENV !== 'production') {
        const storedOtpPreview = otpRecord.otp.length === 64 
          ? `[hashed: ${otpRecord.otp.substring(0, 8)}...]` 
          : `[plain: ${otpRecord.otp}]`;
        console.log(`[VERIFY-OTP] Comparing: incoming="${otp}", stored=${storedOtpPreview}, attempts=${otpRecord.attempts}`);
      }

      // Compare OTP
      const otpMatches = compareOTP(otp, otpRecord.otp);
      
      if (!otpMatches) {
        // Increment attempts
        await pool.query(
          'UPDATE email_otps SET attempts = attempts + 1 WHERE id = $1',
          [otpRecord.id]
        );

        if (process.env.NODE_ENV !== 'production') {
          console.log(`[VERIFY-OTP] OTP mismatch: incoming="${otp}" does not match stored OTP`);
        }

        return res.status(401).json({
          ok: false,
          error: 'invalid_otp',
          message: 'Invalid OTP',
        });
      }

      // OTP is valid - use transaction for atomic update
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Verify user (only for signup purpose)
        if (otpRecord.purpose === 'signup') {
          await client.query(
            'UPDATE users SET is_verified = TRUE WHERE id = $1',
            [otpRecord.user_id]
          );
        }

        // Delete used OTP
        await client.query('DELETE FROM email_otps WHERE id = $1', [otpRecord.id]);

        await client.query('COMMIT');

        if (process.env.NODE_ENV !== 'production') {
          console.log(`[VERIFY-OTP] ✅ OTP verified successfully for email=${email}`);
        }
      } catch (txError) {
        await client.query('ROLLBACK');
        throw txError;
      } finally {
        client.release();
      }

      // Get user data
      const userResult = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [otpRecord.user_id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'User not found',
        });
      }

      const user = userResult.rows[0];

      // Generate JWT (optional - for auto-login)
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '2h';
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        jwtSecret,
        { expiresIn: jwtExpiresIn }
      );

      return res.json({
        ok: true,
        message: 'email_verified',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error('[VERIFY-OTP] Unexpected error:', error);
      console.error('[VERIFY-OTP] Error stack:', error.stack);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          ok: false,
          error: errors.array()[0].msg,
        });
      }

      const { email, password } = req.body;

      // Find user
      const userResult = await pool.query(
        'SELECT id, name, email, password_hash, is_verified FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          ok: false,
          error: 'Invalid credentials or email not verified',
        });
      }

      const user = userResult.rows[0];

      // Check if verified
      if (!user.is_verified) {
        return res.status(401).json({
          ok: false,
          error: 'Invalid credentials or email not verified',
        });
      }

      // Verify password
      if (!user.password_hash) {
        return res.status(401).json({
          ok: false,
          error: 'Invalid credentials or email not verified',
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return res.status(401).json({
          ok: false,
          error: 'Invalid credentials or email not verified',
        });
      }

      // Generate JWT
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '2h';
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        jwtSecret,
        { expiresIn: jwtExpiresIn }
      );

      return res.json({
        ok: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error('[LOGIN] Unexpected error:', error);
      console.error('[LOGIN] Error stack:', error.stack);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/auth/resend-otp
 * Resend OTP to user (with cooldown check)
 */
router.post(
  '/resend-otp',
  signupLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          ok: false,
          error: errors.array()[0].msg,
        });
      }

      const { email } = req.body;

      // Check if user exists
      const userResult = await pool.query(
        'SELECT id, is_verified FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'User not found',
        });
      }

      const user = userResult.rows[0];

      if (user.is_verified) {
        return res.status(409).json({
          ok: false,
          error: 'User already verified',
        });
      }

      // Check cooldown (30 seconds) for signup OTPs
      const recentOTP = await pool.query(
        `SELECT created_at FROM email_otps 
         WHERE email = $1 AND purpose = 'signup' AND created_at > NOW() - INTERVAL '30 seconds'
         ORDER BY created_at DESC LIMIT 1`,
        [email]
      );

      if (recentOTP.rows.length > 0) {
        return res.status(429).json({
          ok: false,
          error: 'Please wait 30 seconds before requesting a new OTP',
        });
      }

      // Generate new OTP
      const otp = generateOTP();
      const expiresInMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES || '10');
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      // Delete old signup OTPs
      await pool.query("DELETE FROM email_otps WHERE email = $1 AND purpose = 'signup'", [email]);

      // Store new OTP with purpose='signup'
      const otpHash = hashOTP(otp);
      await pool.query(
        'INSERT INTO email_otps (user_id, email, otp, purpose, expires_at) VALUES ($1, $2, $3, $4, $5)',
        [user.id, email, otpHash, 'signup', expiresAt]
      );

      // Send email
      await sendOTPEmail(email, otp, expiresInMinutes, 'signup');

      return res.json({
        ok: true,
        message: 'OTP sent to email',
      });
    } catch (error) {
      console.error('[RESEND-OTP] Unexpected error:', error);
      console.error('[RESEND-OTP] Error stack:', error.stack);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/auth/forgot-password
 * Request password reset OTP
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: { ok: false, error: 'Too many password reset attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          ok: false,
          error: errors.array()[0].msg,
        });
      }

      const { email } = req.body;

      console.log(`[FORGOT-PASSWORD] Request received for email: ${email.substring(0, 5)}...`);

      // Check if user exists
      const userResult = await pool.query(
        'SELECT id, is_verified FROM users WHERE email = $1',
        [email]
      );

      // Return generic success to avoid email enumeration
      if (userResult.rows.length === 0) {
        console.log(`[FORGOT-PASSWORD] User not found: ${email}`);
        return res.json({
          ok: true,
          message: 'If the email exists, an OTP has been sent',
        });
      }

      const user = userResult.rows[0];

      if (!user.is_verified) {
        return res.status(400).json({
          ok: false,
          error: 'Email not verified. Please verify your email first.',
        });
      }

      // Check cooldown (30 seconds)
      const recentOTP = await pool.query(
        `SELECT created_at FROM email_otps 
         WHERE email = $1 AND purpose = 'reset' AND created_at > NOW() - INTERVAL '30 seconds'
         ORDER BY created_at DESC LIMIT 1`,
        [email]
      );

      if (recentOTP.rows.length > 0) {
        return res.status(429).json({
          ok: false,
          error: 'Please wait 30 seconds before requesting a new OTP',
        });
      }

      // Generate OTP
      const otp = generateOTP();
      const expiresInMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES || '10');
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      // Delete old reset OTPs
      await pool.query("DELETE FROM email_otps WHERE email = $1 AND purpose = 'reset'", [email]);

      // Store OTP (hashed) with purpose='reset'
      const otpHash = hashOTP(otp);
      try {
        await pool.query(
          'INSERT INTO email_otps (user_id, email, otp, purpose, expires_at) VALUES ($1, $2, $3, $4, $5)',
          [user.id, email, otpHash, 'reset', expiresAt]
        );
      } catch (otpError) {
        console.error('[FORGOT-PASSWORD] OTP insertion error:', otpError);
        throw otpError;
      }

      // Send email (with error handling)
      try {
        await sendOTPEmail(email, otp, expiresInMinutes, 'reset');
        console.log(`[FORGOT-PASSWORD] OTP sent successfully to ${email}`);
      } catch (emailError) {
        console.error('[FORGOT-PASSWORD] Email sending failed:', emailError);
        // Rollback OTP creation
        await pool.query("DELETE FROM email_otps WHERE email = $1 AND purpose = 'reset'", [email]);
        return res.status(500).json({
          ok: false,
          error: 'email_send_failed',
          message: 'Failed to send OTP email. Please try again later.',
        });
      }

      return res.json({
        ok: true,
        message: 'If the email exists, an OTP has been sent',
      });
    } catch (error) {
      console.error('[FORGOT-PASSWORD] Unexpected error:', error);
      console.error('[FORGOT-PASSWORD] Error stack:', error.stack);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/auth/verify-reset-otp
 * Verify reset OTP and update password
 */
router.post(
  '/verify-reset-otp',
  otpLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          ok: false,
          error: errors.array()[0].msg,
        });
      }

      const { email, otp, newPassword } = req.body;

      // Find latest non-expired reset OTP
      const otpResult = await pool.query(
        `SELECT id, user_id, otp, expires_at, attempts 
         FROM email_otps 
         WHERE email = $1 AND purpose = 'reset' AND expires_at > NOW() 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [email]
      );

      if (otpResult.rows.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'OTP expired or not found',
        });
      }

      const otpRecord = otpResult.rows[0];

      // Check attempts
      if (otpRecord.attempts >= 5) {
        await pool.query('DELETE FROM email_otps WHERE id = $1', [otpRecord.id]);
        return res.status(401).json({
          ok: false,
          error: 'Too many failed attempts. Please request a new OTP',
        });
      }

      // Compare OTP
      if (!compareOTP(otp, otpRecord.otp)) {
        await pool.query(
          'UPDATE email_otps SET attempts = attempts + 1 WHERE id = $1',
          [otpRecord.id]
        );

        return res.status(401).json({
          ok: false,
          error: 'Invalid OTP',
        });
      }

      // OTP is valid - update password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [passwordHash, otpRecord.user_id]
      );

      // Delete used OTP
      await pool.query('DELETE FROM email_otps WHERE id = $1', [otpRecord.id]);

      return res.json({
        ok: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      console.error('[VERIFY-RESET-OTP] Unexpected error:', error);
      console.error('[VERIFY-RESET-OTP] Error stack:', error.stack);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
);

export default router;

