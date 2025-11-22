import { pool } from '../db/index.js';

async function addIsVerifiedColumn() {
  try {
    console.log('Checking is_verified column...');
    
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'is_verified'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding is_verified column...');
      await pool.query('ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE');
      console.log('✅ Added is_verified column');
    } else {
      console.log('✅ is_verified column already exists');
    }
    
    console.log('✅ Success!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  }
}

addIsVerifiedColumn();

