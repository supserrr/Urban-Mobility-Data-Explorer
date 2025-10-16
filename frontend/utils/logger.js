/**
 * Frontend Logger Utility
 * 
 * Provides conditional logging for development vs production environments.
 * In production, logs are suppressed or sent to a monitoring service.
 * 
 * @module utils/logger
 */

/**
 * Logger configuration
 */
const LoggerConfig = {
    // Enable logging in development mode
    enabled: window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1' ||
             window.location.search.includes('debug=true'),
    
    // Log levels
    levels: {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
    },
    
    // Current log level (can be set via URL param: ?loglevel=debug)
    currentLevel: (() => {
        const urlParams = new URLSearchParams(window.location.search);
        const level = urlParams.get('loglevel');
        
        switch (level) {
            case 'error': return 0;
            case 'warn': return 1;
            case 'info': return 2;
            case 'debug': return 3;
            default: return 2; // INFO by default
        }
    })()
};

/**
 * Frontend Logger Class
 * 
 * Usage:
 *   import { logger } from './utils/logger.js';
 *   logger.info('Application started');
 *   logger.error('Failed to load data', error);
 *   logger.debug('Current state:', state);
 */
class FrontendLogger {
    constructor(config = LoggerConfig) {
        this.config = config;
    }
    
    /**
     * Log error message
     * 
     * @param {string} message - Error message
     * @param {...any} args - Additional arguments
     */
    error(message, ...args) {
        if (this.config.enabled && this.config.currentLevel >= this.config.levels.ERROR) {
            console.error(`[ERROR] ${this.timestamp()} ${message}`, ...args);
            
            // In production, send to monitoring service
            this.sendToMonitoring('error', message, args);
        }
    }
    
    /**
     * Log warning message
     * 
     * @param {string} message - Warning message
     * @param {...any} args - Additional arguments
     */
    warn(message, ...args) {
        if (this.config.enabled && this.config.currentLevel >= this.config.levels.WARN) {
            console.warn(`[WARN] ${this.timestamp()} ${message}`, ...args);
        }
    }
    
    /**
     * Log info message
     * 
     * @param {string} message - Info message
     * @param {...any} args - Additional arguments
     */
    info(message, ...args) {
        if (this.config.enabled && this.config.currentLevel >= this.config.levels.INFO) {
            console.log(`[INFO] ${this.timestamp()} ${message}`, ...args);
        }
    }
    
    /**
     * Log debug message
     * 
     * @param {string} message - Debug message
     * @param {...any} args - Additional arguments
     */
    debug(message, ...args) {
        if (this.config.enabled && this.config.currentLevel >= this.config.levels.DEBUG) {
            console.log(`[DEBUG] ${this.timestamp()} ${message}`, ...args);
        }
    }
    
    /**
     * Log API call
     * 
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Request parameters
     */
    api(method, endpoint, params = {}) {
        this.debug(`API ${method} ${endpoint}`, params);
    }
    
    /**
     * Log performance metric
     * 
     * @param {string} operation - Operation name
     * @param {number} duration - Duration in milliseconds
     */
    performance(operation, duration) {
        this.debug(`Performance: ${operation} took ${duration}ms`);
    }
    
    /**
     * Create a timer
     * 
     * @param {string} label - Timer label
     * @returns {Function} - Function to stop timer and log duration
     */
    timer(label) {
        const start = Date.now();
        return () => {
            const duration = Date.now() - start;
            this.performance(label, duration);
            return duration;
        };
    }
    
    /**
     * Log a group of related messages
     * 
     * @param {string} groupName - Group name
     * @param {Function} callback - Callback containing log statements
     */
    group(groupName, callback) {
        if (this.config.enabled) {
            console.group(groupName);
            callback();
            console.groupEnd();
        }
    }
    
    /**
     * Log a table of data
     * 
     * @param {Array|Object} data - Data to display as table
     * @param {Array} columns - Column names to display
     */
    table(data, columns = null) {
        if (this.config.enabled) {
            if (columns) {
                console.table(data, columns);
            } else {
                console.table(data);
            }
        }
    }
    
    /**
     * Get current timestamp
     * 
     * @returns {string} - Formatted timestamp
     */
    timestamp() {
        const now = new Date();
        return now.toISOString();
    }
    
    /**
     * Send logs to monitoring service (production only)
     * 
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {Array} args - Additional arguments
     */
    sendToMonitoring(level, message, args) {
        // Only send errors in production
        if (!this.config.enabled && level === 'error') {
            // In production, send to monitoring service like:
            // - Sentry
            // - LogRocket
            // - DataDog
            // - Custom logging endpoint
            
            // Example:
            // fetch('/api/logs', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({
            //         level,
            //         message,
            //         timestamp: new Date().toISOString(),
            //         userAgent: navigator.userAgent,
            //         url: window.location.href,
            //         args: JSON.stringify(args)
            //     })
            // }).catch(() => {}); // Fail silently
        }
    }
    
    /**
     * Enable or disable logging
     * 
     * @param {boolean} enabled - Whether to enable logging
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
    }
    
    /**
     * Set log level
     * 
     * @param {string} level - Log level (error, warn, info, debug)
     */
    setLevel(level) {
        if (this.config.levels[level.toUpperCase()] !== undefined) {
            this.config.currentLevel = this.config.levels[level.toUpperCase()];
        }
    }
}

/**
 * Singleton logger instance
 */
const logger = new FrontendLogger();

/**
 * Development-only console wrapper
 * Use this for logs that should ONLY appear in development
 * 
 * @deprecated Use logger.debug() instead
 */
const devLog = (...args) => {
    if (LoggerConfig.enabled) {
        console.log('[DEV]', ...args);
    }
};

/**
 * Performance monitoring wrapper
 * 
 * @param {string} label - Performance label
 * @returns {Function} - Function to end measurement
 */
const measurePerformance = (label) => {
    const start = performance.now();
    return () => {
        const duration = performance.now() - start;
        logger.performance(label, Math.round(duration));
    };
};

// Export logger and utilities
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { logger, devLog, measurePerformance };
}

// Make available globally for non-module usage
if (typeof window !== 'undefined') {
    window.logger = logger;
    window.devLog = devLog;
    window.measurePerformance = measurePerformance;
}

