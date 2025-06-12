import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Layouts
import MainLayout from './layouts/MainLayout/MainLayout';

// Public Pages
// import Register from './pages/Register/Register';
// import Login from './pages/Login/Login';
import Search from './pages/Search/Search';
import Booking from './pages/Booking/Booking';
import Confirmation from './pages/Booking/Confirmation/Confirmation';
import Success from './pages/Success/Success';
import Home from './pages/Home/Home';
import Support from './pages/Support';
import Terms from './pages/Terms';
import FAQ from './pages/FAQ';
import CancellationPolicy from './pages/CancellationPolicy';
import PrivacyPolicy from './pages/PrivacyPolicy';

// Protected Pages
import Dashboard from './pages/Admin/Dashboard/Dashboard';
import Profile from './pages/Profile';

const App: React.FC = () => {
  return (
    <Routes>
      {/* 🔓 Public Routes */}
      {/* <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} /> */}
      <Route path="/search" element={<Search />} />
      <Route path="/booking/:id" element={<Booking />} />
      <Route path="/confirmation" element={<Confirmation />} />
      <Route path="/success" element={<Success />} />
      <Route path="/" element={<Home />} />
      <Route path="/support" element={<Support />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/cancellation-policy" element={<CancellationPolicy />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />

      {/* 🔐 Protected Routes with layout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
};

export default App;
