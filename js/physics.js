/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Physics Engine
 * Handles track coordinate dynamics, ball rolling inertia, jump parabolas, and turbo boost.
 */

export class PhysicsEngine {
  constructor() {
    this.trackWidth = 800; // Total playable runway width in world units (-400 to +400)
    this.gravity = 1800;   // World units / s^2
    this.baseSpeed = 400;  // Base forward speed
    this.maxSpeed = 950;   // Speed with boost & progression
    this.jumpVelocity = 640;
    
    this.steerAcceleration = 2200;
    this.lateralFriction = 0.88;
  }

  update(player, inputs, dt, platform = null) {
    player.justLanded = false;

    // 0. Falling Physics (if player fell off platform or into a gap)
    if (player.isFalling) {
      player.vy -= this.gravity * 0.9 * dt;
      player.y += player.vy * dt;
      player.vz *= 0.985;
      player.z += player.vz * dt;
      player.x += player.vx * dt;
      player.rotationX = (player.rotationX + (player.vz / player.radius) * dt) % (Math.PI * 2);
      player.rotationY = (player.rotationY + (player.vx / player.radius) * dt) % (Math.PI * 2);
      return;
    }

    // 1. Boost Management
    const isBoostTriggered = (inputs.isMouthOpen || inputs.keyboardBoost) && player.boostEnergy > 5;
    
    if (isBoostTriggered) {
      player.isBoosting = true;
      player.boostEnergy = Math.max(0, player.boostEnergy - 35 * dt);
    } else {
      player.isBoosting = false;
      // Passive recharge
      player.boostEnergy = Math.min(100, player.boostEnergy + 12 * dt);
    }

    // 2. Forward Velocity Progression
    const distanceBoost = Math.min(280, player.z * 0.018);
    let targetVz = this.baseSpeed + distanceBoost;
    
    if (player.isBoosting) {
      targetVz = Math.min(this.maxSpeed, targetVz * 1.55);
    }

    if (inputs.pitch) {
      targetVz += inputs.pitch * 90;
    }

    // Smooth forward acceleration
    player.vz += (targetVz - player.vz) * Math.min(1, 4.0 * dt);
    player.z += player.vz * dt;

    // 3. Lateral Movement (Steering)
    let steerInput = inputs.steering || 0;
    if (inputs.keyboardLeft) steerInput -= 1.0;
    if (inputs.keyboardRight) steerInput += 1.0;
    steerInput = Math.max(-1, Math.min(1, steerInput));

    player.vx += steerInput * this.steerAcceleration * dt;
    player.vx *= Math.pow(this.lateralFriction, dt * 60);

    player.x += player.vx * dt;

    // 4. Platform Boundary & Gap Checking
    if (platform) {
      if (platform.type === 'standard') {
        // Standard highway with solid guardrails
        const halfTrack = (platform.width / 2) - player.radius;
        if (player.x < -halfTrack) {
          player.x = -halfTrack;
          player.vx = -player.vx * 0.35;
        } else if (player.x > halfTrack) {
          player.x = halfTrack;
          player.vx = -player.vx * 0.35;
        }
      } else if (platform.isGap) {
        // Runway gap: if player touches bottom while over the gap, they fall into the void!
        if (player.y <= 0) {
          player.isFalling = true;
          player.isGrounded = false;
          player.vy = -140;
        }
      } else {
        // Narrow bridge or moving platform: open edges!
        const isOffEdge = (player.x < platform.minX - player.radius * 0.6) || 
                          (player.x > platform.maxX + player.radius * 0.6);
        if (isOffEdge && player.y <= 0) {
          player.isFalling = true;
          player.isGrounded = false;
          player.vy = -140;
        }
      }
    }

    // 5. Vertical Movement (Jump, Gravity & Landing Detection)
    const wantsJump = (inputs.isBrowRaised || inputs.keyboardJump) && player.isGrounded && !player.jumpCooldown;
    
    if (wantsJump) {
      player.vy = this.jumpVelocity;
      player.isGrounded = false;
      player.jumpCooldown = true;
      player.justJumped = true;
    } else {
      player.justJumped = false;
    }

    if (!inputs.isBrowRaised && !inputs.keyboardJump) {
      player.jumpCooldown = false;
    }

    if (!player.isGrounded && !player.isFalling) {
      player.vy -= this.gravity * dt;
      player.y += player.vy * dt;

      if (player.y <= 0) {
        // Check if there is platform surface below
        const hasSurface = !platform || platform.hasFloor;
        if (hasSurface) {
          player.y = 0;
          player.vy = 0;
          player.isGrounded = true;
          player.justLanded = true;
          player.triggerLanding();
        } else {
          // Fallen into void
          player.isFalling = true;
          player.isGrounded = false;
          player.vy = -140;
        }
      }
    }

    // 6. Angular Roll Rotations (visual representation of ball rolling)
    const rollSpeedX = player.vz / player.radius;
    const rollSpeedY = player.vx / player.radius;

    player.rotationX = (player.rotationX + rollSpeedX * dt) % (Math.PI * 2);
    player.rotationY = (player.rotationY + rollSpeedY * dt) % (Math.PI * 2);
  }
}
