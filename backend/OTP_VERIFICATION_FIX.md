# OTP Verification Bug Fix

## Problem

Correct OTP was showing as "wrong OTP" during signup verification, even though the user entered the correct code. Account was still being created despite failed verification.

## Root Causes Identified

1. **OTP Input Not Trimmed**: Incoming OTP from frontend might have whitespace, causing hash mismatch
2. **Email Normalization Inconsistent**: Email case sensitivity could cause OTP lookup to fail
3. **No Debug Logging**: Hard to diagnose why OTP comparison was failing
4. **Non-Atomic Updates**: User verification and OTP deletion not in transaction
5. **Expiry Check**: Time comparison might have timezone issues

## Fixes Applied

### 1. Enhanced `compareOTP` Function
```javascript
// Before: Simple length check
// After: Normalize input (trim, string conversion) before comparison
function compareOTP(inputOTP, storedOTP) {
  const normalizedInput = String(inputOTP || '').trim();
  if (storedOTP && storedOTP.length === 64) {
    const inputHash = hashOTP(normalizedInput);
    return inputHash === storedOTP;
  }
  return normalizedInput === storedOTP;
}
```

### 2. Input Normalization in `/verify-otp` Endpoint
```javascript
// Normalize and trim inputs
const email = (req.body.email || '').toLowerCase().trim();
const otp = String(req.body.otp || '').trim();
const purpose = (req.body.purpose || 'signup').toLowerCase().trim();
```

### 3. Added Debug Logging (Dev Only)
```javascript
if (process.env.NODE_ENV !== 'production') {
  console.log(`[VERIFY-OTP] Request: email=${email.substring(0, 5)}..., otp=${otp}, purpose=${purpose}`);
  const storedOtpPreview = otpRecord.otp.length === 64 
    ? `[hashed: ${otpRecord.otp.substring(0, 8)}...]` 
    : `[plain: ${otpRecord.otp}]`;
  console.log(`[VERIFY-OTP] Comparing: incoming="${otp}", stored=${storedOtpPreview}`);
}
```

### 4. Atomic Transaction for Updates
```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // Update user verification
  // Delete OTP
  await client.query('COMMIT');
} catch (txError) {
  await client.query('ROLLBACK');
  throw txError;
} finally {
  client.release();
}
```

### 5. Improved Error Messages
- `invalid_otp`: When OTP doesn't match
- `otp_expired`: When OTP has expired
- Clear error messages returned to frontend

### 6. Consistent Expiry Check
```javascript
const now = new Date();
const expiresAt = new Date(otpRecord.expires_at);
if (now >= expiresAt) {
  return res.status(400).json({
    ok: false,
    error: 'otp_expired',
    message: 'OTP has expired',
  });
}
```

## Testing

### Manual Test Steps

1. **Signup with new email**:
   ```bash
   curl -X POST http://localhost:4000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","email":"test@example.com","password":"Test1234!"}'
   ```

2. **Check OTP in database**:
   ```bash
   node scripts/test-otp-verification.js test@example.com
   ```

3. **Verify OTP** (use OTP from email/console):
   ```bash
   curl -X POST http://localhost:4000/api/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","otp":"123456","purpose":"signup"}'
   ```

### Expected Results

✅ **Correct OTP**: Returns `200` with `{ ok: true, token, user }`
✅ **Wrong OTP**: Returns `401` with `{ ok: false, error: "invalid_otp" }`
✅ **Expired OTP**: Returns `400` with `{ ok: false, error: "otp_expired" }`
✅ **User Verified**: `users.is_verified = true` after successful verification
✅ **OTP Deleted**: OTP record removed from `email_otps` table

## Database Query to Inspect OTPs

```sql
SELECT id, email, otp, purpose, expires_at, attempts, created_at 
FROM email_otps 
WHERE email = 'test@example.com' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Note**: The `otp` column contains SHA256 hashes (64 characters), not plain 6-digit codes.

## Frontend Updates

Updated `Signup.jsx` to handle specific error codes:
- `invalid_otp` → "Invalid OTP. Please check and try again."
- `otp_expired` → "OTP has expired. Please request a new one."

## Verification Checklist

- [x] Correct OTP is accepted and returns 200
- [x] After success, `users.is_verified` is set to `true`
- [x] OTP row is deleted after successful verification
- [x] No more "wrong OTP" when correct code is entered
- [x] Frontend displays specific error messages (`invalid_otp`, `otp_expired`)
- [x] Account creation remains `is_verified=false` until OTP verified
- [x] Transaction ensures atomic updates

## Files Changed

1. `backend/routes/auth.js`:
   - Enhanced `compareOTP` function
   - Updated `/verify-otp` endpoint with normalization, logging, and transactions
   - Improved error messages

2. `frontend/src/pages/Signup.jsx`:
   - Updated error handling to display specific error codes

## Debug Commands

```bash
# Test OTP verification logic
node scripts/test-otp-verification.js test@example.com

# Check database for OTPs
psql -d your_database -c "SELECT * FROM email_otps WHERE email = 'test@example.com' ORDER BY created_at DESC LIMIT 5;"
```

## Summary

**Fixed** — Correct OTP now accepted; `users.is_verified` set correctly; OTP consumed; returning proper status codes and error messages.

