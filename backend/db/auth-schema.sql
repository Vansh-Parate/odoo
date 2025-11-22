-- Authentication Schema for StockMaster
-- PostgreSQL Database Schema for User Authentication with Email OTP Verification

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);

-- ============================================
-- EMAIL OTPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_otps (
  id SERIAL PRIMARY KEY,
  user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(64) NOT NULL,
  purpose VARCHAR(20) NOT NULL DEFAULT 'signup',
  expires_at TIMESTAMP NOT NULL,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for OTP lookups
CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires_at ON email_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_otps_user_id ON email_otps(user_id);

