/**
 * Enhanced Logging and Error Handling System for Fancy2048
 * Provides structured logging, error tracking, and performance monitoring
 */

class Logger {
  constructor() {
    this.isDevelopment = this.checkDevelopmentMode();
    this.logLevel = this.isDevelopment ? 'debug' : 'warn';
    this.errorCount = 0;
    this.performanceMetrics = new Map();
    this.maxLogEntries = 100;
    this.logHistory = [];
    
    // Performance monitoring
    this.gameMetrics = {
      frameDrops: 0,
      longTasks: 0,
      memoryUsage: 0,
      lastGCTime: Date.now()
    };
    
    this.setupErrorHandling();
    this.setupPerformanceMonitoring();
  }

  checkDevelopmentMode() {
    return location.hostname === 'localhost' || 
           location.hostname.includes('127.0.0.1') || 
           location.search.includes('debug=true') ||
           localStorage.getItem('fancy2048_debug') === 'true';
  }

  // Structured logging with levels
  log(level, category, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      category,
      message,
      data,
      stack: level === 'error' ? (new Error()).stack : null
    };

    // Add to history with rotation
    this.logHistory.push(logEntry);
    if (this.logHistory.length > this.maxLogEntries) {
      this.logHistory.shift();
    }

    // Console output based on log level
    if (this.shouldLog(level)) {
      const emoji = this.getLevelEmoji(level);
      const formattedMessage = `${emoji} [${category}] ${message}`;
      
      switch (level) {
        case 'error':
          console.error(formattedMessage, data);
          this.errorCount++;
          break;
        case 'warn':
          console.warn(formattedMessage, data);
          break;
        case 'info':
          console.info(formattedMessage, data);
          break;
        case 'debug':
          console.log(formattedMessage, data);
          break;
      }
    }

    // Send critical errors to error tracking service (if configured)
    if (level === 'error' && window.errorTracker) {
      window.errorTracker.captureException(message, data);
    }
  }

  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.logLevel] || 2;
    return levels[level] >= currentLevel;
  }

  getLevelEmoji(level) {
    const emojis = {
      debug: '🔍',
      info: '📘', 
      warn: '⚠️',
      error: '❌'
    };
    return emojis[level] || '📝';
  }

  // Convenience methods
  debug(category, message, data) { this.log('debug', category, message, data); }
  info(category, message, data) { this.log('info', category, message, data); }
  warn(category, message, data) { this.log('warn', category, message, data); }
  error(category, message, data) { this.log('error', category, message, data); }

  // Performance tracking
  startTimer(name) {
    this.performanceMetrics.set(name, { start: performance.now() });
  }

  endTimer(name) {
    const metric = this.performanceMetrics.get(name);
    if (metric) {
      const duration = performance.now() - metric.start;
      metric.duration = duration;
      
      if (this.isDevelopment && duration > 16) { // Frame budget exceeded
        this.warn('Performance', `Long task detected: ${name} took ${duration.toFixed(2)}ms`);
        this.gameMetrics.longTasks++;
      }
      
      return duration;
    }
    return 0;
  }

  // Memory monitoring
  checkMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      this.gameMetrics.memoryUsage = memory.usedJSHeapSize;
      
      // Warn if memory usage is high
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
        this.warn('Memory', 'High memory usage detected', {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
        });
      }
    }
  }

  // Error handling setup
  setupErrorHandling() {
    window.addEventListener('error', (event) => {
      this.error('Global', 'Unhandled error', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('Promise', 'Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  // Performance monitoring setup
  setupPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      try {
        // Monitor long tasks
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              this.gameMetrics.longTasks++;
              this.warn('Performance', `Long task: ${entry.duration.toFixed(2)}ms`);
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });

        // Monitor frame drops
        let lastFrameTime = performance.now();
        const checkFrame = () => {
          const now = performance.now();
          const frameDuration = now - lastFrameTime;
          
          if (frameDuration > 20) { // Dropped frame threshold
            this.gameMetrics.frameDrops++;
          }
          
          lastFrameTime = now;
          requestAnimationFrame(checkFrame);
        };
        
        if (this.isDevelopment) {
          requestAnimationFrame(checkFrame);
        }
        
      } catch (e) {
        this.warn('Performance', 'Could not setup performance monitoring', e);
      }
    }

    // Periodic memory checks
    setInterval(() => this.checkMemoryUsage(), 30000); // Every 30 seconds
  }

  // Export logs for debugging
  exportLogs() {
    const exportData = {
      gameMetrics: this.gameMetrics,
      errorCount: this.errorCount,
      logHistory: this.logHistory,
      performanceMetrics: Array.from(this.performanceMetrics.entries()),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `fancy2048-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Get current statistics
  getStats() {
    return {
      logLevel: this.logLevel,
      errorCount: this.errorCount,
      gameMetrics: { ...this.gameMetrics },
      logHistoryLength: this.logHistory.length,
      isDevelopment: this.isDevelopment
    };
  }

  // Clean up resources
  cleanup() {
    this.logHistory = [];
    this.performanceMetrics.clear();
  }
}

// Global logger instance
window.gameLogger = new Logger();

// Convenience global functions
window.logGame = {
  debug: (category, message, data) => window.gameLogger.debug(category, message, data),
  info: (category, message, data) => window.gameLogger.info(category, message, data),
  warn: (category, message, data) => window.gameLogger.warn(category, message, data),
  error: (category, message, data) => window.gameLogger.error(category, message, data),
  startTimer: (name) => window.gameLogger.startTimer(name),
  endTimer: (name) => window.gameLogger.endTimer(name),
  exportLogs: () => window.gameLogger.exportLogs(),
  getStats: () => window.gameLogger.getStats()
};
