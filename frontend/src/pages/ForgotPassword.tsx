import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Mail, ArrowLeft, SendHorizonal, CheckCircle2 } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);

    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <Mail className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-white">Forgot Password</h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Enter your account email address and we'll send you a secure reset link via Brevo.
          </p>
        </div>

        {sent ? (
          /* Success State */
          <div className="glass-card rounded-2xl p-8 border border-emerald-200 dark:border-emerald-500/20 text-center space-y-4">
            <div className="h-14 w-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">Check Your Email!</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                If an account with <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">{email}</span> exists, we've sent a password reset link. Check your inbox (and spam folder).
              </p>
              <p className="text-[10px] text-slate-400 dark:text-gray-500">The link expires in 1 hour.</p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
            </Link>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 border border-slate-200 dark:border-white/5 space-y-5">
            {error && (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl px-4 py-3 text-xs text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <label className="text-slate-500 dark:text-gray-400 font-medium">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-400 dark:focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-brand-900 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all font-display uppercase tracking-wide"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-brand-900 border-t-transparent animate-spin rounded-full" />
              ) : (
                <><SendHorizonal className="h-4 w-4" /> Send Reset Link</>
              )}
            </button>

            <div className="text-center pt-1">
              <Link to="/login" className="text-xs text-slate-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center justify-center gap-1.5 transition-colors">
                <ArrowLeft className="h-3 w-3" /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
