import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Calendar, DollarSign, Users, Plane, Percent, PlusCircle, RefreshCcw, X, Trash2, Tag, Search, Sparkles } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../store';
import { fetchStats } from '../store/statsSlice';

interface Stats {
  totalFlights: number;
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  totalAirlines: number;
  totalAirports: number;
  occupancyRate: number;
  cancellationsCount: number;
  trendData: Array<{ date: string; bookings: number; revenue: number }>;
  routesData: Array<{ route: string; count: number }>;
}

interface Flight {
  id: number;
  flightNumber: string;
  airline: { id: number; name: string };
  aircraft: { id: number; model: string };
  sourceAirport: { code: string };
  destinationAirport: { code: string };
  departureTime: string;
  status: string;
  baseFare: number;
}

interface Airline {
  id: number;
  code: string;
  name: string;
}

interface Aircraft {
  id: number;
  model: string;
  capacity: number;
}

const GLOBAL_AIRPORTS = [
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj Intl Airport', city: 'Mumbai', country: 'India', keywords: ['mumbai', 'india', 'financial capital', 'bombay', 'asia', 'maharashtra'] },
  { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi', country: 'India', keywords: ['delhi', 'india', 'capital', 'new delhi', 'indira', 'gandhi', 'asia', 'north india'] },
  { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai', country: 'India', keywords: ['chennai', 'india', 'madras', 'gateway', 'south india', 'tamil nadu', 'asia'] },
  { code: 'BLR', name: 'Kempegowda International Airport', city: 'Bengaluru', country: 'India', keywords: ['bengaluru', 'bangalore', 'india', 'silicon valley', 'it hub', 'asia', 'karnataka'] },
  { code: 'CCU', name: 'Netaji Subhash Chandra Bose Intl Airport', city: 'Kolkata', country: 'India', keywords: ['kolkata', 'calcutta', 'india', 'west bengal', 'east india'] },
  { code: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad', country: 'India', keywords: ['hyderabad', 'india', 'telangana', 'cyberabad', 'biryani'] },
  { code: 'COK', name: 'Cochin International Airport', city: 'Kochi', country: 'India', keywords: ['kochi', 'cochin', 'kerala', 'india', 'south india'] },
  { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', keywords: ['canada', 'toronto', 'pearson', 'yyz', 'ontario'] },
  { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada', keywords: ['canada', 'vancouver', 'yvr', 'british columbia'] },
  { code: 'YUL', name: 'Montréal-Trudeau International Airport', city: 'Montreal', country: 'Canada', keywords: ['canada', 'montreal', 'quebec', 'yul', 'trudeau'] },
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA', keywords: ['new york', 'usa', 'jfk', 'america', 'east coast', 'financial'] },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA', keywords: ['los angeles', 'california', 'lax', 'west coast', 'hollywood', 'america', 'usa'] },
  { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'UK', keywords: ['london', 'uk', 'england', 'heathrow', 'europe', 'capital of uk', 'united kingdom', 'lhr'] },
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', keywords: ['paris', 'france', 'cdg', 'europe', 'capital of france', 'romance'] },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', keywords: ['singapore', 'changi', 'sin', 'asia', 'southeast asia', 'garden city', 'hub'] },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', keywords: ['dubai', 'uae', 'dxb', 'middle east', 'emirates', 'hub', 'gulf'] },
  { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan', keywords: ['tokyo', 'japan', 'haneda', 'hnd', 'asia', 'east asia', 'capital of japan'] },
  { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', keywords: ['tokyo', 'japan', 'narita', 'nrt', 'asia'] },
  { code: 'SYD', name: 'Sydney Airport', city: 'Sydney', country: 'Australia', keywords: ['sydney', 'australia', 'syd', 'opera house', 'down under'] },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', keywords: ['frankfurt', 'germany', 'fra', 'europe', 'financial center', 'hub'] },
  { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea', keywords: ['seoul', 'korea', 'icn', 'east asia', 'asia', 'capital of korea'] },
  { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', keywords: ['amsterdam', 'holland', 'schiphol', 'ams', 'europe', 'capital'] },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', keywords: ['istanbul', 'turkey', 'ist', 'europe', 'asia', 'bridge'] },
  { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain', keywords: ['madrid', 'spain', 'mad', 'europe', 'capital'] },
  { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino Airport', city: 'Rome', country: 'Italy', keywords: ['rome', 'italy', 'fco', 'europe', 'capital'] },
  { code: 'ORD', name: 'O\'Hare International Airport', city: 'Chicago', country: 'USA', keywords: ['chicago', 'ord', 'usa', 'midwest'] },
  { code: 'DFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'USA', keywords: ['dallas', 'dfw', 'texas', 'usa'] },
  { code: 'DEN', name: 'Denver International Airport', city: 'Denver', country: 'USA', keywords: ['denver', 'den', 'colorado', 'usa'] },
  { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'USA', keywords: ['san francisco', 'sfo', 'california', 'silicon valley', 'usa'] },
  { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong', keywords: ['hong kong', 'hkg', 'china', 'asia'] },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', keywords: ['bangkok', 'thailand', 'bkk', 'asia', 'southeast asia'] },
  { code: 'KUL', name: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', country: 'Malaysia', keywords: ['kuala lumpur', 'malaysia', 'kul', 'asia', 'southeast asia'] },
  { code: 'CAN', name: 'Guangzhou Baiyun International Airport', city: 'Guangzhou', country: 'China', keywords: ['guangzhou', 'china', 'can', 'asia'] },
  { code: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China', keywords: ['beijing', 'china', 'pek', 'capital'] }
];

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const dispatch = useAppDispatch();

  const { data: stats, loading: statsLoading } = useAppSelector(state => state.stats);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'analytics' | 'coupons'>('analytics');

  // Flight form states
  const [flightNumber, setFlightNumber] = useState('');
  const [airlineId, setAirlineId] = useState('');
  const [aircraftId, setAircraftId] = useState('');
  
  // Departing and Destination Autocomplete search states
  const [sourceCode, setSourceCode] = useState('');
  const [sourceInput, setSourceInput] = useState('');
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [sourceSuggestions, setSourceSuggestions] = useState(GLOBAL_AIRPORTS);
  const [isSourceCustom, setIsSourceCustom] = useState(false);
  const [customSourceName, setCustomSourceName] = useState('');
  const [customSourceCity, setCustomSourceCity] = useState('');
  const [customSourceCountry, setCustomSourceCountry] = useState('');

  const [destCode, setDestCode] = useState('');
  const [destInput, setDestInput] = useState('');
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [destSuggestions, setDestSuggestions] = useState(GLOBAL_AIRPORTS);
  const [isDestCustom, setIsDestCustom] = useState(false);
  const [customDestName, setCustomDestName] = useState('');
  const [customDestCity, setCustomDestCity] = useState('');
  const [customDestCountry, setCustomDestCountry] = useState('');
  
  const [sourceLoading, setSourceLoading] = useState(false);
  const [destLoading, setDestLoading] = useState(false);
  const [allAirports, setAllAirports] = useState<any[]>(GLOBAL_AIRPORTS);
  const [sourceApiResults, setSourceApiResults] = useState<any[]>([]);
  const [destApiResults, setDestApiResults] = useState<any[]>([]);

  // Dynamic Airline autocomplete states
  const [airlineSearchInput, setAirlineSearchInput] = useState('');
  const [showAirlineDropdown, setShowAirlineDropdown] = useState(false);
  const [airlineSuggestions, setAirlineSuggestions] = useState<any[]>([]);
  const [airlineLoading, setAirlineLoading] = useState(false);
  const [selectedAirlineCode, setSelectedAirlineCode] = useState('');
  const [selectedAirlineName, setSelectedAirlineName] = useState('');

  // Dynamic Aircraft autocomplete states
  const [aircraftSearchInput, setAircraftSearchInput] = useState('');
  const [showAircraftDropdown, setShowAircraftDropdown] = useState(false);
  const [aircraftSuggestions, setAircraftSuggestions] = useState<any[]>([]);
  const [aircraftLoading, setAircraftLoading] = useState(false);
  const [selectedAircraftModel, setSelectedAircraftModel] = useState('');
  const [selectedAircraftCapacity, setSelectedAircraftCapacity] = useState<number>(180);

  // Debouncing refs for AI search
  const sourceSearchTimeout = useRef<any>(null);
  const destSearchTimeout = useRef<any>(null);
  const airlineSearchTimeout = useRef<any>(null);
  const aircraftSearchTimeout = useRef<any>(null);

  const sourceRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);
  const airlineRef = useRef<HTMLDivElement>(null);
  const aircraftRef = useRef<HTMLDivElement>(null);

  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [baseFare, setBaseFare] = useState('');
  const [duration, setDuration] = useState('');
  
  // Selected coupon from existing coupons
  const [selectedCouponCode, setSelectedCouponCode] = useState('');

  // Coupon manager states
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [newCouponMax, setNewCouponMax] = useState('1000');
  const [newCouponFlightId, setNewCouponFlightId] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (sourceRef.current && !sourceRef.current.contains(e.target as Node)) {
        setShowSourceDropdown(false);
      }
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setShowDestDropdown(false);
      }
      if (airlineRef.current && !airlineRef.current.contains(e.target as Node)) {
        setShowAirlineDropdown(false);
      }
      if (aircraftRef.current && !aircraftRef.current.contains(e.target as Node)) {
        setShowAircraftDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Auto-calculate Duration from Departure & Arrival Time
  useEffect(() => {
    if (departure && arrival) {
      const depTime = new Date(departure).getTime();
      const arrTime = new Date(arrival).getTime();
      if (arrTime > depTime) {
        const diffMins = Math.floor((arrTime - depTime) / 60000);
        setDuration(String(diffMins));
      } else {
        setDuration('');
      }
    }
  }, [departure, arrival]);

  useEffect(() => {
    if (!user || user.role !== 'ROLE_AIRLINE_ADMIN') {
      navigate('/');
      return;
    }
    fetchData();
    fetchCoupons();
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'ROLE_AIRLINE_ADMIN') {
      const interval = setInterval(() => {
        dispatch(fetchStats());
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user, dispatch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      dispatch(fetchStats());

      const flightsRes = await api.get('/api/flights');
      setFlights(flightsRes.data);

      const airlinesRes = await api.get('/api/flights/airlines');
      setAirlines(airlinesRes.data);
      if (airlinesRes.data.length > 0 && !airlineId) {
        setAirlineId(String(airlinesRes.data[0].id));
      }

      const aircraftRes = await api.get('/api/flights/aircraft');
      setAircraftList(aircraftRes.data);
      if (aircraftRes.data.length > 0 && !aircraftId) {
        setAircraftId(String(aircraftRes.data[0].id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const res = await api.get('/api/coupons/admin');
      setCouponsList(res.data);
    } catch (err) {
      console.error("Failed to fetch coupons", err);
    }
  };

  const handleStatusChange = async (flightId: number, status: string) => {
    try {
      await api.put(`/api/flights/${flightId}/status`, null, { params: { status } });
      alert("Flight status updated successfully!");
      fetchData();
    } catch (err) {
      alert("Failed to update flight status.");
    }
  };

  // AI Semantic matching filter
  const filterAirportsSemantically = (val: string, excludeCode: string) => {
    const base = allAirports.filter(ap => ap.code !== excludeCode);
    if (!val.trim()) return base;
    const q = val.toLowerCase().trim();
    return base.filter(ap => 
      ap.code.toLowerCase().includes(q) ||
      ap.name.toLowerCase().includes(q) ||
      ap.city.toLowerCase().includes(q) ||
      ap.country.toLowerCase().includes(q) ||
      (ap.keywords && ap.keywords.some((kw: string) => kw.includes(q)))
    );
  };

  // Live Internet / AI Search helper
  const fetchAiAirportsSource = async (query: string) => {
    setSourceLoading(true);
    try {
      const res = await api.get(`/api/chatbot/search-airport`, { params: { query } });
      const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      if (Array.isArray(parsed) && parsed.length > 0) {
        setAllAirports(prev => {
          const combined = [...parsed, ...prev];
          return Array.from(new Map(combined.map(item => [item.code, item])).values());
        });
        const unique = Array.from(new Map(parsed.map((item: any) => [item.code, item])).values())
          .filter((ap: any) => ap.code !== destCode);
        setSourceApiResults(unique);
        setSourceSuggestions(unique);
      } else {
        setSourceApiResults([]);
      }
    } catch (err) {
      console.error("AI source search error", err);
      setSourceApiResults([]);
    } finally {
      setSourceLoading(false);
    }
  };

  const fetchAiAirportsDest = async (query: string) => {
    setDestLoading(true);
    try {
      const res = await api.get(`/api/chatbot/search-airport`, { params: { query } });
      const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      if (Array.isArray(parsed) && parsed.length > 0) {
        setAllAirports(prev => {
          const combined = [...parsed, ...prev];
          return Array.from(new Map(combined.map(item => [item.code, item])).values());
        });
        const unique = Array.from(new Map(parsed.map((item: any) => [item.code, item])).values())
          .filter((ap: any) => ap.code !== sourceCode);
        setDestApiResults(unique);
        setDestSuggestions(unique);
      } else {
        setDestApiResults([]);
      }
    } catch (err) {
      console.error("AI destination search error", err);
      setDestApiResults([]);
    } finally {
      setDestLoading(false);
    }
  };

  const handleSourceInputChange = (val: string) => {
    setSourceInput(val);
    setSourceSuggestions(filterAirportsSemantically(val, destCode));
    setShowSourceDropdown(true);
    setIsSourceCustom(false);
    if (val.trim().length < 3) {
      setSourceApiResults([]);
    }

    if (sourceSearchTimeout.current) {
      clearTimeout(sourceSearchTimeout.current);
    }
    if (val.trim().length >= 3) {
      setSourceLoading(true);
      sourceSearchTimeout.current = setTimeout(() => {
        fetchAiAirportsSource(val);
      }, 600);
    } else {
      setSourceLoading(false);
    }
  };

  const handleDestInputChange = (val: string) => {
    setDestInput(val);
    setDestSuggestions(filterAirportsSemantically(val, sourceCode));
    setShowDestDropdown(true);
    setIsDestCustom(false);
    if (val.trim().length < 3) {
      setDestApiResults([]);
    }

    if (destSearchTimeout.current) {
      clearTimeout(destSearchTimeout.current);
    }
    if (val.trim().length >= 3) {
      setDestLoading(true);
      destSearchTimeout.current = setTimeout(() => {
        fetchAiAirportsDest(val);
      }, 600);
    } else {
      setDestLoading(false);
    }
  };

  const fetchAiAirlines = async (query: string) => {
    setAirlineLoading(true);
    try {
      const res = await api.get(`/api/chatbot/search-airline`, { params: { query } });
      const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      if (Array.isArray(parsed)) {
        setAirlineSuggestions(parsed);
      }
    } catch (err) {
      console.error("AI airline search error", err);
    } finally {
      setAirlineLoading(false);
    }
  };

  const fetchAiAircraft = async (query: string) => {
    setAircraftLoading(true);
    try {
      const res = await api.get(`/api/chatbot/search-aircraft`, { params: { query } });
      const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      if (Array.isArray(parsed)) {
        setAircraftSuggestions(parsed);
      }
    } catch (err) {
      console.error("AI aircraft search error", err);
    } finally {
      setAircraftLoading(false);
    }
  };

  const handleAirlineInputChange = (val: string) => {
    setAirlineSearchInput(val);
    setShowAirlineDropdown(true);
    const localMatches = airlines.filter(al => 
      al.name.toLowerCase().includes(val.toLowerCase()) || 
      al.code.toLowerCase().includes(val.toLowerCase())
    );
    setAirlineSuggestions(localMatches);

    if (airlineSearchTimeout.current) {
      clearTimeout(airlineSearchTimeout.current);
    }
    if (val.trim().length >= 2) {
      setAirlineLoading(true);
      airlineSearchTimeout.current = setTimeout(() => {
        fetchAiAirlines(val);
      }, 500);
    } else {
      setAirlineLoading(false);
    }
  };

  const handleAircraftInputChange = (val: string) => {
    setAircraftSearchInput(val);
    setShowAircraftDropdown(true);
    const localMatches = aircraftList.filter(ac => 
      ac.model.toLowerCase().includes(val.toLowerCase())
    );
    setAircraftSuggestions(localMatches);

    if (aircraftSearchTimeout.current) {
      clearTimeout(aircraftSearchTimeout.current);
    }
    if (val.trim().length >= 2) {
      setAircraftLoading(true);
      aircraftSearchTimeout.current = setTimeout(() => {
        fetchAiAircraft(val);
      }, 500);
    } else {
      setAircraftLoading(false);
    }
  };

  const handleAddFlightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flightNumber || !departure || !arrival || !baseFare || !duration) {
      alert("Please fill all details");
      return;
    }

    if (sourceCode && destCode && sourceCode === destCode) {
      alert("Strict Policy Error: Source and Destination hubs must be different airports!");
      return;
    }

    const matchedCoupon = couponsList.find(c => c.code === selectedCouponCode);
    if (matchedCoupon && matchedCoupon.discountPercentage > 5) {
      alert("Selected coupon exceeds the 5% discount limit for flight-restricted application. Please adjust its value first.");
      return;
    }

    // Resolve source metadata
    let finalSourceCode = sourceCode;
    let finalSourceName = '';
    let finalSourceCity = '';
    let finalSourceCountry = '';

    if (isSourceCustom) {
      finalSourceCode = sourceInput.trim().toUpperCase();
      finalSourceName = customSourceName;
      finalSourceCity = customSourceCity;
      finalSourceCountry = customSourceCountry;
    } else {
      // Find in local suggest or in matched suggestions list
      const gAp = sourceSuggestions.find(ap => ap.code === sourceCode);
      if (gAp) {
        finalSourceName = gAp.name;
        finalSourceCity = gAp.city;
        finalSourceCountry = gAp.country;
      }
    }

    // Resolve dest metadata
    let finalDestCode = destCode;
    let finalDestName = '';
    let finalDestCity = '';
    let finalDestCountry = '';

    if (isDestCustom) {
      finalDestCode = destInput.trim().toUpperCase();
      finalDestName = customDestName;
      finalDestCity = customDestCity;
      finalDestCountry = customDestCountry;
    } else {
      const gAp = destSuggestions.find(ap => ap.code === destCode);
      if (gAp) {
        finalDestName = gAp.name;
        finalDestCity = gAp.city;
        finalDestCountry = gAp.country;
      }
    }

    try {
      const payload = {
        flightNumber,
        airlineId: airlineId ? Number(airlineId) : null,
        aircraftId: aircraftId ? Number(aircraftId) : null,
        airlineCode: selectedAirlineCode || null,
        airlineName: selectedAirlineName || null,
        aircraftModel: selectedAircraftModel || null,
        aircraftCapacity: selectedAircraftCapacity ? Number(selectedAircraftCapacity) : null,
        sourceAirportCode: finalSourceCode,
        sourceAirportName: finalSourceName,
        sourceAirportCity: finalSourceCity,
        sourceAirportCountry: finalSourceCountry,
        destinationAirportCode: finalDestCode,
        destinationAirportName: finalDestName,
        destinationAirportCity: finalDestCity,
        destinationAirportCountry: finalDestCountry,
        departureTime: departure,
        arrivalTime: arrival,
        baseFare: Number(baseFare),
        durationMinutes: Number(duration),
        couponCode: selectedCouponCode || null,
        couponDiscount: matchedCoupon ? matchedCoupon.discountPercentage : null
      };

      await api.post('/api/flights', payload);
      alert("New flight schedule created successfully with seat maps locked!");
      setShowAddForm(false);
      
      // Clear form
      setFlightNumber('');
      setDeparture('');
      setArrival('');
      setBaseFare('');
      setDuration('');
      setSelectedCouponCode('');
      setIsSourceCustom(false);
      setIsDestCustom(false);
      setAirlineSearchInput('');
      setAircraftSearchInput('');
      setSelectedAirlineCode('');
      setSelectedAirlineName('');
      setSelectedAircraftModel('');
      setSelectedAircraftCapacity(180);
      setAirlineId('');
      setAircraftId('');

      fetchData();
      fetchCoupons();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create flight.");
    }
  };

  const handleCreateCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode || !newCouponDiscount) {
      alert("Please enter coupon code and discount percentage.");
      return;
    }

    const discountValue = Number(newCouponDiscount);
    const flightIdValue = newCouponFlightId ? Number(newCouponFlightId) : null;

    if (flightIdValue && discountValue > 5) {
      alert("Strict Validation: Coupons restricted to specific flights cannot exceed a 5% discount.");
      return;
    }

    setCouponLoading(true);
    try {
      const payload = {
        code: newCouponCode.trim().toUpperCase(),
        discountPercentage: discountValue,
        maxDiscount: Number(newCouponMax),
        active: true,
        restrictedFlightId: flightIdValue
      };

      await api.post('/api/coupons', payload);
      alert("Coupon created successfully!");
      setNewCouponCode('');
      setNewCouponDiscount('');
      setNewCouponFlightId('');
      fetchCoupons();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create coupon.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleDeleteCoupon = async (couponId: number) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await api.delete(`/api/coupons/${couponId}`);
      alert("Coupon deleted successfully!");
      fetchCoupons();
    } catch (err) {
      alert("Failed to delete coupon.");
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs text-gray-400">Loading admin console analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 space-y-8 text-slate-800 dark:text-gray-100 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4 gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">Admin Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400">Manage flight status, coupons and logistics</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-amber-500 hover:bg-amber-600 text-brand-900 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-amber-500/15"
          >
            <PlusCircle className="h-4.5 w-4.5" /> Create Flight Route
          </button>
          
          <button
            onClick={fetchData}
            className="glass-light p-2 rounded-xl text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-slate-200 dark:border-white/5"
          >
            <RefreshCcw className="h-4 w-4 text-amber-600 dark:text-amber-500" /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            activeTab === 'analytics' 
              ? 'bg-amber-500 text-slate-950 shadow-md' 
              : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-900/60'
          }`}
        >
          Analytics &amp; Schedules
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            activeTab === 'coupons' 
              ? 'bg-amber-500 text-slate-950 shadow-md' 
              : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-900/60'
          }`}
        >
          Manage Coupons ({couponsList.length})
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <>
          {/* Cards stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">₹{stats.totalRevenue}</p>
              </div>
              <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-gray-400">Total Bookings</p>
                <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{stats.totalBookings}</p>
              </div>
              <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                <Calendar className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-gray-400">Total Flights</p>
                <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{stats.totalFlights}</p>
              </div>
              <div className="h-10 w-10 bg-teal-500/10 rounded-xl flex items-center justify-center border border-teal-500/20">
                <Plane className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-gray-400">Occupancy Rate</p>
                <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{stats.occupancyRate}%</p>
              </div>
              <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <Percent className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Recharts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/5 space-y-4">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">Daily Revenue Flow</h3>
              <div className="h-64 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.trendData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#0a1128', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#d4af37" fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/5 space-y-4">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">Bookings Volume</h3>
              <div className="h-64 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#0a1128', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                    <Bar dataKey="bookings" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Flight Schedules Management */}
          <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/5 space-y-4 overflow-hidden">
            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">Manage Flight Schedules</h3>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 font-bold">
                    <th className="pb-3 pr-4">Flight Number</th>
                    <th className="pb-3 px-4">Airline</th>
                    <th className="pb-3 px-4">Route</th>
                    <th className="pb-3 px-4">Base Fare</th>
                    <th className="pb-3 px-4">Departure</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 pl-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flights.map(f => {
                    const depDate = new Date(f.departureTime);
                    return (
                      <tr key={f.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/2 transition-colors">
                        <td className="py-4 pr-4 font-mono font-bold text-slate-900 dark:text-white">{f.flightNumber}</td>
                        <td className="py-4 px-4 text-slate-700 dark:text-gray-300">{f.airline.name}</td>
                        <td className="py-4 px-4 text-slate-700 dark:text-gray-300 font-bold">{f.sourceAirport.code} ➔ {f.destinationAirport.code}</td>
                        <td className="py-4 px-4 font-mono text-slate-700 dark:text-gray-300">₹{f.baseFare}</td>
                        <td className="py-4 px-4 text-slate-500 dark:text-gray-400">{depDate.toLocaleDateString()} {depDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            f.status === 'SCHEDULED' ? 'bg-blue-500/10 border border-blue-500/25 text-blue-500 dark:text-blue-400' :
                            f.status === 'BOARDING' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400' :
                            f.status === 'DELAYED' ? 'bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400' :
                            'bg-rose-500/10 border border-rose-500/25 text-rose-500 dark:text-rose-400'
                          }`}>
                            {f.status}
                          </span>
                        </td>
                        <td className="py-4 pl-4">
                          <select
                            value={f.status}
                            onChange={(e) => handleStatusChange(f.id, e.target.value)}
                            className="bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg p-1.5 text-[10px] text-slate-900 dark:text-white focus:outline-none"
                          >
                            <option value="SCHEDULED">Schedule</option>
                            <option value="BOARDING">Boarding</option>
                            <option value="DELAYED">Delay</option>
                            <option value="CANCELLED">Cancel</option>
                            <option value="COMPLETED">Complete</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Coupons Manager Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create Coupon Form */}
          <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/5 space-y-4 h-fit">
            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Tag className="h-4.5 w-4.5 text-amber-500" /> Create New Coupon
            </h3>
            <form onSubmit={handleCreateCouponSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-gray-400 font-semibold">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  placeholder="e.g. MONSOON5"
                  className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-gray-400 font-semibold">Discount Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newCouponDiscount}
                  onChange={(e) => setNewCouponDiscount(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">Note: Capped strictly at 5% if restricted to a specific flight.</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-gray-400 font-semibold">Max Discount Cap (INR)</label>
                <input
                  type="number"
                  required
                  value={newCouponMax}
                  onChange={(e) => setNewCouponMax(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-gray-400 font-semibold">Restrict to Flight ID (Optional)</label>
                <input
                  type="number"
                  value={newCouponFlightId}
                  onChange={(e) => setNewCouponFlightId(e.target.value)}
                  placeholder="Leave empty for global coupons"
                  className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={couponLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-brand-900 font-bold py-3 rounded-xl transition-all shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {couponLoading ? "Creating..." : "Save Coupon"}
              </button>
            </form>
          </div>

          {/* Coupons List Table */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/5 space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">Active Promotional Coupons</h3>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 font-bold">
                    <th className="pb-3 pr-4">Code</th>
                    <th className="pb-3 px-4">Discount</th>
                    <th className="pb-3 px-4">Max Cap</th>
                    <th className="pb-3 px-4">Flight Restriction</th>
                    <th className="pb-3 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {couponsList.map((c: any) => (
                    <tr key={c.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/2 transition-colors">
                      <td className="py-4 pr-4 font-mono font-bold text-amber-500">{c.code}</td>
                      <td className="py-4 px-4 font-semibold">{c.discountPercentage}%</td>
                      <td className="py-4 px-4 font-mono">₹{c.maxDiscount}</td>
                      <td className="py-4 px-4 text-slate-600 dark:text-gray-400">
                        {c.restrictedFlightId ? (
                          <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-semibold">
                            Flight #{c.restrictedFlightId} Only
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">None (Global)</span>
                        )}
                      </td>
                      <td className="py-4 pl-4 text-right">
                        <button
                          onClick={() => handleDeleteCoupon(c.id)}
                          className="text-rose-500 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-500/5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {couponsList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">No coupons registered. Add one using the form.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Add Flight Form Overlay Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl p-6 w-full max-w-lg border border-slate-200 dark:border-white/10 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto premium-scrollbar font-sans">
            <button
              onClick={() => setShowAddForm(false)}
              className="absolute top-4 right-4 text-slate-500 dark:text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/5">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Create New Flight Route</h3>
            </div>
            
            <form onSubmit={handleAddFlightSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-slate-500 dark:text-gray-400">Flight Number</label>
                  <input
                    type="text"
                    required
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    placeholder="e.g. AI-905"
                    className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                {/* Airline Autocomplete overlay */}
                <div ref={airlineRef} className="space-y-1.5 relative">
                  <label className="text-slate-500 dark:text-gray-400 flex items-center gap-1">
                    Airline Provider <Search className="h-3 w-3 text-amber-500" />
                  </label>
                  <input
                    type="text"
                    required
                    value={airlineSearchInput}
                    onChange={(e) => handleAirlineInputChange(e.target.value)}
                    onFocus={() => setShowAirlineDropdown(true)}
                    placeholder="Search airline provider"
                    className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  />
                  {showAirlineDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
                      <div className="p-1.5 bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/5 text-[9px] text-purple-500 font-bold flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5 animate-pulse" /> Suggested Airlines:
                      </div>
                      
                      {airlineLoading && (
                        <div className="p-3 text-center text-xs text-slate-500 dark:text-gray-400 flex items-center justify-center gap-2">
                          <RefreshCcw className="h-3 w-3 animate-spin text-amber-500" />
                          <span className="animate-pulse">Searching...</span>
                        </div>
                      )}

                      {airlineSuggestions.map(al => (
                        <button
                          key={al.code + al.name}
                          type="button"
                          onClick={() => {
                            if (al.id) {
                              setAirlineId(String(al.id));
                            } else {
                              setAirlineId('');
                            }
                            setSelectedAirlineCode(al.code);
                            setSelectedAirlineName(al.name);
                            setAirlineSearchInput(`${al.name} (${al.code})`);
                            setShowAirlineDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-amber-500 hover:text-slate-950 dark:hover:bg-amber-500/20 dark:hover:text-amber-400 transition-colors flex flex-col"
                        >
                          <span className="font-bold text-xs">{al.name}</span>
                          <span className="text-[10px] opacity-80">{al.code}</span>
                        </button>
                      ))}

                      {airlineSuggestions.length === 0 && !airlineLoading && airlineSearchInput.trim().length > 0 && (
                        <div className="p-3 text-center text-[10px] text-slate-500 dark:text-gray-400">
                          <p className="mb-1 font-sans">No matching airlines found.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setAirlineId('');
                              const customCode = airlineSearchInput.slice(0, 2).toUpperCase();
                              setSelectedAirlineCode(customCode);
                              setSelectedAirlineName(airlineSearchInput);
                              setAirlineSearchInput(`${airlineSearchInput} (${customCode})`);
                              setShowAirlineDropdown(false);
                            }}
                            className="text-amber-500 hover:underline font-semibold"
                          >
                            + Use "{airlineSearchInput}" as new airline
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Aircraft Autocomplete overlay */}
                <div ref={aircraftRef} className="space-y-1.5 relative">
                  <label className="text-slate-500 dark:text-gray-400 flex items-center gap-1">
                    Flight Model <Search className="h-3 w-3 text-amber-500" />
                  </label>
                  <input
                    type="text"
                    required
                    value={aircraftSearchInput}
                    onChange={(e) => handleAircraftInputChange(e.target.value)}
                    onFocus={() => setShowAircraftDropdown(true)}
                    placeholder="Search aircraft model"
                    className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  />
                  {showAircraftDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
                      <div className="p-1.5 bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/5 text-[9px] text-purple-500 font-bold flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5 animate-pulse" /> Suggested Aircraft:
                      </div>
                      
                      {aircraftLoading && (
                        <div className="p-3 text-center text-xs text-slate-500 dark:text-gray-400 flex items-center justify-center gap-2">
                          <RefreshCcw className="h-3 w-3 animate-spin text-amber-500" />
                          <span className="animate-pulse">Searching...</span>
                        </div>
                      )}

                      {aircraftSuggestions.map(ac => (
                        <button
                          key={ac.model}
                          type="button"
                          onClick={() => {
                            if (ac.id) {
                              setAircraftId(String(ac.id));
                            } else {
                              setAircraftId('');
                            }
                            setSelectedAircraftModel(ac.model);
                            setSelectedAircraftCapacity(ac.capacity);
                            setAircraftSearchInput(`${ac.model} (${ac.capacity} seats)`);
                            setShowAircraftDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-amber-500 hover:text-slate-950 dark:hover:bg-amber-500/20 dark:hover:text-amber-400 transition-colors flex flex-col"
                        >
                          <span className="font-bold text-xs">{ac.model}</span>
                          <span className="text-[10px] opacity-80">{ac.capacity} seats</span>
                        </button>
                      ))}

                      {aircraftSuggestions.length === 0 && !aircraftLoading && aircraftSearchInput.trim().length > 0 && (
                        <div className="p-3 text-center text-[10px] text-slate-500 dark:text-gray-400">
                          <p className="mb-1 font-sans">No matching aircraft models found.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setAircraftId('');
                              setSelectedAircraftModel(aircraftSearchInput);
                              setSelectedAircraftCapacity(180);
                              setAircraftSearchInput(`${aircraftSearchInput} (180 seats)`);
                              setShowAircraftDropdown(false);
                            }}
                            className="text-amber-500 hover:underline font-semibold"
                          >
                            + Use "{aircraftSearchInput}" as new aircraft
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Departing Hub Autocomplete Search */}
                <div ref={sourceRef} className="space-y-1.5 relative col-span-2">
                  <label className="text-slate-500 dark:text-gray-400 flex items-center gap-1 font-semibold">
                    Source Hub <Search className="h-3 w-3 text-amber-500" />
                  </label>
                  <input
                    type="text"
                    required
                    value={sourceInput}
                    onChange={(e) => handleSourceInputChange(e.target.value)}
                    onFocus={() => setShowSourceDropdown(true)}
                    placeholder="Search departing airport"
                    className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  />
                  {showSourceDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
                      <div className="p-1.5 bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/5 text-[9px] text-purple-500 font-bold flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5 animate-pulse" /> Suggested Airports:
                      </div>
                      
                      {sourceLoading && (
                        <div className="p-3 text-center text-xs text-slate-500 dark:text-gray-400 flex items-center justify-center gap-2">
                          <RefreshCcw className="h-3 w-3 animate-spin text-amber-500" />
                          <span className="animate-pulse">Searching...</span>
                        </div>
                      )}

                      {((sourceInput.trim().length >= 3 && !sourceLoading && sourceApiResults.length > 0)
                        ? sourceApiResults
                        : sourceSuggestions
                      ).map(ap => (
                        <button
                          key={ap.code}
                          type="button"
                          onClick={() => {
                            setSourceCode(ap.code);
                            setSourceInput(`${ap.city} (${ap.code})`);
                            setShowSourceDropdown(false);
                            setIsSourceCustom(false);
                            // Dynamic append to session global airports list
                            if (!GLOBAL_AIRPORTS.some(item => item.code === ap.code)) {
                              GLOBAL_AIRPORTS.push({
                                code: ap.code,
                                name: ap.name,
                                city: ap.city,
                                country: ap.country,
                                keywords: [ap.city.toLowerCase(), ap.code.toLowerCase(), ap.country.toLowerCase()]
                              });
                            }
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-amber-500 hover:text-slate-950 dark:hover:bg-amber-500/20 dark:hover:text-amber-400 transition-colors flex flex-col"
                        >
                          <span className="font-bold">{ap.city} ({ap.code})</span>
                          <span className="text-[10px] opacity-80 truncate">{ap.name} - {ap.country}</span>
                        </button>
                      ))}

                      {((sourceInput.trim().length >= 3 && !sourceLoading && sourceApiResults.length > 0)
                        ? sourceApiResults.length === 0
                        : sourceSuggestions.length === 0
                      ) && !sourceLoading && sourceInput.trim().length > 0 && (
                        <div className="p-3 text-center text-[10px] text-slate-500 dark:text-gray-400">
                          <p className="mb-1 font-sans">No airports found in this location.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Custom Source Airport Input Fields */}
                {isSourceCustom && (
                  <div className="col-span-2 grid grid-cols-3 gap-2 bg-purple-500/5 p-3 rounded-xl border border-purple-500/20">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500">Airport Name</label>
                      <input
                        type="text"
                        required
                        value={customSourceName}
                        onChange={(e) => setCustomSourceName(e.target.value)}
                        placeholder="e.g. Heathrow Airport"
                        className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500">City</label>
                      <input
                        type="text"
                        required
                        value={customSourceCity}
                        onChange={(e) => setCustomSourceCity(e.target.value)}
                        placeholder="e.g. London"
                        className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500">Country</label>
                      <input
                        type="text"
                        required
                        value={customSourceCountry}
                        onChange={(e) => setCustomSourceCountry(e.target.value)}
                        placeholder="e.g. United Kingdom"
                        className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Destination Hub Autocomplete Search */}
                <div ref={destRef} className="space-y-1.5 relative col-span-2">
                  <label className="text-slate-500 dark:text-gray-400 flex items-center gap-1 font-semibold">
                    Destination Hub <Search className="h-3 w-3 text-amber-500" />
                  </label>
                  <input
                    type="text"
                    required
                    value={destInput}
                    onChange={(e) => handleDestInputChange(e.target.value)}
                    onFocus={() => setShowDestDropdown(true)}
                    placeholder="Search arrival airport"
                    className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  />
                  {showDestDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
                      <div className="p-1.5 bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/5 text-[9px] text-purple-500 font-bold flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5 animate-pulse" /> Suggested Airports:
                      </div>
                      
                      {destLoading && (
                        <div className="p-3 text-center text-xs text-slate-500 dark:text-gray-400 flex items-center justify-center gap-2">
                          <RefreshCcw className="h-3 w-3 animate-spin text-amber-500" />
                          <span className="animate-pulse">Searching AI Directory...</span>
                        </div>
                      )}

                      {((destInput.trim().length >= 3 && !destLoading && destApiResults.length > 0)
                        ? destApiResults
                        : destSuggestions
                      ).map(ap => (
                        <button
                          key={ap.code}
                          type="button"
                          onClick={() => {
                            setDestCode(ap.code);
                            setDestInput(`${ap.city} (${ap.code})`);
                            setShowDestDropdown(false);
                            setIsDestCustom(false);
                            // Dynamic append to session global airports list
                            if (!GLOBAL_AIRPORTS.some(item => item.code === ap.code)) {
                              GLOBAL_AIRPORTS.push({
                                code: ap.code,
                                name: ap.name,
                                city: ap.city,
                                country: ap.country,
                                keywords: [ap.city.toLowerCase(), ap.code.toLowerCase(), ap.country.toLowerCase()]
                              });
                            }
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-amber-500 hover:text-slate-950 dark:hover:bg-amber-500/20 dark:hover:text-amber-400 transition-colors flex flex-col"
                        >
                          <span className="font-bold">{ap.city} ({ap.code})</span>
                          <span className="text-[10px] opacity-80 truncate">{ap.name} - {ap.country}</span>
                        </button>
                      ))}

                      {((destInput.trim().length >= 3 && !destLoading && destApiResults.length > 0)
                        ? destApiResults.length === 0
                        : destSuggestions.length === 0
                      ) && !destLoading && destInput.trim().length > 0 && (
                        <div className="p-3 text-center text-[10px] text-slate-500 dark:text-gray-400">
                          <p className="mb-1 font-sans">No airports found in this location.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Custom Destination Airport Input Fields */}
                {isDestCustom && (
                  <div className="col-span-2 grid grid-cols-3 gap-2 bg-purple-500/5 p-3 rounded-xl border border-purple-500/20">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500">Airport Name</label>
                      <input
                        type="text"
                        required
                        value={customDestName}
                        onChange={(e) => setCustomDestName(e.target.value)}
                        placeholder="e.g. Charles de Gaulle"
                        className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500">City</label>
                      <input
                        type="text"
                        required
                        value={customDestCity}
                        onChange={(e) => setCustomDestCity(e.target.value)}
                        placeholder="e.g. Paris"
                        className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500">Country</label>
                      <input
                        type="text"
                        required
                        value={customDestCountry}
                        onChange={(e) => setCustomDestCountry(e.target.value)}
                        placeholder="e.g. France"
                        className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-gray-400">Departure Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={departure}
                    onChange={(e) => setDeparture(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none dark:[color-scheme:dark]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-gray-400">Arrival Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={arrival}
                    onChange={(e) => setArrival(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none dark:[color-scheme:dark]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-gray-400">Base Fare (INR)</label>
                  <input
                    type="number"
                    required
                    value={baseFare}
                    onChange={(e) => setBaseFare(e.target.value)}
                    placeholder="e.g. 5200"
                    className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-gray-400">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    disabled
                    value={duration}
                    placeholder="Auto-calculated"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-500 cursor-not-allowed focus:outline-none font-bold"
                  />
                </div>

                {/* Exclusively Assign Coupon to Flight */}
                <div className="space-y-1.5 col-span-2 border-t border-slate-200 dark:border-white/5 pt-3 mt-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    🏷 Assign Coupon Exclusively to this Flight
                  </label>
                  <select
                    value={selectedCouponCode}
                    onChange={(e) => setSelectedCouponCode(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value=""> No Exclusivity Coupon </option>
                    {couponsList.map(c => (
                      <option key={c.id} value={c.code}>
                        {c.code} ({c.discountPercentage}% discount - {c.restrictedFlightId ? `Restricted to #${c.restrictedFlightId}` : 'Global'})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Note: Connecting an existing coupon restricts its usage exclusively to this flight. Discount percentage must be &lt;= 5%.
                  </span>
                </div>

              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-brand-900 font-bold py-3 rounded-xl transition-all shadow-lg text-xs cursor-pointer mt-4"
              >
                Launch Flight Schedule
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
