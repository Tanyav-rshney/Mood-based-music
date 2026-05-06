import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MdHomeFilled, MdSearch, MdLibraryMusic, MdAccountCircle, MdMic, MdDashboard, MdLogout, MdLogin } from 'react-icons/md';
import useUIStore from '../../store/useUIStore';
import useAuthStore from '../../store/useAuthStore';

const FloatingHeader = () => {
  const { setVoiceSearchOpen } = useUIStore();
  const { user, token, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const isLoggedIn = !!token && !!user;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    if (isLoggedIn) {
      setDropdownOpen(!dropdownOpen);
    } else {
      navigate('/login');
    }
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  return (
    <header className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-4xl acrylic rounded-full px-6 py-3 flex items-center justify-between shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-3xl bg-white/5 transition-all hover:bg-white/8">
      
      {/* Brand */}
      <NavLink to="/" className="flex items-center gap-3 font-display font-black text-xl tracking-tighter hover:scale-105 transition-transform cursor-pointer">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center animate-glow-pulse">
           <MdLibraryMusic className="text-white text-lg" />
        </div>
        <span className="hidden sm:inline bg-clip-text text-transparent bg-gradient-to-r from-white to-textMuted">NeonPulse</span>
      </NavLink>

      {/* Navigation - Centered Pills */}
      <nav className="hidden md:flex items-center gap-1 bg-black/60 p-1 rounded-full border border-white/10 shadow-inner">
        <NavLink to="/" end className={({ isActive }) => `px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${isActive ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105' : 'text-textMuted hover:text-white hover:bg-white/10'}`}>
          <MdHomeFilled className="text-lg" /> Home
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${isActive ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105' : 'text-textMuted hover:text-white hover:bg-white/10'}`}>
          <MdSearch className="text-lg" /> Discover
        </NavLink>
        <NavLink to="/favorites" className={({ isActive }) => `px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${isActive ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105' : 'text-textMuted hover:text-white hover:bg-white/10'}`}>
          <MdLibraryMusic className="text-lg" /> Vault
        </NavLink>
        {isLoggedIn && (
          <NavLink to="/dashboard" className={({ isActive }) => `px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${isActive ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105' : 'text-textMuted hover:text-white hover:bg-white/10'}`}>
            <MdDashboard className="text-lg" /> Dashboard
          </NavLink>
        )}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Voice Search Mic Button */}
        <button 
          onClick={() => setVoiceSearchOpen(true)}
          className="relative group w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
        >
          <div className="absolute inset-0 bg-secondary/20 rounded-full group-hover:animate-ping opacity-75"></div>
          <div className="relative z-10 w-full h-full bg-black/40 border border-secondary/50 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:border-secondary">
             <MdMic className="text-xl text-secondary group-hover:text-white transition-colors" />
          </div>
        </button>

        {/* Profile / Auth Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleProfileClick}
            className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-all overflow-hidden"
          >
            {isLoggedIn ? (
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(255,0,127,0.4)]">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            ) : (
              <div className="w-full h-full bg-black/40 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
                <MdAccountCircle className="text-2xl text-textMuted hover:text-white transition-colors" />
              </div>
            )}
          </button>

          {/* Dropdown */}
          {dropdownOpen && isLoggedIn && (
            <div className="absolute right-0 mt-3 w-60 acrylic rounded-2xl py-2 z-50 shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-slide-down">
              {/* User info */}
              <div className="px-4 py-3 border-b border-white/10 mb-1">
                <p className="text-sm font-bold text-white">{user.name}</p>
                <p className="text-xs text-textMuted mt-0.5">{user.email}</p>
              </div>

              {/* Dashboard link */}
              <div className="px-2 py-1">
                <button
                  onClick={() => { navigate('/dashboard'); setDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2.5 text-sm text-textMuted hover:text-secondary hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors"
                >
                  <MdDashboard className="text-lg" /> My Dashboard
                </button>
              </div>

              {/* Logout */}
              <div className="px-2 py-1 border-t border-white/10 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl flex items-center gap-3 transition-colors"
                >
                  <MdLogout className="text-lg" /> Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
    </header>
  );
};

export default FloatingHeader;
