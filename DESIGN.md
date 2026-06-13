# 🎨 MapMyFloor — Design Document

> **Version:** 1.0 · **Status:** 🟢 Active · **Last Updated:** June 2026  
> **Style:** Dark wayfinding · **Inspired by:** Airport signage + Google Maps night mode

---

## 🟦 1. Design Philosophy

MapMyFloor lives in utilitarian contexts — Teams tabs on phones, office lobbies, one hand holding the door open. The design must do three things in under 3 seconds:

1. Show me where I am
2. Show me where I'm going
3. Show me how to get there

No onboarding. No decoration. No carousels. The visual language borrows from **wayfinding design** — airports, hospitals, transit systems — not SaaS dashboards. High contrast. Directional energy. Color only used to encode meaning.

---

## 🟩 2. Color Palette

### Map & Navigation Colors (semantic — these encode meaning)

| Token | Hex | Usage |
|---|---|---|
| `--color-user` | `#3B82F6` | 🔵 User's GPS blue dot |
| `--color-destination` | `#F97316` | 🟠 Destination pin |
| `--color-route` | `#60A5FA` | Route line on map |
| `--color-room-default` | `#1E293B` | Unselected room fill |
| `--color-room-hover` | `#334155` | Room hovered |
| `--color-room-selected` | `#1E3A5F` | Room selected/destination |
| `--color-walkable` | `#0F172A` | Corridor / walkable area |

### UI Surface Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#0F1117` | App background |
| `--color-surface` | `#1A1D27` | Sidebar, panels |
| `--color-surface-alt` | `#232736` | Cards, inputs, sheet |
| `--color-border` | `#2E3347` | Dividers, strokes |

### Text Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-text-primary` | `#F1F5F9` | Main text |
| `--color-text-secondary` | `#94A3B8` | Labels, metadata |
| `--color-text-disabled` | `#475569` | Disabled states |

### Status Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-success` | `#22C55E` | ✅ Detection complete |
| `--color-warning` | `#EAB308` | ⚠️ Low GPS accuracy |
| `--color-error` | `#EF4444` | ❌ No route found |
| `--color-accent` | `#818CF8` | Buttons, CTAs, active states |

---

## 🟨 3. Typography

```
Display / Headings   →   DM Sans       (geometric, wayfinding-native)
Body / UI Labels     →   Inter         (reliable at small sizes)
Coordinates / Debug  →   JetBrains Mono (grid values, GPS coords)
```

### Type Scale

| Token | Size | Weight | Usage |
|---|---|---|---|
| `--text-xs` | 11px | 500 | Room labels on map |
| `--text-sm` | 13px | 400 | Metadata, secondary UI |
| `--text-base` | 15px | 400 | Body, directions text |
| `--text-lg` | 18px | 600 | Section headers |
| `--text-xl` | 24px | 700 | Page titles |
| `--text-2xl` | 32px | 700 | Hero / first screen |

---

## 🟧 4. Spacing & Shape

```
Base unit: 4px
Scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64

Border radius:
  --radius-sm:    4px   (inputs, chips)
  --radius-md:    8px   (cards, panels)
  --radius-lg:    12px  (bottom sheet, modals)
  --radius-full:  9999px (pills, markers, dots)
```

---

## 🟩 5. Screen Layouts

### 5.1 Mobile User View (390px) — Main Navigation Screen

```
┌─────────────────────────────┐
│ 🗺️ MapMyFloor    [Floor 5 ▼]│  ← Header (48px tall)
│                  [🧪 Dev]   │     Floor picker dropdown
├─────────────────────────────┤
│                             │
│                             │
│                             │
│      [FULL BLEED MAP]       │  ← Konva canvas, pan + pinch-zoom
│                             │     Rooms shown as dark polygons
│         🔵 (you)            │     Blue dot = your GPS position
│         ━━━━━━►             │     Orange route line
│               🏁            │     Orange pin = destination
│                             │
│                             │
├─────────────────────────────┤
│ 🔍  Search rooms or desks…  │  ← Tap to open search sheet
├─────────────────────────────┤
│  ↑ Turn left at elevator    │  ← Directions strip (slides up)
│  ~40 meters · est. 2 min    │
│  [← Prev]  Step 2 of 5  [Next →]│
└─────────────────────────────┘
```

### 5.2 Search Bottom Sheet (Mobile)

```
┌─────────────────────────────┐
│ ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │  ← Drag handle
│                             │
│  Where do you want to go?   │
│                             │
│  🔍 [___________________]   │  ← Autofocused
│                             │
│  ── RECENT ─────────────    │
│  🚪 Conference Room 5A      │
│  🪑 Desk 42 · Rohan Sharma  │
│                             │
│  ── ALL ROOMS ──────────    │
│  🚪 Room 5A  ·  Meeting     │
│  🚪 Room 5B  ·  Meeting     │
│  🍽️  Cafeteria  ·  Food     │
│  🛗  Elevator Bank          │
│  🚻  Restroom               │
│  🪑  Desk Row A (12 desks)  │
└─────────────────────────────┘
```

### 5.3 Desktop / Laptop Layout (≥ 768px)

```
┌──────────────────────────────────────────────────────┐
│  🗺️ MapMyFloor              [Floor 5 ▼]  [👤 Admin]  │
├───────────────────┬──────────────────────────────────┤
│                   │                                  │
│  NAVIGATE         │                                  │
│  ─────────────    │                                  │
│  📍 Your location │                                  │
│  GPS: active ●    │         [FULL MAP CANVAS]        │
│                   │                                  │
│  🏁 Destination   │      (click rooms to select)     │
│  🔍 Search…       │      (pinch/scroll to zoom)      │
│                   │      (drag to pan)               │
│  ─────────────    │                                  │
│  DIRECTIONS       │                                  │
│                   │                                  │
│  1 ▸ Head east    │                                  │
│    along corridor │                                  │
│    ~20 meters     │                                  │
│                   │                                  │
│  2 ▸ Turn left    │                                  │
│    at elevator    │                                  │
│    bank           │                                  │
│                   │                                  │
│  3 ▸ Room 5A on   │                                  │
│    your right     │                                  │
│                   │                                  │
│  ────────────     │                                  │
│  Total: ~3 min    │                                  │
│                   │                                  │
│  [▶ Start Nav]    │                                  │
└───────────────────┴──────────────────────────────────┘
```

### 5.4 Admin Upload Flow — Screen 1

```
┌──────────────────────────────────┐
│  ← Back       Add Floor Plan     │
├──────────────────────────────────┤
│                                  │
│  Building                        │
│  [NIQ Chennai Office        ▼]   │
│                                  │
│  Floor Number                    │
│  [5                         ▼]   │
│                                  │
│  Floor Label                     │
│  [5th Floor — East Wing    ]     │
│                                  │
│  ┌──────────────────────────┐    │
│  │                          │    │
│  │   📁 Drop file here      │    │
│  │   or click to browse     │    │
│  │                          │    │
│  │  PNG · JPG · PDF · SVG   │    │
│  │  Max size: 20MB          │    │
│  │                          │    │
│  └──────────────────────────┘    │
│                                  │
│  [  🤖 Upload & Detect Rooms  ]  │
└──────────────────────────────────┘
```

### 5.5 Admin Upload Flow — Screen 2 (AI Review)

```
┌──────────────────────────────────┐
│  ← Re-upload    Review Rooms     │
│  ✅ 14 rooms detected by AI      │
├──────────────────────────────────┤
│                                  │
│  [MAP WITH ROOM OVERLAYS]        │
│  ┌────────────────────────────┐  │
│  │  [Room 5A]  [Corridor]     │  │  ← Editable chips on map
│  │  [Cafeteria]  [Desk Row 1] │  │
│  └────────────────────────────┘  │
│                                  │
│  Scale: 42px/m  [Edit manually]  │
│                                  │
│  ── ROOM LIST ─────────────────  │
│  🚪 Conference Room 5A  Meeting ✏️│
│  🚪 Conference Room 5B  Meeting ✏️│
│  🍽️  Cafeteria          Food    ✏️│
│  🛗  Elevator           Util    ✏️│
│  🚶 Main Corridor       Walk    ✏️│
│                                  │
│  [  💾 Save & Publish Floor   ]  │
└──────────────────────────────────┘
```

---

## 🟥 6. Map Visual Specs

### The 2D Canvas

| Element | Visual Spec |
|---|---|
| Canvas background | `#0F1117` — near black |
| Floor plan image | Rendered at natural size, alpha 0.9 |
| Room polygon fill | `#1E293B` at 70% opacity |
| Room polygon stroke | `#334155` 1px |
| Selected room fill | `#1E3A5F` with `#3B82F6` 2px stroke |
| Corridor fill | `#0F172A` — slightly darker than rooms |
| Room label text | 11px DM Sans, `#94A3B8` |

### User Location Dot

```
● Blue circle (12px diameter)
  Fill: #3B82F6
  + Outer ring: #3B82F6 at 30% opacity, 24px
  + Pulse animation: ring scales 1x → 2x, fades out, 2s loop
  + Accuracy radius: semi-transparent blue circle
    (radius = GPS accuracy in pixels)
```

### Destination Pin

```
📍 Orange teardrop shape (24px tall)
   Fill: #F97316
   Stroke: #EA580C 1.5px
   Drop shadow: 0 2px 8px rgba(249,115,22,0.4)
```

### Route Line

```
━━━━━━━━━━━━►
Color: #60A5FA
Width: 3px
Style: dashed (8px dash, 4px gap)
Animation: dash-offset animates forward → "marching ants" effect
Draw animation: strokes itself over 800ms on route calculation
Arrow: arrowhead every ~80px along route
```

---

## 🟩 7. Animation Specs

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Route line draw | stroke-dashoffset 100%→0 | 800ms | ease-out |
| User dot pulse | scale+opacity ring | 2s infinite | ease-in-out |
| User dot move | position lerp | 500ms | ease-out |
| Bottom sheet open | translateY 100%→0 | 300ms | ease-out |
| Room hover | background-color | 150ms | linear |
| Search results | opacity+translateY | 200ms stagger | ease-out |
| Destination pin drop | scale 0→1.2→1 | 400ms | spring |

> ⚠️ All animations respect `prefers-reduced-motion: reduce`

---

## 🟨 8. Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 768px | Full-bleed map, bottom sheet search, bottom directions strip |
| Tablet | 768–1024px | 35/65 split, left sidebar, map right |
| Desktop | > 1024px | 25/75 split, expanded directions panel |

---

## 🟧 9. Dev Mode UI

```
┌─────────────────────────────┐
│ 🧪 DEV MODE ACTIVE          │  ← Yellow banner at top
│ Click map to set position   │
└─────────────────────────────┘
```

- Visible only when `VITE_ENV=development`
- Toggle switch in header
- Click anywhere on map = instant position update
- Coordinate display: `GPS sim: (x: 842, y: 631)` in monospace bottom-left

---

## 🟥 10. Empty States

| State | Icon | Message | Action |
|---|---|---|---|
| No floor plans | 🗺️ | "No map yet. Ask your admin to upload a floor plan." | — |
| AI detection failed | 🤖 | "Couldn't read this plan clearly. Upload a higher resolution image or add rooms manually." | [Add manually] |
| GPS unavailable | 📡 | "Location access denied. Enable location in your browser settings." | [Open settings] |
| No route found | 🚧 | "No walkable path found. Your admin may need to mark corridors." | — |
| No search results | 🔍 | "Nothing matches '[query]'. Try a room number or colleague's name." | — |
| Outside building | 🏢 | "You appear to be outside the building. Navigate to the entrance first." | — |

---

## 🟩 11. Icon System (Lucide React — free)

| Icon | Lucide Name | Usage |
|---|---|---|
| 📍 | `MapPin` | Location pin, destination |
| 🔍 | `Search` | Search bar |
| 🚪 | `DoorOpen` | Meeting rooms |
| 🪑 | `Armchair` | Desks |
| 🛗 | `ArrowUpDown` | Elevator |
| 🚻 | `Users` | Restroom |
| 🍽️ | `Coffee` | Cafeteria |
| ⬆️ | `Navigation` | Direction arrow |
| ✏️ | `Pencil` | Admin edit |
| ➕ | `Plus` | Add room/floor |
| 📡 | `Signal` | GPS status |
| 🧪 | `FlaskConical` | Dev mode |
| ⚙️ | `Settings` | Admin settings |
