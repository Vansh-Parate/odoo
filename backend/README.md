# StockMaster Backend - Authentication System

Complete authentication system with email OTP verification for StockMaster application.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server
PORT=4000
FRONTEND_URL=http://localhost:5173

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/stockmaster
# OR use individual parameters:
DB_USER=postgres
DB_HOST=localhost
DB_NAME=stockmaster
DB_PASSWORD=your_password
DB_PORT=5432

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=2h

# Email (SMTP) - Required for production, optional for development
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=aarnavjuthani42@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM="InventoryApp <aarnavjuthani42@gmail.com>"

# OTP Settings
OTP_EXPIRES_MINUTES=10
```

**Note:** If SMTP is not configured, OTPs will be logged to the console in development mode.

### Gmail SMTP Setup

To send OTP emails from `aarnavjuthani42@gmail.com`, you need to:

1. **Enable 2-Step Verification** on your Gmail account:
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)" → enter "InventoryApp"
   - Copy the 16-character app password

3. **Set in .env**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=aarnavjuthani42@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  # The 16-character app password (remove spaces)
   EMAIL_FROM="InventoryApp <aarnavjuthani42@gmail.com>"
   ```

**Important:**
- You **cannot** use your regular Gmail password if 2FA is enabled
- App passwords are required when 2FA is enabled
- Google may block "less secure apps" - app passwords bypass this
- If SMTP fails, check that 2FA is enabled and app password is correct

### 3. Initialize Database

Initialize authentication tables:

```bash
npm run db:auth
# OR
node db/init.js auth
```

This creates the `users` and `email_otps` tables.

### 4. Start Server

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

Server will run on `http://localhost:4000`

## 📚 API Endpoints

### Authentication Endpoints

#### POST `/api/auth/signup`

Create a new user account and send OTP email.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "message": "OTP sent to email"
}
```

**Error Responses:**
- `400` - Validation error
- `409` - User already exists and verified
- `429` - Too many requests
- `500` - Server error

#### POST `/api/auth/verify-otp`

Verify OTP and activate user account.

**Request:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "message": "Email verified",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Responses:**
- `400` - OTP expired or not found
- `401` - Invalid OTP or too many attempts
- `429` - Too many requests
- `500` - Server error

#### POST `/api/auth/login`

Authenticate user and return JWT token.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Invalid credentials or email not verified
- `429` - Too many requests
- `500` - Server error

#### POST `/api/auth/resend-otp`

Resend OTP to user (with 30-second cooldown).

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "message": "OTP sent to email"
}
```

**Error Responses:**
- `400` - Validation error
- `404` - User not found
- `409` - User already verified
- `429` - Too many requests or cooldown active
- `500` - Server error

## 🧪 Testing with cURL

### Signup

```bash
curl -i -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Aarnav","email":"aarnav+test@example.com","password":"Passw0rd!"}'
```

**Expected Response:**
- Success (200): `{"ok": true, "message": "OTP sent to email"}`
- Duplicate (409): `{"ok": false, "error": "User already exists"}`
- Validation Error (400): `{"ok": false, "error": "..."}`

**Note:** In development mode (SMTP not configured), check backend console for OTP code.

### Verify OTP

```bash
curl -X POST http://localhost:4000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"aarnav+test@example.com","otp":"123456"}'
```

**Expected Response:**
- Success (200): `{"ok": true, "message": "Email verified", "token": "...", "user": {...}}`
- Invalid/Expired (400/401): `{"ok": false, "error": "..."}`

### Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aarnav+test@example.com","password":"Passw0rd!"}'
```

**Expected Response:**
- Success (200): `{"ok": true, "token": "...", "user": {...}}`
- Invalid (401): `{"ok": false, "error": "Invalid credentials or email not verified"}`

### Resend OTP

```bash
curl -X POST http://localhost:4000/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"aarnav+test@example.com"}'
```

**Expected Response:**
- Success (200): `{"ok": true, "message": "OTP sent to email"}`
- Cooldown (429): `{"ok": false, "error": "Please wait 30 seconds..."}`

### Forgot Password

```bash
curl -X POST http://localhost:4000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"aarnav+test@example.com"}'
```

**Expected Response:**
- Success (200): `{"ok": true, "message": "If the email exists, an OTP has been sent"}`
- Not Verified (400): `{"ok": false, "error": "Email not verified. Please verify your email first."}`
- Cooldown (429): `{"ok": false, "error": "Please wait 30 seconds..."}`

### Verify Reset OTP

```bash
curl -X POST http://localhost:4000/api/auth/verify-reset-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"aarnav+test@example.com","otp":"123456","newPassword":"NewPass123!"}'
```

**Expected Response:**
- Success (200): `{"ok": true, "message": "Password reset successfully"}`
- Invalid/Expired (400/401): `{"ok": false, "error": "..."}`

## 🐛 Troubleshooting

### 500 Internal Server Error

If you encounter 500 errors:

1. **Check backend logs** - Look for `[SIGNUP]`, `[LOGIN]`, etc. prefixes with detailed error messages
2. **Verify database connection** - Ensure PostgreSQL is running and credentials are correct
3. **Check environment variables** - Ensure all required vars are set in `.env`
4. **Check email configuration** - In dev mode, SMTP is optional (OTP logged to console)

### Common Issues

**Issue:** "User already exists" when trying to signup
- **Solution:** User is already registered. Try login instead, or use a different email.

**Issue:** "OTP expired or not found"
- **Solution:** OTPs expire after 10 minutes. Request a new OTP.

**Issue:** "Too many failed attempts"
- **Solution:** Wait 15 minutes or request a new OTP.

**Issue:** React duplicate key warnings
- **Solution:** Fixed in latest version. Ensure you're using the updated Dashboard, Receipts, and Deliveries components.

## 🗄️ Database Schema

### Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Email OTPs Table

```sql
CREATE TABLE email_otps (
  id SERIAL PRIMARY KEY,
  user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(64) NOT NULL,
  purpose VARCHAR(20) NOT NULL DEFAULT 'signup',
  expires_at TIMESTAMP NOT NULL,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Note:** The `purpose` field distinguishes between 'signup' and 'reset' OTPs. The `otp` field stores SHA256 hashes (64 characters), not plain 6-digit codes.

## 🔐 Security Features

### Password Hashing
- Passwords are hashed using **bcryptjs** with **10 salt rounds**
- Password is hashed and stored **at signup time** (before OTP verification)
- User account is only activated (`is_verified = true`) after successful OTP verification

### OTP Storage
- OTPs are stored as **SHA256 hashes** (not plain text)
- OTP expiration: **10 minutes** (configurable via `OTP_EXPIRES_MINUTES`)
- Maximum attempts: **5** (OTP invalidated after 5 failed attempts)
- Resend cooldown: **30 seconds**

### Rate Limiting
- **Signup endpoint**: 5 requests per 15 minutes per IP
- **OTP verification**: 10 requests per 15 minutes per IP
- **Login endpoint**: 10 requests per 15 minutes per IP
- **Resend OTP**: 5 requests per 15 minutes per IP

### Security Middleware
- **Helmet**: Security headers
- **CORS**: Configured for frontend origin only
- **Input Validation**: Using express-validator
- **JWT**: Signed tokens with configurable expiration

## 📋 Design Decisions

### Password Storage Strategy
**Decision:** Password is hashed and stored **at signup time** (before OTP verification).

**Rationale:**
- User provides password during signup
- Password is immediately hashed with bcrypt (10 rounds)
- Stored in `password_hash` field
- Account remains `is_verified = false` until OTP is verified
- This approach ensures password is never stored in plain text, even temporarily
- If user abandons signup, the unverified account can be cleaned up later

### OTP Purpose Field
**Decision:** Added `purpose` field to `email_otps` table to distinguish between 'signup' and 'reset' OTPs.

**Rationale:**
- Allows same table to handle both signup verification and password reset
- Prevents OTP reuse across different flows
- Enables purpose-specific validation and expiration logic

### OTP Storage Strategy
**Decision:** OTPs are stored as **SHA256 hashes** (not plain text).

**Rationale:**
- OTPs are sensitive but short-lived (10 minutes)
- Hashing provides additional security if database is compromised
- SHA256 is fast enough for OTP verification
- Stored hash is 64 characters (hex)

### Email Service
**Decision:** Development fallback logs OTP to console if SMTP not configured.

**Rationale:**
- Allows development without email service setup
- OTPs are clearly visible in console for testing
- Production requires proper SMTP configuration
- Prevents accidental email sending in development

## ✅ Acceptance Tests

### Test 1: Complete Signup Flow
1. Signup with new email → receive OTP email
2. Enter OTP → user becomes verified
3. Login with email & password → receive JWT ✅

### Test 2: Existing Verified User
1. Signup with existing verified email → server returns 409 ✅
2. No OTP is sent ✅

### Test 3: OTP Expiration
1. Signup → receive OTP
2. Wait >10 minutes
3. Verify OTP → returns 400 "OTP expired" ✅
4. Resend OTP → works ✅

### Test 4: Invalid Login
1. Login with incorrect password → 401 returned ✅
2. UI shows error message ✅

### Test 5: Rate Limiting
1. Make >5 signup requests quickly → returns 429 ✅

## 🛠️ Development Notes

### Email in Development
If SMTP is not configured, OTPs are logged to console:
```
📧 ===== OTP EMAIL (DEV MODE) =====
To: user@example.com
OTP: 123456
Expires in: 10 minutes
=====================================
```

### Database Connection
The system supports:
- **Connection string**: `DATABASE_URL` (e.g., for Neon, Supabase)
- **Individual parameters**: `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT`

### JWT Token Usage
After successful login/verification, store the token:
```javascript
localStorage.setItem('token', response.token);
```

Include in API requests:
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

## 📦 Dependencies

- **express**: Web framework
- **pg**: PostgreSQL client
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT generation
- **nodemailer**: Email sending
- **express-rate-limit**: Rate limiting
- **helmet**: Security headers
- **express-validator**: Input validation
- **cors**: CORS middleware
- **dotenv**: Environment variables

## 🔧 Scripts

```bash
# Start development server
npm run dev

# Start production server
npm start

# Initialize auth tables
npm run db:auth

# Initialize all database tables
npm run db:init

# Reset database
npm run db:reset
```

## 🚨 Production Checklist

- [ ] Change `JWT_SECRET` to a strong, random value
- [ ] Configure SMTP settings
- [ ] Set `FRONTEND_URL` to production domain
- [ ] Enable HTTPS
- [ ] Set secure cookie flags (if using cookies)
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Monitor rate limiting
- [ ] Set up error logging/monitoring
- [ ] Review and test all security settings

## 📝 License

ISC

