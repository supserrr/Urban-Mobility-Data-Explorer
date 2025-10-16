// Inclusive Data Processor for NYC Taxi Data

const logger = require('../config/logger');

class DataProcessorInclusive {
    constructor(options = {}) {
        this.config = {
            batchSize: options.batchSize || 1000,
            calculateDerivedFeatures: options.calculateDerivedFeatures !== false,
            ...options
        };

        // NYC Coordinate bounds (accurate boundaries)
        this.bounds = {
            latitude: { min: 40.4774, max: 40.9176 },
            longitude: { min: -74.2591, max: -73.7004 }
        };

        // Validation rules (for categorization, not rejection)
        this.validationRules = {
            tripDuration: { min: 60, max: 86400 }, // 1 minute to 24 hours
            passengerCount: { min: 1, max: 6 },
            vendorIds: ['1', '2'],
            storeFwdFlags: ['Y', 'N']
        };

        // Statistics
        this.stats = {
            totalProcessed: 0,
            fullyValid: 0,
            withFlags: 0,
            categories: {},
            startTime: null,
            endTime: null
        };
    }

    /**
     * Process a single record - NEVER returns null, always returns categorized record
     * @param {Object} record - Raw CSV record
     * @returns {Object} - Processed and categorized record
     */
    async processRecord(record) {
        this.stats.totalProcessed++;

        try {
            // Parse fields (with error tolerance)
            const parsed = this.parseFields(record);
            
            // Categorize the record
            const categorized = this.categorizeRecord(parsed);
            
            // Calculate derived features if enabled
            const enriched = this.config.calculateDerivedFeatures 
                ? this.calculateDerivedFeatures(categorized)
                : categorized;

            // Track statistics
            if (enriched.data_category === 'valid_complete') {
                this.stats.fullyValid++;
            } else {
                this.stats.withFlags++;
                
                // Count by category
                if (!this.stats.categories[enriched.data_category]) {
                    this.stats.categories[enriched.data_category] = 0;
                }
                this.stats.categories[enriched.data_category]++;
            }

            return enriched;

        } catch (error) {
            logger.error('Error processing record:', error);
            
            // Even on error, return a record with error category
            return {
                ...record,
                data_category: 'processing_error',
                data_flags: ['processing_exception'],
                validation_issues: [error.message],
                data_quality_score: 0,
                processed_at: new Date().toISOString()
            };
        }
    }

    /**
     * Parse fields to correct data types (with error tolerance)
     * @param {Object} record - Raw record
     * @returns {Object} - Parsed record
     */
    parseFields(record) {
        const vendorId = record.vendor_id ? record.vendor_id.trim() : null;
        
        // Map vendor ID to company name
        const vendorNames = {
            '1': 'Creative Mobile Technologies',
            '2': 'VeriFone Inc.'
        };
        
        const parsed = {
            id: record.id ? record.id.trim() : null,
            vendor_id: vendorId,
            vendor_name: vendorNames[vendorId] || 'Unknown Vendor',
            store_and_fwd_flag: record.store_and_fwd_flag ? record.store_and_fwd_flag.trim() : null,
            raw_data: { ...record } // Keep original data
        };

        // Parse datetime fields (tolerate errors)
        try {
            parsed.pickup_datetime = new Date(record.pickup_datetime);
            if (isNaN(parsed.pickup_datetime.getTime())) {
                parsed.pickup_datetime = null;
            }
        } catch (e) {
            parsed.pickup_datetime = null;
        }

        try {
            parsed.dropoff_datetime = new Date(record.dropoff_datetime);
            if (isNaN(parsed.dropoff_datetime.getTime())) {
                parsed.dropoff_datetime = null;
            }
        } catch (e) {
            parsed.dropoff_datetime = null;
        }

        // Parse numeric fields (tolerate errors)
        parsed.passenger_count = this.safeParseInt(record.passenger_count);
        parsed.pickup_longitude = this.safeParseFloat(record.pickup_longitude);
        parsed.pickup_latitude = this.safeParseFloat(record.pickup_latitude);
        parsed.dropoff_longitude = this.safeParseFloat(record.dropoff_longitude);
        parsed.dropoff_latitude = this.safeParseFloat(record.dropoff_latitude);
        parsed.trip_duration = this.safeParseInt(record.trip_duration);

        return parsed;
    }

    /**
     * Safely parse integer
     */
    safeParseInt(value) {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? null : parsed;
    }

    /**
     * Safely parse float
     */
    safeParseFloat(value) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    }

    /**
     * Categorize record based on validation checks
     * @param {Object} record - Parsed record
     * @returns {Object} - Categorized record
     */
    categorizeRecord(record) {
        const flags = [];
        const issues = [];
        let category = 'valid_complete';

        // Check for missing required fields
        const requiredFields = ['id', 'vendor_id', 'pickup_datetime', 'dropoff_datetime'];
        for (const field of requiredFields) {
            if (!record[field]) {
                flags.push('missing_required_field');
                issues.push(`Missing ${field}`);
                category = 'incomplete_data';
            }
        }

        // Check vendor ID
        if (record.vendor_id && !this.validationRules.vendorIds.includes(record.vendor_id)) {
            flags.push('non_standard_vendor');
            issues.push(`Non-standard vendor_id: ${record.vendor_id}`);
            if (category === 'valid_complete') category = 'data_anomaly';
        }

        // Check store and forward flag
        if (record.store_and_fwd_flag && !this.validationRules.storeFwdFlags.includes(record.store_and_fwd_flag)) {
            flags.push('non_standard_flag');
            issues.push(`Non-standard store_and_fwd_flag: ${record.store_and_fwd_flag}`);
            if (category === 'valid_complete') category = 'data_anomaly';
        }

        // Check trip duration
        if (record.trip_duration !== null) {
            if (record.trip_duration < this.validationRules.tripDuration.min) {
                flags.push('micro_trip');
                issues.push(`Very short trip: ${record.trip_duration}s (< 60s)`);
                category = 'micro_trip';
            } else if (record.trip_duration > this.validationRules.tripDuration.max) {
                flags.push('extended_trip');
                issues.push(`Very long trip: ${record.trip_duration}s (> 24h)`);
                if (category === 'valid_complete') category = 'extended_trip';
            }
        }

        // Check passenger count
        if (record.passenger_count !== null) {
            if (record.passenger_count < this.validationRules.passengerCount.min) {
                flags.push('zero_passengers');
                issues.push(`Zero passengers`);
                if (category === 'valid_complete') category = 'data_anomaly';
            } else if (record.passenger_count > this.validationRules.passengerCount.max) {
                flags.push('excess_passengers');
                issues.push(`Passenger count: ${record.passenger_count} (> 6)`);
                if (category === 'valid_complete') category = 'data_anomaly';
            }
        }

        // Check pickup coordinates
        if (record.pickup_latitude !== null && record.pickup_longitude !== null) {
            if (!this.isValidCoordinate(record.pickup_latitude, record.pickup_longitude)) {
                flags.push('pickup_outside_nyc');
                issues.push(`Pickup outside NYC: (${record.pickup_latitude}, ${record.pickup_longitude})`);
                if (category === 'valid_complete') category = 'out_of_bounds';
            }
        }

        // Check dropoff coordinates
        if (record.dropoff_latitude !== null && record.dropoff_longitude !== null) {
            if (!this.isValidCoordinate(record.dropoff_latitude, record.dropoff_longitude)) {
                flags.push('dropoff_outside_nyc');
                issues.push(`Dropoff outside NYC: (${record.dropoff_latitude}, ${record.dropoff_longitude})`);
                
                // Determine likely destination
                const destination = this.inferDestination(record.dropoff_latitude, record.dropoff_longitude);
                if (destination) {
                    flags.push(destination.flag);
                    issues.push(destination.description);
                }
                
                if (category === 'valid_complete' || category === 'micro_trip') {
                    category = 'suburban_trip';
                }
            }
        }

        // Check datetime logic
        if (record.pickup_datetime && record.dropoff_datetime) {
            if (record.dropoff_datetime <= record.pickup_datetime) {
                flags.push('invalid_datetime_sequence');
                issues.push('Dropoff before or equal to pickup');
                category = 'data_anomaly';
            }

            // Check duration match
            if (record.trip_duration !== null) {
                const calculatedDuration = Math.floor(
                    (record.dropoff_datetime - record.pickup_datetime) / 1000
                );
                const durationDiff = Math.abs(calculatedDuration - record.trip_duration);
                
                if (durationDiff > record.trip_duration * 0.01) {
                    flags.push('duration_mismatch');
                    issues.push(`Duration mismatch: recorded=${record.trip_duration}s, calculated=${calculatedDuration}s`);
                    if (category === 'valid_complete') category = 'data_anomaly';
                }
            }
        }

        return {
            ...record,
            data_category: category,
            data_flags: flags.length > 0 ? flags : [],
            validation_issues: issues.length > 0 ? issues : [],
            is_valid_nyc_trip: category === 'valid_complete',
            is_suburban_trip: category === 'suburban_trip',
            is_micro_trip: category === 'micro_trip',
            is_extended_trip: category === 'extended_trip',
            has_anomalies: category === 'data_anomaly' || category === 'incomplete_data'
        };
    }

    /**
     * Infer destination based on coordinates
     */
    inferDestination(lat, lon) {
        // North (Westchester, Connecticut)
        if (lat > 40.9176) {
            return {
                flag: 'destination_north',
                description: 'Likely Westchester County or Connecticut'
            };
        }

        // South (New Jersey)
        if (lat < 40.4774) {
            return {
                flag: 'destination_south',
                description: 'Likely New Jersey'
            };
        }

        // West (New Jersey)
        if (lon < -74.2591) {
            return {
                flag: 'destination_west',
                description: 'Likely New Jersey (Newark area)'
            };
        }

        // East (Long Island)
        if (lon > -73.7004) {
            return {
                flag: 'destination_east',
                description: 'Likely Long Island'
            };
        }

        return null;
    }

    /**
     * Check if coordinates are within NYC bounds
     */
    isValidCoordinate(lat, lon) {
        return lat >= this.bounds.latitude.min &&
               lat <= this.bounds.latitude.max &&
               lon >= this.bounds.longitude.min &&
               lon <= this.bounds.longitude.max;
    }

    /**
     * Calculate derived features
     */
    calculateDerivedFeatures(record) {
        // Skip if missing required data
        if (!record.pickup_latitude || !record.pickup_longitude || 
            !record.dropoff_latitude || !record.dropoff_longitude) {
            return {
                ...record,
                distance_km: null,
                speed_kmh: null,
                data_quality_score: 20 // Low score for missing coordinates
            };
        }

        // Calculate distance using Haversine formula
        const distance = this.calculateHaversineDistance(
            record.pickup_latitude,
            record.pickup_longitude,
            record.dropoff_latitude,
            record.dropoff_longitude
        );

        // Calculate speed (km/h)
        const speed = record.trip_duration && record.trip_duration > 0
            ? (distance / (record.trip_duration / 3600))
            : null;

        // Extract temporal features
        let temporalFeatures = {};
        if (record.pickup_datetime) {
            const pickupDate = record.pickup_datetime;
            temporalFeatures = {
                pickup_hour: pickupDate.getHours(),
                pickup_day_of_week: pickupDate.getDay(),
                pickup_day_of_month: pickupDate.getDate(),
                pickup_month: pickupDate.getMonth() + 1,
                pickup_year: pickupDate.getFullYear(),
                time_of_day: this.getTimeOfDay(pickupDate.getHours()),
                day_type: this.getDayType(pickupDate.getDay())
            };
        }

        // Calculate fare estimate
        const fareEstimate = this.estimateFare(distance, record.trip_duration || 0);

        // Calculate data quality score
        const qualityScore = this.calculateDataQualityScore(record, distance, speed);

        return {
            ...record,
            // Geospatial features
            distance_km: distance !== null ? parseFloat(distance.toFixed(3)) : null,
            speed_kmh: speed !== null ? parseFloat(speed.toFixed(2)) : null,
            
            // Temporal features
            ...temporalFeatures,
            
            // Derived business features
            fare_estimate: fareEstimate !== null ? parseFloat(fareEstimate.toFixed(2)) : null,
            fare_per_km: distance > 0 && fareEstimate ? parseFloat((fareEstimate / distance).toFixed(2)) : null,
            
            // Data quality indicators
            data_quality_score: qualityScore,
            processed_at: new Date().toISOString()
        };
    }

    /**
     * Calculate Haversine distance between two coordinates
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
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Get time of day category
     */
    getTimeOfDay(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    /**
     * Get day type
     */
    getDayType(dayOfWeek) {
        return (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday';
    }

    /**
     * Estimate fare based on distance and duration
     */
    estimateFare(distance, duration) {
        if (distance === null || duration === null) return null;
        
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
     */
    calculateDataQualityScore(record, distance, speed) {
        let score = 100;

        // Deduct for missing data
        if (!record.pickup_datetime) score -= 20;
        if (!record.dropoff_datetime) score -= 20;
        if (!record.pickup_latitude || !record.pickup_longitude) score -= 20;
        if (!record.dropoff_latitude || !record.dropoff_longitude) score -= 20;

        // Deduct for flags
        if (record.data_flags.includes('micro_trip')) score -= 10;
        if (record.data_flags.includes('extended_trip')) score -= 5;
        if (record.data_flags.includes('dropoff_outside_nyc')) score -= 5; // Minor deduction
        if (record.data_flags.includes('pickup_outside_nyc')) score -= 10;
        if (record.data_flags.includes('duration_mismatch')) score -= 15;
        if (record.data_flags.includes('invalid_datetime_sequence')) score -= 20;

        // Deduct for unrealistic speeds
        if (speed !== null) {
            if (speed > 120) score -= 20; // Too fast
            if (speed < 1 && distance > 0.1) score -= 10; // Too slow
        }

        // Deduct for zero distance trips
        if (distance !== null && distance < 0.1) score -= 15;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Get processing statistics
     */
    getStatistics() {
        return {
            totalProcessed: this.stats.totalProcessed,
            fullyValid: this.stats.fullyValid,
            withFlags: this.stats.withFlags,
            validRate: this.stats.totalProcessed > 0
                ? ((this.stats.fullyValid / this.stats.totalProcessed) * 100).toFixed(2) + '%'
                : '0%',
            categories: this.stats.categories
        };
    }

    /**
     * Reset statistics
     */
    reset() {
        this.stats = {
            totalProcessed: 0,
            fullyValid: 0,
            withFlags: 0,
            categories: {},
            startTime: null,
            endTime: null
        };
    }
}

module.exports = DataProcessorInclusive;
