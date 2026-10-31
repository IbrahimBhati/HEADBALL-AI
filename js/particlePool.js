/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Object-Pooled VFX & Particle Engine
 * High-performance, zero-allocation particle system for arcade visual effects:
 * - Rolling cyber trails
 * - Jump thruster sparks
 * - Landing dust clouds & shockwave rings
 * - Collectible explosion bursts & floating score text
 * - High-score celebratory confetti
 * - Level-up cosmic fireworks
 */

export class ParticlePool {
  constructor(maxParticles = 500) {
    this.maxParticles = maxParticles;
    this.pool = [];
    this.activeCount = 0;

    // Pre-allocate pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push({
        inUse: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        size: 2,
        initialSize: 2,
        color: '#00f3ff',
        alpha: 1.0,
        decay: 2.0,
        type: 'spark', // 'spark' | 'dust' | 'ring' | 'text' | 'confetti'
        text: '',
        rotation: 0,
        rotSpeed: 0,
        radius: 0,
        maxRadius: 0
      });
    }
  }

  reset() {
    for (let p of this.pool) {
      p.inUse = false;
    }
    this.activeCount = 0;
  }

  _acquire() {
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.pool[i].inUse) {
        this.pool[i].inUse = true;
        this.activeCount++;
        return this.pool[i];
      }
    }
    // Pool exhausted: overwrite oldest particle
    return this.pool[Math.floor(Math.random() * this.maxParticles)];
  }

  /**
   * Spawn a single particle
   */
  spawn(x, y, z, config = {}) {
    const p = this._acquire();
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = config.vx || 0;
    p.vy = config.vy || 0;
    p.vz = config.vz || 0;
    p.size = config.size || 3;
    p.initialSize = p.size;
    p.color = config.color || '#00f3ff';
    p.alpha = config.alpha !== undefined ? config.alpha : 1.0;
    p.decay = config.decay || 2.0;
    p.type = config.type || 'spark';
    p.text = config.text || '';
    p.rotation = Math.random() * Math.PI * 2;
    p.rotSpeed = (Math.random() - 0.5) * 8;
    p.radius = config.radius || 0;
    p.maxRadius = config.maxRadius || 0;
    return p;
  }

  /**
   * Explode particles radially (e.g. for coin collection, gem pickup, or shield hit)
   */
  burst(x, y, z, count = 16, config = {}) {
    const baseColor = config.color || '#00f3ff';
    const speed = config.speed || 140;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const elevation = (Math.random() - 0.5) * Math.PI * 0.5;
      const vel = speed * (0.6 + Math.random() * 0.8);

      this.spawn(x, y, z, {
        vx: Math.cos(angle) * Math.cos(elevation) * vel,
        vy: Math.sin(elevation) * vel + (config.gravityOffset || 30),
        vz: Math.sin(angle) * Math.cos(elevation) * (vel * 0.5),
        size: (config.size || 3.5) * (0.7 + Math.random() * 0.6),
        color: baseColor,
        alpha: 1.0,
        decay: config.decay || (1.8 + Math.random() * 1.4),
        type: config.type || 'spark'
      });
    }
  }

  /**
   * Spawn 3D floating score/combo popup text
   */
  spawnFloatingText(x, y, z, text, color = '#00f3ff') {
    this.spawn(x, y + 15, z, {
      vx: (Math.random() - 0.5) * 20,
      vy: 85,
      vz: 0,
      size: 16,
      color,
      alpha: 1.0,
      decay: 1.2,
      type: 'text',
      text
    });
  }

  /**
   * Spawn landing shockwave ring on track surface
   */
  spawnLandingShockwave(x, z, radius = 70, color = '#00f3ff') {
    this.spawn(x, 0, z, {
      type: 'ring',
      radius: 8,
      maxRadius: radius,
      color,
      alpha: 0.9,
      decay: 3.2
    });

    // Accompanying landing dust kick
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const s = Math.random() * 90 + 40;
      this.spawn(x, 2, z, {
        vx: Math.cos(a) * s,
        vy: Math.random() * 25 + 10,
        vz: Math.sin(a) * s * 0.5,
        size: Math.random() * 4 + 2,
        color: '#7df9ff',
        alpha: 0.85,
        decay: 2.2,
        type: 'dust'
      });
    }
  }

  /**
   * Spawn high-score celebration confetti
   */
  spawnCelebrationConfetti(x, y, z, count = 45) {
    const colors = ['#00f3ff', '#ff007f', '#ffb703', '#10b981', '#a855f7', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 180 + 90;
      this.spawn(x, y, z, {
        vx: Math.cos(angle) * speed,
        vy: Math.random() * 160 + 120,
        vz: (Math.random() - 0.5) * 120,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: 0.8 + Math.random() * 0.6,
        type: 'confetti'
      });
    }
  }

  update(dt) {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.pool[i];
      if (!p.inUse) continue;

      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        p.inUse = false;
        this.activeCount = Math.max(0, this.activeCount - 1);
        continue;
      }

      if (p.type === 'ring') {
        p.radius += (p.maxRadius - p.radius) * Math.min(1, 14 * dt);
        continue;
      }

      // Physics integration
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rotation += p.rotSpeed * dt;

      if (p.type === 'spark' || p.type === 'confetti' || p.type === 'dust') {
        p.vy -= 400 * dt; // Gravity
        p.vx *= Math.pow(0.92, dt * 60); // Friction
        p.vz *= Math.pow(0.92, dt * 60);
      } else if (p.type === 'text') {
        p.vy *= Math.pow(0.94, dt * 60);
      }
    }
  }

  render(ctx, project) {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.pool[i];
      if (!p.inUse) continue;

      if (p.type === 'ring') {
        const proj = project(p.x, 0, p.z);
        if (proj && proj.scale > 0) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
          ctx.strokeStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 14 * proj.scale;
          ctx.lineWidth = 2.5 * proj.scale;
          ctx.beginPath();
          ctx.ellipse(
            proj.x,
            proj.y,
            p.radius * 1.4 * proj.scale,
            p.radius * 0.45 * proj.scale,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          ctx.restore();
        }
        continue;
      }

      const proj = project(p.x, p.y, p.z);
      if (!proj || proj.scale <= 0) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

      if (p.type === 'text') {
        // Floating 3D Arcade Score/Combo Popup
        ctx.font = `900 ${Math.round(p.size * proj.scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12 * proj.scale;
        ctx.fillText(p.text, proj.x, proj.y);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.8 * proj.scale;
        ctx.strokeText(p.text, proj.x, proj.y);

      } else if (p.type === 'confetti') {
        // Fluttering festive ribbon rectangle
        const sz = p.size * proj.scale;
        ctx.translate(proj.x, proj.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4 * proj.scale;
        ctx.fillRect(-sz, -sz * 0.4, sz * 2, sz * 0.8);

      } else {
        // Glowing Circular Spark or Dust Particle
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = (p.type === 'dust' ? 3 : 8) * proj.scale;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, Math.max(1, p.size * proj.scale), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
