-- ============================================================================
-- DEPRECATED SCHEMA - DO NOT USE FOR NEW DEPLOYMENTS
-- ============================================================================
-- This schema is kept for backward compatibility reference only.
-- For new deployments, use schema_inclusive.sql instead.
--
-- Reasons for deprecation:
-- - Subset of features available in schema_inclusive.sql
-- - Duplicate maintenance burden
-- 
-- Migration: Use schema_inclusive.sql (which is the same as this but maintained)
-- ============================================================================

-- Urban Mobility Data Explorer - Production Schema (LEGACY)
-- PostgreSQL schema for ALL 1.4M+ records (100% inclusion)

-- Create enum types
CREATE TYPE data_category_type AS ENUM (
    'valid_complete',
    'micro_trip',
    'suburban_trip',
    'out_of_bounds',
    'extended_trip',
    'data_anomaly',
    'incomplete_data'
);

CREATE TYPE time_of_day_type AS ENUM ('morning', 'afternoon', 'evening', 'night');
CREATE TYPE day_type_enum AS ENUM ('weekday', 'weekend');

-- Main trips table
CREATE TABLE trips (
    -- Primary key
    id SERIAL PRIMARY KEY,
    
    -- Original CSV fields
    original_id VARCHAR(50) NOT NULL,
    vendor_id VARCHAR(10),
    vendor_name VARCHAR(100),
    pickup_datetime TIMESTAMP,
    dropoff_datetime TIMESTAMP,
    passenger_count INTEGER,
    pickup_longitude DECIMAL(10, 8),
    pickup_latitude DECIMAL(11, 8),
    dropoff_longitude DECIMAL(10, 8),
    dropoff_latitude DECIMAL(11, 8),
    store_and_fwd_flag VARCHAR(5),
    trip_duration INTEGER,
    
    -- Calculated fields
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
    
    -- Categorization
    data_category data_category_type NOT NULL DEFAULT 'valid_complete',
    data_quality_score INTEGER CHECK (data_quality_score BETWEEN 0 AND 100),
    
    -- Boolean flags
    is_valid_nyc_trip BOOLEAN DEFAULT true,
    is_suburban_trip BOOLEAN DEFAULT false,
    is_micro_trip BOOLEAN DEFAULT false,
    is_extended_trip BOOLEAN DEFAULT false,
    has_anomalies BOOLEAN DEFAULT false,
    
    -- Geographic
    pickup_in_nyc BOOLEAN,
    dropoff_in_nyc BOOLEAN,
    destination_region VARCHAR(50),
    
    -- Metadata
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_trips_pickup_datetime ON trips(pickup_datetime);
CREATE INDEX idx_trips_dropoff_datetime ON trips(dropoff_datetime);
CREATE INDEX idx_trips_vendor ON trips(vendor_id);
CREATE INDEX idx_trips_vendor_name ON trips(vendor_name);
CREATE INDEX idx_trips_data_category ON trips(data_category);
CREATE INDEX idx_trips_pickup_hour ON trips(pickup_hour);
CREATE INDEX idx_trips_pickup_month ON trips(pickup_month, pickup_year);
CREATE INDEX idx_trips_distance ON trips(distance_km);
CREATE INDEX idx_trips_valid_nyc ON trips(is_valid_nyc_trip);
CREATE INDEX idx_trips_quality_score ON trips(data_quality_score);

-- Create analytics views
CREATE VIEW category_stats AS
SELECT 
    data_category,
    COUNT(*) as trip_count,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM trips), 0), 2) as percentage,
    AVG(data_quality_score) as avg_quality_score,
    AVG(trip_duration) FILTER (WHERE trip_duration IS NOT NULL) as avg_duration,
    AVG(distance_km) FILTER (WHERE distance_km IS NOT NULL) as avg_distance,
    AVG(speed_kmh) FILTER (WHERE speed_kmh IS NOT NULL) as avg_speed
FROM trips
GROUP BY data_category
ORDER BY trip_count DESC;

CREATE VIEW vendor_stats AS
SELECT 
    vendor_id,
    vendor_name,
    COUNT(*) as trip_count,
    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM trips), 0), 2) as market_share_percentage,
    AVG(trip_duration) FILTER (WHERE trip_duration IS NOT NULL) as avg_duration,
    AVG(distance_km) FILTER (WHERE distance_km IS NOT NULL) as avg_distance,
    AVG(speed_kmh) FILTER (WHERE speed_kmh IS NOT NULL) as avg_speed,
    SUM(passenger_count) FILTER (WHERE passenger_count IS NOT NULL) as total_passengers,
    AVG(data_quality_score) as avg_quality_score
FROM trips
WHERE vendor_id IS NOT NULL
GROUP BY vendor_id, vendor_name
ORDER BY trip_count DESC;

CREATE VIEW hourly_trip_stats AS
SELECT 
    pickup_hour,
    COUNT(*) as trip_count,
    AVG(trip_duration) as avg_duration,
    AVG(distance_km) as avg_distance,
    AVG(speed_kmh) as avg_speed,
    SUM(passenger_count) as total_passengers
FROM trips 
WHERE pickup_hour IS NOT NULL AND is_valid_nyc_trip = true
GROUP BY pickup_hour
ORDER BY pickup_hour;

CREATE VIEW monthly_trip_stats AS
SELECT 
    pickup_month,
    pickup_year,
    COUNT(*) as trip_count,
    AVG(trip_duration) as avg_duration,
    AVG(distance_km) as avg_distance,
    AVG(speed_kmh) as avg_speed,
    SUM(passenger_count) as total_passengers
FROM trips 
WHERE pickup_month IS NOT NULL AND is_valid_nyc_trip = true
GROUP BY pickup_month, pickup_year
ORDER BY pickup_year, pickup_month;
