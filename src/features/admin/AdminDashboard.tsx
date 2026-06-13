import React from 'react';
import { Shield, Settings, Plus, Map } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-2">
            <Shield className="text-accent w-8 h-8" />
            <span>Admin Dashboard</span>
          </h1>
          <p className="text-text-secondary text-sm">Configure building boundaries, manage floors, and calibrate maps.</p>
        </div>
        <Link
          to="/upload"
          className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white px-4 py-2.5 rounded-md text-sm font-semibold transition-all shadow-md shadow-accent/20"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Floor Plan</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Buildings Config Card */}
        <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-accent/10 text-accent rounded-md">
              <Map className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-white text-lg">Building Calibration</h3>
          </div>
          <p className="text-text-secondary text-sm mb-4">Configure Google Maps Geocoding integration and bounding box coordinate limits.</p>
          <button className="text-accent text-sm font-semibold hover:underline">Manage Bounds →</button>
        </div>

        {/* Floor Management Card */}
        <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-md">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-white text-lg">Floor Plans</h3>
          </div>
          <p className="text-text-secondary text-sm mb-4">View active floors, check scaling (pixels per meter), and review AI-detected rooms.</p>
          <button className="text-amber-400 text-sm font-semibold hover:underline">Manage Floors →</button>
        </div>
      </div>
    </div>
  );
}
