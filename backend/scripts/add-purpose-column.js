import { pool } from '../db/index.js';

async function addPurposeColumn() {
  try {
    console.log('Adding purpose column to email_otps table...');
    
    // Check if column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'email_otps' 
      AND column_name = 'purpose'
    `);
    
    if (columnCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE email_otps 
        ADD COLUMN purpose VARCHAR(20) DEFAULT 'signup'
      `);
      console.log('✅ Added purpose column');
      
      // Update existing records to have 'signup' purpose
      await pool.query(`
        UPDATE email_otps 
        SET purpose = 'signup' 
        WHERE purpose IS NULL
      `);
      console.log('✅ Updated existing records');
    } else {
      console.log('✅ purpose column already exists');
    }
    
    console.log('✅ Success!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  }
}

addPurposeColumn();

