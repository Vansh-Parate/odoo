-- Quick fix: Create email_otps table and add is_verified column

-- Add is_verified column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create email_otps table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_otps (
  id SERIAL PRIMARY KEY,
  user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  otp CHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires_at ON email_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_otps_user_id ON email_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);

