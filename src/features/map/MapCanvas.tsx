import React, { useState, useEffect, useRef, Component, ErrorInfo, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text, Circle, Line, Path as KonvaPath } from 'react-konva';
import { useFloor } from '../../hooks/useFloor';
import { getFloorWithRooms } from '../../services/firestore';
import { Room, RoomType, CorridorGraph, GraphNode, Point } from '../../shared/types';
import SearchBar from '../search/SearchBar';
import NavPanel from '../navigation/NavPanel';
import { Map as MapIcon, Loader2, HelpCircle, AlertTriangle, Maximize } from 'lucide-react';
import { useUserPosition } from '../../hooks/useUserPosition';
import { WalkableGrid, PixelPoint } from '../navigation/GridBuilder';
import { findPath, findGraphPath } from '../navigation/Pathfinder';
import { generateDirections, NavStep } from '../navigation/DirectionEngine';

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
  const [corridorGraph, setCorridorGraph] = useState<CorridorGraph | null>(null);
  const [showCorridorsDebug, setShowCorridorsDebug] = useState(false);

  const corridors = React.useMemo(() => {
    if (!corridorGraph) return [];
    return (corridorGraph.edges || []).map((edge: any, idx: number) => {
      const fromNode = corridorGraph.nodes.find((n: any) => n.id === edge.from);
      const toNode = corridorGraph.nodes.find((n: any) => n.id === edge.to);
      return {
        id: `edge-${idx}`,
        name: `Edge ${idx}`,
        centerline: fromNode && toNode ? [{ x: fromNode.x, y: fromNode.y }, { x: toNode.x, y: toNode.y }] : []
      };
    }).filter((c: any) => c.centerline.length > 0);
  }, [corridorGraph]);
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

  const imgW = currentFloor?.imageWidth || imageElement?.naturalWidth || 1200;
  const imgH = currentFloor?.imageHeight || imageElement?.naturalHeight || 900;

  // User Position tracking hook
  const { position: userPos, setManualPosition, isDevMode } = useUserPosition(rooms, imgW, imgH);

  // Pulsing animation for user location marker
  const [pulseRadius, setPulseRadius] = useState(12);
  useEffect(() => {
    let animId: number;
    const startTime = Date.now();
    const updatePulse = () => {
      const elapsed = Date.now() - startTime;
      const nextRadius = 10 + Math.abs(Math.sin((elapsed / 1200) * Math.PI)) * 10;
      setPulseRadius(nextRadius);
      animId = requestAnimationFrame(updatePulse);
    };
    animId = requestAnimationFrame(updatePulse);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Navigation Engine States
  const [navigationActive, setNavigationActive] = useState(false);
  const [navigationPath, setNavigationPath] = useState<PixelPoint[] | null>(null);
  const [navSteps, setNavSteps] = useState<NavStep[] | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [walkTimeSeconds, setWalkTimeSeconds] = useState(0);
  const [navigationError, setNavigationError] = useState<string | null>(null);

  // Dash & Draw-on Animation Effects for Navigation Route
  const [dashOffset, setDashOffset] = useState(0);
  const [drawFraction, setDrawFraction] = useState(0);

  // Visual polish states
  const [hoveredRoom, setHoveredRoom] = useState<Room | null>(null);
  const [pinBounceY, setPinBounceY] = useState(0);

  // Pin Bounce Animation Effect
  useEffect(() => {
    if (!navigationActive || !selectedRoom) {
      setPinBounceY(0);
      return;
    }

    const duration = 800; // 800ms bounce
    const startTime = Date.now();
    let animId: number;

    const animateBounce = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        setPinBounceY(0);
        return;
      }

      const t = elapsed / duration;
      const height = 40; // max drop height in screen pixels
      const bounce = Math.abs(Math.cos(t * Math.PI * 2.5)) * (1 - t) * -height;
      
      setPinBounceY(bounce);
      animId = requestAnimationFrame(animateBounce);
    };

    animId = requestAnimationFrame(animateBounce);
    return () => cancelAnimationFrame(animId);
  }, [navigationActive, selectedRoom?.name]);

  useEffect(() => {
    if (!navigationActive || !navigationPath) {
      setDrawFraction(0);
      return;
    }

    const start = Date.now();
    let animId: number;

    const animate = () => {
      const elapsed = Date.now() - start;
      const fraction = Math.min(1, elapsed / 700); // 700ms draw-on
      setDrawFraction(fraction);
      
      // Subtle continuous flowing dash offset
      setDashOffset((prev) => (prev - 0.8) % 1000);

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [navigationActive, navigationPath]);

  // Snapping and Route Deduplication Helpers
  const deduplicatePoints = useCallback((points: Point[]): Point[] => {
    const result: Point[] = [];
    for (const p of points) {
      if (result.length === 0) {
        result.push(p);
      } else {
        const prev = result[result.length - 1];
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        if (Math.sqrt(dx * dx + dy * dy) > 0.01) {
          result.push(p);
        }
      }
    }
    return result;
  }, []);

  // Start Navigation Logic
  const handleStartNavigation = useCallback((targetRoom?: Room) => {
    const roomToNav = targetRoom || selectedRoom;
    if (!userPos || !roomToNav || !currentFloor) return;

    setNavigationError(null);

    try {
      const pixelsPerMeter = currentFloor.realWidthMeters 
        ? imgW / currentFloor.realWidthMeters 
        : (currentFloor.pixelsPerMeter || 15);

      if (!corridorGraph || !corridorGraph.nodes || corridorGraph.nodes.length === 0) {
        setNavigationError('No navigation network is available for this floor.');
        setNavigationActive(false);
        setNavigationPath(null);
        return;
      }

      // Snap start position to nearest graph node
      let startNode: GraphNode | null = null;
      let minStartDist = Infinity;
      for (const node of corridorGraph.nodes) {
        const dist = Math.sqrt((node.x - userPos.x) ** 2 + (node.y - userPos.y) ** 2);
        if (dist < minStartDist) {
          minStartDist = dist;
          startNode = node;
        }
      }

      if (!startNode) {
        setNavigationError('Could not locate a nearby hallway route from your position.');
        setNavigationActive(false);
        setNavigationPath(null);
        return;
      }

      const destCentroid = roomToNav.centroid 
        ? { x: roomToNav.centroid.x, y: roomToNav.centroid.y }
        : { 
            x: ((roomToNav.bbox?.x ?? 0) + (roomToNav.bbox?.width ?? 0) / 2) / 100 * imgW, 
            y: ((roomToNav.bbox?.y ?? 0) + (roomToNav.bbox?.height ?? 0) / 2) / 100 * imgH 
          };

      // Safeguard: if room genuinely has no doors, fall back to routing to centroid
      let doors = roomToNav.doors || [];
      if (doors.length === 0) {
        doors = [destCentroid];
      }

      let bestPath: Point[] | null = null;
      let bestDistanceMeters = Infinity;

      for (const door of doors) {
        // Find nearest graph node to this door
        let destNode: GraphNode | null = null;
        let minDestDist = Infinity;
        for (const node of corridorGraph.nodes) {
          const dist = Math.sqrt((node.x - door.x) ** 2 + (node.y - door.y) ** 2);
          if (dist < minDestDist) {
            minDestDist = dist;
            destNode = node;
          }
        }

        if (!destNode) continue;

        // Run Dijkstra
        const graphPathNodes = findGraphPath(corridorGraph, startNode.id, destNode.id, pixelsPerMeter);
        if (!graphPathNodes) continue;

        // Assemble path: start position -> nearest graph node -> corridor path -> door -> centroid
        const candidatePath: Point[] = [
          userPos,
          { x: startNode.x, y: startNode.y },
          ...graphPathNodes.map(n => ({ x: n.x, y: n.y })),
          door,
          destCentroid
        ];

        // Deduplicate consecutive coordinate points
        const dedupedPath = deduplicatePoints(candidatePath);

        // Calculate total distance in meters
        let distM = 0;
        for (let i = 0; i < dedupedPath.length - 1; i++) {
          const p1 = dedupedPath[i];
          const p2 = dedupedPath[i + 1];
          distM += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) / pixelsPerMeter;
        }

        if (distM < bestDistanceMeters) {
          bestDistanceMeters = distM;
          bestPath = dedupedPath;
        }
      }

      const destName = roomToNav.name || selectedRoom?.name || 'Destination';

      if (!bestPath) {
        setNavigationError(`The destination room "${destName}" is not connected to the corridor network.`);
        setNavigationActive(false);
        setNavigationPath(null);
        return;
      }

      const directions = generateDirections(bestPath, pixelsPerMeter, destName);

      setNavigationPath(bestPath);
      setNavSteps(directions.steps);
      setTotalDistance(directions.totalDistance);
      setWalkTimeSeconds(directions.walkTimeSeconds);
      setNavigationActive(true);

      // Trigger camera zoom & pan framing animation over 600ms
      if (bestPath && bestPath.length >= 2) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of bestPath) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }

        const routeW = maxX - minX;
        const routeH = maxY - minY;
        const routeCX = minX + routeW / 2;
        const routeCY = minY + routeH / 2;

        const padding = 120; // visual padding on screen
        const scaleX = (containerSize.width - padding) / (routeW || 1);
        const scaleY = (containerSize.height - padding) / (routeH || 1);
        let targetScale = Math.min(scaleX, scaleY);
        targetScale = Math.max(0.3, Math.min(targetScale, 3.5));

        const targetX = containerSize.width / 2 - routeCX * targetScale;
        const targetY = containerSize.height / 2 - routeCY * targetScale;

        const duration = 600;
        const startTime = Date.now();
        const startScale = scale;
        const startX = position.x;
        const startY = position.y;

        const animateCamera = () => {
          const elapsed = Date.now() - startTime;
          const t = Math.min(1, elapsed / duration);
          // EaseInOutCubic for cinematic framing feel
          const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

          setScale(startScale + (targetScale - startScale) * ease);
          setPosition({
            x: startX + (targetX - startX) * ease,
            y: startY + (targetY - startY) * ease
          });

          if (t < 1) {
            requestAnimationFrame(animateCamera);
          }
        };

        requestAnimationFrame(animateCamera);
      }
    } catch (err) {
      console.error('Error generating navigation path:', err);
      setNavigationError('An unexpected error occurred during path generation.');
      setNavigationActive(false);
    }
  }, [userPos, selectedRoom, currentFloor, corridorGraph, imgW, imgH, containerSize, scale, position, deduplicatePoints]);

  // Handle Search Room Selection and Centering/Navigation Callback
  const handleSelectRoom = useCallback((room: Room) => {
    // Look up complete room details from loaded rooms state
    const fullRoom = rooms.find((r) => (r.id && r.id === room.id) || r.name === room.name) || room;
    setSelectedRoom(fullRoom);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    if (fullRoom.polygon && fullRoom.polygon.length > 0) {
      for (const pt of fullRoom.polygon) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
    } else if (fullRoom.bbox) {
      minX = (fullRoom.bbox.x / 100) * imgW;
      maxX = ((fullRoom.bbox.x + fullRoom.bbox.width) / 100) * imgW;
      minY = (fullRoom.bbox.y / 100) * imgH;
      maxY = ((fullRoom.bbox.y + fullRoom.bbox.height) / 100) * imgH;
    } else {
      return;
    }

    const roomW = maxX - minX;
    const roomH = maxY - minY;
    const roomCX = minX + roomW / 2;
    const roomCY = minY + roomH / 2;

    const padding = 120;
    const scaleX = (containerSize.width - padding) / (roomW || 1);
    const scaleY = (containerSize.height - padding) / (roomH || 1);
    let targetScale = Math.min(scaleX, scaleY);
    targetScale = Math.max(0.8, Math.min(targetScale, 2.8));

    const targetX = containerSize.width / 2 - roomCX * targetScale;
    const targetY = containerSize.height / 2 - roomCY * targetScale;

    const duration = 600;
    const startTime = Date.now();
    const startScale = scale;
    const startX = position.x;
    const startY = position.y;

    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      setScale(startScale + (targetScale - startScale) * ease);
      setPosition({
        x: startX + (targetX - startX) * ease,
        y: startY + (targetY - startY) * ease
      });

      if (t < 1) {
        requestAnimationFrame(animateCamera);
      }
    };

    requestAnimationFrame(animateCamera);

    // If user has active position dot, auto-navigate to selection
    if (userPos) {
      handleStartNavigation(fullRoom);
    }
  }, [userPos, rooms, imgW, imgH, containerSize, scale, position, handleStartNavigation]);

  // Clear Navigation Logic
  const handleClearNavigation = useCallback(() => {
    setNavigationActive(false);
    setNavigationPath(null);
    setNavSteps(null);
    setTotalDistance(0);
    setWalkTimeSeconds(0);
    setNavigationError(null);
  }, []);

  // Clear path if floor plan changes or active room selection resets
  useEffect(() => {
    handleClearNavigation();
  }, [currentFloor?.id, selectedRoom?.name, handleClearNavigation]);

  // Animate drawing path points on the screen over 800ms
  const getAnimatedPoints = useCallback((): number[] => {
    if (!navigationPath || navigationPath.length < 2) return [];
    if (drawFraction >= 1) {
      return navigationPath.flatMap((p) => [p.x, p.y]);
    }

    const points: PixelPoint[] = [navigationPath[0]];
    const cumulativeLengths: number[] = [0];
    let totalLength = 0;

    for (let i = 0; i < navigationPath.length - 1; i++) {
      const p1 = navigationPath[i];
      const p2 = navigationPath[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      totalLength += dist;
      cumulativeLengths.push(totalLength);
    }

    const targetLength = totalLength * drawFraction;

    for (let i = 0; i < navigationPath.length - 1; i++) {
      const p1 = navigationPath[i];
      const p2 = navigationPath[i + 1];
      const startL = cumulativeLengths[i];
      const endL = cumulativeLengths[i + 1];

      if (endL <= targetLength) {
        points.push(p2);
      } else if (startL < targetLength && endL > targetLength) {
        const ratio = (targetLength - startL) / (endL - startL);
        points.push({
          x: p1.x + ratio * (p2.x - p1.x),
          y: p1.y + ratio * (p2.y - p1.y),
        });
        break;
      } else {
        break;
      }
    }

    return points.flatMap((p) => [p.x, p.y]);
  }, [navigationPath, drawFraction]);

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
          setCorridorGraph(data.corridorGraph || null);
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

  const handleStageClick = (e: any) => {
    const stage = e.currentTarget.getStage();
    if (!stage || stage.isDragging()) return;

    const target = e.target;
    // Room selection is handled on the Rect components click/tap handlers
    const isRoom = target.className === 'Rect';
    if (isRoom) return;

    if (isDevMode) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const stageScale = stage.scaleX();
      const stageX = stage.x();
      const stageY = stage.y();

      const imageX = (pointer.x - stageX) / stageScale;
      const imageY = (pointer.y - stageY) / stageScale;

      // Make sure click location is within the boundary coordinates of the floor map image
      if (imageX >= 0 && imageX <= imgW && imageY >= 0 && imageY <= imgH) {
        setManualPosition(imageX, imageY);
      }
    }
  };

  // Color Mapping Helper based on refined muted palette
  const getRoomColor = (type: RoomType) => {
    switch (type) {
      case RoomType.MEETING_ROOM:
      case RoomType.CONFERENCE_ROOM:
      case RoomType.BOARDROOM:
        return '#1D2036'; // Slate Indigo
      case RoomType.DESK_AREA:
        return '#211D17'; // Warm Charcoal
      case RoomType.RECEPTION:
      case RoomType.LOBBY:
        return '#132E27'; // Deep Forest Green
      case RoomType.CAFETERIA:
      case RoomType.PANTRY:
      case RoomType.RECREATION:
        return '#32261A'; // Amber Espresso
      case RoomType.RESTROOM:
      case RoomType.MEDICAL:
        return '#1A2632'; // Cool Steel Blue
      case RoomType.ELEVATOR:
      case RoomType.STAIRCASE:
        return '#251C32'; // Dark Grape Purple
      case RoomType.CORRIDOR:
        return '#1F2433'; // Walkable corridor
      default:
        return '#1E293B'; // Fallback slate
    }
  };

  // Greedy room label placement helpers and calculations
  const isMajorSpace = (room: Room) => {
    const type = (room.type || '').toLowerCase();
    const name = (room.name || '').toLowerCase();
    return (
      type === 'reception' ||
      type === 'cafeteria' ||
      type === 'boardroom' ||
      type === 'elevator' ||
      type === 'desk_area' ||
      type === 'lobby' ||
      type === 'meeting_room' ||
      type === 'conference_room' ||
      name.includes('reception') ||
      name.includes('cafeteria') ||
      name.includes('boardroom') ||
      name.includes('elevator') ||
      name.includes('desk') ||
      name.includes('lobby') ||
      name.includes('meeting') ||
      name.includes('conf')
    );
  };

  interface RoomLabelCandidate {
    room: Room;
    cx: number;
    cy: number;
    roomW: number;
    roomH: number;
    priority: number;
    text: string;
    fontSize: number;
    isMajor: boolean;
    showDot: boolean;
  }

  const candidates: RoomLabelCandidate[] = [];

  for (const room of rooms) {
    if (!room) continue;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    if (room.polygon && room.polygon.length > 0) {
      for (const pt of room.polygon) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
    } else if (room.bbox) {
      minX = (room.bbox.x / 100) * imgW;
      maxX = ((room.bbox.x + room.bbox.width) / 100) * imgW;
      minY = (room.bbox.y / 100) * imgH;
      maxY = ((room.bbox.y + room.bbox.height) / 100) * imgH;
    } else {
      continue;
    }

    const roomW = maxX - minX;
    const roomH = maxY - minY;
    const cx = room.centroid ? room.centroid.x : (minX + roomW / 2);
    const cy = room.centroid ? room.centroid.y : (minY + roomH / 2);

    const isMajor = isMajorSpace(room);
    const isSelected = selectedRoom?.name === room.name;
    const isHovered = hoveredRoom?.name === room.name;

    // Check if the room is very tiny (even 8px canvas font cannot fit 4 letters easily)
    const isTiny = roomW < 24 || roomH < 14;
    
    let showText = true;
    let showDot = false;

    if (isTiny) {
      // Tiny rooms show text only when hovered, selected, or zoomed in past 1.5
      if (isHovered || isSelected || scale > 1.5) {
        showText = true;
        showDot = false;
      } else {
        showText = false;
        showDot = true;
      }
    }

    if (showText) {
      // Calculate font size to fit room
      const baseFontSize = Math.min((roomW - 8) / (room.name.length * 0.55), roomH - 6, 12);
      const finalFontSize = Math.max(8, baseFontSize);

      // Truncate text if it still doesn't fit at 8px minimum
      const avgCharWidth = finalFontSize * 0.55;
      const maxChars = Math.floor((roomW - 4) / avgCharWidth);
      let displayName = room.name;
      if (room.name.length > maxChars && maxChars >= 4) {
        displayName = room.name.substring(0, maxChars - 3) + '...';
      }

      // Calculate priority: selected/hovered/major get massive priority boosts
      let priority = roomW * roomH;
      if (isSelected) priority += 10000000;
      if (isHovered) priority += 5000000;
      if (isMajor) priority += 2000000;

      candidates.push({
        room,
        cx,
        cy,
        roomW,
        roomH,
        priority,
        text: displayName,
        fontSize: finalFontSize,
        isMajor: isMajor || isSelected || isHovered,
        showDot: false
      });
    } else if (showDot) {
      candidates.push({
        room,
        cx,
        cy,
        roomW,
        roomH,
        priority: roomW * roomH,
        text: '',
        fontSize: 0,
        isMajor: false,
        showDot: true
      });
    }
  }

  // Sort candidates by priority desc (highest priority first)
  candidates.sort((a, b) => b.priority - a.priority);

  interface PlacedLabel {
    left: number;
    top: number;
    right: number;
    bottom: number;
  }

  const placed: PlacedLabel[] = [];
  const visibleLabelsMap = new Map<string, { text: string; cx: number; cy: number; fontSize: number }>();
  const dotsToRender: { cx: number; cy: number }[] = [];

  for (const c of candidates) {
    if (c.showDot) {
      dotsToRender.push({ cx: c.cx, cy: c.cy });
      continue;
    }

    const textLength = c.text.length;
    const textW = Math.min(c.roomW, textLength * 0.55 * c.fontSize);
    const textH = c.fontSize;

    const left = c.cx - textW / 2;
    const top = c.cy - textH / 2;
    const right = left + textW;
    const bottom = top + textH;

    // Overlap checks applied only for non-major candidates
    let overlaps = false;
    if (!c.isMajor) {
      const margin = 2; // small visual margin in canvas coords
      const checkRect = {
        left: left - margin,
        top: top - margin,
        right: right + margin,
        bottom: bottom + margin
      };

      for (const p of placed) {
        if (!(checkRect.right < p.left || checkRect.left > p.right || checkRect.bottom < p.top || checkRect.top > p.bottom)) {
          overlaps = true;
          break;
        }
      }
    }

    if (!overlaps) {
      placed.push({ left, top, right, bottom });
      visibleLabelsMap.set(c.room.name, { text: c.text, cx: c.cx, cy: c.cy, fontSize: c.fontSize });
    } else {
      // Show dot indicator if text label is decluttered
      dotsToRender.push({ cx: c.cx, cy: c.cy });
    }
  }

  const labelsToRender: { roomName: string; text: string; cx: number; cy: number; fontSize: number }[] = [];
  visibleLabelsMap.forEach((val, key) => {
    labelsToRender.push({ roomName: key, text: val.text, cx: val.cx, cy: val.cy, fontSize: val.fontSize });
  });

  const isMapReady = currentFloor && imageElement && imageLoaded;
  const showSpinner = loading || (currentFloor && !imageLoaded && !imageError);

  return (
    <div className="w-full h-[calc(100vh-64px)] flex flex-col md:flex-row relative bg-bg overflow-hidden">
      
      {/* Map Interactive Zone */}
      <div 
        ref={containerRef} 
        className="flex-1 h-[60vh] md:h-full relative bg-[#0F1117] select-none"
      >
        {/* Search Bar Overlay */}
        <div className="absolute top-4 left-4 right-4 md:right-auto md:w-80 z-20">
          <SearchBar rooms={rooms} onSelectRoom={handleSelectRoom} />
        </div>

        {/* Dev Mode Manual Positioning Hint Banner */}
        {isDevMode && (
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
            <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-md text-xs font-semibold shadow-md shadow-amber-500/5 animate-pulse flex items-center gap-1.5 select-none font-sans">
              <span>🧪</span>
              <span>Dev Mode — click anywhere to set position</span>
            </div>
            <label className="flex items-center gap-2 px-3 py-1.5 bg-[#181a20]/90 border border-border text-text-primary rounded-md text-xs font-semibold shadow-md cursor-pointer select-none font-sans">
              <input 
                type="checkbox" 
                checked={showCorridorsDebug} 
                onChange={(e) => setShowCorridorsDebug(e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent cursor-pointer"
              />
              <span className="text-white">Show Corridors Debug</span>
            </label>
          </div>
        )}

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
              onClick={handleStageClick}
              onTap={handleStageClick}
              onDragEnd={(e) => setPosition({ x: e.target.x(), y: e.target.y() })}
              className="cursor-grab active:cursor-grabbing"
            >
              <Layer>
                {/* 1. Floor Plate (Background Footprint Boundary) */}
                <Rect
                  x={0}
                  y={0}
                  width={imgW}
                  height={imgH}
                  fill="#12141A"
                  cornerRadius={30}
                  shadowColor="#000"
                  shadowBlur={30}
                  shadowOpacity={0.4}
                  shadowOffsetX={0}
                  shadowOffsetY={10}
                />

                {/* 2. Walkway / Corridor Edges (rendered under rooms) */}
                {corridorGraph && corridorGraph.edges.map((edge: any, idx: number) => {
                  const fromNode = corridorGraph.nodes.find((n: any) => n.id === edge.from);
                  const toNode = corridorGraph.nodes.find((n: any) => n.id === edge.to);
                  if (!fromNode || !toNode) return null;

                  return (
                    <Line
                      key={`corr-edge-${idx}`}
                      points={[fromNode.x, fromNode.y, toNode.x, toNode.y]}
                      stroke="#1F2433"
                      strokeWidth={40}
                      lineCap="round"
                      lineJoin="round"
                    />
                  );
                })}

                {/* 3. Rooms Render Layer */}
                {(rooms || [])
                  .filter((room) => room && (room.polygon || room.bbox))
                  .map((room, idx) => {
                    const isSelected = selectedRoom?.name === room.name;
                    const isHovered = hoveredRoom?.name === room.name;

                    // Fallback to bbox if no polygon
                    let points: number[] = [];
                    if (room.polygon && room.polygon.length > 0) {
                      points = room.polygon.flatMap(pt => [pt.x, pt.y]);
                    } else if (room.bbox) {
                      const rx = (room.bbox.x / 100) * imgW;
                      const ry = (room.bbox.y / 100) * imgH;
                      const rw = (room.bbox.width / 100) * imgW;
                      const rh = (room.bbox.height / 100) * imgH;
                      points = [
                        rx, ry,
                        rx + rw, ry,
                        rx + rw, ry + rh,
                        rx, ry + rh
                      ];
                    }

                    return (
                      <React.Fragment key={room.id || idx}>
                        {/* Room Area Polygon */}
                        <Line
                          points={points}
                          closed={true}
                          fill={getRoomColor(room.type as RoomType)}
                          opacity={isSelected ? 0.95 : (isHovered ? 0.90 : 0.80)}
                          stroke={isSelected ? '#60A5FA' : (isHovered ? '#A5B4FC' : '#2E3440')}
                          strokeWidth={isSelected ? 3 / scale : (isHovered ? 2 / scale : 1 / scale)}
                          shadowColor={isSelected ? '#60A5FA' : 'transparent'}
                          shadowBlur={isSelected ? 10 / scale : 0}
                          lineJoin="round"
                          onClick={() => handleRoomClick(room)}
                          onTap={() => handleRoomClick(room)}
                          onMouseEnter={(e) => {
                            setHoveredRoom(room);
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'pointer';
                          }}
                          onMouseLeave={(e) => {
                            setHoveredRoom(null);
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'grab';
                          }}
                        />

                        {/* Doors Rendering */}
                        {room.doors && room.doors.map((door, dIdx) => (
                          <Circle
                            key={`door-${room.id}-${dIdx}`}
                            x={door.x}
                            y={door.y}
                            radius={2.5 / scale}
                            fill="#F8FAFC"
                            stroke="#1E293B"
                            strokeWidth={1 / scale}
                            listening={false}
                          />
                        ))}
                      </React.Fragment>
                    );
                  })}

                {/* 4. Corridor Debug Overlay */}
                {showCorridorsDebug && corridorGraph && (
                  <>
                    {/* Render edges */}
                    {corridorGraph.edges.map((edge: any, idx: number) => {
                      const fromNode = corridorGraph.nodes.find((n: any) => n.id === edge.from);
                      const toNode = corridorGraph.nodes.find((n: any) => n.id === edge.to);
                      if (!fromNode || !toNode) return null;
                      return (
                        <Line
                          key={`edge-debug-${idx}`}
                          points={[fromNode.x, fromNode.y, toNode.x, toNode.y]}
                          stroke="#F59E0B"
                          strokeWidth={2 / scale}
                          dash={[5 / scale, 5 / scale]}
                          lineCap="round"
                          lineJoin="round"
                          opacity={0.6}
                          listening={false}
                        />
                      );
                    })}
                    {/* Render node circles */}
                    {corridorGraph.nodes.map((node: any, idx: number) => (
                      <Circle
                        key={`node-debug-${node.id || idx}`}
                        x={node.x}
                        y={node.y}
                        radius={4 / scale}
                        fill="#10B981"
                        stroke="#FFFFFF"
                        strokeWidth={1 / scale}
                        opacity={0.8}
                        listening={false}
                      />
                    ))}
                  </>
                )}

                {/* 5. Navigation Route Line */}
                {navigationActive && navigationPath && navigationPath.length >= 2 && (
                  <>
                    {/* Glow Layer */}
                    <Line
                      points={getAnimatedPoints()}
                      stroke="#60A5FA"
                      strokeWidth={10 / scale}
                      opacity={0.3}
                      lineCap="round"
                      lineJoin="round"
                      listening={false}
                    />
                    {/* Flowing Dash Line */}
                    <Line
                      points={getAnimatedPoints()}
                      stroke="#60A5FA"
                      strokeWidth={4 / scale}
                      dash={[12 / scale, 6 / scale]}
                      dashOffset={dashOffset / scale}
                      lineCap="round"
                      lineJoin="round"
                      listening={false}
                    />
                  </>
                )}

                {/* 6. User Positioning Marker */}
                {userPos && (
                  <>
                    {/* Pulsing Outer Ring (Visually constant modulations) */}
                    <Circle
                      x={userPos.x}
                      y={userPos.y}
                      radius={pulseRadius / scale}
                      fill="#3B82F6"
                      opacity={0.3}
                      listening={false}
                    />
                    {/* Core Blue Dot (Visually constant size) */}
                    <Circle
                      x={userPos.x}
                      y={userPos.y}
                      radius={5 / scale}
                      fill="#3B82F6"
                      stroke="#FFFFFF"
                      strokeWidth={1.5 / scale}
                      shadowColor="#3B82F6"
                      shadowBlur={6 / scale}
                      shadowOpacity={0.6}
                      listening={false}
                    />
                  </>
                )}

                {/* 7. Destination Pin Marker */}
                {navigationActive && selectedRoom && (
                  (() => {
                    let destX = 0, destY = 0;
                    if (selectedRoom.centroid) {
                      destX = selectedRoom.centroid.x;
                      destY = selectedRoom.centroid.y;
                    } else {
                      // Fallback estimation
                      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                      if (selectedRoom.polygon && selectedRoom.polygon.length > 0) {
                        for (const pt of selectedRoom.polygon) {
                          if (pt.x < minX) minX = pt.x;
                          if (pt.x > maxX) maxX = pt.x;
                          if (pt.y < minY) minY = pt.y;
                          if (pt.y > maxY) maxY = pt.y;
                        }
                        destX = minX + (maxX - minX) / 2;
                        destY = minY + (maxY - minY) / 2;
                      } else if (selectedRoom.bbox) {
                        destX = ((selectedRoom.bbox.x + selectedRoom.bbox.width / 2) / 100) * imgW;
                        destY = ((selectedRoom.bbox.y + selectedRoom.bbox.height / 2) / 100) * imgH;
                      }
                    }
                    
                    const pinScale = 1.5 / scale;
                    return (
                      <KonvaPath
                        x={destX}
                        y={destY + (pinBounceY / scale)}
                        data="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                        fill="#F97316"
                        stroke="#FFFFFF"
                        strokeWidth={1 / scale}
                        scaleX={pinScale}
                        scaleY={pinScale}
                        offsetX={12}
                        offsetY={22}
                        listening={false}
                      />
                    );
                  })()
                )}

                {/* 8. Dots Render Layer for Overlapped / Tiny Rooms */}
                {dotsToRender.map((dot, dotIdx) => (
                  <Circle
                    key={`label-dot-${dotIdx}`}
                    x={dot.cx}
                    y={dot.cy}
                    radius={2 / scale}
                    fill="#E2E8F0"
                    opacity={0.4}
                    listening={false}
                  />
                ))}

                {/* 9. Decluttered Room Labels Layer */}
                {labelsToRender.map((labelData, labelIdx) => {
                  const isSelected = selectedRoom?.name === labelData.roomName;
                  const isHovered = hoveredRoom?.name === labelData.roomName;
                  return (
                    <Text
                      key={`label-${labelIdx}`}
                      x={labelData.cx - 100}
                      y={labelData.cy - labelData.fontSize / 2}
                      width={200}
                      text={labelData.text}
                      fontSize={labelData.fontSize}
                      fontFamily="DM Sans, Inter, sans-serif"
                      fill={isSelected ? '#FFFFFF' : (isHovered ? '#FFFFFF' : '#E2E8F0')}
                      fontStyle={isSelected || isHovered ? 'bold' : 'normal'}
                      align="center"
                      verticalAlign="middle"
                      wrap="none"
                      // Text Legibility Halo: strong dark drop shadow
                      shadowColor="#000000"
                      shadowBlur={6}
                      shadowOpacity={1.0}
                      shadowOffsetX={1}
                      shadowOffsetY={1}
                      listening={false}
                    />
                  );
                })}
              </Layer>
            </Stage>
          </KonvaErrorBoundary>
        ) : (
          /* Empty Unloaded State */
          !loading && !imageError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3">
              <MapIcon className="w-16 h-16 text-text-secondary opacity-40 animate-bounce" />
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
        <NavPanel 
          selectedRoom={selectedRoom} 
          userPosition={userPos}
          navigationActive={navigationActive}
          onStartNavigation={handleStartNavigation}
          onClearNavigation={handleClearNavigation}
          navSteps={navSteps}
          totalDistance={totalDistance}
          walkTimeSeconds={walkTimeSeconds}
          navigationError={navigationError}
        />
      </div>
    </div>
  );
}
