import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="glass-card rounded-2xl p-8 max-w-sm text-center space-y-4 border border-rose-200 dark:border-rose-500/20">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="font-display font-bold text-slate-900 dark:text-white">Invalid Reset Link</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400">This password reset link is missing or invalid. Please request a new one.</p>
          <Link to="/forgot-password" className="inline-block bg-amber-500 hover:bg-amber-600 text-brand-900 font-bold px-6 py-2.5 rounded-xl text-xs">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-rose-500', 'bg-amber-400', 'bg-emerald-500'];

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-white">Reset Password</h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">Enter your new password below.</p>
        </div>

        {success ? (
          <div className="glass-card rounded-2xl p-8 border border-emerald-200 dark:border-emerald-500/20 text-center space-y-4">
            <div className="h-14 w-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">Password Reset!</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Your password has been updated successfully. Redirecting you to login in 3 seconds…
            </p>
            <Link to="/login" className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
              Go to Login Now →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 border border-slate-200 dark:border-white/5 space-y-5">
            {error && (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl px-4 py-3 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {error}
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5 text-xs">
              <label className="text-slate-500 dark:text-gray-400 font-medium">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-400 dark:focus:border-amber-500 transition-colors"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor[strength] : 'bg-slate-200 dark:bg-white/10'}`} />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500">Strength: <span className="font-semibold">{strengthLabel[strength]}</span></p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5 text-xs">
              <label className="text-slate-500 dark:text-gray-400 font-medium">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-500" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className={`w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-950/80 border rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none transition-colors ${
                    confirmPassword && password !== confirmPassword
                      ? 'border-rose-400 dark:border-rose-500'
                      : 'border-slate-200 dark:border-white/10 focus:border-amber-400 dark:focus:border-amber-500'
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-rose-500">Passwords do not match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (confirmPassword.length > 0 && password !== confirmPassword)}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-brand-900 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all font-display uppercase tracking-wide"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-brand-900 border-t-transparent animate-spin rounded-full" />
              ) : (
                <><Lock className="h-4 w-4" /> Reset Password</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
