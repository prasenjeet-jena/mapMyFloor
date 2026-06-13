# ⚙️ MapMyFloor — Setup Guide

> **Follow this exactly, step by step. Every command is copy-pasteable.**  
> If anything looks different from what's described, stop and tell me before continuing.

---

## 🟦 PHASE 1 — Get Your API Keys (Do This First)

### Step 1.1 — Gemini API Key (Google AI Studio)

1. Open → **https://aistudio.google.com**
2. Sign in with your Google account
3. Left sidebar → click **"Get API key"**
4. Click blue button → **"Create API key"**
5. Select → **"Create API key in new project"**
6. Key appears (starts with `AIzaSy...`)
7. Click **Copy** → paste into a notes file as:
   ```
   GEMINI_KEY = AIzaSy.....
   ```

---

### Step 1.2 — Firebase Project

1. Open → **https://console.firebase.google.com**
2. Click → **"Add project"**
3. Project name → type: `mapmyfloor`
4. Google Analytics → **Disable** (not needed)
5. Click **"Create project"** → wait ~30 seconds
6. Once inside the project dashboard:

**Enable Firestore:**
- Left sidebar → **"Firestore Database"**
- Click **"Create database"**
- Select **"Start in test mode"** (we'll add rules later)
- Location → choose **asia-south1 (Mumbai)** → Click **Enable**

**Enable Storage:**
- Left sidebar → **"Storage"**
- Click **"Get started"**
- Select **"Start in test mode"**
- Same location → **asia-south1** → Click **Done**

**Enable Authentication:**
- Left sidebar → **"Authentication"**
- Click **"Get started"**
- Click **"Google"** provider → toggle **Enable** → Save
- Click **"Anonymous"** provider → toggle **Enable** → Save

**Get Firebase Config:**
- Top of page → click the **gear icon ⚙️** → **"Project settings"**
- Scroll down to **"Your apps"**
- Click the **</>** (web) icon
- App nickname → type: `mapmyfloor-web`
- Check ✅ **"Also set up Firebase Hosting"**
- Click **"Register app"**
- You'll see a config object like this — copy it:
  ```javascript
  const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "mapmyfloor.firebaseapp.com",
    projectId: "mapmyfloor",
    storageBucket: "mapmyfloor.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
  };
  ```
- Save these values into your notes file

---

### Step 1.3 — Google Maps Geocoding API

1. Open → **https://console.cloud.google.com**
2. Make sure the **same Google account** is selected (top right)
3. Top bar → click the project dropdown → select **"mapmyfloor"**
4. Left menu → **"APIs & Services"** → **"Library"**
5. Search → **"Geocoding API"** → click it → click **"Enable"**
6. Left menu → **"APIs & Services"** → **"Credentials"**
7. Click **"+ Create Credentials"** → **"API Key"**
8. Copy the key → save to notes as:
   ```
   GEOCODING_KEY = AIzaSy.....
   ```
9. Click **"Edit API key"** → under **"API restrictions"**:
   - Select **"Restrict key"**
   - Choose **"Geocoding API"** only
   - Click **Save**

---

## 🟩 PHASE 2 — Local Machine Setup

### Step 2.1 — Check Node.js Version

Open your terminal (Mac: press `Cmd + Space`, type "Terminal", hit Enter)

```bash
node --version
```

Expected output: `v18.x.x` or higher (like `v20.x.x`)

> ⚠️ If you see v16 or lower, go to **https://nodejs.org** and download the LTS version.

---

### Step 2.2 — Install Firebase CLI

```bash
npm install -g firebase-tools
```

Wait for it to finish. Then verify:

```bash
firebase --version
```

Expected output: something like `13.x.x`

---

### Step 2.3 — Login to Firebase

```bash
firebase login
```

This opens your browser. Sign in with the **same Google account** you used for Firebase. Come back to terminal — you should see:

```
✔  Success! Logged in as your@email.com
```

---

## 🟨 PHASE 3 — Create the Project (In Antigravity 2.0)

> Open Antigravity 2.0 now. All commands below go into Antigravity's terminal panel.

### Step 3.1 — Create the React App

```bash
npm create vite@latest mapmyfloor -- --template react-ts
```

When it asks questions:
- Framework → **React**
- Variant → **TypeScript**

Then:

```bash
cd mapmyfloor
```

---

### Step 3.2 — Install All Dependencies

Run these one at a time. Wait for each to finish before running the next.

```bash
# Core UI
npm install

# Firebase
npm install firebase

# 2D Map Canvas
npm install konva react-konva

# Microsoft Teams SDK
npm install @microsoft/teams-js

# PDF to image conversion
npm install pdfjs-dist

# Fuzzy search
npm install fuse.js

# Icons
npm install lucide-react

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Router
npm install react-router-dom
```

---

### Step 3.3 — Initialize Firebase in the Project

```bash
firebase init
```

It will ask you a series of questions. Answer exactly as shown:

```
? Which Firebase features do you want to set up?
  ✅ Firestore
  ✅ Functions
  ✅ Hosting
  ✅ Storage
  (use spacebar to select, enter to confirm)

? Please select an option:
  → Use an existing project
  → select "mapmyfloor"

? What file should be used for Firestore Rules?
  → Press Enter (accept default: firestore.rules)

? What file should be used for Firestore indexes?
  → Press Enter (accept default: firestore.indexes.json)

? What language would you like to use for Cloud Functions?
  → TypeScript

? Do you want to use ESLint to catch probable bugs?
  → No

? Do you want to install dependencies with npm now?
  → Yes

? What do you want to use as your public directory?
  → dist

? Configure as a single-page app (rewrite all urls to /index.html)?
  → Yes

? Set up automatic builds and deploys with GitHub?
  → No

? What file should be used for Storage Rules?
  → Press Enter (accept default: storage.rules)
```

---

### Step 3.4 — Create the .env.local File

In Antigravity, create a new file in the project root called `.env.local`:

```
VITE_FIREBASE_API_KEY=paste_your_firebase_apiKey_here
VITE_FIREBASE_AUTH_DOMAIN=paste_your_authDomain_here
VITE_FIREBASE_PROJECT_ID=mapmyfloor
VITE_FIREBASE_STORAGE_BUCKET=paste_your_storageBucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=paste_your_messagingSenderId_here
VITE_FIREBASE_APP_ID=paste_your_appId_here
VITE_ENV=development
```

> 🔴 Fill in each value from the Firebase config you copied in Step 1.2.  
> 🔴 Do NOT put the Gemini key or Geocoding key here — those go in the Cloud Functions.

---

### Step 3.5 — Set Up Cloud Function Environment Variables

```bash
cd functions
```

Create a file called `.env` inside the `functions/` folder:

```
GEMINI_API_KEY=paste_your_gemini_key_here
GEOCODING_API_KEY=paste_your_geocoding_key_here
```

Then go back to root:

```bash
cd ..
```

---

### Step 3.6 — Update .gitignore

Open the `.gitignore` file in the project root and make sure it contains:

```
# Environment files — NEVER commit these
.env
.env.local
.env.*.local
functions/.env
functions/.env.local
functions/.env.*.local

# Firebase
.firebase/
firebase-debug.log
firestore-debug.log
storage.rules.backup

# Build
dist/
node_modules/
functions/node_modules/

# OS
.DS_Store
Thumbs.db
```

---

### Step 3.7 — Verify the Project Runs

```bash
npm run dev
```

Expected output:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open your browser → **http://localhost:5173**

You should see the default Vite + React page. That means everything is working.

---

## 🟧 PHASE 4 — Security Rules

### Firestore Rules

Open `firestore.rules` in your project and replace everything with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /buildings/{buildingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';

      match /floors/{floorId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null &&
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';

        match /rooms/{roomId} {
          allow read: if request.auth != null;
          allow write: if request.auth != null &&
            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
        }
      }
    }

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Storage Rules

Open `storage.rules` and replace with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /floorplans/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.size < 20 * 1024 * 1024;
    }
  }
}
```

---

## ✅ Day 1 Completion Checklist

At the end of Day 1 setup, verify:

- [ ] Gemini API key obtained and saved
- [ ] Firebase project created with Firestore, Storage, Auth, Hosting
- [ ] Google Geocoding API enabled
- [ ] Node 18+ confirmed
- [ ] Firebase CLI installed and logged in
- [ ] Vite + React + TypeScript project created
- [ ] All npm packages installed
- [ ] Firebase initialized (firestore, functions, hosting, storage)
- [ ] `.env.local` created with Firebase config values
- [ ] `functions/.env` created with Gemini + Geocoding keys
- [ ] `.gitignore` updated to exclude all `.env` files
- [ ] `npm run dev` runs successfully → localhost:5173 loads
- [ ] Firestore rules updated
- [ ] Storage rules updated

**When all boxes are checked → tell me and we start Day 2 (Upload + AI).**
