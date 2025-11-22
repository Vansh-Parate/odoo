import dotenv from 'dotenv';
import { pool } from '../db/index.js';
import crypto from 'crypto';

dotenv.config();

/**
 * Test script to verify OTP storage and comparison logic
 * Run this after signup to check OTP in database
 */

async function testOTPVerification() {
  try {
    console.log('🔍 Testing OTP Verification Logic...\n');

    // Get email from command line or use test
    const email = process.argv[2] || 'test@example.com';
    console.log(`Checking OTPs for: ${email}\n`);

    // Query latest OTPs
    const result = await pool.query(
      `SELECT id, email, otp, purpose, expires_at, attempts, created_at
       FROM email_otps 
       WHERE email = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      console.log('❌ No OTPs found for this email');
      console.log('💡 Run signup first to generate an OTP');
      process.exit(0);
    }

    console.log(`Found ${result.rows.length} OTP record(s):\n`);

    result.rows.forEach((row, index) => {
      console.log(`--- OTP Record ${index + 1} ---`);
      console.log(`ID: ${row.id}`);
      console.log(`Email: ${row.email}`);
      console.log(`OTP: ${row.otp.length === 64 ? `[HASHED: ${row.otp.substring(0, 16)}...]` : `[PLAIN: ${row.otp}]`}`);
      console.log(`Purpose: ${row.purpose}`);
      console.log(`Expires: ${row.expires_at}`);
      console.log(`Attempts: ${row.attempts}`);
      console.log(`Created: ${row.created_at}`);
      
      const now = new Date();
      const expiresAt = new Date(row.expires_at);
      const isExpired = now >= expiresAt;
      console.log(`Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
      console.log('');
    });

    // Test comparison function
    console.log('🧪 Testing OTP Comparison Logic:\n');
    
    const latestOTP = result.rows[0];
    const hashOTP = (otp) => crypto.createHash('sha256').update(otp).digest('hex');
    
    console.log('Stored OTP format:', latestOTP.otp.length === 64 ? 'HASHED (64 chars)' : 'PLAIN TEXT');
    console.log('Stored OTP preview:', latestOTP.otp.substring(0, 16) + '...');
    
    if (latestOTP.otp.length === 64) {
      console.log('\n💡 To verify an OTP:');
      console.log('   1. Get the 6-digit OTP from email/console');
      console.log('   2. Hash it: hashOTP(otp)');
      console.log('   3. Compare with stored hash');
      console.log('\n   Example:');
      console.log('   const testOTP = "123456";');
      console.log('   const testHash = hashOTP(testOTP);');
      console.log(`   const matches = testHash === "${latestOTP.otp.substring(0, 16)}..."`);
    }

    console.log('\n✅ Test complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testOTPVerification();

