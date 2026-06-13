import { Link, useLocation } from 'react-router-dom';
import { useFloor } from '../../hooks/useFloor';
import { useAuth } from '../../App';
import { signInWithGoogle, signOut } from '../../services/auth';
import DevModeToggle from '../../features/devmode/DevModeToggle';
import { LogIn, LogOut, Map, Shield } from 'lucide-react';

export default function Header() {
  const { currentFloor, setCurrentFloor, floors } = useFloor();
  const { user } = useAuth();
  const location = useLocation();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google Sign-In failed', error);
    }
  };

  return (
    <header className="h-16 bg-surface border-b border-border text-text-primary px-4 sm:px-6 flex items-center justify-between z-50 shadow-md">
      {/* Left side: Logo */}
      <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
        <span className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-1.5 font-display">
          <span>🗺️</span>
          <span>MapMyFloor</span>
        </span>
      </Link>

      {/* Center: Floor Selector */}
      <div className="flex-1 max-w-[200px] mx-4 flex justify-center">
        {location.pathname === '/' && (
          <div className="relative w-full">
            <select
              value={currentFloor?.id || ''}
              onChange={(e) => {
                const selected = floors.find((f) => f.id === e.target.value);
                if (selected) setCurrentFloor(selected);
              }}
              className="w-full bg-surface-alt border border-border text-text-primary rounded-md px-3 py-1.5 pr-8 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all cursor-pointer appearance-none"
            >
              {floors.length === 0 ? (
                <option value="">No Floors Available</option>
              ) : (
                floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    Floor {floor.floorNumber} ({floor.label})
                  </option>
                ))
              )}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-text-secondary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Right side: Dev Mode, Navigation, and Auth */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dev Mode Toggle */}
        <DevModeToggle />

        {/* Admin / Map toggle */}
        {user ? (
          <Link
            to={location.pathname === '/admin' ? '/' : '/admin'}
            className={`p-2 rounded-md border text-sm font-medium transition-all ${
              location.pathname === '/admin'
                ? 'bg-accent/10 border-accent/30 text-accent border-accent/40'
                : 'bg-surface border-border text-text-secondary hover:text-text-primary hover:border-text-secondary'
            }`}
            title={location.pathname === '/admin' ? "View Map" : "Admin Panel"}
          >
            {location.pathname === '/admin' ? (
              <Map className="w-4 h-4" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
          </Link>
        ) : null}

        {/* Auth Button */}
        {user ? (
          <div className="flex items-center gap-2">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border border-border"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <button
              onClick={signOut}
              className="hidden md:flex items-center gap-1.5 bg-surface border border-border text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-md text-sm transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white px-3 py-1.5 rounded-md text-sm font-semibold transition-all shadow-md shadow-accent/20"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
