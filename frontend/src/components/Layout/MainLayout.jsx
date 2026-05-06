import React from 'react';
import { Outlet } from 'react-router-dom';
import FloatingHeader from './FloatingHeader';
import MobileNav from './MobileNav';
import FloatingPlayer from '../Player/FloatingPlayer';
import VoiceSearchOverlay from '../UI/VoiceSearchOverlay';
import Toast from '../UI/Toast';
import ParticleBackground from '../UI/ParticleBackground';

const MainLayout = () => {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      
      {/* Particle ambient background */}
      <ParticleBackground count={20} />

      <FloatingHeader />
      
      {/* Main Content Viewport */}
      <main className="absolute inset-0 pt-[100px] overflow-y-auto overflow-x-hidden custom-scrollbar pb-40 z-10 scroll-smooth">
        <Outlet />
      </main>

      <FloatingPlayer />
      <MobileNav />
      <VoiceSearchOverlay />
      <Toast />
    </div>
  );
};

export default MainLayout;
