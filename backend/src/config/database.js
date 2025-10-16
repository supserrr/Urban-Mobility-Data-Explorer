// Database Configuration

const { Pool } = require('pg');
const logger = require('./logger');

// Database configuration
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'urban_mobility',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Test database connection
const testConnection = async () => {
    try {
        const client = await pool.connect();
        logger.info('Database connection established successfully');
        
        // Test basic query
        const result = await client.query('SELECT NOW()');
        logger.info('Database test query successful:', result.rows[0]);
        
        client.release();
        return true;
    } catch (error) {
        logger.error('Database connection failed:', error);
        return false;
    }
};

// Execute query with error handling
const query = async (text, params = []) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed query', { text, duration, rows: result.rowCount });
        return result;
    } catch (error) {
        logger.error('Query execution failed:', { text, params, error: error.message });
        throw error;
    }
};

// Get client for transactions
const getClient = async () => {
    try {
        const client = await pool.connect();
        return client;
    } catch (error) {
        logger.error('Failed to get database client:', error);
        throw error;
    }
};

// Close all connections (for graceful shutdown)
const closePool = async () => {
    try {
        await pool.end();
        logger.info('Database pool closed successfully');
    } catch (error) {
        logger.error('Error closing database pool:', error);
    }
};

module.exports = {
    pool,
    query,
    getClient,
    testConnection,
    closePool
};
