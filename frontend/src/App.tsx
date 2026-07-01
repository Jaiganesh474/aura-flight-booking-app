import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AIChatbot from './components/AIChatbot';
import ScrollToTop from './components/ScrollToTop';

// Pages
import Home from './pages/Home';
import FlightResults from './pages/FlightResults';
import SeatSelection from './pages/SeatSelection';
import Checkout from './pages/Checkout';
import Success from './pages/Success';
import MyTrips from './pages/MyTrips';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <AppProvider>
      <Router>
        <ScrollToTop />
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-300 selection:bg-amber-500 selection:text-brand-900">
          <Navbar />
          
          <main className="flex-1 flex flex-col w-full">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<FlightResults />} />
              <Route path="/details/:id" element={<SeatSelection />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/success" element={<Success />} />
              <Route path="/my-trips" element={<MyTrips />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Routes>
          </main>
          
          <AIChatbot />
          <Footer />
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
