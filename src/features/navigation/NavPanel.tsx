import React from 'react';
import { Navigation, MapPin, Check, X } from 'lucide-react';
import { Room } from '../../shared/types';

interface NavPanelProps {
  selectedRoom?: Room | null;
}

export default function NavPanel({ selectedRoom }: NavPanelProps) {
  const getRoomTypeLabel = (type: string) => {
    return type.replace('_', ' ').toUpperCase();
  };

  return (
    <div className="p-4 flex-1 flex flex-col justify-between h-full overflow-y-auto">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Navigation className="text-accent w-5 h-5 rotate-45" />
          <h2 className="font-display font-bold text-white text-lg">Wayfinding</h2>
        </div>
        
        {selectedRoom ? (
          <div className="flex flex-col gap-4">
            <div className="bg-surface-alt border border-border rounded-lg p-4 flex flex-col gap-3 shadow-md">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Selected Location</span>
                  <h3 className="text-base font-bold text-white mt-0.5 truncate">{selectedRoom.name}</h3>
                </div>
              </div>

              <div className="border-t border-border pt-3 flex flex-wrap gap-2 items-center justify-between text-xs text-text-secondary">
                <span className="px-2 py-0.5 bg-accent/10 border border-accent/20 text-accent font-medium uppercase text-[10px] rounded-full">
                  {getRoomTypeLabel(selectedRoom.type)}
                </span>
                
                <span className={`px-2 py-0.5 border rounded-full text-[10px] font-medium flex items-center gap-1 uppercase ${
                  selectedRoom.isWalkable 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                }`}>
                  {selectedRoom.isWalkable ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                  <span>{selectedRoom.isWalkable ? 'Walkable' : 'Closed'}</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => alert(`Starting simulated navigation to ${selectedRoom.name}`)}
              className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white font-semibold rounded-md text-sm shadow-md shadow-accent/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Navigation className="w-4 h-4 rotate-45" />
              <span>Start Navigation</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-12 text-text-secondary border border-dashed border-border rounded-lg p-4 bg-bg/30">
            <p className="text-sm">Select a room or desk on the map to calculate turn-by-turn directions.</p>
          </div>
        )}
      </div>
      
      <div className="border-t border-border pt-4 mt-8">
        <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
          <span>GPS Signal Accuracy</span>
          <span className="text-green-500 font-semibold">Excellent</span>
        </div>
      </div>
    </div>
  );
}
