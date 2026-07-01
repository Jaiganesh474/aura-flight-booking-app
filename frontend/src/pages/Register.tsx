import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('ROLE_PASSENGER');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      await api.post('/api/auth/register', {
        username,
        email,
        password,
        phone,
        role,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Username or email might already be registered.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12 text-slate-800 dark:text-gray-100">
      <div className="glass-card rounded-3xl p-8 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
            <UserPlus className="h-6 w-6 text-amber-600 dark:text-amber-500" />
          </div>
          <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">Create Account</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400">Sign up to reserve airline tickets with dynamic pricing</p>
        </div>

        {error && (
          <div className="bg-rose-500/15 border border-rose-500/25 p-3 rounded-xl text-center text-xs text-rose-500 dark:text-rose-400">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/15 border border-emerald-500/25 p-3 rounded-xl text-center text-xs text-emerald-500 dark:text-emerald-400">
            Registration successful! Redirecting to login...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-gray-400 font-semibold">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. rahul123"
              className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-amber-600 dark:focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-gray-400 font-semibold">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rahul@gmail.com"
              className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-amber-600 dark:focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-gray-400 font-semibold">Password</label>
            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl pl-3 pr-10 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-amber-600 dark:focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-gray-400 font-semibold">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-amber-600 dark:focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-gray-400 font-semibold">Account Role Type</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="ROLE_PASSENGER" className="text-slate-900">Passenger</option>
              <option value="ROLE_AIRLINE_ADMIN" className="text-slate-900">Airline Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-55 text-brand-900 font-bold py-3 rounded-xl transition-all shadow-lg text-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? "Registering..." : "Register Account"}
          </button>
        </form>

        <div className="text-center text-[11px] text-slate-500 dark:text-gray-400 pt-2 border-t border-slate-200 dark:border-white/5">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-600 dark:text-amber-500 hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
