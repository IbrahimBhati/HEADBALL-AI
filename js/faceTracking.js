/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Face Tracking Module
 * Initializes MediaPipe FaceLandmarker with GPU/CPU fallback and processes 3D facial landmarks.
 */

let FaceLandmarkerClass = null;
let FilesetResolverClass = null;

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Dynamic import with resilient CDN fallback
async function loadVisionTasks() {
  if (FaceLandmarkerClass && FilesetResolverClass) return;

  try {
    const vision = await import('@mediapipe/tasks-vision');
    FaceLandmarkerClass = vision.FaceLandmarker;
    FilesetResolverClass = vision.FilesetResolver;
  } catch (err) {
    console.warn('[FaceTracker] Local import failed, loading CDN bundle:', err);
    const cdnVision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js');
    FaceLandmarkerClass = cdnVision.FaceLandmarker;
    FilesetResolverClass = cdnVision.FilesetResolver;
  }
}

export class FaceTracker {
  constructor() {
    this.faceLandmarker = null;
    this.isModelLoading = false;
    this.isModelReady = false;
    this.lastVideoTime = -1;
    this.lastResult = null;
    this.loadError = null;

    // Single-frame execution lock
    this.isProcessingFrame = false;

    // Performance metrics
    this.lastFrameTimestamp = performance.now();
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTimer = performance.now();
    this.inferenceLatencyMs = 0;

    // Event hooks
    this.onDetectionCallback = null;
  }

  /**
   * Initializes MediaPipe Face Landmarker model
   * @returns {Promise<boolean>}
   */
  async init() {
    if (this.isModelReady) return true;
    if (this.isModelLoading) {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (this.isModelReady) {
            clearInterval(interval);
            resolve(true);
          } else if (this.loadError) {
            clearInterval(interval);
            resolve(false);
          }
        }, 80);
      });
    }

    this.isModelLoading = true;
    this.loadError = null;

    try {
      await loadVisionTasks();
      const filesetResolver = await FilesetResolverClass.forVisionTasks(WASM_URL);

      // Attempt GPU delegate first
      try {
        this.faceLandmarker = await FaceLandmarkerClass.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU'
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 1
        });
      } catch (gpuErr) {
        console.warn('[FaceTracker] GPU delegate failed, falling back to CPU:', gpuErr);
        this.faceLandmarker = await FaceLandmarkerClass.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'CPU'
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 1
        });
      }

      this.isModelReady = true;
      this.isModelLoading = false;
      return true;
    } catch (err) {
      this.loadError = `Failed to load face detection model: ${err.message}`;
      this.isModelLoading = false;
      this.isModelReady = false;
      console.error('[FaceTracker] Initialization error:', err);
      throw new Error(this.loadError);
    }
  }

  /**
   * Process a single video frame asynchronously without blocking rendering
   * @param {HTMLVideoElement} videoElement
   * @param {number} [timestamp]
   * @returns {object|null}
   */
  detect(videoElement, timestamp = performance.now()) {
    if (!this.isModelReady || !this.faceLandmarker || !videoElement) {
      return null;
    }

    // Skip if frame is already processing or video hasn't progressed
    if (this.isProcessingFrame) {
      return this.lastResult;
    }

    if (videoElement.currentTime !== this.lastVideoTime && videoElement.readyState >= 2) {
      this.lastVideoTime = videoElement.currentTime;
      this.isProcessingFrame = true;

      const startT = performance.now();

      try {
        const result = this.faceLandmarker.detectForVideo(videoElement, timestamp);
        this.lastResult = result;
        this.inferenceLatencyMs = Math.round(performance.now() - startT);

        // Calculate actual detection FPS
        this.frameCount++;
        const now = performance.now();
        if (now - this.fpsTimer >= 1000) {
          this.fps = this.frameCount;
          this.frameCount = 0;
          this.fpsTimer = now;
        }

        if (this.onDetectionCallback) {
          this.onDetectionCallback(result);
        }
      } catch (err) {
        console.warn('[FaceTracker] Frame inference warning:', err);
      } finally {
        this.isProcessingFrame = false;
      }
    }

    return this.lastResult;
  }

  getMetrics() {
    return {
      fps: this.fps,
      latencyMs: this.inferenceLatencyMs,
      isReady: this.isModelReady,
      isProcessing: this.isProcessingFrame
    };
  }

  /**
   * Render cyber wireframe and face orientation vector on 2D canvas overlay
   * @param {HTMLCanvasElement} canvas
   * @param {object} result - FaceLandmarker result
   * @param {object} [gesture] - Output from GestureRecognizer
   */
  drawOverlay(canvas, result, gesture = null) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
      return;
    }

    const landmarks = result.faceLandmarks[0];
    const w = canvas.width;
    const h = canvas.height;

    ctx.save();

    // 1. Face Oval Contour
    const faceOvalIndices = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365,
      379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93,
      234, 127, 162, 21, 54, 103, 67, 109
    ];

    ctx.strokeStyle = 'rgba(0, 243, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    faceOvalIndices.forEach((idx, i) => {
      const pt = landmarks[idx];
      if (!pt) return;
      const x = pt.x * w;
      const y = pt.y * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    // 2. Eyes Outlines & Pupils
    const leftEyeIndices = [33, 160, 158, 133, 153, 144];
    const rightEyeIndices = [263, 387, 385, 362, 380, 373];

    ctx.strokeStyle = gesture?.isBothBlink ? 'rgba(255, 0, 127, 0.8)' : 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1.2;

    [leftEyeIndices, rightEyeIndices].forEach(indices => {
      ctx.beginPath();
      indices.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        const x = pt.x * w;
        const y = pt.y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    });

    // 3. Eyebrows (Highlight in Gold when Raised!)
    const browIndices = [70, 63, 105, 66, 107, 336, 296, 334, 293, 300];
    const browColor = gesture?.isBrowRaised ? '#ffb703' : 'rgba(255, 183, 3, 0.6)';
    ctx.fillStyle = browColor;
    ctx.shadowColor = browColor;
    ctx.shadowBlur = gesture?.isBrowRaised ? 8 : 2;

    browIndices.forEach(idx => {
      const pt = landmarks[idx];
      if (!pt) return;
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, gesture?.isBrowRaised ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Mouth Outline (Highlight in Magenta when Open/Boost!)
    const mouthIndices = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
    const mouthColor = gesture?.isMouthOpen ? '#ff007f' : 'rgba(255, 0, 127, 0.5)';
    ctx.strokeStyle = mouthColor;
    ctx.shadowColor = mouthColor;
    ctx.shadowBlur = gesture?.isMouthOpen ? 12 : 0;
    ctx.lineWidth = gesture?.isMouthOpen ? 2.5 : 1.2;

    ctx.beginPath();
    mouthIndices.forEach((idx, i) => {
      const pt = landmarks[idx];
      if (!pt) return;
      const x = pt.x * w;
      const y = pt.y * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    // 5. 3D Head Orientation Pointer (from Nose Tip)
    const nose = landmarks[1];
    if (nose) {
      const nx = nose.x * w;
      const ny = nose.y * h;

      ctx.fillStyle = '#00f3ff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw projected orientation vector
      if (gesture) {
        const radRoll = (gesture.roll || 0) * Math.PI / 180;
        const radYaw = (gesture.rawYaw || 0) * 1.5;
        const radPitch = (gesture.rawPitch || 0) * 1.5;

        const vecLen = 28;
        const vx = nx + Math.sin(radYaw) * vecLen;
        const vy = ny + Math.sin(radPitch) * vecLen;

        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(vx, vy);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
