-- ============================================================================
-- URBAN MOBILITY DATA EXPLORER - PRIMARY DATABASE SCHEMA
-- ============================================================================
-- This is the RECOMMENDED schema for all new deployments.
-- Legacy schemas (schema.sql, schema_production.sql) are deprecated.
-- ============================================================================
--
-- Urban Mobility Data Explorer - INCLUSIVE Database Schema
-- PostgreSQL Database Schema with FULL categorization support
-- Stores ALL records without leaving anything behind
--
-- Key Features:
-- - 100% data inclusion (no records rejected)
-- - Comprehensive categorization system
-- - Data quality scoring
-- - Extensive indexing for performance
-- - Rich analytical views
-- - Helper functions for common operations
--
-- Create database (run this separately)
-- CREATE DATABASE urban_mobility;

-- Use the database
-- \c urban_mobility;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create enum types
CREATE TYPE vendor_type AS ENUM ('1', '2');
CREATE TYPE store_flag AS ENUM ('Y', 'N');

-- Create data category enum (for our inclusive processing)
CREATE TYPE data_category_type AS ENUM (
    'valid_complete',      -- Normal NYC trips
    'micro_trip',          -- < 60 seconds
    'suburban_trip',       -- Outside NYC bounds
    'out_of_bounds',       -- Both pickup/dropoff outside
    'extended_trip',       -- > 24 hours
    'data_anomaly',        -- Data quality issues
    'incomplete_data'      -- Missing required fields
);

-- Create time of day enum
CREATE TYPE time_of_day_type AS ENUM ('morning', 'afternoon', 'evening', 'night');

-- Create day type enum
CREATE TYPE day_type_enum AS ENUM ('weekday', 'weekend');

-- Main trips table with FULL inclusive support
CREATE TABLE trips (
    -- Primary key
    id SERIAL PRIMARY KEY,
    
    -- Original CSV fields
    original_id VARCHAR(50) NOT NULL,  -- Original CSV ID
    vendor_id VARCHAR(10),              -- Allow non-standard vendors
    vendor_name VARCHAR(100),           -- Vendor company name (CMT, VeriFone)
    pickup_datetime TIMESTAMP WITH TIME ZONE,
    dropoff_datetime TIMESTAMP WITH TIME ZONE,
    passenger_count INTEGER,            -- Allow 0 for anomalies
    pickup_longitude DECIMAL(10, 8),
    pickup_latitude DECIMAL(11, 8),
    dropoff_longitude DECIMAL(10, 8),
    dropoff_latitude DECIMAL(11, 8),
    store_and_fwd_flag VARCHAR(5),     -- Allow non-standard flags
    trip_duration INTEGER,              -- Allow any duration
    
    -- Calculated/Derived fields
    distance_km DECIMAL(8, 3),
    speed_kmh DECIMAL(6, 2),
    fare_estimate DECIMAL(8, 2),
    fare_per_km DECIMAL(8, 2),
    
    -- Temporal features
    pickup_hour INTEGER,
    pickup_day_of_week INTEGER,
    pickup_day_of_month INTEGER,
    pickup_month INTEGER,
    pickup_year INTEGER,
    time_of_day time_of_day_type,
    day_type day_type_enum,
    
    -- INCLUSIVE CATEGORIZATION (NEW!)
    data_category data_category_type NOT NULL DEFAULT 'valid_complete',
    data_quality_score INTEGER CHECK (data_quality_score BETWEEN 0 AND 100),
    
    -- Boolean flags for easy querying
    is_valid_nyc_trip BOOLEAN DEFAULT true,
    is_suburban_trip BOOLEAN DEFAULT false,
    is_micro_trip BOOLEAN DEFAULT false,
    is_extended_trip BOOLEAN DEFAULT false,
    has_anomalies BOOLEAN DEFAULT false,
    
    -- Data flags array (stores multiple flags)
    data_flags TEXT[],
    
    -- Validation issues (human-readable)
    validation_issues TEXT[],
    
    -- Geospatial data
    pickup_point GEOMETRY(POINT, 4326),
    dropoff_point GEOMETRY(POINT, 4326),
    
    -- Geographic categorization
    pickup_in_nyc BOOLEAN,
    dropoff_in_nyc BOOLEAN,
    destination_region VARCHAR(50),  -- 'north', 'south', 'east', 'west', 'nyc'
    
    -- Raw data (JSONB for flexibility)
    raw_data JSONB,
    
    -- Metadata
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance

-- Time-based indexes
CREATE INDEX idx_trips_pickup_datetime ON trips(pickup_datetime) WHERE pickup_datetime IS NOT NULL;
CREATE INDEX idx_trips_dropoff_datetime ON trips(dropoff_datetime) WHERE dropoff_datetime IS NOT NULL;
CREATE INDEX idx_trips_pickup_hour ON trips(pickup_hour) WHERE pickup_hour IS NOT NULL;
CREATE INDEX idx_trips_pickup_day ON trips(pickup_day_of_week) WHERE pickup_day_of_week IS NOT NULL;
CREATE INDEX idx_trips_pickup_month ON trips(pickup_month, pickup_year) WHERE pickup_month IS NOT NULL;

-- Numeric field indexes
CREATE INDEX idx_trips_passenger_count ON trips(passenger_count) WHERE passenger_count IS NOT NULL;
CREATE INDEX idx_trips_trip_duration ON trips(trip_duration) WHERE trip_duration IS NOT NULL;
CREATE INDEX idx_trips_distance ON trips(distance_km) WHERE distance_km IS NOT NULL;
CREATE INDEX idx_trips_speed ON trips(speed_kmh) WHERE speed_kmh IS NOT NULL;
CREATE INDEX idx_trips_quality_score ON trips(data_quality_score);

-- Categorical indexes
CREATE INDEX idx_trips_vendor ON trips(vendor_id);
CREATE INDEX idx_trips_vendor_name ON trips(vendor_name);
CREATE INDEX idx_trips_data_category ON trips(data_category);
CREATE INDEX idx_trips_time_of_day ON trips(time_of_day);
CREATE INDEX idx_trips_day_type ON trips(day_type);

-- Boolean flag indexes (for filtering)
CREATE INDEX idx_trips_valid_nyc ON trips(is_valid_nyc_trip);
CREATE INDEX idx_trips_suburban ON trips(is_suburban_trip);
CREATE INDEX idx_trips_micro ON trips(is_micro_trip);
CREATE INDEX idx_trips_extended ON trips(is_extended_trip);
CREATE INDEX idx_trips_anomalies ON trips(has_anomalies);

-- Geographic indexes
CREATE INDEX idx_trips_pickup_in_nyc ON trips(pickup_in_nyc);
CREATE INDEX idx_trips_dropoff_in_nyc ON trips(dropoff_in_nyc);
CREATE INDEX idx_trips_destination_region ON trips(destination_region);

-- Array indexes (for flag searches)
CREATE INDEX idx_trips_data_flags ON trips USING GIN(data_flags);

-- Geospatial indexes
CREATE INDEX idx_trips_pickup_point ON trips USING GIST(pickup_point) WHERE pickup_point IS NOT NULL;
CREATE INDEX idx_trips_dropoff_point ON trips USING GIST(dropoff_point) WHERE dropoff_point IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_trips_datetime_vendor ON trips(pickup_datetime, vendor_id) 
    WHERE pickup_datetime IS NOT NULL;
CREATE INDEX idx_trips_hour_day ON trips(pickup_hour, pickup_day_of_week) 
    WHERE pickup_hour IS NOT NULL AND pickup_day_of_week IS NOT NULL;
CREATE INDEX idx_trips_category_quality ON trips(data_category, data_quality_score);
CREATE INDEX idx_trips_category_valid ON trips(data_category, is_valid_nyc_trip);

-- JSONB index for raw data queries
CREATE INDEX idx_trips_raw_data ON trips USING GIN(raw_data);

-- ============================================================================
-- ANALYTICS VIEWS
-- ============================================================================

-- All trips (including categorized)
CREATE VIEW all_trips_stats AS
SELECT 
    COUNT(*) as total_trips,
    COUNT(*) FILTER (WHERE is_valid_nyc_trip) as valid_nyc_trips,
    COUNT(*) FILTER (WHERE is_suburban_trip) as suburban_trips,
    COUNT(*) FILTER (WHERE is_micro_trip) as micro_trips,
    COUNT(*) FILTER (WHERE is_extended_trip) as extended_trips,
    COUNT(*) FILTER (WHERE has_anomalies) as anomaly_trips,
    AVG(data_quality_score) as avg_quality_score,
    AVG(trip_duration) FILTER (WHERE trip_duration IS NOT NULL) as avg_duration,
    AVG(distance_km) FILTER (WHERE distance_km IS NOT NULL) as avg_distance,
    AVG(speed_kmh) FILTER (WHERE speed_kmh IS NOT NULL) as avg_speed
FROM trips;

-- Stats by category
CREATE VIEW category_stats AS
SELECT 
    data_category,
    COUNT(*) as trip_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM trips), 2) as percentage,
    AVG(data_quality_score) as avg_quality_score,
    AVG(trip_duration) FILTER (WHERE trip_duration IS NOT NULL) as avg_duration,
    AVG(distance_km) FILTER (WHERE distance_km IS NOT NULL) as avg_distance,
    AVG(speed_kmh) FILTER (WHERE speed_kmh IS NOT NULL) as avg_speed
FROM trips
GROUP BY data_category
ORDER BY trip_count DESC;

-- Hourly trip stats (valid trips only)
CREATE VIEW hourly_trip_stats AS
SELECT 
    pickup_hour,
    COUNT(*) as trip_count,
    AVG(trip_duration) as avg_duration,
    AVG(distance_km) as avg_distance,
    AVG(speed_kmh) as avg_speed,
    SUM(passenger_count) as total_passengers,
    AVG(data_quality_score) as avg_quality
FROM trips 
WHERE pickup_hour IS NOT NULL 
    AND is_valid_nyc_trip = true
GROUP BY pickup_hour
ORDER BY pickup_hour;

-- Hourly stats including ALL categories
CREATE VIEW hourly_all_trips AS
SELECT 
    pickup_hour,
    data_category,
    COUNT(*) as trip_count,
    AVG(trip_duration) as avg_duration,
    AVG(distance_km) as avg_distance,
    AVG(speed_kmh) as avg_speed
FROM trips 
WHERE pickup_hour IS NOT NULL
GROUP BY pickup_hour, data_category
ORDER BY pickup_hour, data_category;

-- Daily trip stats
CREATE VIEW daily_trip_stats AS
SELECT 
    pickup_day_of_week,
    COUNT(*) as trip_count,
    AVG(trip_duration) as avg_duration,
    AVG(distance_km) as avg_distance,
    AVG(speed_kmh) as avg_speed,
    SUM(passenger_count) as total_passengers,
    AVG(data_quality_score) as avg_quality
FROM trips 
WHERE pickup_day_of_week IS NOT NULL 
    AND is_valid_nyc_trip = true
GROUP BY pickup_day_of_week
ORDER BY pickup_day_of_week;

-- Monthly trip stats
CREATE VIEW monthly_trip_stats AS
SELECT 
    pickup_month,
    pickup_year,
    COUNT(*) as trip_count,
    AVG(trip_duration) as avg_duration,
    AVG(distance_km) as avg_distance,
    AVG(speed_kmh) as avg_speed,
    SUM(passenger_count) as total_passengers,
    AVG(data_quality_score) as avg_quality
FROM trips 
WHERE pickup_month IS NOT NULL 
    AND pickup_year IS NOT NULL
    AND is_valid_nyc_trip = true
GROUP BY pickup_month, pickup_year
ORDER BY pickup_year, pickup_month;

-- Suburban trip destinations
CREATE VIEW suburban_destinations AS
SELECT 
    destination_region,
    COUNT(*) as trip_count,
    AVG(distance_km) as avg_distance,
    AVG(trip_duration) as avg_duration,
    AVG(data_quality_score) as avg_quality
FROM trips
WHERE is_suburban_trip = true 
    AND destination_region IS NOT NULL
GROUP BY destination_region
ORDER BY trip_count DESC;

-- Data quality overview
CREATE VIEW quality_overview AS
SELECT 
    CASE 
        WHEN data_quality_score >= 90 THEN 'Excellent (90-100)'
        WHEN data_quality_score >= 70 THEN 'Good (70-89)'
        WHEN data_quality_score >= 50 THEN 'Fair (50-69)'
        ELSE 'Poor (0-49)'
    END as quality_tier,
    COUNT(*) as trip_count,
    AVG(data_quality_score) as avg_score,
    MIN(data_quality_score) as min_score,
    MAX(data_quality_score) as max_score
FROM trips
WHERE data_quality_score IS NOT NULL
GROUP BY quality_tier
ORDER BY avg_score DESC;

-- Vendor statistics
CREATE VIEW vendor_stats AS
SELECT 
    vendor_id,
    vendor_name,
    COUNT(*) as trip_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM trips), 2) as market_share_percentage,
    AVG(trip_duration) FILTER (WHERE trip_duration IS NOT NULL) as avg_duration,
    AVG(distance_km) FILTER (WHERE distance_km IS NOT NULL) as avg_distance,
    AVG(speed_kmh) FILTER (WHERE speed_kmh IS NOT NULL) as avg_speed,
    SUM(passenger_count) FILTER (WHERE passenger_count IS NOT NULL) as total_passengers,
    AVG(data_quality_score) as avg_quality_score
FROM trips
WHERE vendor_id IS NOT NULL
GROUP BY vendor_id, vendor_name
ORDER BY trip_count DESC;

-- Flag frequency analysis
CREATE VIEW flag_frequency AS
SELECT 
    unnest(data_flags) as flag,
    COUNT(*) as occurrence_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM trips WHERE data_flags IS NOT NULL AND array_length(data_flags, 1) > 0), 2) as percentage
FROM trips
WHERE data_flags IS NOT NULL 
    AND array_length(data_flags, 1) > 0
GROUP BY flag
ORDER BY occurrence_count DESC;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_trips_updated_at 
    BEFORE UPDATE ON trips 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Calculate distance between two points (Haversine)
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    earth_radius DECIMAL := 6371;
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
    distance DECIMAL;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;
    
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    a := sin(dlat/2) * sin(dlat/2) + 
         cos(radians(lat1)) * cos(radians(lat2)) * 
         sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    distance := earth_radius * c;
    
    RETURN distance;
END;
$$ LANGUAGE plpgsql;

-- Validate NYC coordinates
CREATE OR REPLACE FUNCTION validate_nyc_coordinates(
    lat DECIMAL, lon DECIMAL
) RETURNS BOOLEAN AS $$
BEGIN
    IF lat IS NULL OR lon IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN lat BETWEEN 40.4774 AND 40.9176 AND 
           lon BETWEEN -74.2591 AND -73.7004;
END;
$$ LANGUAGE plpgsql;

-- Infer destination region
CREATE OR REPLACE FUNCTION infer_destination_region(
    lat DECIMAL, lon DECIMAL
) RETURNS VARCHAR AS $$
BEGIN
    IF lat IS NULL OR lon IS NULL THEN
        RETURN 'unknown';
    END IF;
    
    -- Within NYC
    IF validate_nyc_coordinates(lat, lon) THEN
        RETURN 'nyc';
    END IF;
    
    -- North (Westchester, Connecticut)
    IF lat > 40.9176 THEN
        RETURN 'north';
    END IF;
    
    -- South (New Jersey)
    IF lat < 40.4774 THEN
        RETURN 'south';
    END IF;
    
    -- West (New Jersey)
    IF lon < -74.2591 THEN
        RETURN 'west';
    END IF;
    
    -- East (Long Island)
    IF lon > -73.7004 THEN
        RETURN 'east';
    END IF;
    
    RETURN 'other';
END;
$$ LANGUAGE plpgsql;

-- Get all records by category (helper function)
CREATE OR REPLACE FUNCTION get_trips_by_category(
    category data_category_type,
    limit_count INTEGER DEFAULT 100
) RETURNS TABLE (
    id INTEGER,
    original_id VARCHAR,
    data_category data_category_type,
    data_quality_score INTEGER,
    trip_duration INTEGER,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.original_id, t.data_category, t.data_quality_score, 
           t.trip_duration, t.distance_km
    FROM trips t
    WHERE t.data_category = get_trips_by_category.category
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE trips IS 'Main trips table with FULL inclusive categorization - stores ALL records';
COMMENT ON COLUMN trips.data_category IS 'Category: valid_complete, micro_trip, suburban_trip, out_of_bounds, extended_trip, data_anomaly, incomplete_data';
COMMENT ON COLUMN trips.data_quality_score IS 'Quality score 0-100: 100=perfect, 90-99=minor issues, 70-89=moderate issues, <70=significant issues';
COMMENT ON COLUMN trips.data_flags IS 'Array of flags: micro_trip, dropoff_outside_nyc, destination_north, etc.';
COMMENT ON COLUMN trips.validation_issues IS 'Human-readable validation issues for transparency';
COMMENT ON COLUMN trips.raw_data IS 'Original CSV data in JSON format for complete audit trail';

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Get all valid NYC trips
-- SELECT * FROM trips WHERE is_valid_nyc_trip = true;

-- Get suburban trips to Connecticut
-- SELECT * FROM trips WHERE is_suburban_trip = true AND destination_region = 'north';

-- Get micro trips
-- SELECT * FROM trips WHERE is_micro_trip = true;

-- Get trips with specific flags
-- SELECT * FROM trips WHERE 'dropoff_outside_nyc' = ANY(data_flags);

-- Get high quality trips only
-- SELECT * FROM trips WHERE data_quality_score >= 90;

-- Get category distribution
-- SELECT * FROM category_stats;

-- Get all trips including categorized
-- SELECT * FROM all_trips_stats;
