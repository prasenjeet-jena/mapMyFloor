# 🗺️ MapMyFloor — Indoor Navigation App

MapMyFloor is a client-heavy React Progressive Web App (PWA) designed for indoor wayfinding. It is tailored for utilitarian contexts—such as display screens in office lobbies, embedded Microsoft Teams tabs on mobile phones, or quick corridor navigation. 

It aims to answer three core questions in under 3 seconds:
1. **Where am I?** (GPS tracking and simulation)
2. **Where am I going?** (Fuzzy room/desk search)
3. **How do I get there?** (A* pathfinding and turn-by-turn directions)

---

## ⚡ Tech Stack & Architecture

MapMyFloor runs heavy computations directly in the browser to keep operational costs at near-zero.

*   **Frontend Framework**: React 18 + Vite + TypeScript
*   **Styling**: Tailwind CSS v4 (Custom wayfinding-inspired dark theme)
*   **2D Graphics**: Konva.js + React Konva (for fluid panning/zooming and room polygons)
*   **Backend Services**: Firebase (Auth, Firestore DB, and Cloud Storage)
*   **AI Vision**: Gemini 1.5 Flash (runs on Firebase Cloud Functions to parse uploaded floor plans and auto-detect rooms & scales)
*   **Geocoding**: Google Maps Geocoding API (for mapping coordinates)

---

## ✨ Key Features

*   **Interactive 2D Canvas**: Clean dark-themed map canvas showing walkable corridors, clickable room polygons, and animated route lines.
*   **A\* Navigation Engine**: Client-side pathfinding algorithm that calculates shortest routes between the user's position and target destinations.
*   **Fuzzy Search**: Find colleagues, meeting rooms, or desk hot-spots using Fuse.js search index.
*   **AI Floor Plan Calibrator**: Upload a schematic PDF/PNG/SVG and let Gemini auto-detect room boundaries, labels, and real-world scale (pixels per meter).
*   **Developer Sim Mode**: Simulate locations in real-time by clicking anywhere on the map during development.

---

## 🛠️ Getting Started

### 1. Prerequisites
Make sure you have Node.js (v18.x.x or higher) installed.

### 2. Install Dependencies
Clone the repository, navigate to the folder, and run:
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory and add your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_auth_domain
VITE_FIREBASE_PROJECT_ID=mapmyfloor
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_ENV=development
```

*(For backend Gemini & Geocoding integrations, see [docs/SETUP.md](file:///Users/swarna/Desktop/MapMyFloor/docs/SETUP.md) for adding keys to Cloud Functions.)*

### 4. Run Locally
Start the development server:
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser to view the application.

---

## 📂 Project Structure

```
src/
├── main.tsx             # App entrypoint
├── App.tsx              # Router, Auth Provider, & main structure
├── index.css            # Custom fonts & Tailwind theme definitions
│
├── features/            # Feature modular folders
│   ├── upload/          # Floorplan image/PDF drop zone
│   ├── admin/           # Bounding calibration & room review dashboards
│   ├── map/             # Konva canvas rendering, routes, & markers
│   ├── navigation/      # Pathfinder engine & directions generator
│   ├── search/          # Search bar & fuzzy index
│   └── devmode/         # Location click simulation tools
│
├── services/            # Client SDK init (Firebase, Auth, Firestore)
├── hooks/               # Custom hooks (useGPS, useFloor)
└── shared/              # Reusable components & shared TypeScript types
```

---

## 📖 Learn More
Detailed guides can be found under the `docs/` folder:
*   [Product Requirements (PRD.md)](file:///Users/swarna/Desktop/MapMyFloor/docs/PRD.md)
*   [Architecture Design (ARCH.md)](file:///Users/swarna/Desktop/MapMyFloor/docs/ARCH.md)
*   [Visual Specifications (DESIGN.md)](file:///Users/swarna/Desktop/MapMyFloor/docs/DESIGN.md)
*   [Detailed Installation Guide (SETUP.md)](file:///Users/swarna/Desktop/MapMyFloor/docs/SETUP.md)
*   [Testing Strategy (TESTING.md)](file:///Users/swarna/Desktop/MapMyFloor/docs/TESTING.md)
