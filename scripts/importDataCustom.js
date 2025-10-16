/**
 * Data Import Script using Custom CSV Parser
 * Production-grade data import with validation and error handling
 */

require('dotenv').config({ path: '../backend/.env' });
const path = require('path');
const CustomCSVParser = require('../backend/src/services/CustomCSVParser');
const DataProcessor = require('../backend/src/services/DataProcessor');
const logger = require('../backend/src/config/logger');

// Configuration
const CONFIG = {
    inputFile: path.join(__dirname, '../data/raw/train.csv'),
    outputFile: path.join(__dirname, '../data/processed/processed_trips.json'),
    errorLogFile: path.join(__dirname, '../logs/import_errors.log'),
    batchSize: 1000,
    chunkSize: 64 * 1024, // 64KB chunks
    maxErrors: 10000, // Stop if more than 10k errors
    progressInterval: 5000 // Show progress every 5000 records
};

class DataImporter {
    constructor() {
        this.parser = new CustomCSVParser({
            delimiter: ',',
            quote: '"',
            chunkSize: CONFIG.chunkSize,
            skipEmptyLines: true,
            skipHeader: false,
            batchSize: CONFIG.batchSize
        });

        this.processor = new DataProcessor({
            batchSize: CONFIG.batchSize,
            strictValidation: true,
            calculateDerivedFeatures: true
        });

        this.stats = {
            startTime: null,
            endTime: null,
            totalRecords: 0,
            processedRecords: 0,
            validRecords: 0,
            invalidRecords: 0,
            batches: [],
            errors: []
        };

        this.outputBatches = [];
    }

    /**
     * Start the import process
     */
    async start() {
        try {
            logger.info('='.repeat(80));
            logger.info('NYC TAXI DATA IMPORT - CUSTOM PARSER');
            logger.info('='.repeat(80));
            logger.info(`Input file: ${CONFIG.inputFile}`);
            logger.info(`Output file: ${CONFIG.outputFile}`);
            logger.info(`Batch size: ${CONFIG.batchSize}`);
            logger.info(`Chunk size: ${CONFIG.chunkSize} bytes`);
            logger.info('='.repeat(80));

            this.stats.startTime = Date.now();

            // Parse CSV with callbacks
            await this.parser.parse(CONFIG.inputFile, {
                onRecord: this.handleRecord.bind(this),
                onBatch: this.handleBatch.bind(this),
                onProgress: this.handleProgress.bind(this),
                onError: this.handleError.bind(this),
                onComplete: this.handleComplete.bind(this)
            });

        } catch (error) {
            logger.error('Import failed:', error);
            process.exit(1);
        }
    }

    /**
     * Handle individual record
     * @param {Object} record - Parsed CSV record
     * @returns {Object|null} - Processed record or null
     */
    async handleRecord(record) {
        try {
            const processed = await this.processor.processRecord(record);
            
            if (processed) {
                this.stats.validRecords++;
                return processed;
            } else {
                this.stats.invalidRecords++;
                return null;
            }
        } catch (error) {
            logger.error('Error handling record:', error);
            this.stats.invalidRecords++;
            return null;
        }
    }

    /**
     * Handle batch of records
     * @param {Array} batch - Batch of processed records
     * @param {number} batchNumber - Batch number
     */
    async handleBatch(batch, batchNumber) {
        try {
            logger.info(`Processing batch ${batchNumber}: ${batch.length} records`);

            // Store batch for later database insertion
            this.outputBatches.push({
                batchNumber,
                records: batch,
                timestamp: new Date().toISOString()
            });

            this.stats.batches.push({
                batchNumber,
                recordCount: batch.length,
                timestamp: new Date().toISOString()
            });

            // Optional: Insert into database here
            // await this.insertToDatabase(batch);

        } catch (error) {
            logger.error(`Error processing batch ${batchNumber}:`, error);
            this.stats.errors.push({
                type: 'batch_processing',
                batchNumber,
                error: error.message
            });
        }
    }

    /**
     * Handle progress updates
     * @param {Object} progress - Progress information
     */
    handleProgress(progress) {
        const {
            bytesProcessed,
            recordsProcessed,
            validRecords,
            invalidRecords,
            percentage,
            speed
        } = progress;

        logger.info('='.repeat(80));
        logger.info(`Progress: ${percentage}%`);
        logger.info(`Records processed: ${recordsProcessed.toLocaleString()}`);
        logger.info(`Valid records: ${validRecords.toLocaleString()}`);
        logger.info(`Invalid records: ${invalidRecords.toLocaleString()}`);
        logger.info(`Speed: ${speed.recordsPerSecond} records/sec, ${speed.mbPerSecond} MB/sec`);
        logger.info(`Elapsed time: ${speed.elapsedSeconds}s`);
        logger.info('='.repeat(80));
    }

    /**
     * Handle errors
     * @param {Error} error - Error object
     */
    handleError(error) {
        logger.error('Import error:', error);
        this.stats.errors.push({
            type: 'import_error',
            message: error.message,
            timestamp: new Date().toISOString()
        });

        // Stop if too many errors
        if (this.stats.errors.length > CONFIG.maxErrors) {
            logger.error(`Too many errors (${this.stats.errors.length}). Stopping import.`);
            process.exit(1);
        }
    }

    /**
     * Handle completion
     * @param {Object} parserStats - Parser statistics
     */
    async handleComplete(parserStats) {
        this.stats.endTime = Date.now();
        const totalTime = ((this.stats.endTime - this.stats.startTime) / 1000).toFixed(2);

        logger.info('='.repeat(80));
        logger.info('IMPORT COMPLETED');
        logger.info('='.repeat(80));
        logger.info('Parser Statistics:');
        logger.info(`  Total lines: ${parserStats.totalLines.toLocaleString()}`);
        logger.info(`  Total records: ${parserStats.totalRecords.toLocaleString()}`);
        logger.info(`  Empty lines: ${parserStats.emptyLines.toLocaleString()}`);
        logger.info(`  Parse errors: ${parserStats.errors.length.toLocaleString()}`);
        logger.info('');
        logger.info('Processor Statistics:');
        const processorStats = this.processor.getStatistics();
        logger.info(`  Total processed: ${processorStats.totalProcessed.toLocaleString()}`);
        logger.info(`  Valid records: ${processorStats.validRecords.toLocaleString()}`);
        logger.info(`  Invalid records: ${processorStats.invalidRecords.toLocaleString()}`);
        logger.info(`  Validation rate: ${processorStats.validationRate}`);
        logger.info('');
        logger.info('Validation Errors:');
        for (const [errorType, count] of Object.entries(processorStats.validationErrors)) {
            logger.info(`  ${errorType}: ${count.toLocaleString()}`);
        }
        logger.info('');
        logger.info('Performance:');
        logger.info(`  Total time: ${totalTime}s`);
        logger.info(`  Records per second: ${(processorStats.totalProcessed / totalTime).toFixed(2)}`);
        logger.info(`  Batches processed: ${this.stats.batches.length}`);
        logger.info('='.repeat(80));

        // Export to JSON (optional)
        if (CONFIG.outputFile) {
            await this.exportToJSON();
        }

        // Show sample of processed data
        this.showSampleData();
    }

    /**
     * Export processed data to JSON
     */
    async exportToJSON() {
        try {
            const fs = require('fs').promises;
            
            logger.info('Exporting to JSON...');
            
            // Flatten batches
            const allRecords = this.outputBatches.flatMap(batch => batch.records);
            
            // Write to file (first 10000 records for demo)
            const sampleRecords = allRecords.slice(0, 10000);
            await fs.writeFile(
                CONFIG.outputFile,
                JSON.stringify({
                    metadata: {
                        exportDate: new Date().toISOString(),
                        totalRecords: allRecords.length,
                        sampleSize: sampleRecords.length,
                        processingTime: ((this.stats.endTime - this.stats.startTime) / 1000).toFixed(2) + 's'
                    },
                    records: sampleRecords
                }, null, 2)
            );
            
            logger.info(`Exported ${sampleRecords.length} records to ${CONFIG.outputFile}`);
        } catch (error) {
            logger.error('Error exporting to JSON:', error);
        }
    }

    /**
     * Show sample of processed data
     */
    showSampleData() {
        logger.info('');
        logger.info('Sample of processed data (first record):');
        logger.info('='.repeat(80));
        
        if (this.outputBatches.length > 0 && this.outputBatches[0].records.length > 0) {
            const sample = this.outputBatches[0].records[0];
            logger.info(JSON.stringify(sample, null, 2));
        } else {
            logger.info('No data to display');
        }
        
        logger.info('='.repeat(80));
    }
}

// Run the import
if (require.main === module) {
    const importer = new DataImporter();
    
    importer.start()
        .then(() => {
            logger.info('Import completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Import failed:', error);
            process.exit(1);
        });
}

module.exports = DataImporter;
