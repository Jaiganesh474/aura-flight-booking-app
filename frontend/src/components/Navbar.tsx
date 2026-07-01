import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LogOut, User as UserIcon, LayoutDashboard, Briefcase, Sun, Moon,
  AlertTriangle, Sparkles, Settings, Key, Trash2, Smartphone, Mail,
  ShieldAlert, Lock, X, ShieldX, UserCheck, Plane, Mic
} from 'lucide-react';
import api from '../services/api';

const Navbar: React.FC = () => {
  const { user, logout, theme, toggleTheme, setSearchQuery } = useApp();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [smartQuery, setSmartQuery] = useState('');
  const [smartSearching, setSmartSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // AI Suggestions states
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const history = localStorage.getItem('recentFlightSearches');
    if (history) {
      try {
        setRecentSearches(JSON.parse(history));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveSearchToHistory = (queryStr: string) => {
    const trimmed = queryStr.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      localStorage.setItem('recentFlightSearches', JSON.stringify(updated));
      return updated;
    });
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice Recognition is not supported in this browser. Try Chrome or Edge!");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      // Strip trailing period if added by speech engine
      const cleanText = transcript.endsWith('.') ? transcript.slice(0, -1) : transcript;
      setSmartQuery(cleanText);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!smartQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSuggestionsLoading(true);
      setShowSuggestions(true);
      try {
        const response = await api.post('/api/chatbot/smart-search', { message: smartQuery });
        setSuggestions(response.data || []);
      } catch (err) {
        console.error("Suggestions fetch error:", err);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [smartQuery]);

  const handleSelectSuggestion = (flight: any) => {
    setShowSuggestions(false);
    saveSearchToHistory(smartQuery || `${flight.sourceAirport.city} to ${flight.destinationAirport.city}`);
    setSmartQuery('');
    
    const matchDate = flight.departureTime.split('T')[0];
    setSearchQuery({
      source: flight.sourceAirport.code,
      destination: flight.destinationAirport.code,
      date: matchDate,
      cabinClass: 'ECONOMY',
    });

    navigate('/search', { state: { smartFlights: [flight] } });
  };

  // Settings Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'deactivate' | 'delete'>('info');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (showSettingsModal && user) {
      fetchAccountInfo();
    }
  }, [showSettingsModal]);

  const fetchAccountInfo = async () => {
    try {
      const res = await api.get('/api/users/me');
      setAccountInfo(res.data);
    } catch (err) {
      console.error('Failed to load user details:', err);
    }
  };

  const handleSmartSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartQuery.trim()) return;

    saveSearchToHistory(smartQuery);

    setSmartSearching(true);
    try {
      const response = await api.post('/api/chatbot/smart-search', { message: smartQuery });
      if (response.data && response.data.length > 0) {
        const match = response.data[0];
        const matchDate = match.departureTime.split('T')[0];

        setSearchQuery({
          source: match.sourceAirport.code,
          destination: match.destinationAirport.code,
          date: matchDate,
          cabinClass: 'ECONOMY',
        });

        setSmartQuery('');
        navigate('/search', { state: { smartFlights: response.data } });
      } else {
        alert("Could not parse coordinates or no matching flights found. Try typing e.g., 'From Chennai to Mumbai under 6000'");
      }
    } catch (err) {
      alert("AI Search offline. Please use the standard search panel on the home page.");
    } finally {
      setSmartSearching(false);
    }
  };

  const handleLogoutClick = () => {
    setShowConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowConfirm(false);
    navigate('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setSettingsMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setSettingsLoading(true);
    setSettingsMessage({ type: '', text: '' });

    try {
      await api.put('/api/users/change-password', { currentPassword, newPassword });
      setSettingsMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password.' });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm("Are you sure you want to deactivate your account? You will be signed out immediately.")) return;

    setSettingsLoading(true);
    try {
      await api.post('/api/users/deactivate');
      setShowSettingsModal(false);
      logout();
      navigate('/login');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate account.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmUser !== user?.username) {
      setSettingsMessage({ type: 'error', text: 'Username verification did not match.' });
      return;
    }

    if (!window.confirm("⚠️ CRITICAL WARNING: This will permanently delete your account, saved traveler profiles, bookings, and flight tickets. This action CANNOT be undone. Proceed?")) return;

    setSettingsLoading(true);
    try {
      await api.delete('/api/users/delete');
      setShowSettingsModal(false);
      logout();
      navigate('/login');
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete account.' });
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <>
      <nav className="glass sticky top-0 z-[100] w-full border-b border-slate-200 dark:border-white/10 px-6 py-4 flex items-center justify-between transition-colors">
        {/* Brand logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/airline_logo.png"
            alt="Aura Airways Logo"
            className="h-10 w-10 object-cover rounded-xl shadow-lg shadow-amber-500/10 group-hover:rotate-6 transition-transform"
          />
          <span className="font-display text-xl font-bold tracking-wider bg-gradient-to-r from-slate-900 dark:from-white to-amber-600 dark:to-amber-500 bg-clip-text text-transparent font-sans">
            AURA AIRWAYS
          </span>
        </Link>

        {/* AI Smart Search */}
        <div ref={searchRef} className="hidden lg:flex items-center flex-1 max-w-md mx-8 relative">
          <form onSubmit={handleSmartSearchSubmit} className="w-full relative">
            <input
              ref={inputRef}
              type="text"
              value={smartQuery}
              onChange={(e) => setSmartQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="🔍 Search 'Chennai to Mumbai under 6000'..."
              disabled={smartSearching}
              className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-full pl-4 pr-20 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-500/80 transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {smartQuery && (
                <button
                  type="button"
                  onClick={() => { setSmartQuery(''); setSuggestions([]); setShowSuggestions(false); inputRef.current?.focus(); }}
                  className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Clear search query"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={startVoiceRecognition}
                className={`${isListening ? 'text-rose-500 animate-pulse bg-rose-500/10 p-1 rounded-full' : 'text-slate-400 hover:text-amber-500'} transition-colors cursor-pointer`}
                title={isListening ? 'Listening... Speak now' : 'Search by Voice'}
              >
                <Mic className="h-3.5 w-3.5" />
              </button>
              {smartSearching ? (
                <span className="h-3.5 w-3.5 border-2 border-amber-500 border-t-transparent animate-spin rounded-full" />
              ) : (
                <button type="submit" className="text-slate-400 hover:text-amber-500 transition-colors cursor-pointer">
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* AI Suggestions Overlay */}
          {showSuggestions && (smartQuery.trim() || recentSearches.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              
              {!smartQuery.trim() && recentSearches.length > 0 ? (
                /* Recent Searches Panel */
                <div className="p-3">
                  <div className="flex items-center justify-between text-[12px] text-slate-700 dark:text-gray-500 uppercase tracking-wider mb-2">
                    <span>Recent Searches</span>
                    <button
                      type="button"
                      onClick={() => { setRecentSearches([]); localStorage.removeItem('recentFlightSearches'); }}
                      className="text-red-400 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100/50 dark:hover:bg-white/[0.02] cursor-pointer group transition-colors"
                      >
                        <div
                          onClick={() => { setSmartQuery(search); setShowSuggestions(true); }}
                          className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 font-medium flex-1 text-left font-sans"
                        >
                          <span className="text-slate-400">🕒</span>
                          <span>{search}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecentSearches(prev => {
                              const updated = prev.filter((_, i) => i !== idx);
                              localStorage.setItem('recentFlightSearches', JSON.stringify(updated));
                              return updated;
                            });
                          }}
                          className="text-[10px] text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer px-2"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Flight Suggestions List */
                <>
                  <div className="p-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wider font-bold bg-slate-50/50 dark:bg-slate-900/50">
                    <span> Suggestions</span>
                    <span className="text-amber-500">Upcoming Schedules</span>
                  </div>
                  
                  {suggestionsLoading ? (
                    <div className="p-6 flex flex-col items-center justify-center gap-3">
                      <span className="h-5 w-5 border-2 border-amber-500 border-t-transparent animate-spin rounded-full" />
                      <span className="text-[10px] text-slate-400">searching...</span>
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 dark:text-gray-500">
                      No flights matching your request found. Try another search.
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                      {suggestions.map((flight) => {
                        const depTime = new Date(flight.departureTime);
                        return (
                          <div
                            key={flight.id}
                            onClick={() => handleSelectSuggestion(flight)}
                            className="p-3.5 flex items-center justify-between hover:bg-slate-100/50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3 text-left">
                              <div className="h-8 w-8 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 shrink-0">
                                <Plane className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white text-xs">
                                  {flight.airline.name} · {flight.flightNumber}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">
                                  {flight.sourceAirport.code} ({flight.sourceAirport.city}) → {flight.destinationAirport.code} ({flight.destinationAirport.city})
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-amber-600 dark:text-amber-500">
                                ₹{flight.baseFare}
                              </p>
                              <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-0.5">
                                {depTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · {depTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/search" className="text-slate-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-500 transition-colors">
            Search Flights
          </Link>
          {user && user.role === 'ROLE_AIRLINE_ADMIN' && (
            <Link to="/admin" className="text-slate-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-500 transition-colors flex items-center gap-1.5">
              <LayoutDashboard className="h-4 w-4" /> Admin Console
            </Link>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-4">
          {/* Sun/Moon Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="glass-light p-2 rounded-xl text-slate-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-500 transition-all cursor-pointer border border-slate-200 dark:border-white/5"
            title={theme === 'light' ? 'Enable Dark Mode' : 'Enable Light Mode'}
          >
            {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 group cursor-pointer focus:outline-none"
                >
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-100 dark:bg-brand-800 border border-slate-200 dark:border-white/10 flex items-center justify-center group-hover:border-amber-600 dark:group-hover:border-amber-500 transition-colors">
                    {user.avatar ? (
                      <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{user.username}</p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 capitalize">{user.role.replace('ROLE_', '').toLowerCase()}</p>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 mt-3 w-56 rounded-2xl glass-card border border-slate-200 dark:border-white/10 shadow-2xl p-2 space-y-1 text-xs z-50 text-left">
                    <Link
                      to="/profile"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl hover:bg-amber-500/10 hover:text-amber-500 text-slate-700 dark:text-gray-300 transition-colors"
                    >
                      <UserIcon className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      to="/my-trips"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl hover:bg-amber-500/10 hover:text-amber-500 text-slate-700 dark:text-gray-300 transition-colors"
                    >
                      <Briefcase className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                      <span>My Trips</span>
                    </Link>

                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setShowSettingsModal(true);
                        setActiveTab('info');
                        setSettingsMessage({ type: '', text: '' });
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl hover:bg-amber-500/10 hover:text-amber-500 text-slate-700 dark:text-gray-300 transition-colors cursor-pointer text-left"
                    >
                      <Settings className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                      <span>Account Settings</span>
                    </button>

                    <div className="border-t border-slate-200 dark:border-white/5 my-1" />

                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        handleLogoutClick();
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-left font-semibold"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white px-4 py-2 transition-colors">
                Login
              </Link>
              <Link
                to="/register"
                className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-xl transition-all shadow-md shadow-amber-500/10"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Confirmation Sign Out Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl space-y-4 text-center text-slate-800 dark:text-gray-100">
            <div className="h-12 w-12 bg-rose-500/10 text-rose-600 dark:text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Confirm Sign Out</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Are you sure you want to end your active boarding session? You will need to re-authenticate to book tickets.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-gray-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition-colors shadow-md shadow-rose-500/15 cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Account Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[420px] text-left text-slate-800 dark:text-gray-100">
            
            {/* Modal Sidebar Tab List */}
            <div className="w-full md:w-48 bg-slate-100/50 dark:bg-slate-950/40 p-4 border-r border-slate-200 dark:border-white/5 flex flex-row md:flex-col gap-1 overflow-x-auto shrink-0 md:justify-start">
              <button
                onClick={() => { setActiveTab('info'); setSettingsMessage({ type: '', text: '' }); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold w-full whitespace-nowrap cursor-pointer transition-colors ${
                  activeTab === 'info'
                    ? 'bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/5'
                }`}
              >
                <UserCheck className="h-4 w-4 shrink-0" />
                <span>Account Info</span>
              </button>

              <button
                onClick={() => { setActiveTab('password'); setSettingsMessage({ type: '', text: '' }); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold w-full whitespace-nowrap cursor-pointer transition-colors ${
                  activeTab === 'password'
                    ? 'bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/5'
                }`}
              >
                <Key className="h-4 w-4 shrink-0" />
                <span>Change Password</span>
              </button>

              <button
                onClick={() => { setActiveTab('deactivate'); setSettingsMessage({ type: '', text: '' }); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold w-full whitespace-nowrap cursor-pointer transition-colors ${
                  activeTab === 'deactivate'
                    ? 'bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/5'
                }`}
              >
                <ShieldX className="h-4 w-4 shrink-0" />
                <span>Deactivate Account</span>
              </button>

              <button
                onClick={() => { setActiveTab('delete'); setSettingsMessage({ type: '', text: '' }); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold w-full whitespace-nowrap cursor-pointer transition-colors ${
                  activeTab === 'delete'
                    ? 'bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/5'
                }`}
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                <span>Delete Account</span>
              </button>
            </div>

            {/* Tab Contents Panel */}
            <div className="flex-1 p-6 relative flex flex-col justify-between overflow-y-auto">
              
              {/* Close Button */}
              <button
                onClick={() => setShowSettingsModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-4">
                {/* Tab: Account Info */}
                {activeTab === 'info' && (
                  <div className="space-y-3">
                    <h3 className="font-display font-extrabold text-slate-900 dark:text-white text-base">Account Information</h3>
                    <p className="text-[10px] text-slate-400 dark:text-gray-400">Review your authenticated profile details securely.</p>
                    
                    {accountInfo ? (
                      <div className="space-y-3 pt-2 text-xs">
                        <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/50 dark:border-white/5">
                          <UserIcon className="h-4 w-4 text-amber-500 shrink-0" />
                          <div>
                            <p className="text-[9px] text-slate-400 dark:text-gray-500 font-semibold leading-none">USERNAME</p>
                            <p className="font-bold text-slate-900 dark:text-white mt-1">{accountInfo.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/50 dark:border-white/5">
                          <Mail className="h-4 w-4 text-amber-500 shrink-0" />
                          <div>
                            <p className="text-[9px] text-slate-400 dark:text-gray-500 font-semibold leading-none">EMAIL ADDRESS</p>
                            <p className="font-bold text-slate-900 dark:text-white mt-1">{accountInfo.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/50 dark:border-white/5">
                          <Smartphone className="h-4 w-4 text-amber-500 shrink-0" />
                          <div>
                            <p className="text-[9px] text-slate-400 dark:text-gray-500 font-semibold leading-none">CONTACT PHONE</p>
                            <p className="font-bold text-slate-900 dark:text-white mt-1">{accountInfo.phone || 'Not Provided'}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-24 flex items-center justify-center text-xs text-slate-400 dark:text-gray-500 animate-pulse">Loading profile specs...</div>
                    )}
                  </div>
                )}

                {/* Tab: Change Password */}
                {activeTab === 'password' && (
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <h3 className="font-display font-extrabold text-slate-900 dark:text-white text-base">Change Password</h3>
                    <p className="text-[10px] text-slate-400 dark:text-gray-400">Secure your account credentials regularly.</p>
                    
                    <div className="space-y-2 text-xs">
                      <div className="space-y-1">
                        <label className="text-slate-500 dark:text-gray-400">Current Password</label>
                        <input
                          type="password"
                          required
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-slate-500 dark:text-gray-400">New Password</label>
                          <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-500 dark:text-gray-400">Confirm Password</label>
                          <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={settingsLoading}
                      className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-amber-500/10"
                    >
                      {settingsLoading ? 'Updating...' : 'Save New Password'}
                    </button>
                  </form>
                )}

                {/* Tab: Deactivate Account */}
                {activeTab === 'deactivate' && (
                  <div className="space-y-4">
                    <h3 className="font-display font-extrabold text-slate-900 dark:text-white text-base">Deactivate Account</h3>
                    <p className="text-[10px] text-slate-400 dark:text-gray-400">Temporarily freeze your account. You can reactivate it later by logging in.</p>
                    
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 text-[10px] text-amber-800 dark:text-amber-400 leading-relaxed space-y-1">
                      <p className="font-bold flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Deactivation Policy</p>
                      <p>• Your profile, saved passenger lists, and booking invoices will be frozen safely.</p>
                      <p>• You will be logged out of this session immediately.</p>
                      <p>• Logging back in with your credentials at any time will reactivate your profile automatically.</p>
                    </div>

                    <button
                      onClick={handleDeactivate}
                      disabled={settingsLoading}
                      className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                    >
                      {settingsLoading ? 'Deactivating...' : 'Yes, Deactivate Account'}
                    </button>
                  </div>
                )}

                {/* Tab: Delete Account */}
                {activeTab === 'delete' && (
                  <form onSubmit={handleDeleteAccount} className="space-y-4">
                    <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-base">Delete Account Permanently</h3>
                    <p className="text-[10px] text-slate-800 dark:text-gray-400">This action will destroy all account files. There is no recovery option.</p>
                    
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed space-y-1">
                      <p className="font-bold flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> Irreversible Process</p>
                      <p>• All your future flight tickets and bookings will be cancelled.</p>
                      <p>• Saved traveler records, histories, and reset tokens will be erased from the database.</p>
                      <p>• This action is permanent and cannot be rolled back or undone.</p>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <label className="text-slate-500 dark:text-gray-400">
                        Type your username <strong className="text-slate-800 dark:text-white font-mono">"{user?.username}"</strong> to verify deletion:
                      </label>
                      <input
                        type="text"
                        required
                        value={deleteConfirmUser}
                        onChange={e => setDeleteConfirmUser(e.target.value)}
                        placeholder="Type username here..."
                        className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={settingsLoading || deleteConfirmUser !== user?.username}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-amber-600/10"
                    >
                      {settingsLoading ? 'Deleting Account...' : 'Permanently Delete My Account'}
                    </button>
                  </form>
                )}
              </div>

              {/* Status Message Display */}
              {settingsMessage.text && (
                <div className={`mt-2 p-2.5 rounded-xl text-[10px] font-bold border ${
                  settingsMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                }`}>
                  {settingsMessage.text}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
