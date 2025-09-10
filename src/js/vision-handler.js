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
    
    // Gesture cooldown to prevent rapid fire (reduced for finger tracking)
    this.lastGestureTime = 0;
    this.gestureCooldown = 800; // 0.8 seconds between gestures for more responsive control
    
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
   * Draw simplified hand visualization focusing on index finger
   */
  drawHandLandmarks(landmarks) {
    const ctx = this.ctx;
    const canvas = this.canvas;

    // Draw only index finger line for reference
    ctx.strokeStyle = 'rgba(40, 167, 69, 0.4)';
    ctx.lineWidth = 2;

    // Index finger connections: wrist -> mcp -> pip -> dip -> tip
    const indexConnections = [
      [0, 5], // wrist to mcp
      [5, 6], // mcp to pip  
      [6, 7], // pip to dip
      [7, 8]  // dip to tip
    ];

    indexConnections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      
      ctx.beginPath();
      ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
      ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
      ctx.stroke();
    });

    // Draw only key landmarks with different sizes
    const keyLandmarks = [
      { index: 0, size: 4, color: 'rgba(40, 167, 69, 0.6)' },   // wrist
      { index: 5, size: 5, color: 'rgba(40, 167, 69, 0.7)' },   // index mcp
      { index: 8, size: 10, color: 'rgba(255, 193, 7, 0.9)' }   // index tip (highlighted)
    ];

    keyLandmarks.forEach(({ index, size, color }) => {
      const landmark = landmarks[index];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(
        landmark.x * canvas.width, 
        landmark.y * canvas.height, 
        size,
        0, 
        2 * Math.PI
      );
      ctx.fill();
    });

    // Add text label for index finger tip
    const indexTip = landmarks[8];
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      'INDEX', 
      indexTip.x * canvas.width, 
      indexTip.y * canvas.height - 20
    );
  }

  /**
   * Track finger position and detect movement gestures
   */
  classifyGestureFromLandmarks(landmarks) {
    // Get index finger tip position (landmark 8)
    const indexTip = landmarks[8];
    const currentTime = Date.now();
    
    // Store finger position history
    if (!this.fingerHistory) {
      this.fingerHistory = [];
    }
    
    // Add current position
    this.fingerHistory.push({
      x: indexTip.x,
      y: indexTip.y,
      timestamp: currentTime
    });
    
    // Keep only recent positions (last 800ms for more responsive tracking)
    const historyDuration = 800;
    this.fingerHistory = this.fingerHistory.filter(
      pos => currentTime - pos.timestamp < historyDuration
    );
    
    // Draw finger tracking indicator
    this.drawFingerTracker(indexTip);
    
    // Need at least 8 positions for movement detection (more responsive)
    if (this.fingerHistory.length < 8) {
      return null;
    }
    
    // Analyze movement pattern
    return this.detectMovementFromHistory();
  }
  
  /**
   * Draw finger tracking indicator on canvas
   */
  drawFingerTracker(indexTip) {
    if (!this.ctx || !this.canvas) return;
    
    const x = indexTip.x * this.canvas.width;
    const y = indexTip.y * this.canvas.height;
    
    // Clear previous drawings
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw finger position indicator
    this.ctx.fillStyle = 'rgba(40, 167, 69, 0.8)';
    this.ctx.strokeStyle = 'rgba(40, 167, 69, 1)';
    this.ctx.lineWidth = 3;
    
    // Draw main tracking circle with pulsing effect
    const pulseScale = 1 + 0.3 * Math.sin(Date.now() * 0.01);
    const radius = 18 * pulseScale;
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Draw inner dot
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Draw crosshair for precise positioning
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x - 12, y);
    this.ctx.lineTo(x + 12, y);
    this.ctx.moveTo(x, y - 12);
    this.ctx.lineTo(x, y + 12);
    this.ctx.stroke();
    
    // Draw movement trail if available
    if (this.fingerHistory && this.fingerHistory.length > 5) {
      this.drawMovementTrail();
    }
    
    // Draw directional indicator
    this.drawDirectionalIndicator(x, y);
  }
  
  /**
   * Draw movement trail
   */
  drawMovementTrail() {
    if (this.fingerHistory.length < 2) return;
    
    this.ctx.strokeStyle = 'rgba(40, 167, 69, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    const recentPoints = this.fingerHistory.slice(-10);
    const firstPoint = recentPoints[0];
    this.ctx.moveTo(
      firstPoint.x * this.canvas.width,
      firstPoint.y * this.canvas.height
    );
    
    for (let i = 1; i < recentPoints.length; i++) {
      const point = recentPoints[i];
      this.ctx.lineTo(
        point.x * this.canvas.width,
        point.y * this.canvas.height
      );
    }
    
    this.ctx.stroke();
  }
  
  /**
   * Draw directional indicator around finger
   */
  drawDirectionalIndicator(x, y) {
    if (!this.lastDetectedDirection) return;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    
    const arrowLength = 30;
    let endX = x, endY = y;
    
    switch (this.lastDetectedDirection) {
      case 'up':
        endX = x;
        endY = y - arrowLength;
        break;
      case 'down':
        endX = x;
        endY = y + arrowLength;
        break;
      case 'left':
        endX = x - arrowLength;
        endY = y;
        break;
      case 'right':
        endX = x + arrowLength;
        endY = y;
        break;
    }
    
    // Draw arrow
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(endX, endY);
    
    // Draw arrowhead
    const headSize = 10;
    const angle = Math.atan2(endY - y, endX - x);
    this.ctx.lineTo(
      endX - headSize * Math.cos(angle - Math.PI / 6),
      endY - headSize * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - headSize * Math.cos(angle + Math.PI / 6),
      endY - headSize * Math.sin(angle + Math.PI / 6)
    );
    
    this.ctx.stroke();
  }
  
  /**
   * Detect movement direction from finger position history
   */
  detectMovementFromHistory() {
    if (this.fingerHistory.length < 10) return null;
    
    // Get recent positions for analysis
    const recentPoints = this.fingerHistory.slice(-10);
    const startPoint = recentPoints[0];
    const endPoint = recentPoints[recentPoints.length - 1];
    
    // Calculate movement vector
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Minimum movement threshold (more sensitive for finger tracking)
    const minMovement = 0.03; // 3% of screen dimension
    
    if (distance < minMovement) {
      return null;
    }
    
    // Determine primary direction
    let direction = null;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }
    
    // Store for visual indicator
    this.lastDetectedDirection = direction;
    
    // Check for consistent movement in the same direction
    const consistency = this.checkMovementConsistency(direction);
    
    if (consistency > 0.6) { // 60% consistency required (more forgiving)
      return direction;
    }
    
    return null;
  }
  
  /**
   * Check movement consistency in detected direction
   */
  checkMovementConsistency(direction) {
    if (this.fingerHistory.length < 8) return 0;
    
    const points = this.fingerHistory.slice(-8);
    let consistentMoves = 0;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      
      let moveDirection = null;
      if (Math.abs(dx) > Math.abs(dy)) {
        moveDirection = dx > 0 ? 'right' : 'left';
      } else {
        moveDirection = dy > 0 ? 'down' : 'up';
      }
      
      if (moveDirection === direction) {
        consistentMoves++;
      }
    }
    
    return consistentMoves / (points.length - 1);
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
        <p><strong>Finger Tracking Active!</strong></p>
        <p>Hold up your index finger and move it to control the game</p>
        <p><em>Testing: Click camera to simulate movements (Up → Right → Down → Left)</em></p>
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
