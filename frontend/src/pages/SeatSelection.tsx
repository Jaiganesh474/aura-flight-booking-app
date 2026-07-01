import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { ArrowLeft, ShieldCheck, Ticket } from 'lucide-react';

interface Seat {
  id: number;
  seatNumber: string;
  cabinClass: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  status: 'AVAILABLE' | 'RESERVED' | 'BOOKED' | 'BLOCKED';
  priceMultiplier: number;
}

interface Flight {
  id: number;
  flightNumber: string;
  baseFare: number;
  sourceAirport: { city: string; code: string; name?: string };
  destinationAirport: { city: string; code: string; name?: string };
  departureTime: string;
}

const SeatSelection: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedSeats, setSelectedSeats } = useApp();

  const [flight, setFlight] = useState<Flight | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);

  const [firstLoad, setFirstLoad] = useState(true);

  useEffect(() => {
    const fetchSeats = () => {
      if (firstLoad) setLoading(true);
      api.get(`/api/flights/details/${id}`)
        .then(res => {
          setFlight(res.data.flight);
          const updatedSeats = res.data.seats as Seat[];
          setSeats(updatedSeats);

          // Real-time race condition check: if a seat we selected was booked in the background, deselect it
          setSelectedSeats(prev => {
            const stillAvailable = prev.filter(seatNum => {
              const seatObj = updatedSeats.find(s => s.seatNumber === seatNum);
              return seatObj && seatObj.status === 'AVAILABLE';
            });
            if (stillAvailable.length !== prev.length) {
              alert("⚠️ Notice: One of your selected seats was just booked by another passenger! We have updated your selection.");
            }
            return stillAvailable;
          });
        })
        .catch(err => console.error(err))
        .finally(() => {
          if (firstLoad) {
            setLoading(false);
            setFirstLoad(false);
          }
        });
    };

    fetchSeats();
    const interval = setInterval(fetchSeats, 3000); // 3-second polling for real-time seat availability
    return () => clearInterval(interval);
  }, [id, firstLoad, setSelectedSeats]);

  const handleSeatClick = (seat: Seat) => {
    if (seat.status !== 'AVAILABLE') return;
    
    if (selectedSeats.includes(seat.seatNumber)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seat.seatNumber));
    } else {
      if (selectedSeats.length >= 4) {
        alert("You can select a maximum of 4 seats per booking.");
        return;
      }
      setSelectedSeats([...selectedSeats, seat.seatNumber]);
    }
  };

  const getSeatColor = (seat: Seat) => {
    const isSelected = selectedSeats.includes(seat.seatNumber);
    if (isSelected) {
      return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-brand-900 border-amber-300 shadow-lg shadow-amber-500/20';
    }
    if (seat.status !== 'AVAILABLE') {
      return 'bg-slate-200 dark:bg-slate-900 text-slate-400 dark:text-gray-600 border-slate-300 dark:border-white/5 cursor-not-allowed';
    }

    switch (seat.cabinClass) {
      case 'BUSINESS':
        return 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-500/50 hover:bg-amber-500/20';
      case 'PREMIUM_ECONOMY':
        return 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-500/50 hover:bg-indigo-500/20';
      case 'ECONOMY':
      default:
        return 'bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-500/50 hover:bg-teal-500/20';
    }
  };

  const handleProceed = () => {
    if (selectedSeats.length === 0) {
      alert("Please select at least one seat.");
      return;
    }
    navigate('/checkout');
  };

  const totalBasePrice = selectedSeats.reduce((sum, seatNum) => {
    const seatObj = seats.find(s => s.seatNumber === seatNum);
    if (seatObj && flight) {
      return sum + (flight.baseFare * seatObj.priceMultiplier);
    }
    return sum;
  }, 0);

  const baggageFee = selectedSeats.length * 200;
  const bookingFee = selectedSeats.length * 150;
  const estimatedTotal = totalBasePrice + baggageFee + bookingFee;

  if (loading || !flight) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 dark:text-gray-400">Loading live cabin seat layout...</p>
        </div>
      </div>
    );
  }

  const rowNumbers = Array.from(new Set(seats.map(s => parseInt(s.seatNumber))));
  rowNumbers.sort((a, b) => a - b);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-800 dark:text-gray-100">
      
      {/* Header Back Button */}
      <div className="lg:col-span-3">
        <button
          onClick={() => navigate('/search')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-500 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to flight schedules
        </button>
      </div>

      {/* Interactive fuselage container */}
      <div className="lg:col-span-2 glass-card rounded-3xl p-6 md:p-8 flex flex-col items-center border border-slate-200 dark:border-white/5 shadow-2xl relative overflow-hidden">
        
        {/* Airplane Nose simulation */}
        <div className="w-48 h-16 rounded-t-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900/50 relative flex items-center justify-center mb-10">
          <span className="text-[10px] text-slate-500 dark:text-gray-500 tracking-widest font-bold">COCKPIT</span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-8 text-[10px] border-b border-slate-200 dark:border-white/5 pb-4 w-full justify-center">
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100 dark:bg-amber-950/40 border border-amber-500/50"></span> Business</div>
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-500/50"></span> Premium Eco</div>
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-teal-100 dark:bg-teal-950/40 border border-teal-500/50"></span> Economy</div>
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-white/5"></span> Booked</div>
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-500"></span> Selected</div>
        </div>

        {/* Seats Grid */}
        <div className="space-y-4 w-full max-w-sm">
          {/* Columns identifiers */}
          <div className="grid grid-cols-8 gap-2 text-center text-xs font-bold text-slate-500">
            <span></span>
            <span>A</span>
            <span>B</span>
            <span>C</span>
            <span className="text-[9px] text-amber-600 dark:text-amber-500/80 font-semibold tracking-wider font-mono">AISLE</span>
            <span>D</span>
            <span>E</span>
            <span>F</span>
          </div>

          {rowNumbers.map(rowNum => {
            return (
              <div key={rowNum} className="grid grid-cols-8 gap-2 items-center">
                <span className="text-center text-[10px] font-bold text-slate-500">{rowNum}</span>
                {['A', 'B', 'C'].map(col => {
                  const seatCode = rowNum + col;
                  const seatObj = seats.find(s => s.seatNumber === seatCode);
                  if (!seatObj) return <span key={seatCode}></span>;
                  return (
                    <button
                      key={seatCode}
                      disabled={seatObj.status !== 'AVAILABLE'}
                      onClick={() => handleSeatClick(seatObj)}
                      className={`h-8 w-8 rounded-lg border text-[9px] font-bold transition-all flex items-center justify-center cursor-pointer ${getSeatColor(seatObj)}`}
                    >
                      {seatCode}
                    </button>
                  );
                })}

                <span className="text-center text-[9px] text-slate-400 dark:text-gray-600 font-mono">|</span>

                {['D', 'E', 'F'].map(col => {
                  const seatCode = rowNum + col;
                  const seatObj = seats.find(s => s.seatNumber === seatCode);
                  if (!seatObj) return <span key={seatCode}></span>;
                  return (
                    <button
                      key={seatCode}
                      disabled={seatObj.status !== 'AVAILABLE'}
                      onClick={() => handleSeatClick(seatObj)}
                      className={`h-8 w-8 rounded-lg border text-[9px] font-bold transition-all flex items-center justify-center cursor-pointer ${getSeatColor(seatObj)}`}
                    >
                      {seatCode}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice Estimations Card */}
      <div className="glass-card rounded-3xl p-6 md:p-8 h-fit space-y-6 border border-slate-200 dark:border-white/5 shadow-2xl">
        <div className="border-b border-slate-200 dark:border-white/10 pb-4 text-left space-y-2">
          <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold tracking-wider">SELECTED FLIGHT</span>
          <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg">{flight.flightNumber}</h3>
          
          <div className="space-y-2 text-xs text-slate-500 dark:text-gray-400">
            <div>
              <p className="font-semibold text-slate-700 dark:text-gray-300">Departure Date:</p>
              <p>{new Date(flight.departureTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date(flight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-gray-300">Origin Hub:</p>
              <p>{flight.sourceAirport.city} - {flight.sourceAirport.name} ({flight.sourceAirport.code})</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-gray-300">Destination Hub:</p>
              <p>{flight.destinationAirport.city} - {flight.destinationAirport.name} ({flight.destinationAirport.code})</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-gray-400 font-semibold">Selected Seats:</span>
            <span className="text-slate-900 dark:text-white font-bold">
              {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
            </span>
          </div>

          <div className="border-t border-slate-200 dark:border-white/5 pt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
              <span>Base Fare:</span>
              <span className="text-slate-900 dark:text-white font-semibold">₹{totalBasePrice}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
              <span>Baggage Fee:</span>
              <span className="text-slate-900 dark:text-white font-semibold">₹{baggageFee}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
              <span>Booking Fee:</span>
              <span className="text-slate-900 dark:text-white font-semibold">₹{bookingFee}</span>
            </div>
            <div className="flex items-center justify-between text-slate-900 dark:text-white font-bold border-t border-slate-200 dark:border-white/5 pt-3">
              <span>Total Estimated:</span>
              <span className="text-amber-600 dark:text-amber-500 text-lg font-bold">₹{estimatedTotal}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <button
            onClick={handleProceed}
            disabled={selectedSeats.length === 0}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-55 text-brand-900 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <Ticket className="h-4.5 w-4.5" /> Proceed to Passenger Details
          </button>
          
          <div className="flex gap-2 text-[10px] text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-white/5 text-left">
            <ShieldCheck className="h-4.5 w-4.5 text-amber-600 dark:text-amber-500 shrink-0" />
            <p>Your locked seats are reserved for 10 minutes to complete checkout transaction details securely.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;
