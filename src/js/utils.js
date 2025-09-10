/**
 * Fancy2048 - Utility Functions
 * Core utility functions used throughout the application
 */

const Utils = {
  /**
   * Generate a unique ID
   */
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  },

  /**
   * Format a number with commas
   */
  formatNumber(num) {
    return new Intl.NumberFormat().format(num);
  },

  /**
   * Format time duration in a human readable way
   */
  formatTime(seconds) {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}:${minutes.toString().padStart(2, '0')}:00`;
    }
  },

  /**
   * Format date for display
   */
  formatDate(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options })
      .format(new Date(date));
  },

  /**
   * Deep clone an object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }
    
    if (typeof obj === 'object') {
      const cloned = {};
      Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone(obj[key]);
      });
      return cloned;
    }
  },

  /**
   * Debounce a function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle a function
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Check if device supports touch
   */
  isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  /**
   * Check if device is mobile
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  /**
   * Get random integer between min and max (inclusive)
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Shuffle an array using Fisher-Yates algorithm
   */
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * Calculate percentage with proper rounding
   */
  percentage(part, total) {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  },

  /**
   * Clamp a number between min and max
   */
  clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  },

  /**
   * Linear interpolation between two values
   */
  lerp(start, end, factor) {
    return start + (end - start) * factor;
  },

  /**
   * Animate a value over time using requestAnimationFrame
   */
  animate(duration, callback, easing = t => t) {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
      // In Node.js environment, just call the callback immediately with completion
      callback(1);
      return;
    }
    
    const start = performance.now();
    
    const frame = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);
      
      callback(easedProgress);
      
      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };
    
    requestAnimationFrame(frame);
  },

  /**
   * Common easing functions
   */
  easing: {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    bounceOut: t => {
      if (t < 1/2.75) {
        return 7.5625 * t * t;
      } else if (t < 2/2.75) {
        return 7.5625 * (t -= 1.5/2.75) * t + 0.75;
      } else if (t < 2.5/2.75) {
        return 7.5625 * (t -= 2.25/2.75) * t + 0.9375;
      } else {
        return 7.5625 * (t -= 2.625/2.75) * t + 0.984375;
      }
    }
  },

  /**
   * Create a promise that resolves after a delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Log messages with timestamp and category
   */
  log(category, message, data = null) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `[${timestamp}] [${category.toUpperCase()}]`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  },

  /**
   * Handle errors gracefully
   */
  handleError(error, context = 'Unknown') {
    this.log('error', `Error in ${context}: ${error.message}`, error);
    
    // In production, you might want to send errors to a logging service
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
  },

  /**
   * Check if localStorage is available
   */
  isStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Haptic feedback for mobile devices
   */
  vibrate(pattern = 10) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  },

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      }
    } catch (error) {
      this.handleError(error, 'copyToClipboard');
      return false;
    }
  },

  /**
   * Share content using Web Share API with fallback
   */
  async share(data) {
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(data)) {
        await navigator.share(data);
        return true;
      } else {
        // Fallback: copy to clipboard
        const shareText = `${data.title}\n${data.text}\n${data.url}`;
        return await this.copyToClipboard(shareText);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        this.handleError(error, 'share');
      }
      return false;
    }
  }
};

// Make Utils available globally
if (typeof window !== 'undefined') {
  window.Utils = Utils;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
