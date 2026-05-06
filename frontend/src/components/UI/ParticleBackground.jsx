import React, { useMemo } from 'react';

const ParticleBackground = ({ count = 25 }) => {
  const particles = useMemo(() => {
    return [...Array(count)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      delay: `${Math.random() * 20}s`,
      duration: `${15 + Math.random() * 25}s`,
      opacity: Math.random() * 0.4 + 0.1,
      color: Math.random() > 0.5 ? 'bg-primary' : 'bg-secondary',
    }));
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-full ${p.color}`}
          style={{
            left: p.left,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animation: `particle ${p.duration} ${p.delay} linear infinite`,
          }}
        />
      ))}
      {/* Ambient gradient orbs */}
      <div className="absolute top-[15%] left-[10%] w-[40vw] h-[40vw] bg-primary/8 blur-[180px] rounded-full" />
      <div className="absolute bottom-[20%] right-[5%] w-[35vw] h-[35vw] bg-secondary/6 blur-[160px] rounded-full" />
      <div className="absolute top-[60%] left-[50%] w-[25vw] h-[25vw] bg-purple-500/5 blur-[140px] rounded-full" />
    </div>
  );
};

export default ParticleBackground;
