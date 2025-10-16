// H3 Grid Generator for Geospatial Aggregation

const { latLngToCell, cellToBoundary, cellToLatLng } = require('h3-js');

class H3GridGenerator {
    constructor(options = {}) {
        this.config = {
            resolution: options.resolution || 8, // H3 resolution (0-15, 8 is ~0.7km hex)
            ...options
        };
    }

    /**
     * Generate H3 grid from pickup/dropoff points
     * @param {Array} points - Array of {lat, lng, type} objects
     * @param {number} resolution - H3 resolution (optional)
     * @returns {Object} - H3 grid with pickup/dropoff counts
     */
    generateGrid(points, resolution = null) {
        const res = resolution || this.config.resolution;
        const grid = new Map();

        points.forEach(point => {
            try {
                // Convert lat/lng to H3 cell
                const h3Index = latLngToCell(point.lat, point.lng, res);
                
                if (!grid.has(h3Index)) {
                    grid.set(h3Index, {
                        h3: h3Index,
                        pickups: 0,
                        dropoffs: 0,
                        total: 0,
                        center: null,
                        boundary: null
                    });
                }

                const cell = grid.get(h3Index);
                
                if (point.type === 'pickup') {
                    cell.pickups++;
                } else if (point.type === 'dropoff') {
                    cell.dropoffs++;
                }
                
                cell.total = cell.pickups + cell.dropoffs;
                
            } catch (error) {
                // Skip invalid coordinates
            }
        });

        // Calculate boundaries and centers for each cell
        const gridArray = Array.from(grid.values()).map(cell => {
            try {
                const [lat, lng] = cellToLatLng(cell.h3);
                const boundary = cellToBoundary(cell.h3).map(([lat, lng]) => [lat, lng]);
                
                return {
                    ...cell,
                    center: { lat, lng },
                    boundary,
                    // Calculate pickup/dropoff ratio
                    pickup_ratio: cell.total > 0 ? (cell.pickups / cell.total) : 0.5,
                    dropoff_ratio: cell.total > 0 ? (cell.dropoffs / cell.total) : 0.5,
                    // Determine dominant type
                    dominant_type: cell.pickups > cell.dropoffs ? 'pickup' : 'dropoff',
                    intensity: cell.total
                };
            } catch (error) {
                return cell;
            }
        });

        return gridArray;
    }

    /**
     * Generate H3 grid from trips
     * @param {Array} trips - Array of trip objects
     * @param {number} resolution - H3 resolution
     * @returns {Object} - Separate pickup and dropoff grids
     */
    generateFromTrips(trips, resolution = null) {
        const res = resolution || this.config.resolution;
        
        // Extract all pickup and dropoff points
        const points = [];
        
        trips.forEach(trip => {
            if (trip.pickup_latitude && trip.pickup_longitude) {
                points.push({
                    lat: trip.pickup_latitude,
                    lng: trip.pickup_longitude,
                    type: 'pickup'
                });
            }
            
            if (trip.dropoff_latitude && trip.dropoff_longitude) {
                points.push({
                    lat: trip.dropoff_latitude,
                    lng: trip.dropoff_longitude,
                    type: 'dropoff'
                });
            }
        });

        return this.generateGrid(points, res);
    }

    /**
     * Get H3 grid statistics
     * @param {Array} grid - H3 grid array
     * @returns {Object} - Statistics
     */
    getGridStatistics(grid) {
        const totalCells = grid.length;
        const totalPickups = grid.reduce((sum, cell) => sum + cell.pickups, 0);
        const totalDropoffs = grid.reduce((sum, cell) => sum + cell.dropoffs, 0);
        
        const pickupDominant = grid.filter(c => c.dominant_type === 'pickup').length;
        const dropoffDominant = grid.filter(c => c.dominant_type === 'dropoff').length;

        return {
            totalCells,
            totalPickups,
            totalDropoffs,
            pickupDominantCells: pickupDominant,
            dropoffDominantCells: dropoffDominant,
            avgPickupsPerCell: (totalPickups / totalCells).toFixed(2),
            avgDropoffsPerCell: (totalDropoffs / totalCells).toFixed(2),
            maxIntensity: Math.max(...grid.map(c => c.total)),
            minIntensity: Math.min(...grid.map(c => c.total))
        };
    }

    /**
     * Format grid for frontend visualization
     * @param {Array} grid - H3 grid array
     * @param {Object} options - Formatting options
     * @returns {Array} - Formatted grid
     */
    formatForVisualization(grid, options = {}) {
        const {
            includeGeometry = true,
            sortBy = 'intensity',
            limit = null
        } = options;

        let formatted = grid.map(cell => {
            const result = {
                h3: cell.h3,
                pickups: cell.pickups,
                dropoffs: cell.dropoffs,
                total: cell.total,
                center: cell.center,
                dominant_type: cell.dominant_type,
                pickup_ratio: parseFloat(cell.pickup_ratio.toFixed(3)),
                dropoff_ratio: parseFloat(cell.dropoff_ratio.toFixed(3)),
                intensity: cell.intensity
            };

            if (includeGeometry) {
                result.boundary = cell.boundary;
            }

            return result;
        });

        // Sort
        if (sortBy === 'intensity') {
            formatted.sort((a, b) => b.intensity - a.intensity);
        } else if (sortBy === 'pickups') {
            formatted.sort((a, b) => b.pickups - a.pickups);
        } else if (sortBy === 'dropoffs') {
            formatted.sort((a, b) => b.dropoffs - a.dropoffs);
        }

        // Limit
        if (limit) {
            formatted = formatted.slice(0, limit);
        }

        return formatted;
    }
}

module.exports = H3GridGenerator;
