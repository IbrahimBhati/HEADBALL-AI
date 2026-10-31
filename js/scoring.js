/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Scoring Module
 * Tracks real-time points, coins, lives, level progression, combo streaks, and high score records.
 */

import { StorageManager } from './storage.js';

export const LEVEL_THRESHOLDS = [0, 400, 1000, 1800, 2800, 4000, 5500, 7500];

export class ScoringSystem {
  constructor() {
    this.highScore = StorageManager.getHighScore();
    this.bestDistance = StorageManager.getBestDistance();
    this.reset();
  }

  reset() {
    this.score = 0;
    this.distance = 0;
    this.coins = 0;
    this.lives = 3;
    this.maxLives = 3;
    this.level = 1;
    this.levelProgress = 0;
    this.combo = 0;
    this.multiplier = 1;
    this.nearMissesCount = 0;
    this.jumpClearsCount = 0;
    this.isNewHighScore = false;
    this.isNewBestDistance = false;
    this.comboTimer = 0;
  }

  update(playerZ, dt) {
    this.distance = Math.floor(playerZ / 10);

    // Distance points increment
    this.score += Math.floor(playerZ * 0.05 * dt);

    // Calculate Level & Progress Bar
    let currentLvl = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      if (this.distance >= LEVEL_THRESHOLDS[i]) {
        currentLvl = i + 1;
      } else {
        break;
      }
    }

    const prevThreshold = LEVEL_THRESHOLDS[currentLvl - 1] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[currentLvl] || (prevThreshold + 1500);
    this.levelProgress = Math.min(1.0, Math.max(0, (this.distance - prevThreshold) / (nextThreshold - prevThreshold)));

    const didLevelUp = currentLvl > this.level;
    this.level = currentLvl;

    // Combo timer decay
    if (this.combo > 0) {
      this.comboTimer += dt;
      if (this.comboTimer > 4.5) {
        this.combo = Math.max(0, this.combo - 1);
        this.multiplier = Math.max(1, 1 + Math.floor(this.combo / 5));
        this.comboTimer = 0;
      }
    }

    return { didLevelUp, level: this.level, levelProgress: this.levelProgress };
  }

  addCoin(value = 100) {
    this.coins++;
    this.combo++;
    this.comboTimer = 0;
    this.multiplier = Math.min(8, 1 + Math.floor(this.combo / 5));
    
    const points = value * this.multiplier;
    this.score += points;
    return points;
  }

  loseLife() {
    this.lives = Math.max(0, this.lives - 1);
    this.breakCombo();
    return this.lives;
  }

  gainLife() {
    if (this.lives < this.maxLives) {
      this.lives++;
      return true;
    }
    return false;
  }

  addNearMiss() {
    this.nearMissesCount++;
    this.combo += 2;
    this.comboTimer = 0;
    this.multiplier = Math.min(8, 1 + Math.floor(this.combo / 5));

    const points = 250 * this.multiplier;
    this.score += points;
    return points;
  }

  addJumpClear() {
    this.jumpClearsCount++;
    this.combo += 2;
    this.comboTimer = 0;
    this.multiplier = Math.min(8, 1 + Math.floor(this.combo / 5));

    const points = 350 * this.multiplier;
    this.score += points;
    return points;
  }

  addMultiplierBoost() {
    this.multiplier = Math.min(8, this.multiplier * 2);
    this.score += 500 * this.multiplier;
  }

  breakCombo() {
    this.combo = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
  }

  finalizeRun() {
    this.isNewHighScore = StorageManager.setHighScore(this.score);
    this.isNewBestDistance = StorageManager.setBestDistance(this.distance);
    StorageManager.addOrbs(this.coins);

    const record = {
      score: this.score,
      distance: this.distance,
      coins: this.coins,
      combo: this.combo,
      level: this.level,
      nearMisses: this.nearMissesCount
    };

    StorageManager.addGameHistory(record);
    this.highScore = StorageManager.getHighScore();
    this.bestDistance = StorageManager.getBestDistance();

    return record;
  }
}
