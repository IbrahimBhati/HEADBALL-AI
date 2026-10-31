/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Gesture Recognition Module
 * Translates facial movements into reliable game controls:
 * 1. HEAD TILT LEFT -> Move the ball left
 * 2. HEAD TILT RIGHT -> Move the ball right
 * 3. RAISE EYEBROWS -> Trigger a jump (with hysteresis & cooldown to prevent repeated jumps)
 * 4. BLINK -> Activate a special ability (intentional deliberate blink with cooldown)
 * 5. NEUTRAL HEAD POSITION -> Stop horizontal steering input
 * 
 * Includes:
 * - Neutral baseline offsets
 * - Dead zones to eliminate neck tremors
 * - Configurable sensitivity & exponential smoothing
 * - Edge-triggered jump & intentional blink validation
 * - Face tracking loss detection & safe suspension
 */

export class GestureRecognizer {
  constructor() {
    // Smoothed state variables for Exponential Moving Average
    this.smoothedSteer = 0;
    this.smoothedPitch = 0;
    this.smoothedRoll = 0;
    this.smoothedYaw = 0;
    this.smoothedMouth = 0;
    this.smoothedBrow = 0;
    this.smoothedLeftBlink = 0;
    this.smoothedRightBlink = 0;

    // Eyebrow Jump State Machine (Prevent repeated jumps while raised)
    this.browState = 'resting'; // 'resting' | 'raised'
    this.lastJumpTriggerTime = 0;
    this.jumpCooldownMs = 380;

    // Intentional Blink State Machine (Prevent accidental blinks)
    this.blinkStartTime = 0;
    this.lastSpecialTriggerTime = 0;
    this.specialCooldownMs = 7500; // 7.5 seconds cooldown
    this.isBlinkHeld = false;

    // Tracking Loss & Safe Suspension Tracker
    this.consecutiveLostFrames = 0;
    this.trackingLostDuration = 0;
    this.lastFrameTimestamp = performance.now();

    // Reusable output state structure
    this.state = {
      detected: false,
      trackingConfidence: 0,
      
      // Discrete Game Commands
      command: 'neutral',       // 'moveLeft' | 'moveRight' | 'neutral'
      triggerJump: false,       // Edge-triggered single-frame pulse
      triggerSpecial: false,    // Edge-triggered deliberate blink pulse
      
      // Analog Control Signals
      steering: 0,              // -1.0 (left) to 1.0 (right)
      pitchSignal: 0,           // -1.0 (down) to 1.0 (up)

      // Safe Suspension Flag
      safeSuspensionRequested: false,

      // 3D Head Pose Angles
      roll: 0,
      yaw: 0,
      pitch: 0,
      rawRoll: 0,
      rawYaw: 0,
      rawPitch: 0,

      // Face Center Position
      faceCenter: {
        x: 0.5,
        y: 0.5,
        z: 0.0,
        relX: 0.0,
        relY: 0.0
      },

      // Facial Expression Telemetry
      browRaiseRatio: 0,
      isBrowRaised: false,
      mouthOpenRatio: 0,
      isMouthOpen: false,
      leftEyeBlink: 0,
      rightEyeBlink: 0,
      isLeftBlink: false,
      isRightBlink: false,
      isBothBlink: false,
      smileRatio: 0,
      isSmiling: false,

      // Special Ability Cooldown Status (0.0 to 1.0, 1.0 = ready)
      specialCooldownPercent: 1.0
    };
  }

  /**
   * Process FaceLandmarker result into reliable, calibrated game controls
   * @param {object} result - FaceLandmarker detection result
   * @param {object} [calibration] - Personalized calibration profile
   * @param {object} [settings] - User sensitivity & control settings
   * @returns {object} Updated state object with discrete commands and analog signals
   */
  process(result, calibration = null, settings = null) {
    const s = this.state;
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0.001, (now - this.lastFrameTimestamp) / 1000));
    this.lastFrameTimestamp = now;

    // Reset single-frame pulse triggers
    s.triggerJump = false;
    s.triggerSpecial = false;

    // Cooldown progress update
    const timeSinceSpecial = now - this.lastSpecialTriggerTime;
    s.specialCooldownPercent = Math.min(1.0, timeSinceSpecial / this.specialCooldownMs);

    // -------------------------------------------------------------
    // 1. HANDLE FACE TRACKING LOSS
    // -------------------------------------------------------------
    const hasFace = Boolean(result && result.faceLandmarks && result.faceLandmarks.length > 0);

    if (!hasFace) {
      s.detected = false;
      s.trackingConfidence = Math.max(0, s.trackingConfidence - 0.15);
      this.consecutiveLostFrames++;
      this.trackingLostDuration += dt;

      // Smoothly decay analog steering toward zero (neutral)
      this.smoothedSteer *= 0.82;
      this.smoothedPitch *= 0.82;
      this.smoothedRoll *= 0.82;
      this.smoothedYaw *= 0.82;
      this.smoothedMouth *= 0.82;
      this.smoothedBrow *= 0.82;
      this.smoothedLeftBlink *= 0.75;
      this.smoothedRightBlink *= 0.75;

      s.steering = Math.abs(this.smoothedSteer) < 0.02 ? 0 : this.smoothedSteer;
      s.pitchSignal = this.smoothedPitch;
      s.command = 'neutral';
      s.isMouthOpen = false;
      s.isBrowRaised = false;
      s.isBothBlink = false;
      this.browState = 'resting';
      this.blinkStartTime = 0;

      // Check for safe suspension if tracking lost for > 1.25s
      const gestureEnabled = settings?.gestureControlsEnabled !== false;
      const pauseOnLost = settings?.pauseOnTrackingLoss !== false;
      s.safeSuspensionRequested = (gestureEnabled && pauseOnLost && this.trackingLostDuration > 1.25);

      return s;
    }

    // Face recovered / active
    s.detected = true;
    s.trackingConfidence = 0.98;
    this.consecutiveLostFrames = 0;
    this.trackingLostDuration = 0;
    s.safeSuspensionRequested = false;

    const landmarks = result.faceLandmarks[0];

    // Reference Landmark Indices:
    // Left eye outer: 33, Right eye outer: 263
    // Left eye top/bottom: 159, 145
    // Right eye top/bottom: 386, 374
    // Nose tip: 1, Chin: 152, Forehead: 10
    // Upper lip: 13, Lower lip: 14, Mouth corners: 61, 291
    // Left eyebrow: 105, Right eyebrow: 334

    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const nose = landmarks[1];
    const chin = landmarks[152];
    const forehead = landmarks[10];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const mouthLeft = landmarks[61];
    const mouthRight = landmarks[291];
    const browLeft = landmarks[105];
    const browRight = landmarks[334];

    // -------------------------------------------------------------
    // 2. FACE CENTER POSITION
    // -------------------------------------------------------------
    const midEyeX = (leftEye.x + rightEye.x) / 2;
    const midEyeY = (leftEye.y + rightEye.y) / 2;
    const midEyeZ = ((leftEye.z || 0) + (rightEye.z || 0)) / 2;

    s.faceCenter.x = (midEyeX + nose.x) / 2;
    s.faceCenter.y = (midEyeY + nose.y) / 2;
    s.faceCenter.z = (midEyeZ + (nose.z || 0)) / 2;
    s.faceCenter.relX = (s.faceCenter.x - 0.5) * 2;
    s.faceCenter.relY = (s.faceCenter.y - 0.5) * 2;

    // -------------------------------------------------------------
    // 3. 3D HEAD POSE ANGLES (ROLL, YAW, PITCH)
    // -------------------------------------------------------------
    // Head Roll (Tilt around Z-axis in degrees)
    const dxEyes = rightEye.x - leftEye.x;
    const dyEyes = rightEye.y - leftEye.y;
    const rollRad = Math.atan2(dyEyes, dxEyes);
    s.rawRoll = rollRad * (180 / Math.PI);

    // Head Yaw (Turn around Y-axis in degrees)
    const eyeDist = Math.hypot(dxEyes, dyEyes) || 0.1;
    const noseOffsetFromMidEye = (nose.x - midEyeX) / eyeDist;
    s.rawYaw = noseOffsetFromMidEye * 60;

    // Head Pitch (Nod around X-axis in degrees)
    const faceLength = Math.hypot(chin.x - forehead.x, chin.y - forehead.y) || 0.1;
    const noseVerticalOffset = (nose.y - midEyeY) / faceLength;
    s.rawPitch = (noseVerticalOffset - 0.35) * 80;

    // -------------------------------------------------------------
    // 4. FACIAL EXPRESSIONS (BLENDSHAPES + GEOMETRIC FALLBACK)
    // -------------------------------------------------------------
    let rawMouth = 0;
    let rawBrow = 0;
    let rawLeftBlink = 0;
    let rawRightBlink = 0;
    let rawSmile = 0;

    if (result.faceBlendshapes && result.faceBlendshapes[0]) {
      const cats = result.faceBlendshapes[0].categories;
      for (let i = 0; i < cats.length; i++) {
        const c = cats[i];
        if (c.categoryName === 'jawOpen') rawMouth = c.score;
        else if (c.categoryName === 'browInnerUp') rawBrow = Math.max(rawBrow, c.score);
        else if (c.categoryName === 'browOuterUpLeft' || c.categoryName === 'browOuterUpRight') {
          rawBrow = Math.max(rawBrow, c.score * 0.9);
        }
        else if (c.categoryName === 'eyeBlinkLeft') rawLeftBlink = c.score;
        else if (c.categoryName === 'eyeBlinkRight') rawRightBlink = c.score;
        else if (c.categoryName === 'mouthSmileLeft' || c.categoryName === 'mouthSmileRight') {
          rawSmile = Math.max(rawSmile, c.score);
        }
      }
    } else {
      // Geometric fallback
      const mouthHeight = Math.hypot(lowerLip.x - upperLip.x, lowerLip.y - upperLip.y);
      const mouthWidth = Math.hypot(mouthRight.x - mouthLeft.x, mouthRight.y - mouthLeft.y) || 0.1;
      rawMouth = Math.min(1.0, (mouthHeight / mouthWidth) * 1.5);

      const leftBrowDist = Math.hypot(browLeft.x - leftEye.x, browLeft.y - leftEye.y) / faceLength;
      const rightBrowDist = Math.hypot(browRight.x - rightEye.x, browRight.y - rightEye.y) / faceLength;
      rawBrow = Math.min(1.0, ((leftBrowDist + rightBrowDist) / 2) * 2.2);

      const leftEyeH = Math.hypot(landmarks[159].x - landmarks[145].x, landmarks[159].y - landmarks[145].y);
      const leftEyeW = Math.hypot(landmarks[33].x - landmarks[133].x, landmarks[33].y - landmarks[133].y) || 0.05;
      rawLeftBlink = leftEyeH / leftEyeW < 0.18 ? 0.9 : 0.05;

      const rightEyeH = Math.hypot(landmarks[386].x - landmarks[374].x, landmarks[386].y - landmarks[374].y);
      const rightEyeW = Math.hypot(landmarks[263].x - landmarks[362].x, landmarks[263].y - landmarks[362].y) || 0.05;
      rawRightBlink = rightEyeH / rightEyeW < 0.18 ? 0.9 : 0.05;
    }

    // -------------------------------------------------------------
    // 5. APPLY NEUTRAL CALIBRATION OFFSETS
    // -------------------------------------------------------------
    const calibNeutralRoll = calibration?.neutralRoll || 0;
    const calibNeutralYaw = calibration?.neutralYaw || 0;
    const calibNeutralPitch = calibration?.neutralPitch || 0;
    const calibNeutralBrow = calibration?.neutralBrow || 0.12;
    const calibDeadzone = calibration?.deadzoneDegrees || 3.5;

    // Delta angles from neutral
    const deltaRoll = s.rawRoll - calibNeutralRoll;
    const deltaYaw = s.rawYaw - calibNeutralYaw;
    const deltaPitch = s.rawPitch - calibNeutralPitch;

    // User settings
    const headSens = settings?.headSensitivity || settings?.steeringSensitivity || 1.2;
    const jumpSens = settings?.jumpSensitivity || 1.0;
    const specialSens = settings?.specialSensitivity || 1.0;
    const smoothingAlpha = settings?.trackingSmoothing || 0.28;
    const invertSteer = settings?.invertSteering || false;
    const gestureEnabled = settings?.gestureControlsEnabled !== false;

    // -------------------------------------------------------------
    // 6. HEAD TILT STEERING & DEAD ZONES (CONTROLS 1, 2, 5)
    // -------------------------------------------------------------
    // Head roll (tilt) is primary, assisted by head yaw (turn)
    // In mirrored webcam: tilting head left creates negative deltaRoll
    const combinedTiltDegrees = -(deltaRoll * 0.85 + deltaYaw * 0.15);

    let targetSteer = 0;
    let currentCommand = 'neutral';

    if (gestureEnabled) {
      if (Math.abs(combinedTiltDegrees) > calibDeadzone) {
        const sign = Math.sign(combinedTiltDegrees);
        // Normalize degrees outside dead zone: ~16 degrees is full max steering
        const maxRange = 16.0;
        const normalizedMagnitude = (Math.abs(combinedTiltDegrees) - calibDeadzone) / (maxRange - calibDeadzone);
        targetSteer = sign * Math.min(1.0, normalizedMagnitude * headSens);

        if (invertSteer) targetSteer = -targetSteer;

        if (targetSteer < -0.08) {
          currentCommand = 'moveLeft';
        } else if (targetSteer > 0.08) {
          currentCommand = 'moveRight';
        } else {
          currentCommand = 'neutral';
        }
      } else {
        // Within dead zone: strictly neutral
        targetSteer = 0;
        currentCommand = 'neutral';
      }
    } else {
      targetSteer = 0;
      currentCommand = 'neutral';
    }

    targetSteer = Math.max(-1.0, Math.min(1.0, targetSteer));

    // Pitch signal (speed modulation)
    let targetPitch = (-deltaPitch / 22) * (settings?.pitchSensitivity || 1.0);
    targetPitch = Math.max(-1.0, Math.min(1.0, targetPitch));

    // -------------------------------------------------------------
    // 7. EXPONENTIAL SMOOTHING
    // -------------------------------------------------------------
    const alpha = Math.max(0.08, Math.min(0.65, smoothingAlpha));
    this.smoothedSteer += (targetSteer - this.smoothedSteer) * alpha;
    this.smoothedPitch += (targetPitch - this.smoothedPitch) * alpha;
    this.smoothedRoll += (s.rawRoll - this.smoothedRoll) * alpha;
    this.smoothedYaw += (s.rawYaw - this.smoothedYaw) * alpha;
    this.smoothedMouth += (rawMouth - this.smoothedMouth) * 0.35;
    this.smoothedBrow += (rawBrow - this.smoothedBrow) * 0.35;
    this.smoothedLeftBlink += (rawLeftBlink - this.smoothedLeftBlink) * 0.45;
    this.smoothedRightBlink += (rawRightBlink - this.smoothedRightBlink) * 0.45;

    s.steering = this.smoothedSteer;
    s.pitchSignal = this.smoothedPitch;
    s.roll = this.smoothedRoll;
    s.yaw = this.smoothedYaw;
    s.pitch = this.smoothedPitch;
    s.command = currentCommand;

    s.mouthOpenRatio = this.smoothedMouth;
    s.browRaiseRatio = this.smoothedBrow;
    s.leftEyeBlink = this.smoothedLeftBlink;
    s.rightEyeBlink = this.smoothedRightBlink;
    s.smileRatio = rawSmile;

    // -------------------------------------------------------------
    // 8. RAISE EYEBROWS -> JUMP (CONTROL 3)
    // Edge-triggered with hysteresis & cooldown to prevent repeated jumps
    // -------------------------------------------------------------
    const deltaBrow = Math.max(0, this.smoothedBrow - calibNeutralBrow);
    const baseBrowThresh = calibration?.browJumpThreshold || settings?.browJumpThreshold || 0.24;
    const jumpThreshold = baseBrowThresh / jumpSens;
    const resetThreshold = jumpThreshold * 0.60; // Hysteresis lower threshold

    s.isBrowRaised = deltaBrow > jumpThreshold;

    if (gestureEnabled) {
      if (s.isBrowRaised) {
        if (this.browState === 'resting' && (now - this.lastJumpTriggerTime) > this.jumpCooldownMs) {
          s.triggerJump = true;
          this.browState = 'raised';
          this.lastJumpTriggerTime = now;
        }
      } else if (deltaBrow < resetThreshold) {
        // Player returned eyebrows to resting: re-arm the jump trigger
        this.browState = 'resting';
      }
    }

    // -------------------------------------------------------------
    // 9. INTENTIONAL BLINK -> SPECIAL ABILITY (CONTROL 4)
    // Prevents accidental subconscious blinks with duration check & cooldown
    // -------------------------------------------------------------
    const blinkThresh = calibration?.blinkSpecialThreshold || 0.52;
    s.isLeftBlink = this.smoothedLeftBlink > blinkThresh;
    s.isRightBlink = this.smoothedRightBlink > blinkThresh;
    s.isBothBlink = s.isLeftBlink && s.isRightBlink;

    if (gestureEnabled) {
      if (s.isBothBlink) {
        if (!this.blinkStartTime) {
          this.blinkStartTime = now;
        }
        this.isBlinkHeld = true;
      } else {
        if (this.isBlinkHeld && this.blinkStartTime > 0) {
          const blinkDuration = now - this.blinkStartTime;
          this.blinkStartTime = 0;
          this.isBlinkHeld = false;

          // Deliberate intentional blink must be between minDuration and maxDuration
          const minBlinkDuration = 220 / specialSens; // ~220ms (ignores ~100ms natural blinks)
          const maxBlinkDuration = 1200; // Ignore long eye closures

          if (blinkDuration >= minBlinkDuration && blinkDuration <= maxBlinkDuration) {
            // Check cooldown
            if ((now - this.lastSpecialTriggerTime) > this.specialCooldownMs) {
              s.triggerSpecial = true;
              this.lastSpecialTriggerTime = now;
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 10. MOUTH OPEN -> TURBO BOOST (SUPPORTING GESTURE)
    // -------------------------------------------------------------
    const mouthThresh = settings?.mouthBoostThreshold || 0.38;
    s.isMouthOpen = s.mouthOpenRatio > mouthThresh;
    s.isSmiling = s.smileRatio > 0.45;

    return s;
  }

  /**
   * Reset internal gesture trigger states
   */
  resetTriggers() {
    this.browState = 'resting';
    this.blinkStartTime = 0;
    this.isBlinkHeld = false;
    this.lastJumpTriggerTime = 0;
    this.lastSpecialTriggerTime = 0;
  }
}
