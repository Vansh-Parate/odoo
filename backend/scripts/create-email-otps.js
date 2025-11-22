import { pool } from '../db/index.js';

async function createEmailOtpsTable() {
  try {
    console.log('Creating email_otps table...');
    
    // Create email_otps table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_otps (
        id SERIAL PRIMARY KEY,
        user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
        email VARCHAR(255) NOT NULL,
        otp CHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        attempts INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ email_otps table created');
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_email_otps_expires_at ON email_otps(expires_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_email_otps_user_id ON email_otps(user_id)');
    console.log('✅ Indexes created');
    
    console.log('✅ Success!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  }
}

createEmailOtpsTable();

