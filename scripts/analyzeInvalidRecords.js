/**
 * Analyze Invalid Records
 * Shows detailed information about records that failed validation
 */

require('dotenv').config({ path: '../backend/.env' });
const path = require('path');
const CustomCSVParser = require('../backend/src/services/CustomCSVParser');
const DataProcessor = require('../backend/src/services/DataProcessor');
const logger = require('../backend/src/config/logger');

const CONFIG = {
    inputFile: path.join(__dirname, '../data/raw/train.csv'),
    maxRecordsToProcess: 50000, // Process first 50k records
    maxInvalidToShow: 50 // Show first 50 invalid records
};

class InvalidRecordAnalyzer {
    constructor() {
        this.parser = new CustomCSVParser({
            delimiter: ',',
            quote: '"',
            chunkSize: 64 * 1024,
            skipEmptyLines: true,
            skipHeader: false,
            batchSize: 1000
        });

        this.processor = new DataProcessor({
            batchSize: 1000,
            strictValidation: true,
            calculateDerivedFeatures: false // Skip derived features for speed
        });

        this.invalidRecords = [];
        this.recordCount = 0;
        this.validCount = 0;
        this.invalidCount = 0;
    }

    async analyze() {
        console.log('='.repeat(80));
        console.log('ANALYZING INVALID RECORDS');
        console.log('='.repeat(80));
        console.log(`Input file: ${CONFIG.inputFile}`);
        console.log(`Processing first ${CONFIG.maxRecordsToProcess.toLocaleString()} records`);
        console.log(`Will show first ${CONFIG.maxInvalidToShow} invalid records`);
        console.log('='.repeat(80));
        console.log('');

        try {
            await this.parser.parse(CONFIG.inputFile, {
                onRecord: this.handleRecord.bind(this),
                onProgress: this.handleProgress.bind(this)
            });

            this.showResults();

        } catch (error) {
            console.error('Analysis failed:', error);
        }
    }

    async handleRecord(record) {
        this.recordCount++;

        // Stop after max records
        if (this.recordCount > CONFIG.maxRecordsToProcess) {
            return null;
        }

        // Try to process the record
        const processed = await this.processor.processRecord(record);

        if (processed) {
            this.validCount++;
            return processed;
        } else {
            this.invalidCount++;
            
            // Store invalid record details (only first N)
            if (this.invalidRecords.length < CONFIG.maxInvalidToShow) {
                this.invalidRecords.push({
                    recordNumber: this.recordCount,
                    rawRecord: record,
                    validationErrors: this.getValidationErrors(record)
                });
            }
            
            return null;
        }
    }

    getValidationErrors(record) {
        const errors = [];

        // Check required fields
        const requiredFields = [
            'id', 'vendor_id', 'pickup_datetime', 'dropoff_datetime',
            'passenger_count', 'pickup_longitude', 'pickup_latitude',
            'dropoff_longitude', 'dropoff_latitude', 'store_and_fwd_flag', 'trip_duration'
        ];

        for (const field of requiredFields) {
            if (!record[field] || record[field].toString().trim() === '') {
                errors.push(`Missing or empty: ${field}`);
            }
        }

        // Check datetime validity
        const pickupDate = new Date(record.pickup_datetime);
        const dropoffDate = new Date(record.dropoff_datetime);
        
        if (isNaN(pickupDate.getTime())) {
            errors.push(`Invalid pickup_datetime: "${record.pickup_datetime}"`);
        }
        if (isNaN(dropoffDate.getTime())) {
            errors.push(`Invalid dropoff_datetime: "${record.dropoff_datetime}"`);
        }

        // Check numeric fields
        const passengerCount = parseInt(record.passenger_count);
        const tripDuration = parseInt(record.trip_duration);
        const pickupLat = parseFloat(record.pickup_latitude);
        const pickupLon = parseFloat(record.pickup_longitude);
        const dropoffLat = parseFloat(record.dropoff_latitude);
        const dropoffLon = parseFloat(record.dropoff_longitude);

        if (isNaN(passengerCount)) {
            errors.push(`Invalid passenger_count: "${record.passenger_count}"`);
        } else if (passengerCount < 1 || passengerCount > 6) {
            errors.push(`Out of range passenger_count: ${passengerCount} (must be 1-6)`);
        }

        if (isNaN(tripDuration)) {
            errors.push(`Invalid trip_duration: "${record.trip_duration}"`);
        } else if (tripDuration < 60 || tripDuration > 86400) {
            errors.push(`Out of range trip_duration: ${tripDuration}s (must be 60-86400)`);
        }

        // Check coordinates
        const bounds = {
            latitude: { min: 40.4774, max: 40.9176 },
            longitude: { min: -74.2591, max: -73.7004 }
        };

        if (isNaN(pickupLat) || isNaN(pickupLon)) {
            errors.push(`Invalid pickup coordinates: lat="${record.pickup_latitude}", lon="${record.pickup_longitude}"`);
        } else if (pickupLat < bounds.latitude.min || pickupLat > bounds.latitude.max ||
                   pickupLon < bounds.longitude.min || pickupLon > bounds.longitude.max) {
            errors.push(`Pickup coordinates outside NYC bounds: lat=${pickupLat}, lon=${pickupLon}`);
        }

        if (isNaN(dropoffLat) || isNaN(dropoffLon)) {
            errors.push(`Invalid dropoff coordinates: lat="${record.dropoff_latitude}", lon="${record.dropoff_longitude}"`);
        } else if (dropoffLat < bounds.latitude.min || dropoffLat > bounds.latitude.max ||
                   dropoffLon < bounds.longitude.min || dropoffLon > bounds.longitude.max) {
            errors.push(`Dropoff coordinates outside NYC bounds: lat=${dropoffLat}, lon=${dropoffLon}`);
        }

        // Check vendor ID
        if (record.vendor_id && !['1', '2'].includes(record.vendor_id.trim())) {
            errors.push(`Invalid vendor_id: "${record.vendor_id}" (must be "1" or "2")`);
        }

        // Check store and forward flag
        if (record.store_and_fwd_flag && !['Y', 'N'].includes(record.store_and_fwd_flag.trim())) {
            errors.push(`Invalid store_and_fwd_flag: "${record.store_and_fwd_flag}" (must be "Y" or "N")`);
        }

        // Check datetime sequence
        if (!isNaN(pickupDate.getTime()) && !isNaN(dropoffDate.getTime())) {
            if (dropoffDate <= pickupDate) {
                errors.push(`Dropoff time (${dropoffDate.toISOString()}) is before or equal to pickup time (${pickupDate.toISOString()})`);
            }

            // Check duration match
            const calculatedDuration = Math.floor((dropoffDate - pickupDate) / 1000);
            const durationDiff = Math.abs(calculatedDuration - tripDuration);
            
            if (!isNaN(tripDuration) && durationDiff > tripDuration * 0.01) {
                errors.push(`Trip duration mismatch: recorded=${tripDuration}s, calculated=${calculatedDuration}s (diff=${durationDiff}s)`);
            }
        }

        return errors;
    }

    handleProgress(progress) {
        if (this.recordCount >= CONFIG.maxRecordsToProcess) {
            return;
        }
        
        console.log(`Progress: ${progress.percentage}% | Processed: ${progress.recordsProcessed.toLocaleString()} | Valid: ${this.validCount.toLocaleString()} | Invalid: ${this.invalidCount.toLocaleString()}`);
    }

    showResults() {
        console.log('');
        console.log('='.repeat(80));
        console.log('ANALYSIS RESULTS');
        console.log('='.repeat(80));
        console.log(`Total records processed: ${this.recordCount.toLocaleString()}`);
        console.log(`Valid records: ${this.validCount.toLocaleString()} (${((this.validCount / this.recordCount) * 100).toFixed(2)}%)`);
        console.log(`Invalid records: ${this.invalidCount.toLocaleString()} (${((this.invalidCount / this.recordCount) * 100).toFixed(2)}%)`);
        console.log('='.repeat(80));
        console.log('');

        // Show validation error summary
        const errorStats = this.processor.getStatistics();
        console.log('VALIDATION ERROR BREAKDOWN:');
        console.log('-'.repeat(80));
        for (const [errorType, count] of Object.entries(errorStats.validationErrors)) {
            console.log(`  ${errorType}: ${count.toLocaleString()}`);
        }
        console.log('='.repeat(80));
        console.log('');

        // Show detailed invalid records
        console.log(`DETAILED INVALID RECORDS (first ${Math.min(this.invalidRecords.length, CONFIG.maxInvalidToShow)}):`);
        console.log('='.repeat(80));
        console.log('');

        this.invalidRecords.forEach((item, index) => {
            console.log(`\n[${ index + 1}] RECORD #${item.recordNumber}`);
            console.log('-'.repeat(80));
            console.log('Raw Data:');
            for (const [key, value] of Object.entries(item.rawRecord)) {
                console.log(`  ${key}: "${value}"`);
            }
            console.log('');
            console.log('Validation Errors:');
            item.validationErrors.forEach((error, i) => {
                console.log(`  ${i + 1}. ${error}`);
            });
            console.log('');
        });

        console.log('='.repeat(80));
        console.log('ANALYSIS COMPLETE');
        console.log('='.repeat(80));
    }
}

// Run the analyzer
if (require.main === module) {
    const analyzer = new InvalidRecordAnalyzer();
    
    analyzer.analyze()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Analysis failed:', error);
            process.exit(1);
        });
}

module.exports = InvalidRecordAnalyzer;
