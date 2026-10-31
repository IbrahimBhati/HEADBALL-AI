/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Player Ball Entity
 * Renders the high-tech rolling sphere with dynamic rotation, shield bubble, and particle trail.
 */

export class PlayerBall {
  constructor() {
    this.radius = 28;
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.rotationX = 0;
    this.rotationY = 0;
    this.isGrounded = true;
    this.isFalling = false;
    this.fallTimer = 0;
    this.isBoosting = false;
    this.boostEnergy = 100;
    this.hasShield = false;
    this.shieldTimer = 0;
    this.invulnerableTimer = 0;
    this.particles = [];
    this.landingRings = [];
  }

  activateShield(duration = 7.0) {
    this.hasShield = true;
    this.shieldTimer = Math.max(this.shieldTimer, duration);
  }

  triggerLanding() {
    this.landingRings.push({
      x: this.x,
      z: this.z,
      radius: 8,
      maxRadius: this.radius * 2.8,
      alpha: 0.9,
      decay: 3.5,
      color: '#00f3ff'
    });

    // Radial dust burst
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const speed = Math.random() * 80 + 40;
      this.particles.push({
        x: this.x,
        y: 2,
        z: this.z,
        vx: Math.cos(angle) * speed,
        vy: Math.random() * 20 + 8,
        size: Math.random() * 3 + 2,
        life: 0.6,
        decay: 2.2,
        color: '#7df9ff'
      });
    }
  }

  update(dt) {
    if (this.hasShield) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.hasShield = false;
      }
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    if (this.isFalling) {
      this.fallTimer += dt;
    }

    // Update landing shockwave rings
    for (let i = this.landingRings.length - 1; i >= 0; i--) {
      const ring = this.landingRings[i];
      ring.radius += (ring.maxRadius - ring.radius) * Math.min(1, 14 * dt);
      ring.alpha -= ring.decay * dt;
      if (ring.alpha <= 0) {
        this.landingRings.splice(i, 1);
      }
    }

    // Spawn trail particles (only if not plunging deep into void)
    if (!this.isFalling) {
      const spawnRate = this.isBoosting ? 3 : 1;
      for (let i = 0; i < spawnRate; i++) {
        this.particles.push({
          x: this.x + (Math.random() - 0.5) * 12,
          y: this.y + (Math.random() - 0.5) * 6,
          z: this.z - 15 - Math.random() * 20,
          vx: (Math.random() - 0.5) * 40 - this.vx * 0.1,
          vy: Math.random() * 30 + 10,
          size: this.isBoosting ? Math.random() * 6 + 4 : Math.random() * 3.5 + 2,
          life: 1.0,
          decay: Math.random() * 1.5 + 2.0,
          color: this.isBoosting ? '#ff007f' : '#00f3ff'
        });
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size *= Math.max(0, 1 - dt * 2);
      if (p.life <= 0 || p.size <= 0.5) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Render the player ball and its shadow, aura, shield, and particles
   */
  render(ctx, project) {
    // 0. Render landing shockwave rings on the runway
    for (let ring of this.landingRings) {
      const proj = project(ring.x, 0, ring.z);
      if (proj && proj.scale > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ring.alpha);
        ctx.strokeStyle = ring.color;
        ctx.shadowColor = ring.color;
        ctx.shadowBlur = 12 * proj.scale;
        ctx.lineWidth = 2.5 * proj.scale;
        ctx.beginPath();
        ctx.ellipse(
          proj.x,
          proj.y,
          ring.radius * 1.4 * proj.scale,
          ring.radius * 0.5 * proj.scale,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      }
    }

    // 1. Render trail particles behind the ball
    for (let p of this.particles) {
      const proj = project(p.x, p.y, p.z);
      if (proj && proj.scale > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 0.8));
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6 * proj.scale;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 2. Render Shadow on the runway track (y = 0) if not falling
    if (!this.isFalling && this.y >= -10) {
      const shadowProj = project(this.x, 0, this.z);
      if (shadowProj && shadowProj.scale > 0) {
        const altitudeRatio = Math.max(0, Math.min(1, this.y / 250));
        const shadowScale = (1 - altitudeRatio * 0.45) * shadowProj.scale;
        const shadowAlpha = (1 - altitudeRatio * 0.6) * 0.6;

        ctx.save();
        ctx.globalAlpha = shadowAlpha;
        ctx.fillStyle = '#010511';
        ctx.beginPath();
        ctx.ellipse(
          shadowProj.x,
          shadowProj.y,
          this.radius * 1.25 * shadowScale,
          this.radius * 0.45 * shadowScale,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }
    }

    // 3. Render Projected Player Sphere
    const ballProj = project(this.x, this.y + this.radius, this.z);
    if (!ballProj || ballProj.scale <= 0) return;

    // Flash or holographic flicker when invulnerable
    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 70) % 2 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
    } else {
      ctx.save();
    }

    const r = this.radius * ballProj.scale;
    const px = ballProj.x;
    const py = ballProj.y;

    ctx.save();

    // Outer glow
    const primaryGlow = this.isBoosting ? '#ff007f' : (this.hasShield ? '#38bdf8' : '#00f3ff');
    ctx.shadowColor = primaryGlow;
    ctx.shadowBlur = (this.isBoosting ? 28 : 16) * ballProj.scale;

    // Sphere 3D gradient fill
    const grad = ctx.createRadialGradient(
      px - r * 0.35,
      py - r * 0.35,
      r * 0.1,
      px,
      py,
      r
    );

    if (this.isBoosting) {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#ff007f');
      grad.addColorStop(0.7, '#99004d');
      grad.addColorStop(1, '#1a000d');
    } else {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, '#7df9ff');
      grad.addColorStop(0.65, '#0066ff');
      grad.addColorStop(1, '#051138');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();

    // 4. Rolling Wireframe Latitude & Longitude Bands (illustrates physical roll)
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, r - 1, 0, Math.PI * 2);
    ctx.clip(); // clip to ball interior

    ctx.lineWidth = Math.max(1, 2 * ballProj.scale);
    ctx.strokeStyle = this.isBoosting ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 243, 255, 0.65)';

    // Rolling equator bands that move with rotationX
    const numBands = 3;
    for (let i = 0; i < numBands; i++) {
      const angle = this.rotationX + (i * Math.PI / numBands);
      const bandOffset = Math.sin(angle) * r;
      const bandCompression = Math.cos(angle);

      if (bandCompression > 0) {
        ctx.beginPath();
        ctx.ellipse(
          px,
          py + bandOffset,
          r * Math.sqrt(Math.max(0, 1 - (bandOffset / r) ** 2)),
          Math.abs(bandCompression) * r * 0.35,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
    }

    // Vertical meridian band that swings with rotationY
    const meridianTilt = Math.sin(this.rotationY) * r * 0.7;
    ctx.beginPath();
    ctx.ellipse(px + meridianTilt, py, Math.abs(Math.cos(this.rotationY)) * r * 0.45, r * 0.95, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // 5. Shield Bubble (if active)
    if (this.hasShield) {
      const shieldR = r * 1.45;
      const shieldGlow = ctx.createRadialGradient(px, py, shieldR * 0.6, px, py, shieldR);
      shieldGlow.addColorStop(0, 'rgba(56, 189, 248, 0)');
      shieldGlow.addColorStop(0.8, 'rgba(56, 189, 248, 0.25)');
      shieldGlow.addColorStop(1, 'rgba(0, 243, 255, 0.7)');

      ctx.fillStyle = shieldGlow;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 * ballProj.scale;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 18;

      ctx.beginPath();
      ctx.arc(px, py, shieldR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}
