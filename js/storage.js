/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Storage Module
 * LocalStorage wrapper for high scores, user preferences, and calibration.
 */

const STORAGE_KEYS = {
  HIGH_SCORE: 'headball_high_score',
  BEST_DISTANCE: 'headball_best_distance',
  TOTAL_ORBS: 'headball_total_orbs',
  SETTINGS: 'headball_settings',
  CALIBRATION: 'headball_calibration',
  HISTORY: 'headball_history'
};

export class StorageManager {
  static getHighScore() {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  static setHighScore(score) {
    try {
      const current = this.getHighScore();
      if (score > current) {
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, score.toString());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  static getBestDistance() {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.BEST_DISTANCE);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  static setBestDistance(dist) {
    try {
      const current = this.getBestDistance();
      if (dist > current) {
        localStorage.setItem(STORAGE_KEYS.BEST_DISTANCE, Math.floor(dist).toString());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  static getTotalOrbs() {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.TOTAL_ORBS);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  static addOrbs(count) {
    try {
      const total = this.getTotalOrbs() + count;
      localStorage.setItem(STORAGE_KEYS.TOTAL_ORBS, total.toString());
      return total;
    } catch {
      return 0;
    }
  }

  static getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }

  static getCalibration() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CALIBRATION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static saveCalibration(calibData) {
    try {
      localStorage.setItem(STORAGE_KEYS.CALIBRATION, JSON.stringify(calibData));
      return true;
    } catch {
      return false;
    }
  }

  static addGameHistory(record) {
    try {
      const historyStr = localStorage.getItem(STORAGE_KEYS.HISTORY);
      const history = historyStr ? JSON.parse(historyStr) : [];
      history.unshift({
        ...record,
        timestamp: Date.now()
      });
      // Keep last 15 games
      const trimmed = history.slice(0, 15);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
      return trimmed;
    } catch {
      return [];
    }
  }

  static getGameHistory() {
    try {
      const historyStr = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return historyStr ? JSON.parse(historyStr) : [];
    } catch {
      return [];
    }
  }

  static clearProgress() {
    try {
      localStorage.removeItem(STORAGE_KEYS.HIGH_SCORE);
      localStorage.removeItem(STORAGE_KEYS.BEST_DISTANCE);
      localStorage.removeItem(STORAGE_KEYS.TOTAL_ORBS);
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
      return true;
    } catch {
      return false;
    }
  }
}
