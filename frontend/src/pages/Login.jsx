import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Background from '../components/Background';
import Modal from '../components/ui/Modal';
import { authAPI } from '../utils/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState('email'); // 'email' or 'otp'
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetErrors, setResetErrors] = useState({});
  const [resetLoading, setResetLoading] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const { login, showToast } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
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
      console.log('[LOGIN] Attempting login:', { email: email.substring(0, 5) + '...' });
      const response = await authAPI.login(email, password);
      console.log('[LOGIN] Response:', response);
      
      if (response && response.ok === true && response.token) {
        // Store token and user data
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Update AppContext
        login(response.user);
        
        showToast('Login successful!', 'success');
        navigate('/dashboard');
      } else {
        const errorMsg = response?.error || response?.message || 'Login failed';
        console.error('[LOGIN] Failed:', errorMsg);
        setErrors({ submit: errorMsg });
        showToast(errorMsg, 'error');
      }
    } catch (error) {
      console.error('[LOGIN] Error:', error);
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.error || error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Cannot connect to server. Please check if the server is running.';
      } else {
        // Something else
        errorMessage = error.message || 'Login failed. Please try again.';
      }
      
      setErrors({ submit: errorMessage });
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (Object.keys(newErrors).length > 0) {
      setResetErrors(newErrors);
      return;
    }

    if (resetLoading) return;

    setResetLoading(true);
    setResetErrors({});

    try {
      const response = await authAPI.forgotPassword(email);
      if (response.ok) {
        showToast('OTP sent to your email', 'success');
        setForgotPasswordStep('otp');
        startResetCooldown();
      } else {
        setResetErrors({ submit: response.error || 'Failed to send OTP' });
        showToast(response.error || 'Failed to send OTP', 'error');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to send OTP. Please try again.';
      setResetErrors({ submit: errorMessage });
      showToast(errorMessage, 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyResetOTP = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!resetOtp || resetOtp.length !== 6) {
      newErrors.otp = 'Please enter a valid 6-digit OTP';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (newPassword !== confirmNewPassword) {
      newErrors.confirmNewPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setResetErrors(newErrors);
      return;
    }

    if (resetLoading) return;

    setResetLoading(true);
    setResetErrors({});

    try {
      const response = await authAPI.verifyResetOTP(email, resetOtp, newPassword);
      if (response.ok) {
        showToast('Password reset successfully!', 'success');
        setShowForgotPassword(false);
        setForgotPasswordStep('email');
        setResetOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setResetErrors({});
      } else {
        setResetErrors({ otp: response.error || 'Invalid OTP' });
        showToast(response.error || 'Invalid OTP', 'error');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Password reset failed. Please try again.';
      setResetErrors({ otp: errorMessage });
      showToast(errorMessage, 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const startResetCooldown = () => {
    setResetCooldown(30);
    const interval = setInterval(() => {
      setResetCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendResetOTP = async () => {
    if (resetCooldown > 0) return;

    setResetLoading(true);
    try {
      const response = await authAPI.forgotPassword(email);
      if (response.ok) {
        showToast('OTP resent to your email', 'success');
        startResetCooldown();
      } else {
        showToast(response.error || 'Failed to resend OTP', 'error');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to resend OTP';
      showToast(errorMessage, 'error');
    } finally {
      setResetLoading(false);
    }
  };

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
            <p className="text-sm text-slate-400">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {errors.submit && (
              <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20">
                <p className="text-xs text-rose-400">{errors.submit}</p>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Forgot password?
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{' '}
              <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotPassword}
        title={forgotPasswordStep === 'email' ? 'Reset Password' : 'Enter OTP & New Password'}
        onClose={() => {
          setShowForgotPassword(false);
          setForgotPasswordStep('email');
          setResetOtp('');
          setNewPassword('');
          setConfirmNewPassword('');
          setResetErrors({});
        }}
      >
        <div>

          {forgotPasswordStep === 'email' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setResetErrors({ ...resetErrors, email: '' });
                }}
                error={resetErrors.email}
                placeholder="you@example.com"
                required
              />

              {resetErrors.submit && (
                <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20">
                  <p className="text-xs text-rose-400">{resetErrors.submit}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={resetLoading}>
                  {resetLoading ? 'Sending...' : 'Send OTP'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyResetOTP} className="space-y-4">
              <Input
                label="Enter OTP"
                type="text"
                value={resetOtp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setResetOtp(value);
                  setResetErrors({ ...resetErrors, otp: '' });
                }}
                error={resetErrors.otp}
                placeholder="000000"
                maxLength={6}
                required
                className="text-center text-2xl tracking-widest font-mono"
              />

              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setResetErrors({ ...resetErrors, newPassword: '' });
                }}
                error={resetErrors.newPassword}
                placeholder="••••••••"
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => {
                  setConfirmNewPassword(e.target.value);
                  setResetErrors({ ...resetErrors, confirmNewPassword: '' });
                }}
                error={resetErrors.confirmNewPassword}
                placeholder="••••••••"
                required
              />

              <div className="text-center">
                <p className="text-sm text-slate-400">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendResetOTP}
                    disabled={resetCooldown > 0}
                    className="text-indigo-400 hover:text-indigo-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetCooldown > 0 ? `Resend in ${resetCooldown}s` : 'Resend OTP'}
                  </button>
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setForgotPasswordStep('email');
                    setResetOtp('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setResetErrors({});
                  }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={resetLoading || resetOtp.length !== 6 || !newPassword || newPassword !== confirmNewPassword}
                >
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}

