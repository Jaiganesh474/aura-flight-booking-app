import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Download, Home as HomeIcon, Plane, User } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  flight: {
    flightNumber: string;
    departureTime: string;
    arrivalTime: string;
    durationMinutes: number;
    sourceAirport: { city: string; code: string; name?: string };
    destinationAirport: { city: string; code: string; name?: string };
    airline: { name: string };
  };
  passengers: Passenger[];
}

const Success: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const ticketRef = useRef<HTMLDivElement>(null);
  const booking = location.state?.booking as Booking | undefined;
  
  const [processing, setProcessing] = React.useState(true);

  React.useEffect(() => {
    // 2 seconds delay to display the loading page with warning
    const loadTimer = setTimeout(() => {
      setProcessing(false);
    }, 2000);
    return () => clearTimeout(loadTimer);
  }, []);

  React.useEffect(() => {
    if (booking && !processing) {
      // Small timeout to allow the DOM to render fully before generating PDF
      const timer = setTimeout(() => {
        handleDownloadPDF();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [booking, processing]);

  if (!booking) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-gray-500 mx-auto" />
          <p className="text-sm text-gray-400">No booking transaction details found.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-amber-500 text-brand-900 px-4 py-2 rounded-xl text-xs font-bold"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 py-20">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          {/* Animated Pulsing Icon */}
          <div className="relative h-20 w-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 bg-amber-500/10 rounded-full animate-ping duration-1000"></div>
            <div className="absolute inset-2 bg-amber-500/20 rounded-full animate-pulse"></div>
            <div className="relative h-12 w-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
              <Plane className="h-6 w-6 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white">
              Confirming Your Ticket
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Verifying transaction receipt with Razorpay GDS network...
            </p>
          </div>

          {/* Warning Banner */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <span className="font-bold flex items-center justify-center gap-1.5 uppercase tracking-wider text-[10px]">
              ⚠️ Secure Transaction Check
            </span>
            <p className="font-medium text-center leading-normal">
              Please do not go back, close, or refresh this page.
            </p>
          </div>

          {/* Small Progress Indicator bar */}
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full animate-pulse w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  const depDate = new Date(booking.flight.departureTime);
  const arrDate = new Date(booking.flight.arrivalTime);
  const passengerCount = booking.passengers.length;
  const baggageFee = passengerCount * 200;
  const bookingFee = passengerCount * 150;
  const baseFare = booking.totalFare - baggageFee - bookingFee;

  const handleDownloadPDF = async () => {
    if (!ticketRef.current) return;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const margin = 10;
    let yPos = margin;

    const fontName = 'helvetica';

    // Helper draw functions
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

    // ─── HEADER BANNER ─────────────────────────────────────────────────────────
    pdf.setFillColor(15, 23, 42); // dark slate
    pdf.rect(0, 0, pageWidth, 30, 'F');

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(245, 158, 11); // amber-500
    pdf.text('AURA AIRWAYS', margin, 13);

    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184); // slate-400
    pdf.text('E-TICKET  |  NON-TRANSFERABLE', margin, 20);

    pdf.setFontSize(7);
    pdf.setTextColor(245, 158, 11);
    pdf.text(`PNR: ${booking.pnr}`, pageWidth - margin - 40, 13);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Status: ${booking.status}`, pageWidth - margin - 40, 20);

    yPos = 38;

    // ─── FLIGHT ROUTE BANNER ──────────────────────────────────────────────────
    pdf.setFillColor(245, 247, 250);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 24, 'F');

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(15, 23, 42);
    pdf.text(booking.flight.sourceAirport.code, margin + 6, yPos + 15);

    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(booking.flight.sourceAirport.city, margin + 6, yPos + 21);

    pdf.setFontSize(20);
    pdf.setTextColor(15, 23, 42);
    const destX = pageWidth - margin - 28;
    pdf.text(booking.flight.destinationAirport.code, destX, yPos + 15);

    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(booking.flight.destinationAirport.city, destX - 2, yPos + 21);

    // Arrow
    pdf.setFontSize(14);
    pdf.setTextColor(245, 158, 11);
    pdf.text('>>', pageWidth / 2 - 5, yPos + 15);

    yPos += 32;

    // ─── FLIGHT DETAILS ───────────────────────────────────────────────────────
    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);

    const col1 = margin + 2;
    const col2 = margin + 48;
    const col3 = margin + 95;
    const col4 = margin + 140;

    const labelRow = yPos;
    pdf.text('AIRLINE', col1, labelRow);
    pdf.text('FLIGHT NO.', col2, labelRow);
    pdf.text('DEPARTURE', col3, labelRow);
    pdf.text('ARRIVAL', col4, labelRow);

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);

    pdf.text(booking.flight.airline.name, col1, labelRow + 6);
    pdf.text(booking.flight.flightNumber, col2, labelRow + 6);
    pdf.text(depDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), col3, labelRow + 6);
    pdf.text(arrDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), col4, labelRow + 6);

    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text(depDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), col3, labelRow + 11);
    pdf.text(arrDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), col4, labelRow + 11);

    yPos += 20;
    drawLine(yPos);
    yPos += 6;

    // ─── PASSENGER TABLE HEADER ───────────────────────────────────────────────
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

    // ─── PASSENGER ROWS ───────────────────────────────────────────────────────
    booking.passengers.forEach((p, idx) => {
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

    // ─── FARE BREAKDOWN ───────────────────────────────────────────────────────
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text('FARE BREAKDOWN', margin + 2, yPos);
    yPos += 7;

    const fareRows = [
      ['Base Fare', `INR ${baseFare.toFixed(2)}`],
      [`Baggage Fee (${passengerCount} pax × Rs. 200)`, `INR ${baggageFee.toFixed(2)}`],
      [`Booking Fee (${passengerCount} pax × Rs. 150)`, `INR ${bookingFee.toFixed(2)}`],
    ];

    fareRows.forEach(([label, value]) => {
      pdf.setFont(fontName, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      pdf.text(label, margin + 4, yPos);
      pdf.setTextColor(15, 23, 42);
      pdf.text(value, pageWidth - margin - 4, yPos, { align: 'right' });
      yPos += 7;
    });

    drawLine(yPos);
    yPos += 6;

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text('TOTAL FARE PAID', margin + 4, yPos);
    pdf.setTextColor(245, 158, 11);
    pdf.text(`INR ${booking.totalFare}`, pageWidth - margin - 4, yPos, { align: 'right' });
    yPos += 10;

    dashedLine(yPos);
    yPos += 8;

    // ─── CANCELLATION POLICY ─────────────────────────────────────────────────
    pdf.setFillColor(254, 243, 199); // amber-100
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 30, 'F');
    pdf.setDrawColor(245, 158, 11);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 30, 'S');

    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(120, 53, 15);
    pdf.text('CANCELLATION POLICY (REFUND TIERS)', margin + 4, yPos + 7);

    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(92, 45, 10);
    const policies = [
      '• >= 24 hrs before departure: 10% cancellation charge — 90% refund',
      '• 12-24 hrs before departure: 25% cancellation charge — 75% refund',
      '• 4-12 hrs before departure: 50% cancellation charge — 50% refund',
      '• < 4 hrs before departure: No refund — 100% cancellation charge',
    ];
    policies.forEach((line, i) => {
      pdf.text(line, margin + 4, yPos + 13 + i * 5);
    });

    yPos += 38;

    // ─── FOOTER ──────────────────────────────────────────────────────────────
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 285, pageWidth, 12, 'F');
    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Issued: ${new Date(booking.bookingDate).toLocaleString('en-IN')}   |   PNR: ${booking.pnr}   |   Aura Airways — aura.flights`, pageWidth / 2, 291, { align: 'center' });

    pdf.save(`AuraAirways_${booking.pnr}_ETicket.pdf`);
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-12 space-y-8 text-slate-800 dark:text-gray-100">
      {/* Confirmation Badge */}
      <div className="text-center space-y-3">
        <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
        </div>
        <h2 className="font-display font-bold text-3xl text-slate-900 dark:text-white">Booking Confirmed!</h2>
        <p className="text-xs text-slate-500 dark:text-gray-400">
          Your reservation is verified. Download the PDF ticket below.
        </p>
      </div>

      {/* Ticket Preview */}
      <div ref={ticketRef} className="glass-card rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl">
        {/* Header */}
        <div className="bg-brand-900 dark:bg-slate-950 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Plane className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-display font-bold text-white text-sm">AURA AIRWAYS</p>
              <p className="text-[10px] text-gray-400 font-mono">ELECTRONIC TICKET / E-BOARDING PASS</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-mono">PNR</p>
            <p className="font-mono font-bold text-amber-400 text-base tracking-widest">{booking.pnr}</p>
          </div>
        </div>

        {/* Route Banner */}
        <div className="bg-slate-50 dark:bg-brand-900/60 border-b border-slate-200 dark:border-white/5 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-3xl font-black font-mono text-slate-900 dark:text-white">{booking.flight.sourceAirport.code}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 font-bold mt-1">{booking.flight.sourceAirport.city}</p>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 font-mono">
              {depDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-gray-500">
              {depDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <ArrowRight className="h-6 w-6 text-amber-500" />
            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-mono">{booking.flight.flightNumber}</p>
            <p className="text-[10px] text-slate-400 dark:text-gray-500">{booking.flight.airline.name}</p>
          </div>

          <div className="text-center md:text-right">
            <p className="text-3xl font-black font-mono text-slate-900 dark:text-white">{booking.flight.destinationAirport.code}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 font-bold mt-1">{booking.flight.destinationAirport.city}</p>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 font-mono">
              {arrDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-gray-500">
              {arrDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Passenger Table */}
        <div className="p-6 space-y-3">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-amber-500" /> Passenger Details
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-brand-900 dark:bg-slate-950 text-amber-400">
                  <th className="px-3 py-2 text-left font-bold tracking-wide">#</th>
                  <th className="px-3 py-2 text-left font-bold tracking-wide">Name</th>
                  <th className="px-3 py-2 text-left font-bold tracking-wide">Gender</th>
                  <th className="px-3 py-2 text-left font-bold tracking-wide">Passport/ID</th>
                  <th className="px-3 py-2 text-left font-bold tracking-wide">Nationality</th>
                  <th className="px-3 py-2 text-center font-bold tracking-wide">Seat</th>
                  <th className="px-3 py-2 text-center font-bold tracking-wide">Class</th>
                </tr>
              </thead>
              <tbody>
                {booking.passengers.map((p, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-950/30' : ''}>
                    <td className="px-3 py-2 font-mono text-slate-500 dark:text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2 font-bold text-slate-900 dark:text-white uppercase">{p.firstName} {p.lastName}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-gray-300">{p.gender}</td>
                    <td className="px-3 py-2 font-mono text-slate-600 dark:text-gray-300">
                      {p.passportNumber ? (p.passportNumber.length > 3 ? '***' + p.passportNumber.slice(-3) : '***') : 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-gray-300">{p.nationality}</td>
                    <td className="px-3 py-2 text-center font-bold font-mono text-amber-600 dark:text-amber-400">{p.seat.seatNumber}</td>
                    <td className="px-3 py-2 text-center capitalize text-slate-600 dark:text-gray-300">{p.seat.cabinClass.toLowerCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fare Breakdown */}
        <div className="border-t border-dashed border-slate-200 dark:border-white/10 mx-6" />
        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 text-xs">
            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">Fare Breakdown</p>
            <div className="space-y-1.5 text-slate-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Base Fare</span>
                <span className="font-semibold text-slate-800 dark:text-gray-200">₹{baseFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Baggage Fee ({passengerCount} pax × ₹200)</span>
                <span className="font-semibold text-slate-800 dark:text-gray-200">₹{baggageFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Booking Fee ({passengerCount} pax × ₹150)</span>
                <span className="font-semibold text-slate-800 dark:text-gray-200">₹{bookingFee.toFixed(2)}</span>
              </div>
            </div>
            <div className="border-t border-slate-200 dark:border-white/10 pt-2 flex justify-between font-bold text-sm">
              <span className="text-slate-900 dark:text-white">Total Paid</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">₹{booking.totalFare}</span>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 text-xs space-y-1.5">
            <p className="font-bold text-amber-800 dark:text-amber-400 text-[10px] uppercase tracking-wide">Cancellation Policy</p>
            <div className="space-y-1 text-amber-700 dark:text-amber-300/80 leading-relaxed">
              <p>• ≥ 24 hrs departure — 90% refund</p>
              <p>• 12–24 hrs departure — 75% refund</p>
              <p>• 4–12 hrs departure — 50% refund</p>
              <p>• &lt; 4 hrs departure — No refund</p>
            </div>
          </div>
        </div>

        {/* Footer strip */}
        <div className="bg-brand-900 dark:bg-slate-950 px-6 py-3 flex items-center justify-between text-[10px]">
          <span className="text-gray-400 font-mono">
            Issued: {new Date(booking.bookingDate).toLocaleString('en-IN')}
          </span>
          <span className="text-gray-500">Status: <span className={booking.status === 'CONFIRMED' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{booking.status}</span></span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 print:hidden">
        <button
          onClick={handleDownloadPDF}
          className="bg-amber-500 hover:bg-amber-600 text-brand-900 font-bold px-8 py-3 rounded-xl text-xs flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center shadow-lg shadow-amber-500/20 font-display uppercase tracking-wider"
        >
          <Download className="h-4 w-4" /> Download Ticket PDF
        </button>
        <button
          onClick={() => navigate('/my-trips')}
          className="glass-light hover:bg-white/10 text-slate-700 dark:text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center border border-slate-200 dark:border-white/5"
        >
          View My Trips
        </button>
        <button
          onClick={() => navigate('/')}
          className="glass-light hover:bg-white/10 text-slate-700 dark:text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center border border-slate-200 dark:border-white/5"
        >
          <HomeIcon className="h-4.5 w-4.5 text-amber-500" /> Book Another Trip
        </button>
      </div>
    </div>
  );
};

export default Success;
