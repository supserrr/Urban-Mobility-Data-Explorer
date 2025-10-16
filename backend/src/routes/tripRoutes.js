// Trip Routes

const express = require('express');
const router = express.Router();
const TripController = require('../controllers/tripController');

// Initialize controller
const tripController = new TripController();

// GET /api/trips - Get trips with filtering and pagination
router.get('/', (req, res) => tripController.getTrips(req, res));

// GET /api/trips/map - Get trips for map visualization (optimized)
router.get('/map', (req, res) => tripController.getTripsForMap(req, res));

// GET /api/trips/h3-grid - Get H3 aggregated grid for efficient map rendering
router.get('/h3-grid', (req, res) => tripController.getH3Grid(req, res));

// GET /api/trips/statistics - Get trip statistics
router.get('/statistics', (req, res) => tripController.getTripStatistics(req, res));

// GET /api/trips/neighborhoods - Get neighborhood statistics
router.get('/neighborhoods', (req, res) => tripController.getNeighborhoods(req, res));

// GET /api/trips/vendors - Get vendor statistics
router.get('/vendors', (req, res) => tripController.getVendors(req, res));

// GET /api/trips/heatmap - Get heatmap data
router.get('/heatmap', (req, res) => tripController.getHeatmapData(req, res));

// GET /api/trips/routes - Get popular routes
router.get('/routes', (req, res) => tripController.getPopularRoutes(req, res));

// GET /api/trips/passenger-distribution - Get passenger count distribution
router.get('/passenger-distribution', (req, res) => tripController.getPassengerDistribution(req, res));

// GET /api/trips/duration-distribution - Get duration distribution
router.get('/duration-distribution', (req, res) => tripController.getDurationDistribution(req, res));

// GET /api/trips/correlation - Get correlation data
router.get('/correlation', (req, res) => tripController.getCorrelationData(req, res));

// GET /api/trips/:id - Get trip by ID
router.get('/:id', (req, res) => tripController.getTripById(req, res));

module.exports = router;
