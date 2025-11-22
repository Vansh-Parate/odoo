# Quick Fix: OTP Not Sending to Email

## The Issue

Your `.env` file exists but SMTP variables are not being loaded. This is why OTPs are not being sent.

## Step-by-Step Fix

### Step 1: Open Your .env File

Open `backend/.env` in a text editor.

### Step 2: Add These Lines (if missing)

Add these exact lines to your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=aarnavjuthani42@gmail.com
SMTP_PASS=your-16-character-app-password-here
EMAIL_FROM="InventoryApp <aarnavjuthani42@gmail.com>"
```

### Step 3: Get Your Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" → "Other (Custom name)"
3. Type: `InventoryApp`
4. Click "Generate"
5. Copy the password (looks like: `abcd efgh ijkl mnop`)

### Step 4: Paste App Password in .env

Replace `your-16-character-app-password-here` with your actual app password.

**IMPORTANT:** Remove ALL spaces from the password!

**Wrong:**
```
SMTP_PASS=abcd efgh ijkl mnop
```

**Correct:**
```
SMTP_PASS=abcdefghijklmnop
```

### Step 5: Save .env File

Save the file and make sure:
- No extra spaces around `=`
- No quotes around SMTP_PASS (unless it has special chars)
- EMAIL_FROM has quotes: `"InventoryApp <aarnavjuthani42@gmail.com>"`

### Step 6: Test Configuration

Run this command:

```bash
node scripts/test-smtp.js
```

**If successful, you'll see:**
```
✅ SMTP connection successful!
✅ Test email sent successfully
```

**If failed, you'll see error details - fix them and try again.**

### Step 7: Restart Your Server

After fixing `.env`:

1. Stop server (Ctrl+C)
2. Start again: `npm run dev`
3. Look for: `✅ SMTP transporter verified and ready`

### Step 8: Try Signup Again

Now when you signup, you should receive the OTP in your email inbox!

## Common Mistakes

❌ **Wrong:** `SMTP_PASS=abcd efgh ijkl mnop` (has spaces)  
✅ **Correct:** `SMTP_PASS=abcdefghijklmnop` (no spaces)

❌ **Wrong:** `SMTP_PASS="abcd efgh ijkl mnop"` (quotes with spaces)  
✅ **Correct:** `SMTP_PASS=abcdefghijklmnop` (no quotes, no spaces)

❌ **Wrong:** Using regular Gmail password  
✅ **Correct:** Using 16-character app password

❌ **Wrong:** 2-Step Verification not enabled  
✅ **Correct:** 2-Step Verification enabled, then generate app password

## Still Not Working?

1. **Check .env file location**: Must be in `backend/` folder
2. **Check variable names**: Must be exactly `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (case-sensitive)
3. **Run test script**: `node scripts/test-smtp.js` to see exact error
4. **Check server console**: Look for SMTP error messages when server starts

