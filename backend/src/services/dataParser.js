// Data Parser - CSV parser with validation

const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');
const { query } = require('../config/database');

class DataParser {
    constructor(options = {}) {
        this.batchSize = options.batchSize || 1000;
        this.maxConcurrentProcesses = options.maxConcurrentProcesses || 4;
        this.chunkSize = options.chunkSize || 8192;
        this.validationRules = this.initializeValidationRules();
        this.stats = {
            totalRecords: 0,
            validRecords: 0,
            invalidRecords: 0,
            processedBatches: 0,
            errors: []
        };
    }

    /**
     * Initialize validation rules for data quality
     */
    initializeValidationRules() {
        return {
            // NYC coordinate bounds
            latitude: { min: 40.4774, max: 40.9176 },
            longitude: { min: -74.2591, max: -73.7004 },
            
            // Trip duration bounds (in seconds)
            tripDuration: { min: 30, max: 86400 }, // 30 seconds to 24 hours
            
            // Passenger count bounds
            passengerCount: { min: 1, max: 6 },
            
            // Vendor ID validation
            vendorId: ['1', '2'],
            
            // Store and forward flag validation
            storeFlag: ['Y', 'N']
        };
    }

    /**
     * Parse CSV file with streaming and batch processing
     * @param {string} filePath - Path to CSV file
     * @param {Function} onBatch - Callback for each batch
     * @param {Function} onComplete - Callback when parsing is complete
     */
    async parseCSV(filePath, onBatch, onComplete) {
        logger.info(`Starting CSV parsing for file: ${filePath}`);
        
        const startTime = Date.now();
        let batch = [];
        let currentBatch = 0;

        return new Promise((resolve, reject) => {
            const stream = fs.createReadStream(filePath)
                .pipe(csv({
                    skipEmptyLines: true,
                    skipLinesWithError: true
                }))
                .on('data', async (row) => {
                    try {
                        this.stats.totalRecords++;
                        
                        // Validate and clean row
                        const cleanedRow = await this.validateAndCleanRow(row);
                        
                        if (cleanedRow) {
                            // Calculate derived features
                            const enrichedRow = this.calculateDerivedFeatures(cleanedRow);
                            batch.push(enrichedRow);
                            this.stats.validRecords++;
                        } else {
                            this.stats.invalidRecords++;
                        }

                        // Process batch when it reaches batch size
                        if (batch.length >= this.batchSize) {
                            currentBatch++;
                            this.stats.processedBatches = currentBatch;
                            
                            logger.debug(`Processing batch ${currentBatch} with ${batch.length} records`);
                            
                            try {
                                await onBatch(batch, currentBatch);
                                batch = []; // Clear batch after processing
                            } catch (error) {
                                logger.error(`Error processing batch ${currentBatch}:`, error);
                                this.stats.errors.push({
                                    batch: currentBatch,
                                    error: error.message
                                });
                            }
                        }
                    } catch (error) {
                        logger.error('Error processing row:', error);
                        this.stats.invalidRecords++;
                    }
                })
                .on('end', async () => {
                    // Process remaining records in final batch
                    if (batch.length > 0) {
                        currentBatch++;
                        this.stats.processedBatches = currentBatch;
                        
                        try {
                            await onBatch(batch, currentBatch);
                        } catch (error) {
                            logger.error(`Error processing final batch ${currentBatch}:`, error);
                            this.stats.errors.push({
                                batch: currentBatch,
                                error: error.message
                            });
                        }
                    }

                    const endTime = Date.now();
                    const processingTime = (endTime - startTime) / 1000;
                    
                    logger.info('CSV parsing completed', {
                        processingTime: `${processingTime}s`,
                        totalRecords: this.stats.totalRecords,
                        validRecords: this.stats.validRecords,
                        invalidRecords: this.stats.invalidRecords,
                        processedBatches: this.stats.processedBatches,
                        errors: this.stats.errors.length
                    });

                    if (onComplete) {
                        await onComplete(this.stats);
                    }
                    
                    resolve(this.stats);
                })
                .on('error', (error) => {
                    logger.error('CSV parsing error:', error);
                    reject(error);
                });
        });
    }

    /**
     * Validate and clean a single row
     * @param {Object} row - Raw CSV row
     * @returns {Object|null} - Cleaned row or null if invalid
     */
    async validateAndCleanRow(row) {
        try {
            // Basic field validation
            if (!row.id || !row.vendor_id || !row.pickup_datetime || !row.dropoff_datetime) {
                return null;
            }

            // Parse and validate datetime fields
            const pickupDatetime = new Date(row.pickup_datetime);
            const dropoffDatetime = new Date(row.dropoff_datetime);
            
            if (isNaN(pickupDatetime.getTime()) || isNaN(dropoffDatetime.getTime())) {
                return null;
            }

            // Validate trip duration
            const tripDuration = parseInt(row.trip_duration);
            if (isNaN(tripDuration) || tripDuration < this.validationRules.tripDuration.min || 
                tripDuration > this.validationRules.tripDuration.max) {
                return null;
            }

            // Validate passenger count
            const passengerCount = parseInt(row.passenger_count);
            if (isNaN(passengerCount) || passengerCount < this.validationRules.passengerCount.min ||
                passengerCount > this.validationRules.passengerCount.max) {
                return null;
            }

            // Validate coordinates
            const pickupLat = parseFloat(row.pickup_latitude);
            const pickupLon = parseFloat(row.pickup_longitude);
            const dropoffLat = parseFloat(row.dropoff_latitude);
            const dropoffLon = parseFloat(row.dropoff_longitude);

            if (!this.isValidCoordinate(pickupLat, pickupLon) || 
                !this.isValidCoordinate(dropoffLat, dropoffLon)) {
                return null;
            }

            // Validate vendor ID
            if (!this.validationRules.vendorId.includes(row.vendor_id)) {
                return null;
            }

            // Validate store and forward flag
            if (!this.validationRules.storeFlag.includes(row.store_and_fwd_flag)) {
                return null;
            }

            return {
                vendor_id: row.vendor_id,
                pickup_datetime: pickupDatetime,
                dropoff_datetime: dropoffDatetime,
                passenger_count: passengerCount,
                pickup_longitude: pickupLon,
                pickup_latitude: pickupLat,
                dropoff_longitude: dropoffLon,
                dropoff_latitude: dropoffLat,
                store_and_fwd_flag: row.store_and_fwd_flag,
                trip_duration: tripDuration
            };
        } catch (error) {
            logger.error('Error validating row:', error);
            return null;
        }
    }

    /**
     * Check if coordinates are within NYC bounds
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {boolean}
     */
    isValidCoordinate(lat, lon) {
        return lat >= this.validationRules.latitude.min && 
               lat <= this.validationRules.latitude.max &&
               lon >= this.validationRules.longitude.min && 
               lon <= this.validationRules.longitude.max;
    }

    /**
     * Calculate derived features for enriched data analysis
     * @param {Object} row - Cleaned row data
     * @returns {Object} - Row with derived features
     */
    calculateDerivedFeatures(row) {
        // Calculate distance using Haversine formula
        const distance = this.calculateDistance(
            row.pickup_latitude, row.pickup_longitude,
            row.dropoff_latitude, row.dropoff_longitude
        );

        // Calculate speed (km/h)
        const speed = row.trip_duration > 0 ? (distance / (row.trip_duration / 3600)) : 0;

        // Calculate fare per km (assuming base fare structure)
        const baseFare = 3.0; // Base fare in USD
        const farePerKm = distance > 0 ? baseFare / distance : 0;

        // Extract time-based features
        const pickupDate = new Date(row.pickup_datetime);
        const pickupHour = pickupDate.getHours();
        const pickupDayOfWeek = pickupDate.getDay();
        const pickupMonth = pickupDate.getMonth() + 1;
        const pickupYear = pickupDate.getFullYear();

        return {
            ...row,
            distance_km: Math.round(distance * 1000) / 1000, // Round to 3 decimal places
            speed_kmh: Math.round(speed * 100) / 100, // Round to 2 decimal places
            fare_per_km: Math.round(farePerKm * 100) / 100,
            pickup_hour: pickupHour,
            pickup_day_of_week: pickupDayOfWeek,
            pickup_month: pickupMonth,
            pickup_year: pickupYear,
            pickup_point: `POINT(${row.pickup_longitude} ${row.pickup_latitude})`,
            dropoff_point: `POINT(${row.dropoff_longitude} ${row.dropoff_latitude})`
        };
    }

    /**
     * Calculate distance between two points using Haversine formula
     * @param {number} lat1 - Latitude of first point
     * @param {number} lon1 - Longitude of first point
     * @param {number} lat2 - Latitude of second point
     * @param {number} lon2 - Longitude of second point
     * @returns {number} - Distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Degrees to convert
     * @returns {number} - Radians
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Insert batch of records into database
     * @param {Array} batch - Array of processed records
     * @returns {Promise} - Database insertion result
     */
    async insertBatch(batch) {
        if (batch.length === 0) return;

        const insertQuery = `
            INSERT INTO trips (
                vendor_id, pickup_datetime, dropoff_datetime, passenger_count,
                pickup_longitude, pickup_latitude, dropoff_longitude, dropoff_latitude,
                store_and_fwd_flag, trip_duration, distance_km, speed_kmh, fare_per_km,
                pickup_hour, pickup_day_of_week, pickup_month, pickup_year,
                pickup_point, dropoff_point
            ) VALUES ${batch.map((_, index) => 
                `($${index * 19 + 1}, $${index * 19 + 2}, $${index * 19 + 3}, $${index * 19 + 4},
                 $${index * 19 + 5}, $${index * 19 + 6}, $${index * 19 + 7}, $${index * 19 + 8},
                 $${index * 19 + 9}, $${index * 19 + 10}, $${index * 19 + 11}, $${index * 19 + 12}, $${index * 19 + 13},
                 $${index * 19 + 14}, $${index * 19 + 15}, $${index * 19 + 16}, $${index * 19 + 17},
                 ST_GeomFromText($${index * 19 + 18}), ST_GeomFromText($${index * 19 + 19}))`
            ).join(', ')}
        `;

        const values = batch.flatMap(row => [
            row.vendor_id, row.pickup_datetime, row.dropoff_datetime, row.passenger_count,
            row.pickup_longitude, row.pickup_latitude, row.dropoff_longitude, row.dropoff_latitude,
            row.store_and_fwd_flag, row.trip_duration, row.distance_km, row.speed_kmh, row.fare_per_km,
            row.pickup_hour, row.pickup_day_of_week, row.pickup_month, row.pickup_year,
            row.pickup_point, row.dropoff_point
        ]);

        try {
            await query(insertQuery, values);
            logger.debug(`Successfully inserted batch of ${batch.length} records`);
        } catch (error) {
            logger.error('Error inserting batch:', error);
            throw error;
        }
    }

    /**
     * Get parsing statistics
     * @returns {Object} - Current parsing statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Reset parsing statistics
     */
    resetStats() {
        this.stats = {
            totalRecords: 0,
            validRecords: 0,
            invalidRecords: 0,
            processedBatches: 0,
            errors: []
        };
    }
}

module.exports = DataParser;
