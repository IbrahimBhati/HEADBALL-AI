/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Calibration Module
 * 7-Step Interactive Calibration Workflow:
 * 1. Look directly at camera
 * 2. Record neutral head position over multiple frames
 * 3. Tilt left
 * 4. Tilt right
 * 5. Raise eyebrows
 * 6. Calculate personalized thresholds
 * 7. Display successful calibration screen
 */

import { StorageManager } from './storage.js';

export const CALIBRATION_STEPS = {
  STEP_1_LOOK_CAMERA: 1,
  STEP_2_RECORD_NEUTRAL: 2,
  STEP_3_TILT_LEFT: 3,
  STEP_4_TILT_RIGHT: 4,
  STEP_5_RAISE_BROWS: 5,
  STEP_6_CALCULATE: 6,
  STEP_7_SUCCESS: 7
};

export const DEFAULT_CALIBRATION = {
  neutralSteering: 0.0,
  neutralRoll: 0.0,
  neutralPitch: 0.0,
  neutralYaw: 0.0,
  neutralMouth: 0.08,
  neutralBrow: 0.12,
  neutralLeftEyeBlink: 0.05,
  neutralRightEyeBlink: 0.05,
  leftTiltThreshold: -12.0, // degrees
  rightTiltThreshold: 12.0,  // degrees
  browJumpThreshold: 0.28,   // blendshape / ratio
  blinkSpecialThreshold: 0.55,
  deadzoneDegrees: 3.5,
  timestamp: 0
};

export class CalibrationManager {
  constructor() {
    this.calibrationData = { ...DEFAULT_CALIBRATION };
    this.currentStep = CALIBRATION_STEPS.STEP_1_LOOK_CAMERA;
    this.isActive = false;

    // Buffer collections for each step
    this.stepSamples = {
      neutral: [],
      tiltLeft: [],
      tiltRight: [],
      browRaise: []
    };

    // Frame targets
    this.neutralTargetFrames = 45;
    this.tiltLeftTargetFrames = 25;
    this.tiltRightTargetFrames = 25;
    this.browTargetFrames = 25;

    // Callbacks
    this.onStepChangeCallback = null;
    this.onProgressCallback = null;
    this.onCompleteCallback = null;

    this.load();
  }

  load() {
    const saved = StorageManager.getCalibration();
    if (saved && saved.timestamp) {
      this.calibrationData = { ...DEFAULT_CALIBRATION, ...saved };
    }
  }

  getCalibration() {
    return this.calibrationData;
  }

  isCalibrated() {
    return Boolean(this.calibrationData && this.calibrationData.timestamp > 0);
  }

  /**
   * Begin the 7-step interactive calibration sequence
   */
  startWorkflow({ onStepChange, onProgress, onComplete } = {}) {
    this.isActive = true;
    this.currentStep = CALIBRATION_STEPS.STEP_1_LOOK_CAMERA;
    this.stepSamples = {
      neutral: [],
      tiltLeft: [],
      tiltRight: [],
      browRaise: []
    };

    this.onStepChangeCallback = onStepChange || null;
    this.onProgressCallback = onProgress || null;
    this.onCompleteCallback = onComplete || null;

    this._notifyStep(this.currentStep);
  }

  /**
   * Process a single video inference frame during calibration
   * @param {object} gestureData - Live metrics from FaceTracker / GestureRecognizer
   * @returns {object} Status object containing step, progress, guidance text, and completion
   */
  sampleFrame(gestureData) {
    if (!this.isActive) {
      return { step: this.currentStep, progress: 0, isComplete: false };
    }

    if (!gestureData || !gestureData.detected) {
      return {
        step: this.currentStep,
        progress: 0,
        isComplete: false,
        warning: 'Face not detected! Please face your camera in good lighting.'
      };
    }

    const rawRoll = gestureData.rawRoll || 0;
    const rawYaw = gestureData.rawYaw || 0;
    const rawPitch = gestureData.rawPitch || 0;
    const rawBrow = gestureData.browRaiseRatio || 0;
    const rawMouth = gestureData.mouthOpenRatio || 0;
    const rawLeftEye = gestureData.leftEyeBlink || 0;
    const rawRightEye = gestureData.rightEyeBlink || 0;

    switch (this.currentStep) {
      // -------------------------------------------------------------
      // STEP 1: Ask the player to look directly at the camera
      // -------------------------------------------------------------
      case CALIBRATION_STEPS.STEP_1_LOOK_CAMERA: {
        // Automatically check if head is reasonably centered
        const isCentered = Math.abs(rawRoll) < 10 && Math.abs(rawYaw) < 14;
        if (isCentered) {
          this.stepSamples.neutral.push({ rawRoll, rawYaw, rawPitch, rawBrow, rawMouth, rawLeftEye, rawRightEye });
          if (this.stepSamples.neutral.length >= 10) {
            // Player is aligned, automatically advance to Step 2
            this.currentStep = CALIBRATION_STEPS.STEP_2_RECORD_NEUTRAL;
            this.stepSamples.neutral = [];
            this._notifyStep(this.currentStep);
          }
        } else {
          this.stepSamples.neutral = [];
        }
        return {
          step: 1,
          progress: this.stepSamples.neutral.length / 10,
          title: 'LOOK DIRECTLY AT CAMERA',
          instruction: 'Center your head inside the reticle and look straight ahead.',
          isComplete: false
        };
      }

      // -------------------------------------------------------------
      // STEP 2: Record neutral head position over multiple frames
      // -------------------------------------------------------------
      case CALIBRATION_STEPS.STEP_2_RECORD_NEUTRAL: {
        this.stepSamples.neutral.push({ rawRoll, rawYaw, rawPitch, rawBrow, rawMouth, rawLeftEye, rawRightEye });
        const progress = Math.min(1.0, this.stepSamples.neutral.length / this.neutralTargetFrames);
        if (this.onProgressCallback) this.onProgressCallback(progress);

        if (this.stepSamples.neutral.length >= this.neutralTargetFrames) {
          this.currentStep = CALIBRATION_STEPS.STEP_3_TILT_LEFT;
          this._notifyStep(this.currentStep);
        }

        return {
          step: 2,
          progress,
          title: 'RECORDING NEUTRAL BASELINE',
          instruction: 'Hold still with a relaxed resting expression...',
          isComplete: false
        };
      }

      // -------------------------------------------------------------
      // STEP 3: Ask the player to tilt left
      // -------------------------------------------------------------
      case CALIBRATION_STEPS.STEP_3_TILT_LEFT: {
        // Compute relative roll from resting
        const neutralRoll = this._computeAverage(this.stepSamples.neutral, 'rawRoll');
        const deltaRoll = rawRoll - neutralRoll;

        // Player tilts head to the left (negative roll in camera view)
        const isTiltingLeft = deltaRoll < -4.5 || rawYaw < -6.0;
        if (isTiltingLeft) {
          this.stepSamples.tiltLeft.push({ deltaRoll, rawRoll, rawYaw });
        }

        const progress = Math.min(1.0, this.stepSamples.tiltLeft.length / this.tiltLeftTargetFrames);
        if (this.onProgressCallback) this.onProgressCallback(progress);

        if (this.stepSamples.tiltLeft.length >= this.tiltLeftTargetFrames) {
          this.currentStep = CALIBRATION_STEPS.STEP_4_TILT_RIGHT;
          this._notifyStep(this.currentStep);
        }

        return {
          step: 3,
          progress,
          title: 'TILT HEAD LEFT',
          instruction: 'Gently tilt your head to the LEFT to calibrate left steering.',
          isComplete: false
        };
      }

      // -------------------------------------------------------------
      // STEP 4: Ask the player to tilt right
      // -------------------------------------------------------------
      case CALIBRATION_STEPS.STEP_4_TILT_RIGHT: {
        const neutralRoll = this._computeAverage(this.stepSamples.neutral, 'rawRoll');
        const deltaRoll = rawRoll - neutralRoll;

        // Player tilts head to the right (positive roll in camera view)
        const isTiltingRight = deltaRoll > 4.5 || rawYaw > 6.0;
        if (isTiltingRight) {
          this.stepSamples.tiltRight.push({ deltaRoll, rawRoll, rawYaw });
        }

        const progress = Math.min(1.0, this.stepSamples.tiltRight.length / this.tiltRightTargetFrames);
        if (this.onProgressCallback) this.onProgressCallback(progress);

        if (this.stepSamples.tiltRight.length >= this.tiltRightTargetFrames) {
          this.currentStep = CALIBRATION_STEPS.STEP_5_RAISE_BROWS;
          this._notifyStep(this.currentStep);
        }

        return {
          step: 4,
          progress,
          title: 'TILT HEAD RIGHT',
          instruction: 'Now tilt your head to the RIGHT to calibrate right steering.',
          isComplete: false
        };
      }

      // -------------------------------------------------------------
      // STEP 5: Ask the player to raise their eyebrows
      // -------------------------------------------------------------
      case CALIBRATION_STEPS.STEP_5_RAISE_BROWS: {
        const neutralBrow = this._computeAverage(this.stepSamples.neutral, 'rawBrow');
        const browElevated = rawBrow > (neutralBrow + 0.08);

        if (browElevated) {
          this.stepSamples.browRaise.push({ rawBrow, delta: rawBrow - neutralBrow });
        }

        const progress = Math.min(1.0, this.stepSamples.browRaise.length / this.browTargetFrames);
        if (this.onProgressCallback) this.onProgressCallback(progress);

        if (this.stepSamples.browRaise.length >= this.browTargetFrames) {
          this.currentStep = CALIBRATION_STEPS.STEP_6_CALCULATE;
          this._calculatePersonalizedThresholds();
          this.currentStep = CALIBRATION_STEPS.STEP_7_SUCCESS;
          this._notifyStep(this.currentStep);
        }

        return {
          step: 5,
          progress,
          title: 'RAISE EYEBROWS',
          instruction: 'Raise your eyebrows high as if surprised to calibrate the JUMP trigger.',
          isComplete: false
        };
      }

      // -------------------------------------------------------------
      // STEP 6: Calculate personalized thresholds (handled in _calculatePersonalizedThresholds)
      // -------------------------------------------------------------
      case CALIBRATION_STEPS.STEP_6_CALCULATE: {
        this._calculatePersonalizedThresholds();
        this.currentStep = CALIBRATION_STEPS.STEP_7_SUCCESS;
        this._notifyStep(this.currentStep);
        return {
          step: 6,
          progress: 1.0,
          title: 'CALCULATING THRESHOLDS',
          instruction: 'Optimizing motion response...',
          isComplete: false
        };
      }

      // -------------------------------------------------------------
      // STEP 7: Display a successful calibration screen
      // -------------------------------------------------------------
      case CALIBRATION_STEPS.STEP_7_SUCCESS: {
        return {
          step: 7,
          progress: 1.0,
          title: 'CALIBRATION COMPLETE',
          instruction: 'Personalized motion profile locked and ready!',
          summary: this.getSummary(),
          isComplete: true
        };
      }

      default:
        return { step: 1, progress: 0, isComplete: false };
    }
  }

  /**
   * STEP 6 Implementation:
   * Calculate personalized offsets, dead zones, and gesture thresholds
   */
  _calculatePersonalizedThresholds() {
    const neutrals = this.stepSamples.neutral;
    const count = neutrals.length || 1;

    // Neutral resting posture
    const avgRoll = this._computeAverage(neutrals, 'rawRoll');
    const avgYaw = this._computeAverage(neutrals, 'rawYaw');
    const avgPitch = this._computeAverage(neutrals, 'rawPitch');
    const avgBrow = this._computeAverage(neutrals, 'rawBrow');
    const avgMouth = this._computeAverage(neutrals, 'rawMouth');
    const avgEyeLeft = this._computeAverage(neutrals, 'rawLeftEye');
    const avgEyeRight = this._computeAverage(neutrals, 'rawRightEye');

    // Peak tilt ranges
    const minLeftDelta = this.stepSamples.tiltLeft.length > 0
      ? Math.min(...this.stepSamples.tiltLeft.map(s => s.deltaRoll))
      : -14.0;
    const maxRightDelta = this.stepSamples.tiltRight.length > 0
      ? Math.max(...this.stepSamples.tiltRight.map(s => s.deltaRoll))
      : 14.0;

    // Eyebrow jump threshold: midpoint between resting and peak brow raise
    const maxBrowSeen = this.stepSamples.browRaise.length > 0
      ? Math.max(...this.stepSamples.browRaise.map(s => s.rawBrow))
      : (avgBrow + 0.35);

    const browRange = Math.max(0.12, maxBrowSeen - avgBrow);
    const browJumpThreshold = avgBrow + (browRange * 0.45);

    // Personalized calibration payload
    this.calibrationData = {
      neutralRoll: avgRoll,
      neutralYaw: avgYaw,
      neutralPitch: avgPitch,
      neutralSteering: avgRoll * 0.75 + avgYaw * 0.25,
      neutralMouth: avgMouth,
      neutralBrow: avgBrow,
      neutralLeftEyeBlink: avgEyeLeft,
      neutralRightEyeBlink: avgEyeRight,
      leftTiltThreshold: Math.min(-6.0, minLeftDelta * 0.55),
      rightTiltThreshold: Math.max(6.0, maxRightDelta * 0.55),
      browJumpThreshold: Math.max(0.20, Math.min(0.65, browJumpThreshold)),
      blinkSpecialThreshold: 0.55,
      deadzoneDegrees: 3.5, // Center dead zone in degrees
      timestamp: Date.now()
    };

    StorageManager.saveCalibration(this.calibrationData);

    if (this.onCompleteCallback) {
      this.onCompleteCallback(this.calibrationData);
    }
  }

  getSummary() {
    return {
      neutralAngle: `${(this.calibrationData.neutralRoll || 0).toFixed(1)}°`,
      leftTiltMax: `${Math.abs(this.calibrationData.leftTiltThreshold || 12).toFixed(1)}°`,
      rightTiltMax: `${Math.abs(this.calibrationData.rightTiltThreshold || 12).toFixed(1)}°`,
      browJumpThresh: `${(this.calibrationData.browJumpThreshold || 0.25).toFixed(2)}`,
      deadzone: `${this.calibrationData.deadzoneDegrees || 3.5}°`,
      status: 'CALIBRATED'
    };
  }

  _computeAverage(array, prop) {
    if (!array || array.length === 0) return 0;
    const sum = array.reduce((acc, item) => acc + (item[prop] || 0), 0);
    return sum / array.length;
  }

  _notifyStep(step) {
    if (this.onStepChangeCallback) {
      this.onStepChangeCallback(step, this.getStepMeta(step));
    }
  }

  getStepMeta(step) {
    switch (step) {
      case 1:
        return {
          step: 1,
          badge: 'STEP 1 / 7',
          title: 'LOOK DIRECTLY AT CAMERA',
          instruction: 'Align your face in the reticle with a relaxed, forward posture.',
          icon: 'target'
        };
      case 2:
        return {
          step: 2,
          badge: 'STEP 2 / 7',
          title: 'RECORDING NEUTRAL BASELINE',
          instruction: 'Hold still while the AI records your neutral resting posture...',
          icon: 'camera'
        };
      case 3:
        return {
          step: 3,
          badge: 'STEP 3 / 7',
          title: 'TILT HEAD LEFT',
          instruction: 'Tilt your head to the LEFT to calibrate left steering.',
          icon: 'arrow-left'
        };
      case 4:
        return {
          step: 4,
          badge: 'STEP 4 / 7',
          title: 'TILT HEAD RIGHT',
          instruction: 'Tilt your head to the RIGHT to calibrate right steering.',
          icon: 'arrow-right'
        };
      case 5:
        return {
          step: 5,
          badge: 'STEP 5 / 7',
          title: 'RAISE EYEBROWS',
          instruction: 'Raise your eyebrows high to calibrate your JUMP trigger.',
          icon: 'arrow-up'
        };
      case 6:
        return {
          step: 6,
          badge: 'STEP 6 / 7',
          title: 'CALCULATING THRESHOLDS',
          instruction: 'Generating personalized sensitivity curves and dead zones...',
          icon: 'cpu'
        };
      case 7:
        return {
          step: 7,
          badge: 'STEP 7 / 7',
          title: 'CALIBRATION SUCCESSFUL!',
          instruction: 'Your personalized profile is configured and ready to play!',
          icon: 'check-circle'
        };
      default:
        return { step: 1, badge: 'CALIBRATING', title: '', instruction: '', icon: '' };
    }
  }

  /**
   * Populate default values immediately if user wants to skip
   */
  useDefaults() {
    this.calibrationData = {
      ...DEFAULT_CALIBRATION,
      timestamp: Date.now()
    };
    this.isActive = false;
    this.currentStep = CALIBRATION_STEPS.STEP_7_SUCCESS;
    StorageManager.saveCalibration(this.calibrationData);

    if (this.onCompleteCallback) {
      this.onCompleteCallback(this.calibrationData);
    }
    return this.calibrationData;
  }

  reset() {
    this.calibrationData = { ...DEFAULT_CALIBRATION };
    this.isActive = false;
    this.currentStep = CALIBRATION_STEPS.STEP_1_LOOK_CAMERA;
    StorageManager.saveCalibration(this.calibrationData);
  }
}
