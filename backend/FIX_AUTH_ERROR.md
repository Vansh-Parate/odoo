# Fix Gmail Authentication Error

## The Error

```
Invalid login: 535-5.7.8 Username and Password not accepted
Code: EAUTH
```

This means Gmail rejected your credentials.

## Common Causes & Fixes

### 1. App Password Has Spaces ❌

**Problem:** App passwords from Google come with spaces: `abcd efgh ijkl mnop`

**Fix:** Remove ALL spaces:
```
SMTP_PASS=abcdefghijklmnop  ✅ Correct
```

I've updated the code to automatically remove spaces, but it's better to fix it in .env.

### 2. Wrong App Password

**Problem:** Using old/incorrect app password

**Fix:**
1. Go to https://myaccount.google.com/apppasswords
2. Delete old "InventoryApp" password
3. Generate a NEW one
4. Copy the 16-character password
5. Remove spaces
6. Update `.env` file
7. Restart server

### 3. 2-Step Verification Not Enabled

**Problem:** App passwords only work with 2-Step Verification

**Fix:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Then generate app password

### 4. Email Mismatch

**Problem:** `SMTP_USER` doesn't match the account that generated the app password

**Fix:** Make sure `SMTP_USER=aarnavjuthani42@gmail.com` matches the Gmail account you're using.

### 5. Using Regular Password Instead of App Password

**Problem:** Using your regular Gmail password

**Fix:** You MUST use an app password, not your regular password. App passwords are 16 characters.

## Step-by-Step Fix

### Step 1: Check Your .env File

Open `backend/.env` and verify:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=aarnavjuthani42@gmail.com
SMTP_PASS=abcdefghijklmnop  # 16 chars, NO SPACES
EMAIL_FROM="InventoryApp <aarnavjuthani42@gmail.com>"
```

### Step 2: Generate New App Password

1. Go to: https://myaccount.google.com/apppasswords
2. If you see "InventoryApp" password, delete it
3. Click "Generate"
4. Select "Mail" → "Other (Custom name)"
5. Type: `InventoryApp`
6. Click "Generate"
7. Copy the password (16 characters with spaces)

### Step 3: Update .env

1. Open `backend/.env`
2. Find `SMTP_PASS=...`
3. Replace with your new app password
4. **Remove ALL spaces**
5. Save file

Example:
```
# Wrong (has spaces):
SMTP_PASS=abcd efgh ijkl mnop

# Correct (no spaces):
SMTP_PASS=abcdefghijklmnop
```

### Step 4: Verify Configuration

Run:
```bash
node scripts/check-smtp-config.js
```

Should show:
```
✅ Configuration looks good!
```

### Step 5: Test SMTP

Run:
```bash
node scripts/test-smtp.js
```

Should show:
```
✅ SMTP connection successful!
✅ Test email sent successfully
```

### Step 6: Restart Server

```bash
npm run dev
```

Should see:
```
✅ SMTP transporter verified and ready
   Sending from: InventoryApp <aarnavjuthani42@gmail.com>
```

## Still Getting Error?

1. **Double-check 2-Step Verification is enabled**
2. **Generate a completely new app password**
3. **Verify email address matches**: `SMTP_USER` must be `aarnavjuthani42@gmail.com`
4. **Check for typos** in .env file
5. **Remove quotes** from SMTP_PASS (if you added them)
6. **Restart server** after every .env change

## Quick Test

After fixing, the server should show:
```
✅ SMTP transporter verified and ready
```

If you still see:
```
❌ SMTP configuration error: Invalid login
```

Then:
- Generate a NEW app password
- Make sure it's exactly 16 characters (no spaces)
- Verify 2-Step Verification is enabled
- Restart server

