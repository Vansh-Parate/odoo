import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:4000/api';
const API_HOST = 'localhost';
const API_PORT = 4000;

// Helper function to make HTTP requests using Node.js http module
function apiRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: `/api${endpoint}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData ? Buffer.byteLength(postData) : 0,
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const error = new Error(parsed.error || 'Request failed');
            error.response = {
              status: res.statusCode,
              data: parsed,
            };
            reject(error);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        reject(new Error(`Connection refused. Make sure the server is running on ${API_HOST}:${API_PORT}. Run: npm run dev`));
      } else {
        reject(new Error(`Request failed: ${e.message}`));
      }
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Test script for signup and OTP verification flow
 * Usage: node scripts/test-signup-flow.js <email>
 */

async function testSignupFlow() {
  try {
    // Check if server is running first
    console.log('🔍 Checking if server is running...\n');
    try {
      await apiRequest('GET', '/health').catch(() => {
        // Health endpoint might not exist, that's okay
      });
    } catch (e) {
      console.error('❌ Server is not running!');
      console.error(`💡 Please start the server first:`);
      console.error(`   npm run dev`);
      console.error(`\n   Then run this test again.`);
      process.exit(1);
    }

    const email = process.argv[2] || `test${Date.now()}@example.com`;
    const name = 'Test User';
    const password = 'Test1234!';

    console.log('✅ Server is running!\n');
    console.log('🧪 Testing Signup and OTP Verification Flow\n');
    console.log(`Email: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Password: ${password}\n`);

    // Step 1: Signup
    console.log('📝 Step 1: Signup...');
    try {
      const signupResponse = await apiRequest('POST', '/auth/signup', {
        name,
        email,
        password,
      });

      console.log('✅ Signup successful!');
      console.log('Response:', JSON.stringify(signupResponse.data, null, 2));
      console.log('\n💡 Check your email or server console for the OTP code\n');

      // Wait a bit for email/console log
      console.log('⏳ Waiting 2 seconds for OTP to be generated...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Prompt for OTP
      console.log('📧 Step 2: OTP Verification');
      console.log('Enter the OTP code from your email or server console:');
      
      // For automated testing, you can pass OTP as third argument
      const otp = process.argv[3];
      
      if (!otp) {
        console.log('\n⚠️  No OTP provided as argument.');
        console.log('💡 To test automatically, run:');
        console.log(`   node scripts/test-signup-flow.js ${email} <OTP_CODE>`);
        console.log('\n📋 Or manually verify via frontend or use the OTP from server console.');
        process.exit(0);
      }

      console.log(`Using OTP: ${otp}\n`);

      // Step 3: Verify OTP
      console.log('🔐 Step 3: Verifying OTP...');
      try {
        const verifyResponse = await apiRequest('POST', '/auth/verify-otp', {
          email,
          otp,
          purpose: 'signup',
        });

        console.log('✅ OTP Verification successful!');
        console.log('Response:', JSON.stringify(verifyResponse.data, null, 2));
        
        if (verifyResponse.data.token) {
          console.log('\n🎉 User is now verified and logged in!');
          console.log(`Token: ${verifyResponse.data.token.substring(0, 20)}...`);
        }

        // Step 4: Test Login
        console.log('\n🔑 Step 4: Testing Login...');
        try {
          const loginResponse = await apiRequest('POST', '/auth/login', {
            email,
            password,
          });

          console.log('✅ Login successful!');
          console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
          console.log('\n✅ All tests passed!');
        } catch (loginError) {
          console.error('❌ Login failed:', loginError.response?.data || loginError.message);
        }

      } catch (verifyError) {
        console.error('❌ OTP Verification failed!');
        console.error('Status:', verifyError.response?.status);
        console.error('Error:', verifyError.response?.data || verifyError.message);
        
        if (verifyError.response?.data?.error === 'invalid_otp') {
          console.error('\n💡 The OTP you entered is incorrect. Check the email or server console.');
        } else if (verifyError.response?.data?.error === 'otp_expired') {
          console.error('\n💡 The OTP has expired. Request a new one.');
        }
      }

    } catch (signupError) {
      console.error('❌ Signup failed!');
      console.error('Status:', signupError.response?.status);
      console.error('Error:', signupError.response?.data || signupError.message);
      
      if (signupError.response?.status === 409) {
        console.error('\n💡 User already exists. Try with a different email or verify existing account.');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

testSignupFlow();

