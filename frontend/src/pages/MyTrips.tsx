import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  AlertCircle, Calendar, XCircle, ArrowRight, ChevronDown, ChevronUp,
  Download, Plane, User, AlertTriangle, CheckCircle2, Clock, Info, ShieldCheck, Receipt, RotateCw
} from 'lucide-react';
import jsPDF from 'jspdf';

interface Passenger {
  id: number;
  firstName: string;
  lastName: string;
  gender: string;
  passportNumber: string;
  nationality: string;
  status: string;
  seat: {
    seatNumber: string;
    cabinClass: string;
  };
}

interface Booking {
  id: number;
  pnr: string;
  totalFare: number;
  bookingDate: string;
  status: string;
  refundAmount?: number;
  cancellationPenalty?: number;
  flight: {
    flightNumber: string;
    departureTime: string;
    arrivalTime: string;
    sourceAirport: { city: string; code: string; name: string };
    destinationAirport: { city: string; code: string; name: string };
    airline: { name: string };
  };
  passengers: Passenger[];
}

const REFUND_TIERS = [
  { label: '≥ 24 hrs before departure', refund: 90, charge: 10 },
  { label: '12–24 hrs before departure', refund: 75, charge: 25 },
  { label: '4–12 hrs before departure', refund: 50, charge: 50 },
  { label: '< 4 hrs before departure', refund: 0, charge: 100 },
];

const computeRefundTier = (departureTime: string, totalFare: number) => {
  const now = new Date();
  const dep = new Date(departureTime);
  const hoursLeft = (dep.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursLeft < 0) return { refundPct: 0, chargePct: 100, refundAmt: 0, chargeAmt: totalFare, label: 'Departed', canCancel: false };
  if (hoursLeft >= 24) return { refundPct: 90, chargePct: 10, refundAmt: totalFare * 0.90, chargeAmt: totalFare * 0.10, label: '≥ 24 hrs', canCancel: true };
  if (hoursLeft >= 12) return { refundPct: 75, chargePct: 25, refundAmt: totalFare * 0.75, chargeAmt: totalFare * 0.25, label: '12–24 hrs', canCancel: true };
  if (hoursLeft >= 4) return { refundPct: 50, chargePct: 50, refundAmt: totalFare * 0.50, chargeAmt: totalFare * 0.50, label: '4–12 hrs', canCancel: true };
  return { refundPct: 0, chargePct: 100, refundAmt: 0, chargeAmt: totalFare, label: '< 4 hrs', canCancel: true };
};

const MyTrips: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelModalTrip, setCancelModalTrip] = useState<Booking | null>(null);
  const [cancelModalPassenger, setCancelModalPassenger] = useState<any | null>(null);
  const [captchaCode, setCaptchaCode] = useState<string>('');
  const [captchaInput, setCaptchaInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(result);
    setCaptchaInput('');
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = () => {
    setLoading(true);
    api.get('/api/bookings/my-trips')
      .then(res => setTrips(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleCancelBooking = async (trip: Booking) => {
    setCancelLoading(true);
    try {
      if (cancelModalPassenger) {
        await api.post(`/api/bookings/${trip.id}/cancel-passenger/${cancelModalPassenger.id}`);
      } else {
        await api.post(`/api/bookings/${trip.id}/cancel`);
      }
      setCancelModalTrip(null);
      setCancelModalPassenger(null);
      fetchTrips();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleDownloadPDF = async (trip: any) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const margin = 10;
    let yPos = margin;

    const fontName = 'helvetica';

    const drawLine = (y: number) => {
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, y, pageWidth - margin, y);
    };

    const dashedLine = (y: number) => {
      pdf.setLineDashPattern([2, 2], 0);
      pdf.setDrawColor(180, 180, 180);
      pdf.line(margin, y, pageWidth - margin, y);
      pdf.setLineDashPattern([], 0);
    };

    const depDate = new Date(trip.flight.departureTime);
    const arrDate = new Date(trip.flight.arrivalTime);
    const passengerCount = trip.passengers?.length || 1;
    const baggageFee = passengerCount * 200;
    const bookingFee = passengerCount * 150;
    const baseFare = trip.totalFare - baggageFee - bookingFee;

    // Header
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(245, 158, 11);
    pdf.text('AURA AIRWAYS', margin, 13);
    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184);
    pdf.text('E-TICKET  |  NON-TRANSFERABLE', margin, 20);
    pdf.setFontSize(7);
    pdf.setTextColor(245, 158, 11);
    pdf.text(`PNR: ${trip.pnr}`, pageWidth - margin - 40, 13);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Status: ${trip.status}`, pageWidth - margin - 40, 20);

    yPos = 38;

    // Route
    pdf.setFillColor(245, 247, 250);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 24, 'F');
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(15, 23, 42);
    pdf.text(trip.flight.sourceAirport.code, margin + 6, yPos + 15);
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(trip.flight.sourceAirport.city, margin + 6, yPos + 21);
    pdf.setFontSize(20);
    pdf.setTextColor(15, 23, 42);
    pdf.text(trip.flight.destinationAirport.code, pageWidth - margin - 28, yPos + 15);
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(trip.flight.destinationAirport.city, pageWidth - margin - 30, yPos + 21);
    pdf.setFontSize(14);
    pdf.setTextColor(245, 158, 11);
    pdf.text('>>', pageWidth / 2 - 5, yPos + 15);

    yPos += 32;

    // Flight Details
    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text('AIRLINE', margin + 2, yPos);
    pdf.text('FLIGHT NO.', margin + 48, yPos);
    pdf.text('DEPARTURE', margin + 95, yPos);
    pdf.text('ARRIVAL', margin + 140, yPos);
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(trip.flight.airline.name, margin + 2, yPos + 6);
    pdf.text(trip.flight.flightNumber, trip.flight.flightNumber.length > 5 ? margin + 45 : margin + 48, yPos + 6);
    pdf.text(depDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), margin + 95, yPos + 6);
    pdf.text(arrDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), margin + 140, yPos + 6);

    yPos += 20;
    drawLine(yPos);
    yPos += 6;

    // Passenger Table Header
    pdf.setFillColor(15, 23, 42);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(245, 158, 11);
    pdf.text('NO.', margin + 2, yPos + 5.5);
    pdf.text('PASSENGER NAME', margin + 12, yPos + 5.5);
    pdf.text('GENDER', margin + 65, yPos + 5.5);
    pdf.text('PASSPORT/ID', margin + 85, yPos + 5.5);
    pdf.text('SEAT', margin + 115, yPos + 5.5);
    pdf.text('CLASS', margin + 135, yPos + 5.5);
    pdf.text('NATIONALITY', margin + 160, yPos + 5.5);

    yPos += 10;

    (trip.passengers || []).forEach((p: any, idx: number) => {
      const rowY = yPos;
      if (idx % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(margin, rowY - 2, pageWidth - 2 * margin, 10, 'F');
      }
      pdf.setFont(fontName, 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`${idx + 1}`, margin + 2, rowY + 5);
      pdf.text(`${p.firstName.toUpperCase()} ${p.lastName.toUpperCase()}`, margin + 12, rowY + 5);
      pdf.setFont(fontName, 'normal');
      pdf.setTextColor(71, 85, 105);
      pdf.text(p.gender, margin + 65, rowY + 5);
      pdf.text(p.passportNumber, margin + 85, rowY + 5);
      pdf.setFont(fontName, 'bold');
      pdf.setTextColor(245, 158, 11);
      pdf.text(p.seat?.seatNumber || '-', margin + 115, rowY + 5);
      pdf.setFont(fontName, 'normal');
      pdf.setTextColor(71, 85, 105);
      pdf.text(p.seat?.cabinClass || '-', margin + 135, rowY + 5);
      pdf.text(p.nationality || '-', margin + 160, rowY + 5);
      yPos += 11;
    });

    yPos += 4;
    dashedLine(yPos);
    yPos += 8;

    // Fare
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text('FARE BREAKDOWN', margin + 2, yPos);
    yPos += 7;

    [
      ['Base Fare', `INR ${baseFare.toFixed(2)}`],
      [`Baggage Fee (${passengerCount} × Rs. 200)`, `INR ${baggageFee.toFixed(2)}`],
      [`Booking Fee (${passengerCount} × Rs. 150)`, `INR ${bookingFee.toFixed(2)}`],
    ].forEach(([label, value]) => {
      pdf.setFont(fontName, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      pdf.text(label, margin + 4, yPos);
      pdf.setTextColor(15, 23, 42);
      pdf.text(value, pageWidth - margin - 4, yPos, { align: 'right' });
      yPos += 7;
    });

    if (trip.status === 'CANCELLED' && trip.refundAmount !== undefined) {
      drawLine(yPos);
      yPos += 6;
      pdf.setFont(fontName, 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(239, 68, 68);
      pdf.text('CANCELLED — REFUND DETAILS', margin + 4, yPos);
      yPos += 6;
      pdf.setFont(fontName, 'normal');
      pdf.text(`Refund Amount: INR ${trip.refundAmount.toFixed(2)}`, margin + 4, yPos);
      yPos += 6;
      pdf.text(`Cancellation Charge: INR ${trip.cancellationPenalty?.toFixed(2) || '0.00'}`, margin + 4, yPos);
      yPos += 6;
    }

    drawLine(yPos);
    yPos += 6;
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text('TOTAL FARE PAID', margin + 4, yPos);
    pdf.setTextColor(245, 158, 11);
    pdf.text(`INR ${trip.totalFare}`, pageWidth - margin - 4, yPos, { align: 'right' });

    // Footer
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 285, pageWidth, 12, 'F');
    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Issued: ${new Date(trip.bookingDate).toLocaleString('en-IN')}   |   PNR: ${trip.pnr}   |   Aura Airways`, pageWidth / 2, 291, { align: 'center' });

    pdf.save(`AuraAirways_${trip.pnr}_ETicket.pdf`);
  };

  const filteredTrips = trips.filter(trip => {
    const depDate = new Date(trip.flight.departureTime);
    const now = new Date();
    if (activeTab === 'upcoming') {
      return depDate >= now;
    } else {
      return depDate < now;
    }
  });

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-10 space-y-8 text-slate-800 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
        <div className="text-left">
          <h2 className="font-display font-extrabold text-3xl bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            My Booked Trips
          </h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Manage your airline bookings, download your boarding pass tickets, or cancel your booking.
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10 cursor-pointer font-display"
        >
          <Plane className="h-4 w-4" /> Book New Flight
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-white/10 pb-4 mb-6">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-2 px-4 text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'upcoming'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          Upcoming Trips
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`pb-2 px-4 text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'past'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          Past Trips
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="glass-card rounded-2xl h-24 w-full animate-pulse border border-slate-200/50 dark:border-white/5"></div>
          ))}
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-slate-200 dark:border-white/5 max-w-md mx-auto space-y-5">
          <div className="h-16 w-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <Calendar className="h-8 w-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">No {activeTab === 'upcoming' ? 'Upcoming' : 'Past'} Trips Found</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
              {activeTab === 'upcoming'
                ? "You don't have any active upcoming flight bookings. Find your next destination and secure your seat!"
                : "You don't have any completed past flight bookings."}
            </p>
          </div>
          {activeTab === 'upcoming' && (
            <button
              onClick={() => navigate('/')}
              className="bg-amber-500 hover:bg-amber-600 text-brand-900 font-bold px-6 py-3 rounded-xl text-xs cursor-pointer shadow-lg shadow-amber-500/25 animate-in fade-in duration-200"
            >
              Search Flights Now
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredTrips.map(trip => {
            const depDate = new Date(trip.flight.departureTime);
            const isConfirmed = trip.status === 'CONFIRMED' || trip.status === 'PARTIALLY_CANCELLED';
            const isCancelled = trip.status === 'CANCELLED';
            const isExpanded = expandedId === trip.id;
            const refundInfo = isConfirmed ? computeRefundTier(trip.flight.departureTime, trip.totalFare) : null;

            return (
              <div
                key={trip.id}
                className={`glass-card rounded-3xl border transition-all duration-300 overflow-hidden ${
                  isCancelled
                    ? 'border-rose-100 dark:border-rose-500/10 bg-rose-50/5 dark:bg-rose-950/5 opacity-85 shadow-sm'
                    : 'border-slate-200 dark:border-white/5 hover:border-amber-400/30 dark:hover:border-amber-500/20 shadow-md'
                }`}
              >
                {/* Boarding Pass Summary Header */}
                <div 
                  onClick={() => toggleExpand(trip.id)}
                  className="p-6 flex flex-col lg:flex-row items-stretch lg:items-center gap-6 cursor-pointer select-none hover:bg-slate-50/40 dark:hover:bg-white/[0.01] transition-colors"
                >
                  {/* Left Side: Flight & PNR info */}
                  <div className="flex items-center gap-4 min-w-[240px]">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${
                      isCancelled
                        ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
                    }`}>
                      {isCancelled ? <XCircle className="h-7 w-7" /> : <Plane className="h-7 w-7" />}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-500 tracking-wider">
                        PNR: {trip.pnr}
                      </p>
                      <h4 className="font-display font-black text-slate-900 dark:text-white text-base mt-0.5 leading-tight">
                        {trip.flight.airline.name} · {trip.flight.flightNumber}
                      </h4>
                      <div className="space-y-0.5 mt-1 text-[11px] text-slate-500 dark:text-gray-400">
                        <p>Booked: {new Date(trip.bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        <p className="font-bold text-slate-600 dark:text-white">
                          Trip Date : {depDate.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
 
                  {/* Center: Flightpath Flight Route display */}
                  <div className="flex-1 flex items-center justify-between gap-4 px-4 min-w-[320px]">
                    <div className="text-right flex-1">
                      <p className="text-xl font-black text-slate-800 dark:text-white leading-none">{trip.flight.sourceAirport.code}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 font-semibold leading-none">{trip.flight.sourceAirport.city}</p>
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-500 mt-1 leading-none">
                        {depDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[9px] text-slate-400 dark:text-gray-500 line-clamp-1 mt-1 leading-none" title={trip.flight.sourceAirport.name}>
                        {trip.flight.sourceAirport.name}
                      </p>
                    </div>
                    
                    {/* Path graphic line */}
                    <div className="flex-[1.5] flex flex-col items-center relative py-2 shrink-0 justify-center">
                      <div className="w-full flex items-center justify-between relative px-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-gray-500" />
                        <div className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-white/20 mx-1" />
                        <Plane className="h-4 w-4 text-amber-500 absolute left-1/2 -translate-x-1/2 rotate-90" />
                        <div className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-white/20 mx-1" />
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-gray-500" />
                      </div>
                    </div>

                    <div className="text-left flex-1">
                      <p className="text-xl font-black text-slate-800 dark:text-white leading-none">{trip.flight.destinationAirport.code}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 font-semibold leading-none">{trip.flight.destinationAirport.city}</p>
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-500 mt-1 leading-none">
                        {new Date(trip.flight.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[9px] text-slate-400 dark:text-gray-500 line-clamp-1 mt-1 leading-none" title={trip.flight.destinationAirport.name}>
                        {trip.flight.destinationAirport.name}
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Status & Expand controls */}
                  <div className="flex items-center justify-end gap-6 shrink-0 border-t lg:border-t-0 border-slate-100 dark:border-white/5 pt-4 lg:pt-0">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                        isConfirmed
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : trip.status === 'PARTIALLY_CANCELLED'
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                      }`}>
                        {trip.status}
                      </span>
                      <div className="h-8 w-8 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-center bg-white dark:bg-slate-900/60 hover:border-amber-400 hover:text-amber-500 transition-colors">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-amber-500" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-t border-slate-200/50 dark:border-white/10 bg-slate-50/[0.4] dark:bg-slate-950/20 p-6 space-y-6">
                    
                    {/* Passengers Section (Cards layout instead of block table) */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                        <User className="h-4 w-4 text-amber-500" />
                        <span>Passenger & Seating Layout</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(trip.passengers || []).map((p, idx) => (
                          <div key={p.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-10 w-10 bg-amber-500/5 rounded-bl-full flex items-center justify-center">
                              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400/80 mr-1 mt-1">#{idx + 1}</span>
                            </div>
                            
                            <div className="space-y-1.5 text-left">
                              <p className="font-display font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                                {p.firstName} {p.lastName}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-gray-400">
                                <span>{p.gender}</span>
                                <span>•</span>
                                <span>{p.nationality}</span>
                              </div>
                              <p className="text-[10px] font-mono text-slate-500 dark:text-gray-300">
                                🛂 {p.passportNumber ? (p.passportNumber.length > 3 ? '***' + p.passportNumber.slice(-3) : '***') : 'N/A'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  (p.status === 'CANCELLED' || isCancelled)
                                    ? 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {(p.status === 'CANCELLED' || isCancelled) ? 'CANCELLED (CAN)' : 'CONFIRMED (CNF)'}
                                </span>
                                {isConfirmed && p.status !== 'CANCELLED' && !isCancelled && refundInfo?.canCancel && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCancelModalTrip(trip);
                                      setCancelModalPassenger(p);
                                      generateCaptcha();
                                    }}
                                    className="text-[9px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold px-2 py-0.5 rounded transition-colors cursor-pointer border border-rose-300/20"
                                  >
                                    Cancel Passenger
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 flex flex-col items-center">
                                <span className="text-[8px] uppercase font-bold text-amber-600 dark:text-amber-500 tracking-wider">Seat</span>
                                <span className="text-sm font-black font-mono text-slate-800 dark:text-amber-400 leading-tight">
                                  {p.seat?.seatNumber || 'N/A'}
                                </span>
                                <span className="text-[8px] text-slate-400 dark:text-gray-400 capitalize">
                                  {p.seat?.cabinClass?.toLowerCase() || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial Receipt & Cancellation Modules */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Premium E-Receipt Card */}
                      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl p-5 space-y-4 shadow-sm text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[10px]">
                          <Receipt className="h-3.5 w-3.5 text-amber-500" />
                          <span>Fare Details</span>
                        </div>

                        {(() => {
                          const pCount = trip.passengers?.length || 1;
                          const bag = pCount * 200;
                          const bkf = pCount * 150;
                          const base = trip.totalFare - bag - bkf;
                          return (
                            <div className="space-y-2 text-slate-500 dark:text-gray-400">
                              <div className="flex justify-between">
                                <span>Base Fare</span>
                                <span className="font-semibold text-slate-700 dark:text-gray-200">₹{base.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Baggage Fee ({pCount} × ₹200)</span>
                                <span className="font-semibold text-slate-700 dark:text-gray-200">₹{bag.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Booking Fee ({pCount} × ₹150)</span>
                                <span className="font-semibold text-slate-700 dark:text-gray-200">₹{bkf.toFixed(2)}</span>
                              </div>

                              <div className="border-t border-dashed border-slate-200 dark:border-white/10 my-2" />

                              <div className="flex justify-between font-extrabold text-slate-900 dark:text-white text-xs">
                                <span>Total Paid Amount</span>
                                <span className="text-amber-500 font-bold">₹{trip.totalFare}</span>
                              </div>
                              
                              {isCancelled && trip.refundAmount !== undefined && (
                                <div className="mt-4 pt-3 border-t border-rose-100 dark:border-rose-900 space-y-1.5 text-rose-600 dark:text-rose-400">
                                  <div className="flex justify-between">
                                    <span className="font-bold text-green-600 dark:text-green-400">Refunded Amount</span>
                                    <span className="font-bold text-green-600 dark:text-green-400">₹{trip.refundAmount.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-bold text-rose-600 dark:text-rose-400">Cancellation Charges</span>
                                    <span className="font-bold text-rose-600 dark:text-rose-400">₹{trip.cancellationPenalty?.toFixed(2) || '0.00'}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Real-time Cancellation / Policy Card */}
                      {isConfirmed && refundInfo && (
                        <div className="bg-amber-500/5 border border-amber-500/10 dark:border-amber-500/5 rounded-2xl p-5 space-y-4 shadow-sm text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider text-[10px]">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                              <span>Dynamic Cancellation Policy</span>
                            </div>
                            <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full text-[8px] font-mono uppercase tracking-wider">
                              Real-Time Refund Tier
                            </span>
                          </div>

                          <div className="space-y-1.5 border-b border-amber-500/10 pb-3">
                            {REFUND_TIERS.map((tier, i) => {
                              const isActive = tier.label === refundInfo.label;
                              return (
                                <div key={i} className={`flex justify-between items-center text-[10px] py-0.5 px-2 rounded ${
                                  isActive 
                                    ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300 font-extrabold shadow-sm'
                                    : 'text-slate-400 dark:text-gray-500'
                                }`}>
                                  <span>{tier.label}</span>
                                  <span>{tier.refund}% refund</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-slate-500 dark:text-gray-400">
                              <span>Estimated Refund (Current)</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₹{refundInfo.refundAmt.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 dark:text-gray-400">
                              <span>Cancellation Charge (Current)</span>
                              <span className="font-bold text-rose-500 dark:text-rose-400">₹{refundInfo.chargeAmt.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cancelled Refund Status Block */}
                      {isCancelled && trip.refundAmount !== undefined && (
                        <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 space-y-3 text-xs text-left">
                          <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-[10px]">
                            <Info className="h-3.5 w-3.5" />
                            <span>Cancellation Summary</span>
                          </div>
                          
                          <div className="space-y-2 text-slate-700 dark:text-gray-400">
                            <div className="flex justify-between items-center">
                              <span>Refund Transaction Status</span>
                              <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wider">Initiated</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Credited Refund</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{trip.refundAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Applied Penalty Charge</span>
                              <span className="font-bold text-rose-500 dark:text-rose-400">₹{trip.cancellationPenalty?.toFixed(2) || '0.00'}</span>
                            </div>
                            <p className="text-[9px] text-slate-400 dark:text-gray-500 leading-relaxed pt-1.5 border-t border-slate-200/50 dark:border-white/5">
                              * Refund has been dispatched to your original transaction card/UPI. It usually takes 5-7 business days to reflect in your bank account statements.
                            </p>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Expand Footer Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200/50 dark:border-white/10">
                      <button
                        onClick={() => handleDownloadPDF(trip)}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/15 cursor-pointer font-display"
                      >
                        <Download className="h-3.5 w-3.5" /> Download Boarding Pass
                      </button>

                      <button
                        onClick={() => navigate('/success', { state: { booking: trip } })}
                        className="border border-slate-200 dark:border-white/10 hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/40 font-bold text-slate-700 dark:text-gray-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plane className="h-3.5 w-3.5 text-amber-500" /> View E-Ticket Invoice
                      </button>

                      {isConfirmed && refundInfo?.canCancel && (
                        <button
                          onClick={() => { setCancelModalTrip(trip); generateCaptcha(); }}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-300/30 ml-auto"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel Flight
                        </button>
                      )}

                      {isConfirmed && !refundInfo?.canCancel && (
                        <span className="text-[10px] text-rose-500 dark:text-rose-400 flex items-center gap-1.5 ml-auto font-bold bg-rose-500/5 px-3 py-1.5 rounded-lg border border-rose-300/15">
                          <Clock className="h-3.5 w-3.5" /> Flight Departed (Cancellation Closed)
                        </span>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Flight Cancellation Verification Modal Overlay */}
      {cancelModalTrip && (() => {
        const passengerCount = cancelModalTrip.passengers.length;
        const fareShare = cancelModalPassenger 
          ? cancelModalTrip.totalFare / passengerCount
          : cancelModalTrip.totalFare;
        const refundInfo = computeRefundTier(cancelModalTrip.flight.departureTime, fareShare);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2 text-rose-500">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                    Confirm Cancellation ({cancelModalPassenger ? 'Passenger Ticket' : 'Full Booking'})
                  </h3>
                </div>
                <button
                  onClick={() => { setCancelModalTrip(null); setCancelModalPassenger(null); }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {/* Details banner */}
              <div className="mb-4 text-xs bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-white/5 space-y-1 text-slate-800 dark:text-white">
                <p className="font-bold text-slate-700 dark:text-gray-300">PNR: {cancelModalTrip.pnr}</p>
                {cancelModalPassenger && (
                  <p className="text-slate-600 dark:text-gray-400">
                    Passenger: <strong className="text-rose-500">{cancelModalPassenger.firstName} {cancelModalPassenger.lastName}</strong>
                  </p>
                )}
                <p className="text-[10px] text-slate-400">Flight: {cancelModalTrip.flight.flightNumber} ({cancelModalTrip.flight.sourceAirport.code} &rarr; {cancelModalTrip.flight.destinationAirport.code})</p>
              </div>

              {/* Dynamic Cancellation Policy details */}
              <div className="space-y-4">
                <div className="bg-amber-500/5 dark:bg-amber-500/[0.02] border border-amber-500/10 rounded-2xl p-4 text-xs">
                  <h4 className="font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider text-[10px] mb-2">
                    Aura Airways Cancellation Policy
                  </h4>
                  <div className="space-y-1.5 text-slate-500 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>&ge; 24 hours before departure</span>
                      <span className="font-semibold text-slate-700 dark:text-gray-300">90% refund</span>
                    </div>
                    <div className="flex justify-between">
                      <span>12&ndash;24 hours before departure</span>
                      <span className="font-semibold text-slate-700 dark:text-gray-300">75% refund</span>
                    </div>
                    <div className="flex justify-between">
                      <span>4&ndash;12 hours before departure</span>
                      <span className="font-semibold text-slate-700 dark:text-gray-300">50% refund</span>
                    </div>
                    <div className="flex justify-between text-rose-500">
                      <span>&lt; 4 hours before departure</span>
                      <span className="font-bold">0% refund</span>
                    </div>
                  </div>
                </div>

                {/* Current Refund Projection */}
                {refundInfo && (
                  <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 text-xs space-y-2">
                    <h4 className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-[10px]">
                      Real-Time Refund Estimate ({cancelModalPassenger ? 'This Passenger Only' : 'All Passengers'})
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-slate-600 dark:text-gray-300">
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-semibold">Cancellation Charge ({refundInfo.chargePct}%)</p>
                        <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">₹{refundInfo.chargeAmt.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-semibold">Estimated Refund</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">₹{refundInfo.refundAmt.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Captcha Verification */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300 block">
                    Captcha Verification
                  </label>
                  <div className="flex items-center gap-3">
                    {/* Captcha Display Box */}
                    <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-base font-bold font-mono tracking-widest text-slate-700 dark:text-slate-300 select-none line-through decoration-slate-400/50 flex items-center justify-center">
                      {captchaCode}
                    </div>
                    {/* Refresh button */}
                    <button
                      type="button"
                      onClick={generateCaptcha}
                      className="p-2 border border-slate-200 dark:border-white/10 hover:border-amber-500 hover:text-amber-500 transition-colors rounded-xl cursor-pointer"
                      title="Generate new captcha"
                    >
                      <RotateCw className="h-4 w-4" />
                    </button>
                    
                    <input
                      type="text"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      placeholder="Enter 6-char captcha"
                      className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:border-amber-500 rounded-xl px-3 py-2 text-xs focus:outline-none placeholder-slate-400 dark:placeholder-gray-500 dark:text-white"
                    />
                  </div>
                  {captchaInput && captchaInput !== captchaCode && (
                    <p className="text-[10px] text-rose-500 font-semibold">Captcha code does not match.</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-white/10 mt-6">
                <button
                  onClick={() => handleCancelBooking(cancelModalTrip)}
                  disabled={cancelLoading || captchaInput !== captchaCode}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/10 cursor-pointer transition-all"
                >
                  {cancelLoading ? (
                    <span className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" /> Confirm & Cancel Ticket</>
                  )}
                </button>
                
                <button
                  onClick={() => { setCancelModalTrip(null); setCancelModalPassenger(null); }}
                  className="border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 font-bold px-5 py-3 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default MyTrips;
