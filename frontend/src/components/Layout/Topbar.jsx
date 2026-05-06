import React, { useState, useEffect, useRef } from 'react';
import { MdAccountCircle, MdNotifications, MdLogout, MdLogin } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';

const Topbar = () => {
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogin = () => {
    // Navigate to the actual login page instead of fake login
    navigate('/login');
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-transparent transition-all duration-300">
      <div className="flex-1">
        {/* Navigation arrows could go here */}
      </div>

      <div className="flex items-center gap-4">
        {/* Premium badge */}
        <button className="hidden md:block py-1.5 px-4 bg-white text-black rounded-full text-sm font-bold hover:scale-105 transition-transform">
          Explore Premium
        </button>
        
        <button className="hidden md:flex p-2 text-textMuted hover:text-textMain hover:bg-black/40 rounded-full transition-colors bg-black/20">
          <MdNotifications className="text-xl" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="p-1 pr-3 bg-black/40 hover:bg-glass border border-transparent hover:border-glassBorder rounded-full flex items-center gap-2 cursor-pointer transition-all"
          >
            <MdAccountCircle className={`text-3xl ${user ? 'text-primary' : 'text-textMuted'}`} />
            <span className="text-sm font-bold text-textMain hidden sm:block">
              {user ? user.name : 'Sign In'}
            </span>
          </div>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 acrylic rounded-xl py-2 z-50 animate-slide-down">
              {user ? (
                <>
                  <div className="px-4 py-3 border-b border-white/10 mb-2">
                    <p className="text-sm font-bold text-textMain">{user.name}</p>
                    <p className="text-xs text-textMuted mt-0.5">{user.email}</p>
                  </div>
                  <div className="px-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm text-textMuted hover:text-primary hover:bg-glass rounded-lg flex items-center gap-3 transition-colors"
                    >
                      <MdLogout className="text-lg" />
                      Log out
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-2">
                  <div className="px-3 py-2 mb-2 text-xs text-textMuted text-center">
                    Sign in to save favorites and access your vault.
                  </div>
                  <button 
                    onClick={handleLogin}
                    className="w-full text-left px-3 py-2.5 text-sm text-white bg-primary/80 hover:bg-primary rounded-lg flex items-center justify-center gap-2 transition-colors font-bold shadow-[0_0_15px_rgba(255,0,127,0.3)]"
                  >
                    <MdLogin className="text-lg" />
                    Sign In
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
