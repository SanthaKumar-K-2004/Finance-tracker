# AlphaX Solution Flagship Apple Luxury Portal & Multi-Shop Architecture

## Overview
The flagship portal for **AlphaX Solution** has been created with an **Apple-inspired luxury aesthetic** (inspired by visionOS and Apple.com), cinematic fluid motion background, floating capsule header, unreduced high-contrast typography, and a dedicated **Shop Account Gateway** modal supporting individual branch accounts that seamlessly transitions into the active 31-day microfinance collection register.

---

## 1. Key Accomplishments

### A. Apple visionOS Floating Capsule Header
- **Geometry & Backdrop:** Floating capsule (`max-w-6xl`, `h-[68px]`, `rounded-full`) engineered with frosted liquid glass (`bg-neutral-950/75`, `backdrop-blur-2xl`, chamfered `border-white/15`, specular inner reflection).
- **Brand Emblem:** Precision titanium "AX" square emblem with ambient sapphire backlight glow and crisp typography (`ALPHAX SOLUTION • BUILD • AUTOMATE • SCALE`).
- **Interactive Navigation:** Smooth pill hover states for **Features**, **POS Hardware**, **Live Simulation**, and **Leadership**.
- **Control Cluster:** Live Turso Cloud heartbeat pulse, bilingual language switcher (`தமிழ்` / `EN`), active branch trigger chip (`SHOP-ALR-01`), and signature Apple Blue pill CTA (`#0071E3`).

### B. Unreduced & Properly Aligned Body Text (User Mandate)
- Per the explicit user requirement (*"the header more proper look feel the body text no more reduce place correct align"*), body text is never shrunken or crowded:
  - **Hero Headline:** Pro Display scale (`text-4xl sm:text-6xl md:text-7xl font-extrabold`) with subtle metallic silver gradient clip.
  - **Hero Body Copy:** Generous `18px–20px` (`text-lg sm:text-xl md:text-xl text-neutral-200`) with comfortable line height (`sm:leading-8`) and centered alignment (`max-w-3xl mx-auto`).
  - **Section Intros:** Clean `16px–18px` (`text-base sm:text-lg text-neutral-300`) with high contrast against the obsidian background (`#04070E`).

### C. Cinematic Fluid Video / Liquid Canvas Background
- Built in `src/components/AmbientVideoBackground.jsx`:
  - 60 FPS GPU-accelerated procedural canvas rendering fluid sapphire, deep cyan, and indigo wave filaments.
  - Layered with an HTML5 video backdrop and radial vignette contrast mask to ensure text legibility.

### D. Multi-Shop Branch Account Gateway & Modal
- **Shop Context Provider (`src/context/ShopContext.jsx`):**
  - Manages active branch, localStorage persistence (`alphax_active_shop`), and branch switching.
  - Seeded with default branches:
    - `SHOP-ALR-01`: **ALR Finance (ஸ்ரீ லக்ஷ்மி ஃபைனான்ஸ்)** • Alanganallur
    - `SHOP-VDP-02`: **Vadipatti Branch (வாடிப்பட்டி கிளை)** • Vadipatti
    - `SHOP-MLR-03`: **Melur Branch (மேலூர் கிளை)** • Melur
- **VisionOS Modal (`src/components/ShopLoginModal.jsx`):**
  - Segmented control with 3 tabs: **Registered Branches**, **Shop ID / PIN Login**, and **Onboard New Branch**.
  - Selecting or authenticating a branch immediately sets the active workspace and launches the register at `/collection`.
- **Backend Endpoints (`server/routes/shops.js`):**
  - `GET /api/shops`: Lists all active branches.
  - `POST /api/shops/login`: Validates shop ID & PIN.
  - `POST /api/shops/register`: Onboards new branches with auto-generated codes (`SHOP-BR-04`, etc.).

### E. App Routing & Workspace Integration
- **`src/App.jsx`:**
  - Wrapped with `<ShopProvider>`.
  - Routes `/` and `/portal` load the Apple-inspired `<AlphaXLandingPage />`.
  - Routes `/collection`, `/dashboard`, `/clients`, `/closed`, `/excel`, `/settings` render inside the enterprise `<Layout>`.
- **`src/components/Layout.jsx`:**
  - Header displays the active shop name and branch code badge with a 1-click "Switch Branch" trigger.
  - Navigation bar features a glowing **AlphaX Portal** link with Sparkles icon to return to the landing page anytime.
  - Embedded `<ShopLoginModal />` allows switching branches from anywhere within the ledger.

---

## 2. Verification & Test Results

1. **Vite Production Build:**
   - Command: `npm run build`
   - Result: Built in 8.82s with zero compilation errors.
2. **Automated Test Suite:**
   - Command: `npm test`
   - Verified 18 comprehensive test suites including `test/alphax_portal_and_shops.test.js`.
   - Result: 100% tests passed, 0 failures.
3. **Live API Endpoints:**
   - `GET /api/shops` -> HTTP 200 (returned 3 branch profiles).
   - `POST /api/shops/login` -> HTTP 200 (`Authenticated as ALR Finance`).
   - `GET http://localhost:5173/` -> HTTP 200 OK.
4. **Git Repository:**
   - Changes committed and pushed to `https://github.com/SanthaKumar-K-2004/Finance-tracker.git` on branch `main`.

---

## 3. URLs
- **AlphaX Solution Flagship Apple Portal:** [http://localhost:5173/](http://localhost:5173/) or [http://localhost:5173/portal](http://localhost:5173/portal)
- **31-Day Collection Register:** [http://localhost:5173/collection](http://localhost:5173/collection)
- **Express Backend & Turso Cloud:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
