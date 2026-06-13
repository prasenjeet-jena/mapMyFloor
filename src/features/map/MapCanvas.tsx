import React from 'react';
import SearchBar from '../search/SearchBar';
import NavPanel from '../navigation/NavPanel';

export default function MapCanvas() {
  return (
    <div className="flex-1 w-full h-full flex flex-col md:flex-row relative bg-bg overflow-hidden">
      {/* Search Bar Overlay */}
      <div className="absolute top-4 left-4 right-4 md:right-auto md:w-80 z-20">
        <SearchBar />
      </div>

      {/* Main Canvas view area */}
      <div className="flex-1 w-full h-full flex items-center justify-center bg-bg relative">
        {/* Placeholder 2D Canvas */}
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🗺️</div>
          <h2 className="text-xl font-bold text-white mb-1">Map Workspace</h2>
          <p className="text-text-secondary text-sm max-w-md">No floor plans active. Please sign in as an admin and upload a floor plan to begin.</p>
        </div>
      </div>

      {/* Navigation directions overlay / sidebar */}
      <div className="w-full md:w-80 md:h-full bg-surface border-t md:border-t-0 md:border-l border-border z-10 flex flex-col">
        <NavPanel />
      </div>
    </div>
  );
}
