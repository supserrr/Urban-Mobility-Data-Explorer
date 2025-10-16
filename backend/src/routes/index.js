// Main Routes

const express = require('express');
const router = express.Router();
const tripRoutes = require('./tripRoutes');
const parameterRoutes = require('./parameterRoutes');
const TripController = require('../controllers/tripController');
const { optionalApiKey } = require('../middleware/authMiddleware');

// Initialize controllers
const tripController = new TripController();

// API Health Check
router.get('/health', (req, res) => tripController.getHealthMetrics(req, res));

// API Documentation
router.get('/docs', (req, res) => tripController.getApiDocumentation(req, res));

// API Version Info
router.get('/version', (req, res) => {
    res.json({
        success: true,
        data: {
            api: 'Urban Mobility Data Explorer API',
            version: '1.0.0',
            status: 'operational',
            timestamp: new Date().toISOString()
        }
    });
});

// Frontend Configuration (secure - sensitive keys only for authenticated clients)
router.get('/config', optionalApiKey, (req, res) => {
    const configData = {
        apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8000/api',
        environment: process.env.NODE_ENV || 'development',
        authenticated: req.authenticated || false
    };
    
    // Only provide sensitive keys to authenticated clients
    if (req.authenticated) {
        const maptilerKey = process.env.MAPTILER_API_KEY || '';
        
        // VALIDATION: Never send placeholder values to frontend
        const isPlaceholder = !maptilerKey || 
                             maptilerKey.includes('your_') || 
                             maptilerKey.includes('_here') ||
                             maptilerKey === 'your_maptiler_api_key_here';
        
        if (isPlaceholder) {
            console.error('CRITICAL: MAPTILER_API_KEY is not configured properly in backend/.env');
            console.error('Current value appears to be a placeholder. Please update backend/.env with a valid MapTiler API key.');
            // Don't send placeholder - send empty string instead
            configData.maptilerApiKey = '';
            configData.warning = 'MapTiler API key not configured on server';
        } else {
            configData.maptilerApiKey = maptilerKey;
        }
    }
    
    res.json({
        success: true,
        data: configData
    });
});

// Mount trip routes
router.use('/trips', tripRoutes);

// Mount parameter routes
router.use('/parameters', parameterRoutes);

// Catch-all for undefined routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        availableEndpoints: [
            'GET /api/health',
            'GET /api/docs',
            'GET /api/version',
            'GET /api/config',
            'GET /api/trips',
            'GET /api/trips/statistics',
            'GET /api/trips/neighborhoods',
            'GET /api/trips/vendors',
            'GET /api/trips/map',
            'GET /api/trips/h3-grid',
            'GET /api/trips/heatmap',
            'GET /api/trips/routes',
            'GET /api/trips/:id',
            'GET /api/parameters/options',
            'POST /api/parameters/validate',
            'GET /api/parameters/stats'
        ]
    });
});

module.exports = router;
