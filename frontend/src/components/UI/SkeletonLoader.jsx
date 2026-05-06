import React from 'react';

const SkeletonCard = () => (
  <div className="flex flex-col gap-4 animate-fade-in">
    <div className="w-full aspect-square rounded-2xl skeleton" />
    <div className="flex flex-col gap-2 px-1">
      <div className="h-4 w-3/4 rounded-full skeleton" />
      <div className="h-3 w-1/2 rounded-full skeleton" />
    </div>
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center gap-4 p-3 animate-fade-in">
    <div className="w-10 h-10 rounded-lg skeleton flex-shrink-0" />
    <div className="flex-1 flex flex-col gap-2">
      <div className="h-3.5 w-2/3 rounded-full skeleton" />
      <div className="h-2.5 w-1/3 rounded-full skeleton" />
    </div>
    <div className="h-3 w-12 rounded-full skeleton" />
  </div>
);

const SkeletonLoader = ({ type = 'card', count = 5 }) => {
  if (type === 'row') {
    return (
      <div className="space-y-2">
        {[...Array(count)].map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export default SkeletonLoader;
