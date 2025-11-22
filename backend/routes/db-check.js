import express from 'express';
import { pool } from '../db/index.js';

const router = express.Router();

/**
 * GET /api/db-check
 * Check if database tables exist
 */
router.get('/db-check', async (req, res) => {
  try {
    const checks = {
      database_connected: false,
      users_table_exists: false,
      email_otps_table_exists: false,
      errors: [],
    };

    // Test database connection
    try {
      await pool.query('SELECT NOW()');
      checks.database_connected = true;
    } catch (error) {
      checks.errors.push(`Database connection failed: ${error.message}`);
      return res.status(500).json({
        ok: false,
        message: 'Database connection check failed',
        checks,
      });
    }

    // Check if users table exists
    try {
      const usersCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      checks.users_table_exists = usersCheck.rows[0].exists;
    } catch (error) {
      checks.errors.push(`Users table check failed: ${error.message}`);
    }

    // Check if email_otps table exists
    try {
      const otpsCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'email_otps'
        );
      `);
      checks.email_otps_table_exists = otpsCheck.rows[0].exists;
    } catch (error) {
      checks.errors.push(`Email OTPs table check failed: ${error.message}`);
    }

    const allTablesExist = checks.users_table_exists && checks.email_otps_table_exists;

    if (!allTablesExist) {
      return res.status(200).json({
        ok: false,
        message: 'Database tables missing. Run: npm run db:auth',
        checks,
        fix: 'Run: cd backend && npm run db:auth',
      });
    }

    return res.json({
      ok: true,
      message: 'All database tables exist',
      checks,
    });
  } catch (error) {
    console.error('[DB-CHECK] Error:', error);
    return res.status(500).json({
      ok: false,
      message: 'Database check failed',
      error: error.message,
    });
  }
});

export default router;

