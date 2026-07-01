import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { LogIn, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isInactive = searchParams.get('inactive') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', { username, password });
      login(response.data);
      
      // Route based on role
      if (response.data.role === 'ROLE_AIRLINE_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid username or password credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12 text-slate-800 dark:text-gray-100">
      <div className="glass-card rounded-3xl p-8 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
            <LogIn className="h-6 w-6 text-amber-600 dark:text-amber-500" />
          </div>
          <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">Login to Aura</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400">Enter your credentials to book flights and manage profiles</p>
        </div>

        {isInactive && (
          <div className="bg-amber-500/15 border border-amber-500/25 p-3.5 rounded-xl text-center text-xs text-amber-700 dark:text-amber-400 font-semibold space-y-1">
            <p>You have been signed out due to inactivity.</p>
            <p className="text-[10px] font-normal text-slate-500 dark:text-gray-400">Please login again to access your account.</p>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/15 border border-rose-500/25 p-3 rounded-xl text-center text-xs text-rose-500 dark:text-rose-400">
            {error}
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
              placeholder="e.g. passenger"
              className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-amber-600 dark:focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-500 dark:text-gray-400 font-semibold">Password</label>
              <Link
                to="/forgot-password"
                className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-55 text-white font-semibold py-3 rounded-xl transition-all shadow-lg text-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? "Verifying..." : "Login"}
          </button>
        </form>

        <div className="text-center text-[11px] text-slate-500 dark:text-gray-400 pt-2 border-t border-slate-200 dark:border-white/5 space-y-2">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="text-amber-600 dark:text-amber-500 hover:underline">
              Create an account
            </Link>
          </p>
          <div className="bg-slate-100 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 text-[9px] text-slate-600 dark:text-gray-500 font-mono">
            💡 Format of logins:<br/>
            Passenger: <span className="text-amber-600 dark:text-amber-500/80">passenger</span> / password<br/>
            Airline Admin: <span className="text-amber-600 dark:text-amber-500/80">admin</span> / password
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
