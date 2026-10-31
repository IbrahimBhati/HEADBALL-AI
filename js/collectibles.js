/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Collectibles Module
 * Spawns glowing cyber orbs, boost canisters, shield matrices, and score multiplier prisms.
 */

export const COLLECTIBLE_TYPES = {
  COIN: 'coin',
  ORB: 'coin', // backwards compat
  GEM: 'gem',
  RARE_BONUS: 'rare_bonus',
  BOOST: 'boost',
  SHIELD: 'shield',
  MULTIPLIER: 'multiplier'
};

export class CollectibleManager {
  constructor() {
    this.items = [];
    this.trackWidth = 800;
    this.nextSpawnZ = 450;
    this.pickupParticles = [];
  }

  reset() {
    this.items = [];
    this.nextSpawnZ = 450;
    this.pickupParticles = [];
  }

  update(playerZ, dt) {
    // 1. Remove collected or passed items
    this.items = this.items.filter(item => !item.collected && item.z > playerZ - 300);

    // 2. Animate items (hover bobbing & rotation)
    for (let item of this.items) {
      item.animTime = (item.animTime || 0) + dt;
      item.currentY = item.baseY + Math.sin(item.animTime * 4.5) * 9;
    }

    // 3. Update pickup spark particles
    for (let i = this.pickupParticles.length - 1; i >= 0; i--) {
      const p = this.pickupParticles[i];
      p.life -= p.decay * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.life <= 0) {
        this.pickupParticles.splice(i, 1);
      }
    }

    // 4. Spawn ahead in patterns (lines, arcs, gem clusters, bonus rings)
    const spawnHorizon = playerZ + 3600;
    while (this.nextSpawnZ < spawnHorizon) {
      this._spawnPattern(this.nextSpawnZ);
      this.nextSpawnZ += 280 + Math.random() * 180;
    }
  }

  _spawnPattern(startZ) {
    const roll = Math.random();

    if (roll < 0.45) {
      // 1. Line or Arc of Cyber Coins (3 to 6 coins)
      const count = Math.floor(Math.random() * 4) + 3;
      const targetX = (Math.random() - 0.5) * (this.trackWidth - 260);
      const isJumpArc = Math.random() < 0.35; // Arc in the air rewarding an eyebrow jump!

      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const arcY = isJumpArc ? Math.sin(t * Math.PI) * 125 + 20 : 20;
        this.items.push({
          type: COLLECTIBLE_TYPES.COIN,
          x: targetX + (Math.random() - 0.5) * 30,
          baseY: arcY,
          currentY: arcY,
          z: startZ + i * 85,
          radius: 18,
          value: 100,
          color: '#00f3ff',
          collected: false,
          animTime: Math.random() * 5
        });
      }
    } else if (roll < 0.68) {
      // 2. High-value Cyber Gem (Ruby or Emerald)
      const isRuby = Math.random() > 0.5;
      const targetX = (Math.random() - 0.5) * (this.trackWidth - 280);
      this.items.push({
        type: COLLECTIBLE_TYPES.GEM,
        x: targetX,
        baseY: 28,
        currentY: 28,
        z: startZ,
        radius: 22,
        value: 350,
        color: isRuby ? '#ff0055' : '#10b981',
        collected: false,
        animTime: Math.random() * 3
      });
    } else if (roll < 0.80) {
      // 3. Turbo Speed Boost Canister
      const targetX = (Math.random() - 0.5) * (this.trackWidth - 240);
      this.items.push({
        type: COLLECTIBLE_TYPES.BOOST,
        x: targetX,
        baseY: 25,
        currentY: 25,
        z: startZ,
        radius: 22,
        value: 250,
        color: '#ffb703',
        collected: false,
        animTime: 0
      });
    } else if (roll < 0.90) {
      // 4. Shield Matrix Capsule
      const targetX = (Math.random() - 0.5) * (this.trackWidth - 260);
      this.items.push({
        type: COLLECTIBLE_TYPES.SHIELD,
        x: targetX,
        baseY: 30,
        currentY: 30,
        z: startZ,
        radius: 24,
        value: 500,
        color: '#38bdf8',
        collected: false,
        animTime: 0
      });
    } else if (roll < 0.96) {
      // 5. Multiplier Surge Token (2X or 3X)
      const targetX = (Math.random() - 0.5) * (this.trackWidth - 260);
      this.items.push({
        type: COLLECTIBLE_TYPES.MULTIPLIER,
        x: targetX,
        baseY: 34,
        currentY: 34,
        z: startZ,
        radius: 24,
        value: 750,
        color: '#a855f7',
        multiplierVal: Math.random() > 0.7 ? 3 : 2,
        collected: false,
        animTime: 0
      });
    } else {
      // 6. Rare Cosmic Quantum Bonus Object (Massive points + visual splendor)
      const targetX = (Math.random() - 0.5) * (this.trackWidth - 300);
      this.items.push({
        type: COLLECTIBLE_TYPES.RARE_BONUS,
        x: targetX,
        baseY: 42,
        currentY: 42,
        z: startZ,
        radius: 26,
        value: 1500,
        color: '#facc15',
        collected: false,
        animTime: 0
      });
    }
  }

  collect(item) {
    item.collected = true;

    // Burst sparks
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = Math.random() * 180 + 80;
      this.pickupParticles.push({
        x: item.x,
        y: item.currentY,
        z: item.z,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 50,
        vz: (Math.random() - 0.5) * 80,
        color: item.color,
        size: Math.random() * 4 + 2,
        life: 1.0,
        decay: Math.random() * 2 + 2
      });
    }
  }

  render(ctx, project) {
    // 1. Draw pickup spark particles
    for (let p of this.pickupParticles) {
      const proj = project(p.x, p.y, p.z);
      if (proj && proj.scale > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8 * proj.scale;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 2. Render Collectible Items
    for (let item of this.items) {
      if (item.collected) continue;

      const proj = project(item.x, item.currentY, item.z);
      if (!proj || proj.scale <= 0) continue;

      const r = item.radius * proj.scale;
      const px = proj.x;
      const py = proj.y;

      ctx.save();
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 18 * proj.scale;

      if (item.type === COLLECTIBLE_TYPES.COIN || item.type === COLLECTIBLE_TYPES.ORB) {
        // 3D Spinning Golden/Cyan Cyber Coin
        const spin = Math.cos(item.animTime * 4.5);
        const coinW = Math.max(1, r * Math.abs(spin));
        const coinH = r * 1.25;

        // Outer coin rim
        ctx.fillStyle = spin >= 0 ? '#00f3ff' : '#00b4d8';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, 1.8 * proj.scale);
        ctx.beginPath();
        ctx.ellipse(px, py, coinW, coinH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner coin core
        if (coinW > 4 * proj.scale) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(px, py, coinW * 0.55, coinH * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#051138';
          ctx.font = `bold ${Math.round(11 * proj.scale)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', px, py);
        }

        // Orbit ring
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.6)';
        ctx.lineWidth = Math.max(1, 1.2 * proj.scale);
        const rot = item.animTime * 3;
        ctx.beginPath();
        ctx.ellipse(px, py, r * 1.5, r * 0.5, rot, 0, Math.PI * 2);
        ctx.stroke();

      } else if (item.type === COLLECTIBLE_TYPES.GEM) {
        // Faceted 3D Cyber Gemstone (Ruby / Emerald)
        const rot = item.animTime * 2.5;
        const w = r * 1.2;
        const h = r * 1.4;

        // Gem upper crown & lower pavilion
        ctx.fillStyle = item.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8 * proj.scale;

        // Octagonal gemstone profile
        ctx.beginPath();
        ctx.moveTo(px, py - h);
        ctx.lineTo(px + w, py - h * 0.25);
        ctx.lineTo(px + w * 0.7, py + h);
        ctx.lineTo(px - w * 0.7, py + h);
        ctx.lineTo(px - w, py - h * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner facet reflections
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.moveTo(px, py - h);
        ctx.lineTo(px + w * 0.5, py - h * 0.25);
        ctx.lineTo(px, py + h * 0.4);
        ctx.lineTo(px - w * 0.5, py - h * 0.25);
        ctx.closePath();
        ctx.fill();

        // Sparkle glint
        const glint = Math.sin(rot * 2);
        if (glint > 0.4) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 10 * proj.scale;
          ctx.beginPath();
          ctx.arc(px - w * 0.3, py - h * 0.4, 3 * proj.scale, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (item.type === COLLECTIBLE_TYPES.BOOST) {
        // Futuristic Amber Battery Cell
        ctx.fillStyle = '#ffb703';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * proj.scale;
        const w = r * 1.2;
        const h = r * 1.8;
        
        ctx.beginPath();
        ctx.roundRect(px - w / 2, py - h / 2, w, h, 4 * proj.scale);
        ctx.fill();
        ctx.stroke();

        // Lightning / chevron symbol inside
        ctx.fillStyle = '#050814';
        ctx.beginPath();
        ctx.moveTo(px, py - h * 0.35);
        ctx.lineTo(px - w * 0.25, py);
        ctx.lineTo(px + w * 0.05, py);
        ctx.lineTo(px - w * 0.1, py + h * 0.35);
        ctx.lineTo(px + w * 0.3, py - h * 0.05);
        ctx.lineTo(px, py - h * 0.05);
        ctx.closePath();
        ctx.fill();

      } else if (item.type === COLLECTIBLE_TYPES.SHIELD) {
        // Hexagonal Shield Matrix
        ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5 * proj.scale;

        const sides = 6;
        ctx.beginPath();
        for (let s = 0; s < sides; s++) {
          const a = (s / sides) * Math.PI * 2 + item.animTime * 2;
          const sx = px + Math.cos(a) * r * 1.3;
          const sy = py + Math.sin(a) * r * 1.3;
          if (s === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner glowing core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, r * 0.5, 0, Math.PI * 2);
        ctx.fill();

      } else if (item.type === COLLECTIBLE_TYPES.MULTIPLIER) {
        // Purple Diamond Crystal
        ctx.fillStyle = '#a855f7';
        ctx.strokeStyle = '#f3e8ff';
        ctx.lineWidth = 2 * proj.scale;

        ctx.beginPath();
        ctx.moveTo(px, py - r * 1.6);
        ctx.lineTo(px + r * 1.2, py);
        ctx.lineTo(px, py + r * 1.6);
        ctx.lineTo(px - r * 1.2, py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(14 * proj.scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.multiplierVal ? `${item.multiplierVal}X` : '2X', px, py);

      } else if (item.type === COLLECTIBLE_TYPES.RARE_BONUS) {
        // 8-Point Cosmic Quantum Prismatic Star
        const rot = item.animTime * 3;
        const outerR = r * 1.6;
        const innerR = r * 0.7;
        const points = 8;

        const grad = ctx.createRadialGradient(px, py, r * 0.2, px, py, outerR);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#facc15');
        grad.addColorStop(0.8, '#ec4899');
        grad.addColorStop(1, '#8b5cf6');

        ctx.fillStyle = grad;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * proj.scale;

        ctx.beginPath();
        for (let p = 0; p < points * 2; p++) {
          const a = (p / (points * 2)) * Math.PI * 2 + rot;
          const rad = (p % 2 === 0) ? outerR : innerR;
          const sx = px + Math.cos(a) * rad;
          const sy = py + Math.sin(a) * rad;
          if (p === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Pulsating center emblem
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
