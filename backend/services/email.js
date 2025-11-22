import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  // Remove any spaces from app password (common mistake)
  const smtpPass = process.env.SMTP_PASS.replace(/\s+/g, '');
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const isSecure = smtpPort === 465;
  
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: isSecure, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER.trim(),
      pass: smtpPass,
    },
    // For port 587, use TLS
    ...(smtpPort === 587 && {
      requireTLS: true,
      tls: {
        rejectUnauthorized: false
      }
    })
  });
  
  // Log configuration (without password)
  console.log(`📧 SMTP configured for: ${process.env.SMTP_USER}`);
  console.log(`   Port: ${smtpPort} (secure: ${isSecure})`);
  if (process.env.SMTP_PASS.includes(' ')) {
    console.warn('⚠️  Removed spaces from SMTP_PASS automatically');
  }
  
  // Verify transporter configuration (async)
  transporter.verify()
    .then(() => {
      console.log('✅ SMTP transporter verified and ready');
      console.log(`   Sending from: ${process.env.EMAIL_FROM || process.env.SMTP_USER}`);
    })
    .catch((error) => {
      console.error('❌ SMTP configuration error:', error.message);
      console.error('   Code:', error.code);
      console.error('   Command:', error.command);
      console.warn('⚠️  Falling back to console logging for OTPs');
      console.warn('💡 Check your .env file: SMTP_HOST, SMTP_USER, SMTP_PASS must be set');
      transporter = null;
    });
} else {
  // Development mode: log to console
  console.warn('⚠️  SMTP not configured. OTPs will be logged to console in development mode.');
  console.warn('💡 To enable email sending, set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
}

/**
 * Send OTP email to user
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP code
 * @param {number} expiresInMinutes - OTP expiration time in minutes
 * @returns {Promise<boolean>} - Success status
 */
export async function sendOTPEmail(email, otp, expiresInMinutes = 10, purpose = 'signup') {
  const emailFrom = process.env.EMAIL_FROM || 'InventoryApp <aarnavjuthani42@gmail.com>';
  
  // Check if transporter is available
  if (!transporter) {
    console.log('\n📧 ===== OTP EMAIL (DEV MODE - SMTP NOT CONFIGURED) =====');
    console.log(`From: ${emailFrom}`);
    console.log(`To: ${email}`);
    console.log(`Purpose: ${purpose}`);
    console.log(`OTP: ${otp}`);
    console.log(`Expires in: ${expiresInMinutes} minutes`);
    console.log('===========================================================\n');
    console.warn('⚠️  To send real emails, configure SMTP in .env file');
    console.warn('💡 Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
    console.warn('💡 Run: node scripts/test-smtp.js to test configuration');
    return true;
  }
  
  // Double-check transporter is still valid
  try {
    await transporter.verify();
  } catch (verifyError) {
    console.error('❌ SMTP verification failed during send:', verifyError.message);
    console.log('\n📧 ===== OTP EMAIL (FALLBACK - SMTP FAILED) =====');
    console.log(`OTP: ${otp}`);
    console.log('==================================================\n');
    return true; // Don't fail the request, just log OTP
  }

  const subject = purpose === 'reset' 
    ? 'Reset Your Password - InventoryApp'
    : 'Verify Your Email - InventoryApp';
  
  const mailOptions = {
    from: emailFrom,
    to: email,
    subject: subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">InventoryApp</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">${purpose === 'reset' ? 'Reset Your Password' : 'Verify Your Email Address'}</h2>
            <p style="color: #4b5563;">${purpose === 'reset' ? 'You requested to reset your password. Please use the following code:' : 'Thank you for signing up! Please use the following code to verify your email address:'}</p>
            <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              This code will expire in <strong>${expiresInMinutes} minutes</strong>.
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} InventoryApp. All rights reserved.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      ${purpose === 'reset' ? 'Reset Your Password' : 'Verify Your Email'} - InventoryApp

      ${purpose === 'reset' ? 'You requested to reset your password. Please use the following code:' : 'Thank you for signing up! Please use the following code to verify your email address:'}

      ${otp}

      This code will expire in ${expiresInMinutes} minutes.

      If you didn't request this code, please ignore this email.

      © ${new Date().getFullYear()} InventoryApp. All rights reserved.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    console.error('❌ Email error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    // Re-throw with more context
    const errorMessage = error.response || error.message || 'Failed to send OTP email';
    throw new Error(`Email sending failed: ${errorMessage}`);
  }
}

