import { pool } from '../db/index.js';

async function checkDatabase() {
  console.log('🔍 Checking database setup...\n');

  try {
    // Test connection
    console.log('1. Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('   ✅ Database connected\n');

    // Check users table
    console.log('2. Checking users table...');
    const usersCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (usersCheck.rows[0].exists) {
      console.log('   ✅ users table exists\n');
    } else {
      console.log('   ❌ users table does NOT exist\n');
      console.log('   💡 Run: npm run db:auth\n');
    }

    // Check email_otps table
    console.log('3. Checking email_otps table...');
    const otpsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'email_otps'
      );
    `);
    
    if (otpsCheck.rows[0].exists) {
      console.log('   ✅ email_otps table exists\n');
    } else {
      console.log('   ❌ email_otps table does NOT exist\n');
      console.log('   💡 Run: npm run db:auth\n');
    }

    if (!usersCheck.rows[0].exists || !otpsCheck.rows[0].exists) {
      console.log('❌ Database tables are missing!');
      console.log('📝 To fix, run: cd backend && npm run db:auth');
      process.exit(1);
    } else {
      console.log('✅ All authentication tables exist!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. PostgreSQL is running');
    console.error('   2. Database credentials in .env are correct');
    console.error('   3. Database exists');
    process.exit(1);
  }
}

checkDatabase();

