import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { Search, Sparkles, MapPin, Calendar, Compass, Star, Percent, ArrowLeftRight, Ticket, ShieldCheck, Shield, Headphones, Coins, Activity } from 'lucide-react';

interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

const Home: React.FC = () => {
  const { searchQuery, setSearchQuery } = useApp();
  const navigate = useNavigate();

  const [airports, setAirports] = useState<Airport[]>([]);
  const [source, setSource] = useState(searchQuery.source);
  const [destination, setDestination] = useState(searchQuery.destination);
  const [date, setDate] = useState(searchQuery.date);
  const [cabinClass, setCabinClass] = useState(searchQuery.cabinClass);
  const [coupons, setCoupons] = useState<any[]>([]);

  // Custom Overlay states
  const [showFromOverlay, setShowFromOverlay] = useState(false);
  const [showToOverlay, setShowToOverlay] = useState(false);
  const [fromSearchQuery, setFromSearchQuery] = useState('');
  const [toSearchQuery, setToSearchQuery] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string>('');

  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const fromSearchTimeout = useRef<any>(null);
  const toSearchTimeout = useRef<any>(null);

  const fetchAiAirports = async (query: string) => {
    if (query.trim().length < 3) return;
    try {
      const res = await api.get(`/api/chatbot/search-airport`, { params: { query } });
      const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      if (Array.isArray(parsed) && parsed.length > 0) {
        setAirports(prev => {
          const combined = [...parsed, ...prev];
          const unique = Array.from(new Map(combined.map(item => [item.code, item])).values());
          return unique;
        });
      }
    } catch (err) {
      console.error("Passenger AI airport search error", err);
    }
  };

  const handleDateClick = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
        dateInputRef.current.click();
      }
    }
  };

  useEffect(() => {
    // Fetch airports list
    api.get('/api/airports')
      .then(res => setAirports(res.data))
      .catch(err => console.error(err));

    const todayStr = new Date().toISOString().split('T')[0];
    // Fetch AI insights from the chatbot service based on current database
    api.post('/api/chatbot/chat', { 
      message: `Give a very brief 1-sentence highlight of available routes and cheapest prices from the database for upcoming flights starting from today (${todayStr}) onwards. Do not use any markdown formatting symbols like asterisks (*) or bolding (**); provide clean, plain text only.` 
    })
      .then(res => {
        if (res.data && res.data.reply) {
          const cleanText = res.data.reply.replace(/\*\*/g, '').replace(/\*/g, '');
          setAiSuggestions(cleanText);
        }
      })
      .catch(err => console.error(err));

    // Fetch dynamic active coupons list with automatic 5-second polling
    const fetchCoupons = () => {
      api.get('/api/coupons')
        .then(res => setCoupons(res.data))
        .catch(err => console.error(err));
    };

    fetchCoupons();
    const interval = setInterval(fetchCoupons, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) {
        setShowFromOverlay(false);
      }
      if (toRef.current && !toRef.current.contains(e.target as Node)) {
        setShowToOverlay(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const swapCities = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
  };

  const handleStandardSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !destination) {
      alert("Please select both Source and Destination airports.");
      return;
    }
    if (source === destination) {
      alert("Source and Destination airports cannot be the same. Please choose a different route.");
      return;
    }
    setSearchQuery({ source, destination, date, cabinClass });
    navigate('/search');
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const getAirportDetails = (code: string) => {
    if (!code) return { city: 'Choose Airport', name: 'Select airport location' };
    const ap = airports.find(a => a.code === code);
    return ap ? { city: ap.city, name: ap.name } : { city: code, name: 'Airport Hub' };
  };

  const filteredFromAirports = airports.filter(ap => 
    ap.code !== destination && (
      ap.city.toLowerCase().includes(fromSearchQuery.toLowerCase()) ||
      ap.code.toLowerCase().includes(fromSearchQuery.toLowerCase()) ||
      ap.name.toLowerCase().includes(fromSearchQuery.toLowerCase())
    )
  );

  const filteredToAirports = airports.filter(ap => 
    ap.code !== source && (
      ap.city.toLowerCase().includes(toSearchQuery.toLowerCase()) ||
      ap.code.toLowerCase().includes(toSearchQuery.toLowerCase()) ||
      ap.name.toLowerCase().includes(toSearchQuery.toLowerCase())
    )
  );

  return (
    <div className="flex-1 w-full pb-16 space-y-12 text-slate-800 dark:text-gray-100">
      {/* Hero Banner Area */}
      <div 
        className="relative h-[480px] w-full flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(rgba(3, 7, 18, 0.4), rgba(3, 7, 18, 0.9)), url('/airline_hero_bg.png')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 dark:from-slate-950 via-slate-950/20 to-transparent"></div>
        
        <div className="relative z-10 max-w-4xl px-6 text-center space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
            <Sparkles className="h-3.5 w-3.5" /> Luxury Reimagined
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-white leading-none">
            Escape to Your Next <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600">
              Dream Destination
            </span>
          </h1>
          <p className="max-w-xl mx-auto text-sm md:text-base text-gray-300">
            Search scheduled premium flights across tier-1 airports with automated seat map customizers.
          </p>
        </div>
      </div>

      {/* Main Console Section */}
      <div className="max-w-6xl mx-auto px-6 -mt-28 relative z-20 space-y-6">

        {/* Standard Search Panel */}
        <form onSubmit={handleStandardSearch} className="glass-card rounded-3xl p-6 md:p-8 space-y-6 border border-slate-200 dark:border-white/10 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Search className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              <h3 className="font-display font-bold text-base">Book Flights</h3>
            </div>
            
            {/* Cabin Class Selection */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-gray-400 font-medium">Cabin Class:</span>
              <select
                value={cabinClass}
                onChange={(e) => setCabinClass(e.target.value)}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg px-2.5 py-1 text-slate-800 dark:text-gray-200 focus:outline-none"
              >
                <option value="ECONOMY">Economy</option>
                <option value="PREMIUM_ECONOMY">Premium Economy</option>
                <option value="BUSINESS">Business</option>
                <option value="FIRST">First Class</option>
              </select>
            </div>
          </div>

          {/* AI Banner inside search card */}
          {aiSuggestions && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5 transition-all">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-bold">Aura AI Insights: </span>
                <span>{aiSuggestions}</span>
              </div>
            </div>
          )}

          {/* IRCTC-style Grid Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 lg:gap-0 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-2xl md:rounded-3xl overflow-visible shadow-md">
            
            {/* FROM Field */}
            <div ref={fromRef} className="lg:col-span-4 p-4 relative border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 hover:bg-amber-100/40 dark:hover:bg-white/5 transition-colors cursor-pointer rounded-t-2xl md:rounded-l-3xl lg:rounded-r-none">
              <div onClick={() => { setShowFromOverlay(true); setShowToOverlay(false); }} className="space-y-1">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-700 dark:text-gray-500 flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-amber-500" /> From
                </div>
                <div className="font-display font-semibold text-lg text-slate-800 dark:text-white">
                  {source ? `${getAirportDetails(source).city} (${source})` : 'Choose Departure'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-gray-400 truncate max-w-xs">
                  {source ? getAirportDetails(source).name : 'Select departure airport'}
                </div>
              </div>

              {/* From Overlay */}
              {showFromOverlay && (
                <div className="absolute left-0 right-0 lg:left-0 top-[102%] mt-1 w-full lg:w-[320px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-3 space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <input
                    type="text"
                    placeholder="Search city or airport..."
                    value={fromSearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFromSearchQuery(val);
                      if (fromSearchTimeout.current) {
                        clearTimeout(fromSearchTimeout.current);
                      }
                      if (val.trim().length >= 3) {
                        fromSearchTimeout.current = setTimeout(() => {
                          fetchAiAirports(val);
                        }, 600);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400 dark:text-gray-500 px-2 py-1">Available Airports</div>
                    {filteredFromAirports.length > 0 ? (
                      filteredFromAirports.map(ap => (
                        <button
                          type="button"
                          key={ap.code}
                          onClick={() => {
                            setSource(ap.code);
                            setShowFromOverlay(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-amber-500/10 hover:text-amber-500 transition-colors flex items-center gap-2.5 cursor-pointer text-xs"
                        >
                          <div className="h-7 w-7 shrink-0 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center font-mono font-bold text-amber-600 dark:text-amber-500 text-[10px]">
                            {ap.code}
                          </div>
                          <div className="truncate">
                            <div className="font-semibold text-slate-900 dark:text-white text-[11px]">{ap.city}</div>
                            <div className="text-[9px] text-slate-500 dark:text-gray-400 truncate">{ap.name}</div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-[10px] text-slate-400 dark:text-gray-500 p-2">No airports found</div>
                    )}
                  </div>
                </div>
              )}

              {/* SWAP Button embedded on absolute border overlay */}
              <div className="absolute right-1/2 translate-x-1/2 bottom-0 translate-y-1/2 lg:right-0 lg:left-auto lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-1/2 z-30">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    swapCities();
                  }}
                  className="w-8 h-8 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 hover:border-amber-500 dark:hover:border-amber-500 text-slate-500 dark:text-gray-400 hover:text-amber-500 transition-all flex items-center justify-center shadow-md cursor-pointer focus:outline-none"
                  title="Swap Cities"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5 rotate-90 lg:rotate-0" />
                </button>
              </div>
            </div>

            {/* TO Field */}
            <div ref={toRef} className="lg:col-span-4 p-4 relative border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 hover:bg-amber-100/40 dark:hover:bg-white/5 transition-colors cursor-pointer lg:rounded-none">
              <div onClick={() => { setShowToOverlay(true); setShowFromOverlay(false); }} className="space-y-1">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-700 dark:text-gray-500 flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-amber-500" /> To
                </div>
                <div className="font-display font-semibold text-lg text-slate-800 dark:text-white">
                  {destination ? `${getAirportDetails(destination).city} (${destination})` : 'Choose Destination'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-gray-400 truncate max-w-xs">
                  {destination ? getAirportDetails(destination).name : 'Select destination airport'}
                </div>
              </div>

              {/* To Overlay */}
              {showToOverlay && (
                <div className="absolute left-0 right-0 lg:left-0 top-[102%] mt-1 w-full lg:w-[320px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-3 space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <input
                    type="text"
                    placeholder="Search city or airport..."
                    value={toSearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setToSearchQuery(val);
                      if (toSearchTimeout.current) {
                        clearTimeout(toSearchTimeout.current);
                      }
                      if (val.trim().length >= 3) {
                        toSearchTimeout.current = setTimeout(() => {
                          fetchAiAirports(val);
                        }, 600);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400 dark:text-gray-500 px-2 py-1">Available Airports</div>
                    {filteredToAirports.length > 0 ? (
                      filteredToAirports.map(ap => (
                        <button
                          type="button"
                          key={ap.code}
                          onClick={() => {
                            setDestination(ap.code);
                            setShowToOverlay(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-amber-500/10 hover:text-amber-500 transition-colors flex items-center gap-2.5 cursor-pointer text-xs"
                        >
                          <div className="h-7 w-7 shrink-0 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center font-mono font-bold text-amber-600 dark:text-amber-500 text-[10px]">
                            {ap.code}
                          </div>
                          <div className="truncate">
                            <div className="font-semibold text-slate-900 dark:text-white text-[11px]">{ap.city}</div>
                            <div className="text-[9px] text-slate-500 dark:text-gray-400 truncate">{ap.name}</div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-[10px] text-slate-400 dark:text-gray-500 p-2">No airports found</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* DATE Field */}
            <div 
              onClick={handleDateClick}
              className="lg:col-span-2 p-4 relative border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 hover:bg-amber-100/40 dark:hover:bg-white/5 transition-colors cursor-pointer flex flex-col justify-center rounded-b-2xl lg:rounded-b-none"
            >
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-700 dark:text-gray-500 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-amber-500" /> Departure Date
                </div>
                <div className="font-display font-semibold text-base text-slate-800 dark:text-white leading-tight">
                  {formatDateDisplay(date)}
                </div>
                <div className="text-[9px] text-slate-500 dark:text-gray-400">
                  Select date
                </div>
              </div>
              <input
                ref={dateInputRef}
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
              />
            </div>

            {/* SEARCH BUTTON inside grid */}
            <button
              type="submit"
              className="lg:col-span-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs md:text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer font-display py-5 lg:py-0 rounded-b-2xl lg:rounded-r-3xl lg:rounded-bl-none focus:outline-none"
            >
              <Search className="h-4 w-4" /> SEARCH
            </button>
          </div>
        </form>
      </div>

      {/* Luxury Promos section */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Tropical Card */}
        <div className="glass-card rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-white/5 hover:scale-[1.02] transition-all">
          <div className="h-48 w-full overflow-hidden relative">
            <img src="/destination_tropical.png" alt="Tropical Escape" className="h-full w-full object-cover" />
            <div className="absolute top-4 left-4 bg-white/90 dark:bg-brand-900/80 backdrop-blur px-2.5 py-1 rounded-full text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 border border-slate-200 dark:border-white/10">
              <Star className="h-3 w-3 fill-amber-500 dark:fill-amber-400 text-amber-500 dark:text-amber-400" /> 4.9 Rated
            </div>
          </div>
          <div className="p-5 space-y-2">
            <h4 className="font-display font-bold text-slate-900 dark:text-white text-base">Maldives Tropical Escape</h4>
            <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
              Fly in comfort to beach resorts. Available departures from Chennai and Mumbai with instant connection tickets.
            </p>
          </div>
        </div>

        {/* Promo Code Card */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between border border-slate-200 dark:border-amber-500/10 shadow-xl">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Percent className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <h4 className="font-display font-bold text-slate-900 dark:text-white text-base">Promotions &amp; Coupons</h4>
            <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed font-sans">
              Apply coupon codes during booking checkout for substantial reductions:
            </p>
            <ul className="text-xs space-y-1.5 font-medium text-amber-600 dark:text-amber-400 max-h-32 overflow-y-auto">
              {coupons.length > 0 ? (
                coupons.map((c: any) => (
                  <li key={c.id}>
                    • <strong>{c.code}</strong>: {c.discountPercentage}% off {c.restrictedFlightId ? `(Flight #${c.restrictedFlightId} Only)` : `up to ₹${c.maxDiscount}`}
                  </li>
                ))
              ) : (
                <li className="text-slate-400">No active promotions available at the moment.</li>
              )}
            </ul>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-gray-500 border-t border-slate-200 dark:border-white/5 pt-3 mt-4">
            *Flight-restricted coupons apply up to 5% discount.
          </div>
        </div>

        {/* Customer Support */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between border border-slate-200 dark:border-white/5 shadow-xl">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Compass className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            </div>
            <h4 className="font-display font-bold text-slate-900 dark:text-white text-base">Intelligent AI Assistant</h4>
            <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
              Use our live Travel Chatbot at the bottom right corner of the page for baggage limit updates, cancellation refunds, or flight upgrades.
            </p>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">● 24/7 Heuristics Engine Live</span>
        </div>
      </div>

      {/* Why Book Flights section */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8 border-t border-slate-200 dark:border-white/5 pt-12">
        <h3 className="font-display text-xl md:text-2xl font-bold text-slate-900 dark:text-white text-left">
          Why Book Flight Tickets on Aura Airways
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          
          {/* Feature 1 */}
          <div className="flex gap-4 items-start">
            <div className="h-11 w-11 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Ticket className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="space-y-1 text-left">
              <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-gray-100">Get Flight Tickets</h4>
              <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed font-sans">
                With our advanced route matching and prediction feature, discover the best options and increase your chances of booking confirmed seats.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="flex gap-4 items-start">
            <div className="h-11 w-11 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="space-y-1 text-left">
              <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-gray-100">UPI Enabled Secured Payment</h4>
              <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed font-sans">
                Payments on Aura are highly secured. Multiple payment options like Credit Card, Debit Card, Net Banking, and instant UPI are available.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="flex gap-4 items-start">
            <div className="h-11 w-11 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="space-y-1 text-left">
              <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-gray-100">Free Cancellation on Flight Tickets</h4>
              <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed font-sans">
                Opt for our premium Free Cancellation plan during booking checkout to secure a complete base-fare refund if plans change.
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="flex gap-4 items-start">
            <div className="h-11 w-11 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Headphones className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="space-y-1 text-left">
              <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-gray-100">Flight Booking &amp; Enquiry Support</h4>
              <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed font-sans">
                24x7 customer support for all flight details, boarding updates, and seat reservations. Reach us at any time via chat or helpline support.
              </p>
            </div>
          </div>

          {/* Feature 5 */}
          <div className="flex gap-4 items-start">
            <div className="h-11 w-11 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Coins className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="space-y-1 text-left">
              <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-gray-100">Instant Refund &amp; Cancellation</h4>
              <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed font-sans">
                Cancel tickets instantly and receive direct credit to your bank account with automated settlement tracking.
              </p>
            </div>
          </div>

          {/* Feature 6 */}
          <div className="flex gap-4 items-start">
            <div className="h-11 w-11 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="space-y-1 text-left">
              <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-gray-100">Live Flight Status Tracking</h4>
              <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed font-sans">
                Track live updates on flight schedules, delays, terminals, and boarding gates directly on your dashboard.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Home;
