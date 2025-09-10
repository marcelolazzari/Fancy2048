/**
 * Vision2048 - Vision Handler
 * Handles camera access and hand gesture recognition
 */

class VisionHandler {
  constructor() {
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.stream = null;
    this.isActive = false;
    this.isProcessing = false;
    
    // Gesture detection state
    this.lastGesture = null;
    this.gestureStartTime = null;
    this.gestureHoldTime = 1000; // 1 second hold time
    this.gestureConfidence = 0;
    this.minConfidence = 0.7;
    
    // Gesture cooldown to prevent rapid fire
    this.lastGestureTime = 0;
    this.gestureCooldown = 1500; // 1.5 seconds between gestures
    
    // Hand tracking data
    this.handLandmarks = null;
    this.handedness = null;
    
    // Callbacks
    this.onGestureDetected = null;
    this.onCameraStatusChange = null;
    
    // Initialize MediaPipe Hands (simplified detection for this implementation)
    this.initializeGestureDetection();
  }

  /**
   * Initialize gesture detection system
   */
  async initializeGestureDetection() {
    try {
      // Try to initialize MediaPipe Hands if available
      if (typeof Hands !== 'undefined') {
        await this.initializeMediaPipeHands();
        Utils.log('vision', 'MediaPipe Hands initialized');
      } else {
        Utils.log('vision', 'MediaPipe not available, using fallback detection');
        this.useBasicDetection = true;
      }
      
      Utils.log('vision', 'Gesture detection system initialized');
    } catch (error) {
      console.warn('MediaPipe initialization failed, using fallback:', error);
      this.useBasicDetection = true;
      Utils.log('vision', 'Using basic gesture detection');
    }
  }

  /**
   * Initialize MediaPipe Hands
   */
  async initializeMediaPipeHands() {
    if (typeof Hands === 'undefined') {
      throw new Error('MediaPipe Hands not available');
    }

    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults((results) => {
      this.processMediaPipeResults(results);
    });

    this.useMediaPipe = true;
    Utils.log('vision', 'MediaPipe Hands configured');
  }

  /**
   * Process MediaPipe hand detection results
   */
  processMediaPipeResults(results) {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const handedness = results.multiHandedness[0];

      // Draw hand landmarks
      this.drawHandLandmarks(landmarks);

      // Detect gesture from landmarks
      const gesture = this.classifyGestureFromLandmarks(landmarks);
      if (gesture) {
        this.processGesture(gesture, 0.85);
      }
    }
  }

  /**
   * Draw hand landmarks on canvas
   */
  drawHandLandmarks(landmarks) {
    const ctx = this.ctx;
    const canvas = this.canvas;

    // Draw connections
    ctx.strokeStyle = 'rgba(40, 167, 69, 0.6)';
    ctx.lineWidth = 2;

    // Hand connections (simplified)
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],  // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],  // Index
      [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [9, 13], [13, 14], [14, 15], [15, 16],  // Ring
      [13, 17], [17, 18], [18, 19], [19, 20]   // Pinky
    ];

    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      
      ctx.beginPath();
      ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
      ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
      ctx.stroke();
    });

    // Draw landmarks
    ctx.fillStyle = 'rgba(40, 167, 69, 0.8)';
    landmarks.forEach((landmark, index) => {
      ctx.beginPath();
      ctx.arc(
        landmark.x * canvas.width, 
        landmark.y * canvas.height, 
        index === 8 ? 8 : 4, // Larger dot for index fingertip
        0, 
        2 * Math.PI
      );
      ctx.fill();
    });
  }

  /**
   * Classify gesture from hand landmarks
   */
  classifyGestureFromLandmarks(landmarks) {
    // Get key landmarks
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const wrist = landmarks[0];

    // Check if index finger is extended (pointing)
    const indexExtended = indexTip.y < indexPip.y;
    const middleFolded = middleTip.y > landmarks[10].y;
    const ringFolded = ringTip.y > landmarks[14].y;
    const pinkyFolded = pinkyTip.y > landmarks[18].y;

    // If only index finger is extended, determine direction
    if (indexExtended && middleFolded && ringFolded && pinkyFolded) {
      const deltaX = indexTip.x - wrist.x;
      const deltaY = indexTip.y - wrist.y;
      
      // Determine primary direction
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return deltaX > 0 ? 'right' : 'left';
      } else {
        return deltaY < 0 ? 'up' : 'down';
      }
    }

    return null;
  }

  /**
   * Start camera and vision processing
   */
  async startCamera() {
    try {
      if (this.isActive) {
        Utils.log('vision', 'Camera already active');
        return true;
      }

      // Check for camera support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported by this browser');
      }

      // Get video element
      this.video = document.getElementById('camera-video');
      if (!this.video) {
        throw new Error('Video element not found');
      }

      // Get canvas element for overlay
      this.canvas = document.getElementById('gesture-canvas');
      if (this.canvas) {
        this.ctx = this.canvas.getContext('2d');
      }

      // Request camera access
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user' // Front camera preferred
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;

      // Wait for video to load
      await new Promise((resolve, reject) => {
        this.video.onloadedmetadata = () => {
          this.video.play()
            .then(resolve)
            .catch(reject);
        };
        this.video.onerror = reject;
      });

      // Set canvas size to match video
      if (this.canvas) {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
      }

      this.isActive = true;
      this.startProcessing();

      Utils.log('vision', 'Camera started successfully');
      this.updateCameraStatus(true);
      
      return true;

    } catch (error) {
      console.error('Failed to start camera:', error);
      Utils.handleError(error, 'Camera start');
      this.updateCameraStatus(false, error.message);
      return false;
    }
  }

  /**
   * Stop camera and vision processing
   */
  stopCamera() {
    try {
      this.isActive = false;
      this.isProcessing = false;

      // Stop video stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      // Clear video source
      if (this.video) {
        this.video.srcObject = null;
      }

      // Clear canvas
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }

      Utils.log('vision', 'Camera stopped');
      this.updateCameraStatus(false);
      this.updateGestureStatus(null);

    } catch (error) {
      console.error('Error stopping camera:', error);
      Utils.handleError(error, 'Camera stop');
    }
  }

  /**
   * Start gesture processing loop
   */
  startProcessing() {
    if (!this.isActive) return;

    this.isProcessing = true;
    this.processFrame();
  }

  /**
   * Process video frame for gesture detection
   */
  processFrame() {
    if (!this.isActive || !this.isProcessing) return;

    try {
      if (this.useMediaPipe && this.hands) {
        // Send frame to MediaPipe
        this.hands.send({ image: this.video });
      } else {
        // Use basic detection
        this.detectGestures();
      }

      // Continue processing
      requestAnimationFrame(() => this.processFrame());

    } catch (error) {
      console.error('Error processing frame:', error);
      // Continue processing despite errors
      requestAnimationFrame(() => this.processFrame());
    }
  }

  /**
   * Enhanced gesture detection with basic computer vision
   * Uses motion detection and simple heuristics
   */
  detectGestures() {
    if (!this.video || !this.ctx) return;

    try {
      // Get video frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = this.video.videoWidth;
      canvas.height = this.video.videoHeight;
      
      if (canvas.width === 0 || canvas.height === 0) return;
      
      // Draw current frame
      ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
      
      // Get image data for analysis
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Perform basic gesture detection based on motion and position
      this.analyzeFrame(imageData);
      
      // Fallback: Set up click gestures for testing
      this.setupClickGestures();
      
    } catch (error) {
      console.warn('Error in gesture detection:', error);
      // Fallback to click gestures
      this.setupClickGestures();
    }
  }

  /**
   * Analyze frame for gesture detection
   */
  analyzeFrame(imageData) {
    // Store previous frame for motion detection
    if (!this.previousFrame) {
      this.previousFrame = new Uint8ClampedArray(imageData.data);
      return;
    }

    // Basic motion detection
    let motionPixels = 0;
    let totalPixels = 0;
    let centroidX = 0;
    let centroidY = 0;
    
    const data = imageData.data;
    const prevData = this.previousFrame;
    const width = imageData.width;
    const height = imageData.height;
    
    // Analyze pixel differences for motion
    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      
      // Calculate brightness difference
      const currentBrightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const prevBrightness = (prevData[i] + prevData[i + 1] + prevData[i + 2]) / 3;
      const diff = Math.abs(currentBrightness - prevBrightness);
      
      if (diff > 30) { // Motion threshold
        motionPixels++;
        centroidX += x;
        centroidY += y;
      }
      totalPixels++;
    }
    
    // Calculate motion centroid
    if (motionPixels > 100) { // Minimum motion required
      centroidX /= motionPixels;
      centroidY /= motionPixels;
      
      // Detect gesture based on centroid position and movement
      this.detectGestureFromMotion(centroidX, centroidY, width, height, motionPixels);
    }
    
    // Store current frame for next comparison
    this.previousFrame = new Uint8ClampedArray(data);
  }

  /**
   * Detect gesture from motion analysis
   */
  detectGestureFromMotion(centroidX, centroidY, width, height, motionIntensity) {
    // Store motion history for gesture detection
    if (!this.motionHistory) {
      this.motionHistory = [];
    }
    
    this.motionHistory.push({
      x: centroidX,
      y: centroidY,
      intensity: motionIntensity,
      timestamp: Date.now()
    });
    
    // Keep only recent history
    const maxHistoryTime = 2000; // 2 seconds
    const currentTime = Date.now();
    this.motionHistory = this.motionHistory.filter(
      point => currentTime - point.timestamp < maxHistoryTime
    );
    
    // Need at least 10 points for gesture detection
    if (this.motionHistory.length < 10) return;
    
    // Analyze motion pattern for gestures
    const recentPoints = this.motionHistory.slice(-10);
    const firstPoint = recentPoints[0];
    const lastPoint = recentPoints[recentPoints.length - 1];
    
    const deltaX = lastPoint.x - firstPoint.x;
    const deltaY = lastPoint.y - firstPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Minimum movement threshold
    if (distance < 50) return;
    
    // Determine gesture direction
    let gesture = null;
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    
    if (Math.abs(angle) < 30) {
      gesture = 'right';
    } else if (Math.abs(angle - 180) < 30 || Math.abs(angle + 180) < 30) {
      gesture = 'left';
    } else if (angle > 60 && angle < 120) {
      gesture = 'down';
    } else if (angle < -60 && angle > -120) {
      gesture = 'up';
    }
    
    if (gesture && motionIntensity > 200) {
      // Calculate confidence based on motion intensity and consistency
      const confidence = Math.min(0.9, motionIntensity / 500);
      this.processGesture(gesture, confidence);
      
      // Clear history after successful detection
      this.motionHistory = [];
    }
  }

  /**
   * Setup click gestures for testing (temporary solution)
   */
  setupClickGestures() {
    if (this.video && !this.video.hasAttribute('data-click-setup')) {
      this.video.setAttribute('data-click-setup', 'true');
      
      let gestureIndex = 0;
      const gestures = ['up', 'right', 'down', 'left'];
      
      this.video.addEventListener('click', (e) => {
        e.preventDefault();
        const gesture = gestures[gestureIndex % gestures.length];
        gestureIndex++;
        
        // Show visual feedback on click
        this.showGestureIndicator(gesture);
        this.processGesture(gesture, 1.0);
      });

      // Add visual instructions
      this.addClickInstructions();
    }
  }

  /**
   * Add click instructions overlay
   */
  addClickInstructions() {
    if (!this.video) return;

    const instructionsDiv = document.createElement('div');
    instructionsDiv.className = 'click-instructions';
    instructionsDiv.innerHTML = `
      <div class="click-instruction-content">
        <p><strong>Testing Mode:</strong> Click on the camera view to simulate gestures</p>
        <p>Gestures cycle: Up → Right → Down → Left</p>
      </div>
    `;

    instructionsDiv.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 20;
    `;

    const cameraContainer = this.video.parentElement;
    if (cameraContainer && !cameraContainer.querySelector('.click-instructions')) {
      cameraContainer.style.position = 'relative';
      cameraContainer.appendChild(instructionsDiv);

      // Auto-hide after 5 seconds
      setTimeout(() => {
        if (instructionsDiv.parentElement) {
          instructionsDiv.style.opacity = '0';
          instructionsDiv.style.transition = 'opacity 0.5s';
          setTimeout(() => {
            if (instructionsDiv.parentElement) {
              instructionsDiv.remove();
            }
          }, 500);
        }
      }, 5000);
    }
  }

  /**
   * Show gesture indicator on canvas
   */
  showGestureIndicator(gesture) {
    if (!this.ctx) return;

    // Clear previous drawings
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw gesture indicator
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const size = 100;

    this.ctx.fillStyle = 'rgba(40, 167, 69, 0.8)';
    this.ctx.strokeStyle = 'rgba(40, 167, 69, 1)';
    this.ctx.lineWidth = 3;

    // Draw arrow based on gesture
    this.ctx.beginPath();
    switch (gesture) {
      case 'up':
        this.ctx.moveTo(centerX, centerY + size/2);
        this.ctx.lineTo(centerX, centerY - size/2);
        this.ctx.lineTo(centerX - 20, centerY - size/2 + 20);
        this.ctx.moveTo(centerX, centerY - size/2);
        this.ctx.lineTo(centerX + 20, centerY - size/2 + 20);
        break;
      case 'down':
        this.ctx.moveTo(centerX, centerY - size/2);
        this.ctx.lineTo(centerX, centerY + size/2);
        this.ctx.lineTo(centerX - 20, centerY + size/2 - 20);
        this.ctx.moveTo(centerX, centerY + size/2);
        this.ctx.lineTo(centerX + 20, centerY + size/2 - 20);
        break;
      case 'left':
        this.ctx.moveTo(centerX + size/2, centerY);
        this.ctx.lineTo(centerX - size/2, centerY);
        this.ctx.lineTo(centerX - size/2 + 20, centerY - 20);
        this.ctx.moveTo(centerX - size/2, centerY);
        this.ctx.lineTo(centerX - size/2 + 20, centerY + 20);
        break;
      case 'right':
        this.ctx.moveTo(centerX - size/2, centerY);
        this.ctx.lineTo(centerX + size/2, centerY);
        this.ctx.lineTo(centerX + size/2 - 20, centerY - 20);
        this.ctx.moveTo(centerX + size/2, centerY);
        this.ctx.lineTo(centerX + size/2 - 20, centerY + 20);
        break;
    }
    this.ctx.stroke();

    // Add gesture label
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(gesture.toUpperCase(), centerX, centerY + size + 40);

    // Clear after animation
    setTimeout(() => {
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }, 1000);
  }

  /**
   * Process detected gesture
   */
  processGesture(gesture, confidence) {
    const currentTime = Date.now();

    // Check confidence threshold
    if (confidence < this.minConfidence) {
      return;
    }

    // Check cooldown period
    if (currentTime - this.lastGestureTime < this.gestureCooldown) {
      return;
    }

    // Update gesture status
    this.updateGestureStatus(gesture);

    // Execute gesture callback
    if (this.onGestureDetected) {
      this.onGestureDetected(gesture, confidence);
    }

    this.lastGestureTime = currentTime;
    Utils.log('vision', `Gesture detected: ${gesture} (confidence: ${confidence.toFixed(2)})`);
  }

  /**
   * Update camera status indicator
   */
  updateCameraStatus(isActive, error = null) {
    const indicator = document.getElementById('camera-indicator');
    if (!indicator) return;

    const statusDot = indicator.querySelector('.status-dot');
    const statusText = indicator.querySelector('.status-text');

    if (isActive) {
      indicator.classList.add('active');
      statusText.textContent = 'Camera Active';
    } else {
      indicator.classList.remove('active');
      statusText.textContent = error ? `Camera Error: ${error}` : 'Camera Off';
    }

    // Update button states
    const startButton = document.getElementById('start-camera');
    const stopButton = document.getElementById('stop-camera');
    
    if (startButton) startButton.disabled = isActive;
    if (stopButton) stopButton.disabled = !isActive;

    // Notify callback
    if (this.onCameraStatusChange) {
      this.onCameraStatusChange(isActive, error);
    }
  }

  /**
   * Update gesture status indicator
   */
  updateGestureStatus(gesture) {
    const indicator = document.getElementById('gesture-indicator');
    if (!indicator) return;

    const statusText = indicator.querySelector('.status-text');

    if (gesture) {
      indicator.classList.add('active');
      statusText.textContent = `Gesture: ${gesture.toUpperCase()}`;
      
      // Auto-clear after delay
      setTimeout(() => {
        indicator.classList.remove('active');
        statusText.textContent = 'No Gesture';
      }, 2000);
    } else {
      indicator.classList.remove('active');
      statusText.textContent = 'No Gesture';
    }
  }

  /**
   * Set gesture detection callback
   */
  setGestureCallback(callback) {
    this.onGestureDetected = callback;
  }

  /**
   * Set camera status callback
   */
  setCameraStatusCallback(callback) {
    this.onCameraStatusChange = callback;
  }

  /**
   * Check if camera is supported
   */
  static isCameraSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Check if HTTPS is required
   */
  static requiresHTTPS() {
    return location.protocol !== 'https:' && location.hostname !== 'localhost';
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopCamera();
    this.onGestureDetected = null;
    this.onCameraStatusChange = null;
    
    // Remove click instructions if present
    const instructions = document.querySelector('.click-instructions');
    if (instructions) {
      instructions.remove();
    }
    
    Utils.log('vision', 'Vision handler destroyed');
  }
}

// Make VisionHandler available globally
if (typeof window !== 'undefined') {
  window.VisionHandler = VisionHandler;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VisionHandler;
}
