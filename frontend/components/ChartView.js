// ChartView Component

class ChartView {
    constructor(app) {
        this.app = app;
        this.charts = {};
        this.init();
    }

    /**
     * Initialize chart view component
     */
    init() {
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Chart type switching
        document.querySelectorAll('.chart-control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartType = e.currentTarget.dataset.chart;
                this.updateTimelineChart(chartType);
            });
        });
    }

    /**
     * Update timeline chart with new data
     * @param {string} chartType - Type of chart (hour, day, month)
     * @param {Array} statistics - Statistics data
     */
    updateTimelineChart(chartType = 'hour', statistics = null) {
        const data = statistics || this.app.data.statistics;
        if (!data || data.length === 0) return;

        // Update button states
        document.querySelectorAll('.chart-control-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.chart === chartType) {
                btn.classList.add('active');
            }
        });

        // Get chart instance from dashboard
        if (this.app.dashboard && this.app.dashboard.charts.timeline) {
            this.app.dashboard.updateTimelineChart(chartType, data);
        }
    }

    /**
     * Create advanced analytics chart
     * @param {string} chartId - Chart container ID
     * @param {string} chartType - Type of chart
     * @param {Object} data - Chart data
     * @param {Object} options - Chart options
     */
    createChart(chartId, chartType, data, options = {}) {
        const canvas = document.getElementById(chartId);
        if (!canvas) return null;

        // Destroy existing chart if it exists
        if (this.charts[chartId]) {
            this.charts[chartId].destroy();
        }

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    display: true
                },
                y: {
                    display: true,
                    beginAtZero: true
                }
            }
        };

        const chartOptions = { ...defaultOptions, ...options };

        this.charts[chartId] = new Chart(canvas, {
            type: chartType,
            data: data,
            options: chartOptions
        });

        return this.charts[chartId];
    }

    /**
     * Create correlation matrix chart
     * @param {Array} data - Correlation data
     */
    async createCorrelationMatrix(data) {
        const container = document.getElementById('correlation-matrix');
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        // Create correlation matrix visualization
        const matrixData = await this.prepareCorrelationData(data);
        
        // Create heatmap-like visualization
        const table = document.createElement('table');
        table.className = 'correlation-matrix';

        // Create header row
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th></th>';
        matrixData.labels.forEach(label => {
            const th = document.createElement('th');
            th.textContent = label;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        // Create data rows
        matrixData.labels.forEach((label, i) => {
            const row = document.createElement('tr');
            const labelCell = document.createElement('td');
            labelCell.textContent = label;
            labelCell.className = 'label-cell';
            row.appendChild(labelCell);

            matrixData.labels.forEach((_, j) => {
                const cell = document.createElement('td');
                const value = matrixData.matrix[i][j];
                cell.textContent = value.toFixed(2);
                cell.className = 'correlation-cell';
                
                // Color based on correlation strength
                const absValue = Math.abs(value);
                if (absValue > 0.7) {
                    cell.classList.add('strong-correlation');
                } else if (absValue > 0.4) {
                    cell.classList.add('moderate-correlation');
                } else if (absValue > 0.2) {
                    cell.classList.add('weak-correlation');
                } else {
                    cell.classList.add('no-correlation');
                }

                // Color based on positive/negative
                if (value > 0) {
                    cell.classList.add('positive');
                } else if (value < 0) {
                    cell.classList.add('negative');
                }

                row.appendChild(cell);
            });

            table.appendChild(row);
        });

        container.appendChild(table);
    }

    /**
     * Prepare correlation data for visualization
     * @param {Array} data - Raw data
     * @returns {Promise<Object>} - Formatted correlation data
     */
    async prepareCorrelationData(data) {
        try {
            // Fetch real correlation data from API
            const filters = this.app.filters || {};
            const result = await api.getCorrelationData(filters);

            if (result.success && result.data) {
                return result.data;
            }

            // Return default identity matrix if no data
            return {
                labels: ['Duration', 'Distance', 'Speed', 'Passengers'],
                matrix: [
                    [1.00, 0, 0, 0],
                    [0, 1.00, 0, 0],
                    [0, 0, 1.00, 0],
                    [0, 0, 0, 1.00]
                ]
            };
        } catch (error) {
            logger.error('Error fetching correlation data:', error);
            
            // Return default identity matrix on error
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
    }

    /**
     * Create trend analysis chart
     * @param {Array} data - Trend data
     */
    createTrendAnalysis(data) {
        const container = document.getElementById('trend-analysis');
        if (!container) return;

        // Prepare trend data
        const trendData = this.prepareTrendData(data);
        
        // Create trend chart
        const chartData = {
            labels: trendData.labels,
            datasets: [
                {
                    label: 'Trip Count',
                    data: trendData.tripCount,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Avg Duration',
                    data: trendData.avgDuration,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                },
                {
                    label: 'Avg Distance',
                    data: trendData.avgDistance,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y2'
                }
            ]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Time Period'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Trip Count'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Duration (minutes)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                },
                y2: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Distance (km)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        };

        this.createChart('trend-analysis-chart', 'line', chartData, options);
    }

    /**
     * Prepare trend data for visualization
     * @param {Array} data - Raw data
     * @returns {Object} - Formatted trend data
     */
    prepareTrendData(data) {
        if (!data || data.length === 0) {
            return {
                labels: [],
                tripCount: [],
                avgDuration: [],
                avgDistance: []
            };
        }

        const labels = data.map(item => {
            if (item.pickup_hour !== undefined) {
                return `${item.pickup_hour}:00`;
            } else if (item.pickup_day_of_week !== undefined) {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                return days[item.pickup_day_of_week];
            } else if (item.pickup_month !== undefined) {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return months[item.pickup_month - 1];
            }
            return 'Unknown';
        });

        const tripCount = data.map(item => item.trip_count || 0);
        const avgDuration = data.map(item => (item.avg_duration || 0) / 60); // Convert to minutes
        const avgDistance = data.map(item => item.avg_distance || 0);

        return {
            labels: labels,
            tripCount: tripCount,
            avgDuration: avgDuration,
            avgDistance: avgDistance
        };
    }

    /**
     * Create performance metrics visualization
     * @param {Array} data - Performance data
     */
    createPerformanceMetrics(data) {
        const container = document.getElementById('performance-metrics');
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        // Calculate performance metrics
        const metrics = this.calculatePerformanceMetrics(data);

        // Create metrics cards
        Object.entries(metrics).forEach(([key, value]) => {
            const card = document.createElement('div');
            card.className = 'metric-card';
            
            card.innerHTML = `
                <div class="metric-header">
                    <h4>${this.formatMetricName(key)}</h4>
                    <span class="metric-value">${this.formatMetricValue(key, value)}</span>
                </div>
                <div class="metric-bar">
                    <div class="metric-progress" style="width: ${Math.min(value * 100, 100)}%"></div>
                </div>
            `;

            container.appendChild(card);
        });
    }

    /**
     * Calculate performance metrics from data
     * @param {Array} data - Raw data
     * @returns {Object} - Performance metrics
     */
    calculatePerformanceMetrics(data) {
        if (!data || data.length === 0) {
            return {
                efficiency: 0,
                utilization: 0,
                reliability: 0,
                performance: 0
            };
        }

        // Calculate various performance metrics
        const totalTrips = data.reduce((sum, item) => sum + (item.trip_count || 0), 0);
        const totalDuration = data.reduce((sum, item) => sum + ((item.avg_duration || 0) * (item.trip_count || 0)), 0);
        const totalDistance = data.reduce((sum, item) => sum + ((item.avg_distance || 0) * (item.trip_count || 0)), 0);

        const avgDuration = totalTrips > 0 ? totalDuration / totalTrips : 0;
        const avgDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;
        const avgSpeed = avgDuration > 0 ? (avgDistance / (avgDuration / 3600)) : 0;

        // Calculate performance indicators (normalized 0-1)
        const efficiency = Math.min(avgSpeed / 30, 1); // Target: 30 km/h
        const utilization = Math.min(totalTrips / 1000, 1); // Target: 1000 trips per period
        const reliability = Math.min(avgDistance / 5, 1); // Target: 5 km average distance
        const performance = (efficiency + utilization + reliability) / 3;

        return {
            efficiency: efficiency,
            utilization: utilization,
            reliability: reliability,
            performance: performance
        };
    }

    /**
     * Format metric name for display
     * @param {string} key - Metric key
     * @returns {string} - Formatted name
     */
    formatMetricName(key) {
        const names = {
            efficiency: 'System Efficiency',
            utilization: 'Resource Utilization',
            reliability: 'Service Reliability',
            performance: 'Overall Performance'
        };
        return names[key] || key;
    }

    /**
     * Format metric value for display
     * @param {string} key - Metric key
     * @param {number} value - Metric value
     * @returns {string} - Formatted value
     */
    formatMetricValue(key, value) {
        if (key === 'performance' || key === 'efficiency' || key === 'utilization' || key === 'reliability') {
            return `${Math.round(value * 100)}%`;
        }
        return value.toString();
    }

    /**
     * Create comparison chart
     * @param {Array} data1 - First dataset
     * @param {Array} data2 - Second dataset
     * @param {string} chartId - Chart container ID
     */
    createComparisonChart(data1, data2, chartId) {
        const chartData = {
            labels: data1.map((_, index) => `Period ${index + 1}`),
            datasets: [
                {
                    label: 'Dataset 1',
                    data: data1,
                    backgroundColor: 'rgba(37, 99, 235, 0.8)',
                    borderColor: '#2563eb',
                    borderWidth: 1
                },
                {
                    label: 'Dataset 2',
                    data: data2,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10b981',
                    borderWidth: 1
                }
            ]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    display: true
                },
                y: {
                    display: true,
                    beginAtZero: true
                }
            }
        };

        this.createChart(chartId, 'bar', chartData, options);
    }

    /**
     * Export chart as image
     * @param {string} chartId - Chart ID
     * @param {string} filename - Export filename
     */
    exportChart(chartId, filename = 'chart.png') {
        const chart = this.charts[chartId];
        if (!chart) {
            console.error(`Chart ${chartId} not found`);
            return;
        }

        const url = chart.toBase64Image();
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
    }

    /**
     * Update all charts with new data
     * @param {Array} statistics - Statistics data
     */
    updateAllCharts(statistics) {
        this.createTrendAnalysis(statistics);
        this.createPerformanceMetrics(statistics);
        this.createCorrelationMatrix(statistics);
    }

    /**
     * Destroy all charts
     */
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartView;
}
