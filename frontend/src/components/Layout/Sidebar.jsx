import React from 'react';
import { NavLink } from 'react-router-dom';
import { MdHomeFilled, MdSearch, MdLibraryMusic, MdAddBox, MdFavorite } from 'react-icons/md';

const Sidebar = () => {
  return (
    <aside className="hidden md:flex flex-col w-[260px] bg-black p-6 h-full flex-shrink-0 text-textMuted">
      <div className="flex items-center gap-2 mb-8 text-textMain font-display font-bold text-2xl tracking-tight cursor-pointer">
        <MdLibraryMusic className="text-3xl text-primary" />
        NeonPulse
      </div>

      <nav className="flex flex-col gap-4 font-semibold text-[15px] mb-8">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center gap-4 transition-all duration-200 hover:text-textMain ${isActive ? 'text-textMain' : ''}`
          }
        >
          <MdHomeFilled className="text-2xl" />
          Home
        </NavLink>

        <NavLink
          to="/search"
          className={({ isActive }) =>
            `flex items-center gap-4 transition-all duration-200 hover:text-textMain ${isActive ? 'text-textMain' : ''}`
          }
        >
          <MdSearch className="text-2xl" />
          Discover
        </NavLink>
      </nav>

      {/* Library Section */}
      <div className="flex flex-col gap-4 font-semibold text-[15px]">
        <div className="flex items-center gap-4 hover:text-textMain cursor-pointer transition-all">
          <div className="bg-textMuted text-black rounded-sm p-1">
            <MdAddBox className="text-xl" />
          </div>
          Create Playlist
        </div>

        <NavLink
          to="/favorites"
          className={({ isActive }) =>
            `flex items-center gap-4 transition-all duration-200 hover:text-textMain ${isActive ? 'text-textMain' : ''}`
          }
        >
          <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-sm p-1">
             <MdFavorite className="text-xl" />
          </div>
          Liked Songs
        </NavLink>
      </div>

      <div className="mt-auto border-t border-surfaceHover pt-6">
         <p className="text-[11px] font-medium leading-loose cursor-pointer hover:underline">Cookies</p>
         <p className="text-[11px] font-medium leading-loose cursor-pointer hover:underline">Privacy Policy</p>
         <div className="mt-4 px-3 py-1.5 border border-textMuted rounded-full w-max text-xs font-bold text-textMain hover:scale-105 cursor-pointer flex items-center gap-1 transition-transform">
           🌐 English
         </div>
      </div>
    </aside>
  );
};

export default Sidebar;
