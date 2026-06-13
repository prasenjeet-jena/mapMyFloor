# 🗺️ MapMyFloor — Product Requirements Document

> **Version:** 1.0 · **Status:** 🟢 Active · **Sprint:** 5 Days · **Last Updated:** June 2026  
> **Author:** Prasenjeet Jena · **Type:** Internal First (NIQ) → Open Source

---

## 🟦 1. Problem Statement

When employees or visitors arrive at an office building, navigation becomes a dead zone. GPS stops being useful the moment they walk through the door. They don't know where their desk is, where a meeting room is, or how to get there — especially on a large floor or in a building they've never visited.

Companies solve this with expensive hardware (BLE beacons, Wi-Fi triangulation) or proprietary systems that are impossible to embed into tools like Microsoft Teams.

**MapMyFloor** solves this differently:

> A floor plan image already contains all real-world dimension data. Room sizes, corridor widths, total floor area — all printed on the plan. We extract this scale using AI, build a pixel-perfect 2D map, overlay the user's GPS coordinates onto that map, and navigate them turn-by-turn — just like Google Maps, but indoors.

---

## 🟦 2. Product Vision

> *"Upload a floor plan. AI reads the dimensions. GPS puts you on the map. Navigate like Google Maps — no hardware, no beacons, no setup."*

---

## 🟩 3. How It Works — Core Concept

```
FLOOR PLAN IMAGE
      │
      ▼
Gemini Vision AI extracts:
  • Real-world scale  (e.g. 1cm = 2m, or room = 30ft × 20ft)
  • All room names + pixel positions
  • Corridor / walkable areas
  • Building entry points
      │
      ▼
2D MAP BUILT
  • Every pixel maps to real-world meters
  • Rooms, desks, corridors overlaid
      │
      ▼
USER OPENS APP
  • GPS gives lat/lng (Google location data)
  • Admin pre-mapped building GPS bounding box
  • User's GPS → converted to pixel position on 2D map
  • Blue dot appears on map
      │
      ▼
USER SEARCHES DESTINATION
  • A* pathfinding calculates route
  • Route drawn on map
  • Turn-by-turn directions generated
  • Blue dot moves as GPS updates
```

### ⚠️ Known Limitation (Documented Honestly)
Indoor GPS drifts ±15–20 meters. The blue dot will be approximately correct — directionally accurate, not centimeter-precise. This is acceptable for v1. Good enough to find a room. We improve accuracy in v2 (optional BLE beacons).

---

## 🟨 4. Goals & Success Metrics

### MVP Goals (5-Day Sprint)
- [ ] Upload any floor plan (PNG, JPG, PDF, SVG)
- [ ] Gemini AI extracts scale + room data automatically
- [ ] Admin can review and correct AI detections
- [ ] 2D interactive map renders with real-world dimensions
- [ ] GPS auto-places user on map (no manual pinning)
- [ ] Search any room, desk, or person
- [ ] Animated route + turn-by-turn directions
- [ ] Works in Microsoft Teams Tab
- [ ] Works on mobile browser + desktop browser
- [ ] Dev mode for simulation testing (no office needed)

### 📊 Success Metrics

| Metric | Target |
|---|---|
| Time to first navigable map | < 2 min from upload |
| AI room detection accuracy | > 80% correct without admin edit |
| Navigation task completion | > 90% users reach destination |
| GPS position accuracy | Within 1–2 rooms of actual location |
| Teams tab load time | < 3 seconds |
| Monthly API cost | ₹0 (free tiers) |

---

## 🟧 5. User Personas

### 👤 Alex — New Employee
- First week at a 400-person office
- Doesn't know where teammates sit or where meeting rooms are
- Opens Teams on phone, searches "Conference Room 5B"
- Wants: GPS auto-locates him, animated path shows him where to walk

### 👤 Priya — Visitor / Guest
- Attending a client meeting, first time in this building
- Opens a shared link (no Teams needed)
- Wants: Select floor, see where she is, navigate to reception or meeting room

### 👤 Raj — Facility Manager / Admin
- Manages 3 floors across 2 buildings
- Uploads floor plans, reviews AI detections, assigns desk owners
- Wants: Easy upload, quick correction UI, floor management dashboard

---

## 🟥 6. User Stories

### Admin Stories

| ID | Story | Priority |
|---|---|---|
| A1 | Upload floor plan (PNG/JPG/PDF/SVG) | 🔴 P0 |
| A2 | See AI-detected rooms overlaid on plan | 🔴 P0 |
| A3 | Manually correct room names, types, positions | 🔴 P0 |
| A4 | Enter building address for GPS bounding box | 🔴 P0 |
| A5 | Mark building corner coordinates on satellite view | 🔴 P0 |
| A6 | Assign person name + email to a desk | 🟡 P1 |
| A7 | Manage multiple floors under one building | 🟡 P1 |
| A8 | Set real-world scale manually if AI misses it | 🟡 P1 |

### User Stories

| ID | Story | Priority |
|---|---|---|
| U1 | App auto-detects my location via GPS on map | 🔴 P0 |
| U2 | Select which floor I am on | 🔴 P0 |
| U3 | Search for a room, desk, or person by name | 🔴 P0 |
| U4 | See highlighted route from my location to destination | 🔴 P0 |
| U5 | See turn-by-turn directions in plain text | 🔴 P0 |
| U6 | Animated marker moves along route as I walk | 🟡 P1 |
| U7 | Use app inside Microsoft Teams | 🟡 P1 |
| U8 | Use dev mode to simulate walking (testing) | 🟡 P1 |

---

## 🟦 7. Scope

### ✅ In Scope (MVP)
- Floor plan upload (PNG, JPG, PDF, SVG)
- Gemini Vision AI scale + room extraction
- Admin correction UI (drag pins, rename, retype)
- Building GPS bounding box setup (one-time admin step)
- GPS auto-location on 2D map
- Floor selector
- A* pathfinding + route drawing
- Animated walking marker
- Turn-by-turn text directions
- Room/desk/person search
- Microsoft Teams Tab
- Dev/simulation mode
- Firebase backend (free tier)
- Key security (no keys in frontend or GitHub)

### ❌ Out of Scope (MVP)
- Multi-floor routing (stairs/elevator between floors)
- BLE / Wi-Fi beacon positioning
- Real-time people location tracking
- Room booking / calendar integration
- 3D view
- Offline mode
- Native mobile app (iOS/Android)

---

## 🟩 8. Testing Strategy

### Since We Have No Real Floor Plan Yet

| Phase | What We Do |
|---|---|
| **Phase 1 (Now)** | I generate a realistic fake NIQ Chennai Floor 5 floor plan (SVG with proper dimensions, rooms, corridors) |
| **Phase 2 (Dev)** | Dev mode: click anywhere on map = simulated GPS position. Test full navigation flow from home. |
| **Phase 3 (Real)** | Take phone to any large building (mall, apartment complex). Test real GPS drift. Tune scale calibration. |
| **Phase 4 (NIQ)** | Get actual NIQ floor plan from facilities team. Run full real test. |

---

## 🟨 9. Open Questions

| # | Question | Decision Needed By |
|---|---|---|
| 1 | Should non-admin users need to log in, or is map public within org? | Day 1 |
| 2 | Should desk assignments sync with Azure AD / org directory? | Day 2 |
| 3 | Teams SSO — personal Microsoft account or org tenant only? | Day 4 |
| 4 | Who at NIQ will be the first admin to test upload? | Week 2 |

---

## 🟥 10. 5-Day Sprint Plan

| Day | Focus | Key Deliverables |
|---|---|---|
| 🔵 **Day 1** | Foundation | Docs ✅, repo setup, Firebase init, folder structure, routing |
| 🟢 **Day 2** | Upload + AI | File upload UI, Gemini extraction, scale detection, room overlay |
| 🟡 **Day 3** | Map Engine | 2D canvas, pan/zoom, GPS→pixel mapping, admin label editor |
| 🟠 **Day 4** | Navigation | A* pathfinding, route draw, turn-by-turn, animated marker, dev mode |
| 🔴 **Day 5** | Teams + Ship | Teams Tab manifest, search UX, mobile QA, Firebase deploy |
