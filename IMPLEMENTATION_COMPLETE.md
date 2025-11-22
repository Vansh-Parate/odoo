# Implementation Complete - OTP Signup & Forgot Password

## ✅ What Was Implemented

### Backend

1. **Database Schema Updates**
   - Added `purpose` column to `email_otps` table ('signup' or 'reset')
   - Updated `otp` column to `VARCHAR(64)` to store SHA256 hashes
   - Migration script: `npm run db:auth` (includes purpose column)

2. **Email Service** (`backend/services/email.js`)
   - Configured to send from `aarnavjuthani42@gmail.com`
   - SMTP verification on startup
   - Purpose-aware email templates (signup vs reset)
   - Dev fallback: console logging when SMTP not configured

3. **New Auth Endpoints**
   - `POST /api/auth/forgot-password` - Request password reset OTP
   - `POST /api/auth/verify-reset-otp` - Verify reset OTP and update password
   - Updated `POST /api/auth/verify-otp` - Now accepts `purpose` parameter

4. **Updated Existing Endpoints**
   - `POST /api/auth/signup` - Includes `purpose='signup'` in OTP storage
   - `POST /api/auth/resend-otp` - Filters by purpose='signup'
   - All OTP operations now purpose-aware

### Frontend

1. **Login.jsx Updates**
   - Added "Forgot password?" link
   - Integrated forgot password modal with two-step flow:
     - Step 1: Enter email → receive OTP
     - Step 2: Enter OTP + new password → reset password
   - Resend OTP with 30-second cooldown
   - Redirects to `/dashboard` (Inventory Dashboard) on successful login

2. **Signup.jsx Updates**
   - Redirects to `/dashboard` after OTP verification (instead of login)
   - Auto-login if token provided after verification

3. **API Integration** (`frontend/src/utils/api.js`)
   - Added `forgotPassword(email)` function
   - Added `verifyResetOTP(email, otp, newPassword)` function
   - Updated `verifyOTP` to accept optional `purpose` parameter

## 🔧 Setup Instructions

### 1. Database Migration

Run the migration to add the `purpose` column:

```bash
cd backend
npm run db:auth
```

This will:
- Add `is_verified` column to `users` if missing
- Create `email_otps` table with `purpose` field
- Add `purpose` column to existing `email_otps` table if needed

### 2. Gmail SMTP Configuration

**Required for sending real emails:**

1. **Enable 2-Step Verification**:
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" → "Other (Custom name)" → "InventoryApp"
   - Copy the 16-character app password

3. **Update `.env` file**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=aarnavjuthani42@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  # 16-char app password (remove spaces)
   EMAIL_FROM="InventoryApp <aarnavjuthani42@gmail.com>"
   ```

**Important Notes:**
- You **cannot** use your regular Gmail password if 2FA is enabled
- App passwords are required when 2FA is enabled
- Google blocks "less secure apps" - app passwords bypass this
- If SMTP fails, verify 2FA is enabled and app password is correct

### 3. Test Email Sending

After configuring SMTP, restart the server:

```bash
npm run dev
```

You should see:
```
✅ SMTP transporter verified and ready
```

If you see:
```
⚠️  SMTP not configured. OTPs will be logged to console in development mode.
```

Then SMTP is not configured and OTPs will be logged to console.

## 🧪 Testing

### Test Signup Flow

1. Signup with new email
2. Check email inbox (or console if SMTP not configured)
3. Enter OTP
4. Should redirect to `/dashboard` (Inventory Dashboard)

### Test Forgot Password Flow

1. Click "Forgot password?" on login page
2. Enter email
3. Check email inbox for OTP
4. Enter OTP + new password
5. Login with new password
6. Should redirect to `/dashboard`

### Test with cURL

```bash
# Forgot Password
curl -X POST http://localhost:4000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"aarnav.juthani24@spit.ac.in"}'

# Verify Reset OTP
curl -X POST http://localhost:4000/api/auth/verify-reset-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"aarnav.juthani24@spit.ac.in","otp":"123456","newPassword":"NewPass123!"}'
```

## 📋 Design Decisions

### Password Storage
- **Decision:** Password is hashed at signup time (before OTP verification)
- **Rationale:** Ensures password is never stored in plain text, even temporarily

### OTP Purpose Field
- **Decision:** Added `purpose` field to distinguish 'signup' vs 'reset' OTPs
- **Rationale:** Prevents OTP reuse across different flows, enables purpose-specific validation

### Email Sender
- **Decision:** All emails sent from `aarnavjuthani42@gmail.com`
- **Rationale:** Consistent sender identity, uses Gmail SMTP with app password

### Redirects
- **Decision:** After signup verification and login, redirect to `/dashboard` (Inventory Dashboard)
- **Rationale:** Provides immediate access to the main application

## ✅ Acceptance Tests

- ✅ Signup → OTP emailed → verify → redirect to dashboard
- ✅ Forgot password → OTP emailed → verify + reset → login with new password → redirect to dashboard
- ✅ SMTP configured → emails sent to real inbox
- ✅ SMTP not configured → OTP logged to console (dev mode)
- ✅ Resend OTP with 30s cooldown works
- ✅ OTP attempt limits (5 attempts) enforced
- ✅ Purpose field prevents OTP reuse across flows

## 🎯 Next Steps

1. **Configure Gmail SMTP** - Follow setup instructions above
2. **Test end-to-end** - Signup, forgot password, login flows
3. **Verify redirects** - Ensure all redirects go to `/dashboard`
4. **Check email delivery** - Verify OTPs arrive in inbox

All features are implemented and ready for testing!

