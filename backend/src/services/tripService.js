// Trip Service - Business logic for trip data operations

const logger = require('../config/logger');
const { query } = require('../config/database');

class TripService {
    /**
     * Get trips with pagination and filtering
     * @param {Object} filters - Filter criteria
     * @param {Object} pagination - Pagination parameters
     * @returns {Promise<Object>} - Paginated trip data
     */
    async getTrips(filters = {}, pagination = {}) {
        const {
            startDate,
            endDate,
            vendorId,
            minDuration,
            maxDuration,
            minDistance,
            maxDistance,
            passengerCount,
            pickupHour,
            pickupDayOfWeek
        } = filters;

        const {
            page = 1,
            limit = 100,
            sortBy = 'pickup_datetime',
            sortOrder = 'DESC'
        } = pagination;

        const offset = (page - 1) * limit;

        // Build WHERE clause
        const whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;

        if (startDate) {
            whereConditions.push(`pickup_datetime >= $${paramIndex}`);
            queryParams.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            whereConditions.push(`pickup_datetime <= $${paramIndex}`);
            queryParams.push(endDate);
            paramIndex++;
        }

        if (vendorId) {
            whereConditions.push(`vendor_id = $${paramIndex}`);
            queryParams.push(vendorId);
            paramIndex++;
        }

        if (minDuration) {
            whereConditions.push(`trip_duration >= $${paramIndex}`);
            queryParams.push(minDuration);
            paramIndex++;
        }

        if (maxDuration) {
            whereConditions.push(`trip_duration <= $${paramIndex}`);
            queryParams.push(maxDuration);
            paramIndex++;
        }

        if (minDistance) {
            whereConditions.push(`distance_km >= $${paramIndex}`);
            queryParams.push(minDistance);
            paramIndex++;
        }

        if (maxDistance) {
            whereConditions.push(`distance_km <= $${paramIndex}`);
            queryParams.push(maxDistance);
            paramIndex++;
        }

        if (passengerCount) {
            whereConditions.push(`passenger_count = $${paramIndex}`);
            queryParams.push(passengerCount);
            paramIndex++;
        }

        if (pickupHour !== undefined) {
            whereConditions.push(`pickup_hour = $${paramIndex}`);
            queryParams.push(pickupHour);
            paramIndex++;
        }

        if (pickupDayOfWeek !== undefined) {
            whereConditions.push(`pickup_day_of_week = $${paramIndex}`);
            queryParams.push(pickupDayOfWeek);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Count total records
        const countQuery = `SELECT COUNT(*) as total FROM trips ${whereClause}`;
        const countResult = await query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Get paginated results
        const dataQuery = `
            SELECT 
                id, vendor_id, pickup_datetime, dropoff_datetime, passenger_count,
                pickup_longitude, pickup_latitude, dropoff_longitude, dropoff_latitude,
                store_and_fwd_flag, trip_duration, distance_km, speed_kmh, fare_per_km,
                pickup_hour, pickup_day_of_week, pickup_month, pickup_year,
                ST_X(pickup_point) as pickup_lon, ST_Y(pickup_point) as pickup_lat,
                ST_X(dropoff_point) as dropoff_lon, ST_Y(dropoff_point) as dropoff_lat
            FROM trips 
            ${whereClause}
            ORDER BY ${sortBy} ${sortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(limit, offset);
        const dataResult = await query(dataQuery, queryParams);

        const totalPages = Math.ceil(total / limit);

        return {
            data: dataResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    /**
     * Get trip statistics
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Object>} - Trip statistics
     */
    async getTripStatistics(filters = {}) {
        const {
            startDate,
            endDate,
            vendorId,
            groupBy = 'hour'
        } = filters;

        // Build WHERE clause
        const whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;

        if (startDate) {
            whereConditions.push(`pickup_datetime >= $${paramIndex}`);
            queryParams.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            whereConditions.push(`pickup_datetime <= $${paramIndex}`);
            queryParams.push(endDate);
            paramIndex++;
        }

        if (vendorId) {
            whereConditions.push(`vendor_id = $${paramIndex}`);
            queryParams.push(vendorId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Determine grouping field
        let groupByField;
        switch (groupBy) {
            case 'hour':
                groupByField = 'pickup_hour';
                break;
            case 'day':
                groupByField = 'pickup_day_of_week';
                break;
            case 'month':
                groupByField = 'pickup_month';
                break;
            default:
                groupByField = 'pickup_hour';
        }

        const statsQuery = `
            SELECT 
                ${groupByField} as period,
                COUNT(*) as trip_count,
                AVG(trip_duration) as avg_duration,
                MIN(trip_duration) as min_duration,
                MAX(trip_duration) as max_duration,
                AVG(distance_km) as avg_distance,
                MIN(distance_km) as min_distance,
                MAX(distance_km) as max_distance,
                AVG(speed_kmh) as avg_speed,
                MIN(speed_kmh) as min_speed,
                MAX(speed_kmh) as max_speed,
                SUM(passenger_count) as total_passengers,
                AVG(passenger_count) as avg_passengers
            FROM trips 
            ${whereClause}
            GROUP BY ${groupByField}
            ORDER BY period
        `;

        const result = await query(statsQuery, queryParams);
        return result.rows;
    }

    /**
     * Get heatmap data for visualization
     * @param {Object} filters - Filter criteria
     * @param {number} gridSize - Grid size for heatmap (default: 0.01)
     * @returns {Promise<Array>} - Heatmap data points
     */
    async getHeatmapData(filters = {}, gridSize = 0.01) {
        const {
            startDate,
            endDate,
            vendorId,
            limit = 1000
        } = filters;

        // Build WHERE clause
        const whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;

        if (startDate) {
            whereConditions.push(`pickup_datetime >= $${paramIndex}`);
            queryParams.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            whereConditions.push(`pickup_datetime <= $${paramIndex}`);
            queryParams.push(endDate);
            paramIndex++;
        }

        if (vendorId) {
            whereConditions.push(`vendor_id = $${paramIndex}`);
            queryParams.push(vendorId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const heatmapQuery = `
            SELECT 
                ROUND(pickup_latitude / $${paramIndex}) * $${paramIndex} as lat,
                ROUND(pickup_longitude / $${paramIndex + 1}) * $${paramIndex + 1} as lng,
                COUNT(*) as intensity,
                AVG(trip_duration) as avg_duration,
                AVG(distance_km) as avg_distance
            FROM trips 
            ${whereClause}
            GROUP BY lat, lng
            ORDER BY intensity DESC
            LIMIT $${paramIndex + 2}
        `;

        queryParams.push(gridSize, gridSize, limit);
        const result = await query(heatmapQuery, queryParams);
        
        return result.rows.map(row => ({
            lat: parseFloat(row.lat),
            lng: parseFloat(row.lng),
            intensity: parseInt(row.intensity),
            avgDuration: parseFloat(row.avg_duration),
            avgDistance: parseFloat(row.avg_distance)
        }));
    }

    /**
     * Get popular routes
     * @param {Object} filters - Filter criteria
     * @param {number} limit - Number of routes to return
     * @returns {Promise<Array>} - Popular routes data
     */
    async getPopularRoutes(filters = {}, limit = 50) {
        const {
            startDate,
            endDate,
            vendorId
        } = filters;

        // Build WHERE clause
        const whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;

        if (startDate) {
            whereConditions.push(`pickup_datetime >= $${paramIndex}`);
            queryParams.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            whereConditions.push(`pickup_datetime <= $${paramIndex}`);
            queryParams.push(endDate);
            paramIndex++;
        }

        if (vendorId) {
            whereConditions.push(`vendor_id = $${paramIndex}`);
            queryParams.push(vendorId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const routesQuery = `
            SELECT 
                ROUND(pickup_latitude, 3) as pickup_lat,
                ROUND(pickup_longitude, 3) as pickup_lng,
                ROUND(dropoff_latitude, 3) as dropoff_lat,
                ROUND(dropoff_longitude, 3) as dropoff_lng,
                COUNT(*) as trip_count,
                AVG(trip_duration) as avg_duration,
                AVG(distance_km) as avg_distance
            FROM trips 
            ${whereClause}
            GROUP BY pickup_lat, pickup_lng, dropoff_lat, dropoff_lng
            ORDER BY trip_count DESC
            LIMIT $${paramIndex}
        `;

        queryParams.push(limit);
        const result = await query(routesQuery, queryParams);
        
        return result.rows.map(row => ({
            pickup: {
                lat: parseFloat(row.pickup_lat),
                lng: parseFloat(row.pickup_lng)
            },
            dropoff: {
                lat: parseFloat(row.dropoff_lat),
                lng: parseFloat(row.dropoff_lng)
            },
            tripCount: parseInt(row.trip_count),
            avgDuration: parseFloat(row.avg_duration),
            avgDistance: parseFloat(row.avg_distance)
        }));
    }

    /**
     * Get trip by ID
     * @param {number} tripId - Trip ID
     * @returns {Promise<Object|null>} - Trip data or null
     */
    async getTripById(tripId) {
        const query_text = `
            SELECT 
                id, vendor_id, pickup_datetime, dropoff_datetime, passenger_count,
                pickup_longitude, pickup_latitude, dropoff_longitude, dropoff_latitude,
                store_and_fwd_flag, trip_duration, distance_km, speed_kmh, fare_per_km,
                pickup_hour, pickup_day_of_week, pickup_month, pickup_year,
                ST_X(pickup_point) as pickup_lon, ST_Y(pickup_point) as pickup_lat,
                ST_X(dropoff_point) as dropoff_lon, ST_Y(dropoff_point) as dropoff_lat
            FROM trips 
            WHERE id = $1
        `;

        const result = await query(query_text, [tripId]);
        return result.rows[0] || null;
    }

    /**
     * Get database health metrics
     * @returns {Promise<Object>} - Database health information
     */
    async getHealthMetrics() {
        try {
            const metrics = await Promise.all([
                query('SELECT COUNT(*) as total_trips FROM trips'),
                query('SELECT COUNT(*) as trips_today FROM trips WHERE DATE(pickup_datetime) = CURRENT_DATE'),
                query('SELECT AVG(trip_duration) as avg_duration FROM trips WHERE pickup_datetime >= CURRENT_DATE - INTERVAL \'7 days\''),
                query('SELECT AVG(distance_km) as avg_distance FROM trips WHERE pickup_datetime >= CURRENT_DATE - INTERVAL \'7 days\''),
                query('SELECT COUNT(DISTINCT vendor_id) as active_vendors FROM trips WHERE pickup_datetime >= CURRENT_DATE - INTERVAL \'30 days\'')
            ]);

            return {
                totalTrips: parseInt(metrics[0].rows[0].total_trips),
                tripsToday: parseInt(metrics[1].rows[0].trips_today),
                avgDurationLastWeek: parseFloat(metrics[2].rows[0].avg_duration) || 0,
                avgDistanceLastWeek: parseFloat(metrics[3].rows[0].avg_distance) || 0,
                activeVendorsLastMonth: parseInt(metrics[4].rows[0].active_vendors),
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error getting health metrics:', error);
            throw error;
        }
    }

    /**
     * Get neighborhood statistics
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} - Neighborhood statistics
     */
    async getNeighborhoods(filters = {}) {
        try {
            const {
                startDate,
                endDate,
                vendorId,
                limit = 10
            } = filters;

            const whereConditions = [];
            const queryParams = [];
            let paramIndex = 1;

            if (startDate) {
                whereConditions.push(`pickup_datetime >= $${paramIndex}`);
                queryParams.push(startDate);
                paramIndex++;
            }

            if (endDate) {
                whereConditions.push(`pickup_datetime <= $${paramIndex}`);
                queryParams.push(endDate);
                paramIndex++;
            }

            if (vendorId) {
                whereConditions.push(`vendor_id = $${paramIndex}`);
                queryParams.push(vendorId);
                paramIndex++;
            }

            const whereClause = whereConditions.length > 0 
                ? `WHERE ${whereConditions.join(' AND ')}` 
                : '';

            queryParams.push(limit);

            // Calculate neighborhoods from coordinates instead of using non-existent fields
            const queryText = `
                WITH neighborhood_counts AS (
                    SELECT 
                        CASE 
                            WHEN pickup_latitude BETWEEN 40.7 AND 40.8 AND pickup_longitude BETWEEN -74.02 AND -73.9 THEN 'Manhattan'
                            WHEN pickup_latitude BETWEEN 40.6 AND 40.73 AND pickup_longitude BETWEEN -74.05 AND -73.85 THEN 'Brooklyn'
                            WHEN pickup_latitude BETWEEN 40.6 AND 40.8 AND pickup_longitude BETWEEN -73.96 AND -73.7 THEN 'Queens'
                            WHEN pickup_latitude BETWEEN 40.78 AND 40.92 AND pickup_longitude BETWEEN -73.93 AND -73.84 THEN 'Bronx'
                            ELSE 'Other'
                        END as pickup_name,
                        CASE 
                            WHEN dropoff_latitude BETWEEN 40.7 AND 40.8 AND dropoff_longitude BETWEEN -74.02 AND -73.9 THEN 'Manhattan'
                            WHEN dropoff_latitude BETWEEN 40.6 AND 40.73 AND dropoff_longitude BETWEEN -74.05 AND -73.85 THEN 'Brooklyn'
                            WHEN dropoff_latitude BETWEEN 40.6 AND 40.8 AND dropoff_longitude BETWEEN -73.96 AND -73.7 THEN 'Queens'
                            WHEN dropoff_latitude BETWEEN 40.78 AND 40.92 AND dropoff_longitude BETWEEN -73.93 AND -73.84 THEN 'Bronx'
                            ELSE 'Other'
                        END as dropoff_name
                    FROM trips
                    ${whereClause}
                    WHERE pickup_latitude IS NOT NULL AND pickup_longitude IS NOT NULL
                )
                SELECT 
                    COALESCE(pickup_name, 'Unknown') as name,
                    COUNT(*) as pickups,
                    0 as dropoffs
                FROM neighborhood_counts
                GROUP BY pickup_name
                ORDER BY pickups DESC
                LIMIT $${paramIndex}
            `;

            const result = await query(queryText, queryParams);

            logger.info(`Retrieved ${result.rows.length} neighborhoods`);

            return result.rows;
        } catch (error) {
            logger.error('Error getting neighborhoods:', error);
            throw error;
        }
    }

    /**
     * Get trips for map visualization (optimized query with minimal fields)
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} - Trips data for map
     */
    async getTripsForMap(filters = {}) {
        try {
            const {
                startDate,
                endDate,
                vendorId,
                limit = 100000  // Default to 100K for performance
            } = filters;

            const whereConditions = [];
            const queryParams = [];
            let paramIndex = 1;

            if (startDate) {
                whereConditions.push(`pickup_datetime >= $${paramIndex}`);
                queryParams.push(startDate);
                paramIndex++;
            }

            if (endDate) {
                whereConditions.push(`pickup_datetime <= $${paramIndex}`);
                queryParams.push(endDate);
                paramIndex++;
            }

            if (vendorId) {
                whereConditions.push(`vendor_id = $${paramIndex}`);
                queryParams.push(vendorId);
                paramIndex++;
            }

            const whereClause = whereConditions.length > 0 
                ? `WHERE ${whereConditions.join(' AND ')}` 
                : '';

            // Optimized query - only essential fields for map visualization
            const queryText = `
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
                ${whereClause}
                ORDER BY pickup_datetime DESC
                LIMIT $${paramIndex}
            `;

            queryParams.push(limit);

            const result = await query(queryText, queryParams);

            logger.info(`Retrieved ${result.rows.length} trips for map visualization`);

            return result.rows;
        } catch (error) {
            logger.error('Error getting trips for map:', error);
            throw error;
        }
    }

    /**
     * Get vendor statistics
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} - Vendor statistics
     */
    async getVendors(filters = {}) {
        try {
            const {
                startDate,
                endDate
            } = filters;

            const whereConditions = [];
            const queryParams = [];
            let paramIndex = 1;

            if (startDate) {
                whereConditions.push(`pickup_datetime >= $${paramIndex}`);
                queryParams.push(startDate);
                paramIndex++;
            }

            if (endDate) {
                whereConditions.push(`pickup_datetime <= $${paramIndex}`);
                queryParams.push(endDate);
                paramIndex++;
            }

            const whereClause = whereConditions.length > 0 
                ? `WHERE ${whereConditions.join(' AND ')}` 
                : '';

            const queryText = `
                WITH total_trips AS (
                    SELECT COUNT(*) as total FROM trips ${whereClause}
                )
                SELECT 
                    vendor_id,
                    vendor_name,
                    COUNT(*) as trip_count,
                    ROUND((COUNT(*)::numeric / (SELECT total FROM total_trips) * 100), 1) as percentage,
                    SUM(passenger_count) as total_passengers,
                    ROUND(AVG(distance_km)::numeric, 2) as avg_distance,
                    ROUND(AVG(trip_duration)::numeric, 0) as avg_duration
                FROM trips
                ${whereClause}
                GROUP BY vendor_id, vendor_name
                ORDER BY trip_count DESC
            `;

            const result = await query(queryText, queryParams);

            logger.info(`Retrieved ${result.rows.length} vendor statistics`);

            return result.rows;
        } catch (error) {
            logger.error('Error getting vendor statistics:', error);
            throw error;
        }
    }

    /**
     * Get H3 aggregated grid for efficient map rendering
     * @param {Object} filters - Filter criteria
     * @param {number} resolution - H3 resolution level (0-15)
     * @param {boolean} includeGeometry - Whether to include hexagon boundaries
     * @returns {Promise<Array>} - H3 grid data
     */
    async getH3Grid(filters = {}, resolution = 8, includeGeometry = true) {
        const H3GridGenerator = require('./H3GridGenerator');
        const h3Generator = new H3GridGenerator({ resolution });

        try {
            const {
                startDate,
                endDate,
                vendorId,
                neighborhood,
                startHour,
                endHour,
                month,
                minDistance,
                maxDistance
            } = filters;

            const whereConditions = [];
            const queryParams = [];
            let paramIndex = 1;

            // Build WHERE clause
            if (startDate) {
                whereConditions.push(`pickup_datetime >= $${paramIndex}`);
                queryParams.push(startDate);
                paramIndex++;
            }

            if (endDate) {
                whereConditions.push(`pickup_datetime <= $${paramIndex}`);
                queryParams.push(endDate);
                paramIndex++;
            }

            if (vendorId) {
                whereConditions.push(`vendor_id = $${paramIndex}`);
                queryParams.push(vendorId);
                paramIndex++;
            }

            if (neighborhood) {
                // Use coordinate-based neighborhood detection
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

            if (startHour !== undefined) {
                whereConditions.push(`EXTRACT(HOUR FROM pickup_datetime) >= $${paramIndex}`);
                queryParams.push(startHour);
                paramIndex++;
            }

            if (endHour !== undefined) {
                whereConditions.push(`EXTRACT(HOUR FROM pickup_datetime) <= $${paramIndex}`);
                queryParams.push(endHour);
                paramIndex++;
            }

            if (month !== undefined) {
                whereConditions.push(`EXTRACT(MONTH FROM pickup_datetime) = $${paramIndex}`);
                queryParams.push(month);
                paramIndex++;
            }

            if (minDistance !== undefined) {
                whereConditions.push(`distance_km >= $${paramIndex}`);
                queryParams.push(minDistance);
                paramIndex++;
            }

            if (maxDistance !== undefined) {
                whereConditions.push(`distance_km <= $${paramIndex}`);
                queryParams.push(maxDistance);
                paramIndex++;
            }

            const whereClause = whereConditions.length > 0 
                ? `WHERE ${whereConditions.join(' AND ')}` 
                : '';

            // Query to get all pickup and dropoff coordinates
            // Only selecting coordinates to minimize data transfer
            const queryText = `
                SELECT 
                    pickup_latitude,
                    pickup_longitude,
                    dropoff_latitude,
                    dropoff_longitude
                FROM trips
                ${whereClause}
                AND pickup_latitude IS NOT NULL 
                AND pickup_longitude IS NOT NULL
                AND dropoff_latitude IS NOT NULL 
                AND dropoff_longitude IS NOT NULL
            `;

            const db = require('../config/database');
            const result = await db.query(queryText, queryParams);

            logger.info(`Queried ${result.rows.length} trips for H3 grid generation`);

            // Generate H3 grid
            const gridData = h3Generator.generateFromTrips(result.rows, resolution);

            // Format for visualization
            const formattedGrid = h3Generator.formatForVisualization(gridData, {
                includeGeometry,
                sortBy: 'intensity',
                limit: null // Return all cells
            });

            // Get statistics
            const stats = h3Generator.getGridStatistics(gridData);
            logger.info('H3 grid statistics:', stats);

            return formattedGrid;

        } catch (error) {
            logger.error('Error generating H3 grid:', error);
            throw error;
        }
    }

    /**
     * Get passenger count distribution
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} - Passenger count distribution
     */
    async getPassengerDistribution(filters = {}) {
        const {
            startDate,
            endDate,
            vendorId
        } = filters;

        const whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;

        if (startDate) {
            whereConditions.push(`pickup_datetime >= $${paramIndex}`);
            queryParams.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            whereConditions.push(`pickup_datetime <= $${paramIndex}`);
            queryParams.push(endDate);
            paramIndex++;
        }

        if (vendorId) {
            whereConditions.push(`vendor_id = $${paramIndex}`);
            queryParams.push(vendorId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const distributionQuery = `
            SELECT 
                passenger_count,
                COUNT(*) as trip_count
            FROM trips 
            ${whereClause}
            GROUP BY passenger_count
            ORDER BY passenger_count
        `;

        const result = await query(distributionQuery, queryParams);
        return result.rows;
    }

    /**
     * Get trip duration distribution
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} - Duration distribution in buckets
     */
    async getDurationDistribution(filters = {}) {
        const {
            startDate,
            endDate,
            vendorId
        } = filters;

        const whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;

        if (startDate) {
            whereConditions.push(`pickup_datetime >= $${paramIndex}`);
            queryParams.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            whereConditions.push(`pickup_datetime <= $${paramIndex}`);
            queryParams.push(endDate);
            paramIndex++;
        }

        if (vendorId) {
            whereConditions.push(`vendor_id = $${paramIndex}`);
            queryParams.push(vendorId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Create buckets: 0-5, 5-10, 10-15, 15-20, 20-30, 30+ minutes
        const distributionQuery = `
            SELECT 
                CASE 
                    WHEN trip_duration < 300 THEN '0-5'
                    WHEN trip_duration < 600 THEN '5-10'
                    WHEN trip_duration < 900 THEN '10-15'
                    WHEN trip_duration < 1200 THEN '15-20'
                    WHEN trip_duration < 1800 THEN '20-30'
                    ELSE '30+'
                END as duration_bucket,
                COUNT(*) as trip_count
            FROM trips 
            ${whereClause}
            GROUP BY duration_bucket
            ORDER BY 
                CASE duration_bucket
                    WHEN '0-5' THEN 1
                    WHEN '5-10' THEN 2
                    WHEN '10-15' THEN 3
                    WHEN '15-20' THEN 4
                    WHEN '20-30' THEN 5
                    WHEN '30+' THEN 6
                END
        `;

        const result = await query(distributionQuery, queryParams);
        return result.rows;
    }

    /**
     * Get correlation data for various trip metrics
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Object>} - Correlation matrix data
     */
    async getCorrelationData(filters = {}) {
        const {
            startDate,
            endDate,
            vendorId
        } = filters;

        const whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;

        if (startDate) {
            whereConditions.push(`pickup_datetime >= $${paramIndex}`);
            queryParams.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            whereConditions.push(`pickup_datetime <= $${paramIndex}`);
            queryParams.push(endDate);
            paramIndex++;
        }

        if (vendorId) {
            whereConditions.push(`vendor_id = $${paramIndex}`);
            queryParams.push(vendorId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get statistics for correlation calculation
        const correlationQuery = `
            SELECT 
                CORR(trip_duration, distance_km) as duration_distance_corr,
                CORR(trip_duration, speed_kmh) as duration_speed_corr,
                CORR(trip_duration, passenger_count) as duration_passenger_corr,
                CORR(distance_km, speed_kmh) as distance_speed_corr,
                CORR(distance_km, passenger_count) as distance_passenger_corr,
                CORR(speed_kmh, passenger_count) as speed_passenger_corr
            FROM trips 
            ${whereClause}
        `;

        const result = await query(correlationQuery, queryParams);
        
        if (result.rows.length === 0) {
            return {
                labels: ['Duration', 'Distance', 'Speed', 'Passengers'],
                matrix: [
                    [1.00, 0, 0, 0],
                    [0, 1.00, 0, 0],
                    [0, 0, 1.00, 0],
                    [0, 0, 0, 1.00]
                ]
            };
        }

        const corr = result.rows[0];
        
        // Build correlation matrix
        // Order: Duration, Distance, Speed, Passengers
        const matrix = [
            [1.00, parseFloat(corr.duration_distance_corr) || 0, parseFloat(corr.duration_speed_corr) || 0, parseFloat(corr.duration_passenger_corr) || 0],
            [parseFloat(corr.duration_distance_corr) || 0, 1.00, parseFloat(corr.distance_speed_corr) || 0, parseFloat(corr.distance_passenger_corr) || 0],
            [parseFloat(corr.duration_speed_corr) || 0, parseFloat(corr.distance_speed_corr) || 0, 1.00, parseFloat(corr.speed_passenger_corr) || 0],
            [parseFloat(corr.duration_passenger_corr) || 0, parseFloat(corr.distance_passenger_corr) || 0, parseFloat(corr.speed_passenger_corr) || 0, 1.00]
        ];

        return {
            labels: ['Duration', 'Distance', 'Speed', 'Passengers'],
            matrix: matrix
        };
    }
}

module.exports = TripService;
