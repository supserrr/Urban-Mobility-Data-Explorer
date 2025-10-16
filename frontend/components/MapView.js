// MapView Component

class MapView {
    constructor(app) {
        this.app = app;
        this.map = null;
        this.heatmapLayer = null;
        this.markers = [];
        this.init();
    }

    /**
     * Initialize map component
     */
    init() {
        this.initializeMap();
        this.setupEventListeners();
    }

    /**
     * Initialize Leaflet map
     */
    initializeMap() {
        // NYC coordinates (center of Manhattan)
        const nycCenter = [40.7589, -73.9851];
        
        // Initialize map
        this.map = L.map('heatmap-canvas').setView(nycCenter, 12);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Initialize heatmap layer
        this.heatmapLayer = L.heatLayer([], {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {
                0.4: 'blue',
                0.6: 'cyan',
                0.7: 'lime',
                0.8: 'yellow',
                1.0: 'red'
            }
        }).addTo(this.map);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Map click events
        this.map.on('click', (e) => {
            this.handleMapClick(e);
        });

        // Map zoom events
        this.map.on('zoomend', () => {
            this.updateHeatmapIntensity();
        });
    }

    /**
     * Update heatmap with new data
     * @param {Array} heatmapData - Heatmap data points
     * @param {string} type - Heatmap type (intensity, duration, distance)
     */
    updateHeatmap(heatmapData, type = 'intensity') {
        if (!this.heatmapLayer || !heatmapData) return;

        // Clear existing markers
        this.clearMarkers();

        // Process heatmap data
        const heatPoints = heatmapData.map(point => {
            const [lat, lng, intensity] = [point.lat, point.lng, point.intensity];
            
            // Normalize intensity based on type
            let normalizedIntensity = 0.5; // Default value
            
            switch (type) {
                case 'intensity':
                    normalizedIntensity = Math.min(point.intensity / 100, 1.0);
                    break;
                case 'duration':
                    normalizedIntensity = Math.min(point.avgDuration / 1800, 1.0); // Max 30 minutes
                    break;
                case 'distance':
                    normalizedIntensity = Math.min(point.avgDistance / 10, 1.0); // Max 10 km
                    break;
            }

            return [lat, lng, normalizedIntensity];
        });

        // Update heatmap layer
        this.heatmapLayer.setLatLngs(heatPoints);

        // Add markers for high-intensity points
        this.addHighIntensityMarkers(heatmapData, type);

        // Update legend
        this.updateLegend(type, heatmapData);
    }

    /**
     * Add markers for high-intensity points
     * @param {Array} heatmapData - Heatmap data
     * @param {string} type - Heatmap type
     */
    addHighIntensityMarkers(heatmapData, type) {
        // Find top 10 highest intensity points
        const sortedData = [...heatmapData].sort((a, b) => b.intensity - a.intensity);
        const topPoints = sortedData.slice(0, 10);

        topPoints.forEach((point, index) => {
            const marker = L.circleMarker([point.lat, point.lng], {
                radius: 8,
                fillColor: this.getMarkerColor(type, point),
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map);

            // Add popup with information
            const popupContent = this.createMarkerPopup(point, type, index + 1);
            marker.bindPopup(popupContent);

            this.markers.push(marker);
        });
    }

    /**
     * Get marker color based on type and data
     * @param {string} type - Heatmap type
     * @param {Object} point - Data point
     * @returns {string} - Color string
     */
    getMarkerColor(type, point) {
        switch (type) {
            case 'intensity':
                return point.intensity > 50 ? '#ef4444' : '#f59e0b';
            case 'duration':
                return point.avgDuration > 900 ? '#ef4444' : '#10b981'; // > 15 min
            case 'distance':
                return point.avgDistance > 5 ? '#ef4444' : '#06b6d4'; // > 5 km
            default:
                return '#2563eb';
        }
    }

    /**
     * Create marker popup content
     * @param {Object} point - Data point
     * @param {string} type - Heatmap type
     * @param {number} rank - Ranking (1-10)
     * @returns {string} - Popup HTML content
     */
    createMarkerPopup(point, type, rank) {
        const content = `
            <div class="map-popup">
                <h4>Hotspot #${rank}</h4>
                <p><strong>Coordinates:</strong> ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}</p>
                <p><strong>Trip Count:</strong> ${point.intensity}</p>
        `;

        if (type === 'duration' || type === 'intensity') {
            content += `<p><strong>Avg Duration:</strong> ${Math.round(point.avgDuration / 60)} min</p>`;
        }

        if (type === 'distance' || type === 'intensity') {
            content += `<p><strong>Avg Distance:</strong> ${point.avgDistance.toFixed(2)} km</p>`;
        }

        content += `</div>`;
        return content;
    }

    /**
     * Update heatmap intensity based on zoom level
     */
    updateHeatmapIntensity() {
        if (!this.heatmapLayer) return;

        const zoom = this.map.getZoom();
        let radius, blur;

        // Adjust radius and blur based on zoom level
        if (zoom >= 15) {
            radius = 15;
            blur = 10;
        } else if (zoom >= 12) {
            radius = 25;
            blur = 15;
        } else {
            radius = 35;
            blur = 20;
        }

        this.heatmapLayer.setOptions({
            radius: radius,
            blur: blur
        });
    }

    /**
     * Update map legend
     * @param {string} type - Heatmap type
     * @param {Array} data - Heatmap data
     */
    updateLegend(type, data) {
        const legend = document.querySelector('.map-legend');
        if (!legend) return;

        // Find min and max values for legend
        let minValue, maxValue, unit;

        switch (type) {
            case 'intensity':
                minValue = Math.min(...data.map(d => d.intensity));
                maxValue = Math.max(...data.map(d => d.intensity));
                unit = 'trips';
                break;
            case 'duration':
                minValue = Math.min(...data.map(d => d.avgDuration)) / 60;
                maxValue = Math.max(...data.map(d => d.avgDuration)) / 60;
                unit = 'minutes';
                break;
            case 'distance':
                minValue = Math.min(...data.map(d => d.avgDistance));
                maxValue = Math.max(...data.map(d => d.avgDistance));
                unit = 'km';
                break;
        }

        // Update legend labels
        const labels = legend.querySelectorAll('.legend-labels span');
        if (labels.length >= 2) {
            labels[0].textContent = `${Math.round(minValue)} ${unit}`;
            labels[1].textContent = `${Math.round(maxValue)} ${unit}`;
        }

        // Update gradient colors based on type
        const gradient = legend.querySelector('.legend-gradient');
        if (gradient) {
            switch (type) {
                case 'intensity':
                    gradient.style.background = 'linear-gradient(to right, #3b82f6, #ef4444)';
                    break;
                case 'duration':
                    gradient.style.background = 'linear-gradient(to right, #10b981, #ef4444)';
                    break;
                case 'distance':
                    gradient.style.background = 'linear-gradient(to right, #06b6d4, #ef4444)';
                    break;
            }
        }
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
        // For example, showing detailed information about the area
        this.showLocationInfo(lat, lng);
    }

    /**
     * Show information for clicked location
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     */
    showLocationInfo(lat, lng) {
        // Create a popup with location information
        const popup = L.popup()
            .setLatLng([lat, lng])
            .setContent(`
                <div class="location-popup">
                    <h4>Location Information</h4>
                    <p><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                    <p><strong>Zoom Level:</strong> ${this.map.getZoom()}</p>
                    <p>Click on markers to see detailed trip information.</p>
                </div>
            `)
            .openOn(this.map);
    }

    /**
     * Clear all markers from map
     */
    clearMarkers() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
    }

    /**
     * Fit map bounds to show all data points
     * @param {Array} data - Data points
     */
    fitBounds(data) {
        if (!data || data.length === 0) return;

        const bounds = data.map(point => [point.lat, point.lng]);
        this.map.fitBounds(bounds, { padding: [20, 20] });
    }

    /**
     * Update map style/theme
     * @param {string} theme - Map theme (light, dark, satellite)
     */
    updateMapTheme(theme = 'light') {
        // Remove existing tile layer
        this.map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                this.map.removeLayer(layer);
            }
        });

        // Add new tile layer based on theme
        let tileUrl, attribution;
        
        switch (theme) {
            case 'dark':
                tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
                attribution = '© OpenStreetMap contributors © CARTO';
                break;
            case 'satellite':
                tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
                attribution = '© Esri';
                break;
            default: // light
                tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
                attribution = '© OpenStreetMap contributors';
        }

        L.tileLayer(tileUrl, {
            attribution: attribution,
            maxZoom: 18
        }).addTo(this.map);
    }

    /**
     * Export map as image
     */
    exportMapImage() {
        // This would require additional libraries like html2canvas
        // For now, we'll just log a message
        console.log('Map export functionality would be implemented here');
    }

    /**
     * Destroy map instance
     */
    destroy() {
        if (this.map) {
            this.clearMarkers();
            this.map.remove();
            this.map = null;
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapView;
}
