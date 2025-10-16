-- ============================================================================
-- DEPRECATED SCHEMA - DO NOT USE FOR NEW DEPLOYMENTS
-- ============================================================================
-- This schema is kept for backward compatibility reference only.
-- For new deployments, use schema_inclusive.sql instead.
-- 
-- Reasons for deprecation:
-- - Missing advanced data quality tracking features
-- - Limited categorization support  
-- - Fewer analytical views
-- 
-- Migration: Use schema_inclusive.sql for all new installations
-- ============================================================================

-- Urban Mobility Data Explorer - Database Schema (LEGACY)
-- PostgreSQL Database Schema for NYC Taxi Trip Data

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

-- Main trips table
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    vendor_id vendor_type NOT NULL,
    vendor_name VARCHAR(100),  -- Added for consistency with other schemas
    pickup_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    dropoff_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    passenger_count INTEGER NOT NULL CHECK (passenger_count > 0),
    pickup_longitude DECIMAL(10, 8) NOT NULL,
    pickup_latitude DECIMAL(11, 8) NOT NULL,
    dropoff_longitude DECIMAL(10, 8) NOT NULL,
    dropoff_latitude DECIMAL(11, 8) NOT NULL,
    store_and_fwd_flag store_flag NOT NULL,
    trip_duration INTEGER NOT NULL CHECK (trip_duration > 0),
    -- Derived fields
    distance_km DECIMAL(8, 3),
    speed_kmh DECIMAL(6, 2),
    fare_per_km DECIMAL(8, 2),
    pickup_hour INTEGER,
    pickup_day_of_week INTEGER,
    pickup_month INTEGER,
    pickup_year INTEGER,
    -- Geospatial data
    pickup_point GEOMETRY(POINT, 4326),
    dropoff_point GEOMETRY(POINT, 4326),
    -- Data quality and validation (added for consistency)
    is_valid_nyc_trip BOOLEAN DEFAULT true,
    data_quality_score INTEGER,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_trips_pickup_datetime ON trips(pickup_datetime);
CREATE INDEX idx_trips_dropoff_datetime ON trips(dropoff_datetime);
CREATE INDEX idx_trips_passenger_count ON trips(passenger_count);
CREATE INDEX idx_trips_trip_duration ON trips(trip_duration);
CREATE INDEX idx_trips_pickup_hour ON trips(pickup_hour);
CREATE INDEX idx_trips_pickup_day ON trips(pickup_day_of_week);
CREATE INDEX idx_trips_pickup_month ON trips(pickup_month);
CREATE INDEX idx_trips_pickup_year ON trips(pickup_year);
CREATE INDEX idx_trips_distance ON trips(distance_km);
CREATE INDEX idx_trips_speed ON trips(speed_kmh);
CREATE INDEX idx_trips_vendor ON trips(vendor_id);
CREATE INDEX idx_trips_vendor_name ON trips(vendor_name);
CREATE INDEX idx_trips_valid_nyc ON trips(is_valid_nyc_trip);
CREATE INDEX idx_trips_quality_score ON trips(data_quality_score);

-- Geospatial indexes
CREATE INDEX idx_trips_pickup_point ON trips USING GIST(pickup_point);
CREATE INDEX idx_trips_dropoff_point ON trips USING GIST(dropoff_point);

-- Composite indexes for common queries
CREATE INDEX idx_trips_datetime_vendor ON trips(pickup_datetime, vendor_id);
CREATE INDEX idx_trips_hour_day ON trips(pickup_hour, pickup_day_of_week);

-- Create views for common analytics
CREATE VIEW hourly_trip_stats AS
SELECT 
    pickup_hour,
    COUNT(*) as trip_count,
    AVG(trip_duration) as avg_duration,
    AVG(distance_km) as avg_distance,
    AVG(speed_kmh) as avg_speed,
    SUM(passenger_count) as total_passengers
FROM trips 
WHERE distance_km IS NOT NULL AND speed_kmh IS NOT NULL
GROUP BY pickup_hour
ORDER BY pickup_hour;

CREATE VIEW daily_trip_stats AS
SELECT 
    pickup_day_of_week,
    COUNT(*) as trip_count,
    AVG(trip_duration) as avg_duration,
    AVG(distance_km) as avg_distance,
    AVG(speed_kmh) as avg_speed,
    SUM(passenger_count) as total_passengers
FROM trips 
WHERE distance_km IS NOT NULL AND speed_kmh IS NOT NULL
GROUP BY pickup_day_of_week
ORDER BY pickup_day_of_week;

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
WHERE distance_km IS NOT NULL AND speed_kmh IS NOT NULL
GROUP BY pickup_month, pickup_year
ORDER BY pickup_year, pickup_month;

-- Create function to update timestamps
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

-- Create function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    earth_radius DECIMAL := 6371; -- Earth radius in kilometers
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
    distance DECIMAL;
BEGIN
    -- Convert to radians
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    -- Haversine formula
    a := sin(dlat/2) * sin(dlat/2) + 
         cos(radians(lat1)) * cos(radians(lat2)) * 
         sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    distance := earth_radius * c;
    
    RETURN distance;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate coordinates
CREATE OR REPLACE FUNCTION validate_nyc_coordinates(
    lat DECIMAL, lon DECIMAL
) RETURNS BOOLEAN AS $$
BEGIN
    -- NYC approximate bounds
    RETURN lat BETWEEN 40.4774 AND 40.9176 AND 
           lon BETWEEN -74.2591 AND -73.7004;
END;
$$ LANGUAGE plpgsql;
