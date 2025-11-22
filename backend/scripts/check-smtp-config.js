import dotenv from 'dotenv';

dotenv.config();

console.log('\n🔍 Checking SMTP Configuration...\n');

console.log('Environment Variables:');
console.log('  SMTP_HOST:', process.env.SMTP_HOST || '❌ NOT SET');
console.log('  SMTP_PORT:', process.env.SMTP_PORT || '587 (default)');
console.log('  SMTP_USER:', process.env.SMTP_USER || '❌ NOT SET');
console.log('  SMTP_PASS:', process.env.SMTP_PASS ? `✅ SET (${process.env.SMTP_PASS.length} characters)` : '❌ NOT SET');
if (process.env.SMTP_PASS) {
  if (process.env.SMTP_PASS.includes(' ')) {
    console.log('  ⚠️  WARNING: SMTP_PASS contains spaces! Remove them!');
  }
  if (process.env.SMTP_PASS.length !== 16) {
    console.log(`  ⚠️  WARNING: App password should be 16 characters (you have ${process.env.SMTP_PASS.length})`);
  }
}
console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || '❌ NOT SET');
console.log('');

if (!process.env.SMTP_PASS || process.env.SMTP_PASS === 'YOUR_APP_PASSWORD_HERE') {
  console.error('❌ SMTP_PASS is not set or still has placeholder!');
  console.error('\n💡 Steps to fix:');
  console.error('  1. Go to: https://myaccount.google.com/apppasswords');
  console.error('  2. Generate app password for Mail -> InventoryApp');
  console.error('  3. Copy the 16-character password');
  console.error('  4. Remove ALL spaces');
  console.error('  5. Update SMTP_PASS in .env file');
  process.exit(1);
}

if (process.env.SMTP_PASS.includes(' ')) {
  console.error('❌ SMTP_PASS contains spaces!');
  console.error('\n💡 Fix: Remove all spaces from the app password');
  console.error('   Example: "abcd efgh ijkl mnop" → "abcdefghijklmnop"');
  process.exit(1);
}

if (process.env.SMTP_PASS.length !== 16) {
  console.warn('⚠️  App password should be 16 characters');
  console.warn(`   You have: ${process.env.SMTP_PASS.length} characters`);
}

console.log('✅ Configuration looks good!');
console.log('\n💡 If you still get authentication errors:');
console.log('  1. Make sure 2-Step Verification is enabled');
console.log('  2. Generate a NEW app password');
console.log('  3. Make sure SMTP_USER matches the account that generated the app password');
console.log('  4. Remove all spaces from app password');
console.log('  5. Restart server after changing .env');

