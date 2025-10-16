/**
 * Data Import Script for Urban Mobility Data Explorer
 * Imports and processes the NYC taxi trip dataset
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const DataParser = require('../backend/src/services/dataParser');
const { query, testConnection, closePool } = require('../backend/src/config/database');
const logger = require('../backend/src/config/logger');

class DataImporter {
    constructor() {
        this.dataParser = new DataParser({
            batchSize: 1000,
            maxConcurrentProcesses: 4
        });
        this.stats = {
            startTime: Date.now(),
            totalRecords: 0,
            validRecords: 0,
            invalidRecords: 0,
            processedBatches: 0,
            errors: []
        };
    }

    /**
     * Import data from CSV file
     * @param {string} filePath - Path to CSV file
     */
    async importData(filePath) {
        try {
            logger.info(`Starting data import from: ${filePath}`);
            
            // Test database connection
            const connected = await testConnection();
            if (!connected) {
                throw new Error('Failed to connect to database');
            }

            // Clear existing data
            await this.clearExistingData();

            // Parse and import data
            await this.dataParser.parseCSV(
                filePath,
                this.processBatch.bind(this),
                this.onImportComplete.bind(this)
            );

        } catch (error) {
            logger.error('Data import failed:', error);
            throw error;
        }
    }

    /**
     * Process a batch of records
     * @param {Array} batch - Batch of processed records
     * @param {number} batchNumber - Batch number
     */
    async processBatch(batch, batchNumber) {
        try {
            logger.info(`Processing batch ${batchNumber} with ${batch.length} records`);
            
            // Insert batch into database
            await this.dataParser.insertBatch(batch);
            
            // Update statistics
            this.stats.validRecords += batch.length;
            this.stats.processedBatches = batchNumber;
            
            // Log progress every 10 batches
            if (batchNumber % 10 === 0) {
                const progress = (batchNumber * this.dataParser.batchSize / this.stats.totalRecords * 100).toFixed(2);
                logger.info(`Import progress: ${progress}% (${this.stats.validRecords} records processed)`);
            }
            
        } catch (error) {
            logger.error(`Error processing batch ${batchNumber}:`, error);
            this.stats.errors.push({
                batch: batchNumber,
                error: error.message,
                recordCount: batch.length
            });
        }
    }

    /**
     * Handle import completion
     * @param {Object} parserStats - Parser statistics
     */
    async onImportComplete(parserStats) {
        const endTime = Date.now();
        const totalTime = (endTime - this.stats.startTime) / 1000;
        
        this.stats = { ...this.stats, ...parserStats };
        
        logger.info('Data import completed', {
            totalTime: `${totalTime}s`,
            totalRecords: this.stats.totalRecords,
            validRecords: this.stats.validRecords,
            invalidRecords: this.stats.invalidRecords,
            processedBatches: this.stats.processedBatches,
            errors: this.stats.errors.length,
            successRate: `${((this.stats.validRecords / this.stats.totalRecords) * 100).toFixed(2)}%`
        });

        // Update database statistics
        await this.updateDatabaseStats();
        
        // Close database connections
        await closePool();
    }

    /**
     * Clear existing data from database
     */
    async clearExistingData() {
        try {
            logger.info('Clearing existing trip data...');
            
            // Disable foreign key checks temporarily
            await query('SET session_replication_role = replica;');
            
            // Clear trips table
            await query('TRUNCATE TABLE trips RESTART IDENTITY CASCADE;');
            
            // Re-enable foreign key checks
            await query('SET session_replication_role = DEFAULT;');
            
            logger.info('Existing data cleared successfully');
            
        } catch (error) {
            logger.error('Error clearing existing data:', error);
            throw error;
        }
    }

    /**
     * Update database statistics
     */
    async updateDatabaseStats() {
        try {
            logger.info('Updating database statistics...');
            
            // Update table statistics
            await query('ANALYZE trips;');
            
            // Get final record count
            const result = await query('SELECT COUNT(*) as count FROM trips;');
            const finalCount = result.rows[0].count;
            
            logger.info(`Final record count: ${finalCount}`);
            
        } catch (error) {
            logger.error('Error updating database statistics:', error);
        }
    }

    /**
     * Validate imported data
     */
    async validateData() {
        try {
            logger.info('Validating imported data...');
            
            // Check for basic data integrity
            const checks = await Promise.all([
                query('SELECT COUNT(*) as count FROM trips WHERE pickup_datetime IS NULL;'),
                query('SELECT COUNT(*) as count FROM trips WHERE dropoff_datetime IS NULL;'),
                query('SELECT COUNT(*) as count FROM trips WHERE trip_duration <= 0;'),
                query('SELECT COUNT(*) as count FROM trips WHERE distance_km IS NULL;'),
                query('SELECT MIN(pickup_datetime) as min_date, MAX(pickup_datetime) as max_date FROM trips;'),
                query('SELECT COUNT(DISTINCT vendor_id) as vendor_count FROM trips;')
            ]);

            const [nullPickup, nullDropoff, invalidDuration, nullDistance, dateRange, vendorCount] = checks;
            
            const validationResults = {
                nullPickupDates: parseInt(nullPickup.rows[0].count),
                nullDropoffDates: parseInt(nullDropoff.rows[0].count),
                invalidDurations: parseInt(invalidDuration.rows[0].count),
                nullDistances: parseInt(nullDistance.rows[0].count),
                dateRange: {
                    min: dateRange.rows[0].min_date,
                    max: dateRange.rows[0].max_date
                },
                vendorCount: parseInt(vendorCount.rows[0].vendor_count)
            };

            logger.info('Data validation completed:', validationResults);
            
            // Check for data quality issues
            const issues = [];
            if (validationResults.nullPickupDates > 0) {
                issues.push(`${validationResults.nullPickupDates} records with null pickup dates`);
            }
            if (validationResults.nullDropoffDates > 0) {
                issues.push(`${validationResults.nullDropoffDates} records with null dropoff dates`);
            }
            if (validationResults.invalidDurations > 0) {
                issues.push(`${validationResults.invalidDurations} records with invalid durations`);
            }
            if (validationResults.nullDistances > 0) {
                issues.push(`${validationResults.nullDistances} records with null distances`);
            }

            if (issues.length > 0) {
                logger.warn('Data quality issues found:', issues);
            } else {
                logger.info('Data validation passed - no quality issues found');
            }

            return validationResults;
            
        } catch (error) {
            logger.error('Error validating data:', error);
            throw error;
        }
    }

    /**
     * Generate import report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            statistics: this.stats,
            summary: {
                totalTime: `${((Date.now() - this.stats.startTime) / 1000).toFixed(2)}s`,
                recordsPerSecond: Math.round(this.stats.validRecords / ((Date.now() - this.stats.startTime) / 1000)),
                successRate: `${((this.stats.validRecords / this.stats.totalRecords) * 100).toFixed(2)}%`,
                errorRate: `${((this.stats.errors.length / this.stats.processedBatches) * 100).toFixed(2)}%`
            }
        };

        // Save report to file
        const reportPath = path.join(__dirname, '../logs/import-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        logger.info(`Import report saved to: ${reportPath}`);
        return report;
    }
}

// Main execution
async function main() {
    const importer = new DataImporter();
    
    try {
        // Get CSV file path from command line arguments or use default
        const csvPath = process.argv[2] || path.join(__dirname, '../train.csv');
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`CSV file not found: ${csvPath}`);
        }

        // Import data
        await importer.importData(csvPath);
        
        // Validate imported data
        await importer.validateData();
        
        // Generate report
        const report = importer.generateReport();
        
        console.log('\n=== IMPORT SUMMARY ===');
        console.log(`Total Records: ${report.statistics.totalRecords.toLocaleString()}`);
        console.log(`Valid Records: ${report.statistics.validRecords.toLocaleString()}`);
        console.log(`Invalid Records: ${report.statistics.invalidRecords.toLocaleString()}`);
        console.log(`Success Rate: ${report.summary.successRate}`);
        console.log(`Total Time: ${report.summary.totalTime}`);
        console.log(`Records/Second: ${report.summary.recordsPerSecond}`);
        console.log(`Errors: ${report.statistics.errors.length}`);
        
        if (report.statistics.errors.length > 0) {
            console.log('\n=== ERRORS ===');
            report.statistics.errors.forEach(error => {
                console.log(`Batch ${error.batch}: ${error.error}`);
            });
        }
        
        console.log('\nImport completed successfully!');
        
    } catch (error) {
        console.error('Import failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = DataImporter;
