/**
 * Inclusive Data Import Script
 * INCLUDES ALL records with proper categorization
 */

require('dotenv').config({ path: '../backend/.env' });
const path = require('path');
const CustomCSVParser = require('../backend/src/services/CustomCSVParser');
const DataProcessorInclusive = require('../backend/src/services/DataProcessorInclusive');
const logger = require('../backend/src/config/logger');

const CONFIG = {
    inputFile: path.join(__dirname, '../data/raw/train.csv'),
    outputFile: path.join(__dirname, '../data/processed/processed_trips_inclusive.json'),
    maxRecords: 100000, // Process first 100k for demo
    batchSize: 1000
};

class InclusiveDataImporter {
    constructor() {
        this.parser = new CustomCSVParser({
            delimiter: ',',
            quote: '"',
            chunkSize: 64 * 1024,
            skipEmptyLines: true,
            skipHeader: false,
            batchSize: CONFIG.batchSize
        });

        this.processor = new DataProcessorInclusive({
            batchSize: CONFIG.batchSize,
            calculateDerivedFeatures: true
        });

        this.stats = {
            startTime: null,
            endTime: null,
            totalRecords: 0,
            byCategory: {},
            byFlag: {},
            batches: []
        };

        this.outputBatches = [];
    }

    async start() {
        try {
            console.log('='.repeat(80));
            console.log('INCLUSIVE DATA IMPORT - ALL RECORDS CATEGORIZED');
            console.log('='.repeat(80));
            console.log(`Input file: ${CONFIG.inputFile}`);
            console.log(`Output file: ${CONFIG.outputFile}`);
            console.log(`Max records: ${CONFIG.maxRecords.toLocaleString()}`);
            console.log(`Batch size: ${CONFIG.batchSize}`);
            console.log('='.repeat(80));
            console.log('');

            this.stats.startTime = Date.now();

            await this.parser.parse(CONFIG.inputFile, {
                onRecord: this.handleRecord.bind(this),
                onBatch: this.handleBatch.bind(this),
                onProgress: this.handleProgress.bind(this),
                onComplete: this.handleComplete.bind(this)
            });

        } catch (error) {
            logger.error('Import failed:', error);
            process.exit(1);
        }
    }

    async handleRecord(record) {
        // Stop after max records
        if (this.stats.totalRecords >= CONFIG.maxRecords) {
            return null;
        }

        this.stats.totalRecords++;

        // Process record (NEVER returns null!)
        const processed = await this.processor.processRecord(record);
        
        // Track categories
        const category = processed.data_category;
        if (!this.stats.byCategory[category]) {
            this.stats.byCategory[category] = 0;
        }
        this.stats.byCategory[category]++;

        // Track flags
        if (processed.data_flags && processed.data_flags.length > 0) {
            processed.data_flags.forEach(flag => {
                if (!this.stats.byFlag[flag]) {
                    this.stats.byFlag[flag] = 0;
                }
                this.stats.byFlag[flag]++;
            });
        }

        return processed;
    }

    async handleBatch(batch, batchNumber) {
        try {
            console.log(`Processing batch ${batchNumber}: ${batch.length} records`);

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

        } catch (error) {
            logger.error(`Error processing batch ${batchNumber}:`, error);
        }
    }

    handleProgress(progress) {
        if (this.stats.totalRecords >= CONFIG.maxRecords) {
            return;
        }

        console.log('='.repeat(80));
        console.log(`Progress: ${progress.percentage}%`);
        console.log(`Records processed: ${this.stats.totalRecords.toLocaleString()}`);
        console.log(`Speed: ${progress.speed.recordsPerSecond} records/sec, ${progress.speed.mbPerSecond} MB/sec`);
        console.log('='.repeat(80));
    }

    async handleComplete(parserStats) {
        this.stats.endTime = Date.now();
        const totalTime = ((this.stats.endTime - this.stats.startTime) / 1000).toFixed(2);

        console.log('');
        console.log('='.repeat(80));
        console.log('IMPORT COMPLETED - ALL RECORDS INCLUDED');
        console.log('='.repeat(80));
        console.log('');
        
        console.log('Processing Statistics:');
        const processorStats = this.processor.getStatistics();
        console.log(`  Total processed: ${processorStats.totalProcessed.toLocaleString()}`);
        console.log(`  Fully valid (NYC, normal duration): ${processorStats.fullyValid.toLocaleString()} (${processorStats.validRate})`);
        console.log(`  With flags/categories: ${processorStats.withFlags.toLocaleString()}`);
        console.log('');
        
        console.log('Records by Category:');
        console.log('-'.repeat(80));
        for (const [category, count] of Object.entries(this.stats.byCategory).sort((a, b) => b[1] - a[1])) {
            const percentage = ((count / this.stats.totalRecords) * 100).toFixed(2);
            console.log(`  ${category.padEnd(25)} ${count.toString().padStart(10)} (${percentage}%)`);
        }
        console.log('');
        
        console.log('Records by Flag:');
        console.log('-'.repeat(80));
        for (const [flag, count] of Object.entries(this.stats.byFlag).sort((a, b) => b[1] - a[1])) {
            const percentage = ((count / this.stats.totalRecords) * 100).toFixed(2);
            console.log(`  ${flag.padEnd(30)} ${count.toString().padStart(10)} (${percentage}%)`);
        }
        console.log('');
        
        console.log('Performance:');
        console.log(`  Total time: ${totalTime}s`);
        console.log(`  Records per second: ${(this.stats.totalRecords / totalTime).toFixed(2)}`);
        console.log(`  Batches processed: ${this.stats.batches.length}`);
        console.log('='.repeat(80));

        // Export sample
        await this.exportSample();
        
        // Show samples
        this.showSamples();
    }

    async exportSample() {
        try {
            const fs = require('fs').promises;
            
            console.log('');
            console.log('Exporting sample data...');
            
            // Flatten batches
            const allRecords = this.outputBatches.flatMap(batch => batch.records);
            
            // Export first 1000 records as sample
            const sampleRecords = allRecords.slice(0, 1000);
            
            // Group samples by category
            const byCategory = {};
            sampleRecords.forEach(record => {
                const cat = record.data_category;
                if (!byCategory[cat]) byCategory[cat] = [];
                byCategory[cat].push(record);
            });
            
            await fs.writeFile(
                CONFIG.outputFile,
                JSON.stringify({
                    metadata: {
                        exportDate: new Date().toISOString(),
                        totalRecords: allRecords.length,
                        sampleSize: sampleRecords.length,
                        processingTime: ((this.stats.endTime - this.stats.startTime) / 1000).toFixed(2) + 's',
                        philosophy: 'All records included with categorization',
                        categories: Object.keys(this.stats.byCategory)
                    },
                    summary: {
                        byCategory: this.stats.byCategory,
                        byFlag: this.stats.byFlag
                    },
                    sampleRecords: sampleRecords,
                    samplesByCategory: byCategory
                }, null, 2)
            );
            
            console.log(`Exported sample to ${CONFIG.outputFile}`);
        } catch (error) {
            logger.error('Error exporting sample:', error);
        }
    }

    showSamples() {
        console.log('');
        console.log('='.repeat(80));
        console.log('SAMPLE RECORDS BY CATEGORY');
        console.log('='.repeat(80));
        console.log('');

        // Get one example from each category
        const examples = {};
        const allRecords = this.outputBatches.flatMap(batch => batch.records);
        
        allRecords.forEach(record => {
            const cat = record.data_category;
            if (!examples[cat]) {
                examples[cat] = record;
            }
        });

        for (const [category, record] of Object.entries(examples)) {
            console.log(`Category: ${category.toUpperCase()}`);
            console.log('-'.repeat(80));
            console.log(`  ID: ${record.id}`);
            console.log(`  Duration: ${record.trip_duration}s`);
            if (record.pickup_datetime) {
                console.log(`  Pickup: ${record.pickup_datetime.toISOString()}`);
            }
            if (record.pickup_latitude && record.pickup_longitude) {
                console.log(`  Pickup Location: (${record.pickup_latitude.toFixed(4)}, ${record.pickup_longitude.toFixed(4)})`);
            }
            if (record.dropoff_latitude && record.dropoff_longitude) {
                console.log(`  Dropoff Location: (${record.dropoff_latitude.toFixed(4)}, ${record.dropoff_longitude.toFixed(4)})`);
            }
            if (record.distance_km) {
                console.log(`  Distance: ${record.distance_km} km`);
            }
            if (record.speed_kmh) {
                console.log(`  Speed: ${record.speed_kmh} km/h`);
            }
            console.log(`  Data Quality Score: ${record.data_quality_score}/100`);
            if (record.data_flags.length > 0) {
                console.log(`  Flags: ${record.data_flags.join(', ')}`);
            }
            if (record.validation_issues.length > 0) {
                console.log(`  Issues: ${record.validation_issues.join('; ')}`);
            }
            console.log('');
        }

        console.log('='.repeat(80));
    }
}

// Run the import
if (require.main === module) {
    const importer = new InclusiveDataImporter();
    
    importer.start()
        .then(() => {
            console.log('Import completed successfully - ALL RECORDS INCLUDED');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Import failed:', error);
            process.exit(1);
        });
}

module.exports = InclusiveDataImporter;
