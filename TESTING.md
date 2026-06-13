# 🧪 MapMyFloor — Testing Guide

> **No office? No real floor plan? No problem.**  
> This guide walks you through testing every feature from your home.

---

## 🟦 Phase 1 — Test With Fake Floor Plan (From Home)

We use a generated fake floor plan of "NIQ Chennai — Floor 5" that I will create.  
It has realistic dimensions, labeled rooms, corridors, and a scale bar.

### What the fake floor plan contains:

```
NIQ Chennai Office — 5th Floor (East Wing)
Total area: 58m × 41m = 2,378 sq meters

Rooms:
  • Reception / Lobby           (entry point, 8m × 6m)
  • Conference Room 5A          (6m × 4m)
  • Conference Room 5B          (6m × 4m)
  • Conference Room 5C — Large  (10m × 6m)
  • Open Desk Area — Row A      (20m × 8m, 24 desks)
  • Open Desk Area — Row B      (20m × 8m, 24 desks)
  • Cafeteria / Break Room      (8m × 6m)
  • Restroom — Male             (4m × 3m)
  • Restroom — Female           (4m × 3m)
  • Elevator Bank               (4m × 4m)
  • Staircase East              (3m × 4m)
  • IT Server Room              (4m × 3m)
  • HR Cabin                    (4m × 4m)
  • Main Corridor (horizontal)  (58m × 4m)
  • Side Corridor (vertical)    (4m × 37m)
  Scale bar: 10 meters shown
```

---

## 🟩 Phase 2 — Dev Mode Testing (Simulated GPS)

### How to Enable Dev Mode

In the app (when `VITE_ENV=development`):
1. Top right of screen → click **🧪** icon
2. A yellow banner appears: **"Dev Mode Active — Click map to set position"**
3. Now click anywhere on the floor map → blue dot appears there
4. Click another point → dot moves there (simulating walking)

### Test Scenario 1 — Basic Navigation

```
Steps:
1. Open app → select "NIQ Chennai" → select "Floor 5"
2. Enable Dev Mode
3. Click on "Reception / Lobby" area → blue dot appears
4. Search for "Conference Room 5A"
5. Tap the result

Expected result:
✅ Orange pin drops on Conference Room 5A
✅ Route line draws itself from Reception to 5A (800ms animation)
✅ Directions appear:
     "Head east along main corridor (~22m)"
     "Turn left past elevator bank"
     "Conference Room 5A is on your left"
✅ Total time estimate shown (~2 min walk)
```

### Test Scenario 2 — Walking Simulation

```
Steps:
1. Start nav from Reception to Conference Room 5C
2. Look at the route drawn on map
3. Click step by step along the corridor path
   (simulating walking)

Expected result:
✅ Blue dot moves to each click position
✅ Current direction instruction updates:
   Step 1 → "Head east along corridor"
   Step 2 → "Continue east (~10m remaining)"
   Step 3 → "Turn right at the cafeteria"
   Arrival → "You have arrived at Conference Room 5C"
✅ Animated marker follows the route line
```

### Test Scenario 3 — Search

```
Steps:
1. Tap the search bar
2. Type "conf"

Expected result:
✅ Results show:
   🚪 Conference Room 5A
   🚪 Conference Room 5B
   🚪 Conference Room 5C — Large

3. Type "rohan" (if desk assigned to Rohan)
Expected result:
✅ 🪑 Desk 14 · Rohan Sharma
```

### Test Scenario 4 — Admin Upload

```
Steps:
1. Go to /admin route
2. Sign in with Google (you become admin)
3. Click "Add Floor Plan"
4. Upload the fake floor plan SVG file
5. Click "Upload & Detect Rooms"
6. Wait for Gemini to respond (~5-10 seconds)

Expected result:
✅ Loading spinner shown during detection
✅ Rooms overlay appears on map
✅ Room list shows:
   Conference Room 5A — Meeting Room
   Conference Room 5B — Meeting Room
   Main Corridor — Walkable
   ...etc
✅ Scale shows: ~42px/meter
✅ You can click any room chip to rename it
✅ Click "Save & Publish Floor"
✅ Floor now visible in user app
```

### Test Scenario 5 — GPS Accuracy Warning

```
Steps:
1. Disable Dev Mode (toggle off)
2. Allow location access when browser asks

Expected result:
✅ App requests location permission
✅ If indoors at home: accuracy will be ~20-50m
✅ Blue dot appears with a large accuracy radius circle
✅ Warning shows: "⚠️ Low GPS accuracy indoors"
✅ Navigation still works — just approximate
```

---

## 🟨 Phase 3 — Real GPS Test (When Ready)

### Option A — Test at Home Building / Apartment

```
1. Go outside your apartment/home
2. Open app on phone browser (or Teams)
3. Upload a rough sketch of your floor as a PNG
   (hand-drawn is fine for testing)
4. Set building address to your apartment address
5. Walk around → observe blue dot movement

What to look for:
✅ Does the dot move as you walk? (yes = GPS updating)
✅ How far off is it? (typically 5-15m outdoors)
✅ Does it drift indoors? (yes, expected in v1)
```

### Option B — Test at a Mall or Large Building

```
Large buildings like Express Avenue, Phoenix Market City etc.
have multiple floors → perfect for testing floor selector.

Steps:
1. Create a building entry for the mall in admin
2. Use Google Maps to get the lat/lng of 4 building corners
3. Upload any floor plan image you find online for that mall
4. Walk inside with the app open

This gives the most realistic indoor GPS drift test.
```

### Option C — Get NIQ Floor Plan

```
Contact: NIQ Chennai Facilities team
Ask for: "Floor plan of any floor in our office — 
          PNG or PDF format"

Typical options:
• Emergency evacuation map (usually on every floor)
• IT infrastructure map (has room labels)
• Seating plan (has desk assignments)

Any of these work as input for MapMyFloor.
```

---

## 🟧 Phase 4 — Teams Tab Testing

### Local Teams Testing

```
1. Install Teams desktop app (if not already)
2. Go to Teams → Apps → Manage your apps
3. Click "Upload a custom app"
4. Upload the manifest.json we create on Day 5
5. App appears as a tab in Teams
6. Open on mobile Teams app for mobile test
```

### Teams Developer Portal

```
1. Go to https://dev.teams.microsoft.com
2. Sign in with your Microsoft account
3. Apps → Import → upload manifest.json
4. Test in Teams directly from developer portal
```

---

## 🟥 Known Limitations to Document (For GitHub README)

```markdown
## Known Limitations (v1)

- **Indoor GPS accuracy:** GPS drifts ±15-20m indoors. 
  The blue dot is approximate. This is a hardware limitation 
  of GPS satellites, not a bug. Future versions will support 
  BLE beacon for centimeter-level accuracy.

- **Floor detection:** Users must manually select which floor 
  they are on. GPS cannot reliably detect building floor/level.

- **Scale calibration:** Gemini AI reads the scale from the 
  floor plan image. If the floor plan has no scale bar or 
  dimension labels, the scale must be entered manually.

- **Building setup:** Admin must mark the building's GPS 
  bounding box once during setup. This is a one-time 5-minute 
  task per building.
```

---

## ✅ Testing Checklist (All Phases)

### Phase 1 — Fake Floor Plan
- [ ] Fake floor plan SVG loads correctly
- [ ] Gemini detects rooms (>80% accuracy)
- [ ] Scale detected correctly
- [ ] Route draws from Reception to any room
- [ ] Turn-by-turn directions make sense
- [ ] Animated marker follows route
- [ ] Search finds rooms by name

### Phase 2 — Dev Mode
- [ ] Dev mode toggle appears in dev build
- [ ] Click on map sets blue dot position
- [ ] Navigation updates as position changes
- [ ] Directions update step by step

### Phase 3 — Real GPS
- [ ] Location permission prompt appears
- [ ] Blue dot appears on map
- [ ] Dot updates as you move outdoors
- [ ] Accuracy circle shown for low-accuracy GPS

### Phase 4 — Teams
- [ ] App loads inside Teams desktop
- [ ] App loads inside Teams mobile
- [ ] User email auto-detected from Teams context
- [ ] Floor and building auto-selected for known user
