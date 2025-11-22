import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Background from '../components/Background';
import { authAPI } from '../utils/api';

export default function Signup() {
  const [step, setStep] = useState('signup'); // 'signup' or 'otp'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { showToast, login } = useApp();
  const navigate = useNavigate();

  // Resend OTP cooldown timer
  const startResendCooldown = () => {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prevent duplicate submissions
    if (loading) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      console.log('[SIGNUP] Attempting signup:', { name, email: email.substring(0, 5) + '...' });
      const response = await authAPI.signup(name, email, password);
      console.log('[SIGNUP] Response:', response);
      
      if (response && response.ok === true) {
        setStep('otp');
        showToast('OTP sent to your email', 'success');
        startResendCooldown();
      } else {
        const errorMsg = response?.error || response?.message || 'Signup failed';
        console.error('[SIGNUP] Failed:', errorMsg);
        setErrors({ submit: errorMsg });
        showToast(errorMsg, 'error');
      }
    } catch (error) {
      console.error('[SIGNUP] Error:', error);
      let errorMessage = 'Signup failed. Please try again.';
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.error || error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Cannot connect to server. Please check if the server is running.';
      } else {
        // Something else
        errorMessage = error.message || 'Signup failed. Please try again.';
      }
      
      setErrors({ submit: errorMessage });
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!otp || otp.length !== 6) {
      newErrors.otp = 'Please enter a valid 6-digit OTP';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Normalize inputs before sending
    const normalizedEmail = (email || '').toLowerCase().trim();
    const normalizedOtp = String(otp || '').trim();

    if (!normalizedEmail || !normalizedOtp) {
      setErrors({ otp: 'Email and OTP are required' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Debug logging (remove in production)
      console.log('[FRONTEND] Verifying OTP:', { email: normalizedEmail, otp: normalizedOtp });

      const response = await authAPI.verifyOTP(normalizedEmail, normalizedOtp, 'signup');
      
      // Debug logging
      console.log('[FRONTEND] Verify OTP Response:', response);

      // Check if response indicates success
      if (response && response.ok === true) {
        // Store token and user data
        if (response.token) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
        }
        
        showToast('Email verified successfully!', 'success');
        
        // Update AppContext if token provided
        if (response.token && response.user) {
          login(response.user);
        }
        
        // Redirect to dashboard (Inventory Dashboard)
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        // Handle specific error codes from backend
        let errorMessage = 'Invalid OTP';
        if (response?.error === 'invalid_otp') {
          errorMessage = 'Invalid OTP. Please check and try again.';
        } else if (response?.error === 'otp_expired') {
          errorMessage = 'OTP has expired. Please request a new one.';
        } else {
          errorMessage = response?.error || response?.message || 'Invalid OTP';
        }
        console.error('[FRONTEND] OTP verification failed:', errorMessage);
        setErrors({ otp: errorMessage });
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      // Handle axios errors with specific error codes
      console.error('[FRONTEND] OTP verification error:', error);
      console.error('[FRONTEND] Error response:', error.response?.data);
      
      const backendError = error.response?.data?.error;
      const backendMessage = error.response?.data?.message;
      let errorMessage = 'Verification failed. Please try again.';
      
      if (backendError === 'invalid_otp') {
        errorMessage = 'Invalid OTP. Please check and try again.';
      } else if (backendError === 'otp_expired') {
        errorMessage = 'OTP has expired. Please request a new one.';
      } else if (backendMessage) {
        errorMessage = backendMessage;
      } else if (backendError) {
        errorMessage = backendError;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrors({ otp: errorMessage });
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    try {
      const response = await authAPI.resendOTP(email);
      if (response.ok) {
        showToast('OTP resent to your email', 'success');
        startResendCooldown();
      } else {
        showToast(response.error || 'Failed to resend OTP', 'error');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to resend OTP';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <Background />
        <div className="relative w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-lg font-medium mb-4">
                SM
              </div>
              <h1 className="text-2xl font-semibold text-slate-50 mb-2">Verify Your Email</h1>
              <p className="text-sm text-slate-400">
                We've sent a 6-digit code to <span className="text-indigo-400">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <Input
                label="Enter OTP"
                type="text"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                  setErrors({ ...errors, otp: '' });
                }}
                error={errors.otp}
                placeholder="000000"
                maxLength={6}
                required
                className="text-center text-2xl tracking-widest font-mono"
              />

              <Button 
                type="submit" 
                variant="primary" 
                className="w-full"
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Didn't receive the code?{' '}
                <button
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0}
                  className="text-indigo-400 hover:text-indigo-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </p>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setStep('signup')}
                className="text-sm text-slate-400 hover:text-slate-300"
              >
                ← Back to signup
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <Background />
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-lg font-medium mb-4">
              SM
            </div>
            <h1 className="text-2xl font-semibold text-slate-50 mb-2">StockMaster</h1>
            <p className="text-sm text-slate-400">Create your account</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors({ ...errors, name: '' });
              }}
              error={errors.name}
              placeholder="John Doe"
              required
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors({ ...errors, email: '' });
              }}
              error={errors.email}
              placeholder="you@example.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors({ ...errors, password: '' });
              }}
              error={errors.password}
              placeholder="••••••••"
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors({ ...errors, confirmPassword: '' });
              }}
              error={errors.confirmPassword}
              placeholder="••••••••"
              required
            />

            {errors.submit && (
              <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20">
                <p className="text-xs text-rose-400">{errors.submit}</p>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign up'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

