# 🏗️ MapMyFloor — Architecture Document

> **Version:** 1.0 · **Status:** 🟢 Active · **Last Updated:** June 2026  
> **Stack:** React + Firebase + Gemini + Google Maps API · **Cost:** ₹0 MVP

---

## 🟦 1. System Overview

MapMyFloor is a **client-heavy React PWA** with a thin Firebase backend. The two heavy operations are:
- **AI parsing** — happens once at upload time (Gemini Vision via Cloud Function)
- **Pathfinding** — runs entirely in the browser (A* on a prebuilt grid)

Everything else is Firebase reads. This keeps cost near zero and the app fast.

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React PWA)                       │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  │
│  │  Upload  │  │  Admin   │  │    Map    │  │   Nav    │  │
│  │   Flow   │  │  Editor  │  │  Canvas   │  │  Engine  │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └────┬─────┘  │
│       └─────────────┴───────────────┴──────────────┘        │
│                              │                               │
└──────────────────────────────┼───────────────────────────────┘
                               │
          ┌────────────────────┼───────────────────┐
          │                    │                   │
   ┌──────▼──────┐    ┌────────▼────────┐   ┌─────▼──────┐
   │  Firebase   │    │ Firebase Cloud  │   │  Microsoft │
   │  Firestore  │    │   Functions     │   │ Teams SDK  │
   │  + Storage  │    │  (keys live here│   │ (Tab embed)│
   │  + Auth     │    │  Gemini API     │   └────────────┘
   └─────────────┘    │  Maps Geocoding)│
                      └─────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
             ┌──────▼──────┐    ┌────────▼───────┐
             │   Gemini    │    │  Google Maps   │
             │  1.5 Flash  │    │ Geocoding API  │
             │ Vision API  │    │ (building GPS) │
             └─────────────┘    └────────────────┘
```

---

## 🟩 2. The GPS → Map Pixel Mapping (Core Innovation)

This is the most important piece of the architecture.

### Step 1 — Admin Sets Up Building Once

```
Admin enters building address
        │
        ▼
Google Geocoding API → returns building center lat/lng
        │
        ▼
Admin marks 4 corners of building on a satellite map overlay
  NW corner: {lat, lng}
  NE corner: {lat, lng}
  SW corner: {lat, lng}
  SE corner: {lat, lng}
        │
        ▼
Stored in Firestore as building bounding box
```

### Step 2 — Gemini Extracts Real-World Scale From Floor Plan

```
Floor plan image uploaded
        │
        ▼
Gemini reads:
  • Scale bar (e.g. "10 meters")
  • Printed dimensions (e.g. "30' × 20'")
  • Total floor area if labeled
        │
        ▼
Output: { pixelsPerMeter: number }
  e.g. if image is 2000px wide and floor is 50m wide → 40px/m
        │
        ▼
Admin can manually override if AI gets it wrong
```

### Step 3 — Runtime GPS → Pixel Conversion

```javascript
// Building bounding box (set by admin)
const buildingBounds = {
  nw: { lat: 13.0827, lng: 80.2707 },
  se: { lat: 13.0820, lng: 80.2715 }
}

// User's current GPS (from browser navigator.geolocation)
const userGPS = { lat: 13.0824, lng: 80.2710 }

// Convert to 0-1 relative position within building
const relX = (userGPS.lng - buildingBounds.nw.lng) / 
             (buildingBounds.se.lng - buildingBounds.nw.lng)
const relY = (buildingBounds.nw.lat - userGPS.lat) / 
             (buildingBounds.nw.lat - buildingBounds.se.lat)

// Convert to canvas pixel
const canvasX = relX * floorPlan.imageWidth
const canvasY = relY * floorPlan.imageHeight

// → Blue dot placed at (canvasX, canvasY) on the map
```

---

## 🟨 3. Folder Structure

```
mapmyfloor/
│
├── docs/                          # ← All your MD files live here
│   ├── PRD.md
│   ├── ARCH.md
│   ├── DESIGN.md
│   ├── SETUP.md
│   └── TESTING.md
│
├── functions/                     # Firebase Cloud Functions (Node.js)
│   ├── src/
│   │   ├── index.ts               # Function exports
│   │   ├── geminiService.ts       # Calls Gemini API (key lives here)
│   │   └── geocodingService.ts    # Calls Google Geocoding API (key lives here)
│   ├── package.json
│   └── .env                       # 🔴 NEVER committed to GitHub
│
├── src/                           # React frontend
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── features/
│   │   ├── upload/
│   │   │   ├── UploadPage.tsx     # Drag & drop zone
│   │   │   └── FileConverter.ts   # PDF/SVG → PNG blob
│   │   │
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── LabelEditor.tsx    # Edit AI-detected rooms on map
│   │   │   ├── BuildingSetup.tsx  # GPS bounding box setup
│   │   │   └── ScaleEditor.tsx    # Manual scale override
│   │   │
│   │   ├── map/
│   │   │   ├── MapCanvas.tsx      # Konva.js 2D canvas
│   │   │   ├── RoomLayer.tsx      # Room polygons + labels
│   │   │   ├── RouteLayer.tsx     # Animated path
│   │   │   ├── UserMarker.tsx     # Blue GPS dot
│   │   │   └── GPSMapper.ts      # GPS lat/lng → canvas pixel
│   │   │
│   │   ├── navigation/
│   │   │   ├── NavPanel.tsx       # Directions sidebar / bottom sheet
│   │   │   ├── Pathfinder.ts      # A* algorithm
│   │   │   ├── GridBuilder.ts     # Floor plan → walkable grid
│   │   │   ├── DirectionEngine.ts # Grid path → turn-by-turn text
│   │   │   └── MarkerAnimator.ts  # Animates dot along route
│   │   │
│   │   ├── search/
│   │   │   ├── SearchBar.tsx
│   │   │   └── SearchIndex.ts     # Fuse.js fuzzy search
│   │   │
│   │   └── devmode/
│   │       ├── DevModeToggle.tsx  # Show/hide dev controls
│   │       └── SimulatedGPS.tsx   # Click map = fake GPS position
│   │
│   ├── services/
│   │   ├── firebase.ts            # Firebase init (uses env vars only)
│   │   ├── firestore.ts           # DB reads/writes
│   │   ├── storage.ts             # File upload/download
│   │   ├── auth.ts                # Auth helpers
│   │   └── gps.ts                 # navigator.geolocation wrapper
│   │
│   ├── hooks/
│   │   ├── useGPS.ts              # Polls GPS every 3 seconds
│   │   ├── useFloor.ts            # Current floor state
│   │   └── useNavigation.ts       # Navigation state machine
│   │
│   └── shared/
│       ├── components/            # Button, Modal, Toast, Spinner
│       ├── types/                 # TypeScript interfaces
│       └── constants.ts
│
├── public/
│   ├── test-floorplan.svg         # Fake NIQ floor plan for testing
│   └── manifest.json              # PWA manifest
│
├── .env.local                     # 🔴 NEVER committed (Firebase config)
├── .gitignore                     # Covers all .env files
├── firebase.json
├── firestore.rules
├── storage.rules
└── README.md
```

---

## 🟧 4. Data Models

### Firestore Collections

```
buildings/
  {buildingId}/
    name: "NIQ Chennai Office"
    address: "123 Anna Salai, Chennai"
    bounds: {
      nw: { lat: 13.0827, lng: 80.2707 },
      ne: { lat: 13.0827, lng: 80.2715 },
      sw: { lat: 13.0820, lng: 80.2707 },
      se: { lat: 13.0820, lng: 80.2715 }
    }
    createdBy: userId
    createdAt: timestamp

    floors/
      {floorId}/
        floorNumber: 5
        label: "5th Floor — East Wing"
        imageUrl: "gs://mapmyfloor.appspot.com/floorplans/..."
        imageWidth: 2480          ← original image px
        imageHeight: 1754
        pixelsPerMeter: 42.3     ← extracted by Gemini
        realWidthMeters: 58.6    ← computed
        realHeightMeters: 41.5
        walkableGrid: "base64..."← serialized boolean grid
        gridCellSize: 10         ← px per grid cell
        aiParsed: true
        scaleManuallyVerified: false

        rooms/
          {roomId}/
            name: "Conference Room 5A"
            type: "meeting_room"
            polygon: [{x:120,y:80}, {x:280,y:80}, ...]
            centroid: {x: 200, y: 150}
            occupant: null
            occupantEmail: null
            isWalkable: false
            realWidth: "6m"
            realHeight: "4m"

users/
  {userId}/
    displayName: "Prasenjeet Jena"
    email: "p.jena@niq.com"
    role: "admin"               ← "admin" | "user"
    buildingId: "bld_chennai_01"
    deskId: "room_desk_42"
```

---

## 🟩 5. AI Extraction Flow (Gemini)

```
User uploads floor plan file
        │
  ┌─────▼──────────────┐
  │  FileConverter.ts  │  PNG/JPG → pass through
  │                    │  PDF → pdf.js → canvas → PNG blob
  │                    │  SVG → canvas → PNG blob
  └─────┬──────────────┘
        │ PNG blob (base64)
        │
        ▼ HTTP POST (from browser)
  ┌─────────────────────────────────────────────┐
  │        Firebase Cloud Function              │
  │        geminiService.ts                     │
  │                                             │
  │  System Prompt to Gemini:                   │
  │  ┌─────────────────────────────────────┐    │
  │  │ You are analyzing an office floor   │    │
  │  │ plan image. Extract:                │    │
  │  │                                     │    │
  │  │ 1. SCALE: Find scale bar or         │    │
  │  │    dimension labels. Return          │    │
  │  │    pixelsPerMeter as a number.      │    │
  │  │                                     │    │
  │  │ 2. ROOMS: For each labeled area,    │    │
  │  │    return name, type, and bounding  │    │
  │  │    box as % of image {x,y,w,h}     │    │
  │  │    (0-100 scale).                   │    │
  │  │                                     │    │
  │  │ 3. CORRIDORS: Mark walkable areas.  │    │
  │  │                                     │    │
  │  │ Return ONLY valid JSON. No prose.   │    │
  │  └─────────────────────────────────────┘    │
  │                                             │
  │  Model: gemini-1.5-flash                    │
  └──────┬──────────────────────────────────────┘
         │
         │ JSON response
         ▼
  {
    pixelsPerMeter: 42.3,
    rooms: [
      { name: "Conference Room 5A", type: "meeting_room",
        bbox: { x: 12, y: 8, w: 18, h: 14 }, isWalkable: false },
      { name: "Corridor", type: "corridor",
        bbox: { x: 0, y: 30, w: 100, h: 10 }, isWalkable: true },
      ...
    ]
  }
         │
         ▼
  GridBuilder.ts (in browser)
  • Scale bboxes from % → actual canvas px
  • Build N×M boolean walkability grid
  • Store to Firestore
```

---

## 🟥 6. Navigation Engine (A* Pathfinding)

```
User GPS updates (every 3 seconds)
        │
        ▼
GPSMapper.ts
  lat/lng → canvas pixel (x, y)
        │
        ▼
MapCanvas.tsx
  Blue dot redraws at new position
        │
User selects destination room
        │
        ▼
Pathfinder.ts (A* algorithm)
  • Start: user's current canvas pixel → grid cell
  • End: destination room centroid → grid cell
  • Grid: boolean walkable/blocked matrix
  • Output: array of grid cells [{row, col}, ...]
        │
        ▼
DirectionEngine.ts
  • Walk path array, detect direction changes
  • Measure segment lengths (grid cells → meters via pixelsPerMeter)
  • Generate human instructions:
      "Head east along the main corridor (~18m)"
      "Turn left past the elevator bank"
      "Conference Room 5A is on your right"
        │
        ▼
RouteLayer.tsx
  • Draw animated dashed line on canvas
  • Line traces itself over 800ms

MarkerAnimator.ts
  • Blue dot animates along path as GPS updates
  • In dev mode: dot follows click position instantly
```

---

## 🟦 7. Key Security Architecture

```
❌ WRONG (never do this):
   Browser → Gemini API (key exposed in network tab)

✅ CORRECT (our approach):
   Browser → Firebase Cloud Function → Gemini API
                    ↑
              Key lives here, in .env
              Never leaves the server
              Never in GitHub
```

### .gitignore (covers all secrets)
```
# Environment variables — NEVER commit these
.env
.env.local
.env.*.local
functions/.env
functions/.env.local

# Firebase private files
.firebase/
firebase-debug.log
firestore-debug.log

# Build output
dist/
node_modules/
functions/node_modules/
```

---

## 🟩 8. Tech Stack & Cost

| Layer | Technology | Monthly Cost |
|---|---|---|
| Frontend framework | React 18 + Vite + TypeScript | ₹0 |
| 2D canvas | Konva.js | ₹0 |
| PDF → image | pdf.js (Mozilla) | ₹0 |
| Fuzzy search | Fuse.js | ₹0 |
| AI vision | Gemini 1.5 Flash (1500 req/day free) | ₹0 |
| Geocoding | Google Maps Geocoding (200K/mo free) | ₹0 |
| Database | Firebase Firestore (Spark free tier) | ₹0 |
| File storage | Firebase Storage (1GB free) | ₹0 |
| Auth | Firebase Auth | ₹0 |
| Hosting | Firebase Hosting | ₹0 |
| Serverless | Firebase Cloud Functions | ₹0 |
| Teams SDK | @microsoft/teams-js | ₹0 |
| **TOTAL** | | **₹0** |

---

## 🟨 9. Dev Mode (Testing Without Office)

```
DevModeToggle.tsx — visible only in development build

When ON:
  • GPS polling disabled
  • Click anywhere on map → sets simulated user position
  • Position updates instantly (no GPS drift)
  • Small banner: "🧪 Dev Mode — Click map to set position"

When OFF (production):
  • Real GPS via navigator.geolocation
  • Polls every 3 seconds
  • Shows accuracy radius circle around blue dot
```

---

## 🟥 10. Teams Integration

```
Teams Client (Desktop / Mobile App)
        │
        │  User opens MapMyFloor tab
        ▼
manifest.json (Teams App Manifest v1.16)
  staticTabs:
    - contentUrl: "https://mapmyfloor.web.app/teams"
      scopes: ["personal"]
  validDomains:
    - "mapmyfloor.web.app"
        │
        ▼
React App (/teams route)
  microsoftTeams.initialize()
  microsoftTeams.getContext()
    → context.userPrincipalName (e.g. p.jena@niq.com)
    → Look up user in Firestore
    → Load their assigned building + floor + desk
    → Map renders with their position auto-detected
```
