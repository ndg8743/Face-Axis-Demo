React + TypeScript + Vite project with an off-axis projection 3D viewer that uses MediaPipe Face Mesh to track the user's head position and adjust the camera perspective in real-time, creating a "window into another world" parallax effect.

## Tech Stack
- React 18 with TypeScript
- Vite for build tooling
- Three.js for 3D rendering
- MediaPipe Face Mesh for face tracking (@mediapipe/face_mesh, @mediapipe/camera_utils)
- Tailwind CSS for styling

## Core Features

### 1. Off-Axis Projection Camera
Create an OffAxisCamera class that:
- Takes screen physical dimensions in centimeters (width, height, viewing distance)
- Converts head pose (normalized x, y, z from face tracking) to world coordinates
- Updates the Three.js camera projection matrix using asymmetric frustum:

```typescript
// Head pose to world position
const worldX = -(headPose.x - 0.5) * screenWidthWorld * 1.5;
const worldY = -(headPose.y - 0.5) * screenHeightWorld * 1.5;
const worldZ = viewingDistanceCm * 0.01 * (1 / headPose.z);

// Asymmetric frustum calculation
const scale = nearPlane / cameraZ;
const left = (-screenWidthWorld/2 - cameraX) * scale;
const right = (screenWidthWorld/2 - cameraX) * scale;
const bottom = (-screenHeightWorld/2 - cameraY) * scale;
const top = (screenHeightWorld/2 - cameraY) * scale;

camera.projectionMatrix.makePerspective(left, right, top, bottom, near, far);
camera.position.set(cameraX, cameraY, cameraZ);
camera.lookAt(cameraX, cameraY, 0);
```

### 2. Face Tracking with MediaPipe
- Use MediaPipe Face Mesh to detect 468 facial landmarks
- Extract head position from landmark 168 (between eyes) for X/Y
- Estimate depth (Z) from eye landmark distance (landmarks 33 and 263)
- Apply smoothing to reduce jitter (exponential moving average, factor ~0.3)
- Normalize values: X and Y to 0-1 range, Z as relative scale

### 3. 3D Scene
- Dark background (#1A1A1A)
- Orange/coral wireframe room grid for depth perception (#FF7020)
- Load a 3D .glb model (shoe or any model from public folder)
- Position model at center, slightly below eye level
- Ambient light + directional lights for good illumination

### 4. Calibration System
Store in localStorage:
- screenWidthCm (default: 34)
- screenHeightCm (default: 19)
- viewingDistanceCm (default: 60)
- pixelWidth, pixelHeight (auto-detect from window)

Provide a settings panel to adjust these values.

### 5. UI Components
- **Camera Permission Screen**: Request webcam access with clear messaging
- **Settings Panel** (bottom-right corner):
  - Screen width/height inputs (cm)
  - Viewing distance slider
  - Recalibrate button
  - Debug mode toggle
- **Camera Preview** (top-right corner):
  - Small webcam feed (160x120)
  - Face tracking indicator dot
  - Show/hide toggle
- **Loading indicator** while model loads

### 6. Styling
- Dark theme with orange accents
- Semi-transparent panels with backdrop blur
- Clean, minimal UI that doesn't distract from the 3D effect
- Fullscreen by default

## File Structure
```
src/
├── components/
│   ├── App.tsx
│   ├── CameraPermission.tsx
│   ├── SettingsPanel.tsx
│   └── CameraPreview.tsx
├── hooks/
│   ├── useFaceTracking.ts
│   └── useOffAxisScene.ts
├── utils/
│   ├── OffAxisCamera.ts
│   ├── calibration.ts
│   └── faceTracker.ts
├── main.tsx
└── index.css
public/
└── models/
    └── shoe.glb (or any .glb model)
```

## Important Notes
- The effect works best on desktop with a webcam
- Screen dimensions must match physical monitor size for accurate parallax
- Camera should be near top-center of screen
- Works best in fullscreen mode
- Start with face centered, then move head side-to-side to see the effect
```

---

### Follow-up Prompts

After the initial build, use these prompts to refine:

**Add a custom model loader:**
```
Add a URL input field in settings that lets users paste a URL to any .glb model and load it into the scene. Validate that the URL ends in .glb and handle loading errors gracefully.
```

**Improve the wireframe room:**
```
Create a more impressive wireframe room with:
- Grid floor with perspective lines
- Grid walls on left, right, and back
- Glowing orange lines (#FF7020) with slight bloom effect
- Lines should fade with distance
```

**Add model controls:**
```
Add controls to the settings panel for:
- Model scale (slider 0.1 to 2.0)
- Model rotation speed (auto-rotate toggle + speed slider)
- Model position offset (X, Y, Z sliders)
```

**Optimize face tracking:**
```
Improve the face tracking performance:
- Add a smoothing factor slider (0.1 to 0.9)
- Show FPS counter in debug mode
- Add head position visualization in debug mode (XYZ values)
- Use requestAnimationFrame efficiently
```

---

## How the Off-Axis Projection Works

The magic of this effect comes from the **asymmetric frustum projection**:

1. **Normal 3D rendering** uses a symmetric frustum (pyramid shape) centered on the camera
2. **Off-axis projection** shifts the frustum based on viewer position, creating a "window" effect
3. As you move your head, the frustum shifts to maintain the illusion that you're looking through a window into the 3D scene

**Key insight**: The screen acts as a fixed window. When you move your head left, you should see more of the right side of the scene (just like looking through a real window).

**The algorithm:**
```
1. Get head position (x, y, z) from face tracking
2. Convert to world coordinates based on physical screen size
3. Set camera position to head position
4. Calculate asymmetric frustum bounds relative to screen edges
5. Update projection matrix with makePerspective(left, right, top, bottom, near, far)
6. Camera always looks at the center of the screen plane
```

---

## References

- Johnny Lee's Wii Head Tracking (2007) - original inspiration
- Robert Kooima's "Generalized Perspective Projection" paper
- Three.js documentation on camera.projectionMatrix
- MediaPipe Face Mesh documentation

---

## Sample .glb Models

You can use these free models:
- Sketchfab (download as .glb)
- Poly Pizza (poly.pizza)
- Google Poly archive
- Kenney's 3D assets (kenney.nl)

Or upload your own 3D scanned object!
