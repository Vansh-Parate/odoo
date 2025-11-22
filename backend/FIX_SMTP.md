# Fix SMTP Email Not Sending

## The Problem

OTPs are not being sent to your email because the SMTP environment variables are not being loaded from your `.env` file.

## Quick Fix

### Step 1: Check Your .env File Location

Make sure your `.env` file is in the `backend` folder:
```
backend/
  ├── .env          ← Must be here
  ├── server.js
  └── ...
```

### Step 2: Add SMTP Variables to .env

Open `backend/.env` and add these lines (if not present):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=aarnavjuthani42@gmail.com
SMTP_PASS=your-16-character-app-password
EMAIL_FROM="InventoryApp <aarnavjuthani42@gmail.com>"
```

**Important:**
- Remove ALL spaces from the app password
- The app password should be exactly 16 characters
- No quotes around SMTP_PASS (unless it contains special characters)
- EMAIL_FROM should have quotes around it

### Step 3: Get Your Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" → "Other (Custom name)" → enter "InventoryApp"
3. Click "Generate"
4. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)
5. **Remove all spaces** when pasting into .env

Example:
```
SMTP_PASS=abcd efgh ijkl mnop    ❌ Wrong (has spaces)
SMTP_PASS=abcdefghijklmnop       ✅ Correct (no spaces)
```

### Step 4: Test SMTP Configuration

Run the test script:

```bash
node scripts/test-smtp.js
```

You should see:
```
✅ SMTP connection successful!
✅ Test email sent successfully
```

If you see errors, check:
- App password is correct (16 chars, no spaces)
- 2-Step Verification is enabled
- .env file is in the `backend` folder
- No typos in variable names

### Step 5: Restart Server

After fixing .env, restart your server:

```bash
# Stop server (Ctrl+C)
npm run dev
```

You should see:
```
✅ SMTP transporter verified and ready
```

## Common Issues

### Issue 1: Variables Not Loading
**Symptom:** `SMTP_HOST: undefined`

**Fix:**
- Check .env file is in `backend/` folder
- Check variable names match exactly (case-sensitive)
- No spaces around `=` sign
- Restart server after changing .env

### Issue 2: Authentication Failed
**Symptom:** `Error: Invalid login`

**Fix:**
- Use app password, not regular Gmail password
- Ensure 2-Step Verification is enabled
- Remove spaces from app password
- Regenerate app password if needed

### Issue 3: Connection Timeout
**Symptom:** `ETIMEDOUT` or connection error

**Fix:**
- Check internet connection
- Verify SMTP_HOST is `smtp.gmail.com`
- Verify SMTP_PORT is `587`
- Check firewall/antivirus isn't blocking

## Verify It's Working

After fixing, try signup again. Check your server console:

**If working:**
```
✅ SMTP transporter verified and ready
[SIGNUP] OTP sent successfully to your-email@example.com
```

**If not working:**
```
⚠️  SMTP not configured. OTPs will be logged to console
📧 ===== OTP EMAIL (DEV MODE) =====
OTP: 123456
```

## Still Not Working?

1. Run the test script: `node scripts/test-smtp.js`
2. Check server console for error messages
3. Verify .env file format (no extra spaces, correct variable names)
4. Make sure you restarted the server after changing .env

