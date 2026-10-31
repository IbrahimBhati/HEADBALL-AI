/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - UI Module
 * Screen manager, HUD controllers, modal handlers, and telemetry displays.
 */

export class UIManager {
  constructor() {
    // Screen Elements
    this.screens = {
      landing: document.getElementById('screen-landing'),
      instructions: document.getElementById('screen-instructions'),
      camera: document.getElementById('screen-camera'),
      calibration: document.getElementById('screen-calibration'),
      game: document.getElementById('screen-game')
    };

    // Modals
    this.modals = {
      pause: document.getElementById('modal-pause'),
      gameOver: document.getElementById('modal-game-over'),
      settings: document.getElementById('modal-settings'),
      highscores: document.getElementById('modal-highscores')
    };

    // HUD Elements
    this.hud = {
      score: document.getElementById('hud-score'),
      distance: document.getElementById('hud-distance'),
      coins: document.getElementById('hud-coins-value'),
      levelNum: document.getElementById('hud-level-num'),
      levelProgressFill: document.getElementById('level-progress-fill'),
      livesIcons: document.querySelectorAll('.hud-life-icon'),
      comboContainer: document.getElementById('hud-combo-cluster'),
      comboCount: document.getElementById('hud-combo-count'),
      comboMult: document.getElementById('hud-combo-mult'),
      speedValue: document.getElementById('hud-speed-value'),
      boostFill: document.getElementById('hud-boost-fill'),
      specialFill: document.getElementById('hud-special-fill'),
      specialStatus: document.getElementById('hud-special-status'),
      shieldIndicator: document.getElementById('hud-shield-indicator'),
      cueSteer: document.getElementById('cue-steer'),
      cueBoost: document.getElementById('cue-boost'),
      cueJump: document.getElementById('cue-jump'),
      cueSpecial: document.getElementById('cue-special'),
      pipWidget: document.getElementById('camera-pip-widget'),
      pipVideo: document.getElementById('pip-video'),
      pipCanvas: document.getElementById('pip-canvas'),
      pipStatusText: document.getElementById('pip-status-text'),
      pipDot: document.getElementById('pip-dot'),
      trackingSuspended: document.getElementById('hud-tracking-suspended'),
      btnSuspendedKeyboard: document.getElementById('btn-suspended-keyboard'),
      btnSuspendedResume: document.getElementById('btn-suspended-resume')
    };

    // Camera Screen Elements
    this.cameraScreen = {
      statusBadge: document.getElementById('camera-detection-badge'),
      statusText: document.getElementById('camera-detection-text'),
      errorContainer: document.getElementById('camera-error-container'),
      errorTitle: document.getElementById('camera-error-title'),
      errorBody: document.getElementById('camera-error-body'),
      btnStartCalib: document.getElementById('btn-start-calib-from-camera')
    };

    // Developer Diagnostic Panel Elements
    this.diag = {
      panel: document.getElementById('dev-diagnostic-panel'),
      faceStatus: document.getElementById('diag-face-status'),
      confidence: document.getElementById('diag-confidence'),
      fps: document.getElementById('diag-fps'),
      roll: document.getElementById('diag-roll'),
      yaw: document.getElementById('diag-yaw'),
      pitch: document.getElementById('diag-pitch'),
      center: document.getElementById('diag-center'),
      browVal: document.getElementById('diag-brow-val'),
      browBar: document.getElementById('diag-brow-bar'),
      mouthVal: document.getElementById('diag-mouth-val'),
      mouthBar: document.getElementById('diag-mouth-bar'),
      eyeLeft: document.getElementById('diag-eye-left'),
      eyeRight: document.getElementById('diag-eye-right'),
      eyesBoth: document.getElementById('diag-eyes-both'),
      btnClose: document.getElementById('btn-close-diag'),
      btnHudToggle: document.getElementById('hud-diag-btn')
    };

    // Calibration 7-Step Elements
    this.calib = {
      video: document.getElementById('calib-video'),
      canvas: document.getElementById('calib-canvas'),
      reticle: document.getElementById('calib-reticle'),
      progressFill: document.getElementById('calib-progress-fill'),
      progressPercent: document.getElementById('calib-progress-percent'),
      statusText: document.getElementById('calib-status-text'),
      stepBadge: document.getElementById('calib-step-badge'),
      stepTitle: document.getElementById('calib-step-title'),
      stepInstruction: document.getElementById('calib-step-instruction'),
      detectionPill: document.getElementById('calib-detection-pill'),
      directionGuide: document.getElementById('calib-direction-guide'),
      arrowIcon: document.getElementById('calib-arrow-icon'),
      stepPills: Array.from({ length: 7 }, (_, i) => document.getElementById(`step-pill-${i + 1}`)),
      successCard: document.getElementById('calib-success-card'),
      viewport: document.getElementById('calib-active-viewport'),
      btnStartSample: document.getElementById('btn-start-calibration'),
      btnSkip: document.getElementById('btn-skip-calibration'),
      btnRecalibrate: document.getElementById('btn-recalibrate'),
      btnLaunch: document.getElementById('btn-launch-from-calib'),
      summaryNeutral: document.getElementById('summary-neutral'),
      summaryLeftTilt: document.getElementById('summary-left-tilt'),
      summaryRightTilt: document.getElementById('summary-right-tilt'),
      summaryJumpThresh: document.getElementById('summary-jump-thresh'),
      summaryDeadzone: document.getElementById('summary-deadzone'),
      meterSteer: document.getElementById('calib-meter-steer'),
      meterPitch: document.getElementById('calib-meter-pitch'),
      meterBrow: document.getElementById('calib-meter-brow'),
      meterBlink: document.getElementById('calib-meter-blink'),
      valSteer: document.getElementById('calib-val-steer'),
      valPitch: document.getElementById('calib-val-pitch'),
      valBrow: document.getElementById('calib-val-brow'),
      valBlink: document.getElementById('calib-val-blink')
    };

    // Game Over Elements
    this.gameOverElements = {
      titleText: document.getElementById('go-title-text'),
      causeText: document.getElementById('go-cause-text'),
      finalScore: document.getElementById('go-final-score'),
      bestScore: document.getElementById('go-best-score'),
      finalCoins: document.getElementById('go-final-coins'),
      finalDistance: document.getElementById('go-final-distance'),
      finalLevel: document.getElementById('go-final-level'),
      highScoreBadge: document.getElementById('go-new-highscore')
    };

    // Pause Elements & Restart Confirmation
    this.pauseMainActions = document.getElementById('pause-main-actions');
    this.pauseRestartConfirm = document.getElementById('pause-restart-confirm');
    this.btnConfirmRestartYes = document.getElementById('btn-confirm-restart-yes');
    this.btnConfirmRestartNo = document.getElementById('btn-confirm-restart-no');

    // Smooth HUD Score & Dirty Check Caches
    this.displayScore = 0;
    this.lastStats = {};
    this.gameOverTallyRaf = null;

    // High Scores Modal Elements
    this.highscoresList = document.getElementById('highscores-table-body');

    // Settings Inputs
    this.settingsInputs = {
      gestureEnabled: document.getElementById('setting-gesture-enabled'),
      pauseOnLost: document.getElementById('setting-pause-tracking-loss'),
      steerSens: document.getElementById('setting-steer-sens'),
      steerSensVal: document.getElementById('setting-steer-sens-val'),
      jumpSens: document.getElementById('setting-jump-sens'),
      jumpSensVal: document.getElementById('setting-jump-sens-val'),
      specialSens: document.getElementById('setting-special-sens'),
      specialSensVal: document.getElementById('setting-special-sens-val'),
      smoothing: document.getElementById('setting-smoothing'),
      smoothingVal: document.getElementById('setting-smoothing-val'),
      invertSteer: document.getElementById('setting-invert-steer'),
      showPip: document.getElementById('setting-show-pip'),
      keyboardFallback: document.getElementById('setting-keyboard-fallback'),
      masterVol: document.getElementById('setting-master-vol'),
      masterVolVal: document.getElementById('setting-master-vol-val'),
      sfxVol: document.getElementById('setting-sfx-vol'),
      sfxVolVal: document.getElementById('setting-sfx-vol-val'),
      bgmVol: document.getElementById('setting-bgm-vol'),
      bgmVolVal: document.getElementById('setting-bgm-vol-val'),
      btnClearData: document.getElementById('btn-clear-save-data')
    };

    this.currentScreen = 'landing';
    this.comboHideTimeout = null;
  }

  showScreen(screenName) {
    Object.keys(this.screens).forEach(key => {
      const el = this.screens[key];
      if (el) {
        if (key === screenName) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });
    this.currentScreen = screenName;
  }

  showModal(modalName) {
    const modal = this.modals[modalName];
    if (modal) {
      modal.classList.add('active');
    }
  }

  hideModal(modalName) {
    const modal = this.modals[modalName];
    if (modal) {
      modal.classList.remove('active');
    }
  }

  hideAllModals() {
    Object.values(this.modals).forEach(m => {
      if (m) m.classList.remove('active');
    });
  }

  showCameraError(title, body) {
    if (this.cameraScreen.errorContainer) {
      this.cameraScreen.errorContainer.classList.add('visible');
    }
    if (this.cameraScreen.errorTitle) {
      this.cameraScreen.errorTitle.textContent = title || 'Camera Access Error';
    }
    if (this.cameraScreen.errorBody) {
      this.cameraScreen.errorBody.textContent = body || 'Please verify webcam permissions in your browser.';
    }
    if (this.cameraScreen.statusText) {
      this.cameraScreen.statusText.textContent = 'CAMERA DISCONNECTED';
      this.cameraScreen.statusText.style.color = '#ff3366';
    }
  }

  hideCameraError() {
    if (this.cameraScreen.errorContainer) {
      this.cameraScreen.errorContainer.classList.remove('visible');
    }
  }

  setCameraStatus(text, isReady = false) {
    if (this.cameraScreen.statusText) {
      this.cameraScreen.statusText.textContent = text;
      this.cameraScreen.statusText.style.color = isReady ? '#10b981' : '#00f3ff';
    }
    if (this.cameraScreen.btnStartCalib) {
      this.cameraScreen.btnStartCalib.style.display = isReady ? 'inline-flex' : 'none';
    }
  }

  updateHUD(stats) {
    // 1. Smooth animated score counter interpolation
    if (this.hud.score) {
      if (Math.abs(stats.score - this.displayScore) > 1) {
        this.displayScore += (stats.score - this.displayScore) * 0.25;
      } else {
        this.displayScore = stats.score;
      }
      const rounded = Math.round(this.displayScore);
      if (this.lastStats.score !== rounded) {
        this.lastStats.score = rounded;
        this.hud.score.textContent = rounded.toLocaleString();
      }
    }

    // 2. Dirty-checked HUD text updates (avoids layout thrashing)
    if (this.hud.distance && this.lastStats.distance !== stats.distance) {
      this.lastStats.distance = stats.distance;
      this.hud.distance.textContent = `${stats.distance}m`;
    }
    if (this.hud.coins && this.lastStats.coins !== stats.coins) {
      this.lastStats.coins = stats.coins;
      this.hud.coins.textContent = stats.coins.toLocaleString();
    }
    if (this.hud.levelNum && this.lastStats.level !== stats.level) {
      this.lastStats.level = stats.level;
      this.hud.levelNum.textContent = stats.level;
    }
    if (this.hud.levelProgressFill) {
      const pct = Math.round(stats.levelProgress * 100);
      if (this.lastStats.lvlPct !== pct) {
        this.lastStats.lvlPct = pct;
        this.hud.levelProgressFill.style.width = `${pct}%`;
      }
    }
    if (this.hud.speedValue && this.lastStats.speed !== stats.speed) {
      this.lastStats.speed = stats.speed;
      this.hud.speedValue.textContent = stats.speed;
    }
    if (this.hud.boostFill) {
      const boostVal = Math.round(stats.boostEnergy);
      if (this.lastStats.boost !== boostVal) {
        this.lastStats.boost = boostVal;
        this.hud.boostFill.style.width = `${boostVal}%`;
      }
      if (this.lastStats.isBoosting !== stats.isBoosting) {
        this.lastStats.isBoosting = stats.isBoosting;
        if (stats.isBoosting) {
          this.hud.boostFill.classList.add('active');
        } else {
          this.hud.boostFill.classList.remove('active');
        }
      }
    }

    // Special Ability Cooldown Gauge
    if (this.hud.specialFill && stats.specialCooldown !== undefined) {
      if (stats.specialReady) {
        if (!this.lastStats.specialReady) {
          this.lastStats.specialReady = true;
          this.hud.specialFill.style.width = '100%';
          this.hud.specialFill.style.background = 'linear-gradient(90deg, #9333ea, #c084fc)';
          if (this.hud.specialStatus) {
            this.hud.specialStatus.textContent = 'READY [BLINK / B]';
            this.hud.specialStatus.style.color = '#c084fc';
          }
        }
      } else {
        this.lastStats.specialReady = false;
        const pct = Math.max(0, Math.min(100, (1 - (stats.specialCooldown / stats.specialMaxCooldown)) * 100));
        this.hud.specialFill.style.width = `${pct}%`;
        this.hud.specialFill.style.background = 'linear-gradient(90deg, #475569, #7c3aed)';
        if (this.hud.specialStatus) {
          this.hud.specialStatus.textContent = `COOLDOWN ${stats.specialCooldown.toFixed(1)}s`;
          this.hud.specialStatus.style.color = '#94a3b8';
        }
      }
    }

    if (this.hud.shieldIndicator && this.lastStats.hasShield !== stats.hasShield) {
      this.lastStats.hasShield = stats.hasShield;
      if (stats.hasShield) {
        this.hud.shieldIndicator.classList.add('active');
      } else {
        this.hud.shieldIndicator.classList.remove('active');
      }
    }

    // Remaining Lives
    if (this.hud.livesIcons && this.hud.livesIcons.length > 0 && this.lastStats.lives !== stats.lives) {
      this.lastStats.lives = stats.lives;
      this.hud.livesIcons.forEach((icon, idx) => {
        if (idx < stats.lives) {
          icon.classList.remove('lost');
        } else {
          icon.classList.add('lost');
        }
      });
    }

    // Combo streak badge
    if (stats.combo >= 2) {
      if (!this.lastStats.comboActive) {
        this.lastStats.comboActive = true;
        if (this.hud.comboContainer) this.hud.comboContainer.classList.add('visible');
      }
      if (this.hud.comboCount && this.lastStats.comboVal !== stats.combo) {
        this.lastStats.comboVal = stats.combo;
        this.hud.comboCount.textContent = `${stats.combo} COMBO!`;
      }
      if (this.hud.comboMult && this.lastStats.comboMult !== stats.multiplier) {
        this.lastStats.comboMult = stats.multiplier;
        this.hud.comboMult.textContent = `${stats.multiplier}X MULTIPLIER`;
      }
    } else {
      if (this.lastStats.comboActive) {
        this.lastStats.comboActive = false;
        if (this.hud.comboContainer) this.hud.comboContainer.classList.remove('visible');
      }
    }
  }

  showRestartConfirmation(show = true) {
    if (this.pauseMainActions && this.pauseRestartConfirm) {
      this.pauseMainActions.style.display = show ? 'none' : 'flex';
      this.pauseRestartConfirm.style.display = show ? 'flex' : 'none';
    }
  }

  showComboCallout(text) {
    if (this.hud.comboCount) {
      this.hud.comboCount.textContent = text;
    }
    if (this.hud.comboContainer) {
      this.hud.comboContainer.classList.add('visible');
      clearTimeout(this.comboHideTimeout);
      this.comboHideTimeout = setTimeout(() => {
        if (this.hud.comboContainer) this.hud.comboContainer.classList.remove('visible');
      }, 1400);
    }
  }

  updateGestureTelemetry(gesture) {
    // Update Telemetry Cues in HUD
    if (this.hud.cueSteer) {
      if (Math.abs(gesture.steering) > 0.12) {
        this.hud.cueSteer.classList.add('active');
        this.hud.cueSteer.textContent = gesture.steering < 0 ? '◀ TILT LEFT' : 'TILT RIGHT ▶';
      } else {
        this.hud.cueSteer.classList.remove('active');
        this.hud.cueSteer.textContent = 'STEER: CENTER';
      }
    }

    if (this.hud.cueBoost) {
      if (gesture.isMouthOpen) {
        this.hud.cueBoost.classList.add('active');
      } else {
        this.hud.cueBoost.classList.remove('active');
      }
    }

    if (this.hud.cueJump) {
      if (gesture.isBrowRaised) {
        this.hud.cueJump.classList.add('active');
      } else {
        this.hud.cueJump.classList.remove('active');
      }
    }

    if (this.hud.cueSpecial) {
      if (gesture.isBothBlink) {
        this.hud.cueSpecial.classList.add('active');
        this.hud.cueSpecial.textContent = 'BLINK: ACTIVE!';
      } else {
        this.hud.cueSpecial.classList.remove('active');
        this.hud.cueSpecial.textContent = 'BLINK: SPECIAL';
      }
    }

    // Update Mini-PIP Tracking Status
    if (this.hud.pipDot && this.hud.pipStatusText) {
      if (gesture.detected) {
        this.hud.pipDot.classList.remove('lost');
        this.hud.pipStatusText.textContent = 'TRACKING OK';
      } else {
        this.hud.pipDot.classList.add('lost');
        this.hud.pipStatusText.textContent = 'FACE LOST';
      }
    }

    // Update Calibration live meters & textual badges if on calibration screen
    if (this.currentScreen === 'calibration') {
      if (this.calib.meterSteer) {
        const steerPercent = Math.min(100, Math.max(0, (gesture.steering + 1) * 50));
        this.calib.meterSteer.style.width = `${steerPercent}%`;
      }
      if (this.calib.valSteer) {
        if (Math.abs(gesture.steering) < 0.1) {
          this.calib.valSteer.textContent = 'CENTERED';
          this.calib.valSteer.style.color = 'var(--cyan-primary)';
        } else if (gesture.steering < -0.1) {
          this.calib.valSteer.textContent = `TILT LEFT (${(gesture.steering * -100).toFixed(0)}%)`;
          this.calib.valSteer.style.color = 'var(--cyan-primary)';
        } else {
          this.calib.valSteer.textContent = `TILT RIGHT (${(gesture.steering * 100).toFixed(0)}%)`;
          this.calib.valSteer.style.color = 'var(--cyan-primary)';
        }
      }

      if (this.calib.meterPitch) {
        const pitchPercent = Math.min(100, Math.max(0, (gesture.pitch + 1) * 50));
        this.calib.meterPitch.style.width = `${pitchPercent}%`;
      }
      if (this.calib.valPitch) {
        this.calib.valPitch.textContent = Math.abs(gesture.pitch) < 0.15 ? 'NEUTRAL' : (gesture.pitch > 0 ? 'NOD UP' : 'NOD DOWN');
      }

      if (this.calib.meterBrow) {
        const browPercent = Math.min(100, Math.max(0, gesture.browRaiseRatio * 180));
        this.calib.meterBrow.style.width = `${browPercent}%`;
      }
      if (this.calib.valBrow) {
        this.calib.valBrow.textContent = gesture.isBrowRaised ? 'JUMP ACTIVATED!' : (gesture.browRaiseRatio > 0.15 ? 'RAISED' : 'RESTING');
        this.calib.valBrow.style.color = gesture.isBrowRaised ? '#10b981' : 'var(--amber-gold)';
      }

      if (this.calib.meterBlink) {
        const blinkVal = Math.max(gesture.leftEyeBlink, gesture.rightEyeBlink);
        this.calib.meterBlink.style.width = `${Math.min(100, blinkVal * 100)}%`;
      }
      if (this.calib.valBlink) {
        this.calib.valBlink.textContent = gesture.isBothBlink ? 'BOTH CLOSED (SPECIAL!)' : ((gesture.isLeftBlink || gesture.isRightBlink) ? 'WINK' : 'OPEN');
      }

      // Check reticle alignment
      if (this.calib.reticle) {
        if (gesture.detected && Math.abs(gesture.steering) < 0.25) {
          this.calib.reticle.classList.add('aligned');
        } else {
          this.calib.reticle.classList.remove('aligned');
        }
      }
    }
  }

  showTrackingSuspended(show) {
    if (this.hud.trackingSuspended) {
      this.hud.trackingSuspended.style.display = show ? 'flex' : 'none';
    }
  }

  updateCalibrationStep(step, meta) {
    if (this.calib.stepBadge) this.calib.stepBadge.textContent = meta.badge || `STEP ${step} / 7`;
    if (this.calib.stepTitle) this.calib.stepTitle.textContent = meta.title || '';
    if (this.calib.stepInstruction) this.calib.stepInstruction.textContent = meta.instruction || '';

    // Update 7-Step pills
    if (this.calib.stepPills) {
      this.calib.stepPills.forEach((pill, idx) => {
        if (!pill) return;
        const pillStep = idx + 1;
        pill.classList.remove('active', 'completed');
        if (pillStep < step) {
          pill.classList.add('completed');
        } else if (pillStep === step) {
          pill.classList.add('active');
        }
      });
    }

    // Direction Guidance Overlay
    if (this.calib.directionGuide && this.calib.arrowIcon) {
      if (step === 3) {
        this.calib.arrowIcon.textContent = '◀️ TILT LEFT';
        this.calib.directionGuide.style.opacity = '1';
      } else if (step === 4) {
        this.calib.arrowIcon.textContent = 'TILT RIGHT ▶️';
        this.calib.directionGuide.style.opacity = '1';
      } else if (step === 5) {
        this.calib.arrowIcon.textContent = '🔼 RAISE BROWS';
        this.calib.directionGuide.style.opacity = '1';
      } else {
        this.calib.directionGuide.style.opacity = '0';
      }
    }

    // Step 7 Success Card visibility
    if (step === 7) {
      if (this.calib.successCard) this.calib.successCard.style.display = 'block';
      if (this.calib.btnLaunch) this.calib.btnLaunch.style.display = 'inline-flex';
      if (this.calib.btnRecalibrate) this.calib.btnRecalibrate.style.display = 'inline-flex';
      if (this.calib.btnStartSample) this.calib.btnStartSample.style.display = 'none';
      if (this.calib.statusText) this.calib.statusText.textContent = 'Personalized thresholds successfully stored!';
      if (this.calib.progressPercent) this.calib.progressPercent.textContent = '100%';
      if (this.calib.progressFill) this.calib.progressFill.style.width = '100%';
    } else {
      if (this.calib.successCard) this.calib.successCard.style.display = 'none';
      if (this.calib.btnLaunch) this.calib.btnLaunch.style.display = 'none';
      if (this.calib.btnRecalibrate) this.calib.btnRecalibrate.style.display = 'none';
      if (this.calib.btnStartSample) this.calib.btnStartSample.style.display = 'inline-flex';
    }
  }

  updateCalibrationProgress(step, progress, gesture) {
    const pct = Math.round(progress * 100);
    if (this.calib.progressFill) this.calib.progressFill.style.width = `${pct}%`;
    if (this.calib.progressPercent) this.calib.progressPercent.textContent = `${pct}%`;

    if (this.calib.statusText) {
      if (step === 1) this.calib.statusText.textContent = 'Align head in reticle center...';
      else if (step === 2) this.calib.statusText.textContent = `Recording neutral baseline (${pct}%)...`;
      else if (step === 3) this.calib.statusText.textContent = `Recording left tilt angle (${pct}%)...`;
      else if (step === 4) this.calib.statusText.textContent = `Recording right tilt angle (${pct}%)...`;
      else if (step === 5) this.calib.statusText.textContent = `Calibrating eyebrow jump threshold (${pct}%)...`;
      else if (step === 6) this.calib.statusText.textContent = 'Calculating personalized motion curves...';
      else if (step === 7) this.calib.statusText.textContent = 'Calibration Successful!';
    }
  }

  showCalibrationSuccess(summary) {
    if (this.calib.summaryNeutral) this.calib.summaryNeutral.textContent = summary.neutralAngle || '0.0°';
    if (this.calib.summaryLeftTilt) this.calib.summaryLeftTilt.textContent = `-${summary.leftTiltMax || '12.0°'}`;
    if (this.calib.summaryRightTilt) this.calib.summaryRightTilt.textContent = `+${summary.rightTiltMax || '12.0°'}`;
    if (this.calib.summaryJumpThresh) this.calib.summaryJumpThresh.textContent = summary.browJumpThresh || '0.25';
    if (this.calib.summaryDeadzone) this.calib.summaryDeadzone.textContent = summary.deadzone || '3.5°';
  }

  toggleDiagnosticPanel() {
    if (!this.diag.panel) return false;
    const isVis = this.diag.panel.classList.toggle('visible');
    return isVis;
  }

  updateDiagnosticTelemetry(gesture, metrics = {}) {
    if (!this.diag.panel || !this.diag.panel.classList.contains('visible')) return;

    if (this.diag.faceStatus) {
      if (gesture.detected) {
        this.diag.faceStatus.textContent = 'DETECTED';
        this.diag.faceStatus.className = 'diag-val green';
      } else {
        this.diag.faceStatus.textContent = 'SEARCHING';
        this.diag.faceStatus.className = 'diag-val red';
      }
    }

    if (this.diag.confidence) {
      this.diag.confidence.textContent = `${Math.round((gesture.trackingConfidence || 0) * 100)}%`;
    }

    if (this.diag.fps) {
      this.diag.fps.textContent = `${metrics.fps || 0} fps / ${metrics.latencyMs || 0}ms`;
    }

    if (this.diag.roll) {
      const sign = gesture.roll > 0 ? '+' : '';
      this.diag.roll.textContent = `${sign}${gesture.roll.toFixed(1)}°`;
    }

    if (this.diag.yaw) {
      const sign = gesture.yaw > 0 ? '+' : '';
      this.diag.yaw.textContent = `${sign}${gesture.yaw.toFixed(1)}°`;
    }

    if (this.diag.pitch) {
      const sign = gesture.pitch > 0 ? '+' : '';
      this.diag.pitch.textContent = `${sign}${gesture.pitch.toFixed(1)}°`;
    }

    if (this.diag.center && gesture.faceCenter) {
      this.diag.center.textContent = `${gesture.faceCenter.x.toFixed(2)}, ${gesture.faceCenter.y.toFixed(2)}`;
    }

    if (this.diag.browVal) {
      this.diag.browVal.textContent = `${gesture.browRaiseRatio.toFixed(2)} ${gesture.isBrowRaised ? '(JUMP!)' : ''}`;
    }
    if (this.diag.browBar) {
      this.diag.browBar.style.width = `${Math.min(100, gesture.browRaiseRatio * 150)}%`;
    }

    if (this.diag.mouthVal) {
      this.diag.mouthVal.textContent = `${gesture.mouthOpenRatio.toFixed(2)} ${gesture.isMouthOpen ? '(BOOST!)' : ''}`;
    }
    if (this.diag.mouthBar) {
      this.diag.mouthBar.style.width = `${Math.min(100, gesture.mouthOpenRatio * 150)}%`;
    }

    if (this.diag.eyeLeft) {
      this.diag.eyeLeft.textContent = `${gesture.leftEyeBlink.toFixed(2)} ${gesture.isLeftBlink ? '(BLINK)' : '(OPEN)'}`;
    }
    if (this.diag.eyeRight) {
      this.diag.eyeRight.textContent = `${gesture.rightEyeBlink.toFixed(2)} ${gesture.isRightBlink ? '(BLINK)' : '(OPEN)'}`;
    }

    if (this.diag.eyesBoth) {
      this.diag.eyesBoth.textContent = gesture.isBothBlink ? 'YES (BOTH BLINK)' : 'NO';
      this.diag.eyesBoth.className = gesture.isBothBlink ? 'diag-val magenta' : 'diag-val';
    }
  }

  showGameOver(record, isNewHigh, bestScore = 0) {
    if (this.gameOverTallyRaf) {
      cancelAnimationFrame(this.gameOverTallyRaf);
      this.gameOverTallyRaf = null;
    }

    if (this.gameOverElements.titleText) {
      this.gameOverElements.titleText.textContent = record.cause && record.cause.includes('VOID') ? 'FELL INTO VOID' : 'SYSTEM CRASH';
    }
    if (this.gameOverElements.causeText) {
      this.gameOverElements.causeText.textContent = record.cause || 'Energy cores depleted. Mission telemetry finalized.';
    }
    if (this.gameOverElements.bestScore) {
      this.gameOverElements.bestScore.textContent = Math.max(record.score, bestScore).toLocaleString();
    }
    if (this.gameOverElements.finalLevel) {
      this.gameOverElements.finalLevel.textContent = `Zone ${record.level || 1}`;
    }
    if (this.gameOverElements.highScoreBadge) {
      this.gameOverElements.highScoreBadge.style.display = isNewHigh ? 'inline-flex' : 'none';
      if (isNewHigh) {
        this.gameOverElements.highScoreBadge.classList.add('pulse-glow');
      }
    }

    // Animate score counter tally
    const targetScore = record.score || 0;
    const targetCoins = record.coins || 0;
    const targetDistance = record.distance || 0;
    const startTime = performance.now();
    const duration = 1200;

    const stepTally = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

      if (this.gameOverElements.finalScore) {
        this.gameOverElements.finalScore.textContent = Math.round(targetScore * ease).toLocaleString();
      }
      if (this.gameOverElements.finalCoins) {
        this.gameOverElements.finalCoins.textContent = Math.round(targetCoins * ease).toLocaleString();
      }
      if (this.gameOverElements.finalDistance) {
        this.gameOverElements.finalDistance.textContent = `${Math.round(targetDistance * ease)}m`;
      }

      if (progress < 1.0) {
        this.gameOverTallyRaf = requestAnimationFrame(stepTally);
      }
    };
    this.gameOverTallyRaf = requestAnimationFrame(stepTally);

    this.showModal('gameOver');
  }

  populateHighscores(history, bestScore, bestDist) {
    if (!this.highscoresList) return;
    this.highscoresList.innerHTML = '';

    if (!history || history.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No arcade records yet. Take your first run!</td>`;
      this.highscoresList.appendChild(tr);
      return;
    }

    history.forEach((run, index) => {
      const tr = document.createElement('tr');
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
      const dateStr = run.timestamp ? new Date(run.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent';
      
      tr.innerHTML = `
        <td style="font-weight: 700; color: ${index < 3 ? 'var(--amber-gold)' : 'var(--text-muted)'};">${medal}</td>
        <td class="tabular-nums" style="font-weight: 800; color: var(--cyan-primary);">${(run.score || 0).toLocaleString()}</td>
        <td class="tabular-nums" style="color: #ffffff;">${run.distance || 0}m</td>
        <td class="tabular-nums" style="color: var(--amber-gold);">${run.coins || run.orbs || 0}</td>
        <td style="color: var(--text-dim); font-size: 0.75rem;">${dateStr}</td>
      `;
      this.highscoresList.appendChild(tr);
    });
  }

  populateSettings(settings) {
    const s = this.settingsInputs;
    if (s.gestureEnabled) s.gestureEnabled.checked = settings.gestureControlsEnabled !== false;
    if (s.pauseOnLost) s.pauseOnLost.checked = settings.pauseOnTrackingLoss !== false;

    const headSens = settings.headSensitivity || settings.steeringSensitivity || 1.2;
    if (s.steerSens) s.steerSens.value = headSens;
    if (s.steerSensVal) s.steerSensVal.textContent = `${headSens}x`;

    const jumpSens = settings.jumpSensitivity || 1.0;
    if (s.jumpSens) s.jumpSens.value = jumpSens;
    if (s.jumpSensVal) s.jumpSensVal.textContent = `${jumpSens}x`;

    const specialSens = settings.specialSensitivity || 1.0;
    if (s.specialSens) s.specialSens.value = specialSens;
    if (s.specialSensVal) s.specialSensVal.textContent = `${specialSens}x`;

    const smoothing = settings.trackingSmoothing || 0.28;
    if (s.smoothing) s.smoothing.value = smoothing;
    if (s.smoothingVal) s.smoothingVal.textContent = smoothing.toFixed(2);

    if (s.invertSteer) s.invertSteer.checked = settings.invertSteering;
    if (s.showPip) s.showPip.checked = settings.showCameraPip;
    if (s.keyboardFallback) s.keyboardFallback.checked = settings.keyboardFallback;

    if (s.masterVol) s.masterVol.value = settings.masterVolume;
    if (s.masterVolVal) s.masterVolVal.textContent = `${Math.round(settings.masterVolume * 100)}%`;

    if (s.sfxVol) s.sfxVol.value = settings.sfxVolume;
    if (s.sfxVolVal) s.sfxVolVal.textContent = `${Math.round(settings.sfxVolume * 100)}%`;

    if (s.bgmVol) s.bgmVol.value = settings.bgmVolume;
    if (s.bgmVolVal) s.bgmVolVal.textContent = `${Math.round(settings.bgmVolume * 100)}%`;

    // PIP visibility
    if (this.hud.pipWidget) {
      this.hud.pipWidget.style.display = settings.showCameraPip ? 'block' : 'none';
    }
  }
}
