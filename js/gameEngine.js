/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Game Engine & 3D Canvas Renderer
 * 60fps simulation loop, perspective projection, camera tracking, and cyber track rendering.
 */

import { PlayerBall } from './player.js';
import { PhysicsEngine } from './physics.js';
import { ObstacleManager, PLATFORM_TYPES } from './obstacles.js';
import { CollectibleManager, COLLECTIBLE_TYPES } from './collectibles.js';
import { CollisionDetector } from './collision.js';
import { ScoringSystem } from './scoring.js';
import { ParticlePool } from './particlePool.js';

export const GAME_STATES = {
  MENU: 'menu',
  TITLE: 'menu',
  CAMERA_SETUP: 'camera_setup',
  CALIBRATION: 'calibration',
  CALIBRATING: 'calibration',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over'
};

export class GameEngine {
  constructor(canvas, audioManager, settingsManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.audio = audioManager;
    this.settings = settingsManager;

    this.player = new PlayerBall();
    this.physics = new PhysicsEngine();
    this.obstacles = new ObstacleManager();
    this.collectibles = new CollectibleManager();
    this.scoring = new ScoringSystem();
    this.vfx = new ParticlePool(500);

    this.state = GAME_STATES.MENU;

    // Camera & Projection
    this.cameraX = 0;
    this.cameraY = 160;
    this.cameraDist = 320;
    this.fov = 420;

    // Visual Effects
    this.cameraShake = 0;
    this.hitstopTimer = 0;
    this.screenFlash = null; // 'red', 'gold', 'cyan'
    this.flashTimer = 0;
    this.levelUpBannerTimer = 0;
    this.levelUpBannerText = '';

    // Countdown State
    this.countdownTimer = 0;
    this.countdownStep = 3;
    this.countdownText = '3';

    // Timing
    this.lastFrameTime = performance.now();
    this.animationFrameId = null;

    // Inputs (Head + Keyboard fallback)
    this.activeInputs = {
      steering: 0,
      pitch: 0,
      roll: 0,
      isMouthOpen: false,
      isBrowRaised: false,
      isSmiling: false,
      keyboardLeft: false,
      keyboardRight: false,
      keyboardJump: false,
      keyboardBoost: false
    };

    // Special Ability Cooldown State
    this.specialAbilityCooldown = 0;
    this.specialAbilityMaxCooldown = 7.5;
    this.isSuspendedTrackingLoss = false;

    // Callback hooks for UI
    this.onGameOverCallback = null;
    this.onScoreUpdateCallback = null;
    this.onComboCalloutCallback = null;
    this.onTrackingSuspendedCallback = null;

    // Distant cyber stars
    this._initStars();

    // Handle canvas sizing
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;

    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.horizonY = this.height * 0.44;
  }

  _initStars() {
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * 1600,
        y: Math.random() * 400,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.2
      });
    }
  }

  start() {
    this.lastFrameTime = performance.now();
    this.loop();
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  startNewGame(skipCountdown = false) {
    this.player.reset();
    this.obstacles.reset();
    this.collectibles.reset();
    this.scoring.reset();
    this.vfx.reset();
    this.cameraShake = 0;
    this.hitstopTimer = 0;
    this.levelUpBannerTimer = 0;
    this.specialAbilityCooldown = 0;
    this.isSuspendedTrackingLoss = false;
    this.activeInputs.steering = 0;

    if (skipCountdown) {
      this.state = GAME_STATES.PLAYING;
      this.audio.startBgm();
    } else {
      this.state = GAME_STATES.COUNTDOWN;
      this.countdownTimer = 3.6;
      this.countdownStep = 3;
      this.countdownText = '3';
      this.audio.playCountdownBeep(false);
    }
  }

  pause() {
    if (this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.COUNTDOWN) {
      this.state = GAME_STATES.PAUSED;
      this.audio.updateRollingHum(0, false);
    }
  }

  resume(withCountdown = true) {
    if (this.state === GAME_STATES.PAUSED) {
      this.isSuspendedTrackingLoss = false;
      if (withCountdown) {
        this.state = GAME_STATES.COUNTDOWN;
        this.countdownTimer = 3.2;
        this.countdownStep = 3;
        this.countdownText = '3';
        this.audio.playCountdownBeep(false);
      } else {
        this.state = GAME_STATES.PLAYING;
        this.audio.startBgm();
      }
      this.lastFrameTime = performance.now();
    }
  }

  // =========================================================================
  // CLEAN GAME ENGINE COMMAND APIS (Decoupled from webcam and vision code)
  // =========================================================================

  moveLeft(intensity = 1.0) {
    this.activeInputs.steering = -Math.abs(Math.min(1.0, Math.max(0.1, intensity)));
  }

  moveRight(intensity = 1.0) {
    this.activeInputs.steering = Math.abs(Math.min(1.0, Math.max(0.1, intensity)));
  }

  neutral() {
    this.activeInputs.steering = 0;
  }

  setSteering(value) {
    this.activeInputs.steering = Math.max(-1.0, Math.min(1.0, value));
  }

  jump() {
    if (this.state !== GAME_STATES.PLAYING) return;
    if (this.player.isGrounded && !this.player.jumpCooldown && !this.player.isFalling) {
      this.player.vy = this.physics.jumpVelocity;
      this.player.isGrounded = false;
      this.player.jumpCooldown = true;
      this.player.justJumped = true;
      this.audio.playJump();

      // Thruster boost spark ring
      this.vfx.burst(this.player.x, this.player.y + 4, this.player.z - 8, 12, {
        color: this.player.isBoosting ? '#ff007f' : '#00f3ff',
        speed: 90,
        vy: -40
      });

      setTimeout(() => {
        this.player.jumpCooldown = false;
      }, 360);
    }
  }

  specialAbility() {
    if (this.state !== GAME_STATES.PLAYING) return false;
    if (this.specialAbilityCooldown > 0) return false;

    this.specialAbilityCooldown = this.specialAbilityMaxCooldown;
    this.player.activateShield(5.0);

    const clearedCount = this.obstacles.clearInFront(this.player.z, 750);
    const bonus = 250 + (clearedCount * 150);
    this.scoring.score += bonus;

    this.triggerShake(18);
    this.triggerFlash('cyan', 0.35);
    this.audio.playSpecialAbility();

    // Shockwave VFX ring + particle blast
    this.vfx.spawnLandingShockwave(this.player.x, this.player.z, 220, '#00f3ff');
    this.vfx.burst(this.player.x, 25, this.player.z + 100, 32, {
      color: '#00f3ff',
      speed: 260
    });
    this.vfx.spawnFloatingText(this.player.x, 50, this.player.z, `EMP +${bonus}!`, '#00f3ff');

    if (this.onComboCalloutCallback) {
      this.onComboCalloutCallback(
        clearedCount > 0 ? `EMP SHOCKWAVE: +${bonus} PTS!` : 'QUANTUM SHIELD ACTIVATED!'
      );
    }
    return true;
  }

  suspendDueToTrackingLoss() {
    if (this.state === GAME_STATES.PLAYING) {
      this.isSuspendedTrackingLoss = true;
      this.state = GAME_STATES.PAUSED;
      this.audio.updateRollingHum(0, false);
      this.audio.playTrackingAlert();
      if (this.onTrackingSuspendedCallback) {
        this.onTrackingSuspendedCallback(true);
      }
    }
  }

  resumeFromTrackingLoss() {
    if (this.isSuspendedTrackingLoss && this.state === GAME_STATES.PAUSED) {
      this.isSuspendedTrackingLoss = false;
      this.state = GAME_STATES.PLAYING;
      this.lastFrameTime = performance.now();
      if (this.onTrackingSuspendedCallback) {
        this.onTrackingSuspendedCallback(false);
      }
    }
  }

  setInput(inputs) {
    this.activeInputs = { ...this.activeInputs, ...inputs };
  }

  triggerFlash(color, duration = 0.2) {
    this.screenFlash = color;
    this.flashTimer = duration;
  }

  triggerShake(intensity = 16) {
    this.cameraShake = intensity;
  }

  project(worldX, worldY, worldZ) {
    const relX = worldX - this.cameraX;
    const relY = worldY - this.cameraY;
    const relZ = worldZ - (this.player.z - this.cameraDist);

    if (relZ <= 25) return null;

    const scale = this.fov / relZ;
    const screenX = (this.width / 2) + (relX * scale);
    const screenY = this.horizonY - (relY * scale);

    return {
      x: screenX,
      y: screenY,
      scale,
      depth: relZ
    };
  }

  loop(currentTime = performance.now()) {
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));

    const rawDt = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;
    const dt = Math.min(rawDt, 0.05);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    if (this.state === GAME_STATES.COUNTDOWN) {
      this._updateCountdown(dt);
    } else if (this.state === GAME_STATES.PLAYING) {
      this.update(dt);
    }

    this.render();
  }

  _updateCountdown(dt) {
    this.countdownTimer -= dt;

    if (this.countdownTimer > 2.4) {
      if (this.countdownStep !== 3) {
        this.countdownStep = 3;
        this.countdownText = '3';
        this.audio.playCountdownBeep(false);
      }
    } else if (this.countdownTimer > 1.2) {
      if (this.countdownStep !== 2) {
        this.countdownStep = 2;
        this.countdownText = '2';
        this.audio.playCountdownBeep(false);
      }
    } else if (this.countdownTimer > 0.4) {
      if (this.countdownStep !== 1) {
        this.countdownStep = 1;
        this.countdownText = '1';
        this.audio.playCountdownBeep(false);
      }
    } else if (this.countdownTimer > -0.2) {
      if (this.countdownStep !== 0) {
        this.countdownStep = 0;
        this.countdownText = 'GO!';
        this.audio.playCountdownBeep(true);
        this.audio.startBgm();
      }
    } else {
      this.state = GAME_STATES.PLAYING;
    }

    // Ball revs gently in place
    this.player.rotationX = (this.player.rotationX + 12 * dt) % (Math.PI * 2);
    this.player.update(dt);
    this.vfx.update(dt);
  }

  update(dt) {
    // 0. Query current platform segment under player
    const platform = this.obstacles.getPlatformAt(this.player.x, this.player.z, this.obstacles.globalTime);

    // 1. Update Physics & Ball position
    this.physics.update(this.player, this.activeInputs, dt, platform);

    if (this.player.justJumped) {
      this.audio.playJump();
    }
    if (this.player.justLanded) {
      this.audio.playLandingThump();
      this.triggerShake(4);
      this.vfx.spawnLandingShockwave(this.player.x, this.player.z, 75, '#00f3ff');
    }
    if (this.player.isBoosting && !this.wasBoosting) {
      this.audio.playBoostStart();
      this.triggerShake(5);
    }
    this.wasBoosting = this.player.isBoosting;

    // Continuous rolling trail particles
    if (!this.player.isFalling && this.player.isGrounded) {
      const trailRate = this.player.isBoosting ? 2 : 1;
      for (let i = 0; i < trailRate; i++) {
        this.vfx.spawn(
          this.player.x + (Math.random() - 0.5) * 14,
          2,
          this.player.z - 16,
          {
            vx: (Math.random() - 0.5) * 25,
            vy: Math.random() * 20 + 8,
            vz: -30,
            size: this.player.isBoosting ? 4.5 : 2.8,
            color: this.player.isBoosting ? '#ff007f' : '#00f3ff',
            decay: 2.5,
            type: 'dust'
          }
        );
      }
    }

    // Check Falling Void Death
    if (this.player.isFalling) {
      if (this.player.fallTimer < 0.05) {
        this.audio.playVoidFall();
        this.triggerShake(14);
        this.triggerFlash('red', 0.25);
      }

      // Once fallen deep below the platform
      if (this.player.y < -350) {
        this.audio.stopBgm();
        this.audio.updateRollingHum(0, false);
        this.state = GAME_STATES.GAME_OVER;

        const runRecord = this.scoring.finalizeRun();
        if (this.scoring.isNewHighScore) {
          this.audio.playVictory();
          this.vfx.spawnCelebrationConfetti(this.player.x, 100, this.player.z, 60);
        } else {
          this.audio.playGameOver();
        }

        if (this.onGameOverCallback) {
          this.onGameOverCallback({ ...runRecord, cause: 'FELL INTO THE CYBER VOID' });
        }
        return;
      }
    }

    // 2. Camera Tracking
    const targetCamX = this.player.x * 0.35;
    this.cameraX += (targetCamX - this.cameraX) * Math.min(1, 8.0 * dt);
    
    // Jump / Fall camera tilt
    const targetCamY = 160 + (this.player.y * 0.25);
    this.cameraY += (targetCamY - this.cameraY) * Math.min(1, 6.0 * dt);

    // 3. Update Entities & VFX
    this.player.update(dt);
    this.vfx.update(dt);
    this.obstacles.update(this.player.z, dt);
    this.collectibles.update(this.player.z, dt);
    const scoreState = this.scoring.update(this.player.z, dt);

    // Level-up banner countdown
    if (this.levelUpBannerTimer > 0) {
      this.levelUpBannerTimer -= dt;
    }

    if (scoreState && scoreState.didLevelUp) {
      this.triggerFlash('gold', 0.3);
      this.triggerShake(8);
      this.audio.playPowerUp();
      this.levelUpBannerTimer = 2.4;
      this.levelUpBannerText = `ZONE ${scoreState.level} REACHED!`;
      this.vfx.spawnCelebrationConfetti(this.player.x, 80, this.player.z + 120, 40);

      if (this.onComboCalloutCallback) {
        this.onComboCalloutCallback(`ZONE ${scoreState.level} REACHED!`);
      }
    }

    // 4. Collision Detection - Collectibles
    const pickedItems = CollisionDetector.checkCollectibles(this.player, this.collectibles.items);
    for (let item of pickedItems) {
      this.collectibles.collect(item);

      // Explosive pickup burst & 3D floating score popup
      this.vfx.burst(item.x, item.currentY, item.z, 16, { color: item.color, speed: 170 });
      this.vfx.spawnFloatingText(item.x, item.currentY, item.z, `+${item.value}`, item.color);

      if (item.type === COLLECTIBLE_TYPES.COIN || item.type === COLLECTIBLE_TYPES.ORB) {
        this.scoring.addCoin(item.value);
        this.audio.playCoinPickup(this.scoring.combo);
      } else if (item.type === COLLECTIBLE_TYPES.GEM) {
        this.scoring.addCoin(item.value);
        this.audio.playGemPickup();
        this.triggerFlash('cyan', 0.15);
        if (this.onComboCalloutCallback) {
          this.onComboCalloutCallback(`CYBER GEM! +${item.value}`);
        }
      } else if (item.type === COLLECTIBLE_TYPES.RARE_BONUS) {
        this.scoring.addCoin(item.value);
        this.audio.playRarePickup();
        this.triggerFlash('gold', 0.35);
        this.triggerShake(10);
        this.vfx.spawnCelebrationConfetti(item.x, item.currentY + 20, item.z, 35);
        if (this.onComboCalloutCallback) {
          this.onComboCalloutCallback(`QUANTUM STAR! +${item.value} PTS!`);
        }
      } else if (item.type === COLLECTIBLE_TYPES.BOOST) {
        this.player.boostEnergy = Math.min(100, this.player.boostEnergy + 45);
        this.scoring.addCoin(item.value);
        this.audio.playBoostStart();
        this.triggerFlash('gold', 0.15);
      } else if (item.type === COLLECTIBLE_TYPES.SHIELD) {
        this.player.activateShield(8.0);
        this.scoring.addCoin(item.value);
        this.audio.playShieldPickup();
        this.triggerFlash('cyan', 0.2);
      } else if (item.type === COLLECTIBLE_TYPES.MULTIPLIER) {
        this.scoring.addMultiplierBoost();
        this.audio.playPowerUp();
        this.triggerFlash('gold', 0.25);
        if (this.onComboCalloutCallback) {
          this.onComboCalloutCallback(`${item.multiplierVal || 2}X COMBO MULTIPLIER!`);
        }
      }
    }

    // 5. Collision Detection - Obstacles
    const obsHitResult = CollisionDetector.checkObstacles(this.player, this.obstacles.obstacles);
    
    if (obsHitResult.isJumpedOver) {
      this.scoring.addJumpClear();
      this.audio.playNearMiss();
      this.vfx.spawnFloatingText(this.player.x, 50, this.player.z, 'AIR CLEAR +350', '#00f3ff');
      if (this.onComboCalloutCallback) {
        this.onComboCalloutCallback('AIR CLEAR! +350');
      }
    } else if (obsHitResult.nearMiss) {
      this.scoring.addNearMiss();
      this.audio.playNearMiss();
      this.vfx.spawnFloatingText(this.player.x, 35, this.player.z, 'NEAR MISS +250', '#ffb703');
      if (this.onComboCalloutCallback) {
        this.onComboCalloutCallback('NEAR MISS! +250');
      }
    } else if (obsHitResult.hasHit) {
      if (this.player.hasShield) {
        this.player.hasShield = false;
        this.player.shieldTimer = 0;
        this.player.invulnerableTimer = 1.8;
        this.audio.playShieldHit();
        this.triggerShake(14);
        this.triggerFlash('cyan', 0.25);
        this.vfx.burst(this.player.x, 25, this.player.z, 20, { color: '#38bdf8', speed: 220 });
        if (obsHitResult.obstacle) {
          obsHitResult.obstacle.z = this.player.z - 500;
        }
      } else if (this.player.invulnerableTimer <= 0) {
        const remainingLives = this.scoring.loseLife();
        this.vfx.burst(this.player.x, 25, this.player.z, 24, { color: '#ff0055', speed: 240 });
        
        if (remainingLives > 0) {
          this.hitstopTimer = 0.05;
          this.triggerShake(16);
          this.triggerFlash('red', 0.3);
          this.audio.playCrash();
          this.player.invulnerableTimer = 2.4;
          if (obsHitResult.obstacle) {
            obsHitResult.obstacle.z = this.player.z - 500;
          }
          if (this.onComboCalloutCallback) {
            this.onComboCalloutCallback(`CORE DAMAGED! ${remainingLives} REMAINING`);
          }
        } else {
          this.hitstopTimer = 0.08;
          this.triggerShake(24);
          this.triggerFlash('red', 0.45);
          this.audio.stopBgm();
          this.audio.updateRollingHum(0, false);
          this.state = GAME_STATES.GAME_OVER;

          const runRecord = this.scoring.finalizeRun();
          if (this.scoring.isNewHighScore) {
            this.audio.playVictory();
            this.vfx.spawnCelebrationConfetti(this.player.x, 100, this.player.z, 60);
          } else {
            this.audio.playGameOver();
          }

          if (this.onGameOverCallback) {
            this.onGameOverCallback({ ...runRecord, cause: 'COLLISION IMPACT' });
          }
        }
      }
    }

    // 6. Sound Hum update
    const speedRatio = this.player.vz / this.physics.maxSpeed;
    this.audio.updateRollingHum(speedRatio, this.player.isGrounded && !this.player.isFalling);

    // 7. Special Ability cooldown tick & Decay effects
    if (this.specialAbilityCooldown > 0) {
      this.specialAbilityCooldown = Math.max(0, this.specialAbilityCooldown - dt);
    }
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - 35 * dt);
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.screenFlash = null;
    }

    // 8. Notify UI
    if (this.onScoreUpdateCallback) {
      this.onScoreUpdateCallback({
        score: this.scoring.score,
        distance: this.scoring.distance,
        coins: this.scoring.coins,
        lives: this.scoring.lives,
        maxLives: this.scoring.maxLives,
        level: this.scoring.level,
        levelProgress: this.scoring.levelProgress,
        combo: this.scoring.combo,
        multiplier: this.scoring.multiplier,
        speed: Math.round(this.player.vz),
        boostEnergy: Math.round(this.player.boostEnergy),
        isBoosting: this.player.isBoosting,
        hasShield: this.player.hasShield,
        specialCooldown: this.specialAbilityCooldown,
        specialMaxCooldown: this.specialAbilityMaxCooldown,
        specialReady: this.specialAbilityCooldown <= 0
      });
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();

    // Camera Shake Offset
    if (this.cameraShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.cameraShake;
      const shakeY = (Math.random() - 0.5) * this.cameraShake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Sky & Cyber Nebula Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.horizonY);
    bgGrad.addColorStop(0, '#04060f');
    bgGrad.addColorStop(0.7, '#08102b');
    bgGrad.addColorStop(1, '#0e1f4d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, this.horizonY);

    // Distant Stars
    ctx.fillStyle = '#ffffff';
    for (let star of this.stars) {
      ctx.globalAlpha = star.alpha;
      const sx = (w / 2) + star.x - (this.cameraX * 0.1);
      const sy = star.y;
      if (sx >= 0 && sx <= w && sy >= 0 && sy <= this.horizonY) {
        ctx.beginPath();
        ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;

    // Horizon Neon Glow Line
    const horizonGrad = ctx.createLinearGradient(0, this.horizonY - 20, 0, this.horizonY + 20);
    horizonGrad.addColorStop(0, 'rgba(0, 243, 255, 0)');
    horizonGrad.addColorStop(0.5, 'rgba(0, 243, 255, 0.45)');
    horizonGrad.addColorStop(1, 'rgba(0, 102, 255, 0)');
    ctx.fillStyle = horizonGrad;
    ctx.fillRect(0, this.horizonY - 20, w, 40);

    // 2. Cyber Abyss Floor (Below Horizon)
    const floorGrad = ctx.createLinearGradient(0, this.horizonY, 0, h);
    floorGrad.addColorStop(0, '#050a1b');
    floorGrad.addColorStop(1, '#02040a');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, this.horizonY, w, h - this.horizonY);

    // 3. Futuristic Runway Surface (3D Projected Multi-Segment Platforms)
    this._renderRunway(ctx);

    // Project method bound for entities
    const projectFn = (x, y, z) => this.project(x, y, z);

    // 4. Render Collectibles & Obstacles
    this.collectibles.render(ctx, projectFn);
    this.obstacles.render(ctx, projectFn);

    // 5. Render Object-Pooled VFX (shockwaves, dust, sparkles, floating text, confetti)
    this.vfx.render(ctx, projectFn);

    // 6. Render Player Ball
    this.player.render(ctx, projectFn);

    // 7. Level-Up Banner Overlay (if active)
    if (this.levelUpBannerTimer > 0) {
      this._renderLevelUpBanner(ctx, w, h);
    }

    // 8. Countdown Overlay (3, 2, 1, GO!)
    if (this.state === GAME_STATES.COUNTDOWN) {
      this._renderCountdown(ctx, w, h);
    }

    // 9. Screen Impact Flash (Red / Gold / Cyan)
    if (this.screenFlash && this.flashTimer > 0) {
      ctx.save();
      const alpha = Math.min(0.5, this.flashTimer * 2.5);
      if (this.screenFlash === 'red') {
        ctx.fillStyle = `rgba(255, 0, 70, ${alpha})`;
      } else if (this.screenFlash === 'gold') {
        ctx.fillStyle = `rgba(255, 183, 3, ${alpha})`;
      } else {
        ctx.fillStyle = `rgba(0, 243, 255, ${alpha})`;
      }
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    ctx.restore();
  }

  _renderLevelUpBanner(ctx, w, h) {
    ctx.save();
    const cx = w / 2;
    const cy = h * 0.28;
    const alpha = Math.min(1.0, this.levelUpBannerTimer * 1.5);
    ctx.globalAlpha = alpha;

    // Glowing futuristic pill banner
    const bw = Math.min(480, w * 0.85);
    const bh = 56;

    ctx.fillStyle = 'rgba(8, 16, 45, 0.85)';
    ctx.strokeStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 28);
    ctx.fill();
    ctx.stroke();

    ctx.font = '900 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 12;
    ctx.fillText(`⚡ ${this.levelUpBannerText} ⚡`, cx, cy);

    ctx.restore();
  }

  _renderCountdown(ctx, w, h) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = w / 2;
    const cy = h * 0.42;

    const progressInStep = (this.countdownTimer % 1.2) / 1.2;
    const scale = 1.0 + (1 - progressInStep) * 0.35;
    const alpha = Math.min(1.0, progressInStep * 2.2);

    ctx.globalAlpha = alpha;
    ctx.font = `900 ${Math.round(84 * scale)}px sans-serif`;

    const isGo = this.countdownText === 'GO!';
    const glowColor = isGo ? '#00f3ff' : '#ffb703';

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 35;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.countdownText, cx, cy);

    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 3;
    ctx.strokeText(this.countdownText, cx, cy);

    ctx.restore();
  }

  _renderRunway(ctx) {
    const nearZ = this.player.z - this.cameraDist + 35;
    const farZ = this.player.z + 3400;

    ctx.save();

    for (let segment of this.obstacles.trackSegments) {
      if (segment.zEnd < nearZ || segment.zStart > farZ) continue;

      const segNearZ = Math.max(nearZ, segment.zStart);
      const segFarZ = Math.min(farZ, segment.zEnd);

      if (segment.type === PLATFORM_TYPES.GAP) {
        const gapEdge = this.project(0, 0, segment.zStart);
        if (gapEdge && gapEdge.scale > 0) {
          const w = 480 * gapEdge.scale;
          ctx.strokeStyle = '#ff0055';
          ctx.shadowColor = '#ff0055';
          ctx.shadowBlur = 18;
          ctx.lineWidth = 4 * gapEdge.scale;

          ctx.beginPath();
          ctx.moveTo(gapEdge.x - w / 2, gapEdge.y);
          ctx.lineTo(gapEdge.x + w / 2, gapEdge.y);
          ctx.stroke();

          ctx.fillStyle = '#ff0055';
          ctx.font = `bold ${Math.round(13 * gapEdge.scale)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('⚠️ CHASM GAP - JUMP! ⚠️', gapEdge.x, gapEdge.y - 12 * gapEdge.scale);
        }
        continue;
      }

      let offset = segment.xOffset;
      if (segment.type === PLATFORM_TYPES.MOVING) {
        offset += Math.sin(this.obstacles.globalTime * 2.2 + segment.id) * 160;
      }

      const halfW = segment.width / 2;
      const pNearLeft = this.project(offset - halfW, 0, segNearZ);
      const pNearRight = this.project(offset + halfW, 0, segNearZ);
      const pFarLeft = this.project(offset - halfW, 0, segFarZ);
      const pFarRight = this.project(offset + halfW, 0, segFarZ);

      if (!pNearLeft || !pNearRight || !pFarLeft || !pFarRight) continue;

      const trackGrad = ctx.createLinearGradient(0, pFarLeft.y, 0, pNearLeft.y);
      if (segment.type === PLATFORM_TYPES.NARROW) {
        trackGrad.addColorStop(0, 'rgba(25, 10, 48, 0.45)');
        trackGrad.addColorStop(1, 'rgba(40, 15, 75, 0.9)');
      } else if (segment.type === PLATFORM_TYPES.MOVING) {
        trackGrad.addColorStop(0, 'rgba(8, 28, 55, 0.45)');
        trackGrad.addColorStop(1, 'rgba(12, 45, 90, 0.9)');
      } else {
        trackGrad.addColorStop(0, 'rgba(10, 22, 56, 0.4)');
        trackGrad.addColorStop(1, 'rgba(14, 30, 80, 0.85)');
      }

      ctx.fillStyle = trackGrad;
      ctx.beginPath();
      ctx.moveTo(pFarLeft.x, pFarLeft.y);
      ctx.lineTo(pFarRight.x, pFarRight.y);
      ctx.lineTo(pNearRight.x, pNearRight.y);
      ctx.lineTo(pNearLeft.x, pNearLeft.y);
      ctx.closePath();
      ctx.fill();

      const edgeColor = segment.type === PLATFORM_TYPES.NARROW ? '#ec4899' : 
                        (segment.type === PLATFORM_TYPES.MOVING ? '#facc15' : '#00f3ff');
      
      ctx.strokeStyle = edgeColor;
      ctx.shadowColor = edgeColor;
      ctx.shadowBlur = 12;
      ctx.lineWidth = segment.type === PLATFORM_TYPES.STANDARD ? 3 : 4;

      ctx.beginPath();
      ctx.moveTo(pFarLeft.x, pFarLeft.y);
      ctx.lineTo(pNearLeft.x, pNearLeft.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pFarRight.x, pFarRight.y);
      ctx.lineTo(pNearRight.x, pNearRight.y);
      ctx.stroke();

      const gridSpacing = 160;
      const baseGridZ = Math.floor(segNearZ / gridSpacing) * gridSpacing;

      ctx.lineWidth = 1.4;
      for (let z = baseGridZ; z <= segFarZ; z += gridSpacing) {
        if (z < segNearZ) continue;
        const gl = this.project(offset - halfW, 0, z);
        const gr = this.project(offset + halfW, 0, z);
        if (gl && gr) {
          const distFade = Math.max(0, 1 - (z - nearZ) / 2400);
          ctx.strokeStyle = `rgba(0, 243, 255, ${distFade * 0.35})`;
          ctx.beginPath();
          ctx.moveTo(gl.x, gl.y);
          ctx.lineTo(gr.x, gr.y);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }
}
