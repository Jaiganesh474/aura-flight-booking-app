import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { CreditCard, ShieldCheck, Tag, Ticket, User as UserIcon, Lock } from 'lucide-react';

interface Seat {
  id: number;
  seatNumber: string;
  cabinClass: string;
  priceMultiplier: number;
}

interface Flight {
  id: number;
  flightNumber: string;
  baseFare: number;
  sourceAirport: { city: string; code: string };
  destinationAirport: { city: string; code: string };
}

interface PassengerForm {
  firstName: string;
  lastName: string;
  gender: string;
  passportNumber: string;
  nationality: string;
  seatId: number;
  seatNumber: string;
}

interface SavedProfile {
  id: number;
  firstName: string;
  lastName: string;
  gender: string;
  passportNumber: string;
  nationality: string;
}

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { user, selectedFlightId, selectedSeats, setSelectedSeats } = useApp();

  const [flight, setFlight] = useState<Flight | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [passengerForms, setPassengerForms] = useState<PassengerForm[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string>('');
  
  const [bookingLoading, setBookingLoading] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!selectedFlightId || selectedSeats.length === 0) {
      navigate('/');
      return;
    }

    api.get(`/api/flights/details/${selectedFlightId}`)
      .then(res => {
        setFlight(res.data.flight);
        setSeats(res.data.seats);
        
        const forms = selectedSeats.map(seatNum => {
          const seatObj = res.data.seats.find((s: Seat) => s.seatNumber === seatNum);
          return {
            firstName: '',
            lastName: '',
            gender: 'Male',
            passportNumber: '',
            nationality: 'Indian',
            seatId: seatObj ? seatObj.id : 0,
            seatNumber: seatNum,
          };
        });
        setPassengerForms(forms);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (user) {
      api.get('/api/passengers/profiles')
        .then(res => setSavedProfiles(res.data))
        .catch(() => {});
    }
  }, [user]);

  const applyProfile = (index: number, profile: SavedProfile) => {
    const updated = [...passengerForms];
    updated[index] = {
      ...updated[index],
      firstName: profile.firstName,
      lastName: profile.lastName,
      gender: profile.gender,
      passportNumber: profile.passportNumber,
      nationality: profile.nationality,
    };
    setPassengerForms(updated);
  };

  const handlePassengerChange = (index: number, field: keyof PassengerForm, value: string | number) => {
    const updated = [...passengerForms];
    updated[index] = { ...updated[index], [field]: value };
    setPassengerForms(updated);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    try {
      const res = await api.get('/api/coupons');
      const activeCoupons = res.data;
      const matched = activeCoupons.find((c: any) => c.code.toUpperCase() === couponCode.trim().toUpperCase());
      
      if (matched) {
        if (matched.restrictedFlightId && matched.restrictedFlightId !== flight?.id) {
          alert(`This coupon code is only applicable for Flight ID ${matched.restrictedFlightId}`);
          return;
        }
        
        setAppliedCoupon(matched.code);
        const discount = Math.min(subTotal * (matched.discountPercentage / 100), matched.maxDiscount);
        setAppliedDiscount(discount);
      } else {
        alert("Invalid coupon code or coupon expired.");
      }
    } catch (err) {
      console.error("Coupon validation error", err);
      alert("Failed to validate coupon code. Please try again.");
    }
  };

  const totalBasePrice = passengerForms.reduce((sum, f) => {
    const seatObj = seats.find(s => s.id === f.seatId);
    if (seatObj && flight) {
      return sum + (flight.baseFare * seatObj.priceMultiplier);
    }
    return sum;
  }, 0);

  const baggageFee = passengerForms.length * 200;
  const bookingFee = passengerForms.length * 150;
  const subTotal = totalBasePrice + baggageFee + bookingFee;
  const totalDue = subTotal - appliedDiscount;

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flight) return;

    for (const form of passengerForms) {
      if (!form.firstName.trim() || !form.lastName.trim() || !form.passportNumber.trim()) {
        alert("Please fill out all passenger names and passport details.");
        return;
      }
    }

    setBookingLoading(true);

    const submitBooking = async (paymentId: string) => {
      try {
        const payload = {
          flightId: flight.id,
          couponCode: appliedCoupon || null,
          paymentMethod: 'RAZORPAY',
          passengers: passengerForms.map(f => ({
            firstName: f.firstName,
            lastName: f.lastName,
            gender: f.gender,
            passportNumber: f.passportNumber,
            nationality: f.nationality,
            seatId: f.seatId,
          })),
        };

        const response = await api.post('/api/bookings', payload);
        setSelectedSeats([]);
        navigate('/success', { state: { booking: response.data } });
      } catch (err: any) {
        alert(err.response?.data?.message || "Booking transaction failed. Seat might have been booked. Please try again.");
      } finally {
        setBookingLoading(false);
      }
    };

    // Trigger Razorpay payment gateway
    if ((window as any).Razorpay) {
      const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID as string;
      const options = {
        key: rzpKey,
        amount: Math.round(totalDue * 100), // Amount in paise (must be integer)
        currency: "INR",
        name: "Aura Airways",
        description: `Flight Booking — ${passengerForms.length} Passenger(s)`,
        image: "/airline_logo.png",
        handler: function (response: any) {
          submitBooking(response.razorpay_payment_id || "pay_simulated_success");
        },
        prefill: {
          name: user?.username || "Guest Passenger",
          email: user?.email || "passenger@aura.com",
          contact: "",
        },
        notes: {
          passengers: passengerForms.map(p => `${p.firstName} ${p.lastName}`).join(', '),
        },
        theme: {
          color: "#f59e0b",
        },
        modal: {
          ondismiss: function () {
            setBookingLoading(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        alert(`Payment Failed: ${response.error.description}`);
        setBookingLoading(false);
      });
      rzp.open();
    } else {
      // Fallback if Razorpay script hasn't loaded yet
      alert("Payment gateway is loading, please try again in a moment.");
      setBookingLoading(false);
    }
  };

  if (!flight) return null;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-800 dark:text-gray-100">
      
      {/* Passengers Details Form (Left Column) */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white text-left">Passenger Information</h2>
        
        {passengerForms.map((form, idx) => (
          <div key={idx} className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/5 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4.5 w-4.5 text-amber-600 dark:text-amber-500" />
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                  Passenger {idx + 1} (Seat {form.seatNumber})
                </h3>
              </div>

              {/* Saved Profile Quick-fill */}
              {savedProfiles.length > 0 && (
                <select
                  defaultValue=""
                  onChange={e => {
                    const found = savedProfiles.find(p => p.id === Number(e.target.value));
                    if (found) applyProfile(idx, found);
                    e.target.value = '';
                  }}
                  className="text-[10px] bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg px-2 py-1.5 font-medium cursor-pointer focus:outline-none"
                >
                  <option value="" disabled>⚡ Use Saved Traveller</option>
                  {savedProfiles.map(p => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-left">
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-gray-400">First Name</label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => handlePassengerChange(idx, 'firstName', e.target.value)}
                  placeholder="e.g. Rahul"
                  className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-gray-400">Last Name</label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => handlePassengerChange(idx, 'lastName', e.target.value)}
                  placeholder="e.g. Sharma"
                  className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-gray-400">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => handlePassengerChange(idx, 'gender', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option className="text-slate-900">Male</option>
                  <option className="text-slate-900">Female</option>
                  <option className="text-slate-900">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-gray-400">Passport Number</label>
                <input
                  type="text"
                  required
                  value={form.passportNumber}
                  onChange={(e) => handlePassengerChange(idx, 'passportNumber', e.target.value)}
                  placeholder="e.g. Z1234567"
                  className="w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Payment Form */}
        <form onSubmit={handlePaymentSubmit} className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">Secure Checkout</h3>
            </div>
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Razorpay</span>
          </div>

          <div className="text-left space-y-4 text-xs">
            <p className="text-slate-600 dark:text-gray-300">
              Payment will be processed securely through Razorpay Payment Gateway. You can pay using your preferred Credit/Debit Card, UPI (Google Pay, PhonePe, Paytm), Netbanking, or Wallet.
            </p>

            <div className="p-4 rounded-xl bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400 font-semibold">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                <span>100% Secure Transaction SSL Encrypted</span>
              </div>
              <div className="text-[10px] text-slate-400 dark:text-gray-500">
                By clicking pay, you agree to Aura Airways booking cancellation refund parameters.
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={bookingLoading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-55 text-brand-900 font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm font-display uppercase tracking-wider"
          >
            {bookingLoading ? (
              <span className="h-4 w-4 border-2 border-brand-900 border-t-transparent animate-spin rounded-full"></span>
            ) : (
              <>Proceed to payment</>
            )}
          </button>
        </form>
      </div>

      {/* Cart Summary Side Panel */}
      <div className="glass-card rounded-2xl p-6 h-fit space-y-6 border border-slate-200 dark:border-white/5 shadow-2xl">
        <div className="border-b border-slate-200 dark:border-white/10 pb-4 text-left">
          <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold tracking-wider font-mono">BOOKING INVOICE</span>
          <h3 className="font-display font-bold text-slate-900 dark:text-white text-base mt-1">Summary Breakdown</h3>
        </div>

        <div className="space-y-4 text-xs text-left">
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span>Base Fare:</span>
            <span className="text-slate-900 dark:text-white font-mono">₹{totalBasePrice}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span>Baggage Fee:</span>
            <span className="text-slate-900 dark:text-white font-mono">₹{baggageFee}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span>Booking Fee:</span>
            <span className="text-slate-900 dark:text-white font-mono">₹{bookingFee}</span>
          </div>

          {appliedDiscount > 0 && (
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
              <span>Coupon Discount ({appliedCoupon}):</span>
              <span className="font-mono">-₹{appliedDiscount}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-slate-900 dark:text-white font-bold border-t border-slate-200 dark:border-white/5 pt-4">
            <span>Total Amount Due:</span>
            <span className="text-amber-600 dark:text-amber-500 text-lg font-mono">₹{totalDue}</span>
          </div>
        </div>

        {/* Coupon Form */}
        <div className="space-y-2 border-t border-slate-200 dark:border-white/5 pt-4 text-left">
          <label className="text-xs font-semibold text-slate-500 dark:text-gray-400 flex items-center gap-1">
            <Tag className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" /> Apply Coupon Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="e.g. FLY20"
              className="flex-1 bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              className="bg-amber-500 hover:bg-amber-600 text-brand-900 text-xs font-bold px-4 py-1.5 rounded-xl cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="flex gap-2 text-[10px] text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-white/5 text-left">
          <ShieldCheck className="h-4.5 w-4.5 text-amber-600 dark:text-amber-500 shrink-0" />
          <p>SSL Encryption standards applied.</p>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
