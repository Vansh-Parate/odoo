import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize the database by running the schema.sql file
 */
export async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('✅ Database initialized successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

/**
 * Initialize authentication tables
 */
export async function initAuthDatabase() {
  try {
    console.log('Initializing authentication tables...');
    
    // Check if users table exists and add missing is_verified column if needed
    try {
      // First check if users table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        )
      `);
      
      if (tableCheck.rows[0].exists) {
        // Table exists, check if column exists
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'is_verified'
        `);
        
        if (columnCheck.rows.length === 0) {
          console.log('Adding missing is_verified column to users table...');
          await pool.query(`
            ALTER TABLE users 
            ADD COLUMN is_verified BOOLEAN DEFAULT FALSE
          `);
          console.log('✅ Added is_verified column');
        } else {
          console.log('✅ is_verified column already exists');
        }
      }
    } catch (error) {
      console.error('Error checking/adding is_verified column:', error.message);
      // Continue - table might not exist yet, will be created by schema
      if (error.code !== '42P01' && error.code !== '42703') {
        throw error;
      }
    }
    
    // Add is_verified column to users table if missing
    try {
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'is_verified'
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log('Adding is_verified column to users table...');
        await pool.query('ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE');
        console.log('✅ Added is_verified column');
      } else {
        console.log('✅ is_verified column already exists');
      }
    } catch (error) {
      if (error.code !== '42P01') {
        console.error('Error adding is_verified column:', error.message);
        throw error;
      }
    }
    
    // Create email_otps table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS email_otps (
          id SERIAL PRIMARY KEY,
          user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
          email VARCHAR(255) NOT NULL,
          otp VARCHAR(64) NOT NULL,
          purpose VARCHAR(20) NOT NULL DEFAULT 'signup',
          expires_at TIMESTAMP NOT NULL,
          attempts INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ email_otps table created');
      
      // Add purpose column if table exists but column is missing
      try {
        const purposeCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'email_otps' 
          AND column_name = 'purpose'
        `);
        
        if (purposeCheck.rows.length === 0) {
          await pool.query(`
            ALTER TABLE email_otps 
            ADD COLUMN purpose VARCHAR(20) DEFAULT 'signup'
          `);
          await pool.query(`
            UPDATE email_otps 
            SET purpose = 'signup' 
            WHERE purpose IS NULL
          `);
          console.log('✅ Added purpose column to email_otps');
        }
      } catch (colError) {
        // Column might already exist, ignore
        if (colError.code !== '42701') {
          console.log('Note: purpose column check:', colError.message);
        }
      }
    } catch (error) {
      if (error.code !== '42P07') {
        console.error('Error creating email_otps table:', error.message);
        throw error;
      }
      console.log('✅ email_otps table already exists');
    }
    
    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email)',
      'CREATE INDEX IF NOT EXISTS idx_email_otps_expires_at ON email_otps(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_email_otps_user_id ON email_otps(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified)'
    ];
    
    for (const indexSql of indexes) {
      try {
        await pool.query(indexSql);
      } catch (error) {
        // Ignore index errors
        console.log(`⚠️  Index creation warning: ${error.message}`);
      }
    }
    
    console.log('✅ Authentication tables initialized successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error initializing auth database:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

/**
 * Drop all tables (use with caution!)
 */
export async function dropAllTables() {
  try {
    console.log('Dropping all tables...');
    
    const tables = [
      'stock_ledger',
      'adjustments',
      'transfer_items',
      'transfers',
      'delivery_items',
      'deliveries',
      'receipt_items',
      'receipts',
      'stock_levels',
      'products',
      'locations',
      'warehouses',
      'users'
    ];
    
    // Drop tables in reverse order of dependencies
    for (const table of tables) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
        console.log(`  Dropped table: ${table}`);
      } catch (error) {
        console.error(`  Error dropping ${table}:`, error.message);
      }
    }
    
    console.log('✅ All tables dropped successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    throw error;
  }
}

/**
 * Reset database (drop all and recreate)
 */
export async function resetDatabase() {
  try {
    await dropAllTables();
    await initDatabase();
    console.log('✅ Database reset successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || 'init';
  
  if (command === 'init') {
    initDatabase()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else if (command === 'auth') {
    initAuthDatabase()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else if (command === 'drop') {
    dropAllTables()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else if (command === 'reset') {
    resetDatabase()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else {
    console.log('Usage: node db/init.js [init|auth|drop|reset]');
    console.log('  init  - Initialize main database schema');
    console.log('  auth  - Initialize authentication tables only');
    console.log('  drop  - Drop all tables');
    console.log('  reset - Drop and recreate all tables');
    process.exit(1);
  }
}

