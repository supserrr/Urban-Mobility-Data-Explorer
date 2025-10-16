// Urban Mobility Data Explorer - Production Server

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { Pool } = require('pg');
const { query, validationResult } = require('express-validator');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const { CustomTripSorter, CustomTripFilter, CustomTripSearch } = require('./utils/CustomAlgorithms');
const { requireApiKey, optionalApiKey } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || 'localhost';

// PostgreSQL connection pool - Using environment variables for security
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'urban_mobility',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL_CA ? {
        rejectUnauthorized: true,
        ca: process.env.DB_SSL_CA
    } : false
});

// Initialize custom algorithms
const tripSorter = new CustomTripSorter();
const tripFilter = new CustomTripFilter();
const tripSearch = new CustomTripSearch();

// Analyze trip patterns and generate insights
function generateTripInsights(trips, totalAnalyzed, relevantTrips) {
    // Filter out any null/undefined trips
    const validTrips = trips.filter(trip => trip != null);
    
    if (validTrips.length === 0) {
        return {
            peakHour: 'N/A',
            peakHourCount: 0,
            avgDistance: 0,
            avgDuration: 0,
            efficiencyScore: 0,
            topPattern: 'No data available',
            boroughDistribution: {}
        };
    }

    // Find peak hour
    const hourCounts = {};
    validTrips.forEach(trip => {
        if (trip.pickup_datetime) {
            const hour = new Date(trip.pickup_datetime).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
    });
    
    const peakHour = Object.keys(hourCounts).reduce((a, b) => 
        hourCounts[a] > hourCounts[b] ? a : b, '0');
    const peakHourCount = hourCounts[peakHour] || 0;

    // Calculate averages
    const validDistance = validTrips.filter(t => t.distance_km && t.distance_km > 0);
    const validDuration = validTrips.filter(t => t.trip_duration && t.trip_duration > 0);
    
    const avgDistance = validDistance.length > 0 
        ? validDistance.reduce((sum, t) => sum + t.distance_km, 0) / validDistance.length
        : 0;
        
    const avgDuration = validDuration.length > 0 
        ? validDuration.reduce((sum, t) => sum + t.trip_duration, 0) / validDuration.length / 60
        : 0;

    // Calculate efficiency score
    const efficientTrips = validTrips.filter(t => t.speed_kmh && t.speed_kmh > 10 && t.speed_kmh < 60);
    const efficiencyScore = validTrips.length > 0 ? (efficientTrips.length / validTrips.length) * 100 : 0;

    // Identify top pattern
    let topPattern = 'Normal traffic flow';
    if (efficiencyScore > 80) topPattern = 'Highly efficient routes';
    else if (efficiencyScore < 50) topPattern = 'Congested traffic conditions';
    else if (avgDistance > 10) topPattern = 'Long-distance trips dominant';
    else if (avgDistance < 2) topPattern = 'Short local trips dominant';

    // Borough distribution (simplified)
    const boroughDistribution = {};
    validTrips.forEach(trip => {
        // Simple borough detection based on coordinates
        if (trip.pickup_latitude && trip.pickup_longitude) {
            const lat = parseFloat(trip.pickup_latitude);
            const lng = parseFloat(trip.pickup_longitude);
            
            let borough = 'Unknown';
            if (lat >= 40.7 && lat <= 40.9 && lng >= -74.1 && lng <= -73.9) {
                borough = 'Manhattan';
            } else if (lat >= 40.6 && lat <= 40.8 && lng >= -74.1 && lng <= -73.9) {
                borough = 'Brooklyn';
            } else if (lat >= 40.7 && lat <= 40.8 && lng >= -73.9 && lng <= -73.7) {
                borough = 'Queens';
            } else if (lat >= 40.8 && lat <= 40.9 && lng >= -73.9 && lng <= -73.8) {
                borough = 'Bronx';
            }
            
            boroughDistribution[borough] = (boroughDistribution[borough] || 0) + 1;
        }
    });

    return {
        totalTrips: validTrips.length,
        peakHour,
        peakHourCount,
        avgDistance: Math.round(avgDistance * 10) / 10,
        avgDuration: Math.round(avgDuration * 10) / 10,
        efficiencyScore: Math.round(efficiencyScore * 10) / 10,
        topPattern,
        boroughDistribution
    };
}

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        process.exit(1);
    }
});

// Rate Limiters - Protection against DoS attacks
const generalLimiter = new RateLimiterMemory({
    points: 100,      // 100 requests
    duration: 900,    // per 15 minutes (900 seconds)
});

const expensiveLimiter = new RateLimiterMemory({
    points: 50,       // 50 requests (increased for better UX)
    duration: 900,    // per 15 minutes
});

// Rate limiting middleware
const rateLimitMiddleware = (limiter) => async (req, res, next) => {
    try {
        await limiter.consume(req.ip);
        next();
    } catch (error) {
        res.status(429).json({
            success: false,
            message: 'Too many requests, please try again later',
            retryAfter: Math.round(error.msBeforeNext / 1000) || 900
        });
    }
};

// Input validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Invalid request parameters',
            errors: errors.array().map(e => ({
                field: e.param,
                message: e.msg,
                value: e.value
            }))
        });
    }
    next();
};

// Middleware
app.use(helmet());

// Improved CORS configuration
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:3000').split(',');

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
    maxAge: 86400 // 24 hours
}));

app.use(compression());
app.use(morgan('combined'));

// Reduced request size limits for security (from 10mb to 100kb)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Apply general rate limiting to all API routes
app.use('/api', rateLimitMiddleware(generalLimiter));

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Urban Mobility Data Explorer API',
        version: '1.0.0',
        documentation: '/api/docs',
        health: '/api/health'
    });
});

// Health endpoint
app.get('/api/health', async (req, res) => {
    try {
        const totalTrips = await pool.query('SELECT COUNT(*) as count FROM trips');
        const validTrips = await pool.query('SELECT COUNT(*) as count FROM trips WHERE is_valid_nyc_trip = true');
        const avgStats = await pool.query(`
            SELECT 
                AVG(trip_duration) as avg_duration,
                AVG(distance_km) as avg_distance
            FROM trips 
            WHERE distance_km IS NOT NULL AND trip_duration IS NOT NULL
        `);
        
        res.json({
            success: true,
            data: {
                totalTrips: parseInt(totalTrips.rows[0].count),
                validNycTrips: parseInt(validTrips.rows[0].count),
                avgDuration: parseFloat(avgStats.rows[0].avg_duration),
                avgDistance: parseFloat(avgStats.rows[0].avg_distance),
                activeVendors: 2,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API Configuration (SECURED - Requires authentication)
// MapTiler API key only available to authenticated clients
app.get('/api/config', requireApiKey, (req, res) => {
    res.json({
        success: true,
        data: {
            // Authenticated clients can access MapTiler API key
            maptilerApiKey: process.env.MAPTILER_API_KEY || '',
            apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${PORT}/api`,
            environment: process.env.NODE_ENV || 'production',
            authenticated: true
        }
    });
});

// API Documentation
app.get('/api/docs', (req, res) => {
    res.json({
        success: true,
        data: {
            title: 'Urban Mobility Data Explorer API',
            version: '1.0.0',
            description: 'REST API for NYC taxi trip data analysis',
            authentication: 'API Key required for most endpoints',
            authDocs: '/api/docs/authentication',
            endpoints: {
                'GET /api/health': 'Get API and database health metrics (Public)',
                'GET /api/config': 'Get frontend configuration (Requires Auth)',
                'GET /api/trips': 'Get trips with filtering and pagination (Requires Auth)',
                'GET /api/trips/advanced': 'Advanced trip sorting, filtering, and search (Requires Auth)',
                'GET /api/trips/map': 'Get optimized trip data for map visualization (Requires Auth)',
                'GET /api/trips/h3-grid': 'Get H3 hexagonal aggregated grid for efficient map rendering (Requires Auth)',
                'GET /api/trips/statistics': 'Get trip statistics grouped by time period (Public)',
                'GET /api/trips/neighborhoods': 'Get neighborhood distribution (Public)',
                'GET /api/trips/vendors': 'Get vendor statistics (Public)',
                'GET /api/trips/distribution/pickup-dropoff': 'Get pickup/dropoff counts (Public)',
                'GET /api/trips/:id': 'Get specific trip by ID (Requires Auth)',
                'GET /api/map/heatmap': 'Get density heatmap data for map visualization (Public)',
                'GET /api/map/routes': 'Get popular route corridors with trip counts (Public)',
                'GET /api/map/neighborhoods': 'Get neighborhood boundaries with trip counts (Public)',
                'GET /api/map/stats': 'Get comprehensive map statistics summary (Public)',
                'GET /api/parameters/options': 'Get dynamic filter options (Public)',
                'POST /api/parameters/validate': 'Validate filter parameters (Public)',
                'GET /api/parameters/stats': 'Get parameter usage statistics (Public)'
            },
            customAlgorithms: {
                description: 'Custom sorting, filtering, and search implementations',
                algorithms: ['QuickSort-based sorting', 'Multi-criteria filtering', 'Binary search']
            }
        }
    });
});

// Authentication Documentation
app.get('/api/docs/authentication', (req, res) => {
    res.json({
        success: true,
        data: {
            title: 'Authentication Guide',
            version: '1.0.0',
            overview: 'API uses API key authentication for protected endpoints',
            method: 'API Key (64-character hex string)',
            howToAuthenticate: {
                method1: {
                    name: 'HTTP Header (Recommended)',
                    header: 'X-API-Key',
                    example: 'curl -H "X-API-Key: your_api_key_here" http://localhost:8000/api/trips'
                },
                method2: {
                    name: 'Query Parameter',
                    parameter: 'api_key',
                    example: 'curl "http://localhost:8000/api/trips?api_key=your_api_key_here"',
                    note: 'Less secure as API key appears in URL. Use header method when possible.'
                }
            },
            gettingApiKey: {
                step1: 'Contact your system administrator to obtain an API key',
                step2: 'Store the API key securely (e.g., environment variable)',
                step3: 'Include the API key in requests using X-API-Key header',
                generate: 'Administrators can generate keys using: node src/utils/generateApiKey.js'
            },
            protectedEndpoints: [
                'GET /api/config',
                'GET /api/trips',
                'GET /api/trips/map',
                'GET /api/trips/h3-grid',
                'GET /api/trips/advanced',
                'GET /api/trips/:id'
            ],
            publicEndpoints: [
                'GET /api/health',
                'GET /api/docs',
                'GET /api/docs/authentication',
                'GET /api/trips/statistics',
                'GET /api/trips/neighborhoods',
                'GET /api/trips/vendors',
                'GET /api/map/*',
                'GET /api/parameters/*'
            ],
            errorResponses: {
                '401': {
                    description: 'Authentication required',
                    example: {
                        success: false,
                        message: 'Authentication required',
                        error: 'Missing API key. Provide key via X-API-Key header or api_key query parameter.'
                    }
                },
                '403': {
                    description: 'Invalid API key',
                    example: {
                        success: false,
                        message: 'Invalid API key',
                        error: 'The provided API key is not valid or has been revoked.'
                    }
                }
            },
            bestPractices: [
                'Always use HTTPS in production to protect API keys in transit',
                'Store API keys in environment variables, not in code',
                'Rotate API keys periodically',
                'Use separate API keys for different applications/environments',
                'Revoke compromised API keys immediately',
                'Monitor API key usage for suspicious activity'
            ]
        }
    });
});

// Get H3 aggregated grid for efficient map rendering (REQUIRES AUTHENTICATION)
app.get('/api/trips/h3-grid', [
    requireApiKey,
    rateLimitMiddleware(expensiveLimiter),
    query('resolution').optional().isInt({ min: 0, max: 15 }).toInt().withMessage('Resolution must be between 0 and 15'),
    query('includeGeometry').optional().isBoolean().toBoolean().withMessage('includeGeometry must be true or false'),
    query('startDate').optional().isISO8601().toDate().withMessage('startDate must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().toDate().withMessage('endDate must be a valid ISO 8601 date'),
    query('neighborhood').optional().isIn(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Other']).withMessage('Invalid neighborhood'),
    query('startHour').optional().isInt({ min: 0, max: 23 }).toInt().withMessage('startHour must be between 0 and 23'),
    query('endHour').optional().isInt({ min: 0, max: 23 }).toInt().withMessage('endHour must be between 0 and 23'),
    query('month').optional().isInt({ min: 1, max: 12 }).toInt().withMessage('month must be between 1 and 12'),
    query('minDistance').optional().isFloat({ min: 0 }).toFloat().withMessage('minDistance must be a positive number'),
    query('maxDistance').optional().isFloat({ min: 0 }).toFloat().withMessage('maxDistance must be a positive number'),
    validate
], async (req, res) => {
    try {
        const { latLngToCell, cellToBoundary, cellToLatLng } = require('h3-js');
        const resolution = parseInt(req.query.resolution) || 8;
        const includeGeometry = req.query.includeGeometry !== 'false';
        
        // Validate resolution
        if (resolution < 0 || resolution > 15) {
            return res.status(400).json({
                success: false,
                message: 'H3 resolution must be between 0 and 15'
            });
        }
        
        // Build WHERE clause from filters
        let whereConditions = ['1=1'];
        let queryParams = [];
        let paramIndex = 1;
        
        if (req.query.startDate) {
            whereConditions.push(`DATE(pickup_datetime) >= $${paramIndex}`);
            queryParams.push(req.query.startDate);
            paramIndex++;
        }
        
        if (req.query.endDate) {
            whereConditions.push(`DATE(pickup_datetime) <= $${paramIndex}`);
            queryParams.push(req.query.endDate);
            paramIndex++;
        }
        
        if (req.query.neighborhood) {
            const neighborhood = req.query.neighborhood;
            let neighborhoodCondition = '';
            
            if (neighborhood === 'Manhattan') {
                neighborhoodCondition = `(pickup_latitude BETWEEN 40.7 AND 40.8 AND pickup_longitude BETWEEN -74.02 AND -73.9)`;
            } else if (neighborhood === 'Brooklyn') {
                neighborhoodCondition = `(pickup_latitude BETWEEN 40.6 AND 40.73 AND pickup_longitude BETWEEN -74.05 AND -73.85)`;
            } else if (neighborhood === 'Queens') {
                neighborhoodCondition = `(pickup_latitude BETWEEN 40.6 AND 40.8 AND pickup_longitude BETWEEN -73.96 AND -73.7)`;
            } else if (neighborhood === 'Bronx') {
                neighborhoodCondition = `(pickup_latitude BETWEEN 40.78 AND 40.92 AND pickup_longitude BETWEEN -73.93 AND -73.84)`;
            }
            
            if (neighborhoodCondition) {
                whereConditions.push(neighborhoodCondition);
            }
        }
        
        if (req.query.startHour !== undefined) {
            whereConditions.push(`EXTRACT(HOUR FROM pickup_datetime) >= $${paramIndex}`);
            queryParams.push(parseInt(req.query.startHour));
            paramIndex++;
        }
        
        if (req.query.endHour !== undefined) {
            whereConditions.push(`EXTRACT(HOUR FROM pickup_datetime) <= $${paramIndex}`);
            queryParams.push(parseInt(req.query.endHour));
            paramIndex++;
        }
        
        if (req.query.month) {
            whereConditions.push(`pickup_month = $${paramIndex}`);
            queryParams.push(parseInt(req.query.month));
            paramIndex++;
        }
        
        if (req.query.minDistance !== undefined) {
            whereConditions.push(`distance_km >= $${paramIndex}`);
            queryParams.push(parseFloat(req.query.minDistance));
            paramIndex++;
        }
        
        if (req.query.maxDistance !== undefined) {
            whereConditions.push(`distance_km <= $${paramIndex}`);
            queryParams.push(parseFloat(req.query.maxDistance));
            paramIndex++;
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // Query coordinates with sampling for speed (use 50% sample for faster results)
        const query = `
            SELECT 
                pickup_latitude,
                pickup_longitude,
                dropoff_latitude,
                dropoff_longitude
            FROM trips TABLESAMPLE SYSTEM (50)
            WHERE ${whereClause}
            AND pickup_latitude IS NOT NULL 
            AND pickup_longitude IS NOT NULL
            AND dropoff_latitude IS NOT NULL 
            AND dropoff_longitude IS NOT NULL
        `;
        
        const result = await pool.query(query, queryParams);
        
        // Aggregate into H3 cells
        const grid = new Map();
        
        result.rows.forEach(trip => {
            try {
                // Pickup
                const pickupH3 = latLngToCell(trip.pickup_latitude, trip.pickup_longitude, resolution);
                if (!grid.has(pickupH3)) {
                    grid.set(pickupH3, { h3: pickupH3, pickups: 0, dropoffs: 0 });
                }
                grid.get(pickupH3).pickups++;
                
                // Dropoff
                const dropoffH3 = latLngToCell(trip.dropoff_latitude, trip.dropoff_longitude, resolution);
                if (!grid.has(dropoffH3)) {
                    grid.set(dropoffH3, { h3: dropoffH3, pickups: 0, dropoffs: 0 });
                }
                grid.get(dropoffH3).dropoffs++;
            } catch (error) {
                // Skip invalid coordinates
            }
        });
        
        // Format for visualization
        const gridArray = Array.from(grid.values()).map(cell => {
            const [lat, lng] = cellToLatLng(cell.h3);
            const total = cell.pickups + cell.dropoffs;
            
            const formatted = {
                h3: cell.h3,
                pickups: cell.pickups,
                dropoffs: cell.dropoffs,
                total,
                center: { lat, lng },
                dominant_type: cell.pickups > cell.dropoffs ? 'pickup' : 'dropoff',
                pickup_ratio: total > 0 ? cell.pickups / total : 0.5,
                dropoff_ratio: total > 0 ? cell.dropoffs / total : 0.5,
                intensity: total
            };
            
            if (includeGeometry) {
                formatted.boundary = cellToBoundary(cell.h3).map(([lat, lng]) => [lat, lng]);
            }
            
            return formatted;
        });
        
        // Sort by intensity
        gridArray.sort((a, b) => b.intensity - a.intensity);
        
        res.json({
            success: true,
            data: gridArray,
            metadata: {
                resolution,
                cellCount: gridArray.length,
                filters: req.query
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get trips for map visualization (REQUIRES AUTHENTICATION)
app.get('/api/trips/map', [
    requireApiKey,
    rateLimitMiddleware(expensiveLimiter),
    query('limit').optional().isInt({ min: 1, max: 10000 }).toInt().withMessage('limit must be between 1 and 10,000'),
    query('startDate').optional().isISO8601().toDate().withMessage('startDate must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().toDate().withMessage('endDate must be a valid ISO 8601 date'),
    query('neighborhood').optional().isIn(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Other']).withMessage('Invalid neighborhood'),
    query('startHour').optional().isInt({ min: 0, max: 23 }).toInt().withMessage('startHour must be between 0 and 23'),
    query('endHour').optional().isInt({ min: 0, max: 23 }).toInt().withMessage('endHour must be between 0 and 23'),
    query('month').optional().isInt({ min: 1, max: 12 }).toInt().withMessage('month must be between 1 and 12'),
    validate
], async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 1000; // Reduced default from 100k to 1k
        
        // Build dynamic WHERE clause based on filters
        // Removed is_valid_nyc_trip filter to show ALL data including waterfront trips
        let whereConditions = ['1=1']; // Always true, allows all trips
        let queryParams = [];
        let paramIndex = 1;
        
        // Date range filters
        if (req.query.startDate) {
            whereConditions.push(`DATE(pickup_datetime) >= $${paramIndex}`);
            queryParams.push(req.query.startDate);
            paramIndex++;
        }
        
        if (req.query.endDate) {
            whereConditions.push(`DATE(pickup_datetime) <= $${paramIndex}`);
            queryParams.push(req.query.endDate);
            paramIndex++;
        }
        
        // Neighborhood filter (using coordinate-based logic)
        if (req.query.neighborhood) {
            const neighborhood = req.query.neighborhood;
            let neighborhoodCondition = '';
            
            if (neighborhood === 'Manhattan') {
                neighborhoodCondition = `(pickup_latitude BETWEEN 40.7 AND 40.8 AND pickup_longitude BETWEEN -74.02 AND -73.9)`;
            } else if (neighborhood === 'Brooklyn') {
                neighborhoodCondition = `(pickup_latitude BETWEEN 40.6 AND 40.73 AND pickup_longitude BETWEEN -74.05 AND -73.85)`;
            } else if (neighborhood === 'Queens') {
                neighborhoodCondition = `(pickup_latitude BETWEEN 40.6 AND 40.8 AND pickup_longitude BETWEEN -73.96 AND -73.7)`;
            } else if (neighborhood === 'Bronx') {
                neighborhoodCondition = `(pickup_latitude BETWEEN 40.78 AND 40.92 AND pickup_longitude BETWEEN -73.93 AND -73.84)`;
            } else if (neighborhood === 'Other') {
                neighborhoodCondition = `NOT (
                    (pickup_latitude BETWEEN 40.7 AND 40.8 AND pickup_longitude BETWEEN -74.02 AND -73.9) OR
                    (pickup_latitude BETWEEN 40.6 AND 40.73 AND pickup_longitude BETWEEN -74.05 AND -73.85) OR
                    (pickup_latitude BETWEEN 40.6 AND 40.8 AND pickup_longitude BETWEEN -73.96 AND -73.7) OR
                    (pickup_latitude BETWEEN 40.78 AND 40.92 AND pickup_longitude BETWEEN -73.93 AND -73.84)
                )`;
            }
            
            if (neighborhoodCondition) {
                whereConditions.push(neighborhoodCondition);
            }
        }
        
        // Hour range filters
        if (req.query.startHour !== undefined && req.query.startHour !== null) {
            whereConditions.push(`EXTRACT(HOUR FROM pickup_datetime) >= $${paramIndex}`);
            queryParams.push(parseInt(req.query.startHour));
            paramIndex++;
        }
        
        if (req.query.endHour !== undefined && req.query.endHour !== null) {
            whereConditions.push(`EXTRACT(HOUR FROM pickup_datetime) <= $${paramIndex}`);
            queryParams.push(parseInt(req.query.endHour));
            paramIndex++;
        }
        
        // Month filter
        if (req.query.month) {
            whereConditions.push(`pickup_month = $${paramIndex}`);
            queryParams.push(parseInt(req.query.month));
            paramIndex++;
        }
        
        // Build the complete query
        // Use RANDOM() for representative sampling across entire date range
        const whereClause = whereConditions.join(' AND ');
        const query = `
            SELECT 
                id,
                pickup_latitude,
                pickup_longitude,
                dropoff_latitude,
                dropoff_longitude,
                pickup_datetime,
                dropoff_datetime,
                vendor_name,
                distance_km
            FROM trips
            WHERE ${whereClause}
            ORDER BY RANDOM()
            LIMIT $${paramIndex}
        `;
        
        queryParams.push(limit);
        
        const result = await pool.query(query, queryParams);
        
        res.json({
            success: true,
            data: result.rows,
            filters: {
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                neighborhood: req.query.neighborhood,
                startHour: req.query.startHour,
                endHour: req.query.endHour,
                month: req.query.month
            },
            count: result.rows.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get heatmap density data for map visualization
app.get('/api/map/heatmap', async (req, res) => {
    try {
        // Get density data using H3 hexagonal grid or simple grid aggregation
        const query = `
            SELECT 
                ROUND(pickup_latitude::numeric, 3) as lat,
                ROUND(pickup_longitude::numeric, 3) as lon,
                COUNT(*) as intensity
            FROM trips
            WHERE pickup_latitude IS NOT NULL AND pickup_longitude IS NOT NULL
            GROUP BY ROUND(pickup_latitude::numeric, 3), ROUND(pickup_longitude::numeric, 3)
            HAVING COUNT(*) > 10
            ORDER BY intensity DESC
            LIMIT 1000
        `;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            data: result.rows.map(row => ({
                latitude: parseFloat(row.lat),
                longitude: parseFloat(row.lon),
                intensity: parseInt(row.intensity)
            })),
            count: result.rows.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get popular routes/corridors for map visualization
app.get('/api/map/routes', [
    query('limit').optional().isInt({ min: 1, max: 1000 }).toInt().withMessage('limit must be between 1 and 1,000'),
    validate
], async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 100;
        
        const query = `
            SELECT 
                ROUND(pickup_latitude::numeric, 3) as pickup_lat,
                ROUND(pickup_longitude::numeric, 3) as pickup_lon,
                ROUND(dropoff_latitude::numeric, 3) as dropoff_lat,
                ROUND(dropoff_longitude::numeric, 3) as dropoff_lon,
                COUNT(*) as trip_count,
                AVG(distance_km) as avg_distance,
                AVG(EXTRACT(EPOCH FROM (dropoff_datetime - pickup_datetime))/60) as avg_duration_minutes
            FROM trips
            WHERE pickup_latitude IS NOT NULL 
                AND pickup_longitude IS NOT NULL
                AND dropoff_latitude IS NOT NULL
                AND dropoff_longitude IS NOT NULL
                AND distance_km > 0.5
            GROUP BY 
                ROUND(pickup_latitude::numeric, 3),
                ROUND(pickup_longitude::numeric, 3),
                ROUND(dropoff_latitude::numeric, 3),
                ROUND(dropoff_longitude::numeric, 3)
            HAVING COUNT(*) >= 10
            ORDER BY trip_count DESC
            LIMIT $1
        `;
        
        const result = await pool.query(query, [limit]);
        
        res.json({
            success: true,
            data: result.rows.map(row => ({
                from: {
                    latitude: parseFloat(row.pickup_lat),
                    longitude: parseFloat(row.pickup_lon)
                },
                to: {
                    latitude: parseFloat(row.dropoff_lat),
                    longitude: parseFloat(row.dropoff_lon)
                },
                tripCount: parseInt(row.trip_count),
                avgDistance: parseFloat(row.avg_distance),
                avgDuration: parseFloat(row.avg_duration_minutes)
            })),
            count: result.rows.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get neighborhood boundaries for map overlay
app.get('/api/map/neighborhoods', async (req, res) => {
    try {
        // Return simplified neighborhood boundary data
        const neighborhoods = [
            {
                name: 'Manhattan',
                bounds: {
                    north: 40.8,
                    south: 40.7,
                    east: -73.9,
                    west: -74.02
                },
                center: { latitude: 40.75, longitude: -73.96 }
            },
            {
                name: 'Brooklyn',
                bounds: {
                    north: 40.73,
                    south: 40.6,
                    east: -73.85,
                    west: -74.05
                },
                center: { latitude: 40.665, longitude: -73.95 }
            },
            {
                name: 'Queens',
                bounds: {
                    north: 40.8,
                    south: 40.6,
                    east: -73.7,
                    west: -73.96
                },
                center: { latitude: 40.7, longitude: -73.83 }
            },
            {
                name: 'Bronx',
                bounds: {
                    north: 40.92,
                    south: 40.78,
                    east: -73.84,
                    west: -73.93
                },
                center: { latitude: 40.85, longitude: -73.885 }
            }
        ];
        
        // Get trip counts for each neighborhood
        const statsQuery = `
            SELECT 
                CASE 
                    WHEN pickup_latitude BETWEEN 40.7 AND 40.8 AND pickup_longitude BETWEEN -74.02 AND -73.9 THEN 'Manhattan'
                    WHEN pickup_latitude BETWEEN 40.6 AND 40.73 AND pickup_longitude BETWEEN -74.05 AND -73.85 THEN 'Brooklyn'
                    WHEN pickup_latitude BETWEEN 40.6 AND 40.8 AND pickup_longitude BETWEEN -73.96 AND -73.7 THEN 'Queens'
                    WHEN pickup_latitude BETWEEN 40.78 AND 40.92 AND pickup_longitude BETWEEN -73.93 AND -73.84 THEN 'Bronx'
                    ELSE 'Other'
                END as neighborhood,
                COUNT(*) as trip_count
            FROM trips
            WHERE pickup_latitude IS NOT NULL AND pickup_longitude IS NOT NULL
            GROUP BY neighborhood
        `;
        
        const statsResult = await pool.query(statsQuery);
        
        // Merge stats with boundaries
        neighborhoods.forEach(n => {
            const stat = statsResult.rows.find(s => s.neighborhood === n.name);
            n.tripCount = stat ? parseInt(stat.trip_count) : 0;
        });
        
        res.json({
            success: true,
            data: neighborhoods
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get map statistics summary
app.get('/api/map/stats', async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_trips,
                COUNT(DISTINCT DATE(pickup_datetime)) as days_with_data,
                MIN(pickup_datetime) as earliest_trip,
                MAX(pickup_datetime) as latest_trip,
                AVG(distance_km) as avg_distance,
                MAX(distance_km) as max_distance,
                COUNT(DISTINCT vendor_name) as vendor_count
            FROM trips
            WHERE pickup_datetime IS NOT NULL
        `);
        
        res.json({
            success: true,
            data: {
                totalTrips: parseInt(stats.rows[0].total_trips),
                daysWithData: parseInt(stats.rows[0].days_with_data),
                dateRange: {
                    from: stats.rows[0].earliest_trip,
                    to: stats.rows[0].latest_trip
                },
                avgDistance: parseFloat(stats.rows[0].avg_distance),
                maxDistance: parseFloat(stats.rows[0].max_distance),
                vendorCount: parseInt(stats.rows[0].vendor_count)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get trips with filtering and pagination (REQUIRES AUTHENTICATION)
app.get('/api/trips', [
    requireApiKey,
    query('page').optional().isInt({ min: 1, max: 10000 }).toInt().withMessage('page must be between 1 and 10,000'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('limit must be between 1 and 100'),
    query('category').optional().isIn(['complete', 'incomplete', 'invalid']).withMessage('category must be complete, incomplete, or invalid'),
    validate
], async (req, res) => {
    try {
        const { page = 1, limit = 100, category } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM trips';
        const params = [];
        
        if (category) {
            query += ' WHERE data_category = $1';
            params.push(category);
            query += ` LIMIT $2 OFFSET $3`;
            params.push(parseInt(limit), offset);
        } else {
            query += ` LIMIT $1 OFFSET $2`;
            params.push(parseInt(limit), offset);
        }
        
        const result = await pool.query(query, params);
        const countResult = await pool.query('SELECT COUNT(*) as count FROM trips');
        const total = parseInt(countResult.rows[0].count);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: offset + parseInt(limit) < total,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Advanced trip processing endpoint (REQUIRES AUTHENTICATION)
app.get('/api/trips/advanced', [
    requireApiKey,
    rateLimitMiddleware(expensiveLimiter),
    query('limit').optional().isInt({ min: 1, max: 50000 }).toInt().withMessage('limit must be between 1 and 50,000'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
    query('startDate').optional().isISO8601().toDate().withMessage('startDate must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().toDate().withMessage('endDate must be a valid ISO 8601 date'),
    query('minDistance').optional().isFloat({ min: 0 }).toFloat().withMessage('minDistance must be a positive number'),
    query('maxDistance').optional().isFloat({ min: 0 }).toFloat().withMessage('maxDistance must be a positive number'),
    query('minDuration').optional().isInt({ min: 0 }).toInt().withMessage('minDuration must be a positive integer'),
    query('maxDuration').optional().isInt({ min: 0 }).toInt().withMessage('maxDuration must be a positive integer'),
    query('passengerCount').optional().isInt({ min: 1, max: 10 }).toInt().withMessage('passengerCount must be between 1 and 10'),
    query('minQuality').optional().isInt({ min: 0, max: 100 }).toInt().withMessage('minQuality must be between 0 and 100'),
    validate
], async (req, res) => {
    try {
        // Get query parameters
        const { 
            sortBy = 'pickup_datetime', 
            sortOrder = 'asc',
            sortCriteria = 'pickup_datetime,distance_km,data_quality_score',
            limit = 1000,
            startDate,
            endDate,
            minDistance,
            maxDistance,
            minDuration,
            maxDuration,
            vendorName,
            passengerCount,
            dataCategory,
            minQuality
        } = req.query;

        // Fetch data from database (limit to reasonable size for custom algorithm)
        const fetchLimit = Math.min(parseInt(limit), 50000); // Cap at 50k for performance
        let query = 'SELECT * FROM trips WHERE pickup_datetime IS NOT NULL';
        const params = [];
        
        // Add basic filters to reduce dataset size
        if (startDate) {
            query += ' AND DATE(pickup_datetime) >= $' + (params.length + 1);
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND DATE(pickup_datetime) <= $' + (params.length + 1);
            params.push(endDate);
        }
        
        query += ` ORDER BY RANDOM() LIMIT $${params.length + 1}`;
        params.push(fetchLimit);

        const dbResult = await pool.query(query, params);
        const rawTrips = dbResult.rows;

        // STEP 1: Apply custom filtering algorithm
        const filterCriteria = {
            startDate,
            endDate,
            minDistance: minDistance ? parseFloat(minDistance) : null,
            maxDistance: maxDistance ? parseFloat(maxDistance) : null,
            minDuration: minDuration ? parseInt(minDuration) : null,
            maxDuration: maxDuration ? parseInt(maxDuration) : null,
            vendorName,
            passengerCount: passengerCount ? parseInt(passengerCount) : null,
            dataCategory,
            minQuality: minQuality ? parseInt(minQuality) : null
        };

        // Remove null values
        Object.keys(filterCriteria).forEach(key => {
            if (filterCriteria[key] === null || filterCriteria[key] === undefined) {
                delete filterCriteria[key];
            }
        });

        const filteredTrips = tripFilter.filterTrips(rawTrips, filterCriteria);

        // STEP 2: Apply custom sorting algorithm
        const sortConfig = {
            criteria: sortCriteria.split(','),
            order: sortOrder
        };

        const sortedTrips = tripSorter.sortTrips(filteredTrips, sortConfig);

        // STEP 3: Apply custom search if date range specified
        let finalTrips = sortedTrips;
        if (startDate || endDate) {
            const searchCriteria = { startDate, endDate };
            finalTrips = tripSearch.searchTrips(sortedTrips, searchCriteria);
        }

        // Generate meaningful insights
        const insights = generateTripInsights(finalTrips, rawTrips.length, filteredTrips.length);

        // Return results with insights
        res.json({
            success: true,
            data: finalTrips.slice(0, parseInt(limit)),
            metadata: {
                totalAnalyzed: rawTrips.length,
                relevantTrips: filteredTrips.length,
                finalResults: finalTrips.length,
                insights: {
                    peakHour: insights.peakHour,
                    peakHourCount: insights.peakHourCount,
                    avgDistance: insights.avgDistance,
                    avgDuration: insights.avgDuration,
                    efficiencyScore: insights.efficiencyScore,
                    topPattern: insights.topPattern,
                    boroughDistribution: insights.boroughDistribution
                },
                sortOrder,
                filters: filterCriteria
            }
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message
        });
    }
});

// Get trip statistics
app.get('/api/trips/statistics', async (req, res) => {
    try {
        const { groupBy = 'hour' } = req.query;
        
        let result;
        if (groupBy === 'hour') {
            result = await pool.query('SELECT * FROM hourly_trip_stats ORDER BY pickup_hour');
        } else if (groupBy === 'month') {
            result = await pool.query('SELECT * FROM monthly_trip_stats ORDER BY pickup_year, pickup_month');
        } else {
            result = await pool.query('SELECT * FROM hourly_trip_stats ORDER BY pickup_hour');
        }
        
        // Format the data
        const formattedData = result.rows.map(row => ({
            ...row,
            pickup_hour: row.pickup_hour,
            pickup_month: row.pickup_month,
            month_name: row.pickup_month ? ['January', 'February', 'March', 'April', 'May', 'June',
                                              'July', 'August', 'September', 'October', 'November', 'December'][row.pickup_month - 1] : null,
            trip_count: parseInt(row.trip_count),
            avg_duration: parseFloat(row.avg_duration),
            avg_distance: parseFloat(row.avg_distance),
            avg_speed: parseFloat(row.avg_speed),
            total_passengers: parseInt(row.total_passengers)
        }));
        
        res.json({
            success: true,
            data: formattedData
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get neighborhood statistics
app.get('/api/trips/neighborhoods', async (req, res) => {
    try {
        const pickupResult = await pool.query(`
            SELECT 
                CASE 
                    WHEN pickup_latitude BETWEEN 40.7 AND 40.8 AND pickup_longitude BETWEEN -74.02 AND -73.9 THEN 'Manhattan'
                    WHEN pickup_latitude BETWEEN 40.6 AND 40.73 AND pickup_longitude BETWEEN -74.05 AND -73.85 THEN 'Brooklyn'
                    WHEN pickup_latitude BETWEEN 40.6 AND 40.8 AND pickup_longitude BETWEEN -73.96 AND -73.7 THEN 'Queens'
                    WHEN pickup_latitude BETWEEN 40.78 AND 40.92 AND pickup_longitude BETWEEN -73.93 AND -73.84 THEN 'Bronx'
                    ELSE 'Other'
                END as name,
                COUNT(*) as count
            FROM trips
            WHERE pickup_latitude IS NOT NULL AND pickup_longitude IS NOT NULL
            GROUP BY name
        `);
        
        const dropoffResult = await pool.query(`
            SELECT 
                CASE 
                    WHEN dropoff_latitude BETWEEN 40.7 AND 40.8 AND dropoff_longitude BETWEEN -74.02 AND -73.9 THEN 'Manhattan'
                    WHEN dropoff_latitude BETWEEN 40.6 AND 40.73 AND dropoff_longitude BETWEEN -74.05 AND -73.85 THEN 'Brooklyn'
                    WHEN dropoff_latitude BETWEEN 40.6 AND 40.8 AND dropoff_longitude BETWEEN -73.96 AND -73.7 THEN 'Queens'
                    WHEN dropoff_latitude BETWEEN 40.78 AND 40.92 AND dropoff_longitude BETWEEN -73.93 AND -73.84 THEN 'Bronx'
                    ELSE 'Other'
                END as name,
                COUNT(*) as count
            FROM trips
            WHERE dropoff_latitude IS NOT NULL AND dropoff_longitude IS NOT NULL
            GROUP BY name
        `);
        
        // Combine pickup and dropoff data
        const neighborhoods = {};
        pickupResult.rows.forEach(row => {
            neighborhoods[row.name] = { name: row.name, pickups: parseInt(row.count), dropoffs: 0 };
        });
        dropoffResult.rows.forEach(row => {
            if (neighborhoods[row.name]) {
                neighborhoods[row.name].dropoffs = parseInt(row.count);
            } else {
                neighborhoods[row.name] = { name: row.name, pickups: 0, dropoffs: parseInt(row.count) };
            }
        });
        
        const data = Object.values(neighborhoods).sort((a, b) => (b.pickups + b.dropoffs) - (a.pickups + a.dropoffs));
        
        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get vendor statistics
app.get('/api/trips/vendors', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vendor_stats ORDER BY trip_count DESC');
        
        res.json({
            success: true,
            data: result.rows.map(row => ({
                vendor_id: row.vendor_id,
                vendor_name: row.vendor_name,
                trip_count: parseInt(row.trip_count),
                percentage: parseFloat(row.market_share_percentage),
                avg_duration: parseFloat(row.avg_duration),
                avg_distance: parseFloat(row.avg_distance),
                avg_speed: parseFloat(row.avg_speed),
                total_passengers: parseInt(row.total_passengers),
                avg_quality_score: parseFloat(row.avg_quality_score)
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get fare distribution statistics
app.get('/api/trips/fares', async (req, res) => {
    try {
        const result = await pool.query(`
            WITH fare_categories AS (
                SELECT 
                    CASE 
                        WHEN fare_per_km < 2 THEN 'Budget'
                        WHEN fare_per_km >= 2 AND fare_per_km < 4 THEN 'Economy'
                        WHEN fare_per_km >= 4 AND fare_per_km < 6 THEN 'Standard'
                        WHEN fare_per_km >= 6 AND fare_per_km < 10 THEN 'Premium'
                        ELSE 'Luxury'
                    END as fare_category,
                    fare_per_km,
                    distance_km
                FROM trips
                WHERE fare_per_km IS NOT NULL 
                AND fare_per_km > 0
                AND fare_per_km < 50
            )
            SELECT 
                fare_category,
                COUNT(*) as trip_count,
                AVG(fare_per_km) as avg_fare,
                AVG(distance_km) as avg_distance
            FROM fare_categories
            GROUP BY fare_category
            ORDER BY 
                CASE fare_category
                    WHEN 'Budget' THEN 1
                    WHEN 'Economy' THEN 2
                    WHEN 'Standard' THEN 3
                    WHEN 'Premium' THEN 4
                    WHEN 'Luxury' THEN 5
                END
        `);
        
        res.json({
            success: true,
            data: result.rows.map(row => ({
                category: row.fare_category,
                tripCount: parseInt(row.trip_count),
                avgFare: parseFloat(row.avg_fare),
                avgDistance: parseFloat(row.avg_distance)
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get pickup/dropoff distribution
app.get('/api/trips/distribution/pickup-dropoff', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM trips');
        const total = parseInt(result.rows[0].count);
        
        res.json({
            success: true,
            data: {
                pickups: total,
                dropoffs: total,
                note: 'Every trip has exactly one pickup and one dropoff'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get trip by ID (REQUIRES AUTHENTICATION)
app.get('/api/trips/:id', [
    requireApiKey,
    query('id').isInt({ min: 1 }).toInt().withMessage('ID must be a positive integer'),
    validate
], async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID is a number
        if (isNaN(parseInt(id)) || parseInt(id) < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid trip ID'
            });
        }
        
        const result = await pool.query('SELECT * FROM trips WHERE id = $1', [parseInt(id)]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Parameter endpoints
app.get('/api/parameters/options', async (req, res) => {
    try {
        // Simplified version - get basic data first
        const dateRange = await pool.query(`
            SELECT 
                MIN(pickup_datetime) as min_date,
                MAX(pickup_datetime) as max_date,
                COUNT(DISTINCT DATE(pickup_datetime)) as total_days
            FROM trips
            WHERE pickup_datetime IS NOT NULL
        `);

        const neighborhoods = await pool.query(`
            SELECT 
                COALESCE(destination_region, 'Unknown') as name,
                COUNT(*) as trip_count,
                ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM trips WHERE pickup_datetime IS NOT NULL) * 100), 1) as percentage
            FROM trips
            WHERE pickup_datetime IS NOT NULL
            GROUP BY destination_region
            ORDER BY trip_count DESC
            LIMIT 20
        `);

        const hours = await pool.query(`
            SELECT 
                pickup_hour as hour,
                COUNT(*) as trip_count,
                ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM trips WHERE pickup_datetime IS NOT NULL) * 100), 1) as percentage
            FROM trips
            WHERE pickup_datetime IS NOT NULL
            GROUP BY pickup_hour
            ORDER BY pickup_hour
        `);

        const months = await pool.query(`
            SELECT 
                pickup_month as month,
                pickup_year as year,
                COUNT(*) as trip_count,
                ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM trips WHERE pickup_datetime IS NOT NULL) * 100), 1) as percentage
            FROM trips
            WHERE pickup_datetime IS NOT NULL
            GROUP BY pickup_month, pickup_year
            ORDER BY pickup_year, pickup_month
        `);

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        res.json({
            success: true,
            data: {
                dateRange: {
                    minDate: dateRange.rows[0].min_date,
                    maxDate: dateRange.rows[0].max_date,
                    totalDays: parseInt(dateRange.rows[0].total_days),
                    defaultStart: dateRange.rows[0].min_date,
                    defaultEnd: dateRange.rows[0].max_date
                },
                neighborhoods: neighborhoods.rows.map(row => ({
                    name: row.name,
                    tripCount: parseInt(row.trip_count),
                    percentage: parseFloat(row.percentage)
                })),
                hours: hours.rows.map(row => ({
                    hour: parseInt(row.hour),
                    label: `${row.hour}:00`,
                    tripCount: parseInt(row.trip_count),
                    percentage: parseFloat(row.percentage)
                })),
                months: months.rows.map(row => ({
                    month: parseInt(row.month),
                    year: parseInt(row.year),
                    label: `${monthNames[row.month - 1]} ${row.year}`,
                    tripCount: parseInt(row.trip_count),
                    percentage: parseFloat(row.percentage)
                }))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get parameter options',
            details: error.message
        });
    }
});

app.post('/api/parameters/validate', async (req, res) => {
    try {
        const params = req.body;
        const errors = [];
        const warnings = [];

        // Validate date range
        if (params.startDate && params.endDate) {
            const startDate = new Date(params.startDate);
            const endDate = new Date(params.endDate);

            if (startDate > endDate) {
                errors.push('Start date cannot be after end date');
            }

            // Get available date range
            const dateResult = await pool.query(`
                SELECT MIN(pickup_datetime) as min_date, MAX(pickup_datetime) as max_date
                FROM trips WHERE pickup_datetime IS NOT NULL
            `);
            
            const { min_date, max_date } = dateResult.rows[0];
            
            if (startDate < new Date(min_date)) {
                warnings.push(`Start date is before available data (${min_date})`);
            }
            if (endDate > new Date(max_date)) {
                warnings.push(`End date is after available data (${max_date})`);
            }
        }

        // Validate hour range
        if (params.startHour !== undefined && params.endHour !== undefined) {
            if (params.startHour < 0 || params.startHour > 23) {
                errors.push('Start hour must be between 0 and 23');
            }
            if (params.endHour < 0 || params.endHour > 23) {
                errors.push('End hour must be between 0 and 23');
            }
            if (params.startHour > params.endHour) {
                errors.push('Start hour cannot be after end hour');
            }
        }

        res.json({
            success: true,
            data: {
                isValid: errors.length === 0,
                errors,
                warnings
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to validate parameters'
        });
    }
});

app.get('/api/parameters/stats', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                'Total Trips' as metric,
                COUNT(*) as value
            FROM trips
            WHERE pickup_datetime IS NOT NULL
            
            UNION ALL
            
            SELECT 
                'Date Range (Days)' as metric,
                COUNT(DISTINCT DATE(pickup_datetime)) as value
            FROM trips
            WHERE pickup_datetime IS NOT NULL
            
            UNION ALL
            
            SELECT 
                'Active Vendors' as metric,
                COUNT(DISTINCT vendor_id) as value
            FROM trips
            WHERE vendor_id IS NOT NULL
            
            UNION ALL
            
            SELECT 
                'Neighborhoods' as metric,
                COUNT(DISTINCT 
                    CASE 
                        WHEN pickup_latitude BETWEEN 40.7 AND 40.8 AND pickup_longitude BETWEEN -74.02 AND -73.9 THEN 'Manhattan'
                        WHEN pickup_latitude BETWEEN 40.6 AND 40.73 AND pickup_longitude BETWEEN -74.05 AND -73.85 THEN 'Brooklyn'
                        WHEN pickup_latitude BETWEEN 40.6 AND 40.8 AND pickup_longitude BETWEEN -73.96 AND -73.7 THEN 'Queens'
                        WHEN pickup_latitude BETWEEN 40.78 AND 40.92 AND pickup_longitude BETWEEN -73.93 AND -73.84 THEN 'Bronx'
                        ELSE 'Other'
                    END
                ) as value
            FROM trips
            WHERE pickup_latitude IS NOT NULL AND pickup_longitude IS NOT NULL
            
            UNION ALL
            
            SELECT 
                'Hours with Data' as metric,
                COUNT(DISTINCT pickup_hour) as value
            FROM trips
            WHERE pickup_hour IS NOT NULL
            
            UNION ALL
            
            SELECT 
                'Months with Data' as metric,
                COUNT(DISTINCT pickup_month) as value
            FROM trips
            WHERE pickup_month IS NOT NULL
        `);

        const stats = {};
        result.rows.forEach(row => {
            stats[row.metric] = parseInt(row.value);
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get parameter statistics'
        });
    }
});

// Error handling
app.use((err, req, res, next) => {
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Start server
app.listen(PORT, HOST, () => {
    // Server started successfully
});

module.exports = app;
