import React from 'react';
import { Navigation } from 'lucide-react';

export default function NavPanel() {
  return (
    <div className="p-4 flex-1 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Navigation className="text-accent w-5 h-5 rotate-45" />
          <h2 className="font-display font-bold text-white text-lg">Wayfinding</h2>
        </div>
        
        <div className="text-center py-12 text-text-secondary border border-dashed border-border rounded-lg p-4 bg-bg/30">
          <p className="text-sm">Select a room or desk on the map to calculate turn-by-turn directions.</p>
        </div>
      </div>
      
      <div className="border-t border-border pt-4 mt-auto">
        <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
          <span>GPS Signal Accuracy</span>
          <span className="text-green-500 font-semibold">Excellent</span>
        </div>
      </div>
    </div>
  );
}
