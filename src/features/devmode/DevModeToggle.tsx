import React, { createContext, useContext, useState } from 'react';
import { FlaskConical } from 'lucide-react';

interface DevModeContextType {
  isDevMode: boolean;
  setIsDevMode: (val: boolean) => void;
  simulatedLocation: { x: number; y: number } | null;
  setSimulatedLocation: (loc: { x: number; y: number } | null) => void;
}

const DevModeContext = createContext<DevModeContextType>({
  isDevMode: false,
  setIsDevMode: () => {},
  simulatedLocation: null,
  setSimulatedLocation: () => {}
});

export const useDevMode = () => useContext(DevModeContext);

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const [isDevMode, setIsDevMode] = useState(false);
  const [simulatedLocation, setSimulatedLocation] = useState<{ x: number; y: number } | null>(null);

  return (
    <DevModeContext.Provider value={{ isDevMode, setIsDevMode, simulatedLocation, setSimulatedLocation }}>
      {children}
    </DevModeContext.Provider>
  );
}

export default function DevModeToggle() {
  const { isDevMode, setIsDevMode, setSimulatedLocation } = useDevMode();

  const handleToggle = () => {
    setIsDevMode(!isDevMode);
    if (isDevMode) {
      setSimulatedLocation(null); // Clear simulated location when turning off
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-all ${
        isDevMode
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.1)] animate-pulse'
          : 'bg-surface border-border text-text-secondary hover:text-text-primary hover:border-text-secondary'
      }`}
      title={isDevMode ? "Disable Developer Mode" : "Enable Developer Mode"}
    >
      <FlaskConical className="w-4 h-4" />
      <span className="hidden sm:inline">{isDevMode ? 'Dev Mode On' : 'Dev Mode'}</span>
    </button>
  );
}
