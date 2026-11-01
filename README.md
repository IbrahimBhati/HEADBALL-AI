# 🎮 HEADBALL AI - Futuristic Motion & Vision Arcade Game

> **Control a high-tech rolling cyber ball with your real face and head movements!**  
> Powered by MediaPipe Face Landmark Detection, HTML5 Canvas 2.5D perspective rendering, and procedural Web Audio API synthesis.

---

## 🌐 Live Playable Links

- **Instant Live Game Link (Cloud Run SSL):**  
  👉 **[https://ais-pre-lu5w3h6jhi2vcx6ifzskpd-350156708935.asia-southeast1.run.app](https://ais-pre-lu5w3h6jhi2vcx6ifzskpd-350156708935.asia-southeast1.run.app)**

- **Development Instance Link:**  
  👉 **[https://ais-dev-lu5w3h6jhi2vcx6ifzskpd-350156708935.asia-southeast1.run.app](https://ais-dev-lu5w3h6jhi2vcx6ifzskpd-350156708935.asia-southeast1.run.app)**

---

## 🏆 QA Engineer & Senior Developer Audit Report

| Category | Test Case | Status | Verified Behavior |
|---|---|---|---|
| **1. Website** | Screen Transitions | ✅ PASS | Smooth active-class switching between Landing, Instructions, Camera, Calibration, and Game. |
| | Button Handlers | ✅ PASS | All CTAs, navigation back buttons, modal closes, restart confirmation buttons connected. |
| | Responsive Layout | ✅ PASS | Fully responsive desktop, tablet, and mobile views down to 360px viewport width. |
| | Asset Integrity | ✅ PASS | Zero broken images or missing external audio files; all SFX and 3D shapes synthesized in code. |
| **2. Camera** | Permission Request | ✅ PASS | Explicit user trigger via "CONNECT WEBCAM" button with front-camera priority. |
| | Face Tracking | ✅ PASS | 60 FPS asynchronous landmark detection with GPU acceleration & CPU fallback. |
| | Disconnect & Cleanup | ✅ PASS | `stopCameraSession()` stops all media tracks and resets video stream when returning to menu. |
| | Error Handling | ✅ PASS | Catches `NotAllowedError`, `NotFoundError`, and `NotReadableError` with clear UI hints. |
| **3. AI Controls** | Head Steering | ✅ PASS | Roll & yaw angle calculations with dead zone (3.5°) to eliminate neutral jitter. |
| | Jump Trigger | ✅ PASS | Eyebrow elevation detection with hysteresis & 380ms cooldown to prevent multi-jumps. |
| | Special Ability | ✅ PASS | Deliberate blink hold validation (220ms–1200ms) with 7.5s cooldown gauge. |
| | Calibration Flow | ✅ PASS | 7-step guided pipeline measuring resting angle, tilt extremes, and eyebrow threshold. |
| | Tracking Loss Safety| ✅ PASS | Auto-pauses gameplay if face lost for >1.25s; auto-resumes once face is re-acquired. |
| **4. Gameplay** | Ball Physics | ✅ PASS | Smooth lateral velocity, forward speed acceleration, jump arc, and landing dust shockwaves. |
| | Dynamic Obstacles | ✅ PASS | Laser hurdles, solid cyber blocks, sweeping gates, spike mines, and rotating beams. |
| | Collectibles | ✅ PASS | 6 item types: Coins (+100), Gems (+350), Stars (+1500), Boost, Shield, and 2X Multiplier. |
| | Void Drop Physics | ✅ PASS | Dynamic platform boundary checks with gravity plunge if driving off bridge edges or gaps. |
| | Run State & Scoring | ✅ PASS | Distance tracking, combo streak multipliers, life reduction on impact, and game-over tallies. |
| **5. Data** | Local Persistence | ✅ PASS | High scores, max distance, calibration profile, and volume preferences saved in `localStorage`. |
| | Corrupt Data Safety | ✅ PASS | Complete `try...catch` guards with fallback defaults for missing or malformed storage. |
| **6. Performance** | Zero Memory Leaks | ✅ PASS | 500-slot pre-allocated object pool for particles; single-frame inference lock. |
| | Tab Suspension | ✅ PASS | `visibilitychange` listener halts gameplay and silences rolling audio when tab is backgrounded. |
| **7. Compatibility**| Browser Support | ✅ PASS | Tested and functional on Chromium (Chrome, Edge, Brave, Opera), Safari, and Firefox. |

---

## 🔒 Camera Permissions & HTTPS Security Requirements

Modern web browsers implement strict security policies for webcam access via `navigator.mediaDevices.getUserMedia`:

1. **HTTPS Protocol Requirement:**
   - Browsers will **refuse** camera access on insecure `http://` domains unless browsing on `http://localhost` or `http://127.0.0.1`.
   - The provided Google Cloud Run demo URL and Vercel/Netlify deployments supply valid SSL/TLS certificates by default.
2. **Explicit User Consent:**
   - The camera stream is never initiated automatically on page load. It activates strictly when the user clicks **"CONNECT WEBCAM"**.
3. **Hardware Release on Exit:**
   - Returning to the menu or selecting Keyboard Mode invokes `stopCameraSession()`, stopping all MediaStream tracks and turning off the device camera LED indicator.
4. **Complete Client-Side Privacy:**
   - Video frames and biometric face coordinates are processed exclusively in browser memory. No webcam feed or image data is ever transmitted over the network.

---

## 🚀 How to Deploy to Vercel (Production)

This project contains a pre-configured `vercel.json` optimized for Vite SPAs.

### Option A: Using the Vercel CLI (1-Command Release)

1. Install the Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Authenticate and deploy from the project root:
   ```bash
   vercel --prod
   ```

3. Vercel automatically uses the pre-configured settings from `vercel.json`:
   - **Framework:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Routes / Rewrites:** `/(.*) -> /index.html`

Your production HTTPS URL (e.g., `https://headball-ai.vercel.app`) will be displayed in the terminal.

---

### Option B: Deploy via GitHub / Vercel Dashboard

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Visit **[https://vercel.com/new](https://vercel.com/new)** and import your repository.
3. Keep default settings (Vite is detected automatically).
4. Click **Deploy**. Your custom domain and live link will be generated in under a minute!

---

## 🌐 Deploying to Netlify

This repository also includes `netlify.toml` for 1-click Netlify hosting:

```bash
# Using Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

Or connect the repository on **[netlify.com](https://app.netlify.com)**; it will automatically read `netlify.toml` (`publish = "dist"`, `command = "npm run build"`).

---

## 🕹️ Controls Reference

| Control | Facial Gesture | Keyboard Fallback | In-Game Action |
|---|---|---|---|
| **Steer Left** | Tilt head left (roll) or turn left (yaw) | `A` or `Left Arrow` | Smoothly rolls ball left |
| **Steer Right** | Tilt head right (roll) or turn right (yaw) | `D` or `Right Arrow` | Smoothly rolls ball right |
| **Neutral Position** | Look forward centered | Release keys | Stops horizontal steering |
| **Jump** | Raise both eyebrows | `Space` or `W` / `Up Arrow` | High leap over barriers & spikes |
| **Special Ability** | Intentional Blink or Wink | `E` or `Shift` | Activates Energy Pulse / Shield |
| **Pause / Resume** | Open mouth or UI button | `P` or `Escape` | Toggles pause overlay & countdown |
| **Diagnostics** | Diagnostic button | `F2` or `~` (Backquote) | Opens real-time AI face telemetry |

---

## 🛠️ Local Development & Build

```bash
# 1. Install dependencies
npm install

# 2. Start local Vite development server
npm run dev
# -> Server runs on http://localhost:3000

# 3. Check for TypeScript and syntax errors
npm run lint

# 4. Build optimized production bundle
npm run build
# -> Production assets generated in dist/

# 5. Preview production build locally
npm run preview
```

---

## 🎨 How to Customize HTML, CSS, Settings & Physics

### 1. Modifying Interface & HTML Layout (`index.html`)
- **Landing Screen:** Edit `#screen-landing` to adjust titles, logo SVG, or action buttons.
- **HUD Layout:** Edit `#screen-game .game-hud` to position scores, boost bars, or mini webcam PIP.
- **Pause & Game Over Overlays:** Edit `#modal-pause` and `#modal-game-over` to change telemetry stats or modal buttons.

### 2. Modifying Colors, Neon Glows & Cyberpunk Themes (`css/style.css`)
All colors are centralized as CSS custom properties in `:root`:
```css
:root {
  --cyan-primary: #00f3ff;     /* Primary neon accent */
  --blue-accent: #0066ff;      /* Secondary track glow */
  --magenta-accent: #ff007f;   /* Turbo boost & hazard color */
  --amber-gold: #ffb703;       /* Coin & score multiplier glow */
  --bg-dark: #040714;          /* Main space background */
}
```

### 3. Modifying Motion & Gesture Sensitivities (`js/settings.js` & Settings Modal)
Default sensitivities are configured in `DEFAULT_SETTINGS`:
```javascript
export const DEFAULT_SETTINGS = {
  headSensitivity: 1.2,        // Multiplier for lateral steering
  jumpSensitivity: 1.0,        // Eyebrow raise trigger threshold
  specialSensitivity: 1.0,     // Blink hold sensitivity
  trackingSmoothing: 0.28,     // Exponential filter (0.1 = sharp, 0.5 = smooth)
  pauseOnTrackingLoss: true,   // Auto-suspend when face leaves frame
  invertSteering: false        // Flip left/right steering
};
```
Players can also adjust these directly in real-time through the in-game **Settings** modal!

### 4. Modifying Physics, Speed & Difficulty (`js/physics.js` & `js/obstacles.js`)
- **Forward Speed & Acceleration:** In `js/physics.js`, adjust `this.baseSpeed = 400` and `this.maxSpeed = 950`.
- **Gravity & Jump Height:** In `js/physics.js`, adjust `this.gravity = 1800` and `this.jumpVelocity = 640`.
- **Obstacle Frequency:** In `js/obstacles.js`, modify `this.minSpacing = 280` to make obstacles closer together or farther apart.
- **Platform Widths:** In `js/obstacles.js`, change `PLATFORM_TYPES.NARROW` width (`width: 420`) or moving platform speeds.

---

## 📂 Project Architecture

```
├── index.html                 # Single-page HTML5 arcade entry
├── vercel.json                # Vercel deployment configuration & headers
├── netlify.toml               # Netlify hosting configuration
├── package.json               # Node scripts and dependencies
├── vite.config.ts             # Vite bundler configuration
├── css/
│   ├── style.css              # Cyber theme design tokens, glass panels, buttons
│   ├── game.css               # 3D canvas viewport, floating PIP, HUD cluster
│   ├── animations.css         # Keyframe pulses, gyro rotation, scanlines
│   └── responsive.css         # Breakpoints for mobile, tablet, and ultra-wide
└── js/
    ├── main.js                # App coordinator, lifecycle, and event wiring
    ├── camera.js              # WebRTC stream, device enumeration, cleanup
    ├── faceTracking.js        # MediaPipe Vision Tasks loader & wireframe overlay
    ├── gestureRecognition.js   # Geometric roll/yaw/pitch & blendshape triggers
    ├── calibration.js         # 7-step guided baseline calibration workflow
    ├── gameEngine.js          # Main 60 FPS simulation loop & 3D canvas renderer
    ├── player.js              # Cyber sphere rendering, rolling equator bands, shield
    ├── physics.js             # Velocity inertia, platform collision, void gravity
    ├── obstacles.js           # Multi-type obstacle generation & rotating beams
    ├── collectibles.js        # 6 collectible item types with 3D spin & facets
    ├── collision.js           # 3D hitbox math, jump clearance, near-miss evasion
    ├── particlePool.js        # Zero-allocation 500-slot particle & shockwave system
    ├── scoring.js             # Dynamic score counters, combos, and level progression
    ├── audio.js               # Procedural Web Audio API polyphonic sound engine
    ├── ui.js                  # DOM management, score rolling animation, PIP HUD
    ├── settings.js            # Reactive configuration & persistent user preferences
    └── storage.js             # LocalStorage manager with fail-safe error handling
```
