import React from 'react';
import { Search } from 'lucide-react';

export default function SearchBar() {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
        <Search className="w-5 h-5" />
      </div>
      <input
        type="text"
        placeholder="Search rooms, desks, or colleagues..."
        className="w-full bg-surface border border-border text-text-primary pl-10 pr-4 py-2.5 rounded-lg text-sm placeholder-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent shadow-lg transition-all"
      />
    </div>
  );
}
