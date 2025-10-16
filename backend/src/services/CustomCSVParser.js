// Custom CSV Parser

const fs = require('fs');
const { Transform, pipeline } = require('stream');
const { promisify } = require('util');
const logger = require('../config/logger');

const pipelineAsync = promisify(pipeline);

class CustomCSVParser {
    constructor(options = {}) {
        // Configuration
        this.config = {
            delimiter: options.delimiter || ',',
            quote: options.quote || '"',
            escape: options.escape || '"',
            encoding: options.encoding || 'utf8',
            chunkSize: options.chunkSize || 64 * 1024, // 64KB chunks
            highWaterMark: options.highWaterMark || 16 * 1024, // 16KB buffer
            skipEmptyLines: options.skipEmptyLines !== false,
            skipHeader: options.skipHeader || false,
            maxFieldSize: options.maxFieldSize || 128 * 1024, // 128KB per field
            errorTolerance: options.errorTolerance || 0.01, // 1% error tolerance
            ...options
        };

        // State tracking
        this.state = {
            lineNumber: 0,
            recordNumber: 0,
            bytesProcessed: 0,
            startTime: null,
            endTime: null,
            paused: false,
            headers: null,
            buffer: '',
            inQuote: false,
            currentField: '',
            currentRecord: [],
            errors: [],
            warnings: []
        };

        // Statistics
        this.stats = {
            totalLines: 0,
            totalRecords: 0,
            validRecords: 0,
            invalidRecords: 0,
            emptyLines: 0,
            bytesProcessed: 0,
            processingTime: 0,
            recordsPerSecond: 0,
            errors: []
        };
    }

    /**
     * Parse CSV file with streaming
     * @param {string} filePath - Path to CSV file
     * @param {Object} callbacks - Processing callbacks
     * @returns {Promise<Object>} - Parsing statistics
     */
    async parse(filePath, callbacks = {}) {
        const {
            onRecord = null,
            onBatch = null,
            onProgress = null,
            onError = null,
            onComplete = null
        } = callbacks;

        this.state.startTime = Date.now();
        logger.info(`Starting custom CSV parsing: ${filePath}`);

        try {
            // Verify file exists and get size
            const stats = await fs.promises.stat(filePath);
            const fileSize = stats.size;
            logger.info(`File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

            // Create read stream
            const readStream = fs.createReadStream(filePath, {
                encoding: this.config.encoding,
                highWaterMark: this.config.highWaterMark
            });

            // Create parser transform stream
            const parserStream = this.createParserStream();

            // Create batch accumulator
            const batchAccumulator = this.createBatchAccumulator(
                onRecord,
                onBatch,
                onProgress,
                onError,
                fileSize
            );

            // Pipeline streams with error handling
            await pipelineAsync(
                readStream,
                parserStream,
                batchAccumulator
            );

            this.state.endTime = Date.now();
            this.calculateStatistics();

            logger.info('CSV parsing completed successfully', this.stats);

            if (onComplete) {
                await onComplete(this.stats);
            }

            return this.stats;

        } catch (error) {
            logger.error('CSV parsing failed:', error);
            if (onError) {
                onError(error);
            }
            throw error;
        }
    }

    /**
     * Create parser transform stream
     * @returns {Transform} - Transform stream
     */
    createParserStream() {
        const self = this;
        
        return new Transform({
            objectMode: true,
            highWaterMark: this.config.highWaterMark,
            transform: function(chunk, encoding, callback) {
                try {
                    const records = self.parseChunk(chunk.toString());
                    
                    for (const record of records) {
                        this.push(record);
                    }
                    
                    callback();
                } catch (error) {
                    logger.error('Error in parser stream:', error);
                    callback(error);
                }
            },
            flush: function(callback) {
                try {
                    // Process any remaining buffered data
                    if (self.state.buffer.length > 0) {
                        const finalRecords = self.processLine(self.state.buffer, true);
                        if (finalRecords) {
                            this.push(finalRecords);
                        }
                    }
                    callback();
                } catch (error) {
                    callback(error);
                }
            }
        });
    }

    /**
     * Parse chunk of CSV data
     * @param {string} chunk - Data chunk
     * @returns {Array} - Parsed records
     */
    parseChunk(chunk) {
        const records = [];
        this.state.buffer += chunk;
        this.stats.bytesProcessed += chunk.length;

        let lineStart = 0;
        let i = 0;

        while (i < this.state.buffer.length) {
            const char = this.state.buffer[i];

            // Handle quotes
            if (char === this.config.quote) {
                if (this.state.inQuote) {
                    // Check for escaped quote
                    if (this.state.buffer[i + 1] === this.config.quote) {
                        i++; // Skip escaped quote
                    } else {
                        this.state.inQuote = false;
                    }
                } else {
                    this.state.inQuote = true;
                }
            }

            // Handle line breaks (only when not in quotes)
            if (!this.state.inQuote && (char === '\n' || char === '\r')) {
                // Extract complete line
                let line = this.state.buffer.substring(lineStart, i);
                
                // Handle Windows line endings (\r\n)
                if (char === '\r' && this.state.buffer[i + 1] === '\n') {
                    i++; // Skip \n
                }

                // Process line
                if (line.length > 0 || !this.config.skipEmptyLines) {
                    const record = this.processLine(line);
                    if (record) {
                        records.push(record);
                    }
                }

                lineStart = i + 1;
            }

            i++;
        }

        // Keep unprocessed data in buffer
        this.state.buffer = this.state.buffer.substring(lineStart);

        return records;
    }

    /**
     * Process a single line
     * @param {string} line - CSV line
     * @param {boolean} isFinal - Is this the final line
     * @returns {Object|null} - Parsed record or null
     */
    processLine(line, isFinal = false) {
        this.state.lineNumber++;
        this.stats.totalLines++;

        // Skip empty lines
        if (line.trim().length === 0) {
            if (this.config.skipEmptyLines) {
                this.stats.emptyLines++;
                return null;
            }
        }

        try {
            // Parse fields from line
            const fields = this.parseLine(line);

            // Handle header row
            if (this.state.lineNumber === 1 && !this.config.skipHeader) {
                this.state.headers = fields;
                logger.info(`Detected ${fields.length} columns: ${fields.join(', ')}`);
                return null;
            }

            // Skip header if configured
            if (this.state.lineNumber === 1 && this.config.skipHeader) {
                return null;
            }

            // Validate field count
            if (this.state.headers && fields.length !== this.state.headers.length) {
                this.handleParseError(
                    `Field count mismatch at line ${this.state.lineNumber}: expected ${this.state.headers.length}, got ${fields.length}`,
                    { line, fields }
                );
                return null;
            }

            // Create record object
            const record = this.createRecord(fields);
            
            this.state.recordNumber++;
            this.stats.totalRecords++;

            return record;

        } catch (error) {
            this.handleParseError(error.message, { line, lineNumber: this.state.lineNumber });
            return null;
        }
    }

    /**
     * Parse fields from a CSV line (RFC 4180 compliant)
     * @param {string} line - CSV line
     * @returns {Array} - Array of field values
     */
    parseLine(line) {
        const fields = [];
        let field = '';
        let inQuote = false;
        let i = 0;

        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (inQuote) {
                if (char === this.config.quote) {
                    // Check for escaped quote
                    if (nextChar === this.config.quote) {
                        field += this.config.quote;
                        i++; // Skip next quote
                    } else {
                        // End of quoted field
                        inQuote = false;
                    }
                } else {
                    field += char;
                }
            } else {
                if (char === this.config.quote) {
                    // Start of quoted field
                    inQuote = true;
                } else if (char === this.config.delimiter) {
                    // Field separator
                    fields.push(this.cleanField(field));
                    field = '';
                } else {
                    field += char;
                }
            }

            i++;
        }

        // Add final field
        fields.push(this.cleanField(field));

        return fields;
    }

    /**
     * Clean field value
     * @param {string} field - Raw field value
     * @returns {string} - Cleaned field value
     */
    cleanField(field) {
        // Trim whitespace
        field = field.trim();

        // Remove surrounding quotes if present
        if (field.startsWith(this.config.quote) && field.endsWith(this.config.quote)) {
            field = field.slice(1, -1);
        }

        // Unescape double quotes
        field = field.replace(new RegExp(this.config.quote + this.config.quote, 'g'), this.config.quote);

        return field;
    }

    /**
     * Create record object from fields
     * @param {Array} fields - Field values
     * @returns {Object} - Record object
     */
    createRecord(fields) {
        if (this.state.headers) {
            // Create object with headers as keys
            const record = {};
            for (let i = 0; i < this.state.headers.length; i++) {
                record[this.state.headers[i]] = fields[i] || '';
            }
            return record;
        } else {
            // Return array if no headers
            return fields;
        }
    }

    /**
     * Create batch accumulator stream
     * @param {Function} onRecord - Record callback
     * @param {Function} onBatch - Batch callback
     * @param {Function} onProgress - Progress callback
     * @param {Function} onError - Error callback
     * @param {number} fileSize - Total file size
     * @returns {Transform} - Transform stream
     */
    createBatchAccumulator(onRecord, onBatch, onProgress, onError, fileSize) {
        let batch = [];
        const batchSize = this.config.batchSize || 1000;
        let lastProgressUpdate = Date.now();
        const progressInterval = 1000; // Update every second

        return new Transform({
            objectMode: true,
            transform: async (record, encoding, callback) => {
                try {
                    // Call record callback
                    if (onRecord) {
                        const processedRecord = await onRecord(record);
                        if (processedRecord !== null) {
                            batch.push(processedRecord);
                            this.stats.validRecords++;
                        } else {
                            this.stats.invalidRecords++;
                        }
                    } else {
                        batch.push(record);
                        this.stats.validRecords++;
                    }

                    // Process batch when full
                    if (batch.length >= batchSize) {
                        if (onBatch) {
                            await onBatch(batch, Math.ceil(this.stats.totalRecords / batchSize));
                        }
                        batch = [];
                    }

                    // Report progress
                    const now = Date.now();
                    if (onProgress && (now - lastProgressUpdate) >= progressInterval) {
                        const progress = {
                            bytesProcessed: this.stats.bytesProcessed,
                            recordsProcessed: this.stats.totalRecords,
                            validRecords: this.stats.validRecords,
                            invalidRecords: this.stats.invalidRecords,
                            percentage: ((this.stats.bytesProcessed / fileSize) * 100).toFixed(2),
                            speed: this.calculateSpeed()
                        };
                        onProgress(progress);
                        lastProgressUpdate = now;
                    }

                    callback();
                } catch (error) {
                    if (onError) {
                        onError(error);
                    }
                    this.stats.invalidRecords++;
                    callback();
                }
            },
            flush: async (callback) => {
                try {
                    // Process remaining records in batch
                    if (batch.length > 0 && onBatch) {
                        await onBatch(batch, Math.ceil(this.stats.totalRecords / this.config.batchSize));
                    }
                    callback();
                } catch (error) {
                    callback(error);
                }
            }
        });
    }

    /**
     * Handle parsing errors
     * @param {string} message - Error message
     * @param {Object} context - Error context
     */
    handleParseError(message, context) {
        const error = {
            message,
            lineNumber: context.lineNumber || this.state.lineNumber,
            recordNumber: this.state.recordNumber,
            timestamp: new Date().toISOString(),
            ...context
        };

        this.stats.errors.push(error);
        this.stats.invalidRecords++;

        logger.warn(`Parse error at line ${error.lineNumber}: ${message}`);

        // Check error tolerance
        const errorRate = this.stats.invalidRecords / this.stats.totalLines;
        if (errorRate > this.config.errorTolerance) {
            throw new Error(`Error rate (${(errorRate * 100).toFixed(2)}%) exceeds tolerance (${(this.config.errorTolerance * 100).toFixed(2)}%)`);
        }
    }

    /**
     * Calculate processing speed
     * @returns {Object} - Speed metrics
     */
    calculateSpeed() {
        const elapsed = (Date.now() - this.state.startTime) / 1000;
        const recordsPerSecond = this.stats.totalRecords / elapsed;
        const mbPerSecond = (this.stats.bytesProcessed / 1024 / 1024) / elapsed;

        return {
            recordsPerSecond: recordsPerSecond.toFixed(2),
            mbPerSecond: mbPerSecond.toFixed(2),
            elapsedSeconds: elapsed.toFixed(2)
        };
    }

    /**
     * Calculate final statistics
     */
    calculateStatistics() {
        const processingTime = (this.state.endTime - this.state.startTime) / 1000;
        this.stats.processingTime = processingTime.toFixed(2);
        this.stats.recordsPerSecond = (this.stats.totalRecords / processingTime).toFixed(2);
        
        logger.info('Parsing statistics:', {
            totalLines: this.stats.totalLines,
            totalRecords: this.stats.totalRecords,
            validRecords: this.stats.validRecords,
            invalidRecords: this.stats.invalidRecords,
            emptyLines: this.stats.emptyLines,
            bytesProcessed: `${(this.stats.bytesProcessed / 1024 / 1024).toFixed(2)} MB`,
            processingTime: `${this.stats.processingTime}s`,
            recordsPerSecond: this.stats.recordsPerSecond,
            errorCount: this.stats.errors.length
        });
    }

    /**
     * Reset parser state for reuse
     */
    reset() {
        this.state = {
            lineNumber: 0,
            recordNumber: 0,
            bytesProcessed: 0,
            startTime: null,
            endTime: null,
            paused: false,
            headers: null,
            buffer: '',
            inQuote: false,
            currentField: '',
            currentRecord: [],
            errors: [],
            warnings: []
        };

        this.stats = {
            totalLines: 0,
            totalRecords: 0,
            validRecords: 0,
            invalidRecords: 0,
            emptyLines: 0,
            bytesProcessed: 0,
            processingTime: 0,
            recordsPerSecond: 0,
            errors: []
        };
    }

    /**
     * Get current progress
     * @returns {Object} - Current progress
     */
    getProgress() {
        return {
            lineNumber: this.state.lineNumber,
            recordNumber: this.state.recordNumber,
            bytesProcessed: this.stats.bytesProcessed,
            totalRecords: this.stats.totalRecords,
            validRecords: this.stats.validRecords,
            invalidRecords: this.stats.invalidRecords,
            speed: this.calculateSpeed()
        };
    }
}

module.exports = CustomCSVParser;
