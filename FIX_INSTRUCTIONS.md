# Fix Instructions - Missing is_verified Column

## The Problem
Your `users` table exists but is missing the `is_verified` column.

## Quick Fix (Choose One)

### Option 1: Run the Migration Script (Recommended)
```bash
cd backend
npm run db:auth
```

You should see:
```
Initializing authentication tables...
Adding missing is_verified column to users table...
✅ Added is_verified column
✅ Authentication tables initialized successfully!
```

### Option 2: Run SQL Directly
Connect to your PostgreSQL database and run:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
```

## After Running the Fix

1. **Restart your server** (if it's running):
   - Press `Ctrl+C` to stop
   - Run `npm run dev` again

2. **Try signup again** - it should work now!

## Verify It Worked

Check your backend console - you should NOT see:
- ❌ `column "is_verified" does not exist`

You SHOULD see:
- ✅ `[SIGNUP] Request received for email: ...`
- ✅ `[SIGNUP] Creating new user: ...` or `[SIGNUP] OTP sent successfully`

