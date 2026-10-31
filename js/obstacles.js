/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Obstacles & Track Platform Architecture
 * Generates and animates hazardous cyber barriers, laser fences, moving gates, spike mines,
 * rotating cyber beam obstacles, narrow bridges, moving platforms, and abyss gaps.
 */

export const OBSTACLE_TYPES = {
  LASER_BARRIER: 'laser_barrier', // Can be jumped over or dodged
  CYBER_CUBE: 'cyber_cube',       // Solid tall block, must dodge
  MOVING_GATE: 'moving_gate',     // Sweeps horizontally
  SPIKE_MINE: 'spike_mine',       // Grounded spikes, jumpable
  ROTATING_BEAM: 'rotating_beam'  // Spinning energy propeller
};

export const PLATFORM_TYPES = {
  STANDARD: 'standard', // Full track width (800)
  NARROW: 'narrow',     // Narrow high-speed bridge (420)
  MOVING: 'moving',     // Floating platform that sweeps laterally
  GAP: 'gap'            // Bottomless cyber void, requires jump!
};

export class ObstacleManager {
  constructor() {
    this.obstacles = [];
    this.trackSegments = [];
    this.trackWidth = 800;
    this.nextSpawnZ = 900;
    this.nextSegmentZ = -400;
    this.minSpacing = 280;
    this.globalTime = 0;

    this.reset();
  }

  reset() {
    this.obstacles = [];
    this.trackSegments = [];
    this.nextSpawnZ = 900;
    this.globalTime = 0;

    // Initial safe runway (first 1800m is standard flat track)
    this.trackSegments.push({
      id: 1,
      zStart: -400,
      zEnd: 1800,
      type: PLATFORM_TYPES.STANDARD,
      width: 800,
      xOffset: 0,
      speed: 0
    });
    this.nextSegmentZ = 1800;
  }

  /**
   * Clear ahead obstacles on Quantum EMP Shockwave
   */
  clearInFront(playerZ, range = 750) {
    const initialCount = this.obstacles.length;
    this.obstacles = this.obstacles.filter(obs => {
      return obs.z < playerZ || obs.z > (playerZ + range);
    });
    return Math.max(0, initialCount - this.obstacles.length);
  }

  /**
   * Query the platform state at player's Z coordinate
   */
  getPlatformAt(playerX, playerZ, time) {
    // Find active segment
    const segment = this.trackSegments.find(seg => playerZ >= seg.zStart && playerZ < seg.zEnd);

    if (!segment) {
      // Default to standard runway if beyond mapped segments
      const half = this.trackWidth / 2;
      return {
        hasFloor: Math.abs(playerX) <= half,
        isGap: false,
        isOffTrack: Math.abs(playerX) > half,
        type: PLATFORM_TYPES.STANDARD,
        currentOffset: 0,
        minX: -half,
        maxX: half,
        width: this.trackWidth
      };
    }

    if (segment.type === PLATFORM_TYPES.GAP) {
      return {
        hasFloor: false,
        isGap: true,
        isOffTrack: false,
        type: PLATFORM_TYPES.GAP,
        currentOffset: 0,
        minX: 0,
        maxX: 0,
        width: 0,
        zStart: segment.zStart,
        zEnd: segment.zEnd
      };
    }

    let offset = segment.xOffset;
    if (segment.type === PLATFORM_TYPES.MOVING) {
      offset += Math.sin(time * 2.2 + segment.id) * 160;
    }

    const halfW = segment.width / 2;
    const minX = offset - halfW;
    const maxX = offset + halfW;
    const isWithinBounds = playerX >= minX && playerX <= maxX;

    return {
      hasFloor: isWithinBounds,
      isGap: false,
      isOffTrack: !isWithinBounds,
      type: segment.type,
      currentOffset: offset,
      minX,
      maxX,
      width: segment.width,
      zStart: segment.zStart,
      zEnd: segment.zEnd
    };
  }

  update(playerZ, dt) {
    this.globalTime += dt;

    // 1. Clean up obstacles far behind player
    this.obstacles = this.obstacles.filter(obs => obs.z > playerZ - 400);

    // 2. Clean up old track segments
    this.trackSegments = this.trackSegments.filter(seg => seg.zEnd > playerZ - 500);

    // 3. Maintain continuous track segments ahead
    const segmentHorizon = playerZ + 4200;
    while (this.nextSegmentZ < segmentHorizon) {
      this._spawnTrackSegment();
    }

    // 4. Animate obstacles
    for (let obs of this.obstacles) {
      if (obs.type === OBSTACLE_TYPES.MOVING_GATE) {
        obs.x += obs.vx * dt;
        const maxExtent = (this.trackWidth / 2) - obs.width / 2;
        if (obs.x > maxExtent) {
          obs.x = maxExtent;
          obs.vx = -Math.abs(obs.vx);
        } else if (obs.x < -maxExtent) {
          obs.x = -maxExtent;
          obs.vx = Math.abs(obs.vx);
        }
      } else if (obs.type === OBSTACLE_TYPES.ROTATING_BEAM) {
        obs.angle = (obs.angle || 0) + obs.rotSpeed * dt;
      }
      obs.animTime = (obs.animTime || 0) + dt;
    }

    // 5. Spawn obstacles ahead
    const spawnHorizon = playerZ + 3600;
    while (this.nextSpawnZ < spawnHorizon) {
      // Ensure we don't spawn solid obstacles directly inside a gap
      const platform = this.getPlatformAt(0, this.nextSpawnZ, this.globalTime);
      if (!platform.isGap) {
        this._spawnObstacle(this.nextSpawnZ, platform);
      }
      
      const distanceFactor = Math.min(100, (this.nextSpawnZ / 1000) * 8);
      const spacing = Math.max(220, this.minSpacing - distanceFactor + Math.random() * 80);
      this.nextSpawnZ += spacing;
    }
  }

  _spawnTrackSegment() {
    const zStart = this.nextSegmentZ;
    const rand = Math.random();
    let type = PLATFORM_TYPES.STANDARD;
    let width = 800;
    let length = 1200 + Math.random() * 600;

    // Difficulty increases with distance
    const isAdvanced = zStart > 2400;

    if (isAdvanced && rand < 0.22) {
      // Void Gap (jump required!)
      type = PLATFORM_TYPES.GAP;
      length = 240 + Math.random() * 80;
      width = 0;
    } else if (isAdvanced && rand < 0.45) {
      // Narrow Cyber Bridge
      type = PLATFORM_TYPES.NARROW;
      length = 1000 + Math.random() * 400;
      width = 420;
    } else if (isAdvanced && rand < 0.65) {
      // Moving Platform
      type = PLATFORM_TYPES.MOVING;
      length = 900 + Math.random() * 400;
      width = 460;
    } else {
      type = PLATFORM_TYPES.STANDARD;
      length = 1200 + Math.random() * 600;
      width = 800;
    }

    this.trackSegments.push({
      id: this.trackSegments.length + 1,
      zStart,
      zEnd: zStart + length,
      type,
      width,
      xOffset: 0,
      animTime: 0
    });

    this.nextSegmentZ = zStart + length;
  }

  _spawnObstacle(z, platform) {
    const rand = Math.random();
    let type = OBSTACLE_TYPES.LASER_BARRIER;
    if (rand < 0.30) type = OBSTACLE_TYPES.LASER_BARRIER;
    else if (rand < 0.55) type = OBSTACLE_TYPES.CYBER_CUBE;
    else if (rand < 0.75) type = OBSTACLE_TYPES.MOVING_GATE;
    else if (rand < 0.88) type = OBSTACLE_TYPES.SPIKE_MINE;
    else type = OBSTACLE_TYPES.ROTATING_BEAM;

    const currentWidth = platform ? platform.width : this.trackWidth;
    const centerOffset = platform ? platform.currentOffset : 0;
    const usableW = Math.max(100, currentWidth - 140);

    switch (type) {
      case OBSTACLE_TYPES.LASER_BARRIER: {
        const width = Math.min(usableW, 260 + Math.random() * 120);
        const x = centerOffset + (Math.random() - 0.5) * (usableW - width * 0.5);
        this.obstacles.push({
          type,
          x,
          y: 0,
          z,
          width,
          height: 38,
          depth: 20,
          isJumpable: true,
          color: '#ff0055',
          animTime: Math.random() * 10
        });
        break;
      }
      case OBSTACLE_TYPES.CYBER_CUBE: {
        const width = 130 + Math.random() * 60;
        const x = centerOffset + (Math.random() - 0.5) * (usableW - width * 0.5);
        this.obstacles.push({
          type,
          x,
          y: 0,
          z,
          width,
          height: 110,
          depth: 80,
          isJumpable: false,
          color: '#ff007f',
          animTime: 0
        });
        break;
      }
      case OBSTACLE_TYPES.MOVING_GATE: {
        const width = 180;
        const x = centerOffset;
        const speed = (200 + Math.random() * 140) * (Math.random() > 0.5 ? 1 : -1);
        this.obstacles.push({
          type,
          x,
          y: 0,
          z,
          width,
          height: 80,
          depth: 40,
          vx: speed,
          isJumpable: false,
          color: '#e11d48',
          animTime: 0
        });
        break;
      }
      case OBSTACLE_TYPES.SPIKE_MINE: {
        const width = 110;
        const x = centerOffset + (Math.random() - 0.5) * (usableW - width * 0.5);
        this.obstacles.push({
          type,
          x,
          y: 0,
          z,
          width,
          height: 35,
          depth: 35,
          isJumpable: true,
          color: '#ff5400',
          animTime: 0
        });
        break;
      }
      case OBSTACLE_TYPES.ROTATING_BEAM: {
        const length = Math.min(usableW + 40, 240);
        this.obstacles.push({
          type,
          x: centerOffset,
          y: 0,
          z,
          length,
          width: length,
          height: 60,
          depth: 30,
          rotSpeed: 2.2 * (Math.random() > 0.5 ? 1 : -1),
          angle: Math.random() * Math.PI,
          isJumpable: true,
          color: '#00f3ff',
          animTime: 0
        });
        break;
      }
    }
  }

  render(ctx, project) {
    for (let obs of this.obstacles) {
      this._renderObstacle(ctx, obs, project);
    }
  }

  _renderObstacle(ctx, obs, project) {
    if (obs.type === OBSTACLE_TYPES.ROTATING_BEAM) {
      this._renderRotatingBeam(ctx, obs, project);
      return;
    }

    const left = obs.x - obs.width / 2;
    const right = obs.x + obs.width / 2;
    const bottom = obs.y;
    const top = obs.y + obs.height;
    const nearZ = obs.z - obs.depth / 2;
    const farZ = obs.z + obs.depth / 2;

    const bl = project(left, bottom, nearZ);
    const br = project(right, bottom, nearZ);
    const tl = project(left, top, nearZ);
    const tr = project(right, top, nearZ);

    if (!bl || !br || !tl || !tr) return;

    ctx.save();

    if (obs.type === OBSTACLE_TYPES.LASER_BARRIER) {
      // Futuristic laser fence with emitter posts
      ctx.strokeStyle = obs.color;
      ctx.shadowColor = obs.color;
      ctx.shadowBlur = 14 * bl.scale;
      ctx.lineWidth = Math.max(2, 4 * bl.scale);

      // Emitter pylons
      ctx.fillStyle = '#1e1b4b';
      const pylonW = 12 * bl.scale;
      ctx.fillRect(bl.x - pylonW, tl.y, pylonW * 2, bl.y - tl.y);
      ctx.fillRect(br.x - pylonW, tr.y, pylonW * 2, br.y - tr.y);

      // Glowing pulsating laser beam
      const pulseAlpha = 0.65 + Math.sin(obs.animTime * 12) * 0.35;
      ctx.globalAlpha = pulseAlpha;
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y + (bl.y - tl.y) * 0.4);
      ctx.lineTo(tr.x, tr.y + (br.y - tr.y) * 0.4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y + (bl.y - tl.y) * 0.7);
      ctx.lineTo(tr.x, tr.y + (br.y - tr.y) * 0.7);
      ctx.stroke();

    } else if (obs.type === OBSTACLE_TYPES.CYBER_CUBE || obs.type === OBSTACLE_TYPES.MOVING_GATE) {
      // 3D Projected Cyber Box
      const f_tl = project(left, top, farZ);
      const f_tr = project(right, top, farZ);

      // Draw Top Face if visible
      if (f_tl && f_tr) {
        ctx.fillStyle = 'rgba(255, 0, 127, 0.25)';
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(f_tr.x, f_tr.y);
        ctx.lineTo(f_tl.x, f_tl.y);
        ctx.closePath();
        ctx.fill();
      }

      // Draw Front Face
      const grad = ctx.createLinearGradient(tl.x, tl.y, bl.x, bl.y);
      grad.addColorStop(0, obs.color);
      grad.addColorStop(1, '#2e021b');

      ctx.fillStyle = grad;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, 1.5 * bl.scale);
      ctx.shadowColor = obs.color;
      ctx.shadowBlur = 12 * bl.scale;

      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Hazard stripes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2 * bl.scale;
      const step = (br.x - bl.x) / 4;
      for (let s = 1; s < 4; s++) {
        ctx.beginPath();
        ctx.moveTo(bl.x + step * s, bl.y);
        ctx.lineTo(tl.x + step * s + 6 * bl.scale, tl.y);
        ctx.stroke();
      }

    } else if (obs.type === OBSTACLE_TYPES.SPIKE_MINE) {
      // Grounded 3D spikes
      ctx.fillStyle = obs.color;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = obs.color;
      ctx.shadowBlur = 10 * bl.scale;
      ctx.lineWidth = 1.5 * bl.scale;

      const numSpikes = 3;
      const spikeW = (br.x - bl.x) / numSpikes;

      for (let s = 0; s < numSpikes; s++) {
        const sx = bl.x + s * spikeW;
        ctx.beginPath();
        ctx.moveTo(sx, bl.y);
        ctx.lineTo(sx + spikeW / 2, tl.y);
        ctx.lineTo(sx + spikeW, bl.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  _renderRotatingBeam(ctx, obs, project) {
    const hub = project(obs.x, 38, obs.z);
    if (!hub || hub.scale <= 0) return;

    ctx.save();
    const halfLen = obs.length / 2;
    const cosA = Math.cos(obs.angle);
    const sinA = Math.sin(obs.angle);

    const tip1 = project(obs.x + cosA * halfLen, 38 + sinA * halfLen, obs.z);
    const tip2 = project(obs.x - cosA * halfLen, 38 - sinA * halfLen, obs.z);
    const basePylon = project(obs.x, 0, obs.z);

    // Support post
    if (basePylon) {
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 8 * hub.scale;
      ctx.beginPath();
      ctx.moveTo(basePylon.x, basePylon.y);
      ctx.lineTo(hub.x, hub.y);
      ctx.stroke();
    }

    // Rotating Neon Arm
    if (tip1 && tip2) {
      ctx.strokeStyle = obs.color;
      ctx.shadowColor = obs.color;
      ctx.shadowBlur = 16 * hub.scale;
      ctx.lineWidth = Math.max(3, 5 * hub.scale);

      ctx.beginPath();
      ctx.moveTo(tip1.x, tip1.y);
      ctx.lineTo(tip2.x, tip2.y);
      ctx.stroke();

      // Blade tip energy orbs
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(tip1.x, tip1.y, 4 * hub.scale, 0, Math.PI * 2);
      ctx.arc(tip2.x, tip2.y, 4 * hub.scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central Rotor Hub
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = obs.color;
    ctx.shadowBlur = 12 * hub.scale;
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, 8 * hub.scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
