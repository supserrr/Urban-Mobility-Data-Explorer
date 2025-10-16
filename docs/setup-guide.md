# Setup Guide

Complete installation and configuration guide for the Urban Mobility Data Explorer.

## Overview

This guide provides step-by-step instructions to install, configure, and run the Urban Mobility Data Explorer platform. The setup process takes approximately 15-20 minutes.

## Prerequisites

Verify that your system meets these requirements before beginning.

### Required Software

| Software | Minimum Version | Recommended Version | Purpose |
|----------|-----------------|---------------------|---------|
| Node.js | 16.0.0 | 18.0.0 or higher | Backend runtime |
| npm | 7.0.0 | 8.0.0 or higher | Package management |
| PostgreSQL | 12.0 | 14.0 or higher | Database server |
| Git | 2.0.0 | Latest | Version control |

### System Requirements

- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Internet connection for package installation
- **OS**: macOS, Linux, or Windows 10+

### Verify Prerequisites

Run these commands to verify your environment:

```bash
# Check Node.js version
node --version
# Expected output: v16.x.x or higher

# Check npm version
npm --version
# Expected output: 7.x.x or higher

# Check PostgreSQL version
psql --version
# Expected output: psql (PostgreSQL) 12.x or higher

# Check Git version
git --version
# Expected output: git version 2.x.x
```

## Installation

### Quick Start: Automated Setup (Recommended)

The fastest way to get started is using the automated setup script:

```bash
# Clone and navigate to repository
git clone <repository-url>
cd Urban-Mobility-Data-Explorer

# Run automated setup
./setup.sh
```

**What the script does:**
1. Checks prerequisites (Node.js, PostgreSQL, npm)
2. Creates directory structure
3. Installs all dependencies (backend and scripts)
4. Generates secure API key automatically
5. Creates environment files (backend/.env, scripts/.env)
6. Initializes database with schema
7. Imports data (if CSV file present)
8. Creates `frontend/setup.html` auto-configuration page
9. Asks if you want to start servers

**After setup completes:**
- If you chose to start servers, they will be running
- Visit `http://localhost:3000/setup.html` in your browser
- Page auto-configures API key and redirects to dashboard
- Done! Total time: ~2-5 minutes

**Skip to:** [Browser Configuration](#first-time-api-key-setup) section after running `./setup.sh`

---

### Manual Installation (Advanced)

If you prefer to set up components individually, follow these steps:

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd Urban-Mobility-Data-Explorer

# Verify directory structure
ls -la
```

Expected output:
```
backend/
frontend/
database/
scripts/
data/
docs/
logs/
README.md
setup.sh
```

### Step 2: Install Backend Dependencies

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

Expected packages:
- express
- pg (PostgreSQL client)
- winston (logging)
- helmet (security)
- cors
- dotenv

### Step 3: Install Script Dependencies

```bash
# Navigate to scripts directory
cd ../scripts

# Install dependencies
npm install

# Return to project root
cd ..
```

### Step 4: Frontend Setup

The frontend uses vanilla JavaScript and requires no build step or dependencies. Verify frontend files:

```bash
ls frontend/
```

Expected output:
```
components/
styles/
utils/
index.html
dashboard.html
main.js
config.js
```

## Database Configuration

### Step 1: Create Database

```bash
# Create the urban_mobility database
createdb urban_mobility

# Verify database creation
psql -l | grep urban_mobility
```

If you encounter permission issues:

```bash
# Create database with specific user
createdb -U postgres urban_mobility

# Grant privileges
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE urban_mobility TO your_username;"
```

### Step 2: Choose Database Schema

The platform uses one primary schema:

| Schema | File | Status | Features |
|--------|------|--------|----------|
| **Inclusive** | `schema_inclusive.sql` | **RECOMMENDED** | Full data retention, quality categorization, complete analytics |

**Note**: `schema.sql` and `schema_production.sql` are deprecated legacy schemas kept for reference only. Always use `schema_inclusive.sql` for new installations.

**Recommendation**: Use `schema_inclusive.sql` for all deployments.

### Step 3: Initialize Database

Using the inclusive schema (recommended):

```bash
# Navigate to database directory
cd database

# Run the inclusive schema
psql urban_mobility < schema_inclusive.sql

# Verify table creation
psql urban_mobility -c "\dt"
```

Expected tables:
- trips (main data table)
- category_stats (view)
- vendor_stats (view)
- hourly_trip_stats (view)
- monthly_trip_stats (view)

### Step 4: Verify Database Setup

```bash
# Check database structure
psql urban_mobility -c "\d trips"

# Verify indexes
psql urban_mobility -c "\di"

# Check views
psql urban_mobility -c "\dv"
```

## Environment Configuration

### Step 1: Create Environment File

```bash
# Navigate to backend directory
cd backend

# Copy the example environment file
cp env.example .env

# Open .env in your editor
nano .env
# or
code .env
```

### Step 2: Configure Database Connection

Edit `.env` and update these values:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=urban_mobility
DB_USER=your_database_username
DB_PASSWORD=your_secure_password

# Database Pool Settings
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

**Important**: Replace `your_database_username` and `your_secure_password` with your actual PostgreSQL credentials.

### Step 3: Configure API Settings

```bash
# Server Configuration
NODE_ENV=development
PORT=8000
HOST=localhost

# API Configuration
API_VERSION=v1
API_BASE_URL=http://localhost:8000/api
```

### Step 4: Configure Security

Generate an API key for authentication:

```bash
# Generate API key
node src/utils/generateApiKey.js
```

Copy the generated key and add it to `.env`:

```bash
# API Keys (comma-separated for multiple keys)
API_KEYS=your_generated_api_key_here
```

Configure CORS origins:

```bash
# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:3000
```

### Step 5: Configure MapTiler (Optional)

For map visualization, obtain a free MapTiler API key:

1. Visit [MapTiler Cloud](https://cloud.maptiler.com/)
2. Sign up for a free account
3. Copy your API key
4. Add to `.env`:

```bash
# MapTiler API Key
MAPTILER_API_KEY=your_maptiler_api_key_here
```

See [MapTiler Setup Guide](maptiler-setup.md) for detailed instructions.

### Step 6: Configure Logging

```bash
# Logging Configuration
LOG_LEVEL=info
```

Available log levels:
- `error`: Error messages only
- `warn`: Warnings and errors
- `info`: General information (recommended)
- `debug`: Detailed debugging information

## Data Import

### Step 1: Prepare Data File

Place your CSV file in the `data/raw/` directory:

```bash
# Create raw data directory if it doesn't exist
mkdir -p data/raw

# Copy your CSV file
cp /path/to/your/data.csv data/raw/train.csv
```

### Step 2: Verify CSV Format

Your CSV file should have these columns:
- `id`
- `vendor_id`
- `pickup_datetime`
- `dropoff_datetime`
- `passenger_count`
- `pickup_longitude`
- `pickup_latitude`
- `dropoff_longitude`
- `dropoff_latitude`
- `store_and_fwd_flag`
- `trip_duration`

### Step 3: Run Data Import

Using the inclusive importer (recommended):

```bash
# Navigate to scripts directory
cd scripts

# Run the inclusive importer
node importDataInclusive.js ../data/raw/train.csv
```

The import process:
1. Validates CSV structure
2. Processes data in batches
3. Categorizes data quality
4. Calculates derived features
5. Inserts into database

**Expected Duration**: 2-5 minutes for 1.4M records

### Step 4: Verify Import

```bash
# Check record count
psql urban_mobility -c "SELECT COUNT(*) FROM trips;"

# Check data categories
psql urban_mobility -c "SELECT data_category, COUNT(*) FROM trips GROUP BY data_category;"

# View sample records
psql urban_mobility -c "SELECT * FROM trips LIMIT 5;"
```

### Alternative: Production Importer

For production environments with validated data only:

```bash
node importToProduction.js ../data/raw/train.csv
```

## Running the Application

### Method 1: Quick Start Script (Recommended)

```bash
# Navigate to scripts directory
cd scripts

# Start both backend and frontend servers
./start-servers.sh
```

The script:
- Starts the backend on port 8000
- Starts the frontend on port 3000
- Runs servers in the background
- Saves process IDs for later shutdown
- Displays API key setup URL at the end

### First-Time API Key Setup

After starting the servers, configure your browser with the API key:

1. **Copy the setup URL** from the server start output (last section)
2. **Visit the URL** in your browser (it includes `?api_key=...`)
3. **The key is saved** automatically to localStorage
4. **Refresh the page** - everything should now work

**Example setup URL:**
```
http://localhost:3000?api_key=YOUR_API_KEY_HERE
```

**Verification:**
Open browser console (F12) - you should see:
```
✓ API key saved
✓ API Key Loaded
✓ Backend authenticated
```

**NOT see:**
```
⚠ No API Key
401 Unauthorized
500 Internal Server Error
```

### Method 2: Manual Start

#### Terminal 1: Backend Server

```bash
# Navigate to backend directory
cd backend

# Start development server with auto-reload
npm run dev

# Or start production server
npm start
```

Expected output:
```
============================================================
Urban Mobility Data Explorer API
============================================================
Server:   http://localhost:8000
Database: PostgreSQL (urban_mobility)
Docs:     http://localhost:8000/api/docs
Health:   http://localhost:8000/api/health
============================================================
```

#### Terminal 2: Frontend Server

```bash
# Navigate to frontend directory
cd frontend

# Start HTTP server (Python 3)
python3 -m http.server 3000

# Or use Python 2
python -m SimpleHTTPServer 3000

# Or use Node.js http-server
npx http-server -p 3000
```

Expected output:
```
Serving HTTP on 0.0.0.0 port 3000 (http://0.0.0.0:3000/) ...
```

### Method 3: Production Deployment

For production environments:

```bash
# Build and start backend
cd backend
NODE_ENV=production npm start

# Serve frontend with nginx or Apache
# See Architecture documentation for deployment details
```

## Verification

### Step 1: Test Backend

```bash
# Test health endpoint
curl http://localhost:8000/api/health

# Expected response:
# {
#   "success": true,
#   "data": {
#     "totalTrips": 1458641,
#     "validNycTrips": ...,
#     ...
#   }
# }
```

### Step 2: Test API Documentation

```bash
# View API documentation
curl http://localhost:8000/api/docs

# Test with authentication
curl -H "X-API-Key: your_api_key_here" http://localhost:8000/api/config
```

### Step 3: Test Frontend

Open your browser and navigate to:

- **Application**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard.html

Verify these features:
- Dashboard loads with statistics
- Charts display correctly
- Filters are functional
- Map view renders

### Step 4: Run Security Tests

```bash
# Navigate to backend directory
cd backend

# Run authentication tests
./test-authentication.sh

# Run security tests
./test-security.sh
```

## Stopping the Application

### Using the Stop Script

```bash
# Navigate to scripts directory
cd scripts

# Stop both servers
./stop-servers.sh
```

### Manual Stop

```bash
# Find and kill backend process
lsof -ti:8000 | xargs kill -9

# Find and kill frontend process
lsof -ti:3000 | xargs kill -9
```

## Troubleshooting

### Database Connection Errors

**Problem**: Cannot connect to PostgreSQL

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions**:

1. Verify PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Check PostgreSQL service:
   ```bash
   # macOS
   brew services list

   # Linux
   sudo systemctl status postgresql

   # Start if not running
   brew services start postgresql  # macOS
   sudo systemctl start postgresql # Linux
   ```

3. Verify credentials in `.env`

4. Check PostgreSQL logs:
   ```bash
   # macOS
   tail -f /usr/local/var/log/postgres.log

   # Linux
   sudo tail -f /var/log/postgresql/postgresql-*.log
   ```

### Port Already in Use

**Problem**: Port 8000 or 3000 already in use

**Solution**:

```bash
# Find process using port 8000
lsof -i:8000

# Kill the process
kill -9 <PID>

# Or change port in .env (backend) or run command (frontend)
```

### Import Fails

**Problem**: Data import fails or reports errors

**Solutions**:

1. Check CSV file format:
   ```bash
   head -n 5 data/raw/train.csv
   ```

2. Verify column names match expected format

3. Check logs:
   ```bash
   tail -f logs/combined.log
   ```

4. Ensure sufficient disk space:
   ```bash
   df -h
   ```

### Frontend Not Loading

**Problem**: Frontend shows blank page or errors

**Solutions**:

1. Check browser console for errors (F12)

2. **Set up API key** (most common issue):
   ```
   Visit: http://localhost:3000?api_key=YOUR_API_KEY
   Get key from: backend/.env (API_KEYS value)
   ```

3. Verify backend is running:
   ```bash
   curl http://localhost:8000/api/health
   ```

4. Check CORS configuration in `backend/.env`

5. Clear browser cache and reload

6. Verify frontend server is running on port 3000

### API Authentication Errors (401/500)

**Problem**: Console shows 401 or 500 errors

**Cause**: API key not set in localStorage

**Solution**:

```
1. Get API key from backend/.env (API_KEYS= value)
2. Visit: http://localhost:3000?api_key=YOUR_KEY
3. Console should show: "✓ API key saved"
4. Refresh page
```

**Alternative - Manual setup:**
```javascript
// In browser console:
localStorage.setItem('api_key', 'YOUR_KEY_HERE')
location.reload()
```

### Permission Denied Errors

**Problem**: Permission errors during setup

**Solutions**:

```bash
# Fix file permissions
chmod +x scripts/*.sh

# Fix directory permissions
chmod 755 data/ logs/

# Database permissions
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE urban_mobility TO $(whoami);"
```

### Memory Issues During Import

**Problem**: System runs out of memory during import

**Solutions**:

1. Reduce batch size in importer
2. Close other applications
3. Increase system swap space
4. Process data in smaller chunks

## Next Steps

After successful setup:

1. **Explore the Interface**
   - Navigate through Dashboard, Map, Routes, and Analytics views
   - Try the filtering options
   - Export data and charts

2. **Review Documentation**
   - [API Reference](api-reference.md) - Integrate with the API
   - [Architecture](architecture.md) - Understand the system design
   - [Data Processing Guide](data-processing-guide.md) - Learn about data pipeline

3. **Configure Advanced Features**
   - Set up additional API keys for team members
   - Configure custom map styles
   - Optimize database indexes

4. **Deploy to Production**
   - Review security checklist
   - Set up SSL/TLS
   - Configure backup procedures
   - Set up monitoring and alerts

## Security Checklist

Before deploying to production:

- [ ] Change default database password
- [ ] Generate unique API keys
- [ ] Update CORS origins to production domains
- [ ] Enable SSL/TLS
- [ ] Configure firewall rules
- [ ] Set NODE_ENV to 'production'
- [ ] Review and rotate API keys
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Review security test results

## Additional Resources

- [Setup Verification Script](../scripts/verify-setup.sh)
- [Server Start Script](../scripts/start-servers.sh)
- [Server Stop Script](../scripts/stop-servers.sh)
- [Backend Package Configuration](../backend/package.json)
- [Environment Example](../backend/env.example)

## Support

For additional help:

1. Check the logs in `logs/` directory
2. Review the [Troubleshooting section](#troubleshooting)
3. Consult the [API Reference](api-reference.md)
4. Examine the [Architecture documentation](architecture.md)

---

**Last Updated**: October 2025  
**Version**: 1.0.0  
**Maintainer**: Shima Serein
