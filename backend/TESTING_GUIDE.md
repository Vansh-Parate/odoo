# Testing Guide - OTP Verification Fix

## Quick Test (Windows PowerShell)

### Option 1: Use PowerShell Script

```powershell
# Run the PowerShell test script
.\scripts\test-api.ps1
```

This script will:
1. Signup with a new email
2. Prompt you to enter the OTP from email/console
3. Verify the OTP
4. Test login

### Option 2: Use Node.js Script

```bash
# Signup (will show OTP in console)
node scripts/test-signup-flow.js test@example.com

# Then verify with OTP (replace 123456 with actual OTP)
node scripts/test-signup-flow.js test@example.com 123456
```

### Option 3: Manual PowerShell Commands

```powershell
# 1. Signup
$body = @{
    name = "Test User"
    email = "test@example.com"
    password = "Test1234!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/auth/signup" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body

# 2. Verify OTP (replace 123456 with actual OTP from email/console)
$verifyBody = @{
    email = "test@example.com"
    otp = "123456"
    purpose = "signup"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/auth/verify-otp" `
    -Method Post `
    -ContentType "application/json" `
    -Body $verifyBody
```

## Check OTP in Database

```bash
# Check OTP records for an email
node scripts/test-otp-verification.js test@example.com
```

## Expected Results

### ✅ Success Flow

1. **Signup**: Returns `200` with `{ ok: true, message: "OTP sent to email" }`
2. **OTP in Console**: Check server console for OTP (if SMTP not configured)
3. **Verify OTP**: Returns `200` with `{ ok: true, token, user }`
4. **User Verified**: `users.is_verified = true` in database
5. **OTP Deleted**: OTP record removed from `email_otps` table

### ❌ Error Cases

1. **Wrong OTP**: Returns `401` with `{ ok: false, error: "invalid_otp" }`
2. **Expired OTP**: Returns `400` with `{ ok: false, error: "otp_expired" }`
3. **Too Many Attempts**: Returns `401` with message about too many attempts

## Debug Logging

When `NODE_ENV !== 'production'`, the server logs:
- Incoming email and OTP
- Stored OTP format (hashed/plain)
- Comparison result
- Success/failure status

Check server console for debug output like:
```
[VERIFY-OTP] Request: email=test@..., otp=123456, purpose=signup
[VERIFY-OTP] Comparing: incoming="123456", stored=[hashed: abc12345...], attempts=0
[VERIFY-OTP] ✅ OTP verified successfully for email=test@example.com
```

## Troubleshooting

### OTP Not Found
- Check email is correct (case-insensitive, but must match)
- Check OTP hasn't expired (10 minutes)
- Check purpose matches ('signup' vs 'reset')

### OTP Always Wrong
- Check OTP has no spaces (should be trimmed automatically now)
- Check email is normalized (lowercase)
- Check server console for debug logs
- Verify OTP in database: `node scripts/test-otp-verification.js <email>`

### Account Created But Not Verified
- This should not happen anymore (transaction ensures atomic updates)
- If it does, check database: `SELECT * FROM users WHERE email = 'test@example.com'`
- Should show `is_verified = false` until OTP verified

