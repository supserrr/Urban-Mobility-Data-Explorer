# System Architecture

Technical architecture documentation for the Urban Mobility Data Explorer platform.

## Table of Contents

- [Overview](#overview)
- [Architecture Patterns](#architecture-patterns)
- [System Architecture](#system-architecture)
- [Component Architecture](#component-architecture)
- [Data Architecture](#data-architecture)
- [Security Architecture](#security-architecture)
- [Performance Architecture](#performance-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Development Architecture](#development-architecture)

## Overview

### System Purpose

The Urban Mobility Data Explorer provides analysis and visualization of NYC taxi trip data. The system processes, stores, and visualizes over 1.4 million trip records with optimized performance, security, and data quality.

### Design Principles

1. **Separation of Concerns**: Clear boundaries between presentation, business logic, and data layers
2. **Scalability**: Handles millions of records efficiently with horizontal scaling support
3. **Security First**: API authentication, input validation, and secure configuration
4. **Data Completeness**: 100% data retention with quality categorization
5. **Performance Optimization**: Sub-second response times for interactive queries
6. **Maintainability**: Clean code structure with comprehensive logging

### Key Capabilities

| Capability | Description | Scale |
|------------|-------------|-------|
| Data Processing | Inclusive CSV import with quality categorization | 57,000+ records/sec |
| Data Storage | PostgreSQL with geospatial indexes | 1.4M+ records |
| API Performance | REST API with caching and optimization | Sub-second response |
| Visualization | Interactive maps and charts | Real-time updates |
| Security | API key authentication and rate limiting | Production-grade |

## Architecture Patterns

### Architectural Style

**Three-Tier Architecture** with clear separation:

```
┌────────────────────────────────────┐
│     Presentation Tier              │
│  (Frontend - Static HTML/JS)       │
└─────────────┬──────────────────────┘
              │ HTTP/REST API
              │
┌─────────────▼──────────────────────┐
│     Application Tier               │
│  (Backend - Express.js API)        │
└─────────────┬──────────────────────┘
              │ SQL Queries
              │
┌─────────────▼──────────────────────┐
│     Data Tier                      │
│  (PostgreSQL + PostGIS)            │
└────────────────────────────────────┘
```

### Design Patterns

| Pattern | Implementation | Purpose |
|---------|----------------|---------|
| **MVC** | Controllers, Services, Views | Separation of concerns |
| **Repository** | Services layer | Data access abstraction |
| **Middleware Chain** | Express middleware | Request processing pipeline |
| **Factory** | H3GridGenerator | Object creation |
| **Strategy** | Custom algorithms | Interchangeable algorithms |
| **Singleton** | Database connection pool | Resource management |

### Architectural Decisions

**Decision 1: Vanilla JavaScript Frontend**
- **Rationale**: No build step, faster development, lower complexity
- **Trade-off**: Manual DOM manipulation vs framework abstractions
- **Result**: Simple deployment, easier debugging

**Decision 2: Custom CSV Parser**
- **Rationale**: Full control, RFC 4180 compliance, streaming support
- **Trade-off**: Development time vs exact requirements
- **Result**: 57,000+ records/sec, constant memory usage

**Decision 3: Inclusive Data Processing**
- **Rationale**: Never lose data, understand quality issues
- **Trade-off**: Storage space vs complete audit trail
- **Result**: 100% data retention with categorization

**Decision 4: H3 Hexagonal Grid**
- **Rationale**: Uniform cell sizes, hierarchical aggregation
- **Trade-off**: Learning curve vs superior visualization
- **Result**: Efficient geospatial aggregation

## System Architecture

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Dashboard   │  │  Map View    │  │  Analytics   │        │
│  │  (Chart.js)  │  │  (Leaflet)   │  │  (Custom)    │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                │
│         └──────────────────┴──────────────────┘                │
│                            │                                   │
└────────────────────────────┼────────────────────────────────────┘
                         │ HTTP/REST API
                             │ JSON
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     APPLICATION LAYER                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Express.js API Server (Port 8000)            │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │                                                           │ │
│  │  ┌───────────┐  ┌──────────────┐  ┌─────────────────┐  │ │
│  │  │  Routes   │→ │ Controllers  │→ │   Services      │  │ │
│  │  │  /api/*   │  │ HTTP Handlers│  │ Business Logic  │  │ │
│  │  └───────────┘  └──────────────┘  └─────────────────┘  │ │
│  │                                                           │ │
│  │  ┌──────────────────┐  ┌──────────────────────────────┐  │ │
│  │  │   Middleware     │  │      Utilities               │  │ │
│  │  │ - Auth           │  │ - Custom Algorithms          │  │ │
│  │  │ - Validation     │  │ - H3 Grid Generator          │  │ │
│  │  │ - Rate Limiting  │  │ - CSV Parser                 │  │ │
│  │  │ - Error Handler  │  │ - Data Processor             │  │ │
│  │  └──────────────────┘  └──────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │ PostgreSQL Protocol
                             │ Connection Pool (20 connections)
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                        DATA LAYER                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │        PostgreSQL 12+ Database + PostGIS Extension        │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │                                                           │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │ │
│  │  │   Tables    │  │   Indexes    │  │     Views     │  │ │
│  │  │  - trips    │  │  - B-tree    │  │ - hourly_*    │  │ │
│  │  │             │  │  - GiST      │  │ - monthly_*   │  │ │
│  │  │             │  │  - GIN       │  │ - vendor_*    │  │ │
│  │  └─────────────┘  └──────────────┘  └───────────────┘  │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │            Data: 1,458,641 Trip Records             │ │ │
│  │  │            Size: ~500MB indexed                     │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DATA PROCESSING PIPELINE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CSV File → Custom Parser → Validator → Processor → Database   │
│   191MB      (Streaming)    (Rules)    (Features)    (Batch)   │
│                                                                 │
│  Performance: 57,000+ records/sec                              │
│  Memory: Constant ~50MB                                        │
│  Data Retention: 100%                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Communication Patterns

**Client-Server Communication**:
- Protocol: HTTP/1.1
- Format: JSON
- Authentication: API Key (header or query param)
- Error Format: RFC 7807-inspired

**Database Communication**:
- Protocol: PostgreSQL wire protocol
- Connection Pooling: 20 connections max
- Query Parameterization: All queries parameterized
- Transaction Management: Automatic commits, manual transactions for imports

## Component Architecture

### Frontend Components

#### Dashboard Component

**Purpose**: Main analytics and statistics interface

**Location**: `frontend/components/Dashboard.js`

**Responsibilities**:
- Display trip statistics
- Render interactive charts
- Handle user interactions
- Apply filters and refresh data

**Dependencies**:
- Chart.js for visualizations
- API client for data fetching
- Event system for component communication

**Key Features**:
```javascript
class Dashboard {
    // Initializes charts and data
    init()
    
    // Updates all statistics cards
    updateStatsCards(statistics)
    
    // Refreshes all charts
    updateCharts(statistics)
    
    // Handles timeline chart updates
    updateTimelineChart(chartType, statistics)
}
```

#### Map View Component

**Purpose**: Geographic data visualization

**Location**: `frontend/components/MapView.js`

**Responsibilities**:
- Initialize Leaflet map
- Display heatmap layers
- Handle map interactions
- Manage markers and popups

**Dependencies**:
- Leaflet.js for mapping
- MapTiler for base tiles
- H3 integration for hex grids

**Key Features**:
```javascript
class MapView {
    // Initializes map with base layer
    initializeMap()
    
    // Updates heatmap with trip data
    updateHeatmap(heatmapData, type)
    
    // Adds intensity markers for hotspots
    addHighIntensityMarkers(heatmapData)
    
    // Handles map click events
    handleMapClick(event)
}
```

#### Chart View Component

**Purpose**: Advanced analytics visualizations

**Location**: `frontend/components/ChartView.js`

**Responsibilities**:
- Create complex chart types
- Handle chart interactions
- Export chart images
- Display trends and correlations

**Key Features**:
```javascript
class ChartView {
    // Creates timeline charts
    updateTimelineChart(chartType, statistics)
    
    // Generates correlation matrix
    createCorrelationMatrix(data)
    
    // Shows trend analysis
    createTrendAnalysis(data)
    
    // Exports chart as image
    exportChart(chartId, filename)
}
```

#### Route Manager Component

**Purpose**: Route analysis and visualization

**Location**: `frontend/components/RouteManager.js`

**Responsibilities**:
- Display popular routes
- Interactive route exploration
- Route statistics table
- Export route data

**Key Features**:
```javascript
class RouteManager {
    // Initializes route map
    initializeRouteMap()
    
    // Displays routes on map
    addRoutesToMap(routesData)
    
    // Updates route table
    updateRouteTable(routesData)
    
    // Highlights selected route
    highlightRoute(routeIndex)
}
```

#### Custom Algorithm View Component

**Purpose**: Advanced data insights and discovery

**Location**: `frontend/components/CustomAlgorithmView.js`

**Responsibilities**:
- Execute custom algorithms
- Display insights and patterns
- Filter and analyze data
- Generate detailed reports

**Key Features**:
```javascript
class UrbanMobilityInsights {
    // Discovers patterns in data
    discoverInsights()
    
    // Generates insights based on scope
    generateInsights(data, scope, timePeriod)
    
    // Renders specialized analyses
    renderPeakHourAnalysis(data, filters)
    renderDistancePatternAnalysis(data, filters)
    renderVendorComparison(data, filters)
}
```

### Backend Components

#### API Server

**Purpose**: HTTP request handling and routing

**Location**: `backend/src/server-production.js`

**Architecture**:
```javascript
Express App
├── Middleware Stack
│   ├── Helmet (security headers)
│   ├── CORS (cross-origin)
│   ├── Compression (gzip)
│   ├── Morgan (HTTP logging)
│   ├── Body Parser (JSON/URL-encoded)
│   ├── Rate Limiter (DoS protection)
│   └── Error Handler (centralized errors)
│
├── Routes (/api)
│   ├── /health
│   ├── /docs
│   ├── /config (authenticated)
│   ├── /trips (authenticated)
│   ├── /trips/map (authenticated)
│   ├── /trips/h3-grid (authenticated)
│   ├── /trips/statistics (public)
│   ├── /trips/neighborhoods (public)
│   ├── /trips/vendors (public)
│   ├── /parameters/* (public)
│   └── /map/* (public)
│
└── Database Connection Pool
    └── PostgreSQL (20 connections)
```

#### Controllers

**Purpose**: HTTP request/response handling

**Location**: `backend/src/controllers/tripController.js`

**Responsibilities**:
1. Parse and validate request parameters
2. Call appropriate service methods
3. Format response data
4. Handle errors gracefully
5. Log request/response

**Example**:
```javascript
/**
 * Get trips with filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async getTrips(req, res) {
    try {
        // Parse request parameters
        const filters = this.parseFilters(req.query);
        const pagination = this.parsePagination(req.query);
        
        // Call service
        const result = await this.tripService.getTrips(filters, pagination);
        
        // Send response
        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        // Error handling
        this.handleError(error, res);
    }
}
```

#### Services

**Purpose**: Business logic and data operations

**Location**: `backend/src/services/`

**Components**:

1. **TripService** (`tripService.js`)
   - Core trip data operations
   - Filtering and pagination
   - Statistics calculation
   - H3 grid generation

2. **ParameterService** (`parameterService.js`)
   - Dynamic filter options
   - Parameter validation
   - Usage statistics

3. **DataProcessor** (`DataProcessor.js`)
   - Data validation
   - Feature calculation
   - Quality scoring

4. **H3GridGenerator** (`H3GridGenerator.js`)
   - Hexagonal grid generation
   - Geospatial aggregation
   - Visualization formatting

**Service Pattern**:
```javascript
class TripService {
    /**
     * Get trips with filters and pagination
     * @param {Object} filters - Filter criteria
     * @param {Object} pagination - Pagination params
     * @returns {Promise<Object>} Paginated trips
     */
    async getTrips(filters, pagination) {
        // Build SQL query
        const { whereClause, queryParams } = this.buildWhereClause(filters);
        
        // Execute query
        const result = await query(sql, queryParams);
        
        // Format response
        return this.formatResponse(result, pagination);
    }
}
```

#### Middleware

**Purpose**: Request processing pipeline

**Components**:

1. **Authentication Middleware** (`authMiddleware.js`)
   ```javascript
   /**
    * Validates API key from request headers
    * @param {Object} req - Express request
    * @param {Object} res - Express response
    * @param {Function} next - Next middleware
    */
   const requireApiKey = (req, res, next) => {
       const apiKey = req.headers['x-api-key'] || req.query.api_key;
       
       if (!apiKey) {
           return res.status(401).json({
               success: false,
               message: 'Authentication required'
           });
       }
       
       // Validate key
       if (isValidKey(apiKey)) {
           next();
       } else {
           res.status(403).json({
               success: false,
               message: 'Invalid API key'
           });
       }
   };
   ```

2. **Error Handler** (`errorHandler.js`)
   - Centralized error handling
   - Error logging
   - Client-friendly error messages
   - Stack traces in development

3. **Rate Limiter**
   - 100 requests per 15 minutes (general)
   - 50 requests per 15 minutes (expensive operations)
   - IP-based limiting

#### Utilities

**Purpose**: Reusable helper functions and classes

**Components**:

1. **Custom Algorithms** (`CustomAlgorithms.js`)
   - CustomTripSorter: Hybrid QuickSort + InsertionSort
   - CustomTripFilter: Linear filtering algorithm
   - CustomTripSearch: Binary search for time ranges

2. **Custom CSV Parser** (`CustomCSVParser.js`)
   - RFC 4180 compliant
  - Streaming processing
  - Error tolerance
  - Progress tracking

3. **API Key Generator** (`generateApiKey.js`)
   - Secure key generation
   - Key hashing
   - Bulk generation support

### Database Components

#### Schema Design

**Primary Table: trips**

```sql
CREATE TABLE trips (
    -- Identity
    id SERIAL PRIMARY KEY,
    
    -- Trip Details
    vendor_id VARCHAR(10),
    vendor_name VARCHAR(255),
    pickup_datetime TIMESTAMP,
    dropoff_datetime TIMESTAMP,
    trip_duration INTEGER,  -- seconds
    
    -- Location Data
    pickup_latitude DOUBLE PRECISION,
    pickup_longitude DOUBLE PRECISION,
    dropoff_latitude DOUBLE PRECISION,
    dropoff_longitude DOUBLE PRECISION,
    pickup_point GEOMETRY(Point, 4326),
    dropoff_point GEOMETRY(Point, 4326),
    
    -- Trip Characteristics
    passenger_count INTEGER,
    distance_km DOUBLE PRECISION,
    speed_kmh DOUBLE PRECISION,
    
    -- Temporal Features
    pickup_hour INTEGER,
    pickup_day_of_week INTEGER,
    pickup_month INTEGER,
    pickup_year INTEGER,
    time_of_day time_of_day_type,
    day_type day_type_enum,
    
    -- Data Quality
    data_category data_category_type,
    data_quality_score INTEGER,
    data_flags TEXT[],
    validation_issues TEXT[],
    
    -- Flags
    is_valid_nyc_trip BOOLEAN,
    is_suburban_trip BOOLEAN,
    is_micro_trip BOOLEAN,
    is_extended_trip BOOLEAN,
    has_anomalies BOOLEAN,
    
    -- Metadata
    processed_at TIMESTAMP DEFAULT NOW(),
    raw_data JSONB
);
```

#### Index Strategy

**Temporal Indexes** (B-tree):
```sql
CREATE INDEX idx_trips_pickup_datetime ON trips(pickup_datetime);
CREATE INDEX idx_trips_pickup_hour ON trips(pickup_hour);
CREATE INDEX idx_trips_pickup_month ON trips(pickup_month, pickup_year);
```

**Geospatial Indexes** (GiST):
```sql
CREATE INDEX idx_trips_pickup_point 
    ON trips USING GIST(pickup_point);
CREATE INDEX idx_trips_dropoff_point 
    ON trips USING GIST(dropoff_point);
```

**Categorical Indexes** (B-tree):
```sql
CREATE INDEX idx_trips_vendor ON trips(vendor_id);
CREATE INDEX idx_trips_data_category ON trips(data_category);
CREATE INDEX idx_trips_quality_score ON trips(data_quality_score);
```

**Array Indexes** (GIN):
```sql
CREATE INDEX idx_trips_data_flags 
    ON trips USING GIN(data_flags);
```

**Composite Indexes**:
```sql
CREATE INDEX idx_trips_datetime_vendor 
    ON trips(pickup_datetime, vendor_id);
CREATE INDEX idx_trips_category_quality 
    ON trips(data_category, data_quality_score);
```

#### Views and Materialized Views

**Hourly Statistics View**:
```sql
CREATE VIEW hourly_trip_stats AS
SELECT 
    pickup_hour,
    COUNT(*) as trip_count,
    AVG(trip_duration) as avg_duration,
    AVG(distance_km) as avg_distance,
    AVG(speed_kmh) as avg_speed
FROM trips
WHERE pickup_datetime IS NOT NULL
GROUP BY pickup_hour
ORDER BY pickup_hour;
```

**Vendor Statistics View**:
```sql
CREATE VIEW vendor_stats AS
SELECT 
    vendor_id,
    vendor_name,
    COUNT(*) as trip_count,
    ROUND((COUNT(*)::numeric / 
        (SELECT COUNT(*) FROM trips) * 100), 1) as percentage,
    AVG(distance_km) as avg_distance,
    AVG(trip_duration) as avg_duration,
    AVG(data_quality_score) as avg_quality_score
FROM trips
GROUP BY vendor_id, vendor_name
ORDER BY trip_count DESC;
```

## Data Architecture

### Data Flow

**Import Pipeline**:

```
┌─────────────┐
│  CSV File   │ (191 MB, 1.4M records)
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│   Custom CSV Parser         │
│   - Streaming (64KB chunks) │
│   - RFC 4180 compliant      │
│   - Batch grouping (1000)   │
└──────┬──────────────────────┘
       │ Record objects
       ▼
┌─────────────────────────────┐
│   Data Processor            │
│   - Parse types             │
│   - Validate rules          │
│   - Calculate features      │
│   - Categorize quality      │
└──────┬──────────────────────┘
       │ Enriched records
       ▼
┌─────────────────────────────┐
│   Database Insertion        │
│   - Batch insert (1000)     │
│   - Transaction safety      │
│   - Index updates           │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   PostgreSQL Database       │
│   - 1,458,641 records       │
│   - 100% retention          │
│   - Indexed & optimized     │
└─────────────────────────────┘

Performance: 57,000+ records/sec
Memory: Constant ~50MB
Duration: ~25 seconds for full import
```

**Query Pipeline**:

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │ HTTP GET /api/trips?filters...
       ▼
┌──────────────────┐
│   Middleware     │
│   - Auth         │
│   - Validation   │
│   - Rate Limit   │
└──────┬───────────┘
       │ Validated request
       ▼
┌──────────────────┐
│   Controller     │
│   - Parse params │
│   - Call service │
└──────┬───────────┘
       │ Filters + Pagination
       ▼
┌──────────────────────┐
│   Service Layer      │
│   - Build SQL        │
│   - Execute query    │
│   - Format response  │
└──────┬───────────────┘
       │ SQL query
       ▼
┌──────────────────────┐
│   Database           │
│   - Query planner    │
│   - Index usage      │
│   - Result set       │
└──────┬───────────────┘
       │ Raw data
       ▼
┌──────────────────────┐
│   Response           │
│   - JSON format      │
│   - Pagination meta  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────┐
│   Client         │
└──────────────────┘

Response Time: < 100ms typical
Cache: None (real-time data)
```

### Data Models

**Trip Record** (Application Model):

```javascript
{
    // Identity
    id: 123456,
    
    // Vendor
    vendor_id: "1",
    vendor_name: "Creative Mobile Technologies",
    
    // Temporal
    pickup_datetime: "2016-03-14T17:24:55Z",
    dropoff_datetime: "2016-03-14T17:32:30Z",
    trip_duration: 455,  // seconds
    pickup_hour: 17,
    pickup_day_of_week: 1,  // Monday
    pickup_month: 3,
    pickup_year: 2016,
    time_of_day: "afternoon",
    day_type: "weekday",
    
    // Geospatial
    pickup_latitude: 40.7589,
    pickup_longitude: -73.9851,
    dropoff_latitude: 40.7614,
    dropoff_longitude: -73.9776,
    
    // Trip Metrics
    passenger_count: 1,
    distance_km: 2.34,
    speed_kmh: 18.5,
    fare_estimate: 12.50,
    fare_per_km: 5.34,
    
    // Data Quality
    data_category: "valid_complete",
    data_quality_score: 95,
    data_flags: [],
    validation_issues: [],
    is_valid_nyc_trip: true,
    is_suburban_trip: false,
    
    // Metadata
    processed_at: "2025-10-15T10:30:00Z"
}
```

**H3 Grid Cell** (Visualization Model):

```javascript
{
    // H3 Identifier
    h3: "88283082bffffff",
    
    // Metrics
    pickups: 1247,
    dropoffs: 1193,
    total: 2440,
    intensity: 2440,
    
    // Ratios
    pickup_ratio: 0.511,
    dropoff_ratio: 0.489,
    dominant_type: "pickup",
    
    // Geometry
    center: {
        lat: 40.7589,
        lng: -73.9851
    },
    boundary: [
        [40.7595, -73.9855],
        [40.7593, -73.9840],
        // ... 6 vertices total
    ]
}
```

### Data Categories

The system categorizes all data into quality tiers:

| Category | Description | Percentage | Retention |
|----------|-------------|------------|-----------|
| `valid_complete` | Standard NYC trips, all data valid | ~77% | Permanent |
| `micro_trip` | Very short trips (< 60 seconds) | ~8% | Permanent |
| `suburban_trip` | Trips to/from suburbs | ~6% | Permanent |
| `extended_trip` | Very long trips (> 24 hours) | ~2% | Permanent |
| `out_of_bounds` | Both locations outside NYC | ~4% | Permanent |
| `data_anomaly` | Data quality issues | ~2% | Permanent |
| `incomplete_data` | Missing required fields | ~1% | Permanent |

**Total Retention**: 100% (all data preserved with categorization)

## Security Architecture

### Authentication Flow

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │ 1. Request with X-API-Key header
       ▼
┌──────────────────────┐
│   Rate Limiter       │ 2. Check request rate
└──────┬───────────────┘
       │ 3. Within limits
       ▼
┌──────────────────────┐
│   Auth Middleware    │ 4. Validate API key
└──────┬───────────────┘
       │ 5. Key valid
       ▼
┌──────────────────────┐
│   Controller         │ 6. Process request
└──────┬───────────────┘
       │ 7. Response
       ▼
┌──────────────┐
│   Client     │
└──────────────┘

Protected Endpoints: /api/config, /api/trips, /api/trips/map, /api/trips/h3-grid
Public Endpoints: /api/health, /api/docs, /api/trips/statistics
```

### Security Layers

**Layer 1: Network Security**
- CORS configuration (allowed origins only)
- Helmet.js security headers
- HTTPS in production

**Layer 2: Authentication**
- API key-based authentication
- Constant-time comparison (timing attack protection)
- Key rotation support

**Layer 3: Authorization**
- Public vs protected endpoints
- Rate limiting per IP
- Different limits for authenticated users

**Layer 4: Input Validation**
- express-validator for all inputs
- Parameter type checking
- Range validation
- SQL injection prevention (parameterized queries)

**Layer 5: Data Protection**
- Environment variables for secrets
- .gitignore for .env files
- No sensitive data in logs

### Security Configuration

**API Key Generation**:
```bash
node src/utils/generateApiKey.js
# Generates: 64-character hex string
# Storage: .env file (never committed)
```

**Environment Variables**:
```bash
# Authentication
API_KEYS=key1,key2,key3

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Database (never hardcode)
DB_PASSWORD=secure_password_here
```

## Performance Architecture

### Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| API Response Time | < 200ms | < 100ms avg |
| Database Query | < 50ms | < 30ms avg |
| Data Import Speed | > 10,000 rec/s | 57,000+ rec/s |
| Frontend Load | < 2s | < 1s |
| Concurrent Users | 100+ | Tested 100+ |

### Optimization Strategies

**Database Optimization**:
1. Strategic indexing (B-tree, GiST, GIN)
2. Query result caching (views)
3. Connection pooling (20 connections)
4. Query optimization (EXPLAIN ANALYZE)

**API Optimization**:
1. Pagination (prevent large result sets)
2. Compression (gzip middleware)
3. Rate limiting (prevent abuse)
4. Selective field loading

**Frontend Optimization**:
1. Lazy loading (load on demand)
2. Data sampling (H3 grid aggregation)
3. Canvas rendering (Chart.js)
4. Debounced filtering

**Data Processing Optimization**:
1. Streaming parsing (constant memory)
2. Batch insertion (1000 records)
3. Transaction batching
4. Parallel processing support

### Caching Strategy

**No application caching** (current design):
- Data changes infrequently
- Real-time accuracy preferred
- Database views provide aggregation

**Future caching opportunities**:
- Redis for API responses
- CDN for static assets
- Browser caching for tiles

## Deployment Architecture

### Development Environment

```
┌────────────────────────────────────┐
│   Developer Workstation            │
├────────────────────────────────────┤
│                                    │
│  ┌──────────────┐  ┌────────────┐ │
│  │  Backend     │  │  Frontend  │ │
│  │  Port 8000   │  │  Port 3000 │ │
│  │  (nodemon)   │  │  (Python)  │ │
│  └──────────────┘  └────────────┘ │
│                                    │
│  ┌─────────────────────────────┐  │
│  │  PostgreSQL (localhost)     │  │
│  │  Port 5432                  │  │
│  └─────────────────────────────┘  │
│                                    │
│  Data: data/raw/train.csv         │
│  Logs: logs/                      │
└────────────────────────────────────┘
```

### Production Environment

```
┌────────────────────────────────────────────────────────┐
│                  Load Balancer / Reverse Proxy         │
│                  (nginx/Apache)                        │
│                  SSL Termination                       │
└────────────────────┬───────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌───────────────┐
│  Web Server 1 │         │  Web Server 2 │
│  (Frontend)   │         │  (Frontend)   │
│  Static Files │         │  Static Files │
└───────────────┘         └───────────────┘

┌───────────────┐         ┌───────────────┐
│  API Server 1 │         │  API Server 2 │
│  (Backend)    │         │  (Backend)    │
│  Node.js      │         │  Node.js      │
└───────┬───────┘         └───────┬───────┘
        │                         │
        └────────────┬────────────┘
                     │
                     ▼
┌────────────────────────────────────────┐
│         PostgreSQL Master              │
│         (Primary Database)             │
└────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────┐
│         PostgreSQL Replica             │
│         (Read-only backup)             │
└────────────────────────────────────────┘
```

### Deployment Process

**Step 1: Prepare Environment**
```bash
# Set production environment
export NODE_ENV=production

# Set secrets
export DB_PASSWORD=secure_password
export API_KEYS=production_key_1,production_key_2
export MAPTILER_API_KEY=production_maptiler_key
```

**Step 2: Deploy Backend**
```bash
# Install dependencies
cd backend
npm ci --production

# Run database migrations
npm run migrate

# Start server
npm start
```

**Step 3: Deploy Frontend**
```bash
# Copy static files to web server
cp -r frontend/* /var/www/html/

# Configure web server
# nginx/Apache to serve static files
```

**Step 4: Verify Deployment**
```bash
# Test health endpoint
curl https://yourdomain.com/api/health

# Test authenticated endpoint
curl -H "X-API-Key: key" https://yourdomain.com/api/config
```

### Monitoring

**Application Monitoring**:
- Winston logs (error.log, combined.log, http.log)
- API response times
- Error rates
- Database query performance

**Infrastructure Monitoring**:
- CPU usage
- Memory usage
- Disk space
- Network traffic
- Database connections

**Logging Strategy**:
```javascript
// Log levels
logger.error('Critical error');  // Always logged
logger.warn('Warning message');  // Production
logger.info('Info message');     // Production
logger.http('HTTP request');     // Production
logger.debug('Debug details');   // Development only
```

## Development Architecture

### Project Structure

```
Urban-Mobility-Data-Explorer/
│
├── backend/                  # Backend application
│   ├── src/
│   │   ├── config/          # Configuration modules
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utilities and helpers
│   ├── logs/                # Application logs
│   ├── .env                 # Environment variables (not tracked)
│   └── package.json         # Dependencies
│
├── frontend/                # Frontend application
│   ├── components/          # UI components
│   ├── styles/              # CSS stylesheets
│   ├── utils/               # Client-side utilities
│   ├── index.html           # Map view
│   └── dashboard.html       # Dashboard view
│
├── database/                # Database schemas
│   ├── schema_inclusive.sql # Full-featured schema
│   ├── schema_production.sql# Production schema
│   └── migrations/          # Database migrations
│
├── scripts/                 # Utility scripts
│   ├── importDataInclusive.js  # Data importer
│   ├── start-servers.sh     # Server management
│   └── stop-servers.sh      # Server management
│
├── data/                    # Data storage
│   ├── raw/                 # Source CSV files
│   ├── processed/           # Processed data
│   └── temp/                # Temporary files
│
├── docs/                    # Documentation
│   └── *.md                 # Markdown documentation
│
└── logs/                    # Project-wide logs
```

### Development Workflow

```
┌──────────────┐
│  Code Change │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Git Commit  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Local Test  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Git Push    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Code Review │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Merge       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Deploy      │
└──────────────┘
```

### API Documentation Standards

All API endpoints documented with:
- Purpose and description
- HTTP method and path
- Authentication requirements
- Request parameters
- Response format
- Error codes
- Example requests/responses

Example:
```javascript
/**
 * Get trips with filtering and pagination
 * 
 * @route GET /api/trips
 * @auth Required - API Key
 * 
 * @param {string} [startDate] - ISO date string
 * @param {string} [endDate] - ISO date string
 * @param {number} [page=1] - Page number
 * @param {number} [limit=100] - Records per page
 * 
 * @returns {Object} Response
 * @returns {boolean} success - Operation status
 * @returns {Array} data - Trip records
 * @returns {Object} pagination - Pagination metadata
 * 
 * @example
 * GET /api/trips?startDate=2016-01-01&limit=10
 * 
 * @error {401} Authentication required
 * @error {400} Invalid parameters
 * @error {500} Internal server error
 */
```

## Scalability Considerations

### Current Limits

| Resource | Current | Scalable To |
|----------|---------|-------------|
| Records | 1.4M | 100M+ |
| Concurrent Users | 100 | 10,000+ |
| API Requests | 100/15min | Configurable |
| Database Size | 500MB | Multi-TB |

### Horizontal Scaling

**API Servers**: Add more Node.js instances
- Use load balancer (nginx/HAProxy)
- Stateless design (no session storage)
- Shared database connection

**Database**: Read replicas
- Master for writes
- Replicas for reads
- Connection pooling

**Frontend**: CDN and static hosting
- CloudFront/Cloudflare
- Geographic distribution
- Asset caching

### Vertical Scaling

**Database**: Increase resources
- More RAM for caching
- Faster CPU for queries
- SSD for disk I/O

**API Server**: Increase resources
- More CPU cores (cluster mode)
- More RAM for caching
- Better network bandwidth

## Future Enhancements

### Planned Improvements

1. **Caching Layer**
   - Redis for API responses
   - Browser caching
   - CDN for static assets

2. **Real-time Updates**
   - WebSocket support
   - Server-sent events
   - Live data streaming

3. **Advanced Analytics**
   - Machine learning predictions
   - Anomaly detection
   - Trend forecasting

4. **Enhanced Security**
   - OAuth 2.0 support
   - Role-based access control
   - Audit logging

5. **Performance**
   - GraphQL API option
   - ElasticSearch for search
   - Time-series database for metrics

---

**Last Updated**: October 2025  
**Version**: 1.0.0  
**Maintainer**: Shima Serein
