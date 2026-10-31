/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Collision Detection Module
 * Computes 3D bounding intersection, jump clearance, collectible pickup, and near-miss evasion.
 */

export class CollisionDetector {
  /**
   * Check collision between player ball and active obstacles
   * Returns: { hasHit: boolean, obstacle: object | null, isJumpedOver: boolean, nearMiss: boolean }
   */
  static checkObstacles(player, obstacles) {
    for (let obs of obstacles) {
      const zDist = Math.abs(player.z - obs.z);
      const zHitDist = player.radius + obs.depth / 2;

      // Check Z alignment
      if (zDist < zHitDist) {
        if (obs.type === 'rotating_beam') {
          // Point to segment 2D distance in XY plane
          const halfLen = obs.length / 2;
          const cosA = Math.cos(obs.angle);
          const sinA = Math.sin(obs.angle);
          const ax = obs.x - cosA * halfLen;
          const ay = 38 - sinA * halfLen;
          const bx = obs.x + cosA * halfLen;
          const by = 38 + sinA * halfLen;

          const px = player.x;
          const py = player.y + player.radius;

          const abx = bx - ax;
          const aby = by - ay;
          const lenSq = abx * abx + aby * aby;
          let t = lenSq > 0 ? ((px - ax) * abx + (py - ay) * aby) / lenSq : 0;
          t = Math.max(0, Math.min(1, t));

          const closeX = ax + t * abx;
          const closeY = ay + t * aby;
          const dist = Math.hypot(px - closeX, py - closeY);

          if (dist < player.radius + 14) {
            return { hasHit: true, obstacle: obs, isJumpedOver: false, nearMiss: false };
          } else if (dist < player.radius + 45 && !obs.nearMissAwarded) {
            obs.nearMissAwarded = true;
            return { hasHit: false, obstacle: obs, isJumpedOver: false, nearMiss: true };
          }
          continue;
        }

        const xDist = Math.abs(player.x - obs.x);
        const xHitDist = (obs.width / 2) + player.radius * 0.85;

        // Check X alignment
        if (xDist < xHitDist) {
          // Check Y altitude (jump clearance)
          const playerBottom = player.y;

          if (obs.isJumpable && playerBottom > obs.height * 0.75) {
            // Player jumped cleanly over the laser or spikes!
            if (!obs.clearedBonusAwarded) {
              obs.clearedBonusAwarded = true;
              return { hasHit: false, obstacle: obs, isJumpedOver: true, nearMiss: false };
            }
          } else {
            // Impact!
            return { hasHit: true, obstacle: obs, isJumpedOver: false, nearMiss: false };
          }
        } else if (xDist < xHitDist + 40 && !obs.nearMissAwarded) {
          // Near-miss close shave!
          obs.nearMissAwarded = true;
          return { hasHit: false, obstacle: obs, isJumpedOver: false, nearMiss: true };
        }
      }
    }

    return { hasHit: false, obstacle: null, isJumpedOver: false, nearMiss: false };
  }

  /**
   * Check pickup of collectibles
   * Returns: list of collected items
   */
  static checkCollectibles(player, collectibles) {
    const collected = [];

    for (let item of collectibles) {
      if (item.collected) continue;

      const dz = Math.abs(player.z - item.z);
      if (dz > 60) continue;

      const dx = player.x - item.x;
      const dy = (player.y + player.radius) - item.currentY;
      const dist = Math.hypot(dx, dy, dz);

      if (dist < player.radius + item.radius + 15) {
        collected.push(item);
      }
    }

    return collected;
  }
}
