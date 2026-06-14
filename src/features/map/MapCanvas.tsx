import React, { useState, useEffect, useRef, Component, ErrorInfo, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text } from 'react-konva';
import { useFloor } from '../../hooks/useFloor';
import { getFloorWithRooms } from '../../services/firestore';
import { Room, RoomType } from '../../shared/types';
import SearchBar from '../search/SearchBar';
import NavPanel from '../navigation/NavPanel';
import { Map, Loader2, HelpCircle, AlertTriangle, Maximize } from 'lucide-react';

class KonvaErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Konva rendering error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-[#0B0D13] w-full h-full border border-red-500/20 rounded-lg">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-3 animate-pulse" />
          <h3 className="text-lg font-bold text-white font-display mb-1">Canvas Render Failure</h3>
          <p className="text-text-secondary text-sm max-w-sm mb-4">
            An error occurred while displaying the interactive floor map. Try refreshing or re-uploading the layout plan.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded text-xs font-semibold cursor-pointer transition-all"
          >
            Retry Rendering
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function MapCanvas() {
  const { currentFloor } = useFloor();
  
  // Data loading states
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Selection and highlighting
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Zoom & Pan state
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // 1. Listen for currentFloor updates to load child rooms
  useEffect(() => {
    if (!currentFloor) {
      setRooms([]);
      return;
    }

    const loadFloorData = async () => {
      setLoading(true);
      try {
        const data = await getFloorWithRooms(currentFloor.id);
        if (data) {
          setRooms(data.rooms || []);
        }
      } catch (err) {
        console.error('Failed to load rooms for selected floor:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFloorData();
  }, [currentFloor?.id]);

  // 2. Load the HTML5 Image object for Konva defensively
  useEffect(() => {
    if (!currentFloor?.imageUrl) {
      setImageElement(null);
      setImageLoaded(false);
      setImageError(false);
      return;
    }

    setImageLoaded(false);
    setImageError(false);
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Avoid canvas taint
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setImageElement(img);
        setImageLoaded(true);
      } else {
        console.error('Loaded image has invalid 0 dimensions');
        setImageElement(null);
        setImageLoaded(false);
        setImageError(true);
      }
    };
    img.onerror = () => {
      console.error('Failed to load floor plan image');
      setImageElement(null);
      setImageLoaded(false);
      setImageError(true);
    };
    img.src = currentFloor.imageUrl;
  }, [currentFloor?.imageUrl]);

  // 3. Track container dimensions for responsiveness
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Zoom to fit bounds helper
  const handleZoomToFit = useCallback(() => {
    if (containerSize.width === 0 || containerSize.height === 0 || !currentFloor || !imageLoaded || !imageElement) return;

    const imgW = currentFloor.imageWidth || imageElement.naturalWidth || 1200;
    const imgH = currentFloor.imageHeight || imageElement.naturalHeight || 900;
    
    if (imgW === 0 || imgH === 0) return;

    const scaleX = containerSize.width / imgW;
    const scaleY = containerSize.height / imgH;
    
    // Scale to fit bounds (entire floor fits in both dimensions with 5% padding margin)
    const fitScale = Math.min(scaleX, scaleY) * 0.95;
    
    setScale(fitScale);
    setPosition({
      x: (containerSize.width - imgW * fitScale) / 2,
      y: (containerSize.height - imgH * fitScale) / 2
    });
  }, [containerSize.width, containerSize.height, currentFloor, imageLoaded, imageElement]);

  // 4. Center and auto-scale map when layout or container size changes
  useEffect(() => {
    handleZoomToFit();
    setSelectedRoom(null); // Clear active selections
  }, [handleZoomToFit]);

  // 5. Handle mouse wheel zoom centered around mouse pointer
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const scaleBy = 1.15;
    const oldScale = stage.scaleX();
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Resolve pointer position in coordinates relative to stage layer
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const boundedScale = Math.max(0.15, Math.min(newScale, 8)); // Bind zoom factors

    setScale(boundedScale);
    setPosition({
      x: pointer.x - mousePointTo.x * boundedScale,
      y: pointer.y - mousePointTo.y * boundedScale
    });
  };

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
  };

  // Color Mapping Helper based on DESIGN.md specifications
  const getRoomColor = (type: RoomType) => {
    switch (type) {
      case RoomType.MEETING_ROOM:
        return '#818CF8'; // Lavender/Accent Indigo
      case RoomType.CONFERENCE_ROOM:
      case RoomType.BOARDROOM:
        return '#3B82F6'; // Blue
      case RoomType.DESK_AREA:
        return '#EAB308'; // Yellow
      case RoomType.RECEPTION:
        return '#22C55E'; // Green
      case RoomType.CAFETERIA:
        return '#F97316'; // Orange
      case RoomType.RESTROOM:
        return '#06B6D4'; // Light Blue / Cyan
      case RoomType.ELEVATOR:
      case RoomType.STAIRCASE:
        return '#A855F7'; // Purple
      case RoomType.CORRIDOR:
        return '#0F172A'; // Walkable corridors are darker slate
      default:
        return '#1E293B'; // Fallback room fill
    }
  };

  const isMapReady = currentFloor && imageElement && imageLoaded;
  const showSpinner = loading || (currentFloor && !imageLoaded && !imageError);

  const imgW = currentFloor?.imageWidth || imageElement?.naturalWidth || 1200;
  const imgH = currentFloor?.imageHeight || imageElement?.naturalHeight || 900;

  return (
    <div className="w-full h-[calc(100vh-64px)] flex flex-col md:flex-row relative bg-bg overflow-hidden">
      
      {/* Map Interactive Zone */}
      <div 
        ref={containerRef} 
        className="flex-1 h-[60vh] md:h-full relative bg-[#0B0D13] select-none"
      >
        {/* Search Bar Overlay */}
        <div className="absolute top-4 left-4 right-4 md:right-auto md:w-80 z-20">
          <SearchBar />
        </div>

        {/* Loading Spinner */}
        {showSpinner && (
          <div className="absolute inset-0 bg-[#0F1117]/80 z-30 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
            <span className="text-sm text-text-secondary font-medium animate-pulse">
              {loading ? "Loading floor details..." : "Loading floor plan image..."}
            </span>
          </div>
        )}

        {/* Image Error Alert */}
        {imageError && (
          <div className="absolute inset-0 bg-[#0F1117]/90 z-30 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 animate-pulse" />
            <h3 className="text-lg font-bold text-white font-display mb-1">Failed to load floor plan image</h3>
            <p className="text-text-secondary text-sm max-w-sm">
              The image could not be loaded. This might be due to a network error, invalid dimensions, or a CORS policy issue.
            </p>
          </div>
        )}

        {/* Dynamic Konva stage */}
        {isMapReady ? (
          <KonvaErrorBoundary>
            <Stage
              width={containerSize.width}
              height={containerSize.height}
              draggable
              scaleX={scale}
              scaleY={scale}
              x={position.x}
              y={position.y}
              onWheel={handleWheel}
              onDragEnd={(e) => setPosition({ x: e.target.x(), y: e.target.y() })}
              className="cursor-grab active:cursor-grabbing"
            >
              <Layer>
                {/* Layout Base Image */}
                <KonvaImage
                  image={imageElement!}
                  width={imgW}
                  height={imgH}
                  opacity={0.9}
                />

                {/* Rooms Render Layer */}
                {(rooms || [])
                  .filter((room) => room && room.bbox)
                  .map((room, idx) => {
                    const bbox = room.bbox!;
                    
                    // Translate bbox percentage bounds to canvas pixels
                    const rx = (bbox.x / 100) * imgW;
                    const ry = (bbox.y / 100) * imgH;
                    const rw = (bbox.width / 100) * imgW;
                    const rh = (bbox.height / 100) * imgH;

                    const isSelected = selectedRoom?.name === room.name;
                    const isWalkable = room.isWalkable;

                    return (
                      <React.Fragment key={room.id || idx}>
                        {/* Room Area Bounds */}
                        <Rect
                          x={rx}
                          y={ry}
                          width={rw}
                          height={rh}
                          fill={getRoomColor(room.type as RoomType)}
                          opacity={isSelected ? 0.45 : isWalkable ? 0.15 : 0.3}
                          stroke={isSelected ? '#818CF8' : '#334155'}
                          strokeWidth={isSelected ? 2 : 1}
                          onClick={() => handleRoomClick(room)}
                          onTap={() => handleRoomClick(room)}
                          className="cursor-pointer"
                        />
                        
                        {/* Room Label centered within boundary Rect */}
                        {rw > 40 && rh > 20 && (
                          <Text
                            x={rx}
                            y={ry}
                            width={rw}
                            height={rh}
                            text={room.name}
                            fontSize={11}
                            fontFamily="DM Sans, Inter, sans-serif"
                            fill={isSelected ? '#F1F5F9' : '#94A3B8'}
                            align="center"
                            verticalAlign="middle"
                            wrap="word"
                            listening={false} // Disable pointer capture to click Rect directly
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
              </Layer>
            </Stage>
          </KonvaErrorBoundary>
        ) : (
          /* Empty Unloaded State */
          !loading && !imageError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3">
              <Map className="w-16 h-16 text-text-secondary opacity-40 animate-bounce" />
              <h2 className="text-xl font-bold text-white font-display">No layout active</h2>
              <p className="text-text-secondary text-sm max-w-sm">
                Select a floor plan from the dropdown selector or configure a layout in the administrator console.
              </p>
            </div>
          )
        )}

        {/* Fit to screen button overlay */}
        {isMapReady && (
          <button
            onClick={handleZoomToFit}
            className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-alt border border-border hover:border-text-secondary text-text-secondary hover:text-text-primary rounded-md shadow-lg transition-all text-xs font-semibold cursor-pointer select-none animate-fade-in"
            title="Fit floor plan to screen bounds"
          >
            <Maximize className="w-3.5 h-3.5 text-accent" />
            <span>Fit to Screen</span>
          </button>
        )}
      </div>

      {/* Navigation Directions Overlay */}
      <div className="w-full md:w-80 md:h-full bg-surface border-t md:border-t-0 md:border-l border-border z-10 flex flex-col shrink-0">
        <NavPanel selectedRoom={selectedRoom} />
      </div>
    </div>
  );
}
