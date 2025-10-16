# Database Schema Documentation

## Schema Files

### Primary Schema
- **schema_inclusive.sql** - The primary and most comprehensive database schema
  - Includes all features and data categories
  - Full support for data quality tracking
  - Comprehensive indexing strategy
  - Recommended for all new deployments

### Legacy Schemas (Deprecated - For Reference Only)
- **schema.sql** - Original basic schema (DEPRECATED)
- **schema_production.sql** - Simplified production schema (DEPRECATED)

**Note:** Use `schema_inclusive.sql` for all new installations. Legacy schemas are kept for backward compatibility reference only.

## Database Setup

### Prerequisites
- PostgreSQL 12 or higher
- PostGIS extension (optional, for advanced geospatial features)

### Automated Setup (Recommended)

The easiest way to set up the database is using the automated setup script:

```bash
# From project root
./setup.sh
```

This will automatically:
- Create the database
- Run the schema
- Configure environment variables
- Generate API keys
- Verify the installation

After setup, visit `http://localhost:3000/setup.html` to configure your browser.

### Manual Setup

If you prefer manual setup:

1. Create the database:
   ```bash
   psql -U postgres
   CREATE DATABASE urban_mobility;
   \q
   ```

2. Run the schema:
   ```bash
   psql -U postgres -d urban_mobility -f schema_inclusive.sql
   ```

3. Verify installation:
   ```bash
   psql -U postgres -d urban_mobility -c "\dt"
   ```

4. Configure backend/.env:
   ```bash
   cp backend/env.example backend/.env
   # Edit backend/.env with your database credentials
   ```

## Schema Overview

### Main Tables

#### trips
Main table storing all trip data with comprehensive fields:
- Trip identifiers and vendor information
- Temporal data (pickup/dropoff timestamps)
- Geospatial data (coordinates and points)
- Calculated metrics (distance, speed, duration)
- Data quality indicators
- Categorization flags

### Enums

- **vendor_type**: '1', '2'
- **store_flag**: 'Y', 'N'
- **data_category_type**: valid_complete, incomplete_data, data_anomaly, etc.
- **time_of_day_type**: morning, afternoon, evening, night
- **day_type_enum**: weekday, weekend

### Views

Analytical views for common queries:
- **all_trips_stats**: Overall statistics
- **category_stats**: Statistics by data category  
- **hourly_trip_stats**: Hourly aggregated statistics
- **daily_trip_stats**: Daily aggregated statistics
- **monthly_trip_stats**: Monthly aggregated statistics
- **suburban_destinations**: Analysis of suburban trips
- **quality_overview**: Data quality metrics
- **vendor_stats**: Vendor performance statistics
- **flag_frequency**: Frequency of data flags

### Functions

Helper functions for data processing:
- **update_updated_at_column()**: Trigger function for timestamp updates
- **calculate_distance_km()**: Haversine distance calculation
- **validate_nyc_coordinates()**: Coordinate validation
- **infer_destination_region()**: Geographic region inference
- **get_trips_by_category()**: Filtered trip retrieval

### Indexes

Comprehensive indexing strategy for performance:
- Temporal indexes (pickup_datetime, dropoff_datetime)
- Categorical indexes (vendor_id, data_category)
- Numeric indexes (distance_km, speed_kmh, quality_score)
- Boolean flag indexes (is_valid_nyc_trip, etc.)
- Geospatial indexes (GIST on point geometries)
- Composite indexes for common query patterns

## Data Import

Use the import scripts in the `scripts/` directory:

```bash
cd scripts
node importDataInclusive.js ../data/raw/train.csv
```

## Migrations

For schema updates, create migration files in `migrations/` directory:

```sql
-- migrations/001_add_new_field.sql
ALTER TABLE trips ADD COLUMN new_field VARCHAR(255);
```

## Performance Optimization

### Indexing Strategy
All critical fields are indexed for optimal query performance.

### Partitioning (Future)
Consider partitioning by date for very large datasets:
```sql
-- Example: Monthly partitioning
CREATE TABLE trips_2024_01 PARTITION OF trips
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Vacuum and Analyze
Run regularly to maintain performance:
```bash
psql -U postgres -d urban_mobility -c "VACUUM ANALYZE trips;"
```

## Backup and Restore

### Backup
```bash
pg_dump -U postgres -d urban_mobility -F c -f urban_mobility_backup.dump
```

### Restore
```bash
pg_restore -U postgres -d urban_mobility -c urban_mobility_backup.dump
```

## Security Considerations

1. **User Permissions**: Create dedicated database users with limited privileges
   ```sql
   CREATE USER app_user WITH PASSWORD 'secure_password';
   GRANT SELECT, INSERT, UPDATE ON trips TO app_user;
   ```

2. **Connection Security**: Use SSL/TLS connections in production
   ```
   DB_SSL_CA=/path/to/ca-certificate.crt
   ```

3. **Password Security**: Never hardcode passwords, use environment variables

4. **Regular Updates**: Keep PostgreSQL updated with latest security patches

## Troubleshooting

### Connection Issues
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Check if database exists
psql -U postgres -l | grep urban_mobility
```

### Performance Issues
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Check index usage
SELECT * FROM pg_stat_user_indexes 
WHERE schemaname = 'public';
```

### Disk Space
```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Best Practices

1. **Regular Backups**: Automated daily backups
2. **Monitoring**: Track query performance and resource usage
3. **Indexing**: Review and optimize indexes regularly
4. **Maintenance**: Schedule regular VACUUM and ANALYZE
5. **Documentation**: Document all schema changes
6. **Testing**: Test all migrations on staging before production

## Support

For database-related issues:
1. Check this documentation
2. Review logs in `logs/` directory
3. Check PostgreSQL logs
4. Consult the main project README.md

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [PostgreSQL Performance Optimization](https://wiki.postgresql.org/wiki/Performance_Optimization)
