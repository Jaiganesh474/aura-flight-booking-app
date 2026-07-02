import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { Plane, AlertCircle, ArrowRight, Clock, Star, Sparkles, Filter, ArrowLeftRight, Calendar, MapPin, Search, X } from 'lucide-react';

interface Flight {
  id: number;
  flightNumber: string;
  airline: {
    id: number;
    code: string;
    name: string;
    logoUrl: string;
  };
  aircraft: {
    model: string;
  };
  sourceAirport: {
    code: string;
    city: string;
    name: string;
  };
  destinationAirport: {
    code: string;
    city: string;
    name: string;
  };
  departureTime: string;
  arrivalTime: string;
  status: string;
  baseFare: number;
  durationMinutes: number;
}

interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

const FlightResults: React.FC = () => {
  const { searchQuery, setSearchQuery, setSelectedFlightId } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [sortKey, setSortKey] = useState<'cheapest' | 'fastest' | 'earliest'>('cheapest');
  const [selectedAirline, setSelectedAirline] = useState<string>('ALL');
  const [priceRange, setPriceRange] = useState<number>(100000);
  const [debouncedPriceRange, setDebouncedPriceRange] = useState<number>(100000);

  // Airport modifiers
  const [airports, setAirports] = useState<Airport[]>([]);
  const [source, setSource] = useState(searchQuery.source);
  const [destination, setDestination] = useState(searchQuery.destination);
  const [date, setDate] = useState(searchQuery.date);
  const [cabinClass, setCabinClass] = useState(searchQuery.cabinClass);
  
  const [showFromOverlay, setShowFromOverlay] = useState(false);
  const [showToOverlay, setShowToOverlay] = useState(false);
  const [fromSearchQuery, setFromSearchQuery] = useState('');
  const [toSearchQuery, setToSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(!searchQuery.source || !searchQuery.destination);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Check if home page passed smart search flights directly
  const smartFlightsPassed = location.state?.smartFlights as Flight[] | undefined;

  useEffect(() => {
    api.get('/api/airports')
      .then(res => setAirports(res.data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    setSource(searchQuery.source);
    setDestination(searchQuery.destination);
    setDate(searchQuery.date);
    setCabinClass(searchQuery.cabinClass);
  }, [searchQuery]);

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

  const getAirportDetails = (code: string) => {
    if (!code) return { city: 'Choose Airport', name: 'Select airport location' };
    const ap = airports.find(a => a.code === code);
    return ap ? { city: ap.city, name: ap.name } : { city: code, name: 'Airport Hub' };
  };

  const swapCities = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
  };

  const handleUpdateSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!source || !destination) {
      alert("Please select both Source and Destination airports.");
      return;
    }
    if (source === destination) {
      alert("Source and Destination airports cannot be the same.");
      return;
    }
    setSearchQuery({ source, destination, date, cabinClass });
    setIsEditing(false);
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

  useEffect(() => {
    setLoading(true);
    
    // Simulate real airline GDS latency of 2 seconds
    const timer = setTimeout(() => {
      if (smartFlightsPassed) {
        setFlights(smartFlightsPassed);
        setLoading(false);
        return;
      }

      api.get('/api/flights/search', {
        params: {
          source: searchQuery.source,
          destination: searchQuery.destination,
          date: searchQuery.date,
        },
      })
        .then((res) => {
          setFlights(res.data);
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchQuery, smartFlightsPassed]);

  // Debounce priceRange input to prevent stuttering on drag
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPriceRange(priceRange);
    }, 350);
    return () => clearTimeout(timer);
  }, [priceRange]);

  // Trigger 1s loading state on filter updates
  useEffect(() => {
    if (!loading) {
      setFiltering(true);
      const timer = setTimeout(() => {
        setFiltering(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedAirline, debouncedPriceRange]);

  const handleSelectFlight = (flightId: number) => {
    setSelectedFlightId(flightId);
    navigate(`/details/${flightId}`);
  };

  // Filter & Sort Logic
  const filteredFlights = flights.filter(f => {
    const airlineMatch = selectedAirline === 'ALL' || f.airline.name === selectedAirline;
    const priceMatch = f.baseFare <= debouncedPriceRange;
    return airlineMatch && priceMatch;
  });

  const sortedFlights = [...filteredFlights].sort((a, b) => {
    if (sortKey === 'cheapest') return a.baseFare - b.baseFare;
    if (sortKey === 'fastest') return a.durationMinutes - b.durationMinutes;
    if (sortKey === 'earliest') {
      return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
    }
    return 0;
  });

  const cheapestRecommendation = flights.length > 0 ? [...flights].sort((a,b)=>a.baseFare - b.baseFare)[0] : null;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8 text-slate-800 dark:text-gray-100">
      {/* Search Header Info */}
      <div className="lg:col-span-4 glass p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-lg relative z-40">
        {isEditing ? (
          <form onSubmit={handleUpdateSearch} className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 relative overflow-visible">
              
              {/* FROM field */}
              <div ref={fromRef} className="md:col-span-4 relative cursor-pointer px-2 py-1 hover:bg-amber-500/5 rounded-lg">
                <div onClick={() => { setShowFromOverlay(true); setShowToOverlay(false); }} className="space-y-0.5">
                  <div className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5 text-amber-500" /> From
                  </div>
                  <div className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                    {source ? `${getAirportDetails(source).city} (${source})` : 'Choose Departure'}
                  </div>
                </div>

                {showFromOverlay && (
                  <div className="absolute left-0 top-[102%] mt-1 w-[260px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl p-2.5 space-y-2 z-50">
                    <input
                      type="text"
                      placeholder="Search departure..."
                      value={fromSearchQuery}
                      onChange={(e) => setFromSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                      autoFocus
                    />
                    <div className="max-h-36 overflow-y-auto space-y-0.5">
                      {filteredFromAirports.length > 0 ? (
                        filteredFromAirports.map(ap => (
                          <button
                            type="button"
                            key={ap.code}
                            onClick={() => {
                              setSource(ap.code);
                              setShowFromOverlay(false);
                            }}
                            className="w-full text-left px-2 py-1 rounded hover:bg-amber-500/10 hover:text-amber-500 transition-colors flex items-center gap-2 cursor-pointer text-xs"
                          >
                            <span className="font-mono font-bold text-amber-500 text-[10px]">{ap.code}</span>
                            <span className="truncate font-medium text-slate-900 dark:text-white text-[11px]">{ap.city}</span>
                          </button>
                        ))
                      ) : (
                        <div className="text-[10px] text-slate-400 p-1">No airports</div>
                      )}
                    </div>
                  </div>
                )}

                {/* SWAP Button */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      swapCities();
                    }}
                    className="w-6 h-6 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 hover:border-amber-500 text-slate-500 hover:text-amber-500 transition-all flex items-center justify-center shadow"
                  >
                    <ArrowLeftRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* TO field */}
              <div ref={toRef} className="md:col-span-4 relative cursor-pointer px-2 py-1 hover:bg-amber-500/5 rounded-lg">
                <div onClick={() => { setShowToOverlay(true); setShowFromOverlay(false); }} className="space-y-0.5">
                  <div className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5 text-amber-500" /> To
                  </div>
                  <div className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                    {destination ? `${getAirportDetails(destination).city} (${destination})` : 'Choose Destination'}
                  </div>
                </div>

                {showToOverlay && (
                  <div className="absolute left-0 top-[102%] mt-1 w-[260px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl p-2.5 space-y-2 z-50">
                    <input
                      type="text"
                      placeholder="Search destination..."
                      value={toSearchQuery}
                      onChange={(e) => setToSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                      autoFocus
                    />
                    <div className="max-h-36 overflow-y-auto space-y-0.5">
                      {filteredToAirports.length > 0 ? (
                        filteredToAirports.map(ap => (
                          <button
                            type="button"
                            key={ap.code}
                            onClick={() => {
                              setDestination(ap.code);
                              setShowToOverlay(false);
                            }}
                            className="w-full text-left px-2 py-1 rounded hover:bg-amber-500/10 hover:text-amber-500 transition-colors flex items-center gap-2 cursor-pointer text-xs"
                          >
                            <span className="font-mono font-bold text-amber-500 text-[10px]">{ap.code}</span>
                            <span className="truncate font-medium text-slate-900 dark:text-white text-[11px]">{ap.city}</span>
                          </button>
                        ))
                      ) : (
                        <div className="text-[10px] text-slate-400 p-1">No airports</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* DATE field */}
              <div onClick={handleDateClick} className="md:col-span-2 relative cursor-pointer px-2 py-1 hover:bg-amber-500/5 rounded-lg flex flex-col justify-center">
                <div className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5 text-amber-500" /> Date
                </div>
                <div className="font-semibold text-xs text-slate-800 dark:text-white leading-tight">
                  {date}
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

              {/* CLASS field */}
              <div className="md:col-span-2 px-2 py-1 flex flex-col justify-center">
                <div className="text-[9px] uppercase font-bold text-slate-500 mb-0.5">Class</div>
                <select
                  value={cabinClass}
                  onChange={(e) => setCabinClass(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="ECONOMY">Economy</option>
                  <option value="PREMIUM_ECONOMY">Premium</option>
                  <option value="BUSINESS">Business</option>
                  <option value="FIRST">First Class</option>
                </select>
              </div>

            </div>

            <div className="flex gap-2 shrink-0">
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" /> Search
              </button>
              {searchQuery.source && searchQuery.destination && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="glass-light text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Plane className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              </div>
              <div>
                <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                  {searchQuery.source} <ArrowRight className="h-4 w-4 text-amber-600 dark:text-amber-500" /> {searchQuery.destination}
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Date: {searchQuery.date} | Class: <span className="capitalize">{searchQuery.cabinClass.toLowerCase()}</span>
                </p>
              </div>
            </div>

            <button 
              onClick={() => setIsEditing(true)}
              className="glass-light text-xs font-semibold px-4 py-2.5 rounded-xl text-amber-600 dark:text-amber-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer border border-slate-200 dark:border-white/5"
            >
              Modify Search Details
            </button>
          </div>
        )}
      </div>

      {/* Mobile Filter Button */}
      <div className="lg:hidden w-full flex justify-end">
        <button
          onClick={() => setShowMobileFilters(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow transition-colors cursor-pointer"
        >
          <Filter className="h-4 w-4" /> Filters & Sort
        </button>
      </div>

      {/* Sidebar Filter Panel */}
      <div className={`${showMobileFilters ? 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end justify-center p-4' : 'hidden lg:block'} lg:relative lg:inset-auto lg:z-0 lg:bg-transparent lg:backdrop-blur-none lg:p-0 lg:flex-none`}>
        <div className="glass-card rounded-3xl p-6 h-fit space-y-6 border border-slate-200 dark:border-white/5 w-full max-w-md max-h-[85vh] overflow-y-auto lg:max-h-none lg:overflow-visible text-left">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4.5 w-4.5 text-amber-600 dark:text-amber-500" />
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">Filters &amp; Sort</h3>
            </div>
            {/* Close Button on mobile */}
            <button
              onClick={() => setShowMobileFilters(false)}
              className="lg:hidden text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Sort option */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-gray-400">Sort Flights By</label>
            <div className="flex flex-col gap-2">
              {[
                { key: 'cheapest', label: 'Cheapest Fare' },
                { key: 'fastest', label: 'Fastest Duration' },
                { key: 'earliest', label: 'Earliest Departure' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setSortKey(opt.key as any); setShowMobileFilters(false); }}
                  className={`text-left text-xs px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                    sortKey === opt.key 
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold' 
                      : 'border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950/40 text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Airline Selector */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-gray-400">Select Airline</label>
            <select
              value={selectedAirline}
              onChange={(e) => { setSelectedAirline(e.target.value); setShowMobileFilters(false); }}
              className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="ALL" className="text-slate-900">All Airlines</option>
              <option value="Air India" className="text-slate-900">Air India</option>
              <option value="IndiGo" className="text-slate-900">IndiGo</option>
              <option value="Akasa Air" className="text-slate-900">Akasa Air</option>
            </select>
          </div>

          {/* Price slider */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-gray-400">
              <span>Price range</span>
              <span className="text-amber-600 dark:text-amber-500">₹{priceRange}</span>
            </div>
            <input
              type="range"
              min="3000"
              max="100000"
              step="1000"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Main Flights List */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* AI smart recommendation cards */}
        {flights.length > 0 && cheapestRecommendation && (
          <div className="bg-gradient-to-r from-amber-500/10 to-yellow-600/5 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-4.5 w-4.5 text-amber-600 dark:text-amber-500 animate-pulse" />
              </div>
              <div className="space-y-0.5 text-left">
                <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 font-display uppercase tracking-wider flex items-center gap-1.5">
                  AI RECOMMENDATION: CHEAPEST OPTION
                </h4>
                <p className="text-xs text-slate-700 dark:text-gray-200">
                  Flight <strong>{cheapestRecommendation.flightNumber}</strong> is available at just <strong>₹{cheapestRecommendation.baseFare}</strong>. Save money by choosing this option.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSelectFlight(cheapestRecommendation.id)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs whitespace-nowrap cursor-pointer hover:scale-102 transition-transform"
            >
              Grab Offer
            </button>
          </div>
        )}

        {/* Loading / Empty States */}
        {(loading || filtering) ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 animate-pulse flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Airline Info Placeholder */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                  <div className="space-y-2">
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-2 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  </div>
                </div>

                {/* Route Timeline Placeholder */}
                <div className="flex-1 flex items-center justify-between gap-4 w-full">
                  <div className="text-center space-y-2">
                    <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded mx-auto"></div>
                    <div className="h-2.5 w-8 bg-slate-200 dark:bg-slate-800 rounded mx-auto"></div>
                  </div>
                  
                  {/* Progress Line */}
                  <div className="flex-1 space-y-1">
                    <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                    <div className="h-2 w-16 bg-slate-200 dark:bg-slate-800 rounded mx-auto"></div>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded mx-auto"></div>
                    <div className="h-2.5 w-8 bg-slate-200 dark:bg-slate-800 rounded mx-auto"></div>
                  </div>
                </div>

                {/* Price and Button Placeholder */}
                <div className="flex md:flex-col items-center justify-between md:justify-center gap-3 w-full md:w-auto md:border-l border-slate-200 dark:border-white/5 md:pl-6 shrink-0">
                  <div className="text-right space-y-1">
                    <div className="h-2 w-10 bg-slate-200 dark:bg-slate-800 rounded ml-auto"></div>
                    <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto"></div>
                  </div>
                  <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedFlights.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center space-y-4 border border-slate-200 dark:border-white/5">
            <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-500 mx-auto" />
            <h3 className="font-display font-semibold text-slate-900 dark:text-white text-base">No Matching Flights Found</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 max-w-md mx-auto">
              We couldn't find flights matching your specific filters. Try adjusting your price caps or selection rules.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedFlights.map(flight => {
              const depDateObj = new Date(flight.departureTime);
              const arrDateObj = new Date(flight.arrivalTime);
              
              return (
                <div key={flight.id} className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 hover:border-amber-500/30 transition-all flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Airline Info */}
                  <div className="flex items-center gap-4 w-full md:w-fit">
                    <div className="h-12 w-12 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10 p-2 shrink-0">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-500">{flight.airline.code}</span>
                    </div>
                    <div className="text-left space-y-1.5">
                      <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white leading-tight">{flight.airline.name}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[10px] text-slate-500 dark:text-gray-400">{flight.flightNumber} • {flight.aircraft.model}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                          flight.status === 'SCHEDULED' ? 'bg-blue-500/10 border border-blue-500/25 text-blue-500 dark:text-blue-400' :
                          flight.status === 'BOARDING' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400' :
                          flight.status === 'DELAYED' ? 'bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-500' :
                          'bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-500'
                        }`}>
                          {flight.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Route timing details */}
                  <div className="flex items-center justify-between gap-4 sm:gap-8 flex-1 w-full max-w-md">
                    {/* Departure */}
                    <div className="text-center md:text-left flex-1">
                      <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                        {depDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[9px] text-amber-600 dark:text-amber-500 font-semibold mt-1">
                        {depDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-gray-400 mt-1 uppercase leading-none">{flight.sourceAirport.code}</p>
                      <p className="text-[8px] text-slate-400 dark:text-gray-500 mt-0.5 line-clamp-1" title={flight.sourceAirport.name}>
                        {flight.sourceAirport.city} · {flight.sourceAirport.name}
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="flex-1 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 font-sans flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {Math.floor(flight.durationMinutes / 60)}h {flight.durationMinutes % 60}m
                      </span>
                      <div className="w-full h-0.5 bg-slate-200 dark:bg-white/10 relative my-2">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 shrink-0">
                          <Plane className="h-3 w-3 text-amber-600 dark:text-amber-500 rotate-45" />
                        </div>
                      </div>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider uppercase">NON-STOP</span>
                    </div>

                    {/* Arrival */}
                    <div className="text-center md:text-right flex-1">
                      <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                        {arrDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[9px] text-amber-600 dark:text-amber-500 font-semibold mt-1">
                        {arrDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-gray-400 mt-1 uppercase leading-none">{flight.destinationAirport.code}</p>
                      <p className="text-[8px] text-slate-400 dark:text-gray-500 mt-0.5 line-clamp-1" title={flight.destinationAirport.name}>
                        {flight.destinationAirport.city} · {flight.destinationAirport.name}
                      </p>
                    </div>
                  </div>

                  {/* Pricing and booking triggers */}
                  <div className="flex flex-col items-center md:items-end gap-2 w-full md:w-fit shrink-0 border-t md:border-t-0 border-slate-100 dark:border-white/5 pt-4 md:pt-0">
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 font-semibold">Base Fare starts at</p>
                    <p className="text-2xl font-bold font-display text-slate-950 dark:text-white">
                      ₹{flight.baseFare}
                    </p>
                    {flight.status === 'CANCELLED' ? (
                      <button
                        disabled
                        className="bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-gray-500 font-bold px-5 py-2.5 rounded-xl text-xs w-full md:w-auto cursor-not-allowed border border-slate-300 dark:border-white/5"
                      >
                        Cancelled
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectFlight(flight.id)}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs w-full md:w-auto shadow-md hover:scale-102 transition-transform cursor-pointer"
                      >
                        Select Seats
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlightResults;
