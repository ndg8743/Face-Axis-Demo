// Off-Axis Camera Implementation

/**
 * Off-Axis Projection Camera for Three.js
 * Creates a "window into another world" effect by adjusting the camera's
 * projection matrix based on the viewer's head position.
 */
class OffAxisCamera {
  constructor(camera, calibration) {
    this.nearPlane = 0.05;
    this.farPlane = 1000;
    this.camera = camera;
    this.calibration = calibration;
    
    // Convert cm to world units (meters)
    const CM_TO_WORLD = 0.01;
    this.screenWidthWorld = calibration.screenWidthCm * CM_TO_WORLD;
    this.screenHeightWorld = calibration.screenHeightCm * CM_TO_WORLD;
  }

  updateCalibration(calibration) {
    this.calibration = calibration;
    const CM_TO_WORLD = 0.01;
    this.screenWidthWorld = calibration.screenWidthCm * CM_TO_WORLD;
    this.screenHeightWorld = calibration.screenHeightCm * CM_TO_WORLD;
  }

  /**
   * Convert normalized head pose (0-1 for x,y; relative scale for z) 
   * to world coordinates
   */
  headPoseToWorldPosition(headPose) {
    const x = headPose.x;  // 0-1, 0.5 is center
    const y = headPose.y;  // 0-1, 0.5 is center
    const z = headPose.z;  // relative scale, 1.0 is reference distance
    
    // Map normalized position to world coordinates
    // Multiply by 1.5 for more dramatic movement response
    const worldX = -(x - 0.5) * this.screenWidthWorld * 1.5;
    const worldY = -(y - 0.5) * this.screenHeightWorld * 1.5;
    
    // Convert viewing distance to world units and apply depth scale
    const viewingDistanceWorld = this.calibration.viewingDistanceCm * 0.01;
    const depthScale = 1 / z;  // Inverse relationship: smaller face = farther
    const worldZ = viewingDistanceWorld * depthScale;
    
    return { x: worldX, y: worldY, z: worldZ };
  }

  /**
   * Update the projection matrix for off-axis (asymmetric frustum) projection
   * This is the core algorithm that creates the parallax effect
   */
  updateProjectionMatrix(cameraPosition) {
    const near = this.nearPlane;
    const far = this.farPlane;
    
    // Screen bounds in world coordinates (screen plane at z=0)
    const left = -this.screenWidthWorld / 2;
    const right = this.screenWidthWorld / 2;
    const bottom = -this.screenHeightWorld / 2;
    const top = this.screenHeightWorld / 2;
    
    // Camera position
    const camX = cameraPosition.x;
    const camY = cameraPosition.y;
    const camZ = cameraPosition.z;  // Distance from screen
    
    // Prevent division by zero
    if (camZ <= 0) return;
    
    // Scale factor: project screen bounds to near plane
    const scale = near / camZ;
    
    // Calculate asymmetric frustum bounds
    // Key insight: we subtract camera position to shift the frustum
    const frustumLeft = (left - camX) * scale;
    const frustumRight = (right - camX) * scale;
    const frustumBottom = (bottom - camY) * scale;
    const frustumTop = (top - camY) * scale;
    
    // Update Three.js camera projection matrix
    // Note: Three.js makePerspective takes (left, right, top, bottom, near, far)
    this.camera.projectionMatrix.makePerspective(
      frustumLeft,
      frustumRight,
      frustumTop,      // Note: top/bottom swapped vs typical OpenGL
      frustumBottom,
      near,
      far
    );
    
    // Update inverse matrix for raycasting etc.
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  }

  /**
   * Set camera position and look at screen center
   */
  setCameraPosition(position) {
    this.camera.position.set(position.x, position.y, position.z);
    // Always look at the center of the screen (z=0 plane)
    this.camera.lookAt(position.x, position.y, 0);
  }

  /**
   * Main update function - call this each frame with head pose from face tracking
   */
  updateFromHeadPose(headPose) {
    const worldPosition = this.headPoseToWorldPosition(headPose);
    this.setCameraPosition(worldPosition);
    this.updateProjectionMatrix(worldPosition);
  }

  getScreenDimensions() {
    return {
      width: this.screenWidthWorld,
      height: this.screenHeightWorld
    };
  }
}

// Default calibration values
const DEFAULT_CALIBRATION = {
  screenWidthCm: 34,      // Monitor width in centimeters
  screenHeightCm: 19,     // Monitor height in centimeters
  viewingDistanceCm: 60,  // Typical viewing distance
  pixelWidth: 1920,       // Screen resolution
  pixelHeight: 1080,
  isCalibrated: false
};

// Calibration manager with localStorage persistence
class CalibrationManager {
  constructor() {
    this.storageKey = 'parallax_calibration_v1';
    this.data = this.loadCalibration();
  }

  loadCalibration() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CALIBRATION, ...parsed };
      }
    } catch (e) {
      console.error('Error loading calibration:', e);
    }
    return { ...DEFAULT_CALIBRATION };
  }

  saveCalibration() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.error('Error saving calibration:', e);
    }
  }

  updateScreenDimensions(widthCm, heightCm) {
    this.data.screenWidthCm = widthCm;
    this.data.screenHeightCm = heightCm;
    this.saveCalibration();
  }

  updatePixelDimensions(width, height) {
    this.data.pixelWidth = width;
    this.data.pixelHeight = height;
  }

  getCalibration() {
    return { ...this.data };
  }
}

export { OffAxisCamera, CalibrationManager, DEFAULT_CALIBRATION };


/* 
=== FACE TRACKING HEAD POSE EXTRACTION ===

Using MediaPipe Face Mesh, extract head pose like this:

// Key landmarks:
// 168 - Between eyes (use for X, Y position)
// 33  - Left eye outer corner
// 263 - Right eye outer corner (use distance for Z estimation)

function extractHeadPose(landmarks, imageWidth, imageHeight) {
  // Get center point (between eyes)
  const centerLandmark = landmarks[168];
  
  // Normalize to 0-1 range
  const x = centerLandmark.x;  // Already 0-1 from MediaPipe
  const y = centerLandmark.y;
  
  // Estimate depth from inter-eye distance
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const eyeDistance = Math.sqrt(
    Math.pow(rightEye.x - leftEye.x, 2) + 
    Math.pow(rightEye.y - leftEye.y, 2)
  );
  
  // Reference eye distance at calibration (roughly 0.15 of image width for average face)
  const referenceEyeDistance = 0.15;
  const z = eyeDistance / referenceEyeDistance;  // >1 = closer, <1 = farther
  
  return { x, y, z };
}

// Apply smoothing to reduce jitter
class SmoothingFilter {
  constructor(factor = 0.3) {
    this.factor = factor;  // 0-1, lower = more smoothing
    this.previous = null;
  }
  
  apply(current) {
    if (!this.previous) {
      this.previous = current;
      return current;
    }
    
    const smoothed = {
      x: this.previous.x + (current.x - this.previous.x) * this.factor,
      y: this.previous.y + (current.y - this.previous.y) * this.factor,
      z: this.previous.z + (current.z - this.previous.z) * this.factor
    };
    
    this.previous = smoothed;
    return smoothed;
  }
}
*/
