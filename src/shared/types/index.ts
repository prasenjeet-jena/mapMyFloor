export enum RoomType {
  MEETING_ROOM = 'meeting_room',
  CONFERENCE_ROOM = 'conference_room',
  DESK_AREA = 'desk_area',
  RECEPTION = 'reception',
  CAFETERIA = 'cafeteria',
  RESTROOM = 'restroom',
  ELEVATOR = 'elevator',
  STAIRCASE = 'staircase',
  CORRIDOR = 'corridor',
  MEDICAL = 'medical',
  PRAYER = 'prayer',
  RECREATION = 'recreation',
  ADMIN = 'admin',
  HR = 'hr',
  IT_SERVER = 'it_server',
  BOARDROOM = 'boardroom',
  OTHER = 'other'
}

export interface Point {
  x: number;
  y: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface BuildingBounds {
  nw: LatLng;
  ne: LatLng;
  sw: LatLng;
  se: LatLng;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  bounds: BuildingBounds;
  createdBy: string;
  createdAt: any; // Firebase Timestamp or string date representation
}

export interface Floor {
  id: string;
  buildingId: string;
  floorNumber: number;
  label: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  pixelsPerMeter: number;
  realWidthMeters: number;
  realHeightMeters: number;
  walkableGrid: string; // Base64 serialized grid
  gridCellSize: number; // Pixels per grid cell
  aiParsed: boolean;
  scaleManuallyVerified: boolean;
}

export interface Room {
  id?: string;
  buildingId?: string;
  floorId?: string;
  name: string;
  type: RoomType;
  polygon?: Point[]; // Array of vertices
  centroid?: Point;
  occupant?: string | null;
  occupantEmail?: string | null;
  isWalkable: boolean;
  realWidth?: string;
  realHeight?: string;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Direction {
  text: string;
  distanceMeters: number;
  type: 'straight' | 'left' | 'right' | 'arrival' | 'elevator' | 'stairs';
}

export interface NavigationRoute {
  path: Point[];
  distanceMeters: number;
  estimatedTimeMinutes: number;
  steps: Direction[];
}
