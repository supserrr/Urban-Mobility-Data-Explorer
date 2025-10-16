// Urban Mobility Data Explorer - Main Application

class UrbanMobilityApp {
    constructor() {
        this.currentView = 'dashboard';
        this.filters = {};
        this.data = {
            trips: [],
            statistics: [],
            heatmap: [],
            routes: []
        };
        this.charts = {};
        this.maps = {};
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize components
            await this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Test API connection
            const connected = await api.testConnection();
            this.updateConnectionStatus(connected);
            
            // Load initial data
            await this.loadInitialData();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            console.log('Urban Mobility Data Explorer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Initialize application components
     */
    async initializeComponents() {
        // Initialize dashboard component
        this.dashboard = new Dashboard(this);
        
        // Initialize chart view component
        this.chartView = new ChartView(this);
        
        // Initialize map view component
        this.mapView = new MapView(this);
        
        // Initialize route manager component
        this.routeManager = new RouteManager(this);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Filter panel toggle
        const toggleFiltersBtn = document.getElementById('toggle-filters');
        const filtersPanel = document.getElementById('filters-panel');
        
        if (toggleFiltersBtn && filtersPanel) {
            toggleFiltersBtn.addEventListener('click', () => {
                filtersPanel.classList.toggle('collapsed');
                const icon = toggleFiltersBtn.querySelector('i');
                icon.classList.toggle('fa-chevron-left');
                icon.classList.toggle('fa-chevron-right');
            });
        }

        // Filter actions
        const applyFiltersBtn = document.getElementById('apply-filters');
        const clearFiltersBtn = document.getElementById('clear-filters');
        
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }
        
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Add Enter key listener to filter inputs
        document.querySelectorAll('#filters-panel input, #filters-panel select').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.applyFilters();
                }
            });
        });

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        // Chart controls
        document.querySelectorAll('.chart-control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartType = e.currentTarget.dataset.chart;
                this.switchChartType(chartType);
            });
        });

        // Heatmap controls
        const heatmapTypeSelect = document.getElementById('heatmap-type');
        const heatmapRefreshBtn = document.getElementById('heatmap-refresh');
        
        if (heatmapTypeSelect) {
            heatmapTypeSelect.addEventListener('change', () => {
                this.updateHeatmap();
            });
        }
        
        if (heatmapRefreshBtn) {
            heatmapRefreshBtn.addEventListener('click', () => {
                this.updateHeatmap();
            });
        }

        // Routes controls
        const routesLimitInput = document.getElementById('routes-limit');
        const routesRefreshBtn = document.getElementById('routes-refresh');
        
        if (routesLimitInput) {
            routesLimitInput.addEventListener('change', () => {
                this.updateRoutes();
            });
        }
        
        if (routesRefreshBtn) {
            routesRefreshBtn.addEventListener('click', () => {
                this.updateRoutes();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchView('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchView('heatmap');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchView('routes');
                        break;
                    case '4':
                        e.preventDefault();
                        this.switchView('analytics');
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshData();
                        break;
                }
            }
        });
    }

    /**
     * Switch between different views
     * @param {string} viewName - Name of the view to switch to
     */
    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.view === viewName) {
                item.classList.add('active');
            }
        });

        // Update view content
        document.querySelectorAll('.view-content').forEach(view => {
            view.classList.remove('active');
        });

        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
            
            // Load view-specific data
            this.loadViewData(viewName);
        }
    }

    /**
     * Switch chart type for timeline chart
     * @param {string} chartType - Type of chart (hourly, daily, monthly)
     */
    switchChartType(chartType) {
        // Update button states
        document.querySelectorAll('.chart-control-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.chart === chartType) {
                btn.classList.add('active');
            }
        });

        // Update chart
        if (this.chartView) {
            this.chartView.updateTimelineChart(chartType);
        }
    }

    /**
     * Load initial application data
     */
    async loadInitialData() {
        try {
            // Load health metrics
            const healthData = await api.getHealth();
            this.updateHealthMetrics(healthData);

            // Load dashboard data
            await this.loadDashboardData();

            // Set default date range (last 7 days)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);

            document.getElementById('start-date').value = this.formatDateForInput(startDate);
            document.getElementById('end-date').value = this.formatDateForInput(endDate);

        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showError('Failed to load initial data. Please check your connection.');
        }
    }

    /**
     * Load data for specific view
     * @param {string} viewName - Name of the view
     */
    async loadViewData(viewName) {
        try {
            switch (viewName) {
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
                case 'heatmap':
                    await this.updateHeatmap();
                    break;
                case 'routes':
                    await this.updateRoutes();
                    break;
                case 'analytics':
                    await this.loadAnalyticsData();
                    break;
            }
        } catch (error) {
            console.error(`Failed to load data for ${viewName}:`, error);
            this.showError(`Failed to load ${viewName} data.`);
        }
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        try {
            // Load statistics
            const statsData = await api.getTripStatistics({
                ...this.filters,
                groupBy: 'hour'
            });
            
            this.data.statistics = statsData;
            
            // Update dashboard components
            if (this.dashboard) {
                this.dashboard.updateStatsCards(statsData);
                this.dashboard.updateCharts(statsData);
            }
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            throw error;
        }
    }

    /**
     * Update heatmap data
     */
    async updateHeatmap() {
        try {
            const heatmapType = document.getElementById('heatmap-type')?.value || 'intensity';
            
            const heatmapData = await api.getHeatmapData({
                ...this.filters,
                limit: 1000
            });
            
            this.data.heatmap = heatmapData;
            
            if (this.mapView) {
                this.mapView.updateHeatmap(heatmapData, heatmapType);
            }
            
        } catch (error) {
            console.error('Failed to update heatmap:', error);
            throw error;
        }
    }

    /**
     * Update routes data
     */
    async updateRoutes() {
        try {
            const limit = parseInt(document.getElementById('routes-limit')?.value) || 50;
            
            const routesData = await api.getPopularRoutes({
                ...this.filters,
                limit
            });
            
            this.data.routes = routesData;
            
            if (this.routeManager) {
                this.routeManager.updateRoutes(routesData);
            }
            
        } catch (error) {
            console.error('Failed to update routes:', error);
            throw error;
        }
    }

    /**
     * Load analytics data
     */
    async loadAnalyticsData() {
        try {
            // This would load more advanced analytics
            // For now, we'll use the same statistics data
            const analyticsData = await api.getTripStatistics({
                ...this.filters,
                groupBy: 'hour'
            });
            
            // Update analytics components
            this.updateAnalyticsComponents(analyticsData);
            
        } catch (error) {
            console.error('Failed to load analytics data:', error);
            throw error;
        }
    }

    /**
     * Apply filters and refresh data
     */
    async applyFilters() {
        try {
            this.filters = this.collectFilters();
            
            // Show loading state
            this.showLoadingState();
            
            // Reload current view data
            await this.loadViewData(this.currentView);
            
            // Hide loading state
            this.hideLoadingState();
            
            this.showSuccess('Filters applied successfully');
            
        } catch (error) {
            console.error('Failed to apply filters:', error);
            this.showError('Failed to apply filters. Please try again.');
        }
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        // Clear all filter inputs
        document.querySelectorAll('#filters-panel input, #filters-panel select').forEach(input => {
            input.value = '';
        });

        // Reset filters object
        this.filters = {};

        // Reload data
        this.applyFilters();
        
        this.showSuccess('Filters cleared');
    }

    /**
     * Collect filters from form inputs
     * @returns {Object} - Filter object
     */
    collectFilters() {
        const filters = {};

        // Date filters
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        if (startDate) filters.startDate = new Date(startDate).toISOString();
        if (endDate) filters.endDate = new Date(endDate).toISOString();

        // Other filters
        const vendorId = document.getElementById('vendor-filter').value;
        const passengerCount = document.getElementById('passenger-filter').value;
        const timeOfDay = document.getElementById('time-filter').value;
        const minDuration = document.getElementById('min-duration').value;
        const maxDuration = document.getElementById('max-duration').value;
        const minDistance = document.getElementById('min-distance').value;
        const maxDistance = document.getElementById('max-distance').value;

        if (vendorId) filters.vendorId = vendorId;
        if (passengerCount) filters.passengerCount = parseInt(passengerCount);
        if (timeOfDay) filters.pickupHour = parseInt(timeOfDay);
        if (minDuration) filters.minDuration = parseInt(minDuration) * 60; // Convert to seconds
        if (maxDuration) filters.maxDuration = parseInt(maxDuration) * 60; // Convert to seconds
        if (minDistance) filters.minDistance = parseFloat(minDistance);
        if (maxDistance) filters.maxDistance = parseFloat(maxDistance);

        return filters;
    }

    /**
     * Refresh all data
     */
    async refreshData() {
        try {
            this.showLoadingState();
            await this.loadViewData(this.currentView);
            this.hideLoadingState();
            this.showSuccess('Data refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh data:', error);
            this.showError('Failed to refresh data. Please try again.');
        }
    }

    /**
     * Update connection status
     * @param {boolean} connected - Connection status
     */
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.classList.toggle('disconnected', !connected);
            statusElement.querySelector('span').textContent = connected ? 'Connected' : 'Disconnected';
        }
    }

    /**
     * Update health metrics display
     * @param {Object} healthData - Health metrics data
     */
    updateHealthMetrics(healthData) {
        // Update stats cards with health data
        if (healthData.totalTrips) {
            document.getElementById('total-trips').textContent = healthData.totalTrips.toLocaleString();
        }
        if (healthData.avgDurationLastWeek) {
            document.getElementById('avg-duration').textContent = `${Math.round(healthData.avgDurationLastWeek / 60)} min`;
        }
        if (healthData.avgDistanceLastWeek) {
            document.getElementById('avg-distance').textContent = `${healthData.avgDistanceLastWeek.toFixed(1)} km`;
        }
    }

    /**
     * Update analytics components
     * @param {Array} analyticsData - Analytics data
     */
    updateAnalyticsComponents(analyticsData) {
        // This would update various analytics components
        // For now, we'll just log the data
        console.log('Analytics data:', analyticsData);
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        // Show full loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        // Hide full loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.showToast(message, 'error');
    }

    /**
     * Show warning message
     * @param {string} message - Warning message
     */
    showWarning(message) {
        this.showToast(message, 'warning');
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning)
     */
    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
                <span>${message}</span>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    /**
     * Format date for input field
     * @param {Date} date - Date object
     * @returns {string} - Formatted date string
     */
    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new UrbanMobilityApp();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UrbanMobilityApp;
}
