import { pool } from '../db/index.js';

async function fixOtpColumn() {
  try {
    console.log('Fixing OTP column type...');
    
    // Change otp column from CHAR(6) to VARCHAR(64) to store SHA256 hash
    await pool.query(`
      ALTER TABLE email_otps 
      ALTER COLUMN otp TYPE VARCHAR(64)
    `);
    
    console.log('✅ OTP column updated to VARCHAR(64)');
    console.log('✅ Success!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  }
}

fixOtpColumn();

