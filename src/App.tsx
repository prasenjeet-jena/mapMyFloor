import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { User } from 'firebase/auth';
import { onAuthStateChanged } from './services/auth';
import Header from './shared/components/Header';
import { FloorContext } from './hooks/useFloor';
import { DevModeProvider } from './features/devmode/DevModeToggle';
import { Floor } from './shared/types';
import { collection, getDocs, query, orderBy, collectionGroup } from 'firebase/firestore';
import { db } from './services/firebase';

// Page components
import MapCanvas from './features/map/MapCanvas';
import AdminDashboard from './features/admin/AdminDashboard';
import UploadPage from './features/upload/UploadPage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function FloorProvider({ children }: { children: React.ReactNode }) {
  const [currentFloor, setCurrentFloor] = useState<Floor | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loadingFloors, setLoadingFloors] = useState(false);

  useEffect(() => {
    const fetchFloors = async () => {
      setLoadingFloors(true);
      try {
        // Query all floors across all buildings
        const snapshot = await getDocs(collectionGroup(db, 'floors'));
        
        const fetchedFloors = snapshot.docs.map(doc => ({
          ...doc.data()
        })) as Floor[];

        // Sort by floorNumber
        fetchedFloors.sort((a, b) => a.floorNumber - b.floorNumber);

        if (fetchedFloors.length > 0) {
          setFloors(fetchedFloors);
          // Only auto-select if one isn't set yet
          setCurrentFloor((prev) => prev || fetchedFloors[0]);
        } else {
          // Provide placeholder floors for visual testing if DB has no data yet
          const placeholders: Floor[] = [
            {
              id: 'floor_1',
              buildingId: 'default',
              floorNumber: 1,
              label: 'Ground Floor Lobby',
              imageUrl: '',
              imageWidth: 2000,
              imageHeight: 1500,
              pixelsPerMeter: 40,
              realWidthMeters: 50,
              realHeightMeters: 37.5,
              walkableGrid: '',
              gridCellSize: 10,
              aiParsed: false,
              scaleManuallyVerified: false
            },
            {
              id: 'floor_5',
              buildingId: 'default',
              floorNumber: 5,
              label: '5th Floor Office',
              imageUrl: '',
              imageWidth: 2480,
              imageHeight: 1754,
              pixelsPerMeter: 42.3,
              realWidthMeters: 58.6,
              realHeightMeters: 41.5,
              walkableGrid: '',
              gridCellSize: 10,
              aiParsed: true,
              scaleManuallyVerified: false
            }
          ];
          setFloors(placeholders);
          setCurrentFloor((prev) => prev || placeholders[1]); // Default to 5th floor
        }
      } catch (err) {
        console.error('Error fetching floors from firestore:', err);
      } finally {
        setLoadingFloors(false);
      }
    };

    fetchFloors();
  }, []);

  return (
    <FloorContext.Provider value={{ currentFloor, setCurrentFloor, floors, setFloors, loadingFloors }}>
      {children}
    </FloorContext.Provider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FloorProvider>
        <DevModeProvider>
          <Router>
            <div className="min-h-screen bg-bg text-text-primary flex flex-col font-sans selection:bg-accent/30 selection:text-white">
              <Header />
              <main className="flex-1 flex flex-col relative overflow-hidden">
                <Routes>
                  <Route path="/" element={<MapCanvas />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/upload" element={<UploadPage />} />
                </Routes>
              </main>
            </div>
          </Router>
        </DevModeProvider>
      </FloorProvider>
    </AuthProvider>
  );
}
