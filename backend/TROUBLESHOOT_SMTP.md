# Troubleshoot Gmail SMTP Authentication Error

## Current Error
```
Invalid login: 535-5.7.8 Username and Password not accepted
```

## Most Likely Issues

### 1. App Password is Incorrect ⚠️

**Solution:** Generate a NEW app password

1. Go to: https://myaccount.google.com/apppasswords
2. **Delete** any existing "InventoryApp" password
3. Click "Generate"
4. Select "Mail" → "Other (Custom name)"
5. Type: `InventoryApp`
6. Click "Generate"
7. **Copy the password immediately** (you can't see it again)
8. It will look like: `abcd efgh ijkl mnop` (4 groups of 4 characters)

### 2. Remove Spaces from Password

In your `.env` file, the password MUST have NO spaces:

**Wrong:**
```
SMTP_PASS=abcd efgh ijkl mnop
```

**Correct:**
```
SMTP_PASS=abcdefghijklmnop
```

### 3. Try Port 587 Instead of 465

Port 587 is more reliable with Gmail. Update your `.env`:

```env
SMTP_PORT=587
```

Then restart server.

### 4. Verify 2-Step Verification

1. Go to: https://myaccount.google.com/security
2. Check "2-Step Verification" is ON
3. If OFF, enable it first
4. Then generate app password

### 5. Check Email Address

Make sure `SMTP_USER` exactly matches the Gmail account:
```env
SMTP_USER=aarnavjuthani42@gmail.com
```

## Step-by-Step Fix (Do This Now)

### Step 1: Generate Fresh App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Delete old password (if exists)
3. Generate new one for Mail → InventoryApp
4. Copy the 16-character password

### Step 2: Update .env File

Open `backend/.env` and set:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=aarnavjuthani42@gmail.com
SMTP_PASS=abcdefghijklmnop  # Your 16-char password, NO SPACES
EMAIL_FROM="InventoryApp <aarnavjuthani42@gmail.com>"
```

**Important:**
- Remove ALL spaces from password
- Use port 587 (not 465)
- No quotes around SMTP_PASS
- Save the file

### Step 3: Test

```bash
node scripts/test-smtp.js
```

### Step 4: Restart Server

```bash
npm run dev
```

Look for:
```
✅ SMTP transporter verified and ready
```

## Still Not Working?

If you still get authentication errors:

1. **Double-check 2-Step Verification is enabled**
2. **Generate a completely NEW app password** (delete old one first)
3. **Try port 587** (change SMTP_PORT=587 in .env)
4. **Verify email address** matches exactly: `aarnavjuthani42@gmail.com`
5. **Check for typos** in .env file
6. **Wait 1-2 minutes** after generating app password before testing

## Quick Test Command

After updating .env, test immediately:

```bash
node scripts/test-smtp.js
```

If successful, you'll receive a test email in your inbox!

