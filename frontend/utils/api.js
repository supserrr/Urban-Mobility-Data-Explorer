// API Utility - Handles all API communication

class API {
    constructor() {
        this.baseURL = CONFIG?.API_BASE_URL || 'http://localhost:8000/api';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    /**
     * Get authentication headers
     * Includes API key if available from CONFIG
     * @returns {Object} - Headers object with authentication
     */
    getAuthHeaders() {
        const headers = { ...this.defaultHeaders };
        
        // Add API key if available (Phase 2 Authentication)
        if (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.API_KEY) {
            headers['X-API-Key'] = window.CONFIG.API_KEY;
        }
        
        return headers;
    }

    /**
     * Make HTTP request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise} - API response
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: { ...this.getAuthHeaders(), ...options.headers },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                // Handle authentication errors
                if (response.status === 401) {
                    throw new Error('Authentication required. API key is missing or invalid.');
                }
                if (response.status === 403) {
                    throw new Error('Access forbidden. Invalid API key.');
                }
                
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * GET request
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @returns {Promise} - API response
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET'
        });
    }

    /**
     * POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @returns {Promise} - API response
     */
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @returns {Promise} - API response
     */
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     * @param {string} endpoint - API endpoint
     * @returns {Promise} - API response
     */
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // Trip-related API methods

    /**
     * Get trips with filtering and pagination
     * @param {Object} filters - Filter parameters
     * @param {Object} pagination - Pagination parameters
     * @returns {Promise} - Trips data
     */
    async getTrips(filters = {}, pagination = {}) {
        const params = { ...filters, ...pagination };
        return this.get('/trips', params);
    }

    /**
     * Get trips with advanced sorting and filtering
     * @param {Object} params - Query parameters including sortCriteria, sortOrder, limit, etc.
     * @returns {Promise} - Advanced trips data
     */
    async getTripsAdvanced(params = {}) {
        return this.get('/trips/advanced', params);
    }

    /**
     * Get trip statistics
     * @param {Object} filters - Filter parameters
     * @returns {Promise} - Statistics data
     */
    async getTripStatistics(filters = {}) {
        return this.get('/trips/statistics', filters);
    }

    /**
     * Get heatmap data
     * @param {Object} filters - Filter parameters
     * @returns {Promise} - Heatmap data
     */
    async getHeatmapData(filters = {}) {
        return this.get('/trips/heatmap', filters);
    }

    /**
     * Get popular routes
     * @param {Object} filters - Filter parameters
     * @returns {Promise} - Routes data
     */
    async getPopularRoutes(filters = {}) {
        return this.get('/trips/routes', filters);
    }

    /**
     * Get trip by ID
     * @param {number} tripId - Trip ID
     * @returns {Promise} - Trip data
     */
    async getTripById(tripId) {
        return this.get(`/trips/${tripId}`);
    }

    /**
     * Get passenger count distribution
     * @param {Object} filters - Filter parameters
     * @returns {Promise} - Passenger distribution data
     */
    async getPassengerDistribution(filters = {}) {
        return this.get('/trips/passenger-distribution', filters);
    }

    /**
     * Get trip duration distribution
     * @param {Object} filters - Filter parameters
     * @returns {Promise} - Duration distribution data
     */
    async getDurationDistribution(filters = {}) {
        return this.get('/trips/duration-distribution', filters);
    }

    /**
     * Get correlation data for trip metrics
     * @param {Object} filters - Filter parameters
     * @returns {Promise} - Correlation matrix data
     */
    async getCorrelationData(filters = {}) {
        return this.get('/trips/correlation', filters);
    }

    /**
     * Get neighborhoods statistics
     * @param {Object} filters - Filter parameters
     * @returns {Promise} - Neighborhoods data
     */
    async getNeighborhoods(filters = {}) {
        return this.get('/trips/neighborhoods', filters);
    }

    /**
     * Get vendors statistics
     * @param {Object} filters - Filter parameters
     * @returns {Promise} - Vendors data
     */
    async getVendors(filters = {}) {
        return this.get('/trips/vendors', filters);
    }

    /**
     * Get H3 grid data
     * @param {Object} filters - Filter parameters
     * @returns {Promise} - H3 grid data
     */
    async getH3Grid(filters = {}) {
        return this.get('/trips/h3-grid', filters);
    }

    /**
     * Get trips for map visualization
     * @param {Object} filters - Filter parameters
     * @returns {Promise} - Map trips data
     */
    async getTripsForMap(filters = {}) {
        return this.get('/trips/map', filters);
    }

    /**
     * Get API health status
     * @returns {Promise} - Health data
     */
    async getHealth() {
        return this.get('/health');
    }

    /**
     * Get API documentation
     * @returns {Promise} - Documentation data
     */
    async getDocumentation() {
        return this.get('/docs');
    }

    // Utility methods

    /**
     * Test API connection
     * @returns {Promise<boolean>} - Connection status
     */
    async testConnection() {
        try {
            await this.getHealth();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Format date for API
     * @param {Date} date - Date object
     * @returns {string} - Formatted date string
     */
    formatDate(date) {
        if (!date) return null;
        
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }

    /**
     * Parse API date
     * @param {string} dateString - Date string from API
     * @returns {Date} - Date object
     */
    parseDate(dateString) {
        if (!dateString) return null;
        return new Date(dateString);
    }

    /**
     * Build filter object from form data
     * @param {FormData} formData - Form data
     * @returns {Object} - Filter object
     */
    buildFilters(formData) {
        const filters = {};

        // Date filters
        if (formData.startDate) {
            filters.startDate = this.formatDate(formData.startDate);
        }
        if (formData.endDate) {
            filters.endDate = this.formatDate(formData.endDate);
        }

        // Other filters
        if (formData.vendorId) filters.vendorId = formData.vendorId;
        if (formData.passengerCount) filters.passengerCount = parseInt(formData.passengerCount);
        if (formData.pickupHour !== undefined) filters.pickupHour = parseInt(formData.pickupHour);
        if (formData.pickupDayOfWeek !== undefined) filters.pickupDayOfWeek = parseInt(formData.pickupDayOfWeek);

        // Duration filters (convert minutes to seconds)
        if (formData.minDuration) filters.minDuration = parseInt(formData.minDuration) * 60;
        if (formData.maxDuration) filters.maxDuration = parseInt(formData.maxDuration) * 60;

        // Distance filters
        if (formData.minDistance) filters.minDistance = parseFloat(formData.minDistance);
        if (formData.maxDistance) filters.maxDistance = parseFloat(formData.maxDistance);

        return filters;
    }

    /**
     * Handle API errors
     * @param {Error} error - Error object
     * @returns {Object} - Formatted error
     */
    handleError(error) {
        console.error('API Error:', error);
        
        return {
            message: error.message || 'An unexpected error occurred',
            type: 'error',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Create API response handler
     * @param {Function} onSuccess - Success callback
     * @param {Function} onError - Error callback
     * @returns {Function} - Response handler
     */
    createResponseHandler(onSuccess, onError) {
        return (response) => {
            if (response.success) {
                onSuccess(response.data);
            } else {
                onError(this.handleError(new Error(response.message)));
            }
        };
    }

    /**
     * Create error handler
     * @param {Function} onError - Error callback
     * @returns {Function} - Error handler
     */
    createErrorHandler(onError) {
        return (error) => {
            onError(this.handleError(error));
        };
    }
}

// Create global API instance
window.api = new API();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
