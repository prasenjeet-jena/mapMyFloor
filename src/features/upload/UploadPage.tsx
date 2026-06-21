import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Building2, 
  Layers, 
  Eye, 
  HelpCircle,
  Check,
  X,
  Save
} from 'lucide-react';
import { parseFloorPlan, ParseFloorPlanResponse } from '../../services/floorPlanService';
import { useAuth } from '../../App';
import { uploadFloorPlanImage } from '../../services/storage';
import { ensureAdminUser, saveBuildingAndFloor, saveRooms, saveCorridorGraph } from '../../services/firestore';
import { Building, Floor, Room, CorridorGraph } from '../../shared/types';

export default function UploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Input fields
  const [buildingName, setBuildingName] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [floorLabel, setFloorLabel] = useState('');
  
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ParseFloorPlanResponse | null>(null);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Handle file drop/selection
  const handleFile = (selectedFile: File) => {
    setError(null);
    setResults(null);
    
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['png', 'jpg', 'jpeg', 'svg', 'pdf'];
    
    if (!ext || !validExtensions.includes(ext)) {
      setError(`Invalid file format. Supported formats: ${validExtensions.join(', ').toUpperCase()}`);
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    setFile(selectedFile);

    // Create preview for SVG, PNG, JPG
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    
    if (ext !== 'pdf') {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null); // No direct preview for PDF in img tag
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Submit flow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a floor plan file first.");
      return;
    }
    if (!buildingName.trim()) {
      setError("Please enter a building name.");
      return;
    }
    if (!floorNumber.trim()) {
      setError("Please enter a floor number.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await parseFloorPlan(file);
      console.log("Raw Gemini response received:", response);
      setResults(response);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An unexpected error occurred while communicating with the AI model.");
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // remove non-word characters
      .replace(/[\s_]+/g, '-')  // replace spaces with hyphens
      .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
  };

  // Save Flow
  const handleSavePlan = async () => {
    if (!file) return;
    if (!user) {
      setError("You must be logged in to save floor plans.");
      return;
    }
    if (!results) return;

    setSaving(true);
    setError(null);

    try {
      const buildingId = generateSlug(buildingName);
      const floorId = `floor-${floorNumber}`;

      // 1. Ensure user has the admin role document in Firestore
      await ensureAdminUser(user.uid, user.email, user.displayName);

      // 2. Retrieve image dimensions from conversion result
      const dimensions = {
        width: results.imageWidth,
        height: results.imageHeight
      };

      // 3. Upload the converted PNG to Firebase Storage and get URL
      const imageUrl = await uploadFloorPlanImage(buildingId, floorId, results.pngBlob);

      // 4. Create building metadata
      const building: Building = {
        id: buildingId,
        name: buildingName,
        address: 'Chennai Office Location',
        bounds: {
          nw: { lat: 13.0827, lng: 80.2707 },
          ne: { lat: 13.0827, lng: 80.2715 },
          sw: { lat: 13.0820, lng: 80.2707 },
          se: { lat: 13.0820, lng: 80.2715 }
        },
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      };

      // 5. Create floor metadata
      const floor: Floor = {
        id: floorId,
        buildingId,
        floorNumber: parseInt(floorNumber, 10),
        label: floorLabel || `Floor ${floorNumber}`,
        imageUrl,
        imageWidth: dimensions.width,
        imageHeight: dimensions.height,
        pixelsPerMeter: results.scale.pixelsPerMeter,
        realWidthMeters: results.scale.floorWidthMeters,
        realHeightMeters: results.scale.floorHeightMeters,
        walkableGrid: '', // blank serialized grid
        gridCellSize: 10,
        aiParsed: true,
        scaleManuallyVerified: false
      };

      // 6. Map rooms and translate percentage polygon & door coords to pixel coords
      const roomsToSave: Room[] = (results.rooms ?? [])
        .map((r, index) => {
          const polygon = (r.polygon ?? []).map((pt) => ({
            x: (pt.x / 100) * dimensions.width,
            y: (pt.y / 100) * dimensions.height
          }));

          const doors = (r.doors ?? []).map((pt) => ({
            x: (pt.x / 100) * dimensions.width,
            y: (pt.y / 100) * dimensions.height
          }));

          // Compute a centroid from the polygon if it has points
          let centroid = { x: 0, y: 0 };
          if (polygon.length > 0) {
            let sumX = 0;
            let sumY = 0;
            polygon.forEach((pt) => {
              sumX += pt.x;
              sumY += pt.y;
            });
            centroid = {
              x: sumX / polygon.length,
              y: sumY / polygon.length
            };
          }

          // Compute a bounding box from the polygon points to keep existing canvas overlay code working
          let bbox = undefined;
          if (polygon.length > 0) {
            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;
            polygon.forEach((pt) => {
              if (pt.x < minX) minX = pt.x;
              if (pt.x > maxX) maxX = pt.x;
              if (pt.y < minY) minY = pt.y;
              if (pt.y > maxY) maxY = pt.y;
            });
            bbox = {
              x: (minX / dimensions.width) * 100,
              y: (minY / dimensions.height) * 100,
              width: ((maxX - minX) / dimensions.width) * 100,
              height: ((maxY - minY) / dimensions.height) * 100
            };
          }

          return {
            id: r.id || `room-${index}`,
            name: r.name,
            type: r.type,
            isWalkable: r.isWalkable,
            polygon,
            doors,
            centroid,
            bbox,
            realWidthMeters: r.realWidthMeters ?? null,
            realHeightMeters: r.realHeightMeters ?? null
          };
        });

      // 6.5 Map corridor graph and translate percentage coords to pixel coords
      const nodesToSave = (results.corridorGraph?.nodes ?? []).map((node) => ({
        id: node.id,
        x: (node.x / 100) * dimensions.width,
        y: (node.y / 100) * dimensions.height
      }));

      const corridorGraphToSave: CorridorGraph = {
        nodes: nodesToSave,
        edges: results.corridorGraph?.edges ?? []
      };

      // 7. Write to database
      await saveBuildingAndFloor(building, floor);
      await saveRooms(buildingId, floorId, roomsToSave);
      await saveCorridorGraph(buildingId, floorId, corridorGraphToSave);

      // 8. Redirect back to dashboard
      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An error occurred while saving the configuration to Firebase.");
    } finally {
      setSaving(false);
    }
  };

  // Badge styler helper
  const getRoomTypeStyles = (type: string) => {
    switch (type) {
      case 'meeting_room':
      case 'conference_room':
      case 'boardroom':
        return 'bg-blue-500/10 border border-blue-500/30 text-blue-400';
      case 'desk_area':
        return 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400';
      case 'cafeteria':
        return 'bg-rose-500/10 border border-rose-500/30 text-rose-400';
      case 'restroom':
        return 'bg-amber-500/10 border border-amber-500/30 text-amber-400';
      case 'elevator':
      case 'staircase':
        return 'bg-purple-500/10 border border-purple-500/30 text-purple-400';
      case 'corridor':
      case 'reception':
        return 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400';
      default:
        return 'bg-slate-500/10 border border-slate-500/30 text-slate-400';
    }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6 overflow-y-auto">
      {/* Header Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link 
            to="/admin" 
            className="p-2 bg-surface hover:bg-surface-alt border border-border hover:border-text-secondary text-text-secondary hover:text-text-primary rounded-md transition-all"
            title="Back to Admin"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Add Floor Plan</h1>
            <p className="text-text-secondary text-xs sm:text-sm">Configure parameters and upload schematics for AI room detection.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Upload Panel Inputs */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-surface border border-border rounded-lg p-6 flex flex-col gap-5 shadow-lg">
            <h3 className="font-display font-bold text-white text-lg flex items-center gap-2 border-b border-border pb-3">
              <Building2 className="w-5 h-5 text-accent" />
              <span>Building & Floor Parameters</span>
            </h3>

            {/* Building Name Input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="buildingName" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Building Name
              </label>
              <input
                id="buildingName"
                type="text"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                placeholder="e.g. NIQ Chennai Office"
                disabled={loading || saving}
                className="bg-surface-alt border border-border text-text-primary placeholder:text-text-disabled rounded-md px-3.5 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                required
              />
            </div>

            {/* Floor Details Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="floorNumber" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Floor No.
                </label>
                <input
                  id="floorNumber"
                  type="number"
                  value={floorNumber}
                  onChange={(e) => setFloorNumber(e.target.value)}
                  placeholder="e.g. 5"
                  disabled={loading || saving}
                  min="-5"
                  max="120"
                  className="bg-surface-alt border border-border text-text-primary placeholder:text-text-disabled rounded-md px-3.5 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  required
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <label htmlFor="floorLabel" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Floor Label (Optional)
                </label>
                <input
                  id="floorLabel"
                  type="text"
                  value={floorLabel}
                  onChange={(e) => setFloorLabel(e.target.value)}
                  placeholder="e.g. East Wing Office"
                  disabled={loading || saving}
                  className="bg-surface-alt border border-border text-text-primary placeholder:text-text-disabled rounded-md px-3.5 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                />
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Upload Map Schematic
              </label>
              
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 min-h-[180px] ${
                  dragActive 
                    ? 'border-accent bg-accent/5' 
                    : file 
                      ? 'border-border bg-surface-alt/30 hover:border-text-secondary' 
                      : 'border-border bg-surface-alt/50 hover:border-accent/40'
                } ${loading || saving ? 'pointer-events-none opacity-50' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleInputChange}
                  accept=".png,.jpg,.jpeg,.svg,.pdf"
                  className="hidden"
                />
                
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-accent/10 rounded-full text-accent">
                      <Layers className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-medium text-text-primary line-clamp-1 max-w-[280px]">
                      {file.name}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="w-10 h-10 text-text-secondary" />
                    <span className="text-sm font-medium text-text-primary">
                      Drag & drop here, or <span className="text-accent hover:underline">browse</span>
                    </span>
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider">
                      PNG, JPG, SVG, or PDF up to 20MB
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Error Alert Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-md text-sm flex items-start gap-2 shadow-[0_0_12px_rgba(239,68,68,0.05)]">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Upload Button */}
            <button
              type="submit"
              disabled={loading || saving || !file || !buildingName.trim() || !floorNumber.trim()}
              className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:bg-surface-alt disabled:text-text-disabled disabled:border-border border border-accent text-white font-semibold rounded-md text-sm shadow-md shadow-accent/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Floor Plan...</span>
                </>
              ) : (
                <span>Upload & Detect Rooms</span>
              )}
            </button>
          </div>
        </form>

        {/* Right Side: Preview & Detection Results View */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* loading state spinner overlay */}
          {loading && (
            <div className="bg-surface border border-border rounded-lg p-12 text-center shadow-lg flex flex-col items-center justify-center min-h-[400px]">
              <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
              <h3 className="text-lg font-display font-bold text-white mb-2 animate-pulse">🤖 AI is reading your floor plan...</h3>
              <p className="text-text-secondary text-sm max-w-sm">
                Gemini is extracting the scale metrics, parsing room labels, and generating boundary coordinates.
              </p>
            </div>
          )}

          {/* Success Results State */}
          {!loading && results && (
            <div className="bg-surface border border-border rounded-lg p-6 flex flex-col gap-6 shadow-lg">
              <h3 className="font-display font-bold text-white text-lg flex items-center justify-between border-b border-border pb-3">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>AI Detection Complete</span>
                </span>
                <div className="flex flex-wrap gap-2 justify-end">
                  <span className="text-[10px] sm:text-xs text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    {results.rooms.length} rooms
                  </span>
                  <span className="text-[10px] sm:text-xs text-amber-400 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    {results.rooms.reduce((acc, r) => acc + (r.doors?.length ?? 0), 0)} doors
                  </span>
                  <span className="text-[10px] sm:text-xs text-blue-400 font-medium px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                    {results.corridorGraph?.nodes?.length ?? 0} nodes
                  </span>
                  <span className="text-[10px] sm:text-xs text-indigo-400 font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                    {results.corridorGraph?.edges?.length ?? 0} edges
                  </span>
                </div>
              </h3>

              {/* Scale Metrics */}
              <div className="grid grid-cols-3 gap-4 bg-surface-alt border border-border rounded-lg p-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Pixels Per Meter</span>
                  <span className="text-lg font-mono font-bold text-white">{results.scale?.pixelsPerMeter} px/m</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Floor Width</span>
                  <span className="text-lg font-mono font-bold text-white">{results.scale?.floorWidthMeters} m</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Floor Height</span>
                  <span className="text-lg font-mono font-bold text-white">{results.scale?.floorHeightMeters} m</span>
                </div>
              </div>

              {/* Rooms List */}
              <div className="flex flex-col gap-2.5">
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                  Detected Rooms and Areas
                </h4>
                
                <div className="max-h-[250px] overflow-y-auto border border-border rounded-md divide-y divide-border bg-bg/50">
                  {(results.rooms ?? [])
                    .filter((room) => room && (room.polygon || room.bbox))
                    .map((room, index) => (
                      <div key={room.id || index} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-surface/50 transition-colors font-sans">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-medium text-white truncate">{room.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {room.polygon ? (
                              <>
                                <span className="text-[10px] text-text-secondary">Polygon:</span>
                                <span className="text-[10px] font-mono text-text-secondary">
                                  {room.polygon.length} vertices, {room.doors?.length ?? 0} doors
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] text-text-secondary">BBox:</span>
                                <span className="text-[10px] font-mono text-text-secondary">
                                  (x: {Math.round(room.bbox?.x ?? 0)}, y: {Math.round(room.bbox?.y ?? 0)}, w: {Math.round(room.bbox?.width ?? 0)}, h: {Math.round(room.bbox?.height ?? 0)})
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Type Badge */}
                          <span className={`text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full ${getRoomTypeStyles(room.type)}`}>
                            {room.type.replace('_', ' ')}
                          </span>
                          
                          {/* Walkable Status Badge */}
                          <span className={`text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                            room.isWalkable 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                          }`}>
                            {room.isWalkable ? (
                              <>
                                <Check className="w-2.5 h-2.5" />
                                <span>Walkable</span>
                              </>
                            ) : (
                              <>
                                <X className="w-2.5 h-2.5" />
                                <span>Closed</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Save & Publish Button */}
              <div className="border-t border-border pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePlan}
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-alt disabled:text-text-disabled text-white px-5 py-2.5 rounded-md text-sm font-semibold transition-all shadow-md shadow-emerald-600/10 cursor-pointer disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving & Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save & Publish Floor</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Default Preview State */}
          {!loading && !results && (
            <div className="bg-surface border border-border rounded-lg p-6 flex flex-col gap-4 shadow-lg min-h-[400px] items-center justify-center text-center">
              {previewUrl ? (
                <div className="w-full flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider justify-start">
                    <Eye className="w-4 h-4 text-accent" />
                    <span>Selected schematic preview</span>
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden bg-bg/50 p-2 flex items-center justify-center max-h-[350px]">
                    <img 
                      src={previewUrl} 
                      alt="Floor plan preview" 
                      className="max-h-[330px] object-contain rounded-md"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <HelpCircle className="w-12 h-12 text-text-secondary animate-bounce" />
                  <h3 className="text-lg font-display font-bold text-white">No layout selected</h3>
                  <p className="text-text-secondary text-sm max-w-xs">
                    Choose a building name and select a schematic image or PDF file to visualize the layout preview here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
