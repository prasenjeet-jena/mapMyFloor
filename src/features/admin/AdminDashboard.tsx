import React, { useEffect, useState } from 'react';
import { Shield, Settings, Plus, Map, Calendar, Layers, Database, ArrowRight, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllFloors, getFloorWithRooms, deleteFloor, FloorListItem } from '../../services/firestore';
import { useFloor } from '../../hooks/useFloor';
import { useAuth } from '../../App';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { setCurrentFloor } = useFloor();
  
  const { user } = useAuth();
  const [floors, setFloors] = useState<FloorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteConfirmFloor, setDeleteConfirmFloor] = useState<FloorListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check user role
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data()?.role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [user]);

  // Toast auto dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleConfirmDelete = async () => {
    if (!deleteConfirmFloor) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteFloor(deleteConfirmFloor.buildingId, deleteConfirmFloor.floorId);
      setToastMessage("Floor plan deleted successfully.");
      const data = await getAllFloors();
      setFloors(data);
    } catch (err: any) {
      console.error("Failed to delete floor plan:", err);
      setError(err?.message || "Failed to delete the selected floor plan.");
    } finally {
      setDeleting(false);
      setDeleteConfirmFloor(null);
    }
  };

  useEffect(() => {
    const fetchFloorsData = async () => {
      try {
        setLoading(true);
        const data = await getAllFloors();
        setFloors(data);
      } catch (err: any) {
        console.error('Failed to load floors in admin dashboard:', err);
        setError('Failed to fetch published floor plans from database.');
      } finally {
        setLoading(false);
      }
    };

    fetchFloorsData();
  }, []);

  const handleFloorClick = async (floorItem: FloorListItem) => {
    try {
      setLoading(true);
      const data = await getFloorWithRooms(floorItem.floorId);
      if (data) {
        setCurrentFloor(data.floor);
        navigate('/');
      } else {
        setError(`Failed to retrieve details for ${floorItem.label}`);
      }
    } catch (err) {
      console.error('Error fetching details for floor:', err);
      setError('Could not open the selected floor plan.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-8 overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-2">
            <Shield className="text-accent w-8 h-8 animate-pulse" />
            <span>Admin Dashboard</span>
          </h1>
          <p className="text-text-secondary text-sm">Configure building boundaries, manage floor layouts, and review AI calibrations.</p>
        </div>
        <Link
          to="/upload"
          className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white px-4 py-2.5 rounded-md text-sm font-semibold transition-all shadow-md shadow-accent/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Floor Plan</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Buildings Metric */}
        <div className="bg-surface border border-border rounded-lg p-5 flex items-center justify-between shadow-md">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Buildings</span>
            <span className="text-2xl font-bold text-white font-mono">
              {Array.from(new Set(floors.map(f => f.buildingId))).length}
            </span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-md">
            <Database className="w-6 h-6" />
          </div>
        </div>

        {/* Floors Metric */}
        <div className="bg-surface border border-border rounded-lg p-5 flex items-center justify-between shadow-md">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Active Floor Plans</span>
            <span className="text-2xl font-bold text-white font-mono">{floors.length}</span>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-md">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Rooms Metric */}
        <div className="bg-surface border border-border rounded-lg p-5 flex items-center justify-between shadow-md">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Rooms Detected</span>
            <span className="text-2xl font-bold text-white font-mono">
              {floors.reduce((acc, f) => acc + f.roomCount, 0)}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-md">
            <Map className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <span>Published Floor Layouts</span>
          {loading && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
        </h2>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-md text-sm flex items-start gap-2 shadow-md">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic List Container */}
        {!loading && floors.length === 0 ? (
          <div className="bg-surface border border-border border-dashed rounded-lg p-12 text-center flex flex-col items-center justify-center min-h-[250px] shadow-sm">
            <Layers className="w-12 h-12 text-text-secondary mb-3 opacity-60" />
            <h3 className="text-lg font-display font-bold text-white mb-1">No floor plans published</h3>
            <p className="text-text-secondary text-sm max-w-sm mb-6">
              Get started by uploading and analyzing your first building schematic layout using Gemini AI.
            </p>
            <Link
              to="/upload"
              className="bg-surface-alt hover:bg-surface border border-border hover:border-text-secondary text-text-primary px-5 py-2.5 rounded-md text-sm font-semibold transition-all"
            >
              Upload Schematic Plan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {floors.map((floor) => (
              <div
                key={floor.floorId}
                onClick={() => handleFloorClick(floor)}
                className="bg-surface hover:bg-surface-alt border border-border hover:border-accent/50 rounded-lg p-5 flex flex-col gap-4 shadow-md transition-all cursor-pointer group hover:scale-[1.01]"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                        {floor.buildingName}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmFloor(floor);
                          }}
                          className="p-1 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded transition-all cursor-pointer"
                          title="Delete Floor Plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <h3 className="text-lg font-display font-bold text-white mt-2 group-hover:text-accent transition-colors truncate">
                      {floor.label}
                    </h3>
                  </div>
                  
                  {floor.imageUrl && (
                    <div className="w-16 h-12 rounded border border-border bg-bg/50 overflow-hidden shrink-0 hidden sm:block">
                      <img 
                        src={floor.imageUrl} 
                        alt="Mini thumbnail" 
                        className="w-full h-full object-cover opacity-80"
                      />
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-3.5 mt-auto flex items-center justify-between text-xs text-text-secondary font-mono">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-text-secondary" />
                    <span>Floor {floor.floorNumber}</span>
                    <span className="text-text-disabled">•</span>
                    <span className="text-emerald-400 font-semibold">{floor.roomCount} Rooms</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(floor.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end text-xs font-semibold text-accent group-hover:translate-x-1 transition-transform self-end">
                  <span className="mr-1">Open Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmFloor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-surface border border-border rounded-lg p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-8 h-8 shrink-0 animate-pulse" />
              <h3 className="text-lg font-display font-bold text-white">Delete Floor Plan?</h3>
            </div>
            <p className="text-text-secondary text-sm">
              Are you sure you want to delete <strong className="text-white">{deleteConfirmFloor.label}</strong> of <strong className="text-white">{deleteConfirmFloor.buildingName}</strong>?
            </p>
            <p className="text-text-disabled text-xs bg-surface-alt/50 border border-border p-2.5 rounded">
              This will permanently delete this floor plan, all its rooms/desks, corridor lines, and the schematic image. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmFloor(null)}
                disabled={deleting}
                className="px-4 py-2 bg-surface-alt hover:bg-surface border border-border text-text-primary text-sm font-semibold rounded cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-surface-alt text-white text-sm font-semibold rounded flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Plan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-lg flex items-center gap-2 animate-bounce">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
