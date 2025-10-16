# Server Management Scripts

## Overview

These scripts provide automated management of the Urban Mobility Data Explorer servers. They handle port conflicts, verify dependencies, and ensure clean startup/shutdown.

## Available Scripts

### `start-servers.sh`
Automatically starts both backend and frontend servers with conflict resolution.

**Usage:**
```bash
./scripts/start-servers.sh
```

**What it does:**
1. Checks and clears ports 8000 (backend) and 3000 (frontend)
2. Verifies Node.js, npm, and Python3 are installed
3. Validates backend configuration (.env file)
4. Synchronizes API keys between backend and frontend
5. Installs backend dependencies if needed
6. Starts backend server (Node.js/Express)
7. Starts frontend server (Python HTTP Server)
8. Verifies both servers are running
9. Creates PID files for process management
10. Displays access information and browser setup URL

**Output:**
- Backend URL: http://localhost:8000
- Frontend URL: http://localhost:3000
- Log files in `logs/` directory
- PID files for tracking processes

### `stop-servers.sh`
Gracefully stops both servers and cleans up all processes.

**Usage:**
```bash
./scripts/stop-servers.sh
```

**What it does:**
1. Stops servers using PID files (graceful shutdown)
2. Cleans up any remaining processes on ports
3. Kills any lingering nodemon/node/python processes
4. Verifies all ports are free
5. Removes PID files

**Cleanup targets:**
- Backend server (port 8000)
- Frontend server (port 3000)
- All nodemon processes
- All server-production.js processes
- Python HTTP servers on port 3000

## Quick Start

### First Time Setup (Automated)

**Recommended: Use the automated setup script:**
```bash
# From repository root
./setup.sh

# This will:
# - Install all dependencies
# - Generate secure API keys
# - Configure environment files
# - Set up database
# - Ask if you want to start servers
# - Show browser setup URL
```

After setup completes, visit `http://localhost:3000/setup.html` to auto-configure your browser.

### Manual Server Start

**From repository root:**
```bash
# Make scripts executable (if needed)
chmod +x scripts/*.sh

# Start servers
./scripts/start-servers.sh
```

**From scripts directory:**
```bash
# Start servers
./start-servers.sh
```

**Browser Configuration (One-Time):**

After starting servers for the first time, visit:
- **Auto-config**: `http://localhost:3000/setup.html` (recommended - auto-configures in 2 seconds)
- **Manual**: Copy the API key setup URL from the start script output

The setup page will automatically save your API key to browser localStorage and redirect you to the dashboard.

### Daily Usage

**From repository root:**
```bash
# Start servers
./scripts/start-servers.sh

# Stop servers when done
./scripts/stop-servers.sh
```

**From scripts directory:**
```bash
# Start servers
./start-servers.sh

# Stop servers when done
./stop-servers.sh
```

### View Logs
```bash
# Backend logs
tail -f logs/backend-server.log

# Frontend logs
tail -f logs/frontend-server.log

# Both logs (in separate terminals)
tail -f logs/backend-server.log &
tail -f logs/frontend-server.log
```

## Port Configuration

### Current Ports
- **Backend**: 8000 (configured in `backend/src/server-production.js`)
- **Frontend**: 3000 (hardcoded in scripts)

### Changing Ports

#### Backend Port
Edit `backend/src/server-production.js`:
```javascript
const PORT = process.env.PORT || 8000;  // Change 8000 to your port
```

Or set in `.env`:
```env
PORT=8000
```

Then update `scripts/start-servers.sh` and `scripts/stop-servers.sh`:
```bash
BACKEND_PORT=8000  # Change if needed
```

#### Frontend Port
Edit both `scripts/start-servers.sh` and `scripts/stop-servers.sh`:
```bash
FRONTEND_PORT=3000  # Change if needed
```

## Troubleshooting

### Problem: Ports still in use
**Solution:**
```bash
# Run the stop script
./scripts/stop-servers.sh

# If that doesn't work, manually kill:
lsof -ti :8000 :3000 | xargs kill -9

# Then start again
./scripts/start-servers.sh
```

### Problem: Backend won't start (database connection)
**Solution:**
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if needed
brew services start postgresql

# Verify database exists
psql -l | grep urban_mobility

# Check backend logs
tail -f logs/backend-server.log
```

### Problem: Frontend won't start (Python not found)
**Solution:**
```bash
# Check Python3 installation
which python3
python3 --version

# Install if needed (macOS)
brew install python3

# Try starting again
./scripts/start-servers.sh
```

### Problem: Backend dependencies missing
**Solution:**
```bash
# Install dependencies manually
cd backend
npm install
cd ..

# Start servers
./scripts/start-servers.sh
```

### Problem: Can't access application
**Solution:**
```bash
# Verify servers are running
lsof -i :8000  # Backend
lsof -i :3000  # Frontend

# Check logs for errors
tail -f logs/backend-server.log
tail -f logs/frontend-server.log

# Try accessing directly
curl http://localhost:8000/api/health  # Backend health check
curl http://localhost:3000/        # Frontend index
```

## Process Management

### Find Server PIDs
```bash
# From PID files
cat logs/backend.pid
cat logs/frontend.pid

# From ports
lsof -ti :8000  # Backend
lsof -ti :3000  # Frontend

# From process name
ps aux | grep "server-production.js"
ps aux | grep "http.server 3000"
```

### Manual Process Control
```bash
# Stop specific server
kill $(cat logs/backend.pid)
kill $(cat logs/frontend.pid)

# Force stop
kill -9 $(cat logs/backend.pid)
kill -9 $(cat logs/frontend.pid)

# Stop by port
kill $(lsof -ti :8000)
kill $(lsof -ti :3000)
```

## Script Features

### Automatic Port Conflict Resolution
- Checks if ports are in use before starting
- Automatically kills conflicting processes
- Verifies ports are free before proceeding

### Dependency Verification
- Checks for Node.js, npm, Python3
- Installs backend dependencies if missing
- Exits with helpful error if dependencies unavailable

### Process Tracking
- Creates PID files for each server
- Enables graceful shutdown
- Tracks server status

### Comprehensive Logging
- Redirects output to log files
- Preserves stdout and stderr
- Easy debugging with `tail -f`

### Robust Cleanup
- Graceful shutdown (SIGTERM) attempted first
- Force kill (SIGKILL) if needed
- Multiple cleanup strategies
- Verifies all processes stopped

### Color-Coded Output
- Blue: Info messages
- Green: Success messages
- Yellow: Warning messages
- Red: Error messages

## Advanced Usage

### Running in Detached Mode
The scripts already run servers in the background. You can safely close the terminal after starting.

### Custom Startup
```bash
# Start only backend (manual)
cd backend && npm run dev

# Start only frontend (manual)
cd frontend && python3 -m http.server 3000
```

### Production Deployment
For production, use PM2 instead:
```bash
# Install PM2
npm install -g pm2

# Start backend with PM2
cd backend
pm2 start src/server-production.js --name "urban-mobility-api"

# Start frontend with PM2
cd frontend
pm2 start "python3 -m http.server 3000" --name "urban-mobility-frontend"

# Save PM2 configuration
pm2 save
pm2 startup
```

## Script Maintenance

### Adding Health Checks
Edit `start-servers.sh` and add after starting servers:
```bash
# Health check for backend
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
fi
```

### Adding Restart Command
Create `scripts/restart-servers.sh`:
```bash
#!/bin/bash
./scripts/stop-servers.sh
sleep 2
./scripts/start-servers.sh
```

### Adding Status Command
Create `scripts/status-servers.sh`:
```bash
#!/bin/bash
echo "Backend: $(lsof -ti :8000 > /dev/null && echo "Running" || echo "Stopped")"
echo "Frontend: $(lsof -ti :3000 > /dev/null && echo "Running" || echo "Stopped")"
```

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=8000
HOST=localhost
DB_HOST=localhost
DB_PORT=5432
DB_NAME=urban_mobility
```

### Frontend
No environment variables needed (static server).

## Logs Location

All logs are stored in `logs/`:
- `backend-server.log` - Backend stdout/stderr
- `frontend-server.log` - Frontend stdout/stderr
- `backend.pid` - Backend process ID
- `frontend.pid` - Frontend process ID

## Best Practices

1. **Always use the scripts** instead of manual commands
2. **Stop servers before system shutdown** to prevent orphaned processes
3. **Check logs first** when troubleshooting
4. **Keep PID files clean** - scripts handle this automatically
5. **Update ports in scripts** if you change server configuration

## Support

If you encounter issues:
1. Check the logs in `logs/`
2. Run `./scripts/stop-servers.sh` to clean up
3. Try starting again with `./scripts/start-servers.sh`
4. Check troubleshooting section above

## Credits

Created for the Urban Mobility Data Explorer project.
Provides production-ready server management.

