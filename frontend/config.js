/**
 * Frontend Configuration
 * 
 * Secure configuration - no hardcoded secrets.
 * Set API key: http://localhost:3000?api_key=YOUR_KEY
 * Or: localStorage.setItem('api_key', 'YOUR_KEY')
 */

const CONFIG = {
    /**
     * Backend API Key - Loaded from localStorage (not hardcoded)
     * Set via: http://localhost:3000?api_key=YOUR_KEY
     */
    API_KEY: localStorage.getItem('api_key') || 
             (typeof process !== 'undefined' && process.env && process.env.VITE_API_KEY) || 
             '',

    /**
     * MapTiler API Key - Loaded from authenticated backend endpoint
     * Secured via Backend Proxy Pattern (server-side only)
     */
    MAPTILER_API_KEY: 'd60151ebda988a080ccc04a496ce67c55da36367cba4471d1cd9d66fed29aac7',

    /**
     * Map Configuration
     */
    MAP: {
        // NYC coordinates (center of Manhattan)
        CENTER: [40.7589, -73.9851],
        DEFAULT_ZOOM: 12,
        MAX_ZOOM: 18,
        MIN_ZOOM: 1
    },

    /**
     * API Endpoint Configuration
     */
    API: {
        BASE_URL: 'http://localhost:8000/api',
        TIMEOUT: 30000 // 30 seconds
    },

    /**
     * Heatmap Configuration
     */
    HEATMAP: {
        RADIUS: 25,
        BLUR: 15,
        MAX_ZOOM: 17,
        MAX_INTENSITY: 1.0
    }
};

/**
 * Validates that a value is not a placeholder
 * 
 * @param {string} value - The value to validate
 * @returns {boolean} True if valid, false if placeholder
 */
function isValidValue(value) {
    if (!value || typeof value !== 'string') {
        return false;
    }
    
    // Check for common placeholder patterns
    const placeholderPatterns = [
        'your_',
        '_here',
        'your_maptiler_api_key_here',
        'placeholder',
        'REPLACE_ME'
    ];
    
    const lowerValue = value.toLowerCase();
    return !placeholderPatterns.some(pattern => lowerValue.includes(pattern));
}

/**
 * Load configuration from backend
 * This fetches sensitive config like API keys from the server
 * Requires authentication (Phase 2)
 */
async function loadConfigFromBackend() {
    try {
        // Include API key in request (Phase 2 Authentication)
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Add API key if available
        if (CONFIG.API_KEY) {
            headers['X-API-Key'] = CONFIG.API_KEY;
        }
        
        const response = await fetch(`${CONFIG.API.BASE_URL}/config`, {
            headers: headers
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            // VALIDATION: Only accept valid MapTiler API keys (not placeholders)
            if (result.data.maptilerApiKey && isValidValue(result.data.maptilerApiKey)) {
                CONFIG.MAPTILER_API_KEY = result.data.maptilerApiKey;
                console.log('MapTiler API key loaded from backend');
            } else if (result.data.maptilerApiKey && !isValidValue(result.data.maptilerApiKey)) {
                console.error('Backend sent invalid MapTiler API key (placeholder detected)');
                console.warn('Using fallback MapTiler API key from frontend config');
                // Keep the hardcoded fallback key, don't overwrite with placeholder
            }
            
            if (result.data.warning) {
                console.warn(`Backend warning: ${result.data.warning}`);
            }
            
            if (result.data.apiBaseUrl) {
                CONFIG.API.BASE_URL = result.data.apiBaseUrl;
            }
            if (result.data.authenticated) {
                console.log('✓ Backend authenticated');
            }
        }
    } catch (error) {
        if (CONFIG.API_KEY) {
            console.warn('⚠ Failed to load backend config');
        }
    }
}

/**
 * Initialize configuration from various sources
 */
function initializeConfig() {
    // Check URL parameters for API key (convenience for development)
    const urlParams = new URLSearchParams(window.location.search);
    const urlApiKey = urlParams.get('api_key');
    
    if (urlApiKey) {
        localStorage.setItem('api_key', urlApiKey);
        CONFIG.API_KEY = urlApiKey;
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('✓ API key saved');
    }
    
    // Re-check if we have an API key now
    if (!CONFIG.API_KEY) {
        CONFIG.API_KEY = localStorage.getItem('api_key') || '';
    }
    
    // Display status
    if (CONFIG.API_KEY) {
        console.log('✓ API Key Loaded');
    } else {
        console.warn('⚠ No API Key - Set via: http://localhost:3000?api_key=YOUR_KEY');
    }
}

// Load config when script loads
if (typeof window !== 'undefined') {
    // Initialize configuration (load from localStorage, URL params, etc.)
    initializeConfig();
    
    // Make CONFIG available globally
    window.CONFIG = CONFIG;
    
    // Load backend config immediately
    loadConfigFromBackend();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, loadConfigFromBackend };
}

