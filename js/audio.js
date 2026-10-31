/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Audio System
 * High-performance procedural Web Audio API synthesizer for futuristic arcade SFX & BGM.
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    
    this.bgmInterval = null;
    this.bgmNoteIndex = 0;
    this.isBgmPlaying = false;
    
    // Continuous sound nodes
    this.rollOsc = null;
    this.rollGain = null;
    this.boostNoiseNode = null;
    this.boostGain = null;

    this.settings = {
      masterVolume: 0.8,
      sfxVolume: 0.8,
      bgmVolume: 0.45
    };
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.settings.bgmVolume, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      this._initRollingHum();
    } catch (e) {
      console.warn('Web Audio API initialization failed:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolumes(master, sfx, bgm) {
    if (master !== undefined) this.settings.masterVolume = master;
    if (sfx !== undefined) this.settings.sfxVolume = sfx;
    if (bgm !== undefined) this.settings.bgmVolume = bgm;

    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.settings.masterVolume, now);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, now);
    }
    if (this.bgmGain) {
      this.bgmGain.gain.setValueAtTime(this.settings.bgmVolume, now);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.settings.masterVolume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  _initRollingHum() {
    if (!this.ctx) return;
    try {
      this.rollOsc = this.ctx.createOscillator();
      this.rollOsc.type = 'triangle';
      this.rollOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, this.ctx.currentTime);

      this.rollGain = this.ctx.createGain();
      this.rollGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.rollOsc.connect(filter);
      filter.connect(this.rollGain);
      this.rollGain.connect(this.sfxGain);
      this.rollOsc.start();
    } catch {
      // Ignored
    }
  }

  updateRollingHum(speedRatio, isGrounded) {
    if (!this.ctx || !this.rollGain || !this.rollOsc) return;
    const now = this.ctx.currentTime;
    if (!isGrounded || speedRatio <= 0.05) {
      this.rollGain.gain.setTargetAtTime(0, now, 0.05);
    } else {
      const targetGain = Math.min(0.2, speedRatio * 0.15);
      const targetFreq = 40 + speedRatio * 85;
      this.rollGain.gain.setTargetAtTime(targetGain, now, 0.05);
      this.rollOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
    }
  }

  playJump() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Upward pitch sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.22);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  playBoostStart() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.Q.setValueAtTime(3, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  playOrbPickup(combo = 1) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const baseFreq = 523.25; // C5
    const multiplier = 1 + Math.min(1.5, (combo - 1) * 0.12);
    
    const notes = [baseFreq * multiplier, baseFreq * 1.25 * multiplier, baseFreq * 1.5 * multiplier];
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.18, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.19);
    });
  }

  playShieldPickup() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.linearRampToValueAtTime(660, now + 0.15);
    osc.frequency.linearRampToValueAtTime(990, now + 0.3);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  playShieldHit() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  playCrash() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Noise buffer for impact crunch
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    // Deep sub bass boom
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 0.4);

    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);

    noise.start(now);
    sub.start(now);
    sub.stop(now + 0.42);
  }

  playNearMiss() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playClick() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.04);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playMenuHover() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.03);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  playPowerUp() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [329.63, 440, 554.37, 659.25, 880]; // E4, A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.2, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.29);
    });
  }

  playGameOver() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [392, 349.23, 293.66, 220, 164.81]; // Descending sad cyberpunk notes
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600 - idx * 80, now + idx * 0.12);

      gain.gain.setValueAtTime(0.18, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.36);
    });
  }

  playVictory() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Triumphant cyber fanfare (C5 -> E5 -> G5 -> C6 held)
    const fanfare = [
      { f: 523.25, d: 0.1, t: 0.0 },
      { f: 659.25, d: 0.1, t: 0.1 },
      { f: 783.99, d: 0.12, t: 0.2 },
      { f: 1046.50, d: 0.45, t: 0.32 }
    ];

    fanfare.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0.24, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + note.t);
      osc.stop(now + note.t + note.d + 0.02);
    });
  }

  playCollision() {
    this.playCrash();
  }

  playCoinPickup(combo = 1) {
    this.playOrbPickup(combo);
  }

  playSpecialAbility() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Dual FM synthesizer sweep for futuristic Quantum EMP shockwave
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const mainGain = this.ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(320, now);
    carrier.frequency.exponentialRampToValueAtTime(1280, now + 0.25);
    carrier.frequency.exponentialRampToValueAtTime(160, now + 0.7);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(60, now);
    modulator.frequency.linearRampToValueAtTime(240, now + 0.5);

    modGain.gain.setValueAtTime(200, now);
    modGain.gain.exponentialRampToValueAtTime(10, now + 0.6);

    mainGain.gain.setValueAtTime(0.4, now);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(3, now);

    carrier.connect(filter);
    filter.connect(mainGain);
    mainGain.connect(this.sfxGain);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + 0.75);
    carrier.stop(now + 0.75);
  }

  playCalibrationStep(stepNum = 1) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = 440 + (stepNum * 65);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playCountdownBeep(isGo = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isGo ? 'sawtooth' : 'sine';
    const freq = isGo ? 880 : 440;
    osc.frequency.setValueAtTime(freq, now);
    if (isGo) {
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.3);
    }

    gain.gain.setValueAtTime(isGo ? 0.35 : 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.45 : 0.2));

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + (isGo ? 0.46 : 0.21));
  }

  playLandingThump() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.14);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  playVoidFall() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.8);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.86);
  }

  playGemPickup() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const freqs = [659.25, 830.61, 1046.50, 1318.51]; // E5, G#5, C6, E6
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.18, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.21);
    });
  }

  playRarePickup() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Majestic cosmic chime arpeggio
    const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.2, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.36);
    });
  }

  playTrackingAlert() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(180, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  // Futuristic Background Synth Loop
  startBgm() {
    if (this.isBgmPlaying || !this.ctx) return;
    this.isBgmPlaying = true;
    
    // Cyberpunk synth arpeggio progression (A minor / F maj7 / C / G)
    const arpNotes = [
      220, 261.63, 329.63, 440, 523.25, 440, 329.63, 261.63,
      174.61, 220, 261.63, 349.23, 440, 349.23, 261.63, 220,
      130.81, 164.81, 196, 261.63, 329.63, 261.63, 196, 164.81,
      196, 246.94, 293.66, 392, 493.88, 392, 293.66, 246.94
    ];

    const bassNotes = [110, 87.31, 65.41, 98];

    const tempoStepMs = 135; // ~111 BPM 16th notes
    let step = 0;

    this.bgmInterval = setInterval(() => {
      if (!this.ctx || this.isMuted || !this.isBgmPlaying) return;
      const now = this.ctx.currentTime;
      
      // Arp Voice
      const noteFreq = arpNotes[step % arpNotes.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = (step % 4 === 0) ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(noteFreq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900 + Math.sin(step * 0.2) * 500, now);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(now);
      osc.stop(now + 0.13);

      // Bass Kick/Pulse on beat 1 and 3 of every measure
      if (step % 8 === 0) {
        const bassBar = Math.floor(step / 8) % bassNotes.length;
        const bassFreq = bassNotes[bassBar];
        
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        bassGain.gain.setValueAtTime(0.12, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        bassOsc.connect(bassGain);
        bassGain.connect(this.bgmGain);

        bassOsc.start(now);
        bassOsc.stop(now + 0.46);
      }

      step++;
    }, tempoStepMs);
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}
