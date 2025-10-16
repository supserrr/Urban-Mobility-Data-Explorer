// Urban Mobility Insights Explorer

class UrbanMobilityInsights {
    constructor(app) {
        this.app = app;
        this.currentData = [];
        this.insights = [];
        this.patterns = {};
        this.init();
    }

    /**
     * Initialize the insights explorer
     */
    init() {
        this.createUI();
        this.setupEventListeners();
        this.loadInitialData();
    }

    /**
     * Create the beautiful insights interface
     */
    createUI() {
        const container = document.getElementById('custom-algorithm-container');
        if (!container) return;

        container.innerHTML = `
            <div class="explorer-header">
                <h2>URBAN MOBILITY INSIGHTS</h2>
                <p class="explorer-subtitle">DISCOVER PATTERNS AND TRENDS IN NYC TAXI DATA</p>
            </div>

            <div class="insights-explorer">
                <div class="analysis-controls">
                    <div class="control-group">
                        <label for="analysis-scope">Analysis Scope:</label>
                        <select id="analysis-scope">
                            <option value="peak_hours">Peak Hour Analysis</option>
                            <option value="distance_patterns">Distance Patterns</option>
                            <option value="vendor_comparison">Vendor Performance</option>
                            <option value="quality_insights">Data Quality Insights</option>
                            <option value="temporal_trends">Temporal Trends</option>
                            <option value="geographic_analysis">Geographic Analysis</option>
                            <option value="passenger_patterns">Passenger Patterns</option>
                            <option value="speed_analysis">Speed Analysis</option>
                            <option value="weekend_vs_weekday">Weekend vs Weekday</option>
                            <option value="suburban_trips">Suburban Trips</option>
                        </select>
                    </div>

                    <div id="dynamic-controls">
                        <!-- Dynamic controls will be inserted here based on analysis scope -->
                    </div>

                    <button id="discover-insights-btn" class="insight-btn">
                        DISCOVER INSIGHTS
                    </button>
                </div>

                <div class="insights-results" id="insights-results" style="display: none;">
                    <div class="insights-header">
                        <h3 id="results-title">ANALYSIS RESULTS</h3>
                        <div class="analysis-status" id="analysis-status">
                            <span class="status-text">READY</span>
                        </div>
                    </div>

                    <div id="results-content">
                        <!-- Dynamic content will be inserted here based on analysis scope -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Discover insights button
        document.getElementById('discover-insights-btn')?.addEventListener('click', () => {
            this.discoverInsights();
        });

        // Analysis scope change - update dynamic controls
        document.getElementById('analysis-scope')?.addEventListener('change', (e) => {
            this.updateDynamicControls(e.target.value);
        });

        // Initialize with default scope
        this.updateDynamicControls('peak_hours');
    }

    /**
     * Update dynamic controls based on selected analysis scope
     */
    updateDynamicControls(scope) {
        const container = document.getElementById('dynamic-controls');
        if (!container) return;

        let controlsHTML = '';

        switch (scope) {
            case 'peak_hours':
                controlsHTML = `
                    <div class="control-group">
                        <label for="time-focus">Time Focus:</label>
                        <select id="time-focus">
                            <option value="all_day">All Day</option>
                            <option value="morning_rush">Morning Rush (6-10 AM)</option>
                            <option value="evening_rush">Evening Rush (4-8 PM)</option>
                            <option value="business_hours">Business Hours (9 AM-5 PM)</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="dataset-size">Sample Size:</label>
                        <select id="dataset-size">
                            <option value="5000">5,000 trips</option>
                            <option value="10000" selected>10,000 trips</option>
                            <option value="25000">25,000 trips</option>
                        </select>
                    </div>
                `;
                break;

            case 'distance_patterns':
                controlsHTML = `
                    <div class="control-group">
                        <label for="distance-range">Distance Range:</label>
                        <select id="distance-range">
                            <option value="all">All Distances</option>
                            <option value="short">Short Trips (0-5 km)</option>
                            <option value="medium">Medium Trips (5-15 km)</option>
                            <option value="long">Long Trips (15+ km)</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="route-type">Route Type:</label>
                        <select id="route-type">
                            <option value="all">All Routes</option>
                            <option value="urban">Urban (Manhattan)</option>
                            <option value="suburban">Suburban (Outer Boroughs)</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="dataset-size">Sample Size:</label>
                        <select id="dataset-size">
                            <option value="10000">10,000 trips</option>
                            <option value="25000" selected>25,000 trips</option>
                            <option value="50000">50,000 trips</option>
                        </select>
                    </div>
                `;
                break;

            case 'vendor_comparison':
                controlsHTML = `
                    <div class="control-group">
                        <label for="comparison-metric">Compare By:</label>
                        <select id="comparison-metric">
                            <option value="trips">Trip Volume</option>
                            <option value="distance">Average Distance</option>
                            <option value="duration">Average Duration</option>
                            <option value="efficiency">Efficiency</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="time-period">Time Period:</label>
                        <select id="time-period">
                            <option value="all_day">All Day</option>
                            <option value="peak_hours">Peak Hours Only</option>
                            <option value="off_peak">Off-Peak Hours</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="dataset-size">Sample Size:</label>
                        <select id="dataset-size">
                            <option value="5000">5,000 trips</option>
                            <option value="10000" selected>10,000 trips</option>
                            <option value="20000">20,000 trips</option>
                        </select>
                    </div>
                `;
                break;

            case 'quality_insights':
                controlsHTML = `
                    <div class="control-group">
                        <label for="quality-threshold">Quality Threshold:</label>
                        <select id="quality-threshold">
                            <option value="all">All Quality Levels</option>
                            <option value="high">High Quality (80+)</option>
                            <option value="medium">Medium Quality (60-79)</option>
                            <option value="low">Low Quality (below 60)</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="data-category">Data Category:</label>
                        <select id="data-category">
                            <option value="all">All Categories</option>
                            <option value="valid_complete">Valid Complete</option>
                            <option value="micro_trip">Micro Trips</option>
                            <option value="suburban_trip">Suburban Trips</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="dataset-size">Sample Size:</label>
                        <select id="dataset-size">
                            <option value="10000">10,000 trips</option>
                            <option value="25000" selected>25,000 trips</option>
                            <option value="50000">50,000 trips</option>
                        </select>
                    </div>
                `;
                break;

            case 'temporal_trends':
                controlsHTML = `
                    <div class="control-group">
                        <label for="trend-view">Trend View:</label>
                        <select id="trend-view">
                            <option value="hourly">Hourly Breakdown</option>
                            <option value="period">By Time Period</option>
                            <option value="rush_vs_normal">Rush vs Normal Hours</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="borough-focus">Borough Focus:</label>
                        <select id="borough-focus">
                            <option value="all">All Boroughs</option>
                            <option value="manhattan">Manhattan</option>
                            <option value="brooklyn">Brooklyn</option>
                            <option value="queens">Queens</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="dataset-size">Sample Size:</label>
                        <select id="dataset-size">
                            <option value="10000">10,000 trips</option>
                            <option value="25000" selected>25,000 trips</option>
                            <option value="50000">50,000 trips</option>
                        </select>
                    </div>
                `;
                break;

            case 'geographic_analysis':
                controlsHTML = `
                    <div class="control-group">
                        <label for="geo-focus">Geographic Focus:</label>
                        <select id="geo-focus">
                            <option value="pickup_locations">Pickup Locations</option>
                            <option value="dropoff_locations">Dropoff Locations</option>
                            <option value="borough_flow">Borough Flow</option>
                            <option value="inter_borough">Inter-Borough Trips</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="map_region">Region:</label>
                        <select id="map_region">
                            <option value="nyc_only">NYC Only</option>
                            <option value="including_suburbs">Including Suburbs</option>
                            <option value="manhattan_focus">Manhattan Focus</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="dataset-size">Sample Size:</label>
                        <select id="dataset-size">
                            <option value="5000">5,000 trips</option>
                            <option value="10000" selected>10,000 trips</option>
                            <option value="25000">25,000 trips</option>
                        </select>
                    </div>
                `;
                break;

            case 'passenger_patterns':
                controlsHTML = `
                    <div class="control-group">
                        <label for="passenger-focus">Passenger Focus:</label>
                        <select id="passenger-focus">
                            <option value="capacity_analysis">Capacity Analysis</option>
                            <option value="solo_vs_group">Solo vs Group Travel</option>
                            <option value="peak_passenger_hours">Peak Passenger Hours</option>
                            <option value="distance_by_passengers">Distance by Passengers</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="time-period">Time Period:</label>
                        <select id="time-period">
                            <option value="all_day">All Day</option>
                            <option value="rush_hours">Rush Hours</option>
                            <option value="business_hours">Business Hours</option>
                            <option value="weekend">Weekend Only</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="dataset-size">Sample Size:</label>
                        <select id="dataset-size">
                            <option value="10000">10,000 trips</option>
                            <option value="25000" selected>25,000 trips</option>
                            <option value="50000">50,000 trips</option>
                        </select>
                    </div>
                `;
                break;

            case 'speed_analysis':
                controlsHTML = `
                    <div class="control-group">
                        <label for="speed-focus">Speed Focus:</label>
                        <select id="speed-focus">
                            <option value="speed_distribution">Speed Distribution</option>
                            <option value="efficient_routes">Efficient Routes</option>
                            <option value="traffic_patterns">Traffic Patterns</option>
                            <option value="time_vs_distance">Time vs Distance</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="speed-range">Speed Range:</label>
                        <select id="speed-range">
                            <option value="all_speeds">All Speeds</option>
                            <option value="slow_traffic">Slow Traffic (0-15 km/h)</option>
                            <option value="normal_speed">Normal Speed (15-30 km/h)</option>
                            <option value="fast_routes">Fast Routes (30+ km/h)</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="dataset-size">Sample Size:</label>
                        <select id="dataset-size">
                            <option value="10000">10,000 trips</option>
                            <option value="25000" selected>25,000 trips</option>
                            <option value="50000">50,000 trips</option>
                        </select>
                    </div>
                `;
                break;

            case 'weekend_vs_weekday':
                controlsHTML = `
                    <div class="control-group">
                        <label for="day-comparison">Day Comparison:</label>
                        <select id="day-comparison">
                            <option value="weekend_vs_weekday">Weekend vs Weekday</option>
                            <option value="monday_vs_friday">Monday vs Friday</option>
                            <option value="sunday_vs_saturday">Sunday vs Saturday</option>
                            <option value="all_days">All Days Breakdown</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="metric-focus">Metric Focus:</label>
                        <select id="metric-focus">
                            <option value="trip_volume">Trip Volume</option>
                            <option value="avg_distance">Average Distance</option>
                            <option value="avg_duration">Average Duration</option>
                            <option value="peak_hours">Peak Hours</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="dataset-size">Sample Size:</label>
                        <select id="dataset-size">
                            <option value="15000">15,000 trips</option>
                            <option value="30000" selected>30,000 trips</option>
                            <option value="60000">60,000 trips</option>
                        </select>
                    </div>
                `;
                break;

            case 'suburban_trips':
                controlsHTML = `
                    <div class="control-group">
                        <label for="suburban-focus">Suburban Focus:</label>
                        <select id="suburban-focus">
                            <option value="destinations">Popular Destinations</option>
                            <option value="distance_analysis">Distance Analysis</option>
                            <option value="time_patterns">Time Patterns</option>
                            <option value="cost_analysis">Cost Analysis</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="destination-region">Destination Region:</label>
                        <select id="destination-region">
                            <option value="all_regions">All Regions</option>
                            <option value="north">North (CT/Westchester)</option>
                            <option value="south">South (NJ)</option>
                            <option value="east">East (Long Island)</option>
                            <option value="west">West (NJ)</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="dataset-size">Sample Size:</label>
                        <select id="dataset-size">
                            <option value="5000">5,000 trips</option>
                            <option value="10000" selected>10,000 trips</option>
                            <option value="20000">20,000 trips</option>
                        </select>
                    </div>
                `;
                break;
        }

        container.innerHTML = controlsHTML;
    }

    /**
     * Load initial data to show the interface is working
     */
    async loadInitialData() {
        try {
            const data = await api.getTrips({}, { limit: 100 });
            this.currentData = data.data || [];
            console.log('Loaded initial data for custom algorithm analysis');
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    /**
     * Discover meaningful insights from the data
     */
    async discoverInsights() {
        const statusElement = document.getElementById('analysis-status');
        const button = document.getElementById('discover-insights-btn');
        const resultsSection = document.getElementById('insights-results');
        
        // Show the results section
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }
        
        if (statusElement) {
            statusElement.innerHTML = '<span class="status-text">ANALYZING...</span>';
        }
        
        if (button) {
            button.disabled = true;
            button.textContent = 'ANALYZING...';
        }

        try {
            // Get analysis parameters
            const analysisScope = document.getElementById('analysis-scope')?.value || 'peak_hours';
            
            // Collect ALL dynamic filter values based on current scope
            const filters = this.collectAllFilters(analysisScope);
            
            const datasetSize = filters.datasetSize || '10000';

            // Map analysis scope to sort criteria
            const scopeMapping = {
                'peak_hours': 'pickup_datetime,trip_duration,distance_km',
                'distance_patterns': 'distance_km,speed_kmh,data_quality_score',
                'vendor_comparison': 'vendor_name,trip_duration,distance_km',
                'quality_insights': 'data_quality_score,distance_km,pickup_datetime',
                'temporal_trends': 'pickup_datetime,distance_km,speed_kmh',
                'geographic_analysis': 'pickup_latitude,pickup_longitude,distance_km',
                'passenger_patterns': 'passenger_count,distance_km,trip_duration',
                'speed_analysis': 'speed_kmh,distance_km,trip_duration',
                'weekend_vs_weekday': 'pickup_datetime,passenger_count,distance_km',
                'suburban_trips': 'distance_km,pickup_latitude,dropoff_latitude'
            };

            // Build query parameters with time filters if applicable
            const params = {
                limit: datasetSize,
                sortCriteria: scopeMapping[analysisScope],
                sortOrder: 'asc'
            };

            console.log('Discovering insights with filters:', filters);
            const result = await api.getTripsAdvanced(params);
            console.log('Insights discovered:', result.data?.length, 'trips');

            // Analyze and present insights with complete filter context
            this.analyzeAndPresentInsights(result, analysisScope, filters);

            if (statusElement) {
                statusElement.innerHTML = '<span class="status-text success">COMPLETE</span>';
            }

        } catch (error) {
            console.error('Insight discovery error:', error);
            
            if (statusElement) {
                statusElement.innerHTML = '<span class="status-text error">FAILED</span>';
            }
            
            alert('Error discovering insights: ' + error.message);
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = 'DISCOVER INSIGHTS';
            }
        }
    }

    /**
     * Collect all filter values from dynamic controls
     */
    collectAllFilters(scope) {
        const filters = {
            scope: scope,
            datasetSize: document.getElementById('dataset-size')?.value || '10000'
        };

        // Collect scope-specific filters
        switch (scope) {
            case 'peak_hours':
                filters.timeFocus = document.getElementById('time-focus')?.value || 'all_day';
                break;
            case 'distance_patterns':
                filters.distanceRange = document.getElementById('distance-range')?.value || 'all';
                filters.routeType = document.getElementById('route-type')?.value || 'all';
                break;
            case 'vendor_comparison':
                filters.comparisonMetric = document.getElementById('comparison-metric')?.value || 'trips';
                filters.timePeriod = document.getElementById('time-period')?.value || 'all_day';
                break;
            case 'quality_insights':
                filters.qualityThreshold = document.getElementById('quality-threshold')?.value || 'all';
                filters.dataCategory = document.getElementById('data-category')?.value || 'all';
                break;
            case 'temporal_trends':
                filters.trendView = document.getElementById('trend-view')?.value || 'hourly';
                filters.boroughFocus = document.getElementById('borough-focus')?.value || 'all';
                break;
            case 'geographic_analysis':
                filters.geoFocus = document.getElementById('geo-focus')?.value || 'pickup_locations';
                filters.mapRegion = document.getElementById('map_region')?.value || 'nyc_only';
                break;
            case 'passenger_patterns':
                filters.passengerFocus = document.getElementById('passenger-focus')?.value || 'capacity_analysis';
                filters.timePeriod = document.getElementById('time-period')?.value || 'all_day';
                break;
            case 'speed_analysis':
                filters.speedFocus = document.getElementById('speed-focus')?.value || 'speed_distribution';
                filters.speedRange = document.getElementById('speed-range')?.value || 'all_speeds';
                break;
            case 'weekend_vs_weekday':
                filters.dayComparison = document.getElementById('day-comparison')?.value || 'weekend_vs_weekday';
                filters.metricFocus = document.getElementById('metric-focus')?.value || 'trip_volume';
                break;
            case 'suburban_trips':
                filters.suburbanFocus = document.getElementById('suburban-focus')?.value || 'destinations';
                filters.destinationRegion = document.getElementById('destination-region')?.value || 'all_regions';
                break;
        }

        return filters;
    }

    // Apply filters to data based on selected criteria
    applyFilters(data, filters) {
        let filtered = data.filter(t => t != null);

        console.log('Applying filters:', filters, 'to', filtered.length, 'trips');

        switch (filters.scope) {
            case 'peak_hours':
                filtered = this.applyPeakHourFilters(filtered, filters);
                break;
            case 'distance_patterns':
                filtered = this.applyDistanceFilters(filtered, filters);
                break;
            case 'vendor_comparison':
                filtered = this.applyVendorFilters(filtered, filters);
                break;
            case 'quality_insights':
                filtered = this.applyQualityFilters(filtered, filters);
                break;
            case 'temporal_trends':
                filtered = this.applyTemporalFilters(filtered, filters);
                break;
            case 'geographic_analysis':
                filtered = this.applyGeographicFilters(filtered, filters);
                break;
            case 'passenger_patterns':
                filtered = this.applyPassengerFilters(filtered, filters);
                break;
            case 'speed_analysis':
                filtered = this.applySpeedFilters(filtered, filters);
                break;
            case 'weekend_vs_weekday':
                filtered = this.applyWeekendFilters(filtered, filters);
                break;
            case 'suburban_trips':
                filtered = this.applySuburbanFilters(filtered, filters);
                break;
        }

        console.log('After filtering:', filtered.length, 'trips remain');
        return filtered;
    }

    /**
     * Analyze data and present meaningful insights
     */
    analyzeAndPresentInsights(result, analysisScope, filters) {
        const data = result.data || [];
        const validData = data.filter(t => t != null);

        // Apply filters
        const filteredData = this.applyFilters(validData, filters);

        // Update results title based on scope
        const titles = {
            'peak_hours': 'PEAK HOUR ANALYSIS',
            'distance_patterns': 'DISTANCE PATTERN ANALYSIS',
            'vendor_comparison': 'VENDOR PERFORMANCE COMPARISON',
            'quality_insights': 'DATA QUALITY INSIGHTS',
            'temporal_trends': 'TEMPORAL TREND ANALYSIS',
            'geographic_analysis': 'GEOGRAPHIC ANALYSIS',
            'passenger_patterns': 'PASSENGER PATTERN ANALYSIS',
            'speed_analysis': 'SPEED ANALYSIS',
            'weekend_vs_weekday': 'WEEKEND VS WEEKDAY ANALYSIS',
            'suburban_trips': 'SUBURBAN TRIPS ANALYSIS'
        };
        document.getElementById('results-title').textContent = titles[analysisScope] || 'ANALYSIS RESULTS';

        // Render scope-specific content with filtered data and complete filter context
        switch (analysisScope) {
            case 'peak_hours':
                this.renderPeakHourAnalysis(filteredData, filters);
                break;
            case 'distance_patterns':
                this.renderDistancePatternAnalysis(filteredData, filters);
                break;
            case 'vendor_comparison':
                this.renderVendorComparison(filteredData, filters);
                break;
            case 'quality_insights':
                this.renderQualityInsights(filteredData, filters);
                break;
            case 'temporal_trends':
                this.renderTemporalTrends(filteredData, filters);
                break;
            case 'geographic_analysis':
                this.renderGeographicAnalysis(filteredData, filters);
                break;
            case 'passenger_patterns':
                this.renderPassengerPatterns(filteredData, filters);
                break;
            case 'speed_analysis':
                this.renderSpeedAnalysis(filteredData, filters);
                break;
            case 'weekend_vs_weekday':
                this.renderWeekendVsWeekday(filteredData, filters);
                break;
            case 'suburban_trips':
                this.renderSuburbanTrips(filteredData, filters);
                break;
        }

        // Store current data
        this.currentData = filteredData;
    }

    /**
     * Apply peak hour specific filters
     */
    applyPeakHourFilters(data, filters) {
        const timeFocus = filters.timeFocus || 'all_day';
        
        if (timeFocus === 'all_day') return data;
        
        return data.filter(trip => {
            if (!trip.pickup_datetime) return false;
            const hour = new Date(trip.pickup_datetime).getUTCHours();
            
            switch (timeFocus) {
                case 'morning_rush':
                    return hour >= 6 && hour < 10;
                case 'evening_rush':
                    return hour >= 16 && hour < 20;
                case 'business_hours':
                    return hour >= 9 && hour < 17;
                default:
                    return true;
            }
        });
    }

    /**
     * Apply distance pattern specific filters
     */
    applyDistanceFilters(data, filters) {
        let filtered = data;
        
        // Apply distance range filter
        if (filters.distanceRange && filters.distanceRange !== 'all') {
            filtered = filtered.filter(trip => {
                const dist = parseFloat(trip.distance_km) || 0;
                switch (filters.distanceRange) {
                    case 'short':
                        return dist > 0 && dist < 5;
                    case 'medium':
                        return dist >= 5 && dist < 15;
                    case 'long':
                        return dist >= 15;
                    default:
                        return true;
                }
            });
        }
        
        // Apply route type filter
        if (filters.routeType && filters.routeType !== 'all') {
            filtered = filtered.filter(trip => {
                const lat = parseFloat(trip.pickup_latitude) || 0;
                const lon = parseFloat(trip.pickup_longitude) || 0;
                const borough = this.getBoroughFromCoords(lat, lon);
                
                switch (filters.routeType) {
                    case 'urban':
                        return borough === 'Manhattan';
                    case 'suburban':
                        return borough !== 'Manhattan' && borough !== 'Other';
                    default:
                        return true;
                }
            });
        }
        
        return filtered;
    }

    /**
     * Apply vendor comparison specific filters
     */
    applyVendorFilters(data, filters) {
        const timePeriod = filters.timePeriod || 'all_day';
        
        if (timePeriod === 'all_day') return data;
        
        return data.filter(trip => {
            if (!trip.pickup_datetime) return false;
            const hour = new Date(trip.pickup_datetime).getUTCHours();
            
            switch (timePeriod) {
                case 'peak_hours':
                    return (hour >= 6 && hour < 10) || (hour >= 16 && hour < 20);
                case 'off_peak':
                    return (hour < 6 || (hour >= 10 && hour < 16) || hour >= 20);
                default:
                    return true;
            }
        });
    }

    /**
     * Apply quality insights specific filters
     */
    applyQualityFilters(data, filters) {
        let filtered = data;
        
        // Apply quality threshold filter
        if (filters.qualityThreshold && filters.qualityThreshold !== 'all') {
            filtered = filtered.filter(trip => {
                const score = parseFloat(trip.data_quality_score) || 0;
                switch (filters.qualityThreshold) {
                    case 'high':
                        return score >= 80;
                    case 'medium':
                        return score >= 60 && score < 80;
                    case 'low':
                        return score < 60;
                    default:
                        return true;
                }
            });
        }
        
        // Apply data category filter
        if (filters.dataCategory && filters.dataCategory !== 'all') {
            filtered = filtered.filter(trip => {
                const category = trip.trip_category || '';
                return category.toLowerCase().includes(filters.dataCategory.toLowerCase());
            });
        }
        
        return filtered;
    }

    /**
     * Apply temporal trends specific filters
     */
    applyTemporalFilters(data, filters) {
        let filtered = data;
        
        // Apply borough focus filter
        if (filters.boroughFocus && filters.boroughFocus !== 'all') {
            filtered = filtered.filter(trip => {
                const lat = parseFloat(trip.pickup_latitude) || 0;
                const lon = parseFloat(trip.pickup_longitude) || 0;
                const borough = this.getBoroughFromCoords(lat, lon);
                return borough.toLowerCase() === filters.boroughFocus.toLowerCase();
            });
        }
        
        return filtered;
    }

    /**
     * Apply geographic analysis specific filters
     */
    applyGeographicFilters(data, filters) {
        let filtered = data;
        
        // Apply map region filter
        if (filters.mapRegion && filters.mapRegion !== 'nyc_only') {
            if (filters.mapRegion === 'manhattan_focus') {
                filtered = filtered.filter(trip => {
                    const lat = parseFloat(trip.pickup_latitude) || 0;
                    const lon = parseFloat(trip.pickup_longitude) || 0;
                    return this.getBoroughFromCoords(lat, lon) === 'Manhattan';
                });
            }
        }
        
        return filtered;
    }

    /**
     * Apply passenger patterns specific filters
     */
    applyPassengerFilters(data, filters) {
        let filtered = data;
        
        // Apply time period filter
        if (filters.timePeriod && filters.timePeriod !== 'all_day') {
            filtered = filtered.filter(trip => {
                if (!trip.pickup_datetime) return false;
                const hour = new Date(trip.pickup_datetime).getUTCHours();
                const dayOfWeek = new Date(trip.pickup_datetime).getDay();
                
                switch (filters.timePeriod) {
                    case 'rush_hours':
                        return (hour >= 6 && hour < 10) || (hour >= 16 && hour < 20);
                    case 'business_hours':
                        return hour >= 9 && hour < 17;
                    case 'weekend':
                        return dayOfWeek === 0 || dayOfWeek === 6;
                    default:
                        return true;
                }
            });
        }
        
        return filtered;
    }

    /**
     * Apply speed analysis specific filters
     */
    applySpeedFilters(data, filters) {
        let filtered = data;
        
        // Apply speed range filter
        if (filters.speedRange && filters.speedRange !== 'all_speeds') {
            filtered = filtered.filter(trip => {
                const speed = parseFloat(trip.speed_kmh) || 0;
                switch (filters.speedRange) {
                    case 'slow_traffic':
                        return speed > 0 && speed < 15;
                    case 'normal_speed':
                        return speed >= 15 && speed < 30;
                    case 'fast_routes':
                        return speed >= 30;
                    default:
                        return true;
                }
            });
        }
        
        return filtered;
    }

    /**
     * Apply weekend vs weekday specific filters
     */
    applyWeekendFilters(data, filters) {
        let filtered = data;
        
        // Apply day comparison filter
        if (filters.dayComparison && filters.dayComparison !== 'weekend_vs_weekday') {
            filtered = filtered.filter(trip => {
                if (!trip.pickup_datetime) return false;
                const dayOfWeek = new Date(trip.pickup_datetime).getDay();
                
                switch (filters.dayComparison) {
                    case 'monday_vs_friday':
                        return dayOfWeek === 1 || dayOfWeek === 5;
                    case 'sunday_vs_saturday':
                        return dayOfWeek === 0 || dayOfWeek === 6;
                    case 'all_days':
                        return true;
                    default:
                        return true;
                }
            });
        }
        
        return filtered;
    }

    /**
     * Apply suburban trips specific filters
     */
    applySuburbanFilters(data, filters) {
        let filtered = data.filter(trip => {
            const distance = parseFloat(trip.distance_km) || 0;
            return distance > 15; // Suburban trips are long distance
        });
        
        // Apply destination region filter
        if (filters.destinationRegion && filters.destinationRegion !== 'all_regions') {
            filtered = filtered.filter(trip => {
                const lat = parseFloat(trip.dropoff_latitude) || 0;
                const lon = parseFloat(trip.dropoff_longitude) || 0;
                const region = this.getRegionFromCoords(lat, lon);
                return region === filters.destinationRegion;
            });
        }
        
        return filtered;
    }

    /**
     * Generate meaningful insights from the data
     */
    generateInsights(data, scope, timePeriod) {
        // Filter out null/undefined trips
        const validData = data.filter(t => t != null);
        
        if (validData.length === 0) return {};

        const insights = {
            totalTrips: validData.length,
            avgDistance: 0,
            avgDuration: 0,
            peakHour: 0,
            efficiencyScore: 0,
            pattern: '',
            topInsight: ''
        };

        // Calculate averages
        const validDistance = validData.filter(t => t.distance_km && t.distance_km > 0);
        const validDuration = validData.filter(t => t.trip_duration && t.trip_duration > 0);
        
        insights.avgDistance = validDistance.length > 0 
            ? (validDistance.reduce((sum, t) => sum + t.distance_km, 0) / validDistance.length).toFixed(2)
            : 0;
            
        insights.avgDuration = validDuration.length > 0 
            ? (validDuration.reduce((sum, t) => sum + t.trip_duration, 0) / validDuration.length / 60).toFixed(1)
            : 0;

        // Find peak hour
        const hourCounts = {};
        validData.forEach(trip => {
            if (trip.pickup_datetime) {
                const hour = new Date(trip.pickup_datetime).getUTCHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            }
        });
        insights.peakHour = Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b, '0');

        // Calculate efficiency score
        const efficientTrips = validData.filter(t => t.speed_kmh && t.speed_kmh > 10 && t.speed_kmh < 60);
        insights.efficiencyScore = validData.length > 0 ? ((efficientTrips.length / validData.length) * 100).toFixed(1) : 0;

        // Map time period to readable text
        const timePeriodText = {
            'morning_rush': 'Morning Rush (6-10am)',
            'afternoon': 'Afternoon (10am-4pm)',
            'evening_rush': 'Evening Rush (4-8pm)',
            'night': 'Night (8pm-6am)',
            'business_hours': 'Business Hours (9am-5pm)',
            'all_day': 'All Day'
        };
        
        const selectedPeriod = timePeriodText[timePeriod] || 'Selected Period';

        // Generate scope-specific insights with contextual text
        switch (scope) {
            case 'peak_hours':
                insights.pattern = `Peak activity at ${insights.peakHour}:00 with ${hourCounts[insights.peakHour]} trips in ${selectedPeriod}`;
                insights.topInsight = `${selectedPeriod} data shows ${insights.avgDuration} min average trip duration`;
                break;
            case 'distance_patterns':
                insights.pattern = `${insights.efficiencyScore}% of ${selectedPeriod} trips are efficiently routed`;
                insights.topInsight = `${selectedPeriod} average trip distance: ${insights.avgDistance} km`;
                break;
            case 'vendor_comparison':
                const vendorCounts = {};
                validData.forEach(trip => {
                    const vendor = trip.vendor_name || 'Unknown';
                    vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
                });
                const topVendor = Object.keys(vendorCounts).reduce((a, b) => vendorCounts[a] > vendorCounts[b] ? a : b);
                insights.pattern = `${topVendor} leads ${selectedPeriod} with ${vendorCounts[topVendor]} trips`;
                insights.topInsight = `${selectedPeriod} market leader handles ${((vendorCounts[topVendor] / validData.length) * 100).toFixed(1)}% of all trips`;
                break;
            case 'quality_insights':
                const qualityAvg = validData.filter(t => t.data_quality_score).reduce((sum, t) => sum + t.data_quality_score, 0) / validData.filter(t => t.data_quality_score).length;
                insights.pattern = `${selectedPeriod} data quality score: ${qualityAvg ? qualityAvg.toFixed(1) : 'N/A'}/100`;
                insights.topInsight = `${selectedPeriod} high-quality data enables accurate analysis`;
                break;
            case 'temporal_trends':
                insights.pattern = `${selectedPeriod} time-based patterns analyzed`;
                insights.topInsight = `${selectedPeriod} temporal clustering shows peak at ${insights.peakHour}:00`;
                break;
            case 'speed_analysis':
                insights.pattern = `${selectedPeriod} average speed: ${insights.avgSpeed || 'N/A'} km/h`;
                insights.topInsight = `${selectedPeriod} traffic conditions: ${insights.efficiencyScore}% efficient routing`;
                break;
            case 'passenger_patterns':
                insights.pattern = `${selectedPeriod} average occupancy: ${insights.avgPassengers || 'N/A'} passengers`;
                insights.topInsight = `${selectedPeriod} solo travel dominates at ${insights.soloPercent || 'N/A'}%`;
                break;
            case 'geographic_analysis':
                insights.pattern = `${selectedPeriod} geographic patterns analyzed across boroughs`;
                insights.topInsight = `${selectedPeriod} shows distinct origin-destination flows`;
                break;
            case 'weekend_vs_weekday':
                insights.pattern = `${selectedPeriod} weekend vs weekday patterns compared`;
                insights.topInsight = `${selectedPeriod} shows behavioral differences between weekends and weekdays`;
                break;
            case 'suburban_trips':
                insights.pattern = `${selectedPeriod} suburban trip patterns identified`;
                insights.topInsight = `${selectedPeriod} long-distance trips analyzed`;
                break;
        }

        return insights;
    }

    /**
     * Update summary cards with key findings
     */
    updateInsightCards(insights, performance) {
        document.getElementById('trips-analyzed').textContent = insights.totalTrips.toLocaleString();
        document.getElementById('peak-hour').textContent = `${insights.peakHour}:00`;
        document.getElementById('avg-distance').textContent = `${insights.avgDistance} km`;
        document.getElementById('efficiency-score').textContent = `${insights.efficiencyScore}%`;
    }

    /**
     * Update the insights table with meaningful data
     */
    updateInsightsTable(data, insights) {
        const tableBody = document.getElementById('insights-table-body');
        if (!tableBody) return;

        // Filter out null/undefined trips
        const validData = data.filter(t => t != null);

        if (validData.length === 0) {
            tableBody.innerHTML = '<div class="no-data">No data available for analysis</div>';
            return;
        }

        // Group data by time periods for meaningful insights
        const timeGroups = this.groupDataByTimePeriod(validData);
        
        tableBody.innerHTML = Object.entries(timeGroups).map(([period, trips]) => {
            const avgDistance = trips.filter(t => t.distance_km).reduce((sum, t) => sum + t.distance_km, 0) / trips.filter(t => t.distance_km).length;
            const avgDuration = trips.filter(t => t.trip_duration).reduce((sum, t) => sum + t.trip_duration, 0) / trips.filter(t => t.trip_duration).length / 60;
            const efficiency = trips.filter(t => t.speed_kmh && t.speed_kmh > 10 && t.speed_kmh < 60).length / trips.length * 100;
            const pattern = this.identifyPattern(trips);

            return `
                <div class="table-row">
                    <div class="col">${period}</div>
                    <div class="col">${trips.length}</div>
                    <div class="col">${avgDistance ? avgDistance.toFixed(1) : 'N/A'} km</div>
                    <div class="col">${avgDuration ? avgDuration.toFixed(1) : 'N/A'} min</div>
                    <div class="col">${efficiency.toFixed(1)}%</div>
                    <div class="col">${pattern}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Group data by time periods for meaningful analysis
     */
    groupDataByTimePeriod(data) {
        const groups = {
            'Early Morning (5-8 AM)': [],
            'Morning Rush (8-10 AM)': [],
            'Mid Morning (10 AM-12 PM)': [],
            'Afternoon (12-5 PM)': [],
            'Evening Rush (5-7 PM)': [],
            'Night (7 PM-5 AM)': []
        };

        data.forEach(trip => {
            if (trip.pickup_datetime) {
                const hour = new Date(trip.pickup_datetime).getUTCHours();
                if (hour >= 5 && hour < 8) groups['Early Morning (5-8 AM)'].push(trip);
                else if (hour >= 8 && hour < 10) groups['Morning Rush (8-10 AM)'].push(trip);
                else if (hour >= 10 && hour < 12) groups['Mid Morning (10 AM-12 PM)'].push(trip);
                else if (hour >= 12 && hour < 17) groups['Afternoon (12-5 PM)'].push(trip);
                else if (hour >= 17 && hour < 19) groups['Evening Rush (5-7 PM)'].push(trip);
                else groups['Night (7 PM-5 AM)'].push(trip);
            }
        });

        // Filter out empty groups
        return Object.fromEntries(Object.entries(groups).filter(([_, trips]) => trips.length > 0));
    }

    /**
     * Calculate average distance from trip data
     */
    calculateAvgDistance(trips) {
        const validDistance = trips.filter(t => t && t.distance_km != null && !isNaN(parseFloat(t.distance_km)) && parseFloat(t.distance_km) > 0);
        if (validDistance.length === 0) return 0;
        return validDistance.reduce((sum, t) => sum + parseFloat(t.distance_km), 0) / validDistance.length;
    }

    /**
     * Calculate average duration from trip data (in minutes)
     */
    calculateAvgDuration(trips) {
        const validDuration = trips.filter(t => t && t.trip_duration != null && !isNaN(parseFloat(t.trip_duration)) && parseFloat(t.trip_duration) > 0);
        if (validDuration.length === 0) return 0;
        return validDuration.reduce((sum, t) => sum + parseFloat(t.trip_duration), 0) / validDuration.length / 60;
    }

    /**
     * Calculate average speed from trip data
     */
    calculateAvgSpeed(trips) {
        const validSpeed = trips.filter(t => t && t.speed_kmh != null && !isNaN(parseFloat(t.speed_kmh)) && parseFloat(t.speed_kmh) > 0);
        if (validSpeed.length === 0) return 0;
        return validSpeed.reduce((sum, t) => sum + parseFloat(t.speed_kmh), 0) / validSpeed.length;
    }

    /**
     * Identify patterns in trip data
     */
    identifyPattern(trips) {
        if (trips.length === 0) return 'No data';
        
        const avgDistance = this.calculateAvgDistance(trips);
        const avgSpeed = this.calculateAvgSpeed(trips);
        
        if (avgDistance < 2) return 'Short trips';
        if (avgDistance > 10) return 'Long distance';
        if (avgSpeed > 25) return 'Fast routes';
        if (avgSpeed < 10) return 'Slow traffic';
        return 'Normal pattern';
    }

    /**
     * Get filter context label for display
     */
    getFilterContextLabel(filters) {
        const scope = filters.scope;
        let label = '';

        switch (scope) {
            case 'peak_hours':
                const timeFocusLabels = {
                    'all_day': 'All Day Analysis',
                    'morning_rush': 'Morning Rush (6-10 AM)',
                    'evening_rush': 'Evening Rush (4-8 PM)',
                    'business_hours': 'Business Hours (9 AM-5 PM)'
                };
                label = timeFocusLabels[filters.timeFocus] || 'Peak Hours';
                break;
            case 'distance_patterns':
                const rangeLabels = {
                    'all': 'All Distances',
                    'short': 'Short Trips (0-5 km)',
                    'medium': 'Medium Trips (5-15 km)',
                    'long': 'Long Trips (15+ km)'
                };
                const routeLabels = {
                    'all': 'All Routes',
                    'urban': 'Urban Routes (Manhattan)',
                    'suburban': 'Suburban Routes (Outer Boroughs)'
                };
                label = `${rangeLabels[filters.distanceRange] || 'All Distances'}, ${routeLabels[filters.routeType] || 'All Routes'}`;
                break;
            case 'vendor_comparison':
                const periodLabels = {
                    'all_day': 'All Day',
                    'peak_hours': 'Peak Hours Only',
                    'off_peak': 'Off-Peak Hours'
                };
                label = periodLabels[filters.timePeriod] || 'All Day';
                break;
            case 'quality_insights':
                const qualityLabels = {
                    'all': 'All Quality Levels',
                    'high': 'High Quality (80+)',
                    'medium': 'Medium Quality (60-79)',
                    'low': 'Low Quality (below 60)'
                };
                label = qualityLabels[filters.qualityThreshold] || 'All Quality Levels';
                break;
            case 'temporal_trends':
                const boroughLabels = {
                    'all': 'All Boroughs',
                    'manhattan': 'Manhattan Only',
                    'brooklyn': 'Brooklyn Only',
                    'queens': 'Queens Only'
                };
                label = boroughLabels[filters.boroughFocus] || 'All Boroughs';
                break;
            case 'geographic_analysis':
                const regionLabels = {
                    'nyc_only': 'NYC Only',
                    'including_suburbs': 'Including Suburbs',
                    'manhattan_focus': 'Manhattan Focus'
                };
                label = regionLabels[filters.mapRegion] || 'NYC';
                break;
            case 'passenger_patterns':
                const passengerPeriodLabels = {
                    'all_day': 'All Day',
                    'rush_hours': 'Rush Hours',
                    'business_hours': 'Business Hours',
                    'weekend': 'Weekend Only'
                };
                label = passengerPeriodLabels[filters.timePeriod] || 'All Day';
                break;
            case 'speed_analysis':
                const speedLabels = {
                    'all_speeds': 'All Speeds',
                    'slow_traffic': 'Slow Traffic (0-15 km/h)',
                    'normal_speed': 'Normal Speed (15-30 km/h)',
                    'fast_routes': 'Fast Routes (30+ km/h)'
                };
                label = speedLabels[filters.speedRange] || 'All Speeds';
                break;
            case 'weekend_vs_weekday':
                const dayLabels = {
                    'weekend_vs_weekday': 'Weekend vs Weekday',
                    'monday_vs_friday': 'Monday vs Friday',
                    'sunday_vs_saturday': 'Sunday vs Saturday',
                    'all_days': 'All Days'
                };
                label = dayLabels[filters.dayComparison] || 'Weekend vs Weekday';
                break;
            case 'suburban_trips':
                const destLabels = {
                    'all_regions': 'All Regions',
                    'north': 'North (CT/Westchester)',
                    'south': 'South (NJ)',
                    'east': 'East (Long Island)',
                    'west': 'West (NJ)'
                };
                label = destLabels[filters.destinationRegion] || 'All Regions';
                break;
            default:
                label = 'Current Selection';
        }

        return label;
    }

    /**
     * Get time period label for display
     */
    getTimePeriodLabel(timePeriod) {
        const labels = {
            'morning_rush': 'Morning Rush (6-10am)',
            'afternoon': 'Afternoon (10am-4pm)',
            'evening_rush': 'Evening Rush (4-8pm)',
            'night': 'Night (8pm-6am)',
            'business_hours': 'Business Hours (9am-5pm)',
            'all_day': 'All Day'
        };
        return labels[timePeriod] || 'Selected Time Period';
    }

    /**
     * Render Peak Hour Analysis
     */
    renderPeakHourAnalysis(data, filters) {
        // Get filter context for display
        const filterLabel = this.getFilterContextLabel(filters);
        const timeFocus = filters.timeFocus || 'all_day';
        
        // Count trips by hour from filtered data
        const hourCounts = {};
        data.forEach(trip => {
            if (trip.pickup_datetime) {
                const hour = new Date(trip.pickup_datetime).getUTCHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            }
        });

        const peakHour = Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b, '0');
        const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);

        const busiestHour = peakHour;
        const quietestHour = Object.keys(hourCounts).reduce((a, b) => hourCounts[a] < hourCounts[b] ? a : b, '0');
        const peakPercentage = ((hourCounts[peakHour] / data.length) * 100).toFixed(1);

        // Context-specific labels based on active filter
        let peakLabel, quietLabel, concentrationLabel, concentrationDetail;
        
        if (timeFocus === 'morning_rush') {
            peakLabel = 'MORNING PEAK HOUR';
            quietLabel = 'LIGHTEST MORNING HOUR';
            concentrationLabel = 'RUSH INTENSITY';
            concentrationDetail = 'of morning rush volume';
        } else if (timeFocus === 'evening_rush') {
            peakLabel = 'EVENING PEAK HOUR';
            quietLabel = 'LIGHTEST EVENING HOUR';
            concentrationLabel = 'RUSH INTENSITY';
            concentrationDetail = 'of evening rush volume';
        } else if (timeFocus === 'business_hours') {
            peakLabel = 'BUSIEST BUSINESS HOUR';
            quietLabel = 'QUIETEST BUSINESS HOUR';
            concentrationLabel = 'BUSINESS PEAK';
            concentrationDetail = 'of business hours volume';
        } else {
            peakLabel = 'BUSIEST HOUR (24H)';
            quietLabel = 'QUIETEST HOUR (24H)';
            concentrationLabel = 'DAILY PEAK';
            concentrationDetail = 'of all-day volume';
        }

        const content = `
            <div class="summary-section">
                <h4>KEY FINDINGS - ${filterLabel}</h4>
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-label">${peakLabel}</div>
                        <div class="summary-value">${busiestHour}:00</div>
                        <div class="summary-detail">${hourCounts[peakHour].toLocaleString()} trips (${peakPercentage}%)</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">${quietLabel}</div>
                        <div class="summary-value">${quietestHour}:00</div>
                        <div class="summary-detail">${hourCounts[quietestHour].toLocaleString()} trips</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">TOTAL TRIPS ANALYZED</div>
                        <div class="summary-value">${data.length.toLocaleString()}</div>
                        <div class="summary-detail">in ${filterLabel}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">${concentrationLabel}</div>
                        <div class="summary-value">${peakPercentage}%</div>
                        <div class="summary-detail">${concentrationDetail}</div>
                    </div>
                </div>
            </div>

            <div class="insights-table-section">
                <h4>HOURLY TRIP DISTRIBUTION</h4>
                <div class="insights-table peak-hours-table">
                    <div class="table-header peak-hours-header">
                        <div>HOUR</div>
                        <div>TRIPS</div>
                        <div>SHARE</div>
                        <div>STATUS</div>
                    </div>
                    <div class="table-body">
                        ${sortedHours.map(([hour, count]) => {
                            const percentage = ((count / data.length) * 100).toFixed(1);
                            const status = count > hourCounts[peakHour] * 0.7 ? 'PEAK' : 
                                          count > hourCounts[peakHour] * 0.4 ? 'BUSY' : 'NORMAL';
                            const statusClass = status === 'PEAK' ? 'status-peak' : status === 'BUSY' ? 'status-busy' : 'status-normal';
                            return `
                                <div class="table-row">
                                    <div>${hour}:00 - ${hour}:59</div>
                                    <div>${count.toLocaleString()}</div>
                                    <div>${percentage}%</div>
                                    <div class="${statusClass}">${status}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('results-content').innerHTML = content;
    }

    /**
     * Render Distance Pattern Analysis
     */
    renderDistancePatternAnalysis(data, filters) {
        // Get filter context for display
        const filterLabel = this.getFilterContextLabel(filters);
        
        // The data is already filtered based on distance range and route type
        console.log('Analyzing distance patterns for', data.length, 'filtered trips');
        
        // Use the helper method to calculate average distance
        const avgDistance = this.calculateAvgDistance(data);
        console.log('Average distance calculated:', avgDistance);
        
        // Filter valid trips with distance data
        const validDistance = data.filter(t => t && t.distance_km != null && !isNaN(parseFloat(t.distance_km)) && parseFloat(t.distance_km) > 0);
        console.log('Valid distance trips:', validDistance.length);
        
        // Use the sorted data to categorize trips by distance ranges
        const shortTrips = validDistance.filter(t => parseFloat(t.distance_km) < 2).length;
        const mediumTrips = validDistance.filter(t => {
            const dist = parseFloat(t.distance_km);
            return dist >= 2 && dist < 10;
        }).length;
        const longTrips = validDistance.filter(t => parseFloat(t.distance_km) >= 10).length;

        const shortPercent = ((shortTrips / validDistance.length) * 100).toFixed(1);
        const mediumPercent = ((mediumTrips / validDistance.length) * 100).toFixed(1);
        const longPercent = ((longTrips / validDistance.length) * 100).toFixed(1);
        const dominantType = shortTrips > mediumTrips && shortTrips > longTrips ? 'Short' : 
                            mediumTrips > longTrips ? 'Medium' : 'Long';

        // Context-specific labels based on active filters
        let avgLabel, shortLabel, mediumLabel, longLabel;
        
        const distanceRange = filters.distanceRange || 'all';
        const routeType = filters.routeType || 'all';
        
        if (routeType === 'urban') {
            avgLabel = 'AVG URBAN TRIP DISTANCE';
            shortLabel = 'SHORT URBAN TRIPS';
            mediumLabel = 'MEDIUM URBAN TRIPS';
            longLabel = 'LONG URBAN TRIPS';
        } else if (routeType === 'suburban') {
            avgLabel = 'AVG SUBURBAN TRIP DISTANCE';
            shortLabel = 'SHORT SUBURBAN TRIPS';
            mediumLabel = 'MEDIUM SUBURBAN TRIPS';
            longLabel = 'LONG SUBURBAN TRIPS';
        } else if (distanceRange === 'short') {
            avgLabel = 'AVG SHORT TRIP DISTANCE';
            shortLabel = 'VERY SHORT (<2km)';
            mediumLabel = 'SHORT (2-5km)';
            longLabel = 'N/A';
        } else if (distanceRange === 'medium') {
            avgLabel = 'AVG MEDIUM TRIP DISTANCE';
            shortLabel = 'LOWER MEDIUM (5-8km)';
            mediumLabel = 'UPPER MEDIUM (8-12km)';
            longLabel = 'EXTENDED (12-15km)';
        } else if (distanceRange === 'long') {
            avgLabel = 'AVG LONG TRIP DISTANCE';
            shortLabel = 'LONG (15-25km)';
            mediumLabel = 'VERY LONG (25-40km)';
            longLabel = 'EXTREME (40+ km)';
        } else {
            avgLabel = 'AVG TRIP DISTANCE';
            shortLabel = 'SHORT TRIPS (<2km)';
            mediumLabel = 'MEDIUM TRIPS (2-10km)';
            longLabel = 'LONG TRIPS (>10km)';
        }

        const content = `
            <div class="summary-section">
                <h4>KEY FINDINGS - ${filterLabel}</h4>
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-label">${avgLabel}</div>
                        <div class="summary-value">${isNaN(avgDistance) || avgDistance === 0 ? 'No Data' : avgDistance.toFixed(2) + ' km'}</div>
                        <div class="summary-detail">across ${validDistance.length.toLocaleString()} filtered trips</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">${shortLabel}</div>
                        <div class="summary-value">${shortTrips.toLocaleString()}</div>
                        <div class="summary-detail">under 2 km (${shortPercent}%)</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">${mediumLabel}</div>
                        <div class="summary-value">${mediumTrips.toLocaleString()}</div>
                        <div class="summary-detail">2-10 km (${mediumPercent}%)</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">${longLabel}</div>
                        <div class="summary-value">${longTrips.toLocaleString()}</div>
                        <div class="summary-detail">over 10 km (${longPercent}%)</div>
                    </div>
                </div>
            </div>

            <div class="insights-table-section">
                <h4>DISTANCE BREAKDOWN</h4>
                <div class="insights-table distance-table">
                    <div class="table-header distance-header">
                        <div>DISTANCE RANGE</div>
                        <div>TRIPS</div>
                        <div>SHARE</div>
                        <div>AVG SPEED</div>
                        <div>PATTERN</div>
                    </div>
                    <div class="table-body">
                        ${[
                            { range: '0-2 km (Short)', trips: data.filter(t => t.distance_km && t.distance_km < 2) },
                            { range: '2-5 km (Medium)', trips: data.filter(t => t.distance_km && t.distance_km >= 2 && t.distance_km < 5) },
                            { range: '5-10 km (Long)', trips: data.filter(t => t.distance_km && t.distance_km >= 5 && t.distance_km < 10) },
                            { range: '10-20 km (Very Long)', trips: data.filter(t => t.distance_km && t.distance_km >= 10 && t.distance_km < 20) },
                            { range: '20+ km (Extended)', trips: data.filter(t => t.distance_km && t.distance_km >= 20) }
                        ].map(({ range, trips }) => {
                            const count = trips.length;
                            const percentage = ((count / data.length) * 100).toFixed(1);
                            const avgSpeed = this.calculateAvgSpeed(trips);
                            const pattern = avgSpeed > 30 ? 'Highway' : avgSpeed > 20 ? 'Fast' : avgSpeed > 10 ? 'Normal' : 'Slow';
                            return `
                                <div class="table-row">
                                    <div>${range}</div>
                                    <div>${count.toLocaleString()}</div>
                                    <div>${percentage}%</div>
                                    <div>${avgSpeed > 0 ? avgSpeed.toFixed(1) + ' km/h' : 'N/A'}</div>
                                    <div>${pattern}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('results-content').innerHTML = content;
    }

    /**
     * Render Vendor Comparison
     */
    renderVendorComparison(data, filters) {
        const filterLabel = this.getFilterContextLabel(filters);
        const vendorStats = {};
        data.forEach(trip => {
            const vendor = trip.vendor_name || 'Unknown';
            if (!vendorStats[vendor]) {
                vendorStats[vendor] = { count: 0, totalDistance: 0, totalDuration: 0, trips: [] };
            }
            vendorStats[vendor].count++;
            vendorStats[vendor].trips.push(trip);
            if (trip.distance_km) vendorStats[vendor].totalDistance += trip.distance_km;
            if (trip.trip_duration) vendorStats[vendor].totalDuration += trip.trip_duration;
        });

        const sortedVendors = Object.entries(vendorStats).sort((a, b) => b[1].count - a[1].count);

        const leaderShare = sortedVendors[0] ? ((sortedVendors[0][1].count / data.length) * 100).toFixed(1) : 0;
        const leaderName = sortedVendors[0]?.[0] || 'N/A';
        const secondPlace = sortedVendors[1] ? ((sortedVendors[1][1].count / data.length) * 100).toFixed(1) : 0;

        const content = `
            <div class="summary-section">
                <h4>KEY FINDINGS - ${filterLabel}</h4>
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-label">MARKET LEADER (${filterLabel.toUpperCase()})</div>
                        <div class="summary-value">${leaderShare}%</div>
                        <div class="summary-detail">${leaderName}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">TOTAL VENDORS</div>
                        <div class="summary-value">${sortedVendors.length}</div>
                        <div class="summary-detail">active vendors</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">TRIPS ANALYZED</div>
                        <div class="summary-value">${data.length.toLocaleString()}</div>
                        <div class="summary-detail">filtered trips</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">MARKET GAP</div>
                        <div class="summary-value">${(leaderShare - secondPlace).toFixed(1)}%</div>
                        <div class="summary-detail">lead over 2nd place</div>
                    </div>
                </div>
            </div>

            <div class="insights-table-section">
                <h4>VENDOR PERFORMANCE</h4>
                <div class="insights-table vendor-table">
                    <div class="table-header vendor-header">
                        <div>RANK</div>
                        <div>VENDOR</div>
                        <div>TRIPS</div>
                        <div>MARKET SHARE</div>
                        <div>AVG DISTANCE</div>
                        <div>AVG DURATION</div>
                    </div>
                    <div class="table-body">
                        ${sortedVendors.map(([vendor, stats], index) => {
                            const marketShare = ((stats.count / data.length) * 100).toFixed(1);
                            const avgDistance = this.calculateAvgDistance(stats.trips);
                            const avgDuration = this.calculateAvgDuration(stats.trips);
                            const rankClass = index === 0 ? 'rank-first' : index === 1 ? 'rank-second' : '';
                            const rankBadge = index === 0 ? '1ST' : index === 1 ? '2ND' : `${index + 1}TH`;
                            return `
                                <div class="table-row ${rankClass}">
                                    <div><strong>${rankBadge}</strong></div>
                                    <div><strong>${vendor}</strong></div>
                                    <div>${stats.count.toLocaleString()}</div>
                                    <div>${marketShare}%</div>
                                    <div>${avgDistance > 0 ? avgDistance.toFixed(2) + ' km' : 'N/A'}</div>
                                    <div>${avgDuration > 0 ? avgDuration.toFixed(1) + ' min' : 'N/A'}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('results-content').innerHTML = content;
    }

    /**
     * Render Quality Insights
     */
    renderQualityInsights(data, filters) {
        const filterLabel = this.getFilterContextLabel(filters);
        const qualityData = data.filter(t => t.data_quality_score);
        const avgQuality = qualityData.length > 0 ? 
            qualityData.reduce((sum, t) => sum + t.data_quality_score, 0) / qualityData.length : 0;

        const excellent = data.filter(t => t.data_quality_score >= 80).length;
        const good = data.filter(t => t.data_quality_score >= 60 && t.data_quality_score < 80).length;
        const fair = data.filter(t => t.data_quality_score >= 40 && t.data_quality_score < 60).length;
        const poor = data.filter(t => t.data_quality_score < 40).length;

        const excellentPercent = ((excellent / data.length) * 100).toFixed(1);
        const goodPercent = ((good / data.length) * 100).toFixed(1);
        const needsImprovementPercent = (((fair + poor) / data.length) * 100).toFixed(1);
        const qualityRating = avgQuality >= 80 ? 'Excellent' : avgQuality >= 60 ? 'Good' : avgQuality >= 40 ? 'Fair' : 'Poor';
        
        // Calculate avg distance for high vs low quality trips
        const highQualityTrips = data.filter(t => t.data_quality_score >= 60);
        const lowQualityTrips = data.filter(t => t.data_quality_score < 60);
        const highQualityAvgDist = this.calculateAvgDistance(highQualityTrips);
        const lowQualityAvgDist = this.calculateAvgDistance(lowQualityTrips);

        const content = `
            <div class="summary-section">
                <h4>KEY FINDINGS - ${filterLabel}</h4>
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-label">OVERALL QUALITY</div>
                        <div class="summary-value">${avgQuality.toFixed(1)}/100</div>
                        <div class="summary-detail">${qualityRating} rating</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">HIGH QUALITY TRIPS</div>
                        <div class="summary-value">${(excellent + good).toLocaleString()}</div>
                        <div class="summary-detail">${(parseFloat(excellentPercent) + parseFloat(goodPercent)).toFixed(1)}% (score ≥60)</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">EXCELLENT DATA</div>
                        <div class="summary-value">${excellent.toLocaleString()}</div>
                        <div class="summary-detail">80+ score (${excellentPercent}%)</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">QUALITY IMPACT</div>
                        <div class="summary-value">${highQualityAvgDist > lowQualityAvgDist ? '+' : ''}${((highQualityAvgDist - lowQualityAvgDist) / lowQualityAvgDist * 100).toFixed(0)}%</div>
                        <div class="summary-detail">distance correlation</div>
                    </div>
                </div>
            </div>

            <div class="insights-table-section">
                <h4>QUALITY DISTRIBUTION</h4>
                <div class="insights-table quality-table">
                    <div class="table-header quality-header">
                        <div>QUALITY LEVEL</div>
                        <div>SCORE RANGE</div>
                        <div>TRIPS</div>
                        <div>SHARE</div>
                        <div>STATUS</div>
                    </div>
                    <div class="table-body">
                        ${[
                            { level: 'EXCELLENT', range: '80-100', count: excellent, status: 'OPTIMAL' },
                            { level: 'GOOD', range: '60-79', count: good, status: 'ACCEPTABLE' },
                            { level: 'FAIR', range: '40-59', count: fair, status: 'REVIEW' },
                            { level: 'POOR', range: '0-39', count: poor, status: 'CRITICAL' }
                        ].map(({ level, range, count, status }) => {
                            const percentage = ((count / data.length) * 100).toFixed(1);
                            const statusClass = level === 'EXCELLENT' ? 'status-excellent' : 
                                              level === 'GOOD' ? 'status-good' : 
                                              level === 'FAIR' ? 'status-fair' : 'status-poor';
                            return `
                                <div class="table-row">
                                    <div><strong>${level}</strong></div>
                                    <div>${range}</div>
                                    <div>${count.toLocaleString()}</div>
                                    <div>${percentage}%</div>
                                    <div class="${statusClass}">${status}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('results-content').innerHTML = content;
    }

    /**
     * Render Temporal Trends
     */
    renderTemporalTrends(data, filters) {
        const filterLabel = this.getFilterContextLabel(filters);
        const timeGroups = this.groupDataByTimePeriod(data);

        const busiestPeriodEntry = Object.entries(timeGroups).sort((a, b) => b[1].length - a[1].length)[0];
        const busiestPeriod = busiestPeriodEntry?.[0] || 'N/A';
        const busiestCount = busiestPeriodEntry?.[1].length || 0;
        const busiestPercent = ((busiestCount / data.length) * 100).toFixed(1);
        const avgPerPeriod = Math.round(data.length / Object.keys(timeGroups).length);

        const content = `
            <div class="summary-section">
                <h4>KEY FINDINGS - ${filterLabel}</h4>
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-label">BUSIEST PERIOD</div>
                        <div class="summary-value">${busiestPeriod.split(' ')[0]}</div>
                        <div class="summary-detail">${busiestCount.toLocaleString()} trips (${busiestPercent}%)</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">TOTAL ANALYZED</div>
                        <div class="summary-value">${data.length.toLocaleString()}</div>
                        <div class="summary-detail">trips across day</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">TIME PERIODS</div>
                        <div class="summary-value">${Object.keys(timeGroups).length}</div>
                        <div class="summary-detail">active periods found</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">AVG PER PERIOD</div>
                        <div class="summary-value">${avgPerPeriod.toLocaleString()}</div>
                        <div class="summary-detail">trips per time slot</div>
                    </div>
                </div>
            </div>

            <div class="insights-table-section">
                <h4>TEMPORAL BREAKDOWN</h4>
                <div class="insights-table temporal-table">
                    <div class="table-header temporal-header">
                        <div>TIME PERIOD</div>
                        <div>TRIPS</div>
                        <div>AVG DISTANCE</div>
                        <div>AVG DURATION</div>
                        <div>EFFICIENCY</div>
                        <div>PATTERN</div>
                    </div>
                    <div class="table-body">
                        ${Object.entries(timeGroups).map(([period, trips]) => {
                            const avgDistance = this.calculateAvgDistance(trips);
                            const avgDuration = this.calculateAvgDuration(trips);
                            const efficiency = trips.filter(t => t && t.speed_kmh && parseFloat(t.speed_kmh) > 10 && parseFloat(t.speed_kmh) < 60).length / trips.length * 100;
                            const pattern = this.identifyPattern(trips);
                            const efficiencyClass = efficiency > 70 ? 'efficiency-high' : efficiency > 50 ? 'efficiency-medium' : 'efficiency-low';
                            return `
                                <div class="table-row">
                                    <div><strong>${period}</strong></div>
                                    <div>${trips.length.toLocaleString()}</div>
                                    <div>${avgDistance > 0 ? avgDistance.toFixed(1) + ' km' : 'N/A'}</div>
                                    <div>${avgDuration > 0 ? avgDuration.toFixed(1) + ' min' : 'N/A'}</div>
                                    <div class="${efficiencyClass}">${efficiency.toFixed(1)}%</div>
                                    <div>${pattern}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('results-content').innerHTML = content;
    }

    /**
     * Format time for display
     */
    formatTime(timeString) {
        if (!timeString) return '-';
        const date = new Date(timeString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    /**
     * Render Geographic Analysis
     */
    renderGeographicAnalysis(data, filters) {
        const filterLabel = this.getFilterContextLabel(filters);
        // Analyze pickup and dropoff patterns
        const boroughStats = {};
        const interBoroughTrips = [];
        
        data.forEach(trip => {
            if (trip.pickup_latitude && trip.pickup_longitude) {
                const pickupBorough = this.getBoroughFromCoords(trip.pickup_latitude, trip.pickup_longitude);
                const dropoffBorough = trip.dropoff_latitude && trip.dropoff_longitude ? 
                    this.getBoroughFromCoords(trip.dropoff_latitude, trip.dropoff_longitude) : 'Unknown';
                
                if (!boroughStats[pickupBorough]) {
                    boroughStats[pickupBorough] = { pickups: 0, dropoffs: 0, trips: [] };
                }
                boroughStats[pickupBorough].pickups++;
                boroughStats[pickupBorough].trips.push(trip);
                
                if (dropoffBorough !== 'Unknown') {
                    if (!boroughStats[dropoffBorough]) {
                        boroughStats[dropoffBorough] = { pickups: 0, dropoffs: 0, trips: [] };
                    }
                    boroughStats[dropoffBorough].dropoffs++;
                    
                    if (pickupBorough !== dropoffBorough) {
                        interBoroughTrips.push({ from: pickupBorough, to: dropoffBorough, trip });
                    }
                }
            }
        });

        const sortedBoroughs = Object.entries(boroughStats).sort((a, b) => b[1].pickups - a[1].pickups);
        const busiestBorough = sortedBoroughs[0];
        const interBoroughCount = interBoroughTrips.length;

        const content = `
            <div class="summary-section">
                <h4>KEY FINDINGS - ${filterLabel}</h4>
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-label">BUSIEST BOROUGH</div>
                        <div class="summary-value">${busiestBorough ? busiestBorough[0] : 'N/A'}</div>
                        <div class="summary-detail">${busiestBorough ? busiestBorough[1].pickups.toLocaleString() : 0} pickups</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">INTER-BOROUGH TRIPS</div>
                        <div class="summary-value">${interBoroughCount.toLocaleString()}</div>
                        <div class="summary-detail">${((interBoroughCount / data.length) * 100).toFixed(1)}% of trips</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">ACTIVE BOROUGHS</div>
                        <div class="summary-value">${sortedBoroughs.length}</div>
                        <div class="summary-detail">boroughs with activity</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">TOTAL TRIPS</div>
                        <div class="summary-value">${data.length.toLocaleString()}</div>
                        <div class="summary-detail">analyzed geographically</div>
                    </div>
                </div>
            </div>

            <div class="insights-table-section">
                <h4>BOROUGH ACTIVITY</h4>
                <div class="insights-table geographic-table">
                    <div class="table-header geographic-header">
                        <div>BOROUGH</div>
                        <div>PICKUPS</div>
                        <div>DROP-OFFS</div>
                        <div>NET FLOW</div>
                        <div>AVG DISTANCE</div>
                        <div>ACTIVITY LEVEL</div>
                    </div>
                    <div class="table-body">
                        ${sortedBoroughs.map(([borough, stats]) => {
                            const netFlow = stats.pickups - stats.dropoffs;
                            const avgDistance = this.calculateAvgDistance(stats.trips);
                            const activityLevel = stats.pickups > busiestBorough[1].pickups * 0.7 ? 'HIGH' : 
                                                stats.pickups > busiestBorough[1].pickups * 0.3 ? 'MEDIUM' : 'LOW';
                            const flowClass = netFlow > 0 ? 'flow-positive' : netFlow < 0 ? 'flow-negative' : 'flow-neutral';
                            return `
                                <div class="table-row">
                                    <div><strong>${borough}</strong></div>
                                    <div>${stats.pickups.toLocaleString()}</div>
                                    <div>${stats.dropoffs.toLocaleString()}</div>
                                    <div class="${flowClass}">${netFlow > 0 ? '+' : ''}${netFlow}</div>
                                    <div>${avgDistance > 0 ? avgDistance.toFixed(1) + ' km' : 'N/A'}</div>
                                    <div>${activityLevel}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('results-content').innerHTML = content;
    }

    /**
     * Render Passenger Patterns
     */
    renderPassengerPatterns(data, filters) {
        const filterLabel = this.getFilterContextLabel(filters);
        const timePeriod = filters.timePeriod || 'all_day';
        const passengerStats = {};
        data.forEach(trip => {
            const count = trip.passenger_count || 1;
            if (!passengerStats[count]) {
                passengerStats[count] = { trips: [], count: 0 };
            }
            passengerStats[count].count++;
            passengerStats[count].trips.push(trip);
        });

        const sortedPassengers = Object.entries(passengerStats).sort((a, b) => b[1].count - a[1].count);
        const soloTrips = passengerStats[1] ? passengerStats[1].count : 0;
        const groupTrips = data.length - soloTrips;
        const avgPassengers = data.reduce((sum, trip) => sum + (trip.passenger_count || 1), 0) / data.length;

        // Context-specific labels for passenger analysis
        let avgLabel, soloLabel, soloDetail, groupLabel, groupDetail, maxLabel;
        
        if (timePeriod === 'morning_rush') {
            avgLabel = 'AVG COMMUTERS PER RIDE';
            soloLabel = 'SOLO COMMUTERS';
            soloDetail = `${((soloTrips / data.length) * 100).toFixed(1)}% commute alone`;
            groupLabel = 'CARPOOL TRIPS';
            groupDetail = `${((groupTrips / data.length) * 100).toFixed(1)}% share rides`;
            maxLabel = 'LARGEST CARPOOL';
        } else if (timePeriod === 'evening_rush') {
            avgLabel = 'AVG PASSENGERS GOING HOME';
            soloLabel = 'SOLO RETURNS';
            soloDetail = `${((soloTrips / data.length) * 100).toFixed(1)}% travel alone`;
            groupLabel = 'GROUP RETURNS';
            groupDetail = `${((groupTrips / data.length) * 100).toFixed(1)}% travel together`;
            maxLabel = 'LARGEST EVENING GROUP';
        } else if (timePeriod === 'afternoon') {
            avgLabel = 'AVG PASSENGERS';
            soloLabel = 'SOLO TRIPS';
            soloDetail = `${((soloTrips / data.length) * 100).toFixed(1)}% of trips`;
            groupLabel = 'GROUP OUTINGS';
            groupDetail = `${((groupTrips / data.length) * 100).toFixed(1)}% of trips`;
            maxLabel = 'LARGEST AFTERNOON GROUP';
        } else if (timePeriod === 'business_hours') {
            avgLabel = 'AVG BUSINESS TRAVELERS';
            soloLabel = 'SOLO BUSINESS TRIPS';
            soloDetail = `${((soloTrips / data.length) * 100).toFixed(1)}% work alone`;
            groupLabel = 'BUSINESS GROUP TRAVEL';
            groupDetail = `${((groupTrips / data.length) * 100).toFixed(1)}% work together`;
            maxLabel = 'LARGEST BUSINESS GROUP';
        } else if (timePeriod === 'night') {
            avgLabel = 'AVG NIGHTTIME PASSENGERS';
            soloLabel = 'SOLO NIGHT TRIPS';
            soloDetail = `${((soloTrips / data.length) * 100).toFixed(1)}% travel alone`;
            groupLabel = 'NIGHT GROUP TRAVEL';
            groupDetail = `${((groupTrips / data.length) * 100).toFixed(1)}% social/party trips`;
            maxLabel = 'LARGEST NIGHT GROUP';
        } else {
            avgLabel = 'AVG PASSENGERS (24H)';
            soloLabel = 'SOLO TRAVELERS';
            soloDetail = `${((soloTrips / data.length) * 100).toFixed(1)}% of trips`;
            groupLabel = 'GROUP TRAVEL';
            groupDetail = `${((groupTrips / data.length) * 100).toFixed(1)}% of trips`;
            maxLabel = 'MAX CAPACITY USED';
        }

        const content = `
            <div class="summary-section">
                <h4>KEY FINDINGS - ${filterLabel}</h4>
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-label">${avgLabel}</div>
                        <div class="summary-value">${avgPassengers.toFixed(1)}</div>
                        <div class="summary-detail">per trip</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">${soloLabel}</div>
                        <div class="summary-value">${soloTrips.toLocaleString()}</div>
                        <div class="summary-detail">${soloDetail}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">${groupLabel}</div>
                        <div class="summary-value">${groupTrips.toLocaleString()}</div>
                        <div class="summary-detail">${groupDetail}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">${maxLabel}</div>
                        <div class="summary-value">${Math.max(...Object.keys(passengerStats).map(Number))}</div>
                        <div class="summary-detail">passengers in one trip</div>
                    </div>
                </div>
            </div>

            <div class="insights-table-section">
                <h4>PASSENGER DISTRIBUTION</h4>
                <div class="insights-table passenger-table">
                    <div class="table-header passenger-header">
                        <div>PASSENGERS</div>
                        <div>TRIPS</div>
                        <div>PERCENTAGE</div>
                        <div>AVG DISTANCE</div>
                        <div>AVG DURATION</div>
                        <div>TRAVEL TYPE</div>
                    </div>
                    <div class="table-body">
                        ${sortedPassengers.map(([passengers, stats]) => {
                            const percentage = ((stats.count / data.length) * 100).toFixed(1);
                            const avgDistance = this.calculateAvgDistance(stats.trips);
                            const avgDuration = this.calculateAvgDuration(stats.trips);
                            const travelType = passengers == 1 ? 'SOLO' : passengers <= 2 ? 'COUPLE' : passengers <= 4 ? 'SMALL GROUP' : 'LARGE GROUP';
                            return `
                                <div class="table-row">
                                    <div><strong>${passengers}</strong></div>
                                    <div>${stats.count.toLocaleString()}</div>
                                    <div>${percentage}%</div>
                                    <div>${avgDistance > 0 ? avgDistance.toFixed(1) + ' km' : 'N/A'}</div>
                                    <div>${avgDuration > 0 ? avgDuration.toFixed(1) + ' min' : 'N/A'}</div>
                                    <div>${travelType}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('results-content').innerHTML = content;
    }

    /**
     * Render Speed Analysis
     */
    renderSpeedAnalysis(data, filters) {
        const filterLabel = this.getFilterContextLabel(filters);
        const speedRange = filters.speedRange || 'all_speeds';
        const validSpeed = data.filter(t => t.speed_kmh && t.speed_kmh > 0);
        const avgSpeed = this.calculateAvgSpeed(data);
        
        const speedRanges = {
            'slow': validSpeed.filter(t => t.speed_kmh < 15).length,
            'normal': validSpeed.filter(t => t.speed_kmh >= 15 && t.speed_kmh < 30).length,
            'fast': validSpeed.filter(t => t.speed_kmh >= 30).length
        };

        const efficiencyTrips = validSpeed.filter(t => t.speed_kmh > 10 && t.speed_kmh < 60).length;
        const efficiencyPercent = validSpeed.length > 0 ? ((efficiencyTrips / validSpeed.length) * 100).toFixed(1) : 0;

        // Context-specific labels for speed analysis
        let avgLabel, avgDetail, effLabel, effDetail, fastLabel, slowLabel;
        
        if (speedRange === 'slow_traffic') {
            avgLabel = 'AVG SLOW TRAFFIC SPEED';
            avgDetail = 'congested routes (0-15 km/h)';
            effLabel = 'CONGESTION SEVERITY';
            effDetail = 'heavily impacted routes';
            fastLabel = 'RELATIVELY FASTER';
            slowLabel = 'SEVERELY CONGESTED';
        } else if (speedRange === 'normal_speed') {
            avgLabel = 'AVG NORMAL SPEED';
            avgDetail = 'standard routes (15-30 km/h)';
            effLabel = 'TYPICAL CITY TRAFFIC';
            effDetail = 'standard urban speeds';
            fastLabel = 'FASTER NORMAL ROUTES';
            slowLabel = 'SLOWER NORMAL ROUTES';
        } else if (speedRange === 'fast_routes') {
            avgLabel = 'AVG FAST ROUTE SPEED';
            avgDetail = 'express routes (30+ km/h)';
            effLabel = 'HIGH-SPEED EFFICIENCY';
            effDetail = 'optimal highway routes';
            fastLabel = 'VERY FAST (40+ km/h)';
            slowLabel = 'MODERATELY FAST (30-40 km/h)';
        } else {
            avgLabel = 'AVERAGE SPEED';
            avgDetail = 'across all routes';
            effLabel = 'EFFICIENCY RATE';
            effDetail = 'optimal speed trips';
            fastLabel = 'FAST ROUTES (30+ km/h)';
            slowLabel = 'SLOW TRAFFIC (<15 km/h)';
        }

        const content = `
            <div class="summary-section">
                <h4>KEY FINDINGS - ${filterLabel}</h4>
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-label">${avgLabel}</div>
                        <div class="summary-value">${avgSpeed.toFixed(1)} km/h</div>
                        <div class="summary-detail">${avgDetail}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">${effLabel}</div>
                        <div class="summary-value">${efficiencyPercent}%</div>
                        <div class="summary-detail">${effDetail}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">${fastLabel}</div>
                        <div class="summary-value">${speedRanges.fast.toLocaleString()}</div>
                        <div class="summary-detail">30+ km/h trips</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">${slowLabel}</div>
                        <div class="summary-value">${speedRanges.slow.toLocaleString()}</div>
                        <div class="summary-detail">under 15 km/h</div>
                    </div>
                </div>
            </div>

            <div class="insights-table-section">
                <h4>SPEED DISTRIBUTION</h4>
                <div class="insights-table speed-table">
                    <div class="table-header speed-header">
                        <div>SPEED RANGE</div>
                        <div>TRIPS</div>
                        <div>PERCENTAGE</div>
                        <div>AVG DISTANCE</div>
                        <div>AVG DURATION</div>
                        <div>ROUTE TYPE</div>
                    </div>
                    <div class="table-body">
                        ${[
                            { range: '0-15 km/h (Slow)', trips: data.filter(t => t.speed_kmh && t.speed_kmh < 15), type: 'City Traffic' },
                            { range: '15-30 km/h (Normal)', trips: data.filter(t => t.speed_kmh && t.speed_kmh >= 15 && t.speed_kmh < 30), type: 'Mixed Roads' },
                            { range: '30-50 km/h (Fast)', trips: data.filter(t => t.speed_kmh && t.speed_kmh >= 30 && t.speed_kmh < 50), type: 'Highway' },
                            { range: '50+ km/h (Very Fast)', trips: data.filter(t => t.speed_kmh && t.speed_kmh >= 50), type: 'Express' }
                        ].map(({ range, trips, type }) => {
                            const count = trips.length;
                            const percentage = validSpeed.length > 0 ? ((count / validSpeed.length) * 100).toFixed(1) : '0.0';
                            const avgDistance = this.calculateAvgDistance(trips);
                            const avgDuration = this.calculateAvgDuration(trips);
                            return `
                                <div class="table-row">
                                    <div>${range}</div>
                                    <div>${count.toLocaleString()}</div>
                                    <div>${percentage}%</div>
                                    <div>${avgDistance > 0 ? avgDistance.toFixed(1) + ' km' : 'N/A'}</div>
                                    <div>${avgDuration > 0 ? avgDuration.toFixed(1) + ' min' : 'N/A'}</div>
                                    <div>${type}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('results-content').innerHTML = content;
    }

    /**
     * Render Weekend vs Weekday Analysis
     */
    renderWeekendVsWeekday(data, filters) {
        const filterLabel = this.getFilterContextLabel(filters);
        const weekendTrips = [];
        const weekdayTrips = [];
        
        data.forEach(trip => {
            if (trip.pickup_datetime) {
                const dayOfWeek = new Date(trip.pickup_datetime).getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
                    weekendTrips.push(trip);
                } else {
                    weekdayTrips.push(trip);
                }
            }
        });

        const weekendAvg = {
            distance: this.calculateAvgDistance(weekendTrips),
            duration: this.calculateAvgDuration(weekendTrips),
            passengers: weekendTrips.reduce((sum, t) => sum + (t.passenger_count || 1), 0) / weekendTrips.length
        };

        const weekdayAvg = {
            distance: this.calculateAvgDistance(weekdayTrips),
            duration: this.calculateAvgDuration(weekdayTrips),
            passengers: weekdayTrips.reduce((sum, t) => sum + (t.passenger_count || 1), 0) / weekdayTrips.length
        };

        const weekendShare = ((weekendTrips.length / data.length) * 100).toFixed(1);
        const weekdayShare = ((weekdayTrips.length / data.length) * 100).toFixed(1);

        const content = `
            <div class="summary-section">
                <h4>KEY FINDINGS - ${filterLabel}</h4>
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-label">WEEKEND TRIPS</div>
                        <div class="summary-value">${weekendTrips.length.toLocaleString()}</div>
                        <div class="summary-detail">${weekendShare}% of total</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">WEEKDAY TRIPS</div>
                        <div class="summary-value">${weekdayTrips.length.toLocaleString()}</div>
                        <div class="summary-detail">${weekdayShare}% of total</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">WEEKEND AVG DISTANCE</div>
                        <div class="summary-value">${weekendAvg.distance.toFixed(1)} km</div>
                        <div class="summary-detail">vs ${weekdayAvg.distance.toFixed(1)} km weekdays</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">WEEKEND AVG PASSENGERS</div>
                        <div class="summary-value">${weekendAvg.passengers.toFixed(1)}</div>
                        <div class="summary-detail">vs ${weekdayAvg.passengers.toFixed(1)} weekdays</div>
                    </div>
                </div>
            </div>

            <div class="insights-table-section">
                <h4>WEEKEND VS WEEKDAY COMPARISON</h4>
                <div class="insights-table weekend-table">
                    <div class="table-header weekend-header">
                        <div>DAY TYPE</div>
                        <div>TRIPS</div>
                        <div>PERCENTAGE</div>
                        <div>AVG DISTANCE</div>
                        <div>AVG DURATION</div>
                        <div>AVG PASSENGERS</div>
                        <div>PATTERN</div>
                    </div>
                    <div class="table-body">
                        <div class="table-row">
                            <div><strong>WEEKEND</strong></div>
                            <div>${weekendTrips.length.toLocaleString()}</div>
                            <div>${weekendShare}%</div>
                            <div>${weekendAvg.distance.toFixed(1)} km</div>
                            <div>${weekendAvg.duration.toFixed(1)} min</div>
                            <div>${weekendAvg.passengers.toFixed(1)}</div>
                            <div>Leisure Travel</div>
                        </div>
                        <div class="table-row">
                            <div><strong>WEEKDAY</strong></div>
                            <div>${weekdayTrips.length.toLocaleString()}</div>
                            <div>${weekdayShare}%</div>
                            <div>${weekdayAvg.distance.toFixed(1)} km</div>
                            <div>${weekdayAvg.duration.toFixed(1)} min</div>
                            <div>${weekdayAvg.passengers.toFixed(1)}</div>
                            <div>Commute/Business</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('results-content').innerHTML = content;
    }

    /**
     * Render Suburban Trips Analysis
     */
    renderSuburbanTrips(data, filters) {
        const filterLabel = this.getFilterContextLabel(filters);
        // Filter trips that likely go outside NYC bounds
        const suburbanTrips = data.filter(trip => {
            const distance = parseFloat(trip.distance_km) || 0;
            return distance > 15; // Likely suburban trips
        });

        const avgSuburbanDistance = this.calculateAvgDistance(suburbanTrips);
        const avgSuburbanDuration = this.calculateAvgDuration(suburbanTrips);
        const suburbanShare = ((suburbanTrips.length / data.length) * 100).toFixed(1);

        const destinationRegions = {};
        suburbanTrips.forEach(trip => {
            if (trip.dropoff_latitude && trip.dropoff_longitude) {
                const region = this.getRegionFromCoords(trip.dropoff_latitude, trip.dropoff_longitude);
                if (!destinationRegions[region]) {
                    destinationRegions[region] = { count: 0, trips: [] };
                }
                destinationRegions[region].count++;
                destinationRegions[region].trips.push(trip);
            }
        });

        const sortedRegions = Object.entries(destinationRegions).sort((a, b) => b[1].count - a[1].count);

        const content = `
            <div class="summary-section">
                <h4>KEY FINDINGS - ${filterLabel}</h4>
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-label">SUBURBAN TRIPS</div>
                        <div class="summary-value">${suburbanTrips.length.toLocaleString()}</div>
                        <div class="summary-detail">${suburbanShare}% of total trips</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">AVG DISTANCE</div>
                        <div class="summary-value">${avgSuburbanDistance.toFixed(1)} km</div>
                        <div class="summary-detail">suburban trips</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">AVG DURATION</div>
                        <div class="summary-value">${avgSuburbanDuration.toFixed(1)} min</div>
                        <div class="summary-detail">suburban trips</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">DESTINATION REGIONS</div>
                        <div class="summary-value">${sortedRegions.length}</div>
                        <div class="summary-detail">different regions</div>
                    </div>
                </div>
            </div>

            <div class="insights-table-section">
                <h4>SUBURBAN DESTINATIONS</h4>
                <div class="insights-table suburban-table">
                    <div class="table-header suburban-header">
                        <div>DESTINATION</div>
                        <div>TRIPS</div>
                        <div>PERCENTAGE</div>
                        <div>AVG DISTANCE</div>
                        <div>AVG DURATION</div>
                        <div>REGION TYPE</div>
                    </div>
                    <div class="table-body">
                        ${sortedRegions.map(([region, stats]) => {
                            const percentage = ((stats.count / suburbanTrips.length) * 100).toFixed(1);
                            const avgDistance = this.calculateAvgDistance(stats.trips);
                            const avgDuration = this.calculateAvgDuration(stats.trips);
                            const regionType = region === 'north' ? 'CT/Westchester' : 
                                             region === 'south' ? 'New Jersey' : 
                                             region === 'east' ? 'Long Island' : 
                                             region === 'west' ? 'New Jersey' : 'Other';
                            return `
                                <div class="table-row">
                                    <div><strong>${region.toUpperCase()}</strong></div>
                                    <div>${stats.count.toLocaleString()}</div>
                                    <div>${percentage}%</div>
                                    <div>${avgDistance.toFixed(1)} km</div>
                                    <div>${avgDuration.toFixed(1)} min</div>
                                    <div>${regionType}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('results-content').innerHTML = content;
    }

    /**
     * Helper method to get borough from coordinates
     */
    getBoroughFromCoords(lat, lon) {
        if (lat >= 40.7 && lat <= 40.8 && lon >= -74.02 && lon <= -73.9) return 'Manhattan';
        if (lat >= 40.6 && lat <= 40.73 && lon >= -74.05 && lon <= -73.85) return 'Brooklyn';
        if (lat >= 40.6 && lat <= 40.8 && lon >= -73.96 && lon <= -73.7) return 'Queens';
        if (lat >= 40.78 && lat <= 40.92 && lon >= -73.93 && lon <= -73.84) return 'Bronx';
        return 'Other';
    }

    /**
     * Helper method to get region from coordinates
     */
    getRegionFromCoords(lat, lon) {
        if (lat > 40.9176) return 'north';
        if (lat < 40.4774) return 'south';
        if (lon < -74.2591) return 'west';
        if (lon > -73.7004) return 'east';
        return 'nyc';
    }

    /**
     * Destroy the component
     */
    destroy() {
        // Clean up event listeners and DOM elements
        const container = document.getElementById('custom-algorithm-container');
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UrbanMobilityInsights;
}
