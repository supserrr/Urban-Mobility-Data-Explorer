# Database Schema

Complete database structure documentation for the Urban Mobility Data Explorer.

## Table of Contents

- [Overview](#overview)
- [Schema Versions](#schema-versions)
- [Tables](#tables)
- [Indexes](#indexes)
- [Views](#views)
- [Functions](#functions)
- [Data Types](#data-types)
- [Query Examples](#query-examples)
- [Performance Optimization](#performance-optimization)

## Overview

### Database Technology

- **DBMS**: PostgreSQL 12+ with PostGIS extension
- **Database Name**: `urban_mobility`
- **Character Set**: UTF-8
- **Collation**: en_US.utf8

### Design Principles

1. **Normalization**: Minimal redundancy with calculated views
2. **Indexing**: Strategic indexes for query performance
3. **Data Integrity**: Constraints and validation functions
4. **Scalability**: Optimized for millions of records
5. **Analytics**: Materialized views for aggregations

### Database Statistics

| Metric | Value |
|--------|-------|
| Total Records | 1,458,641 |
| Database Size | ~500MB (inclusive schema) |
| Table Count | 1 (main table) |
| View Count | 8 (analytics views) |
| Index Count | 25+ (optimized) |
| Function Count | 4 (utility functions) |

## Schema Versions

### Version Comparison

| Feature | Basic | Production | Inclusive |
|---------|-------|------------|-----------|
| **File** | `schema.sql` | `schema_production.sql` | `schema_inclusive.sql` |
| **Data Retention** | ~77% | ~77% | 100% |
| **Quality Tracking** | Limited | Yes | Comprehensive |
| **Raw Data Storage** | No | No | Yes (JSONB) |
| **Size** | Smallest | Medium | Largest |
| **Use Case** | Legacy | Production | Development/Analysis |
| **Recommendation** | Not recommended | Production use | **Recommended** |

### Choosing a Schema

**Use Inclusive Schema** (`schema_inclusive.sql`) when:
- You need complete data retention
- Data quality analysis is important
- Auditing and traceability required
- Research and development environment

**Use Production Schema** (`schema_production.sql`) when:
- Storage space is limited
- Only validated data needed
- Production deployment
- Performance is critical

## Tables

### Main Table: trips

**Purpose**: Store all trip records with quality categorization

**Schema**:

```sql
CREATE TABLE trips (
    -- Primary Key
    id SERIAL PRIMARY KEY,
    
    -- Vendor Information
    vendor_id VARCHAR(10),
    vendor_name VARCHAR(255),
    
    -- Temporal Fields
    pickup_datetime TIMESTAMP,
    dropoff_datetime TIMESTAMP,
    trip_duration INTEGER,  -- seconds
    
    -- Geospatial Fields
    pickup_latitude DOUBLE PRECISION,
    pickup_longitude DOUBLE PRECISION,
    dropoff_latitude DOUBLE PRECISION,
    dropoff_longitude DOUBLE PRECISION,
    pickup_point GEOMETRY(Point, 4326),
    dropoff_point GEOMETRY(Point, 4326),
    
    -- Trip Characteristics
    passenger_count INTEGER,
    store_and_fwd_flag VARCHAR(1),
    
    -- Calculated Geospatial Metrics
    distance_km DOUBLE PRECISION,
    speed_kmh DOUBLE PRECISION,
    
    -- Temporal Features
    pickup_hour INTEGER CHECK (pickup_hour >= 0 AND pickup_hour <= 23),
    pickup_day_of_week INTEGER CHECK (pickup_day_of_week >= 0 AND pickup_day_of_week <= 6),
    pickup_day_of_month INTEGER CHECK (pickup_day_of_month >= 1 AND pickup_day_of_month <= 31),
    pickup_month INTEGER CHECK (pickup_month >= 1 AND pickup_month <= 12),
    pickup_year INTEGER,
    time_of_day time_of_day_type,
    day_type day_type_enum,
    
    -- Business Metrics
    fare_estimate DOUBLE PRECISION,
    fare_per_km DOUBLE PRECISION,
    
    -- Data Quality Fields (Inclusive Schema Only)
    data_category data_category_type,
    data_quality_score INTEGER CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
    data_flags TEXT[],
    validation_issues TEXT[],
    
    -- Boolean Flags
    is_valid_nyc_trip BOOLEAN DEFAULT true,
    is_suburban_trip BOOLEAN DEFAULT false,
    is_micro_trip BOOLEAN DEFAULT false,
    is_extended_trip BOOLEAN DEFAULT false,
    has_anomalies BOOLEAN DEFAULT false,
    
    -- Geographic Flags
    pickup_in_nyc BOOLEAN,
    dropoff_in_nyc BOOLEAN,
    destination_region VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    
    -- Raw Data (Inclusive Schema Only)
    raw_data JSONB
);
```

### Field Descriptions

#### Identity Fields

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | SERIAL | Auto-incrementing primary key | PRIMARY KEY, NOT NULL |

#### Vendor Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `vendor_id` | VARCHAR(10) | Vendor identifier | `"1"`, `"2"` |
| `vendor_name` | VARCHAR(255) | Company name | `"Creative Mobile Technologies"` |

#### Temporal Fields

| Field | Type | Description | Format |
|-------|------|-------------|--------|
| `pickup_datetime` | TIMESTAMP | Trip start time | ISO 8601 |
| `dropoff_datetime` | TIMESTAMP | Trip end time | ISO 8601 |
| `trip_duration` | INTEGER | Duration in seconds | 60-86400 |

#### Geospatial Fields

| Field | Type | Description | Range |
|-------|------|-------------|-------|
| `pickup_latitude` | DOUBLE PRECISION | Pickup latitude | 40.4774 to 40.9176 |
| `pickup_longitude` | DOUBLE PRECISION | Pickup longitude | -74.2591 to -73.7004 |
| `dropoff_latitude` | DOUBLE PRECISION | Dropoff latitude | 40.4774 to 40.9176 |
| `dropoff_longitude` | DOUBLE PRECISION | Dropoff longitude | -74.2591 to -73.7004 |
| `pickup_point` | GEOMETRY | PostGIS point (pickup) | POINT(lng lat) |
| `dropoff_point` | GEOMETRY | PostGIS point (dropoff) | POINT(lng lat) |

#### Calculated Fields

| Field | Type | Description | Calculation |
|-------|------|-------------|-------------|
| `distance_km` | DOUBLE PRECISION | Trip distance | Haversine formula |
| `speed_kmh` | DOUBLE PRECISION | Average speed | distance ÷ (duration/3600) |
| `fare_estimate` | DOUBLE PRECISION | Estimated fare | Base + distance + time |
| `fare_per_km` | DOUBLE PRECISION | Fare efficiency | fare ÷ distance |

#### Data Quality Fields

| Field | Type | Description |
|-------|------|-------------|
| `data_category` | ENUM | Quality category |
| `data_quality_score` | INTEGER | Quality score (0-100) |
| `data_flags` | TEXT[] | Array of quality flags |
| `validation_issues` | TEXT[] | Array of issues |

## Indexes

### Index Strategy

The database uses strategic indexing to optimize query performance while minimizing storage overhead.

### Temporal Indexes

**Optimize time-based queries**:

```sql
-- Pickup datetime (most common filter)
CREATE INDEX idx_trips_pickup_datetime 
    ON trips(pickup_datetime);

-- Dropoff datetime
CREATE INDEX idx_trips_dropoff_datetime 
    ON trips(dropoff_datetime);

-- Hour of day (hourly statistics)
CREATE INDEX idx_trips_pickup_hour 
    ON trips(pickup_hour);

-- Month and year (monthly statistics)
CREATE INDEX idx_trips_pickup_month 
    ON trips(pickup_month, pickup_year);
```

### Geospatial Indexes

**Optimize location-based queries**:

```sql
-- GiST index for spatial queries
CREATE INDEX idx_trips_pickup_point 
    ON trips USING GIST(pickup_point);

CREATE INDEX idx_trips_dropoff_point 
    ON trips USING GIST(dropoff_point);

-- Usage example:
-- Find trips within radius
SELECT * FROM trips
WHERE ST_DWithin(
    pickup_point, 
    ST_MakePoint(-73.985, 40.758), 
    1000  -- 1km radius
);
```

### Categorical Indexes

**Optimize filtering by categories**:

```sql
-- Vendor
CREATE INDEX idx_trips_vendor 
    ON trips(vendor_id);

CREATE INDEX idx_trips_vendor_name 
    ON trips(vendor_name);

-- Data category (inclusive schema)
CREATE INDEX idx_trips_data_category 
    ON trips(data_category);

-- Quality score
CREATE INDEX idx_trips_quality_score 
    ON trips(data_quality_score);
```

### Composite Indexes

**Optimize multi-column queries**:

```sql
-- Common datetime + vendor queries
CREATE INDEX idx_trips_datetime_vendor 
    ON trips(pickup_datetime, vendor_id);

-- Hour and day statistics
CREATE INDEX idx_trips_hour_day 
    ON trips(pickup_hour, pickup_day_of_week);

-- Category and quality filtering
CREATE INDEX idx_trips_category_quality 
    ON trips(data_category, data_quality_score);
```

### Array Indexes

**Optimize array searches** (inclusive schema):

```sql
-- GIN index for data_flags array
CREATE INDEX idx_trips_data_flags 
    ON trips USING GIN(data_flags);

-- Usage example:
-- Find trips with specific flag
SELECT * FROM trips
WHERE data_flags @> ARRAY['micro_trip'];
```

### Partial Indexes

**Optimize specific subsets**:

```sql
-- Index only valid NYC trips
CREATE INDEX idx_trips_valid_nyc 
    ON trips(is_valid_nyc_trip)
    WHERE is_valid_nyc_trip = true;

-- Index only trips with coordinates
CREATE INDEX idx_trips_pickup_datetime_with_coords
    ON trips(pickup_datetime)
    WHERE pickup_latitude IS NOT NULL;
```

### Index Maintenance

**Monitor Index Usage**:

```sql
-- Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

**Rebuild Indexes**:

```sql
-- Rebuild specific index
REINDEX INDEX idx_trips_pickup_datetime;

-- Rebuild all table indexes
REINDEX TABLE trips;

-- Update statistics
ANALYZE trips;
```

## Views

### Hourly Trip Statistics

**Purpose**: Aggregate statistics by hour of day

```sql
CREATE VIEW hourly_trip_stats AS
SELECT 
    pickup_hour,
    COUNT(*) as trip_count,
    ROUND(AVG(trip_duration), 2) as avg_duration,
    ROUND(MIN(trip_duration), 2) as min_duration,
    ROUND(MAX(trip_duration), 2) as max_duration,
    ROUND(AVG(distance_km), 2) as avg_distance,
    ROUND(AVG(speed_kmh), 2) as avg_speed,
    SUM(passenger_count) as total_passengers,
    ROUND(AVG(passenger_count), 2) as avg_passengers
FROM trips
WHERE pickup_datetime IS NOT NULL
GROUP BY pickup_hour
ORDER BY pickup_hour;
```

**Usage**:
```sql
-- Get statistics for specific hour
SELECT * FROM hourly_trip_stats WHERE pickup_hour = 17;

-- Get peak hours
SELECT * FROM hourly_trip_stats 
ORDER BY trip_count DESC 
LIMIT 5;
```

### Monthly Trip Statistics

**Purpose**: Aggregate statistics by month

```sql
CREATE VIEW monthly_trip_stats AS
SELECT 
    pickup_month,
    pickup_year,
    COUNT(*) as trip_count,
    ROUND(AVG(trip_duration), 2) as avg_duration,
    ROUND(AVG(distance_km), 2) as avg_distance,
    ROUND(AVG(speed_kmh), 2) as avg_speed,
    SUM(passenger_count) as total_passengers
FROM trips
WHERE pickup_datetime IS NOT NULL
GROUP BY pickup_month, pickup_year
ORDER BY pickup_year, pickup_month;
```

### Vendor Statistics

**Purpose**: Vendor performance metrics

```sql
CREATE VIEW vendor_stats AS
SELECT 
    vendor_id,
    vendor_name,
    COUNT(*) as trip_count,
    ROUND((COUNT(*)::numeric / 
        (SELECT COUNT(*) FROM trips) * 100), 1) as market_share_percentage,
    ROUND(AVG(distance_km), 2) as avg_distance,
    ROUND(AVG(trip_duration), 2) as avg_duration,
    ROUND(AVG(speed_kmh), 2) as avg_speed,
    SUM(passenger_count) as total_passengers,
    ROUND(AVG(data_quality_score), 2) as avg_quality_score
FROM trips
GROUP BY vendor_id, vendor_name
ORDER BY trip_count DESC;
```

### Category Statistics

**Purpose**: Data quality distribution (inclusive schema)

```sql
CREATE VIEW category_stats AS
SELECT 
    data_category,
    COUNT(*) as record_count,
    ROUND((COUNT(*)::numeric / 
        (SELECT COUNT(*) FROM trips) * 100), 2) as percentage,
    ROUND(AVG(data_quality_score), 2) as avg_quality_score,
    ROUND(AVG(distance_km), 2) as avg_distance,
    ROUND(AVG(trip_duration), 2) as avg_duration
FROM trips
GROUP BY data_category
ORDER BY record_count DESC;
```

### Quality Overview

**Purpose**: Data quality metrics

```sql
CREATE VIEW quality_overview AS
SELECT 
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE data_quality_score >= 80) as high_quality,
    COUNT(*) FILTER (WHERE data_quality_score BETWEEN 60 AND 79) as medium_quality,
    COUNT(*) FILTER (WHERE data_quality_score < 60) as low_quality,
    ROUND(AVG(data_quality_score), 2) as avg_quality_score,
    COUNT(*) FILTER (WHERE is_valid_nyc_trip = true) as valid_nyc_trips,
    COUNT(*) FILTER (WHERE is_suburban_trip = true) as suburban_trips
FROM trips;
```

### Suburban Destinations

**Purpose**: Analyze trips outside NYC bounds

```sql
CREATE VIEW suburban_destinations AS
SELECT 
    destination_region,
    COUNT(*) as trip_count,
    ROUND(AVG(distance_km), 2) as avg_distance,
    ROUND(AVG(trip_duration), 2) as avg_duration,
    ROUND((COUNT(*)::numeric / 
        (SELECT COUNT(*) FROM trips WHERE is_suburban_trip = true) * 100), 2) 
        as percentage
FROM trips
WHERE is_suburban_trip = true
    AND destination_region IS NOT NULL
GROUP BY destination_region
ORDER BY trip_count DESC;
```

## Functions

### Calculate Distance

**Purpose**: Calculate distance between two points using Haversine formula

```sql
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    R CONSTANT DOUBLE PRECISION := 6371; -- Earth radius in km
    dLat DOUBLE PRECISION;
    dLon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);
    
    a := sin(dLat / 2) * sin(dLat / 2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dLon / 2) * sin(dLon / 2);
    
    c := 2 * atan2(sqrt(a), sqrt(1 - a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Usage**:
```sql
-- Calculate distance for a trip
SELECT calculate_distance_km(
    pickup_latitude,
    pickup_longitude,
    dropoff_latitude,
    dropoff_longitude
) as calculated_distance
FROM trips
LIMIT 10;
```

### Validate NYC Coordinates

**Purpose**: Check if coordinates are within NYC bounds

```sql
CREATE OR REPLACE FUNCTION validate_nyc_coordinates(
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN lat >= 40.4774 
       AND lat <= 40.9176
       AND lon >= -74.2591
       AND lon <= -73.7004;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Usage**:
```sql
-- Find trips outside NYC
SELECT COUNT(*) 
FROM trips
WHERE NOT validate_nyc_coordinates(pickup_latitude, pickup_longitude);
```

### Infer Destination Region

**Purpose**: Determine destination for trips outside NYC

```sql
CREATE OR REPLACE FUNCTION infer_destination_region(
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
) RETURNS VARCHAR AS $$
BEGIN
    -- North (Westchester, Connecticut)
    IF lat > 40.9176 THEN
        RETURN 'North (Westchester/Connecticut)';
    END IF;
    
    -- South (New Jersey)
    IF lat < 40.4774 THEN
        RETURN 'South (New Jersey)';
    END IF;
    
    -- West (New Jersey)
    IF lon < -74.2591 THEN
        RETURN 'West (New Jersey)';
    END IF;
    
    -- East (Long Island)
    IF lon > -73.7004 THEN
        RETURN 'East (Long Island)';
    END IF;
    
    RETURN 'Unknown';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Usage**:
```sql
-- Analyze suburban destinations
SELECT 
    infer_destination_region(dropoff_latitude, dropoff_longitude) as region,
    COUNT(*) as trip_count
FROM trips
WHERE is_suburban_trip = true
GROUP BY region
ORDER BY trip_count DESC;
```

### Update Timestamp Trigger

**Purpose**: Automatically update `updated_at` timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Data Types

### Custom Enums

#### Vendor Type

```sql
CREATE TYPE vendor_type AS ENUM ('1', '2');
```

**Values**:
- `'1'` - Creative Mobile Technologies
- `'2'` - VeriFone Inc.

#### Store Flag

```sql
CREATE TYPE store_flag AS ENUM ('Y', 'N');
```

**Values**:
- `'Y'` - Trip record held in vehicle memory before sending
- `'N'` - Trip record sent immediately

#### Data Category

```sql
CREATE TYPE data_category_type AS ENUM (
    'valid_complete',
    'micro_trip',
    'suburban_trip',
    'out_of_bounds',
    'extended_trip',
    'data_anomaly',
    'incomplete_data',
    'processing_error'
);
```

#### Time of Day

```sql
CREATE TYPE time_of_day_type AS ENUM (
    'morning',    -- 6:00-11:59
    'afternoon',  -- 12:00-17:59
    'evening',    -- 18:00-21:59
    'night'       -- 22:00-5:59
);
```

#### Day Type

```sql
CREATE TYPE day_type_enum AS ENUM ('weekday', 'weekend');
```

## Query Examples

### Basic Queries

**Count total trips**:
```sql
SELECT COUNT(*) FROM trips;
```

**Get recent trips**:
```sql
SELECT * FROM trips
ORDER BY pickup_datetime DESC
LIMIT 10;
```

**Find trip by ID**:
```sql
SELECT * FROM trips WHERE id = 123456;
```

### Filtered Queries

**Trips by date range**:
```sql
SELECT * FROM trips
WHERE pickup_datetime >= '2016-01-01'
  AND pickup_datetime < '2016-02-01'
ORDER BY pickup_datetime
LIMIT 100;
```

**Trips by vendor**:
```sql
SELECT * FROM trips
WHERE vendor_id = '1'
LIMIT 100;
```

**Trips by neighborhood** (Manhattan):
```sql
SELECT * FROM trips
WHERE pickup_latitude BETWEEN 40.7 AND 40.8
  AND pickup_longitude BETWEEN -74.02 AND -73.9
LIMIT 100;
```

**High-quality trips only**:
```sql
SELECT * FROM trips
WHERE data_quality_score >= 80
  AND is_valid_nyc_trip = true
LIMIT 100;
```

### Statistical Queries

**Average trip metrics**:
```sql
SELECT 
    COUNT(*) as total_trips,
    ROUND(AVG(distance_km), 2) as avg_distance_km,
    ROUND(AVG(trip_duration), 2) as avg_duration_sec,
    ROUND(AVG(speed_kmh), 2) as avg_speed_kmh,
    ROUND(AVG(passenger_count), 2) as avg_passengers
FROM trips;
```

**Hourly distribution**:
```sql
SELECT 
    pickup_hour,
    COUNT(*) as trip_count,
    ROUND(AVG(distance_km), 2) as avg_distance,
    ROUND(AVG(trip_duration / 60), 2) as avg_duration_min
FROM trips
GROUP BY pickup_hour
ORDER BY pickup_hour;
```

**Monthly trends**:
```sql
SELECT 
    pickup_year,
    pickup_month,
    COUNT(*) as trip_count,
    ROUND(AVG(distance_km), 2) as avg_distance
FROM trips
GROUP BY pickup_year, pickup_month
ORDER BY pickup_year, pickup_month;
```

**Vendor comparison**:
```sql
SELECT * FROM vendor_stats;
```

### Geospatial Queries

**Trips near a point** (within 1km):
```sql
SELECT 
    id,
    distance_km,
    ST_Distance(
        pickup_point,
        ST_SetSRID(ST_MakePoint(-73.985, 40.758), 4326)::geography
    ) as distance_to_point
FROM trips
WHERE ST_DWithin(
    pickup_point::geography,
    ST_SetSRID(ST_MakePoint(-73.985, 40.758), 4326)::geography,
    1000  -- 1km in meters
)
LIMIT 100;
```

**Trips within bounding box**:
```sql
SELECT * FROM trips
WHERE pickup_latitude BETWEEN 40.7 AND 40.8
  AND pickup_longitude BETWEEN -74.0 AND -73.9
LIMIT 100;
```

**Most common routes**:
```sql
SELECT 
    ROUND(pickup_latitude::numeric, 3) as pickup_lat,
    ROUND(pickup_longitude::numeric, 3) as pickup_lon,
    ROUND(dropoff_latitude::numeric, 3) as dropoff_lat,
    ROUND(dropoff_longitude::numeric, 3) as dropoff_lon,
    COUNT(*) as trip_count
FROM trips
GROUP BY 
    ROUND(pickup_latitude::numeric, 3),
    ROUND(pickup_longitude::numeric, 3),
    ROUND(dropoff_latitude::numeric, 3),
    ROUND(dropoff_longitude::numeric, 3)
HAVING COUNT(*) >= 10
ORDER BY trip_count DESC
LIMIT 50;
```

### Data Quality Queries

**Quality score distribution**:
```sql
SELECT 
    CASE 
        WHEN data_quality_score >= 80 THEN 'High'
        WHEN data_quality_score >= 60 THEN 'Medium'
        ELSE 'Low'
    END as quality_tier,
    COUNT(*) as count,
    ROUND(AVG(data_quality_score), 2) as avg_score
FROM trips
GROUP BY quality_tier
ORDER BY avg_score DESC;
```

**Category breakdown**:
```sql
SELECT * FROM category_stats;
```

**Common data flags**:
```sql
SELECT 
    unnest(data_flags) as flag,
    COUNT(*) as occurrence
FROM trips
WHERE array_length(data_flags, 1) > 0
GROUP BY flag
ORDER BY occurrence DESC;
```

**Validation issues**:
```sql
SELECT 
    unnest(validation_issues) as issue,
    COUNT(*) as occurrence
FROM trips
WHERE array_length(validation_issues, 1) > 0
GROUP BY issue
ORDER BY occurrence DESC
LIMIT 20;
```

## Performance Optimization

### Query Optimization

**Use EXPLAIN ANALYZE**:

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM trips
WHERE pickup_datetime >= '2016-01-01'
  AND vendor_id = '1'
LIMIT 100;
```

**Optimize with indexes**:

```sql
-- Before: Sequential scan (slow)
-- After: Index scan (fast)

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_trips_datetime_vendor 
    ON trips(pickup_datetime, vendor_id);

-- Verify index usage
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM trips
WHERE pickup_datetime >= '2016-01-01'
  AND vendor_id = '1'
LIMIT 100;
```

### Connection Pooling

**Configuration** (`backend/src/config/database.js`):

```javascript
const pool = new Pool({
    max: 20,                    // Max connections
    idleTimeoutMillis: 30000,   // 30 seconds
    connectionTimeoutMillis: 2000  // 2 seconds
});
```

**Best Practices**:
- Use connection pooling (don't create new connections per query)
- Release connections after use
- Handle connection errors gracefully

### Batch Operations

**Batch Insert**:

```sql
-- Insert multiple records in one query
INSERT INTO trips (
    vendor_id, pickup_datetime, dropoff_datetime,
    pickup_latitude, pickup_longitude,
    dropoff_latitude, dropoff_longitude,
    trip_duration, passenger_count
) VALUES
    ('1', '2016-01-01 10:00:00', '2016-01-01 10:15:00', 40.75, -73.98, 40.76, -73.97, 900, 1),
    ('1', '2016-01-01 10:05:00', '2016-01-01 10:20:00', 40.76, -73.97, 40.77, -73.96, 900, 2),
    ('2', '2016-01-01 10:10:00', '2016-01-01 10:25:00', 40.77, -73.96, 40.78, -73.95, 900, 1);
```

**Benefits**:
- Reduces round trips
- Improves throughput
- Minimizes overhead

### Database Maintenance

**Vacuum and Analyze**:

```sql
-- Reclaim space and update statistics
VACUUM ANALYZE trips;

-- Full vacuum (requires table lock)
VACUUM FULL trips;
```

**Update Statistics**:

```sql
-- Update query planner statistics
ANALYZE trips;

-- Check last analyze time
SELECT 
    schemaname,
    tablename,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'trips';
```

## Migration Guide

### From Basic to Inclusive Schema

**Step 1**: Backup existing data

```bash
pg_dump urban_mobility > backup_$(date +%Y%m%d).sql
```

**Step 2**: Export existing data

```sql
\copy trips TO 'trips_backup.csv' CSV HEADER;
```

**Step 3**: Drop and recreate

```bash
# Drop existing database
dropdb urban_mobility

# Create new database
createdb urban_mobility

# Initialize with inclusive schema
psql urban_mobility < database/schema_inclusive.sql
```

**Step 4**: Re-import data

```bash
cd scripts
node importDataInclusive.js ../data/raw/train.csv
```

### Schema Updates

**Add new column**:

```sql
-- Add column with default
ALTER TABLE trips 
ADD COLUMN new_field VARCHAR(255) DEFAULT NULL;

-- Create index
CREATE INDEX idx_trips_new_field 
    ON trips(new_field);

-- Update statistics
ANALYZE trips;
```

**Modify column type**:

```sql
-- Change column type
ALTER TABLE trips 
ALTER COLUMN pickup_hour TYPE SMALLINT;
```

**Add constraint**:

```sql
-- Add check constraint
ALTER TABLE trips
ADD CONSTRAINT check_passenger_count 
    CHECK (passenger_count >= 1 AND passenger_count <= 6);
```

## Backup and Recovery

### Backup Database

**Full backup**:

```bash
# Backup entire database
pg_dump urban_mobility > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump urban_mobility | gzip > backup_$(date +%Y%m%d).sql.gz
```

**Table only**:

```bash
# Backup trips table
pg_dump urban_mobility -t trips > trips_backup.sql
```

**Data only** (no schema):

```bash
# Export data as CSV
psql urban_mobility -c "\copy trips TO 'trips_data.csv' CSV HEADER"
```

### Restore Database

**Full restore**:

```bash
# Create database
createdb urban_mobility

# Restore from backup
psql urban_mobility < backup_20251015.sql
```

**Data only**:

```bash
# Import CSV
psql urban_mobility -c "\copy trips FROM 'trips_data.csv' CSV HEADER"
```

### Backup Strategy

**Recommended Schedule**:
- **Daily**: Automated full backup
- **Weekly**: Verify backup integrity
- **Monthly**: Archive backups off-site

**Backup Script**:

```bash
#!/bin/bash
# backup_database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"
FILENAME="urban_mobility_${DATE}.sql.gz"

# Create backup
pg_dump urban_mobility | gzip > "${BACKUP_DIR}/${FILENAME}"

# Verify backup
if [ $? -eq 0 ]; then
    echo "Backup successful: ${FILENAME}"
    
    # Remove backups older than 30 days
    find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +30 -delete
else
    echo "Backup failed!"
    exit 1
fi
```

## Monitoring

### Database Size

```sql
-- Database size
SELECT 
    pg_size_pretty(pg_database_size('urban_mobility')) as database_size;

-- Table size
SELECT 
    pg_size_pretty(pg_total_relation_size('trips')) as table_size,
    pg_size_pretty(pg_table_size('trips')) as data_size,
    pg_size_pretty(pg_indexes_size('trips')) as index_size;
```

### Connection Monitoring

```sql
-- Active connections
SELECT 
    COUNT(*) as connection_count,
    state,
    wait_event_type
FROM pg_stat_activity
WHERE datname = 'urban_mobility'
GROUP BY state, wait_event_type;

-- Long running queries
SELECT 
    pid,
    now() - query_start as duration,
    query,
    state
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < now() - interval '1 minute'
ORDER BY duration DESC;
```

### Performance Metrics

```sql
-- Table access statistics
SELECT 
    schemaname,
    tablename,
    seq_scan as sequential_scans,
    seq_tup_read as sequential_tuples_read,
    idx_scan as index_scans,
    idx_tup_fetch as index_tuples_fetched,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables
WHERE tablename = 'trips';
```

## Best Practices

### Schema Design

1. **Use appropriate data types**
   - `TIMESTAMP` for dates (not VARCHAR)
   - `DOUBLE PRECISION` for coordinates
   - `INTEGER` for counts
   - `BOOLEAN` for flags

2. **Add constraints**
   - Primary keys
   - Check constraints
   - Foreign keys (if applicable)
   - Not null where appropriate

3. **Create strategic indexes**
   - Index frequently filtered columns
   - Use composite indexes for multi-column filters
   - Create partial indexes for subsets

### Query Optimization

1. **Use parameterized queries**
   ```javascript
   // Prevent SQL injection
   await query('SELECT * FROM trips WHERE id = $1', [tripId]);
   ```

2. **Limit result sets**
   ```sql
   -- Always use LIMIT for large tables
   SELECT * FROM trips LIMIT 100;
   ```

3. **Use views for complex queries**
   ```sql
   -- Create view for common aggregation
   CREATE VIEW hourly_stats AS
   SELECT pickup_hour, COUNT(*) FROM trips GROUP BY pickup_hour;
   
   -- Query view (faster)
   SELECT * FROM hourly_stats;
   ```

### Maintenance

1. **Regular vacuuming**
   ```sql
   -- Weekly
   VACUUM ANALYZE trips;
   ```

2. **Monitor index bloat**
   ```sql
   SELECT * FROM pg_stat_user_indexes WHERE tablename = 'trips';
   ```

3. **Update statistics**
   ```sql
   -- After large data changes
   ANALYZE trips;
   ```

## Troubleshooting

### Slow Queries

**Problem**: Query takes too long

**Diagnosis**:
```sql
EXPLAIN ANALYZE SELECT * FROM trips 
WHERE pickup_datetime >= '2016-01-01';
```

**Solutions**:
1. Check if indexes are used
2. Create missing indexes
3. Reduce result set size
4. Optimize WHERE clause

### Disk Space Issues

**Problem**: Database consuming too much space

**Diagnosis**:
```sql
SELECT 
    pg_size_pretty(pg_total_relation_size('trips')) as total_size,
    pg_size_pretty(pg_table_size('trips')) as table_size,
    pg_size_pretty(pg_indexes_size('trips')) as indexes_size;
```

**Solutions**:
1. Run VACUUM FULL
2. Remove unused indexes
3. Archive old data
4. Use production schema

### Connection Pool Exhausted

**Problem**: "Too many connections" error

**Diagnosis**:
```sql
SELECT COUNT(*) FROM pg_stat_activity 
WHERE datname = 'urban_mobility';
```

**Solutions**:
1. Increase pool size
2. Release connections properly
3. Fix connection leaks
4. Increase PostgreSQL max_connections

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [PostgreSQL Performance](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Last Updated**: October 2025  
**Version**: 1.0.0  
**Related**: [Data Processing Guide](data-processing-guide.md), [Architecture](architecture.md)
