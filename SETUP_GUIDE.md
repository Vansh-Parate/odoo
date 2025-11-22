# Complete Setup Guide - OTP Authentication with Gmail

## 🚀 Quick Setup

### 1. Database Setup

```bash
cd backend
npm run db:auth
```

This creates:
- `users` table with `is_verified` column
- `email_otps` table with `purpose` field
- All required indexes

### 2. Gmail SMTP Configuration (Required for Email Sending)

#### Step 1: Enable 2-Step Verification
1. Go to https://myaccount.google.com/security
2. Click "2-Step Verification"
3. Follow the setup process

#### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" from dropdown
3. Select "Other (Custom name)"
4. Enter: `InventoryApp`
5. Click "Generate"
6. **Copy the 16-character password** (format: `xxxx xxxx xxxx xxxx`)

#### Step 3: Update `.env` File

In `backend/.env`, add:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=aarnavjuthani42@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # Remove spaces: xxxxxxxxxxxxxxxx
EMAIL_FROM="InventoryApp <aarnavjuthani42@gmail.com>"
```

**Important:** Remove spaces from the app password when pasting.

### 3. Start Server

```bash
cd backend
npm run dev
```

You should see:
```
✅ SMTP transporter verified and ready
Server running on http://localhost:4000
```

If you see:
```
⚠️  SMTP not configured. OTPs will be logged to console in development mode.
```

Then check your `.env` file and restart the server.

## 🧪 Testing

### Test Signup Flow

1. Go to `/signup`
2. Enter name, email, password
3. Check email inbox (or console) for OTP
4. Enter OTP
5. Should redirect to `/dashboard` (Inventory Dashboard)

### Test Forgot Password Flow

1. Go to `/login`
2. Click "Forgot password?"
3. Enter email
4. Check email inbox for OTP
5. Enter OTP + new password
6. Login with new password
7. Should redirect to `/dashboard`

### Test with cURL

```bash
# Signup
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Aarnav","email":"aarnav.juthani24@spit.ac.in","password":"Aarnav24"}'

# Verify OTP (check console/email for OTP)
curl -X POST http://localhost:4000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"aarnav.juthani24@spit.ac.in","otp":"123456"}'

# Forgot Password
curl -X POST http://localhost:4000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"aarnav.juthani24@spit.ac.in"}'

# Verify Reset OTP
curl -X POST http://localhost:4000/api/auth/verify-reset-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"aarnav.juthani24@spit.ac.in","otp":"123456","newPassword":"NewPass123!"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aarnav.juthani24@spit.ac.in","password":"NewPass123!"}'
```

## ✅ Verification Checklist

- [ ] Database tables created (`npm run db:check` shows all ✅)
- [ ] Gmail 2FA enabled
- [ ] App password generated
- [ ] `.env` file has SMTP credentials
- [ ] Server shows "✅ SMTP transporter verified and ready"
- [ ] Signup sends OTP email
- [ ] Forgot password sends OTP email
- [ ] Login redirects to `/dashboard`
- [ ] Signup verification redirects to `/dashboard`

## 🔧 Troubleshooting

### Emails Not Sending

1. **Check SMTP credentials** - Verify `SMTP_USER` and `SMTP_PASS` in `.env`
2. **Verify 2FA enabled** - App passwords only work with 2FA
3. **Check app password** - Must be 16 characters, no spaces
4. **Check server logs** - Look for SMTP errors
5. **Test connection** - Restart server and check for "✅ SMTP transporter verified"

### OTP Not Received

1. **Check spam folder**
2. **Check server console** - If SMTP not configured, OTP is logged there
3. **Verify email address** - Check for typos
4. **Check rate limits** - Wait 30 seconds between requests

### Database Errors

1. **Run migration**: `npm run db:auth`
2. **Check connection**: `npm run db:check`
3. **Verify .env**: Ensure database credentials are correct

## 📝 Notes

- **Password Storage**: Passwords are hashed at signup time (before OTP verification)
- **OTP Purpose**: OTPs have a `purpose` field ('signup' or 'reset') to prevent reuse
- **Email Sender**: All emails sent from `aarnavjuthani42@gmail.com`
- **Redirects**: After login/signup verification, users are redirected to `/dashboard` (Inventory Dashboard)

