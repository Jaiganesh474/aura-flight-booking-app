import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { ShieldCheck, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', { username, password });
      
      // Enforce only Admin roles can access
      if (response.data.role !== 'ROLE_AIRLINE_ADMIN') {
        setError("Access Denied: Passenger accounts do not have administrator permissions.");
        setLoading(false);
        return;
      }

      login(response.data);
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid admin credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-slate-800 dark:text-gray-100">
      
      <div className="glass-card rounded-3xl p-8 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-4">
          <Link to="/" className="text-slate-500 hover:text-amber-500 flex items-center gap-1 text-[11px] font-medium transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Passenger Site
          </Link>
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            Secure Portal
          </span>
        </div>

        <div className="text-center space-y-2">
          <div className="h-12 w-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
            <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-500" />
          </div>
          <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">Admin Console</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400">Authorized staff and airline administrators only</p>
        </div>

        {error && (
          <div className="bg-rose-500/15 border border-rose-500/25 p-3 rounded-xl text-center text-xs text-rose-500 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-gray-400 font-semibold">Admin Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-55 text-white font-semibold py-3 rounded-xl transition-all shadow-lg text-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? "Authorizing..." : "Access Dashboard"}
          </button>
        </form>

        <div className="bg-slate-100 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-white/5 text-[9px] text-slate-600 dark:text-gray-500 font-mono text-center">
          🔑 Admin Demo Credentials:<br/>
          Username: <span className="text-amber-600 dark:text-amber-500">admin</span> / Password: <span className="text-amber-600 dark:text-amber-500">password</span>
        </div>

      </div>
    </div>
  );
};

export default AdminLogin;
