import React from 'react';
import { ShieldCheck, HeartHandshake, HelpCircle } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="glass-card mt-auto border-t border-slate-200 dark:border-white/10 px-8 py-10 text-slate-600 dark:text-gray-400">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Info */}
        <div className="space-y-4 text-left">
          <div className="flex items-center gap-2.5">
            <img 
              src="/airline_logo.png" 
              alt="Aura Airways Logo" 
              className="h-8 w-8 object-cover rounded-lg shadow-md" 
            />
            <span className="font-display text-lg font-bold tracking-wider text-slate-900 dark:text-white">
              AURA AIRWAYS
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-gray-400">
            Experience premium airline bookings. Inspired by elite service, powered by state-of-the-art AI assistance.
          </p>
        </div>

        {/* Links */}
        <div className="text-left">
          <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white mb-4">Bookings</h4>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-gray-400">
            <li className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors cursor-pointer">Search Flight routes</li>
            <li className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors cursor-pointer">Interactive Seat map</li>
            <li className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors cursor-pointer">Coupons &amp; discounts</li>
            <li className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors cursor-pointer">Corporate Travel</li>
          </ul>
        </div>

        {/* Policies */}
        <div className="text-left">
          <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white mb-4">Aura Care</h4>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-gray-400">
            <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" /> Secure Payments</li>
            <li className="flex items-center gap-1.5"><HeartHandshake className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" /> Dynamic Refunds</li>
            <li className="flex items-center gap-1.5"><HelpCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" /> AI FAQ Support</li>
          </ul>
        </div>

        {/* Contact */}
        <div className="text-left">
          <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white mb-4">Support</h4>
          <p className="text-xs text-slate-600 dark:text-gray-400">Email: support@aurajet.com</p>
          <p className="text-xs text-slate-600 dark:text-gray-400 mt-1">Phone: +91 1800 456 AURA</p>
          <p className="text-[10px] text-amber-600 dark:text-amber-500/80 mt-4">© 2026 Aura Monolith Inc.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
