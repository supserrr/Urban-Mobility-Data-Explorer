// Dashboard Component

class Dashboard {
    constructor(app) {
        this.app = app;
        this.charts = {};
        this.init();
    }

    /**
     * Initialize dashboard component
     */
    init() {
        this.configureChartDefaults();
        this.initializeCharts();
        this.setupEventListeners();
    }

    /**
     * Configure Chart.js defaults for neo-brutalist styling
     */
    configureChartDefaults() {
        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = "'Public Sans', sans-serif";
            Chart.defaults.font.weight = 700;
            Chart.defaults.font.size = 13;
            Chart.defaults.color = '#000000';
            Chart.defaults.borderColor = '#000000';
            
            Chart.defaults.plugins.legend.labels.font = {
                family: "'Lexend Mega', sans-serif",
                weight: 900,
                size: 12
            };
            Chart.defaults.plugins.legend.labels.usePointStyle = false;
            Chart.defaults.plugins.legend.labels.boxWidth = 20;
            Chart.defaults.plugins.legend.labels.boxHeight = 20;
            Chart.defaults.plugins.legend.labels.padding = 15;
            
            Chart.defaults.plugins.tooltip.backgroundColor = '#ffffff';
            Chart.defaults.plugins.tooltip.borderColor = '#000000';
            Chart.defaults.plugins.tooltip.borderWidth = 4;
            Chart.defaults.plugins.tooltip.titleColor = '#000000';
            Chart.defaults.plugins.tooltip.bodyColor = '#000000';
            Chart.defaults.plugins.tooltip.padding = 16;
            Chart.defaults.plugins.tooltip.cornerRadius = 0;
            Chart.defaults.plugins.tooltip.displayColors = true;
            Chart.defaults.plugins.tooltip.titleFont = {
                family: "'Lexend Mega', sans-serif",
                weight: 900,
                size: 14
            };
            Chart.defaults.plugins.tooltip.bodyFont = {
                family: "'Public Sans', sans-serif",
                weight: 700,
                size: 13
            };
            
            Chart.defaults.elements.bar.borderWidth = 3;
            Chart.defaults.elements.line.borderWidth = 4;
            Chart.defaults.elements.point.radius = 0;
            Chart.defaults.elements.point.hoverRadius = 6;
            Chart.defaults.elements.point.borderWidth = 3;
            
            Chart.defaults.scale.grid.color = '#cccccc';
            Chart.defaults.scale.grid.lineWidth = 2;
            Chart.defaults.scale.border.width = 3;
            Chart.defaults.scale.border.color = '#000000';
            Chart.defaults.scale.ticks.font = {
                family: "'Public Sans', sans-serif",
                weight: 700,
                size: 12
            };
            Chart.defaults.scale.title.font = {
                family: "'Lexend Mega', sans-serif",
                weight: 900,
                size: 12
            };
        }
    }

    /**
     * Initialize Chart.js charts
     */
    initializeCharts() {
        // Timeline chart (trips by hour/day/month)
        this.initTimelineChart();
        
        // Passenger distribution chart
        this.initPassengerChart();
        
        // Duration distribution chart
        this.initDurationChart();
        
        // Distance vs Speed chart
        this.initDistanceSpeedChart();
    }

    /**
     * Initialize timeline chart
     */
    initTimelineChart() {
        const ctx = document.getElementById('trip-timeline-chart');
        if (!ctx) return;

        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Trips',
                    data: [],
                    borderColor: '#000000',
                    backgroundColor: 'rgba(0, 119, 182, 0.7)',
                    borderWidth: 4,
                    fill: true,
                    tension: 0,
                    pointStyle: 'rect',
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointBorderWidth: 3,
                    pointBackgroundColor: '#0077b6',
                    pointBorderColor: '#000000',
                    stepped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'TIME PERIOD',
                            padding: { top: 10 }
                        },
                        grid: {
                            color: '#dddddd',
                            lineWidth: 2,
                            drawBorder: true,
                            borderWidth: 3,
                            borderColor: '#000000'
                        },
                        ticks: {
                            maxRotation: 0,
                            minRotation: 0,
                            padding: 8
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'NUMBER OF TRIPS',
                            padding: { bottom: 10 }
                        },
                        beginAtZero: true,
                        grid: {
                            color: '#dddddd',
                            lineWidth: 2,
                            drawBorder: true,
                            borderWidth: 3,
                            borderColor: '#000000'
                        },
                        ticks: {
                            padding: 8
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    /**
     * Initialize passenger distribution chart
     */
    initPassengerChart() {
        const ctx = document.getElementById('passenger-chart');
        if (!ctx) return;

        this.charts.passenger = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['1 PASSENGER', '2 PASSENGERS', '3 PASSENGERS', '4 PASSENGERS', '5 PASSENGERS', '6 PASSENGERS'],
                datasets: [{
                    data: [0, 0, 0, 0, 0, 0],
                    backgroundColor: [
                        '#0077b6',
                        '#40d39c',
                        '#ff5733',
                        '#ffe600',
                        '#000000',
                        '#dc341e'
                    ],
                    borderColor: '#000000',
                    borderWidth: 4,
                    spacing: 0,
                    borderRadius: 0,
                    offset: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '50%',
                radius: '90%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: false,
                            boxWidth: 20,
                            boxHeight: 20,
                            font: {
                                family: "'Public Sans', sans-serif",
                                weight: 700,
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Initialize duration distribution chart
     */
    initDurationChart() {
        const ctx = document.getElementById('duration-chart');
        if (!ctx) return;

        this.charts.duration = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['0-5 MIN', '5-10 MIN', '10-15 MIN', '15-20 MIN', '20-30 MIN', '30+ MIN'],
                datasets: [{
                    label: 'TRIPS',
                    data: [0, 0, 0, 0, 0, 0],
                    backgroundColor: '#40d39c',
                    borderColor: '#000000',
                    borderWidth: 4,
                    borderRadius: 0,
                    borderSkipped: false,
                    barPercentage: 0.85,
                    categoryPercentage: 0.9
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'TRIP DURATION',
                            padding: { top: 10 }
                        },
                        grid: {
                            color: '#dddddd',
                            lineWidth: 2,
                            drawBorder: true,
                            borderWidth: 3,
                            borderColor: '#000000',
                            display: false
                        },
                        ticks: {
                            padding: 8
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'NUMBER OF TRIPS',
                            padding: { bottom: 10 }
                        },
                        beginAtZero: true,
                        grid: {
                            color: '#dddddd',
                            lineWidth: 2,
                            drawBorder: true,
                            borderWidth: 3,
                            borderColor: '#000000'
                        },
                        ticks: {
                            padding: 8
                        }
                    }
                }
            }
        });
    }

    /**
     * Initialize distance vs speed chart
     */
    initDistanceSpeedChart() {
        const ctx = document.getElementById('distance-speed-chart');
        if (!ctx) return;

        this.charts.distanceSpeed = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'TRIPS',
                    data: [],
                    backgroundColor: '#ff5733',
                    borderColor: '#000000',
                    borderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointStyle: 'rect'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'DISTANCE (KM)',
                            padding: { top: 10 }
                        },
                        beginAtZero: true,
                        grid: {
                            color: '#dddddd',
                            lineWidth: 2,
                            drawBorder: true,
                            borderWidth: 3,
                            borderColor: '#000000'
                        },
                        ticks: {
                            padding: 8
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'SPEED (KM/H)',
                            padding: { bottom: 10 }
                        },
                        beginAtZero: true,
                        grid: {
                            color: '#dddddd',
                            lineWidth: 2,
                            drawBorder: true,
                            borderWidth: 3,
                            borderColor: '#000000'
                        },
                        ticks: {
                            padding: 8
                        }
                    }
                },
                interaction: {
                    intersect: false
                }
            }
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Chart control buttons
        document.querySelectorAll('.chart-control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartType = e.currentTarget.dataset.chart;
                this.updateTimelineChart(chartType);
            });
        });
    }

    /**
     * Update stats cards with data
     * @param {Array} statistics - Statistics data
     */
    updateStatsCards(statistics) {
        if (!statistics || statistics.length === 0) return;

        // Calculate totals
        const totals = statistics.reduce((acc, stat) => {
            acc.totalTrips += stat.trip_count || 0;
            acc.totalPassengers += stat.total_passengers || 0;
            acc.totalDuration += (stat.avg_duration || 0) * (stat.trip_count || 0);
            acc.totalDistance += (stat.avg_distance || 0) * (stat.trip_count || 0);
            return acc;
        }, {
            totalTrips: 0,
            totalPassengers: 0,
            totalDuration: 0,
            totalDistance: 0
        });

        // Update total trips
        const totalTripsElement = document.getElementById('total-trips');
        if (totalTripsElement) {
            totalTripsElement.textContent = totals.totalTrips.toLocaleString();
        }

        // Update average duration
        const avgDuration = totals.totalTrips > 0 ? totals.totalDuration / totals.totalTrips : 0;
        const avgDurationElement = document.getElementById('avg-duration');
        if (avgDurationElement) {
            avgDurationElement.textContent = `${Math.round(avgDuration / 60)} min`;
        }

        // Update average distance
        const avgDistance = totals.totalTrips > 0 ? totals.totalDistance / totals.totalTrips : 0;
        const avgDistanceElement = document.getElementById('avg-distance');
        if (avgDistanceElement) {
            avgDistanceElement.textContent = `${avgDistance.toFixed(1)} km`;
        }

        // Update total passengers
        const totalPassengersElement = document.getElementById('total-passengers');
        if (totalPassengersElement) {
            totalPassengersElement.textContent = totals.totalPassengers.toLocaleString();
        }
    }

    /**
     * Update all charts with data
     * @param {Array} statistics - Statistics data
     */
    updateCharts(statistics) {
        this.updateTimelineChart('hour', statistics);
        this.updatePassengerChart(statistics);
        this.updateDurationChart(statistics);
        this.updateDistanceSpeedChart(statistics);
    }

    /**
     * Update timeline chart
     * @param {string} chartType - Type of chart (hour, day, month)
     * @param {Array} statistics - Statistics data
     */
    updateTimelineChart(chartType = 'hour', statistics = null) {
        if (!this.charts.timeline) return;

        const data = statistics || this.app.data.statistics;
        if (!data || data.length === 0) return;

        // Update button states
        document.querySelectorAll('.chart-control-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.chart === chartType) {
                btn.classList.add('active');
            }
        });

        // Process data based on chart type
        let labels, chartData;
        
        switch (chartType) {
            case 'hour':
                labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
                chartData = Array(24).fill(0);
                data.forEach(stat => {
                    if (stat.pickup_hour !== undefined) {
                        chartData[stat.pickup_hour] = stat.trip_count || 0;
                    }
                });
                break;
                
            case 'day':
                labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                chartData = Array(7).fill(0);
                data.forEach(stat => {
                    if (stat.pickup_day_of_week !== undefined) {
                        chartData[stat.pickup_day_of_week] = stat.trip_count || 0;
                    }
                });
                break;
                
            case 'month':
                labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                chartData = Array(12).fill(0);
                data.forEach(stat => {
                    if (stat.pickup_month !== undefined) {
                        chartData[stat.pickup_month - 1] = stat.trip_count || 0;
                    }
                });
                break;
        }

        // Update chart
        this.charts.timeline.data.labels = labels;
        this.charts.timeline.data.datasets[0].data = chartData;
        this.charts.timeline.update();
    }

    /**
     * Update passenger distribution chart
     * @param {Array} statistics - Statistics data
     */
    async updatePassengerChart(statistics) {
        if (!this.charts.passenger) return;

        try {
            // Fetch real passenger distribution from API
            const filters = this.app.filters || {};
            const result = await api.getPassengerDistribution(filters);

            if (result.success && result.data) {
                // Convert API data to chart format
                const passengerCounts = [0, 0, 0, 0, 0, 0]; // 1-6 passengers
                
                result.data.forEach(item => {
                    const passengerCount = parseInt(item.passenger_count);
                    const tripCount = parseInt(item.trip_count);
                    
                    if (passengerCount >= 1 && passengerCount <= 6) {
                        passengerCounts[passengerCount - 1] = tripCount;
                    }
                });

                this.charts.passenger.data.datasets[0].data = passengerCounts;
                this.charts.passenger.update();
            }
        } catch (error) {
            logger.error('Error updating passenger chart:', error);
        }
    }

    /**
     * Update duration distribution chart
     * @param {Array} statistics - Statistics data
     */
    async updateDurationChart(statistics) {
        if (!this.charts.duration) return;

        try {
            // Fetch real duration distribution from API
            const filters = this.app.filters || {};
            const result = await api.getDurationDistribution(filters);

            if (result.success && result.data) {
                // Map bucket names to array indices
                const bucketMap = {
                    '0-5': 0,
                    '5-10': 1,
                    '10-15': 2,
                    '15-20': 3,
                    '20-30': 4,
                    '30+': 5
                };

                const durationBuckets = [0, 0, 0, 0, 0, 0];
                
                result.data.forEach(item => {
                    const bucketIndex = bucketMap[item.duration_bucket];
                    if (bucketIndex !== undefined) {
                        durationBuckets[bucketIndex] = parseInt(item.trip_count);
                    }
                });

                this.charts.duration.data.datasets[0].data = durationBuckets;
                this.charts.duration.update();
            }
        } catch (error) {
            logger.error('Error updating duration chart:', error);
        }
    }

    /**
     * Update distance vs speed chart
     * @param {Array} statistics - Statistics data
     */
    updateDistanceSpeedChart(statistics) {
        if (!this.charts.distanceSpeed) return;

        // Generate scatter plot data
        const scatterData = [];
        
        statistics.forEach(stat => {
            if (stat.avg_distance && stat.avg_speed) {
                scatterData.push({
                    x: stat.avg_distance,
                    y: stat.avg_speed
                });
            }
        });

        this.charts.distanceSpeed.data.datasets[0].data = scatterData;
        this.charts.distanceSpeed.update();
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
    module.exports = Dashboard;
}
