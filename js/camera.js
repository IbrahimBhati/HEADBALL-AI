/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HEADBALL AI - Camera Module
 * WebRTC webcam capture, device management, permission & disconnection lifecycle.
 */

export class CameraManager {
  constructor() {
    this.video = null;
    this.stream = null;
    this.isActive = false;
    this.availableDevices = [];
    this.selectedDeviceId = null;
    this.hasPermission = false;
    this.permissionError = null;

    // Callbacks
    this.onDisconnectCallback = null;
    this.onStreamStartCallback = null;
    this.onErrorCallback = null;

    // Bound listeners for clean removal
    this._handleTrackEnded = this._handleTrackEnded.bind(this);
    this._handleDeviceChange = this._handleDeviceChange.bind(this);

    // Listen to OS-level hardware camera unplug/plug events
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', this._handleDeviceChange);
    }
  }

  setVideoElement(videoEl) {
    this.video = videoEl;
  }

  /**
   * Enumerate connected video input devices
   * @returns {Promise<MediaDeviceInfo[]>}
   */
  async enumerateDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.filter(d => d.kind === 'videoinput');
      return this.availableDevices;
    } catch (e) {
      console.warn('[Camera] Failed to enumerate devices:', e);
      return [];
    }
  }

  /**
   * Request webcam permissions and start the video stream
   * @param {HTMLVideoElement} [videoEl] - Target video element to bind stream
   * @param {string} [deviceId] - Optional specific camera device ID
   * @returns {Promise<MediaStream>}
   */
  async requestPermissionAndStart(videoEl = null, deviceId = null) {
    if (videoEl) this.video = videoEl;
    if (deviceId) this.selectedDeviceId = deviceId;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.permissionError = 'Webcam API (getUserMedia) is not supported in this browser environment.';
      if (this.onErrorCallback) this.onErrorCallback(this.permissionError);
      throw new Error(this.permissionError);
    }

    // Stop existing stream if currently active
    this.stopCamera();

    // Prefer front-facing user camera at 60fps / 640x480 for fast low-latency AI tracking
    const constraints = {
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: 640, min: 320 },
        height: { ideal: 480, min: 240 },
        frameRate: { ideal: 60, min: 24 }
      }
    };

    if (this.selectedDeviceId) {
      constraints.video.deviceId = { exact: this.selectedDeviceId };
      delete constraints.video.facingMode; // deviceId takes precedence
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.hasPermission = true;
      this.permissionError = null;

      // Attach track ended listeners to detect sudden disconnection / hardware unplug
      this.stream.getVideoTracks().forEach(track => {
        track.addEventListener('ended', this._handleTrackEnded);
      });

      if (this.video) {
        this.video.srcObject = this.stream;
        this.video.setAttribute('playsinline', 'true');
        this.video.muted = true;

        await new Promise((resolve) => {
          this.video.onloadedmetadata = () => {
            this.video.play()
              .then(resolve)
              .catch(() => resolve());
          };
        });
      }

      this.isActive = true;
      await this.enumerateDevices();

      if (this.onStreamStartCallback) {
        this.onStreamStartCallback(this.stream);
      }

      return this.stream;
    } catch (err) {
      this.isActive = false;
      this.hasPermission = false;

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.permissionError = 'Camera access denied. Please click the camera icon in your browser address bar to allow webcam access.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.permissionError = 'No webcam hardware detected on this device. You can play using Keyboard Mode anytime.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        this.permissionError = 'Camera is currently in use by another application. Please close other video apps and retry.';
      } else if (err.name === 'OverconstrainedError') {
        this.permissionError = 'Camera does not satisfy the requested resolution. Trying fallback constraints...';
        // Automatic retry with bare video constraints
        return this._startWithBasicConstraints(videoEl);
      } else {
        this.permissionError = `Camera error: ${err.message || 'Unable to access video stream'}`;
      }

      if (this.onErrorCallback) {
        this.onErrorCallback(this.permissionError);
      }
      throw new Error(this.permissionError);
    }
  }

  async _startWithBasicConstraints(videoEl) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      this.hasPermission = true;
      this.permissionError = null;

      this.stream.getVideoTracks().forEach(track => {
        track.addEventListener('ended', this._handleTrackEnded);
      });

      if (videoEl) {
        videoEl.srcObject = this.stream;
        videoEl.setAttribute('playsinline', 'true');
        videoEl.muted = true;
        await videoEl.play().catch(() => {});
      }

      this.isActive = true;
      return this.stream;
    } catch (e) {
      this.permissionError = `Fallback camera error: ${e.message}`;
      throw new Error(this.permissionError);
    }
  }

  _handleTrackEnded() {
    console.warn('[Camera] Video track ended / disconnected.');
    this.isActive = false;
    if (this.onDisconnectCallback) {
      this.onDisconnectCallback('Camera disconnected or access revoked.');
    }
  }

  async _handleDeviceChange() {
    const prevCount = this.availableDevices.length;
    await this.enumerateDevices();
    if (this.isActive && this.availableDevices.length < prevCount) {
      // A device was removed
      const currentTrack = this.stream?.getVideoTracks()[0];
      if (!currentTrack || currentTrack.readyState === 'ended') {
        this._handleTrackEnded();
      }
    }
  }

  /**
   * Stop all camera tracks and clean up video resources
   */
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        try {
          track.removeEventListener('ended', this._handleTrackEnded);
          track.stop();
        } catch {}
      });
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    this.isActive = false;
  }

  /**
   * Check if video feed is actively transmitting frames
   * @returns {boolean}
   */
  isReady() {
    return (
      this.isActive &&
      this.video !== null &&
      this.video.readyState >= 2 &&
      this.video.videoWidth > 0 &&
      !this.video.paused &&
      !this.video.ended
    );
  }

  destroy() {
    this.stopCamera();
    if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this._handleDeviceChange);
    }
  }
}
