# Quick Fix for 500 Internal Server Error

## The Problem

You're getting a 500 error because the **authentication database tables don't exist yet**.

## The Solution (3 Steps)

### Step 1: Check Your Database Connection

Make sure your `.env` file in the `backend` folder has the correct database settings:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/stockmaster
# OR use individual parameters:
DB_USER=postgres
DB_HOST=localhost
DB_NAME=stockmaster
DB_PASSWORD=your_password
DB_PORT=5432
```

### Step 2: Check if Tables Exist

Run this command in the `backend` folder:

```bash
npm run db:check
```

This will tell you if the tables are missing.

### Step 3: Create the Authentication Tables

Run this command in the `backend` folder:

```bash
npm run db:auth
```

You should see:
```
Initializing authentication tables...
✅ Authentication tables initialized successfully!
```

### Step 4: Try Signup Again

Now try signing up again. It should work!

## If It Still Doesn't Work

### Check Backend Logs

Look at your backend terminal/console. You should see error messages like:

```
[SIGNUP] Database query error: ...
[SIGNUP] Error code: 42P01
```

**Error code `42P01`** means "table does not exist" - this confirms you need to run `npm run db:auth`.

### Common Issues

1. **Database not running**
   - Make sure PostgreSQL is installed and running
   - Check: `psql -U postgres` (or your DB user)

2. **Wrong database name**
   - Check your `.env` file
   - Make sure `DB_NAME` matches an existing database

3. **Wrong credentials**
   - Verify username and password in `.env`

4. **Tables still missing**
   - Run `npm run db:check` to verify
   - If missing, run `npm run db:auth` again

## Quick Test

After running `npm run db:auth`, test the database:

```bash
# In backend folder
npm run db:check
```

Should show:
```
✅ Database connected
✅ users table exists
✅ email_otps table exists
✅ All authentication tables exist!
```

## Still Having Issues?

1. **Check backend console** - Look for error messages with `[SIGNUP]` prefix
2. **Verify database connection** - Make sure PostgreSQL is running
3. **Check .env file** - Ensure all database variables are set correctly
4. **Run the check script** - `npm run db:check` will show what's missing

