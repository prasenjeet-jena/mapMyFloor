import React from 'react';
import { Navigation, MapPin, Check, X, AlertTriangle, Clock, Route } from 'lucide-react';
import { Room } from '../../shared/types';

interface NavStep {
  instruction: string;
  distance: number;
}

interface NavPanelProps {
  selectedRoom?: Room | null;
  userPosition?: { x: number; y: number } | null;
  navigationActive?: boolean;
  onStartNavigation?: () => void;
  onClearNavigation?: () => void;
  navSteps?: NavStep[] | null;
  totalDistance?: number;
  walkTimeSeconds?: number;
  navigationError?: string | null;
}

export default function NavPanel({
  selectedRoom,
  userPosition,
  navigationActive = false,
  onStartNavigation,
  onClearNavigation,
  navSteps = null,
  totalDistance = 0,
  walkTimeSeconds = 0,
  navigationError = null
}: NavPanelProps) {
  const getRoomTypeLabel = (type: string) => {
    return type.replace('_', ' ').toUpperCase();
  };

  // Convert seconds to a human-readable minutes/seconds string
  const formatWalkTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins === 0) return `${Math.ceil(seconds)} sec`;
    const secs = Math.round(seconds % 60);
    return secs === 0 ? `${mins} min` : `${mins} min ${secs} sec`;
  };

  return (
    <div className="p-4 flex-1 flex flex-col justify-between h-full overflow-y-auto bg-surface border-border">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
          <Navigation className="text-accent w-5 h-5 rotate-45 animate-pulse" />
          <h2 className="font-display font-bold text-white text-lg">Wayfinding</h2>
        </div>

        {/* 1. Navigation Active: Render turn-by-turn directions */}
        {navigationActive && navSteps ? (
          <div className="flex flex-col gap-4">
            {/* Route Stats Summary */}
            <div className="bg-surface-alt border border-border rounded-lg p-4 flex items-center justify-between shadow-md">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Walking Distance</span>
                <span className="text-lg font-mono font-bold text-white flex items-center gap-1">
                  <Route className="w-4 h-4 text-accent" />
                  <span>{Math.round(totalDistance)} meters</span>
                </span>
              </div>
              <div className="flex flex-col gap-0.5 items-end">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Est. Time</span>
                <span className="text-lg font-mono font-bold text-white flex items-center gap-1">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>{formatWalkTime(walkTimeSeconds)}</span>
                </span>
              </div>
            </div>

            {/* Turn by Turn Directions List */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Turn-by-turn Directions
              </h4>
              <div className="max-h-[350px] overflow-y-auto border border-border rounded-lg p-3.5 bg-bg/50 divide-y divide-border/40 flex flex-col gap-3.5">
                {navSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-3 items-start text-sm pt-2.5 first:pt-0">
                    <div className="w-5 h-5 rounded-full bg-accent/20 text-accent font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 text-text-primary leading-tight flex flex-col gap-0.5">
                      <p className="text-white font-medium">{step.instruction}</p>
                      {step.distance > 0 && (
                        <span className="text-[10px] text-text-secondary font-mono">
                          segment distance: {Math.round(step.distance)} m
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* End Navigation Button */}
            <button
              onClick={onClearNavigation}
              className="w-full py-2.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-semibold rounded-md text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>End Navigation</span>
            </button>
          </div>
        ) : selectedRoom ? (
          /* 2. Destination Selected, Navigation Inactive: Render room details & Start Nav option */
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

            {/* Navigation Error Alert */}
            {navigationError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md text-xs flex items-start gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.05)] select-none animate-pulse">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{navigationError}</span>
              </div>
            )}

            {/* Start Navigation Button */}
            <button
              onClick={onStartNavigation}
              disabled={!userPosition}
              className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:bg-surface-alt disabled:text-text-disabled disabled:border-border border border-accent text-white font-semibold rounded-md text-sm shadow-md shadow-accent/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <Navigation className="w-4 h-4 rotate-45" />
              <span>Start Navigation</span>
            </button>
            {!userPosition && (
              <p className="text-[10px] text-text-secondary text-center">
                Waiting for GPS/position marker to lock before nav path can be calculated.
              </p>
            )}
          </div>
        ) : (
          /* 3. Empty State: Instruct user to choose a target location */
          <div className="text-center py-12 text-text-secondary border border-dashed border-border rounded-lg p-4 bg-bg/30 select-none">
            <Navigation className="w-8 h-8 text-text-disabled mx-auto mb-2.5 opacity-40 animate-pulse" />
            <p className="text-sm">Select a room or desk on the map to calculate turn-by-turn directions.</p>
          </div>
        )}
      </div>
      
      <div className="border-t border-border pt-4 mt-8">
        <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
          <span>GPS Signal Accuracy</span>
          <span className="text-green-500 font-semibold">Excellent</span>
        </div>
      </div>
    </div>
  );
}
