// RouteManager Component

class RouteManager {
    constructor(app) {
        this.app = app;
        this.routeMap = null;
        this.routeMarkers = [];
        this.routeLines = [];
        this.routeTable = null;
        this.init();
    }

    /**
     * Initialize route manager component
     */
    init() {
        this.initializeRouteMap();
        this.initializeRouteTable();
        this.setupEventListeners();
    }

    /**
     * Initialize route map
     */
    initializeRouteMap() {
        // NYC coordinates (center of Manhattan)
        const nycCenter = [40.7589, -73.9851];
        
        // Initialize map
        this.routeMap = L.map('routes-map').setView(nycCenter, 12);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.routeMap);

        // Add map controls
        this.addMapControls();
    }

    /**
     * Add map controls
     */
    addMapControls() {
        // Add scale control
        L.control.scale({
            position: 'bottomright',
            metric: true,
            imperial: false
        }).addTo(this.routeMap);

        // Add fullscreen control (if available)
        if (L.control.fullscreen) {
            L.control.fullscreen({
                position: 'topright'
            }).addTo(this.routeMap);
        }
    }

    /**
     * Initialize route table
     */
    initializeRouteTable() {
        const tableContainer = document.getElementById('routes-table');
        if (!tableContainer) return;

        this.routeTable = tableContainer;
        this.createTableHeader();
    }

    /**
     * Create table header
     */
    createTableHeader() {
        if (!this.routeTable) return;

        const header = document.createElement('div');
        header.className = 'table-header';
        header.innerHTML = `
            <div class="table-row header-row">
                <div class="table-cell rank">#</div>
                <div class="table-cell route">Route</div>
                <div class="table-cell trips">Trips</div>
                <div class="table-cell duration">Avg Duration</div>
                <div class="table-cell distance">Avg Distance</div>
                <div class="table-cell actions">Actions</div>
            </div>
        `;
        
        this.routeTable.appendChild(header);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Map click events
        this.routeMap.on('click', (e) => {
            this.handleMapClick(e);
        });

        // Map zoom events
        this.routeMap.on('zoomend', () => {
            this.updateRouteVisibility();
        });
    }

    /**
     * Update routes with new data
     * @param {Array} routesData - Routes data
     */
    updateRoutes(routesData) {
        if (!routesData || routesData.length === 0) return;

        // Clear existing routes
        this.clearRoutes();

        // Add routes to map
        this.addRoutesToMap(routesData);

        // Update route table
        this.updateRouteTable(routesData);

        // Fit map bounds to show all routes
        this.fitMapToRoutes(routesData);
    }

    /**
     * Add routes to map
     * @param {Array} routesData - Routes data
     */
    addRoutesToMap(routesData) {
        routesData.forEach((route, index) => {
            this.addRouteToMap(route, index);
        });
    }

    /**
     * Add single route to map
     * @param {Object} route - Route data
     * @param {number} index - Route index
     */
    addRouteToMap(route, index) {
        const pickup = route.pickup;
        const dropoff = route.dropoff;

        // Create pickup marker
        const pickupMarker = L.circleMarker([pickup.lat, pickup.lng], {
            radius: 6,
            fillColor: '#10b981',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(this.routeMap);

        // Create dropoff marker
        const dropoffMarker = L.circleMarker([dropoff.lat, dropoff.lng], {
            radius: 6,
            fillColor: '#ef4444',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(this.routeMap);

        // Create route line
        const routeLine = L.polyline([
            [pickup.lat, pickup.lng],
            [dropoff.lat, dropoff.lng]
        ], {
            color: this.getRouteColor(index),
            weight: this.getRouteWeight(route.tripCount),
            opacity: 0.8
        }).addTo(this.routeMap);

        // Create route group
        const routeGroup = L.layerGroup([pickupMarker, dropoffMarker, routeLine]);
        
        // Add popup to route group
        const popupContent = this.createRoutePopup(route, index + 1);
        routeGroup.bindPopup(popupContent);

        // Store route elements
        this.routeMarkers.push({
            pickup: pickupMarker,
            dropoff: dropoffMarker,
            line: routeLine,
            group: routeGroup,
            data: route,
            index: index
        });

        this.routeLines.push(routeLine);
    }

    /**
     * Get route color based on index
     * @param {number} index - Route index
     * @returns {string} - Color string
     */
    getRouteColor(index) {
        const colors = [
            '#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
            '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
        ];
        return colors[index % colors.length];
    }

    /**
     * Get route weight based on trip count
     * @param {number} tripCount - Number of trips
     * @returns {number} - Line weight
     */
    getRouteWeight(tripCount) {
        if (tripCount > 100) return 6;
        if (tripCount > 50) return 4;
        if (tripCount > 20) return 3;
        return 2;
    }

    /**
     * Create route popup content
     * @param {Object} route - Route data
     * @param {number} rank - Route ranking
     * @returns {string} - Popup HTML content
     */
    createRoutePopup(route, rank) {
        const duration = Math.round(route.avgDuration / 60); // Convert to minutes
        const distance = route.avgDistance.toFixed(2);
        
        return `
            <div class="route-popup">
                <h4>Route #${rank}</h4>
                <div class="route-info">
                    <div class="route-points">
                        <div class="point pickup">
                            <strong>From:</strong> ${route.pickup.lat.toFixed(4)}, ${route.pickup.lng.toFixed(4)}
                        </div>
                        <div class="point dropoff">
                            <strong>To:</strong> ${route.dropoff.lat.toFixed(4)}, ${route.dropoff.lng.toFixed(4)}
                        </div>
                    </div>
                    <div class="route-stats">
                        <p><strong>Trips:</strong> ${route.tripCount.toLocaleString()}</p>
                        <p><strong>Avg Duration:</strong> ${duration} min</p>
                        <p><strong>Avg Distance:</strong> ${distance} km</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Update route table
     * @param {Array} routesData - Routes data
     */
    updateRouteTable(routesData) {
        if (!this.routeTable) return;

        // Clear existing table rows (except header)
        const existingRows = this.routeTable.querySelectorAll('.table-row:not(.header-row)');
        existingRows.forEach(row => row.remove());

        // Add route rows
        routesData.forEach((route, index) => {
            this.addRouteToTable(route, index + 1);
        });
    }

    /**
     * Add single route to table
     * @param {Object} route - Route data
     * @param {number} rank - Route ranking
     */
    addRouteToTable(route, rank) {
        const row = document.createElement('div');
        row.className = 'table-row route-row';
        row.dataset.routeIndex = rank - 1;

        const duration = Math.round(route.avgDuration / 60); // Convert to minutes
        const distance = route.avgDistance.toFixed(2);

        row.innerHTML = `
            <div class="table-cell rank">${rank}</div>
            <div class="table-cell route">
                <div class="route-coordinates">
                    <div class="coordinate pickup">
                        <span class="label">From:</span>
                        <span class="coord">${route.pickup.lat.toFixed(4)}, ${route.pickup.lng.toFixed(4)}</span>
                    </div>
                    <div class="coordinate dropoff">
                        <span class="label">To:</span>
                        <span class="coord">${route.dropoff.lat.toFixed(4)}, ${route.dropoff.lng.toFixed(4)}</span>
                    </div>
                </div>
            </div>
            <div class="table-cell trips">${route.tripCount.toLocaleString()}</div>
            <div class="table-cell duration">${duration} min</div>
            <div class="table-cell distance">${distance} km</div>
            <div class="table-cell actions">
                <button class="btn btn-sm btn-primary" onclick="app.routeManager.highlightRoute(${rank - 1})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-secondary" onclick="app.routeManager.zoomToRoute(${rank - 1})">
                    <i class="fas fa-search-plus"></i>
                </button>
            </div>
        `;

        // Add click event to highlight route
        row.addEventListener('click', () => {
            this.highlightRoute(rank - 1);
        });

        this.routeTable.appendChild(row);
    }

    /**
     * Highlight specific route
     * @param {number} routeIndex - Route index
     */
    highlightRoute(routeIndex) {
        // Reset all routes
        this.resetRouteHighlights();

        // Highlight selected route
        const route = this.routeMarkers[routeIndex];
        if (route) {
            // Highlight table row
            const tableRow = this.routeTable.querySelector(`[data-route-index="${routeIndex}"]`);
            if (tableRow) {
                tableRow.classList.add('highlighted');
            }

            // Highlight map elements
            route.pickup.setStyle({
                radius: 8,
                fillColor: '#f59e0b',
                weight: 3
            });

            route.dropoff.setStyle({
                radius: 8,
                fillColor: '#f59e0b',
                weight: 3
            });

            route.line.setStyle({
                color: '#f59e0b',
                weight: 8,
                opacity: 1
            });

            // Open popup
            route.group.openPopup();
        }
    }

    /**
     * Zoom to specific route
     * @param {number} routeIndex - Route index
     */
    zoomToRoute(routeIndex) {
        const route = this.routeMarkers[routeIndex];
        if (route) {
            const bounds = L.latLngBounds([
                [route.data.pickup.lat, route.data.pickup.lng],
                [route.data.dropoff.lat, route.data.dropoff.lng]
            ]);
            
            this.routeMap.fitBounds(bounds, { padding: [20, 20] });
            this.highlightRoute(routeIndex);
        }
    }

    /**
     * Reset route highlights
     */
    resetRouteHighlights() {
        // Reset table rows
        const highlightedRows = this.routeTable.querySelectorAll('.highlighted');
        highlightedRows.forEach(row => row.classList.remove('highlighted'));

        // Reset map elements
        this.routeMarkers.forEach(route => {
            route.pickup.setStyle({
                radius: 6,
                fillColor: '#10b981',
                weight: 2
            });

            route.dropoff.setStyle({
                radius: 6,
                fillColor: '#ef4444',
                weight: 2
            });

            route.line.setStyle({
                color: this.getRouteColor(route.index),
                weight: this.getRouteWeight(route.data.tripCount),
                opacity: 0.8
            });
        });
    }

    /**
     * Update route visibility based on zoom level
     */
    updateRouteVisibility() {
        const zoom = this.routeMap.getZoom();
        
        this.routeMarkers.forEach(route => {
            const shouldShow = zoom >= 11; // Only show routes at zoom level 11+
            route.group.setOpacity(shouldShow ? 1 : 0);
        });
    }

    /**
     * Fit map bounds to show all routes
     * @param {Array} routesData - Routes data
     */
    fitMapToRoutes(routesData) {
        if (routesData.length === 0) return;

        const bounds = L.latLngBounds();
        
        routesData.forEach(route => {
            bounds.extend([route.pickup.lat, route.pickup.lng]);
            bounds.extend([route.dropoff.lat, route.dropoff.lng]);
        });

        this.routeMap.fitBounds(bounds, { padding: [20, 20] });
    }

    /**
     * Handle map click events
     * @param {Object} event - Leaflet click event
     */
    handleMapClick(event) {
        const { lat, lng } = event.latlng;
        
        // Show coordinates in console (for debugging)
        console.log(`Clicked coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        
        // You could add more interactive features here
        // For example, finding the closest route to the clicked point
        this.findClosestRoute(lat, lng);
    }

    /**
     * Find closest route to clicked point
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     */
    findClosestRoute(lat, lng) {
        let closestRoute = null;
        let closestDistance = Infinity;

        this.routeMarkers.forEach(route => {
            // Calculate distance to pickup point
            const pickupDistance = this.calculateDistance(lat, lng, route.data.pickup.lat, route.data.pickup.lng);
            
            // Calculate distance to dropoff point
            const dropoffDistance = this.calculateDistance(lat, lng, route.data.dropoff.lat, route.data.dropoff.lng);
            
            // Use minimum distance
            const minDistance = Math.min(pickupDistance, dropoffDistance);
            
            if (minDistance < closestDistance) {
                closestDistance = minDistance;
                closestRoute = route;
            }
        });

        if (closestRoute) {
            this.highlightRoute(closestRoute.index);
        }
    }

    /**
     * Calculate distance between two points
     * @param {number} lat1 - Latitude 1
     * @param {number} lng1 - Longitude 1
     * @param {number} lat2 - Latitude 2
     * @param {number} lng2 - Longitude 2
     * @returns {number} - Distance in kilometers
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Degrees
     * @returns {number} - Radians
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Clear all routes
     */
    clearRoutes() {
        // Clear map markers and lines
        this.routeMarkers.forEach(route => {
            this.routeMap.removeLayer(route.group);
        });

        // Clear arrays
        this.routeMarkers = [];
        this.routeLines = [];

        // Clear table rows (except header)
        const existingRows = this.routeTable.querySelectorAll('.table-row:not(.header-row)');
        existingRows.forEach(row => row.remove());
    }

    /**
     * Export routes data
     */
    exportRoutes() {
        if (this.routeMarkers.length === 0) {
            this.app.showWarning('No routes to export');
            return;
        }

        const routesData = this.routeMarkers.map(route => route.data);
        
        // Create CSV content
        const csvContent = this.createCSVContent(routesData);
        
        // Download CSV
        this.downloadCSV(csvContent, 'popular_routes.csv');
    }

    /**
     * Create CSV content from routes data
     * @param {Array} routesData - Routes data
     * @returns {string} - CSV content
     */
    createCSVContent(routesData) {
        const headers = [
            'Rank',
            'Pickup Latitude',
            'Pickup Longitude',
            'Dropoff Latitude',
            'Dropoff Longitude',
            'Trip Count',
            'Avg Duration (min)',
            'Avg Distance (km)'
        ];

        const rows = routesData.map((route, index) => [
            index + 1,
            route.pickup.lat,
            route.pickup.lng,
            route.dropoff.lat,
            route.dropoff.lng,
            route.tripCount,
            Math.round(route.avgDuration / 60),
            route.avgDistance.toFixed(2)
        ]);

        const csvRows = [headers, ...rows];
        return csvRows.map(row => row.join(',')).join('\n');
    }

    /**
     * Download CSV file
     * @param {string} content - CSV content
     * @param {string} filename - Filename
     */
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    /**
     * Destroy route manager
     */
    destroy() {
        if (this.routeMap) {
            this.clearRoutes();
            this.routeMap.remove();
            this.routeMap = null;
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RouteManager;
}
