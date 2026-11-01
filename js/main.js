/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Main Application Bootstrap
 * Orchestrates modules, video tracking loop, user events, and gameplay state transitions.
 * Translates facial movements into clean game commands:
 * - moveLeft
 * - moveRight
 * - neutral
 * - jump
 * - specialAbility
 */
// Defensive window.fetch setter definition for test runners and extensions
try {
  let _currentFetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    get: () => _currentFetch,
    set: (fn) => { _currentFetch = fn; },
    configurable: true,
    enumerable: true
  });
} catch (e) {
  // Ignored if already defined or restricted
}

import { StorageManager } from './storage.js';
import { SettingsManager } from './settings.js';
import { AudioManager } from './audio.js';
import { CameraManager } from './camera.js';
import { FaceTracker } from './faceTracking.js';
import { GestureRecognizer } from './gestureRecognition.js';
import { CalibrationManager, CALIBRATION_STEPS } from './calibration.js';
import { GameEngine, GAME_STATES } from './gameEngine.js';
import { UIManager } from './ui.js';

class HeadBallApp {
  constructor() {
    this.storage = StorageManager;
    this.settings = new SettingsManager();
    this.audio = new AudioManager();
    this.camera = new CameraManager();
    this.tracker = new FaceTracker();
    this.gestureRecognizer = new GestureRecognizer();
    this.calibration = new CalibrationManager();
    
    this.canvas = document.getElementById('game-canvas');
    this.game = new GameEngine(this.canvas, this.audio, this.settings);
    this.ui = new UIManager();

    // Keyboard state tracking
    this.keys = {
      left: false,
      right: false,
      jump: false,
      boost: false
    };

    this.isTrackingLoopRunning = false;
    this.isTabHidden = false;
    this.calibCountdownInterval = null;
  }

  async init() {
    // 1. Initialize Audio Volumes & UI Settings
    this.audio.setVolumes(
      this.settings.get('masterVolume'),
      this.settings.get('sfxVolume'),
      this.settings.get('bgmVolume')
    );
    this.ui.populateSettings(this.settings.settings);

    // 2. Wire Global UI Buttons & Navigation
    this._bindEvents();

    // 3. Connect Game Engine Callbacks
    this.game.onGameOverCallback = (runRecord) => {
      this.ui.showGameOver(runRecord, this.game.scoring.isNewHighScore, this.storage.getHighScore());
      this._updateLandingScores();
    };

    this.game.onScoreUpdateCallback = (stats) => {
      this.ui.updateHUD(stats);
    };

    this.game.onComboCalloutCallback = (text) => {
      this.ui.showComboCallout(text);
    };

    this.game.onTrackingSuspendedCallback = (isSuspended) => {
      this.ui.showTrackingSuspended(isSuspended);
    };

    // 4. Update Landing High Scores
    this._updateLandingScores();

    // 5. Start Background Model Warm-up (async)
    this.tracker.init().catch(err => {
      console.warn('Face tracker preload notice:', err);
    });

    // 6. Start the Game Engine render loop (starts in TITLE state)
    this.game.start();
  }

  _updateLandingScores() {
    const highScoreEl = document.getElementById('landing-high-score');
    const bestDistEl = document.getElementById('landing-best-distance');
    const totalOrbsEl = document.getElementById('landing-total-orbs');

    if (highScoreEl) highScoreEl.textContent = this.storage.getHighScore().toLocaleString();
    if (bestDistEl) bestDistEl.textContent = `${this.storage.getBestDistance()}m`;
    if (totalOrbsEl) totalOrbsEl.textContent = this.storage.getTotalOrbs().toLocaleString();
  }

  _bindEvents() {
    // Landing Screen CTAs
    document.getElementById('btn-landing-play')?.addEventListener('click', () => {
      this.audio.init();
      this.audio.playClick();
      this._handlePlayFlow();
    });

    document.getElementById('btn-landing-instructions')?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.showScreen('instructions');
    });

    document.getElementById('btn-landing-highscores')?.addEventListener('click', () => {
      this.audio.playClick();
      const history = this.storage.getGameHistory();
      this.ui.populateHighscores(history, this.storage.getHighScore(), this.storage.getBestDistance());
      this.ui.showModal('highscores');
    });

    document.getElementById('btn-close-highscores')?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.hideModal('highscores');
    });

    document.getElementById('btn-landing-settings')?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.showModal('settings');
    });

    // Instructions Screen Back
    document.getElementById('btn-instructions-back')?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.showScreen('landing');
    });

    document.getElementById('btn-instructions-play')?.addEventListener('click', () => {
      this.audio.playClick();
      this._handlePlayFlow();
    });

    // Camera Permission Screen
    document.getElementById('btn-enable-camera')?.addEventListener('click', async () => {
      this.audio.playClick();
      this.ui.hideCameraError();
      this.ui.setCameraStatus('Requesting webcam access...', false);

      try {
        await this._startCameraAndModel();
        this.ui.setCameraStatus('FACE DETECTED - READY', true);
      } catch (err) {
        this.ui.showCameraError('Camera Access Denied or Unavailable', err.message);
      }
    });

    // Start calibration from camera screen once camera is running
    document.getElementById('btn-start-calib-from-camera')?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.showScreen('calibration');
      this._setupCalibrationScreen();
    });

    document.getElementById('btn-skip-to-keyboard')?.addEventListener('click', () => {
      this.audio.playClick();
      this.stopCameraSession();
      this._launchGameplay(true); // keyboard mode
    });

    document.getElementById('btn-camera-back')?.addEventListener('click', () => {
      this.audio.playClick();
      this.stopCameraSession();
      this.ui.showScreen('landing');
    });

    // =========================================================================
    // CALIBRATION WORKFLOW BUTTONS
    // =========================================================================
    this.ui.calib.btnStartSample?.addEventListener('click', () => {
      this.audio.playClick();
      this._startInteractiveCalibration();
    });

    this.ui.calib.btnRecalibrate?.addEventListener('click', () => {
      this.audio.playClick();
      this._startInteractiveCalibration();
    });

    this.ui.calib.btnLaunch?.addEventListener('click', () => {
      this.audio.playClick();
      this._launchGameplay(false);
    });

    this.ui.calib.btnQuickLaunch?.addEventListener('click', () => {
      this.audio.playClick();
      this._launchGameplay(false);
    });

    this.ui.calib.btnSkip?.addEventListener('click', () => {
      this.audio.playClick();
      const calib = this.calibration.useDefaults();
      this.ui.showCalibrationSuccess(this.calibration.getSummary());
      this.ui.updateCalibrationStep(7, this.calibration.getStepMeta(7));
      this._startAutoLaunchCountdown();
    });

    // =========================================================================
    // TRACKING LOSS SUSPENSION OVERLAY BUTTONS
    // =========================================================================
    this.ui.hud.btnSuspendedKeyboard?.addEventListener('click', () => {
      this.audio.playClick();
      this.settings.set('gestureControlsEnabled', false);
      if (this.ui.settingsInputs.gestureEnabled) {
        this.ui.settingsInputs.gestureEnabled.checked = false;
      }
      this.ui.showTrackingSuspended(false);
      this.game.resumeFromTrackingLoss();
      this.ui.showComboCallout('KEYBOARD MODE ACTIVE!');
    });

    this.ui.hud.btnSuspendedResume?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.showTrackingSuspended(false);
      this.game.resumeFromTrackingLoss();
    });

    // In-game HUD Pause Button
    document.getElementById('hud-pause-btn')?.addEventListener('click', () => {
      this.audio.playClick();
      this.game.pause();
      this.ui.showRestartConfirmation(false);
      this.ui.showModal('pause');
    });

    // Pause Modal Buttons & Restart Confirmation Flow
    document.getElementById('btn-pause-resume')?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.hideModal('pause');
      this.ui.showRestartConfirmation(false);
      this.game.resume(true); // 3..2..1 resume countdown!
    });

    document.getElementById('btn-pause-restart')?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.showRestartConfirmation(true);
    });

    this.ui.btnConfirmRestartYes?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.hideModal('pause');
      this.ui.showRestartConfirmation(false);
      this.game.startNewGame(false);
    });

    this.ui.btnConfirmRestartNo?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.showRestartConfirmation(false);
    });

    document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.showModal('settings');
    });

    document.getElementById('btn-pause-quit')?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.hideAllModals();
      this.ui.showRestartConfirmation(false);
      this.game.state = GAME_STATES.TITLE;
      this.game.audio.stopBgm();
      this.game.audio.updateRollingHum(0, false);
      this.stopCameraSession();
      this.ui.showScreen('landing');
      this._updateLandingScores();
    });

    // Game Over Modal Buttons
    document.getElementById('btn-gameover-replay')?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.hideModal('gameOver');
      this.game.startNewGame();
    });

    document.getElementById('btn-gameover-menu')?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.hideModal('gameOver');
      this.game.state = GAME_STATES.TITLE;
      this.stopCameraSession();
      this.ui.showScreen('landing');
      this._updateLandingScores();
    });

    // Settings Modal
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.hideModal('settings');
    });

    // Diagnostics panel buttons
    this.ui.diag.btnHudToggle?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.toggleDiagnosticPanel();
    });

    this.ui.diag.btnClose?.addEventListener('click', () => {
      this.audio.playClick();
      this.ui.toggleDiagnosticPanel();
    });

    // Camera disconnect handler
    this.camera.onDisconnectCallback = (msg) => {
      console.warn('[Camera Disconnect]', msg);
      this.ui.showCameraError('Camera Disconnected', 'Webcam was disconnected or interrupted. Keyboard controls remain active.');
      this.ui.showComboCallout('CAMERA LOST: KEYBOARD ACTIVE');
    };

    this._bindSettingsInputs();

    // Tab Visibility Suspension Handling
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isTabHidden = true;
        if (this.game.state === GAME_STATES.PLAYING || this.game.state === GAME_STATES.COUNTDOWN) {
          this.game.pause();
          this.ui.showRestartConfirmation(false);
          this.ui.showModal('pause');
        }
        this.audio.updateRollingHum(0, false);
      } else {
        this.isTabHidden = false;
      }
    });

    // Sound effect on button hover
    document.querySelectorAll('.btn, .nav-btn, .modal-close-btn').forEach(b => {
      b.addEventListener('pointerenter', () => this.audio.playMenuHover());
    });

    // Global Keyboard Listeners
    window.addEventListener('keydown', (e) => this._handleKeyDown(e));
    window.addEventListener('keyup', (e) => this._handleKeyUp(e));
  }

  _bindSettingsInputs() {
    const s = this.ui.settingsInputs;

    s.gestureEnabled?.addEventListener('change', (e) => {
      this.settings.set('gestureControlsEnabled', e.target.checked);
    });

    s.pauseOnLost?.addEventListener('change', (e) => {
      this.settings.set('pauseOnTrackingLoss', e.target.checked);
    });

    s.steerSens?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.settings.set('headSensitivity', val);
      this.settings.set('steeringSensitivity', val);
      if (s.steerSensVal) s.steerSensVal.textContent = `${val.toFixed(1)}x`;
    });

    s.jumpSens?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.settings.set('jumpSensitivity', val);
      if (s.jumpSensVal) s.jumpSensVal.textContent = `${val.toFixed(1)}x`;
    });

    s.specialSens?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.settings.set('specialSensitivity', val);
      if (s.specialSensVal) s.specialSensVal.textContent = `${val.toFixed(1)}x`;
    });

    s.smoothing?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.settings.set('trackingSmoothing', val);
      if (s.smoothingVal) s.smoothingVal.textContent = val.toFixed(2);
    });

    s.invertSteer?.addEventListener('change', (e) => {
      this.settings.set('invertSteering', e.target.checked);
    });

    s.showPip?.addEventListener('change', (e) => {
      const checked = e.target.checked;
      this.settings.set('showCameraPip', checked);
      if (this.ui.hud.pipWidget) {
        this.ui.hud.pipWidget.style.display = checked ? 'block' : 'none';
      }
    });

    s.keyboardFallback?.addEventListener('change', (e) => {
      this.settings.set('keyboardFallback', e.target.checked);
    });

    s.masterVol?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.settings.set('masterVolume', val);
      this.audio.setVolumes(val, undefined, undefined);
      if (s.masterVolVal) s.masterVolVal.textContent = `${Math.round(val * 100)}%`;
    });

    s.sfxVol?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.settings.set('sfxVolume', val);
      this.audio.setVolumes(undefined, val, undefined);
      if (s.sfxVolVal) s.sfxVolVal.textContent = `${Math.round(val * 100)}%`;
    });

    s.bgmVol?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.settings.set('bgmVolume', val);
      this.audio.setVolumes(undefined, undefined, val);
      if (s.bgmVolVal) s.bgmVolVal.textContent = `${Math.round(val * 100)}%`;
    });

    s.btnClearData?.addEventListener('click', () => {
      if (confirm('Reset high scores, calibration, and saved progress?')) {
        this.storage.clearProgress();
        this.calibration.reset();
        this._updateLandingScores();
        this.audio.playShieldHit();
      }
    });
  }

  _handlePlayFlow() {
    if (this.camera.hasPermission && this.camera.isReady()) {
      if (!this.calibration.isCalibrated()) {
        this.ui.showScreen('calibration');
        this._setupCalibrationScreen();
      } else {
        this._launchGameplay(false);
      }
    } else {
      this.ui.showScreen('camera');
    }
  }

  async _startCameraAndModel() {
    const masterVideo = document.getElementById('headball-master-video');
    const cameraCardVideo = document.getElementById('camera-card-video');
    const calibVideo = document.getElementById('calib-video');
    const pipVideo = document.getElementById('pip-video');

    // Use master video element which is permanently mounted and never gets display:none
    await this.camera.requestPermissionAndStart(masterVideo || cameraCardVideo);

    // Synchronize camera stream to preview elements
    if (this.camera.stream) {
      if (cameraCardVideo) {
        cameraCardVideo.srcObject = this.camera.stream;
        cameraCardVideo.muted = true;
        cameraCardVideo.play().catch(() => {});
      }
      if (calibVideo) {
        calibVideo.srcObject = this.camera.stream;
        calibVideo.muted = true;
        calibVideo.play().catch(() => {});
      }
      if (pipVideo) {
        pipVideo.srcObject = this.camera.stream;
        pipVideo.muted = true;
        pipVideo.play().catch(() => {});
      }
    }

    await this.tracker.init();
    this._startFaceTrackingLoop();
  }

  _setupCalibrationScreen() {
    this._startInteractiveCalibration();
  }

  _startInteractiveCalibration() {
    if (this.calibCountdownInterval) {
      clearInterval(this.calibCountdownInterval);
      this.calibCountdownInterval = null;
    }

    this.calibration.startWorkflow({
      onStepChange: (step, meta) => {
        this.ui.updateCalibrationStep(step, meta);
        this.audio.playCalibrationStep(step);
      },
      onProgress: (progress) => {
        // Updated in loop
      },
      onComplete: (summary) => {
        this.audio.playOrbPickup(6);
        this.calibration.isActive = false;
        this.ui.showCalibrationSuccess(this.calibration.getSummary());
        this.ui.updateCalibrationStep(7, this.calibration.getStepMeta(7));
        this._startAutoLaunchCountdown();
      }
    });
  }

  _startAutoLaunchCountdown() {
    if (this.calibCountdownInterval) {
      clearInterval(this.calibCountdownInterval);
      this.calibCountdownInterval = null;
    }

    const totalSeconds = 3.0;
    let remaining = totalSeconds;
    this.ui.updateAutoLaunchCountdown(remaining, 100);

    const stepMs = 100;
    this.calibCountdownInterval = setInterval(() => {
      remaining -= stepMs / 1000;
      const pct = (remaining / totalSeconds) * 100;

      if (remaining <= 0) {
        clearInterval(this.calibCountdownInterval);
        this.calibCountdownInterval = null;
        this.audio.playCountdownBeep(true);
        this._launchGameplay(false);
      } else {
        this.ui.updateAutoLaunchCountdown(remaining, pct);
      }
    }, stepMs);
  }

  _launchGameplay(isKeyboardOnly = false) {
    if (this.calibCountdownInterval) {
      clearInterval(this.calibCountdownInterval);
      this.calibCountdownInterval = null;
    }
    this.calibration.isActive = false;

    this.ui.hideAllModals();
    this.ui.showScreen('game');
    this.game.resize();
    this.game.startNewGame();

    // Ensure PIP video continues playing smoothly in gameplay
    const pipVideo = document.getElementById('pip-video');
    if (pipVideo && this.camera.stream && pipVideo.srcObject !== this.camera.stream) {
      pipVideo.srcObject = this.camera.stream;
      pipVideo.muted = true;
      pipVideo.play().catch(() => {});
    }

    if (isKeyboardOnly) {
      this.settings.set('gestureControlsEnabled', false);
      if (this.ui.settingsInputs.gestureEnabled) {
        this.ui.settingsInputs.gestureEnabled.checked = false;
      }
      if (this.ui.hud.pipWidget) {
        this.ui.hud.pipWidget.style.display = 'none';
      }
      this.ui.showComboCallout('KEYBOARD MODE READY!');
    } else {
      this.settings.set('gestureControlsEnabled', true);
      if (this.ui.settingsInputs.gestureEnabled) {
        this.ui.settingsInputs.gestureEnabled.checked = true;
      }
      if (this.settings.get('showCameraPip') && this.ui.hud.pipWidget) {
        this.ui.hud.pipWidget.style.display = 'block';
      }
      this.ui.showComboCallout('HEADBALL AI ENGAGED!');
    }
  }

  stopCameraSession() {
    this.isTrackingLoopRunning = false;
    if (this.calibCountdownInterval) {
      clearInterval(this.calibCountdownInterval);
      this.calibCountdownInterval = null;
    }
    this.camera.stopCamera();
    this.gestureRecognizer.resetTriggers();
    this.ui.setCameraStatus('AWAITING WEBCAM', false);

    const masterVideo = document.getElementById('headball-master-video');
    const cameraCardVideo = document.getElementById('camera-card-video');
    const calibVideo = document.getElementById('calib-video');
    const pipVideo = document.getElementById('pip-video');
    if (masterVideo) masterVideo.srcObject = null;
    if (cameraCardVideo) cameraCardVideo.srcObject = null;
    if (calibVideo) calibVideo.srcObject = null;
    if (pipVideo) pipVideo.srcObject = null;
  }

  _startFaceTrackingLoop() {
    if (this.isTrackingLoopRunning) return;
    this.isTrackingLoopRunning = true;

    const cameraCardCanvas = document.getElementById('camera-card-canvas');

    const processFrame = () => {
      if (!this.isTrackingLoopRunning) {
        return;
      }
      if (this.isTabHidden) {
        requestAnimationFrame(processFrame);
        return;
      }
      if (this.camera.isReady()) {
        const video = this.camera.video;
        const result = this.tracker.detect(video);

        // Process head gestures
        const gesture = this.gestureRecognizer.process(
          result,
          this.calibration.getCalibration(),
          this.settings.settings
        );

        // Feed samples during active 7-step calibration
        if (this.calibration.isActive) {
          const calibResult = this.calibration.sampleFrame(gesture);
          this.ui.updateCalibrationProgress(calibResult.step, calibResult.progress, gesture);
        }

        // =====================================================================
        // DISPATCH TO CLEAN GAME ENGINE APIS (Zero vision logic in physics/game)
        // =====================================================================
        if (this.game.state === GAME_STATES.PLAYING || this.game.isSuspendedTrackingLoss) {
          // Check for safe tracking loss suspension
          if (gesture.safeSuspensionRequested) {
            this.game.suspendDueToTrackingLoss();
          } else if (this.game.isSuspendedTrackingLoss && gesture.detected) {
            // Re-acquired face: automatically resume
            this.game.resumeFromTrackingLoss();
          }

          const gesturesEnabled = this.settings.get('gestureControlsEnabled') !== false;

          if (gesturesEnabled && !this.game.isSuspendedTrackingLoss) {
            // 1. Horizontal Steering (Left, Right, Neutral)
            if (gesture.command === 'moveLeft') {
              this.game.moveLeft(Math.abs(gesture.steering));
            } else if (gesture.command === 'moveRight') {
              this.game.moveRight(Math.abs(gesture.steering));
            } else {
              // Neutral: stop horizontal steering (unless keyboard key is held)
              if (!this.keys.left && !this.keys.right) {
                this.game.neutral();
              }
            }

            // 2. Head Nod Pitch signal
            this.game.setInput({ pitch: gesture.pitchSignal });

            // 3. Mouth open Turbo Boost
            this.game.setInput({ isMouthOpen: gesture.isMouthOpen });

            // 4. Raise Eyebrows -> Jump (Edge-triggered with hysteresis)
            if (gesture.triggerJump) {
              this.game.jump();
            }

            // 5. Intentional Blink -> Special Ability (Subject to cooldown)
            if (gesture.triggerSpecial) {
              this.game.specialAbility();
            }
          }
        }

        // Update UI HUD telemetry & mini-pip overlay
        this.ui.updateGestureTelemetry(gesture);

        // Update Developer Diagnostic Telemetry Panel
        this.ui.updateDiagnosticTelemetry(gesture, this.tracker.getMetrics());

        // Update camera screen live status
        if (this.ui.currentScreen === 'camera') {
          if (gesture.detected) {
            this.ui.setCameraStatus('FACE DETECTED - READY', true);
          } else {
            this.ui.setCameraStatus('SEARCHING FOR FACE...', false);
          }
        }

        // Draw overlay on Camera preview card, PIP or calibration canvas
        if (this.ui.currentScreen === 'camera' && cameraCardCanvas) {
          this.tracker.drawOverlay(cameraCardCanvas, result, gesture);
        } else if (this.ui.currentScreen === 'calibration') {
          this.tracker.drawOverlay(this.ui.calib.canvas, result, gesture);
        } else if (this.settings.get('showCameraPip')) {
          this.tracker.drawOverlay(this.ui.hud.pipCanvas, result, gesture);
        }
      }

      requestAnimationFrame(processFrame);
    };

    requestAnimationFrame(processFrame);
  }

  // =========================================================================
  // KEYBOARD FALLBACK (Calls the exact same clean Game Engine APIs)
  // =========================================================================
  _handleKeyDown(e) {
    if (e.repeat) return;

    // Developer Diagnostic Panel Toggle (F2 or Backquote ~)
    if (e.code === 'F2' || e.code === 'Backquote') {
      e.preventDefault();
      this.ui.toggleDiagnosticPanel();
      return;
    }

    // Escape or P -> Pause
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (this.game.state === GAME_STATES.PLAYING) {
        this.game.pause();
        this.ui.showModal('pause');
      } else if (this.game.state === GAME_STATES.PAUSED && !this.game.isSuspendedTrackingLoss) {
        this.ui.hideModal('pause');
        this.game.resume();
      }
      return;
    }

    if (this.game.state === GAME_STATES.TITLE && (e.code === 'Enter' || e.code === 'Space')) {
      this._handlePlayFlow();
      return;
    }

    // Space or Enter on Calibration screen after calibration is complete
    if (this.ui.currentScreen === 'calibration' && (e.code === 'Enter' || e.code === 'Space')) {
      if (this.calibration.currentStep === CALIBRATION_STEPS.STEP_7_SUCCESS || !this.calibration.isActive) {
        e.preventDefault();
        this._launchGameplay(false);
        return;
      }
    }

    if (this.game.state !== GAME_STATES.PLAYING) return;

    // A / ArrowLeft -> moveLeft
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.keys.left = true;
      this.game.moveLeft(1.0);
    } 
    // D / ArrowRight -> moveRight
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.keys.right = true;
      this.game.moveRight(1.0);
    } 
    // Space -> jump
    else if (e.code === 'Space') {
      e.preventDefault();
      this.keys.jump = true;
      this.game.jump();
    } 
    // B / E -> specialAbility
    else if (e.code === 'KeyB' || e.code === 'KeyE') {
      this.game.specialAbility();
    }
    // Shift / W / Up -> boost
    else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      this.keys.boost = true;
      this.game.setInput({ keyboardBoost: true });
    }
  }

  _handleKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.keys.left = false;
      if (this.keys.right) {
        this.game.moveRight(1.0);
      } else {
        this.game.neutral();
      }
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.keys.right = false;
      if (this.keys.left) {
        this.game.moveLeft(1.0);
      } else {
        this.game.neutral();
      }
    } else if (e.code === 'Space') {
      this.keys.jump = false;
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      this.keys.boost = false;
      this.game.setInput({ keyboardBoost: false });
    }
  }
}

// Instantiate and initialize on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new HeadBallApp();
  app.init();
});
