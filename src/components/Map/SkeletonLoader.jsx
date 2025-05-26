import React from 'react';

export const SkeletonLoader = ({ count = 3 }) => {
  const skeletons = Array.from({ length: count }, (_, i) => (
    <div key={i} className="animate-pulse bg-[#2c2c2c] p-4 rounded-md mb-3">
      <div className="flex items-start space-x-4">
        {/* Logo skeleton */}
        <div className="bg-[#333] w-12 h-12 rounded-md"></div>
        
        {/* Content skeleton */}
        <div className="flex-1">
          {/* Location skeleton */}
          <div className="h-4 bg-[#333] rounded w-3/4 mb-2"></div>
          
          {/* Observer skeleton */}
          <div className="h-3 bg-[#333] rounded w-1/2 mb-2"></div>
          
          {/* Date skeleton */}
          <div className="h-3 bg-[#333] rounded w-2/3"></div>
        </div>
        
        {/* Actions skeleton */}
        <div className="flex flex-col space-y-2">
          <div className="w-8 h-8 bg-[#333] rounded"></div>
          <div className="w-8 h-8 bg-[#333] rounded"></div>
        </div>
      </div>
      
      {/* Species button skeleton */}
      <div className="mt-3">
        <div className="h-8 bg-[#333] rounded w-24"></div>
      </div>
    </div>
  ));
  
  return <>{skeletons}</>;
};

SkeletonLoader.displayName = 'SkeletonLoader'; 