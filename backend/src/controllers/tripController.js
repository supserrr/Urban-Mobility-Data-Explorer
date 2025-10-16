// Trip Controller

const logger = require('../config/logger');
const TripService = require('../services/tripService');
const ParameterService = require('../services/parameterService');

class TripController {
    constructor() {
        this.tripService = new TripService();
        this.parameterService = new ParameterService();
    }

    // Get trips with filters and pagination
    async getTrips(req, res) {
        try {
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
                pickupDayOfWeek,
                page,
                limit,
                sortBy,
                sortOrder
            } = req.query;

            const filters = {
                startDate,
                endDate,
                vendorId,
                minDuration: minDuration ? parseInt(minDuration) : undefined,
                maxDuration: maxDuration ? parseInt(maxDuration) : undefined,
                minDistance: minDistance ? parseFloat(minDistance) : undefined,
                maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
                passengerCount: passengerCount ? parseInt(passengerCount) : undefined,
                pickupHour: pickupHour ? parseInt(pickupHour) : undefined,
                pickupDayOfWeek: pickupDayOfWeek ? parseInt(pickupDayOfWeek) : undefined
            };

            const pagination = {
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 100,
                sortBy,
                sortOrder
            };

            // Validate pagination parameters - Allow unlimited for visualization
            // Note: For production, consider implementing streaming or pagination
            if (pagination.limit > 1000000) {
                return res.status(400).json({
                    success: false,
                    message: 'Limit cannot exceed 1,000,000 records per request'
                });
            }

            const result = await this.tripService.getTrips(filters, pagination);

            logger.info(`Retrieved ${result.data.length} trips`, {
                filters,
                pagination: result.pagination
            });

            res.json({
                success: true,
                data: result.data,
                pagination: result.pagination
            });
        } catch (error) {
            logger.error('Error getting trips:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get trip statistics grouped by time period
    async getTripStatistics(req, res) {
        try {
            const {
                startDate,
                endDate,
                vendorId,
                groupBy
            } = req.query;

            const filters = {
                startDate,
                endDate,
                vendorId,
                groupBy
            };

            const statistics = await this.tripService.getTripStatistics(filters);

            logger.info(`Retrieved trip statistics`, {
                filters,
                recordCount: statistics.length
            });

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            logger.error('Error getting trip statistics:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get heatmap data
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getHeatmapData(req, res) {
        try {
            const {
                startDate,
                endDate,
                vendorId,
                gridSize,
                limit
            } = req.query;

            const filters = {
                startDate,
                endDate,
                vendorId,
                limit: limit ? parseInt(limit) : 1000
            };

            const gridSizeNum = gridSize ? parseFloat(gridSize) : 0.01;

            const heatmapData = await this.tripService.getHeatmapData(filters, gridSizeNum);

            logger.info(`Retrieved heatmap data`, {
                filters,
                gridSize: gridSizeNum,
                dataPoints: heatmapData.length
            });

            res.json({
                success: true,
                data: heatmapData
            });
        } catch (error) {
            logger.error('Error getting heatmap data:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get popular routes
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getPopularRoutes(req, res) {
        try {
            const {
                startDate,
                endDate,
                vendorId,
                limit
            } = req.query;

            const filters = {
                startDate,
                endDate,
                vendorId
            };

            const limitNum = limit ? parseInt(limit) : 50;

            const routes = await this.tripService.getPopularRoutes(filters, limitNum);

            logger.info(`Retrieved popular routes`, {
                filters,
                routeCount: routes.length
            });

            res.json({
                success: true,
                data: routes
            });
        } catch (error) {
            logger.error('Error getting popular routes:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get trip by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getTripById(req, res) {
        try {
            const { id } = req.params;
            const tripId = parseInt(id);

            if (isNaN(tripId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid trip ID'
                });
            }

            const trip = await this.tripService.getTripById(tripId);

            if (!trip) {
                return res.status(404).json({
                    success: false,
                    message: 'Trip not found'
                });
            }

            logger.info(`Retrieved trip ${tripId}`);

            res.json({
                success: true,
                data: trip
            });
        } catch (error) {
            logger.error('Error getting trip by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get health metrics
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getHealthMetrics(req, res) {
        try {
            const metrics = await this.tripService.getHealthMetrics();

            logger.info('Retrieved health metrics', metrics);

            res.json({
                success: true,
                data: metrics
            });
        } catch (error) {
            logger.error('Error getting health metrics:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get trips for map visualization (optimized)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getTripsForMap(req, res) {
        try {
            const {
                startDate,
                endDate,
                vendorId,
                limit
            } = req.query;

            const filters = {
                startDate,
                endDate,
                vendorId,
                limit: limit ? parseInt(limit, 10) : 100000
            };
            
            // Ensure limit is a valid number
            if (isNaN(filters.limit)) {
                filters.limit = 100000;
            }

            const trips = await this.tripService.getTripsForMap(filters);

            logger.info(`Retrieved ${trips.length} trips for map visualization`, {
                filters
            });

            res.json({
                success: true,
                data: trips
            });
        } catch (error) {
            logger.error('Error getting trips for map:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get neighborhoods statistics
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getNeighborhoods(req, res) {
        try {
            const {
                startDate,
                endDate,
                vendorId,
                limit
            } = req.query;

            const filters = {
                startDate,
                endDate,
                vendorId,
                limit: limit ? parseInt(limit) : 10
            };

            const neighborhoods = await this.tripService.getNeighborhoods(filters);

            logger.info(`Retrieved neighborhoods statistics`, {
                filters,
                recordCount: neighborhoods.length
            });

            res.json({
                success: true,
                data: neighborhoods
            });
        } catch (error) {
            logger.error('Error getting neighborhoods:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get vendors statistics
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getVendors(req, res) {
        try {
            const {
                startDate,
                endDate
            } = req.query;

            const filters = {
                startDate,
                endDate
            };

            const vendors = await this.tripService.getVendors(filters);

            logger.info(`Retrieved vendor statistics`, {
                filters,
                recordCount: vendors.length
            });

            res.json({
                success: true,
                data: vendors
            });
        } catch (error) {
            logger.error('Error getting vendors:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get parameter options for dynamic filtering
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getParameterOptions(req, res) {
        try {
            const options = await this.parameterService.getParameterOptions();
            
            res.json({
                success: true,
                data: options
            });
        } catch (error) {
            logger.error('Error getting parameter options:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get parameter options'
            });
        }
    }

    /**
     * Validate parameter values
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async validateParameters(req, res) {
        try {
            const validation = await this.parameterService.validateParameters(req.body);
            
            res.json({
                success: true,
                data: validation
            });
        } catch (error) {
            logger.error('Error validating parameters:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to validate parameters'
            });
        }
    }

    /**
     * Get parameter usage statistics
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getParameterStats(req, res) {
        try {
            const stats = await this.parameterService.getParameterUsageStats();
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Error getting parameter stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get parameter statistics'
            });
        }
    }

    /**
     * Get API documentation
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getApiDocumentation(req, res) {
        const documentation = {
            title: 'Urban Mobility Data Explorer API',
            version: '1.0.0',
            description: 'REST API for NYC taxi trip data analysis and visualization',
            endpoints: {
                'GET /api/trips': {
                    description: 'Get trips with filtering and pagination',
                    parameters: {
                        startDate: 'ISO date string - Filter trips from this date',
                        endDate: 'ISO date string - Filter trips until this date',
                        vendorId: 'String (1 or 2) - Filter by vendor ID',
                        minDuration: 'Integer - Minimum trip duration in seconds',
                        maxDuration: 'Integer - Maximum trip duration in seconds',
                        minDistance: 'Float - Minimum trip distance in km',
                        maxDistance: 'Float - Maximum trip distance in km',
                        passengerCount: 'Integer (1-6) - Filter by passenger count',
                        pickupHour: 'Integer (0-23) - Filter by pickup hour',
                        pickupDayOfWeek: 'Integer (0-6) - Filter by day of week',
                        page: 'Integer - Page number for pagination',
                        limit: 'Integer - Records per page (max 1000)',
                        sortBy: 'String - Field to sort by',
                        sortOrder: 'String (ASC/DESC) - Sort order'
                    }
                },
                'GET /api/trips/statistics': {
                    description: 'Get trip statistics grouped by time period',
                    parameters: {
                        startDate: 'ISO date string - Filter trips from this date',
                        endDate: 'ISO date string - Filter trips until this date',
                        vendorId: 'String (1 or 2) - Filter by vendor ID',
                        groupBy: 'String (hour/day/month) - Group statistics by time period'
                    }
                },
                'GET /api/trips/neighborhoods': {
                    description: 'Get neighborhood pickup and dropoff statistics',
                    parameters: {
                        startDate: 'ISO date string - Filter trips from this date',
                        endDate: 'ISO date string - Filter trips until this date',
                        vendorId: 'String (1 or 2) - Filter by vendor ID',
                        limit: 'Integer - Maximum number of neighborhoods (default 10)'
                    }
                },
                'GET /api/trips/vendors': {
                    description: 'Get vendor statistics and distribution',
                    parameters: {
                        startDate: 'ISO date string - Filter trips from this date',
                        endDate: 'ISO date string - Filter trips until this date'
                    }
                },
                'GET /api/trips/heatmap': {
                    description: 'Get heatmap data for visualization',
                    parameters: {
                        startDate: 'ISO date string - Filter trips from this date',
                        endDate: 'ISO date string - Filter trips until this date',
                        vendorId: 'String (1 or 2) - Filter by vendor ID',
                        gridSize: 'Float - Grid size for heatmap clustering',
                        limit: 'Integer - Maximum number of data points'
                    }
                },
                'GET /api/trips/routes': {
                    description: 'Get popular routes',
                    parameters: {
                        startDate: 'ISO date string - Filter trips from this date',
                        endDate: 'ISO date string - Filter trips until this date',
                        vendorId: 'String (1 or 2) - Filter by vendor ID',
                        limit: 'Integer - Maximum number of routes'
                    }
                },
                'GET /api/trips/:id': {
                    description: 'Get specific trip by ID',
                    parameters: {
                        id: 'Integer - Trip ID'
                    }
                },
                'GET /api/health': {
                    description: 'Get API and database health metrics'
                }
            }
        };

        res.json({
            success: true,
            data: documentation
        });
    }

    /**
     * Get H3 aggregated grid for efficient map rendering
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getH3Grid(req, res) {
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
                maxDistance,
                resolution = 8, // Default H3 resolution (0.7km hex)
                includeGeometry = true
            } = req.query;

            const filters = {
                startDate,
                endDate,
                vendorId,
                neighborhood,
                startHour: startHour ? parseInt(startHour) : undefined,
                endHour: endHour ? parseInt(endHour) : undefined,
                month: month ? parseInt(month) : undefined,
                minDistance: minDistance ? parseFloat(minDistance) : undefined,
                maxDistance: maxDistance ? parseFloat(maxDistance) : undefined
            };

            const h3Resolution = parseInt(resolution);
            const includeGeom = includeGeometry === 'true' || includeGeometry === true;

            // Validate H3 resolution (0-15, but practical range is 6-10 for city-scale)
            if (h3Resolution < 0 || h3Resolution > 15) {
                return res.status(400).json({
                    success: false,
                    message: 'H3 resolution must be between 0 and 15'
                });
            }

            const gridData = await this.tripService.getH3Grid(filters, h3Resolution, includeGeom);

            logger.info(`Retrieved H3 grid with ${gridData.length} cells at resolution ${h3Resolution}`, {
                filters,
                resolution: h3Resolution
            });

            res.json({
                success: true,
                data: gridData,
                metadata: {
                    resolution: h3Resolution,
                    cellCount: gridData.length,
                    filters
                }
            });
        } catch (error) {
            logger.error('Error getting H3 grid:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get passenger count distribution
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getPassengerDistribution(req, res) {
        try {
            const {
                startDate,
                endDate,
                vendorId
            } = req.query;

            const filters = {
                startDate,
                endDate,
                vendorId
            };

            const distribution = await this.tripService.getPassengerDistribution(filters);

            logger.info('Retrieved passenger distribution', {
                filters,
                recordCount: distribution.length
            });

            res.json({
                success: true,
                data: distribution
            });
        } catch (error) {
            logger.error('Error getting passenger distribution:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get duration distribution
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getDurationDistribution(req, res) {
        try {
            const {
                startDate,
                endDate,
                vendorId
            } = req.query;

            const filters = {
                startDate,
                endDate,
                vendorId
            };

            const distribution = await this.tripService.getDurationDistribution(filters);

            logger.info('Retrieved duration distribution', {
                filters,
                recordCount: distribution.length
            });

            res.json({
                success: true,
                data: distribution
            });
        } catch (error) {
            logger.error('Error getting duration distribution:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get correlation data
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getCorrelationData(req, res) {
        try {
            const {
                startDate,
                endDate,
                vendorId
            } = req.query;

            const filters = {
                startDate,
                endDate,
                vendorId
            };

            const correlation = await this.tripService.getCorrelationData(filters);

            logger.info('Retrieved correlation data', {
                filters
            });

            res.json({
                success: true,
                data: correlation
            });
        } catch (error) {
            logger.error('Error getting correlation data:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = TripController;
