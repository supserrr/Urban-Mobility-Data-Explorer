/**
 * Production Data Import
 * Imports ALL 1.4M+ records into PostgreSQL
 */

require('dotenv').config({ path: '../backend/.env' });
const { Client } = require('pg');
const path = require('path');
const CustomCSVParser = require('../backend/src/services/CustomCSVParser');
const DataProcessorInclusive = require('../backend/src/services/DataProcessorInclusive');

const CONFIG = {
    inputFile: path.join(__dirname, '../data/raw/train.csv'),
    batchSize: 1000,
    dbConfig: {
        host: 'localhost',
        database: 'urban_mobility',
        port: 5432
    }
};

class ProductionImporter {
    constructor() {
        this.parser = new CustomCSVParser({
            delimiter: ',',
            quote: '"',
            chunkSize: 64 * 1024,
            skipEmptyLines: true,
            batchSize: CONFIG.batchSize
        });

        this.processor = new DataProcessorInclusive({
            batchSize: CONFIG.batchSize,
            calculateDerivedFeatures: true
        });

        this.client = new Client(CONFIG.dbConfig);
        this.stats = {
            startTime: null,
            totalProcessed: 0,
            totalInserted: 0,
            errors: 0
        };
    }

    async start() {
        try {
            console.log('='.repeat(80));
            console.log('PRODUCTION DATA IMPORT - ALL 1.4M+ RECORDS');
            console.log('='.repeat(80));
            console.log(`Input: ${CONFIG.inputFile}`);
            console.log(`Database: ${CONFIG.dbConfig.database}`);
            console.log(`Batch size: ${CONFIG.batchSize}`);
            console.log('='.repeat(80));
            console.log('');

            // Connect to database
            await this.client.connect();
            console.log(' Connected to PostgreSQL');
            console.log('');

            this.stats.startTime = Date.now();

            // Parse and import
            await this.parser.parse(CONFIG.inputFile, {
                onRecord: this.handleRecord.bind(this),
                onBatch: this.handleBatch.bind(this),
                onProgress: this.handleProgress.bind(this),
                onComplete: this.handleComplete.bind(this)
            });

        } catch (error) {
            console.error('Import failed:', error);
            process.exit(1);
        } finally {
            await this.client.end();
        }
    }

    async handleRecord(record) {
        this.stats.totalProcessed++;
        return await this.processor.processRecord(record);
    }

    async handleBatch(batch, batchNumber) {
        try {
            if (batchNumber % 10 === 0) {
                console.log(`Processing batch ${batchNumber}: ${batch.length} records`);
            }

            // Insert batch into database
            await this.insertBatch(batch);
            this.stats.totalInserted += batch.length;

        } catch (error) {
            console.error(`Error inserting batch ${batchNumber}:`, error);
            this.stats.errors++;
        }
    }

    async insertBatch(batch) {
        const query = `
            INSERT INTO trips (
                original_id, vendor_id, vendor_name,
                pickup_datetime, dropoff_datetime, passenger_count,
                pickup_longitude, pickup_latitude,
                dropoff_longitude, dropoff_latitude,
                store_and_fwd_flag, trip_duration,
                distance_km, speed_kmh, fare_estimate, fare_per_km,
                pickup_hour, pickup_day_of_week, pickup_day_of_month,
                pickup_month, pickup_year, time_of_day, day_type,
                data_category, data_quality_score,
                is_valid_nyc_trip, is_suburban_trip, is_micro_trip,
                is_extended_trip, has_anomalies,
                pickup_in_nyc, dropoff_in_nyc, destination_region,
                processed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                      $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
                      $31, $32, $33, $34)
        `;

        for (const record of batch) {
            try {
                await this.client.query(query, [
                    record.id,
                    record.vendor_id,
                    record.vendor_name,
                    record.pickup_datetime,
                    record.dropoff_datetime,
                    record.passenger_count,
                    record.pickup_longitude,
                    record.pickup_latitude,
                    record.dropoff_longitude,
                    record.dropoff_latitude,
                    record.store_and_fwd_flag,
                    record.trip_duration,
                    record.distance_km,
                    record.speed_kmh,
                    record.fare_estimate,
                    record.fare_per_km,
                    record.pickup_hour,
                    record.pickup_day_of_week,
                    record.pickup_day_of_month,
                    record.pickup_month,
                    record.pickup_year,
                    record.time_of_day,
                    record.day_type,
                    record.data_category,
                    record.data_quality_score,
                    record.is_valid_nyc_trip,
                    record.is_suburban_trip,
                    record.is_micro_trip,
                    record.is_extended_trip,
                    record.has_anomalies,
                    record.pickup_in_nyc !== undefined ? record.pickup_in_nyc : null,
                    record.dropoff_in_nyc !== undefined ? record.dropoff_in_nyc : null,
                    record.destination_region || null,
                    record.processed_at
                ]);
            } catch (err) {
                console.error('Error inserting record:', err.message);
            }
        }
    }

    handleProgress(progress) {
        const elapsed = ((Date.now() - this.stats.startTime) / 1000).toFixed(0);
        console.log('='.repeat(80));
        console.log(`Progress: ${progress.percentage}%`);
        console.log(`Records: ${this.stats.totalProcessed.toLocaleString()} processed, ${this.stats.totalInserted.toLocaleString()} inserted`);
        console.log(`Speed: ${progress.speed.recordsPerSecond} rec/sec`);
        console.log(`Elapsed: ${elapsed}s | Errors: ${this.stats.errors}`);
        console.log('='.repeat(80));
    }

    async handleComplete(parserStats) {
        const totalTime = ((Date.now() - this.stats.startTime) / 1000).toFixed(2);

        console.log('');
        console.log('='.repeat(80));
        console.log('IMPORT COMPLETED');
        console.log('='.repeat(80));
        console.log(`Total processed: ${this.stats.totalProcessed.toLocaleString()}`);
        console.log(`Total inserted: ${this.stats.totalInserted.toLocaleString()}`);
        console.log(`Total time: ${totalTime}s (${(totalTime / 60).toFixed(1)} minutes)`);
        console.log(`Errors: ${this.stats.errors}`);
        console.log('='.repeat(80));

        // Verify database
        const result = await this.client.query('SELECT COUNT(*) FROM trips');
        console.log(` Database verification: ${result.rows[0].count} records in database`);
        
        const categoryResult = await this.client.query('SELECT * FROM category_stats ORDER BY trip_count DESC');
        console.log('');
        console.log('Category distribution:');
        categoryResult.rows.forEach(row => {
            console.log(`  ${row.data_category}: ${row.trip_count} (${row.percentage}%)`);
        });
    }
}

// Run import
if (require.main === module) {
    const importer = new ProductionImporter();
    importer.start()
        .then(() => {
            console.log(' Production import complete!');
            process.exit(0);
        })
        .catch(err => {
            console.error(' Import failed:', err);
            process.exit(1);
        });
}

module.exports = ProductionImporter;
