// Parameter Routes

const express = require('express');
const router = express.Router();
const TripController = require('../controllers/tripController');

// Initialize controller
const tripController = new TripController();

// GET /api/parameters/options - Get available parameter options
router.get('/options', (req, res) => tripController.getParameterOptions(req, res));

// POST /api/parameters/validate - Validate parameter values
router.post('/validate', (req, res) => tripController.validateParameters(req, res));

// GET /api/parameters/stats - Get parameter usage statistics
router.get('/stats', (req, res) => tripController.getParameterStats(req, res));

module.exports = router;
