// Data Processor for NYC Taxi Data

const logger = require('../config/logger');

class DataProcessor {
    constructor(options = {}) {
        this.config = {
            batchSize: options.batchSize || 1000,
            strictValidation: options.strictValidation !== false,
            calculateDerivedFeatures: options.calculateDerivedFeatures !== false,
            ...options
        };

        // NYC Coordinate bounds (accurate boundaries)
        this.bounds = {
            latitude: { min: 40.4774, max: 40.9176 },
            longitude: { min: -74.2591, max: -73.7004 }
        };

        // Validation rules
        this.validationRules = {
            tripDuration: { min: 60, max: 86400 }, // 1 minute to 24 hours
            passengerCount: { min: 1, max: 6 },
            vendorIds: ['1', '2'],
            storeFwdFlags: ['Y', 'N']
        };

        // Statistics
        this.stats = {
            totalProcessed: 0,
            validRecords: 0,
            invalidRecords: 0,
            validationErrors: {},
            startTime: null,
            endTime: null
        };
    }

    /**
     * Process a single record
     * @param {Object} record - Raw CSV record
     * @returns {Object|null} - Processed record or null if invalid
     */
    async processRecord(record) {
        this.stats.totalProcessed++;

        try {
            // Validate required fields
            if (!this.validateRequiredFields(record)) {
                this.recordError('missing_required_fields');
                return null;
            }

            // Parse and validate data types
            const parsed = this.parseFields(record);
            if (!parsed) {
                this.recordError('parsing_failed');
                return null;
            }

            // Validate business rules
            if (!this.validateBusinessRules(parsed)) {
                return null;
            }

            // Calculate derived features
            const enriched = this.config.calculateDerivedFeatures 
                ? this.calculateDerivedFeatures(parsed)
                : parsed;

            this.stats.validRecords++;
            return enriched;

        } catch (error) {
            logger.error('Error processing record:', error);
            this.recordError('processing_exception', error.message);
            return null;
        }
    }

    /**
     * Validate required fields
     * @param {Object} record - Record to validate
     * @returns {boolean} - Validation result
     */
    validateRequiredFields(record) {
        const requiredFields = [
            'id',
            'vendor_id',
            'pickup_datetime',
            'dropoff_datetime',
            'passenger_count',
            'pickup_longitude',
            'pickup_latitude',
            'dropoff_longitude',
            'dropoff_latitude',
            'store_and_fwd_flag',
            'trip_duration'
        ];

        for (const field of requiredFields) {
            if (!record[field] || record[field].toString().trim() === '') {
                return false;
            }
        }

        return true;
    }

    /**
     * Parse fields to correct data types
     * @param {Object} record - Raw record
     * @returns {Object|null} - Parsed record or null
     */
    parseFields(record) {
        try {
            // Parse datetime fields
            const pickupDatetime = new Date(record.pickup_datetime);
            const dropoffDatetime = new Date(record.dropoff_datetime);

            if (isNaN(pickupDatetime.getTime()) || isNaN(dropoffDatetime.getTime())) {
                this.recordError('invalid_datetime');
                return null;
            }

            // Parse numeric fields
            const passengerCount = parseInt(record.passenger_count, 10);
            const pickupLongitude = parseFloat(record.pickup_longitude);
            const pickupLatitude = parseFloat(record.pickup_latitude);
            const dropoffLongitude = parseFloat(record.dropoff_longitude);
            const dropoffLatitude = parseFloat(record.dropoff_latitude);
            const tripDuration = parseInt(record.trip_duration, 10);

            // Check for NaN
            const numericFields = [
                passengerCount, pickupLongitude, pickupLatitude,
                dropoffLongitude, dropoffLatitude, tripDuration
            ];

            if (numericFields.some(isNaN)) {
                this.recordError('invalid_numeric_value');
                return null;
            }

            return {
                id: record.id.trim(),
                vendor_id: record.vendor_id.trim(),
                pickup_datetime: pickupDatetime,
                dropoff_datetime: dropoffDatetime,
                passenger_count: passengerCount,
                pickup_longitude: pickupLongitude,
                pickup_latitude: pickupLatitude,
                dropoff_longitude: dropoffLongitude,
                dropoff_latitude: dropoffLatitude,
                store_and_fwd_flag: record.store_and_fwd_flag.trim(),
                trip_duration: tripDuration
            };

        } catch (error) {
            logger.error('Error parsing fields:', error);
            return null;
        }
    }

    /**
     * Validate business rules
     * @param {Object} record - Parsed record
     * @returns {boolean} - Validation result
     */
    validateBusinessRules(record) {
        // Validate vendor ID
        if (!this.validationRules.vendorIds.includes(record.vendor_id)) {
            this.recordError('invalid_vendor_id');
            return false;
        }

        // Validate store and forward flag
        if (!this.validationRules.storeFwdFlags.includes(record.store_and_fwd_flag)) {
            this.recordError('invalid_store_fwd_flag');
            return false;
        }

        // Validate trip duration
        if (record.trip_duration < this.validationRules.tripDuration.min ||
            record.trip_duration > this.validationRules.tripDuration.max) {
            this.recordError('invalid_trip_duration');
            return false;
        }

        // Validate passenger count
        if (record.passenger_count < this.validationRules.passengerCount.min ||
            record.passenger_count > this.validationRules.passengerCount.max) {
            this.recordError('invalid_passenger_count');
            return false;
        }

        // Validate coordinates (must be within NYC bounds)
        if (!this.isValidCoordinate(record.pickup_latitude, record.pickup_longitude)) {
            this.recordError('invalid_pickup_coordinates');
            return false;
        }

        if (!this.isValidCoordinate(record.dropoff_latitude, record.dropoff_longitude)) {
            this.recordError('invalid_dropoff_coordinates');
            return false;
        }

        // Validate datetime logic (dropoff must be after pickup)
        if (record.dropoff_datetime <= record.pickup_datetime) {
            this.recordError('invalid_datetime_sequence');
            return false;
        }

        // Validate trip duration matches datetime difference
        const calculatedDuration = Math.floor(
            (record.dropoff_datetime - record.pickup_datetime) / 1000
        );
        const durationDiff = Math.abs(calculatedDuration - record.trip_duration);
        
        // Allow 1% tolerance for duration mismatch
        if (durationDiff > record.trip_duration * 0.01) {
            this.recordError('duration_mismatch');
            return false;
        }

        return true;
    }

    /**
     * Check if coordinates are within NYC bounds
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {boolean} - Validation result
     */
    isValidCoordinate(lat, lon) {
        return lat >= this.bounds.latitude.min &&
               lat <= this.bounds.latitude.max &&
               lon >= this.bounds.longitude.min &&
               lon <= this.bounds.longitude.max;
    }

    /**
     * Calculate derived features
     * @param {Object} record - Validated record
     * @returns {Object} - Enriched record
     */
    calculateDerivedFeatures(record) {
        // Calculate distance using Haversine formula
        const distance = this.calculateHaversineDistance(
            record.pickup_latitude,
            record.pickup_longitude,
            record.dropoff_latitude,
            record.dropoff_longitude
        );

        // Calculate speed (km/h)
        const speed = record.trip_duration > 0 
            ? (distance / (record.trip_duration / 3600))
            : 0;

        // Extract temporal features
        const pickupDate = record.pickup_datetime;
        const pickupHour = pickupDate.getHours();
        const pickupDayOfWeek = pickupDate.getDay(); // 0 = Sunday
        const pickupDayOfMonth = pickupDate.getDate();
        const pickupMonth = pickupDate.getMonth() + 1;
        const pickupYear = pickupDate.getFullYear();

        // Calculate time of day category
        const timeOfDay = this.getTimeOfDay(pickupHour);

        // Calculate day type
        const dayType = this.getDayType(pickupDayOfWeek);

        // Calculate fare estimate (simplified model)
        const fareEstimate = this.estimateFare(distance, record.trip_duration);

        return {
            ...record,
            // Geospatial features
            distance_km: parseFloat(distance.toFixed(3)),
            speed_kmh: parseFloat(speed.toFixed(2)),
            
            // Temporal features
            pickup_hour: pickupHour,
            pickup_day_of_week: pickupDayOfWeek,
            pickup_day_of_month: pickupDayOfMonth,
            pickup_month: pickupMonth,
            pickup_year: pickupYear,
            time_of_day: timeOfDay,
            day_type: dayType,
            
            // Derived business features
            fare_estimate: parseFloat(fareEstimate.toFixed(2)),
            fare_per_km: distance > 0 ? parseFloat((fareEstimate / distance).toFixed(2)) : 0,
            
            // Data quality indicators
            processed_at: new Date().toISOString(),
            data_quality_score: this.calculateDataQualityScore(record, distance, speed)
        };
    }

    /**
     * Calculate Haversine distance between two coordinates
     * @param {number} lat1 - Start latitude
     * @param {number} lon1 - Start longitude
     * @param {number} lat2 - End latitude
     * @param {number} lon2 - End longitude
     * @returns {number} - Distance in kilometers
     */
    calculateHaversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        return distance;
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Degrees
     * @returns {number} - Radians
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Get time of day category
     * @param {number} hour - Hour of day (0-23)
     * @returns {string} - Time of day category
     */
    getTimeOfDay(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    /**
     * Get day type
     * @param {number} dayOfWeek - Day of week (0 = Sunday)
     * @returns {string} - Day type
     */
    getDayType(dayOfWeek) {
        return (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday';
    }

    /**
     * Estimate fare based on distance and duration
     * @param {number} distance - Distance in km
     * @param {number} duration - Duration in seconds
     * @returns {number} - Estimated fare in dollars
     */
    estimateFare(distance, duration) {
        const BASE_FARE = 2.50;
        const PER_KM = 1.56;
        const PER_MINUTE = 0.50;
        const MIN_FARE = 8.00;

        const distanceFare = distance * PER_KM;
        const timeFare = (duration / 60) * PER_MINUTE;
        const totalFare = BASE_FARE + distanceFare + timeFare;

        return Math.max(totalFare, MIN_FARE);
    }

    /**
     * Calculate data quality score
     * @param {Object} record - Record
     * @param {number} distance - Calculated distance
     * @param {number} speed - Calculated speed
     * @returns {number} - Quality score (0-100)
     */
    calculateDataQualityScore(record, distance, speed) {
        let score = 100;

        // Penalize unrealistic speeds
        if (speed > 120) score -= 20; // Too fast
        if (speed < 1 && distance > 0.1) score -= 10; // Too slow

        // Penalize zero distance trips
        if (distance < 0.1) score -= 15;

        // Penalize very short trips
        if (record.trip_duration < 120) score -= 5;

        // Penalize very long trips
        if (record.trip_duration > 7200) score -= 5;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Record validation error
     * @param {string} errorType - Error type
     * @param {string} details - Error details
     */
    recordError(errorType, details = '') {
        if (!this.stats.validationErrors[errorType]) {
            this.stats.validationErrors[errorType] = 0;
        }
        this.stats.validationErrors[errorType]++;
        this.stats.invalidRecords++;
    }

    /**
     * Get processing statistics
     * @returns {Object} - Statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            validationRate: this.stats.totalProcessed > 0
                ? ((this.stats.validRecords / this.stats.totalProcessed) * 100).toFixed(2) + '%'
                : '0%',
            invalidationRate: this.stats.totalProcessed > 0
                ? ((this.stats.invalidRecords / this.stats.totalProcessed) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Reset statistics
     */
    reset() {
        this.stats = {
            totalProcessed: 0,
            validRecords: 0,
            invalidRecords: 0,
            validationErrors: {},
            startTime: null,
            endTime: null
        };
    }
}

module.exports = DataProcessor;
