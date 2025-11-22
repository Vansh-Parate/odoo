import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

console.log('🔍 Testing SMTP Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('  SMTP_HOST:', process.env.SMTP_HOST || '❌ NOT SET');
console.log('  SMTP_PORT:', process.env.SMTP_PORT || '587 (default)');
console.log('  SMTP_USER:', process.env.SMTP_USER || '❌ NOT SET');
console.log('  SMTP_PASS:', process.env.SMTP_PASS ? `✅ SET (${process.env.SMTP_PASS.length} chars)` : '❌ NOT SET');
console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || '❌ NOT SET');
console.log('');

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error('❌ SMTP configuration incomplete!');
  console.error('\n💡 Make sure your .env file has:');
  console.error('   SMTP_HOST=smtp.gmail.com');
  console.error('   SMTP_PORT=587');
  console.error('   SMTP_USER=aarnavjuthani42@gmail.com');
  console.error('   SMTP_PASS=your-16-char-app-password');
  console.error('   EMAIL_FROM="InventoryApp <aarnavjuthani42@gmail.com>"');
  process.exit(1);
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

console.log('📧 Testing SMTP connection...\n');

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP connection failed!');
    console.error('Error:', error.message);
    console.error('\nCommon issues:');
    console.error('  1. App password is incorrect');
    console.error('  2. 2-Step Verification not enabled');
    console.error('  3. App password has spaces (remove them)');
    console.error('  4. Wrong SMTP credentials');
    console.error('\n💡 Check:');
    console.error('  - Go to https://myaccount.google.com/apppasswords');
    console.error('  - Generate a new app password');
    console.error('  - Copy the 16-character password (no spaces)');
    console.error('  - Update SMTP_PASS in .env file');
    process.exit(1);
  } else {
    console.log('✅ SMTP connection successful!');
    console.log('\n📧 Testing email send...');
    
    // Try sending a test email
    const testEmail = process.env.SMTP_USER; // Send to yourself
    transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: testEmail,
      subject: 'Test Email - InventoryApp',
      text: 'This is a test email. If you receive this, SMTP is working correctly!',
      html: '<p>This is a test email. If you receive this, SMTP is working correctly!</p>',
    })
      .then(() => {
        console.log(`✅ Test email sent successfully to ${testEmail}`);
        console.log('✅ SMTP is fully configured and working!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Failed to send test email');
        console.error('Error:', error.message);
        console.error('Response:', error.response);
        process.exit(1);
      });
  }
});

