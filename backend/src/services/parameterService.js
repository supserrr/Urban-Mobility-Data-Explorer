// Parameter Service - Manages SQL parameters for filtering

const logger = require('../config/logger');
const { query } = require('../config/database');

class ParameterService {
    /**
     * Get available parameter options for dynamic filtering
     * @returns {Promise<Object>} - Available parameter options
     */
    async getParameterOptions() {
        try {
            const [
                dateRange,
                vendors,
                neighborhoods,
                hours,
                months
            ] = await Promise.all([
                this.getDateRange(),
                this.getVendors(),
                this.getNeighborhoods(),
                this.getHours(),
                this.getMonths()
            ]);

            return {
                dateRange,
                vendors,
                neighborhoods,
                hours,
                months
            };
        } catch (error) {
            logger.error('Error getting parameter options:', error);
            throw error;
        }
    }

    /**
     * Get available date range for filtering
     * @returns {Promise<Object>} - Date range information
     */
    async getDateRange() {
        const result = await query(`
            SELECT 
                MIN(pickup_datetime) as min_date,
                MAX(pickup_datetime) as max_date,
                COUNT(DISTINCT DATE(pickup_datetime)) as total_days
            FROM trips
            WHERE is_valid_nyc_trip = true
        `);

        const row = result.rows[0];
        return {
            minDate: row.min_date,
            maxDate: row.max_date,
            totalDays: parseInt(row.total_days),
            defaultStart: row.min_date,
            defaultEnd: row.max_date
        };
    }

    /**
     * Get available vendors for filtering
     * @returns {Promise<Array>} - Vendor options
     */
    async getVendors() {
        const result = await query(`
            SELECT 
                vendor_id,
                vendor_name,
                COUNT(*) as trip_count,
                ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM trips WHERE is_valid_nyc_trip = true) * 100), 1) as percentage
            FROM trips
            WHERE is_valid_nyc_trip = true
            GROUP BY vendor_id, vendor_name
            ORDER BY trip_count DESC
        `);

        return result.rows.map(row => ({
            id: row.vendor_id,
            name: row.vendor_name,
            tripCount: parseInt(row.trip_count),
            percentage: parseFloat(row.percentage)
        }));
    }

    /**
     * Get available neighborhoods for filtering
     * @returns {Promise<Array>} - Neighborhood options
     */
    async getNeighborhoods() {
        const result = await query(`
            SELECT 
                CASE 
                    WHEN pickup_latitude BETWEEN 40.7 AND 40.8 AND pickup_longitude BETWEEN -74.02 AND -73.9 THEN 'Manhattan'
                    WHEN pickup_latitude BETWEEN 40.6 AND 40.73 AND pickup_longitude BETWEEN -74.05 AND -73.85 THEN 'Brooklyn'
                    WHEN pickup_latitude BETWEEN 40.6 AND 40.8 AND pickup_longitude BETWEEN -73.96 AND -73.7 THEN 'Queens'
                    WHEN pickup_latitude BETWEEN 40.78 AND 40.92 AND pickup_longitude BETWEEN -73.93 AND -73.84 THEN 'Bronx'
                    ELSE 'Other'
                END as name,
                COUNT(*) as trip_count,
                ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM trips WHERE is_valid_nyc_trip = true) * 100), 1) as percentage
            FROM trips
            WHERE is_valid_nyc_trip = true
                AND pickup_latitude IS NOT NULL 
                AND pickup_longitude IS NOT NULL
            GROUP BY name
            ORDER BY trip_count DESC
            LIMIT 20
        `);

        return result.rows.map(row => ({
            name: row.name,
            tripCount: parseInt(row.trip_count),
            percentage: parseFloat(row.percentage)
        }));
    }

    /**
     * Get available hours for filtering
     * @returns {Promise<Array>} - Hour options with trip counts
     */
    async getHours() {
        const result = await query(`
            SELECT 
                pickup_hour,
                COUNT(*) as trip_count,
                ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM trips WHERE is_valid_nyc_trip = true) * 100), 1) as percentage
            FROM trips
            WHERE is_valid_nyc_trip = true
            GROUP BY pickup_hour
            ORDER BY pickup_hour
        `);

        return result.rows.map(row => ({
            hour: parseInt(row.pickup_hour),
            label: `${row.pickup_hour}:00`,
            tripCount: parseInt(row.trip_count),
            percentage: parseFloat(row.percentage)
        }));
    }

    /**
     * Get available months for filtering
     * @returns {Promise<Array>} - Month options with trip counts
     */
    async getMonths() {
        const result = await query(`
            SELECT 
                pickup_month,
                pickup_year,
                COUNT(*) as trip_count,
                ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM trips WHERE is_valid_nyc_trip = true) * 100), 1) as percentage
            FROM trips
            WHERE is_valid_nyc_trip = true
            GROUP BY pickup_month, pickup_year
            ORDER BY pickup_year, pickup_month
        `);

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        return result.rows.map(row => ({
            month: parseInt(row.pickup_month),
            year: parseInt(row.pickup_year),
            label: `${monthNames[row.pickup_month - 1]} ${row.pickup_year}`,
            tripCount: parseInt(row.trip_count),
            percentage: parseFloat(row.percentage)
        }));
    }

    /**
     * Validate parameter values
     * @param {Object} params - Parameter values to validate
     * @returns {Promise<Object>} - Validation result
     */
    async validateParameters(params) {
        const errors = [];
        const warnings = [];

        try {
            // Validate date range
            if (params.startDate && params.endDate) {
                const dateRange = await this.getDateRange();
                const startDate = new Date(params.startDate);
                const endDate = new Date(params.endDate);

                if (startDate > endDate) {
                    errors.push('Start date cannot be after end date');
                }

                if (startDate < new Date(dateRange.minDate)) {
                    warnings.push(`Start date is before available data (${dateRange.minDate})`);
                }

                if (endDate > new Date(dateRange.maxDate)) {
                    warnings.push(`End date is after available data (${dateRange.maxDate})`);
                }
            }

            // Validate vendor
            if (params.vendorId) {
                const vendors = await this.getVendors();
                const vendorExists = vendors.some(v => v.id === params.vendorId);
                if (!vendorExists) {
                    errors.push('Invalid vendor ID');
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

            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };
        } catch (error) {
            logger.error('Error validating parameters:', error);
            return {
                isValid: false,
                errors: ['Parameter validation failed'],
                warnings: []
            };
        }
    }

    /**
     * Build WHERE clause from parameters
     * @param {Object} params - Parameter values
     * @returns {Object} - WHERE clause and parameters
     */
    buildWhereClause(params) {
        const whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;

        // Always include valid NYC trips filter
        whereConditions.push('is_valid_nyc_trip = true');

        // Date range filtering
        if (params.startDate) {
            whereConditions.push(`pickup_datetime >= $${paramIndex}`);
            queryParams.push(params.startDate);
            paramIndex++;
        }

        if (params.endDate) {
            whereConditions.push(`pickup_datetime <= $${paramIndex}`);
            queryParams.push(params.endDate);
            paramIndex++;
        }

        // Vendor filtering
        if (params.vendorId) {
            whereConditions.push(`vendor_id = $${paramIndex}`);
            queryParams.push(params.vendorId);
            paramIndex++;
        }

        // Neighborhood filtering (using coordinate-based detection)
        if (params.neighborhood) {
            let neighborhoodCondition = '';
            
            if (params.neighborhood === 'Manhattan') {
                neighborhoodCondition = `(pickup_latitude BETWEEN 40.7 AND 40.8 AND pickup_longitude BETWEEN -74.02 AND -73.9)`;
            } else if (params.neighborhood === 'Brooklyn') {
                neighborhoodCondition = `(pickup_latitude BETWEEN 40.6 AND 40.73 AND pickup_longitude BETWEEN -74.05 AND -73.85)`;
            } else if (params.neighborhood === 'Queens') {
                neighborhoodCondition = `(pickup_latitude BETWEEN 40.6 AND 40.8 AND pickup_longitude BETWEEN -73.96 AND -73.7)`;
            } else if (params.neighborhood === 'Bronx') {
                neighborhoodCondition = `(pickup_latitude BETWEEN 40.78 AND 40.92 AND pickup_longitude BETWEEN -73.93 AND -73.84)`;
            } else if (params.neighborhood === 'Other') {
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

        // Hour range filtering
        if (params.startHour !== undefined) {
            whereConditions.push(`pickup_hour >= $${paramIndex}`);
            queryParams.push(params.startHour);
            paramIndex++;
        }

        if (params.endHour !== undefined) {
            whereConditions.push(`pickup_hour <= $${paramIndex}`);
            queryParams.push(params.endHour);
            paramIndex++;
        }

        // Month filtering
        if (params.month) {
            whereConditions.push(`pickup_month = $${paramIndex}`);
            queryParams.push(params.month);
            paramIndex++;
        }

        // Year filtering
        if (params.year) {
            whereConditions.push(`pickup_year = $${paramIndex}`);
            queryParams.push(params.year);
            paramIndex++;
        }

        // Distance range filtering
        if (params.minDistance) {
            whereConditions.push(`distance_km >= $${paramIndex}`);
            queryParams.push(params.minDistance);
            paramIndex++;
        }

        if (params.maxDistance) {
            whereConditions.push(`distance_km <= $${paramIndex}`);
            queryParams.push(params.maxDistance);
            paramIndex++;
        }

        // Duration range filtering
        if (params.minDuration) {
            whereConditions.push(`trip_duration >= $${paramIndex}`);
            queryParams.push(params.minDuration);
            paramIndex++;
        }

        if (params.maxDuration) {
            whereConditions.push(`trip_duration <= $${paramIndex}`);
            queryParams.push(params.maxDuration);
            paramIndex++;
        }

        // Passenger count filtering
        if (params.passengerCount) {
            whereConditions.push(`passenger_count = $${paramIndex}`);
            queryParams.push(params.passengerCount);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : '';

        return {
            whereClause,
            queryParams,
            paramIndex
        };
    }

    /**
     * Get parameter usage statistics
     * @returns {Promise<Object>} - Parameter usage statistics
     */
    async getParameterUsageStats() {
        try {
            const result = await query(`
                SELECT 
                    'Total Trips' as metric,
                    COUNT(*) as value
                FROM trips
                WHERE is_valid_nyc_trip = true
                
                UNION ALL
                
                SELECT 
                    'Date Range (Days)' as metric,
                    COUNT(DISTINCT DATE(pickup_datetime)) as value
                FROM trips
                WHERE is_valid_nyc_trip = true
                
                UNION ALL
                
                SELECT 
                    'Active Vendors' as metric,
                    COUNT(DISTINCT vendor_id) as value
                FROM trips
                WHERE is_valid_nyc_trip = true
                
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
                WHERE is_valid_nyc_trip = true
                    AND pickup_latitude IS NOT NULL 
                    AND pickup_longitude IS NOT NULL
                
                UNION ALL
                
                SELECT 
                    'Hours with Data' as metric,
                    COUNT(DISTINCT pickup_hour) as value
                FROM trips
                WHERE is_valid_nyc_trip = true
                
                UNION ALL
                
                SELECT 
                    'Months with Data' as metric,
                    COUNT(DISTINCT pickup_month) as value
                FROM trips
                WHERE is_valid_nyc_trip = true
            `);

            const stats = {};
            result.rows.forEach(row => {
                stats[row.metric] = parseInt(row.value);
            });

            return stats;
        } catch (error) {
            logger.error('Error getting parameter usage stats:', error);
            throw error;
        }
    }
}

module.exports = ParameterService;
