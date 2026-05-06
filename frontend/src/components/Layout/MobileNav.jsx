import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MdHomeFilled, MdSearch, MdLibraryMusic, MdDashboard } from 'react-icons/md';
import useAuthStore from '../../store/useAuthStore';

const MobileNav = () => {
  const { user, token } = useAuthStore();
  const isLoggedIn = !!token && !!user;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-2xl border-t border-white/10 py-2 px-4 flex justify-around items-center">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 transition-all duration-200 px-3 py-1 ${
            isActive ? 'text-primary scale-110' : 'text-textMuted hover:text-textMain'
          }`
        }
      >
        <MdHomeFilled className="text-2xl" />
        <span className="text-[10px] uppercase font-bold tracking-wider">Home</span>
      </NavLink>
      
      <NavLink
        to="/search"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 transition-all duration-200 px-3 py-1 ${
            isActive ? 'text-primary scale-110' : 'text-textMuted hover:text-textMain'
          }`
        }
      >
        <MdSearch className="text-2xl" />
        <span className="text-[10px] uppercase font-bold tracking-wider">Discover</span>
      </NavLink>

      <NavLink
        to="/favorites"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 transition-all duration-200 px-3 py-1 ${
            isActive ? 'text-primary scale-110' : 'text-textMuted hover:text-textMain'
          }`
        }
      >
        <MdLibraryMusic className="text-2xl" />
        <span className="text-[10px] uppercase font-bold tracking-wider">Vault</span>
      </NavLink>

      {isLoggedIn && (
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 transition-all duration-200 px-3 py-1 ${
              isActive ? 'text-primary scale-110' : 'text-textMuted hover:text-textMain'
            }`
          }
        >
          <MdDashboard className="text-2xl" />
          <span className="text-[10px] uppercase font-bold tracking-wider">Stats</span>
        </NavLink>
      )}
    </nav>
  );
};

export default MobileNav;
