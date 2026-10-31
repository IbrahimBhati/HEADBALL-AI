/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Settings Module
 * Manages configuration, sensitivities, audio levels, and preferences.
 */

import { StorageManager } from './storage.js';

export const DEFAULT_SETTINGS = {
  headSensitivity: 1.2,
  steeringSensitivity: 1.2, // Alias for backward compatibility
  jumpSensitivity: 1.0,
  specialSensitivity: 1.0,
  trackingSmoothing: 0.28,
  gestureControlsEnabled: true,
  pauseOnTrackingLoss: true,
  pitchSensitivity: 1.0,
  mouthBoostThreshold: 0.38,
  browJumpThreshold: 0.24,
  invertSteering: false,
  showCameraPip: true,
  keyboardFallback: true,
  masterVolume: 0.8,
  sfxVolume: 0.85,
  bgmVolume: 0.45,
  difficulty: 'normal' // 'easy', 'normal', 'hard'
};

export class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.listeners = [];
    this.load();
  }

  load() {
    const saved = StorageManager.getSettings();
    if (saved) {
      this.settings = { ...DEFAULT_SETTINGS, ...saved };
    }
  }

  save() {
    StorageManager.saveSettings(this.settings);
    this._notify();
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.save();
  }

  updateAll(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.save();
  }

  reset() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  _notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.settings);
      } catch (err) {
        console.error('Settings listener error:', err);
      }
    });
  }
}
