#!/bin/bash

################################################################################
# Urban Mobility Data Explorer - Server Startup Script
# Automatically handles port conflicts and starts both servers
################################################################################

set -e  # Exit on error

echo "=================================="
echo "Urban Mobility Server Startup"
echo "=================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration  
# Backend on port 8000, Frontend on port 3000
# Port 8000 avoids conflicts with macOS AirPlay (port 5000)
BACKEND_PORT=8000
FRONTEND_PORT=3000
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}Project Root:${NC} $PROJECT_ROOT"
echo ""

################################################################################
# Function: Kill process on port (aggressive with retries)
################################################################################
kill_port() {
    local port=$1
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local pids=$(lsof -ti :$port 2>/dev/null)
        
        if [ -z "$pids" ]; then
            echo -e "${GREEN}Port $port is available${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}Attempt $attempt/$max_attempts: Port $port in use (PIDs: $pids)${NC}"
        
        # Try graceful kill first
        echo "$pids" | xargs kill -15 2>/dev/null || true
        sleep 1
        
        # Force kill if still running
        pids=$(lsof -ti :$port 2>/dev/null)
        if [ ! -z "$pids" ]; then
            echo "$pids" | xargs kill -9 2>/dev/null || true
            sleep 2
        fi
        
        attempt=$((attempt + 1))
    done
    
    # Final check
    pids=$(lsof -ti :$port 2>/dev/null)
    if [ -z "$pids" ]; then
        echo -e "${GREEN}Port $port cleared after $((attempt-1)) attempts${NC}"
        return 0
    else
        echo -e "${RED}Failed to clear port $port after $max_attempts attempts${NC}"
        return 1
    fi
}

################################################################################
# Function: Check if port is free
################################################################################
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 1  # Port is in use
    else
        return 0  # Port is free
    fi
}

################################################################################
# Step 1: Clean up existing processes
################################################################################
echo -e "${BLUE}Step 1: Checking and clearing ports...${NC}"
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
echo ""

################################################################################
# Step 2: Verify ports are free
################################################################################
echo -e "${BLUE}Step 2: Verifying ports are available...${NC}"
sleep 1

if check_port $BACKEND_PORT; then
    echo -e "${GREEN}✓ Backend port $BACKEND_PORT is ready${NC}"
else
    echo -e "${RED}✗ Backend port $BACKEND_PORT is still in use${NC}"
    exit 1
fi

if check_port $FRONTEND_PORT; then
    echo -e "${GREEN}✓ Frontend port $FRONTEND_PORT is ready${NC}"
else
    echo -e "${RED}✗ Frontend port $FRONTEND_PORT is still in use${NC}"
    exit 1
fi
echo ""

################################################################################
# Step 3: Check dependencies
################################################################################
echo -e "${BLUE}Step 3: Checking dependencies...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Node.js $(node --version)${NC}"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
else
    echo -e "${GREEN}✓ npm $(npm --version)${NC}"
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python3 is not installed${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Python3 $(python3 --version)${NC}"
fi

# Check backend node_modules
if [ ! -d "$PROJECT_ROOT/backend/node_modules" ]; then
    echo -e "${YELLOW}! Backend dependencies not installed. Installing...${NC}"
    cd "$PROJECT_ROOT/backend"
    npm install
    cd "$PROJECT_ROOT"
fi

echo ""

################################################################################
# Step 3.5: Validate Backend Configuration (CRITICAL)
################################################################################
echo -e "${BLUE}Step 3.5: Validating backend configuration...${NC}"

# Check if .env file exists
if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
    echo -e "${RED}✗ CRITICAL: backend/.env file not found${NC}"
    echo -e "${YELLOW}Creating .env from template...${NC}"
    
    if [ -f "$PROJECT_ROOT/backend/env.example" ]; then
        cp "$PROJECT_ROOT/backend/env.example" "$PROJECT_ROOT/backend/.env"
        echo -e "${GREEN}✓ Created backend/.env from template${NC}"
        
        # Generate API key
        echo -e "${YELLOW}Generating secure API key...${NC}"
        cd "$PROJECT_ROOT/backend"
        API_KEY=$(node src/utils/generateApiKey.js --quiet 2>/dev/null | tr -d '\n' || openssl rand -hex 32 | tr -d '\n')
        
        # Verify API key was generated
        if [ -z "$API_KEY" ]; then
            echo -e "${RED}✗ Failed to generate API key${NC}"
            exit 1
        fi
        
        # Update API key in .env
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/API_KEYS=.*/API_KEYS=$API_KEY/" .env
            sed -i '' "s/DB_USER=.*/DB_USER=$(whoami)/" .env
            sed -i '' "s/DB_PASSWORD=.*/DB_PASSWORD=/" .env
        else
            sed -i "s/API_KEYS=.*/API_KEYS=$API_KEY/" .env
            sed -i "s/DB_USER=.*/DB_USER=$(whoami)/" .env
            sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=/" .env
        fi
        
        # Update frontend config.js
        if [ -f "$PROJECT_ROOT/frontend/config.js" ]; then
            echo -e "${YELLOW}Updating frontend API key...${NC}"
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/API_KEY: '[^']*'/API_KEY: '$API_KEY'/" "$PROJECT_ROOT/frontend/config.js"
            else
                sed -i "s/API_KEY: '[^']*'/API_KEY: '$API_KEY'/" "$PROJECT_ROOT/frontend/config.js"
            fi
            echo -e "${GREEN}✓ Updated frontend/config.js with matching API key${NC}"
        fi
        
        cd "$PROJECT_ROOT"
        echo -e "${GREEN}✓ Configuration created with API key${NC}"
    else
        echo -e "${RED}✗ backend/env.example not found${NC}"
        echo -e "${RED}Cannot create .env file. Please create it manually.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ backend/.env exists${NC}"
fi

# Validate API_KEYS is configured
if grep -q "^API_KEYS=your_api_key_here" "$PROJECT_ROOT/backend/.env" 2>/dev/null; then
    echo -e "${RED}✗ API_KEYS not configured (still has default value)${NC}"
    echo -e "${YELLOW}Generating new API key...${NC}"
    
    cd "$PROJECT_ROOT/backend"
    API_KEY=$(node src/utils/generateApiKey.js --quiet 2>/dev/null | tr -d '\n' || openssl rand -hex 32 | tr -d '\n')
    
    # Verify API key was generated
    if [ -z "$API_KEY" ]; then
        echo -e "${RED}✗ Failed to generate API key${NC}"
        exit 1
    fi
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/API_KEYS=.*/API_KEYS=$API_KEY/" .env
    else
        sed -i "s/API_KEYS=.*/API_KEYS=$API_KEY/" .env
    fi
    
    # Update frontend
    if [ -f "$PROJECT_ROOT/frontend/config.js" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/API_KEY: '[^']*'/API_KEY: '$API_KEY'/" "$PROJECT_ROOT/frontend/config.js"
        else
            sed -i "s/API_KEY: '[^']*'/API_KEY: '$API_KEY'/" "$PROJECT_ROOT/frontend/config.js"
        fi
    fi
    
    cd "$PROJECT_ROOT"
    echo -e "${GREEN}✓ Generated and configured new API key${NC}"
elif grep -q "^API_KEYS=" "$PROJECT_ROOT/backend/.env" 2>/dev/null; then
    echo -e "${GREEN}✓ API_KEYS is configured${NC}"
else
    echo -e "${RED}✗ API_KEYS not found in .env${NC}"
    exit 1
fi

# Check for duplicate API_KEYS
API_KEY_COUNT=$(grep -c "^API_KEYS=" "$PROJECT_ROOT/backend/.env" 2>/dev/null || echo "0")
if [ "$API_KEY_COUNT" -gt 1 ]; then
    echo -e "${RED}✗ Duplicate API_KEYS found in .env (found $API_KEY_COUNT)${NC}"
    echo -e "${YELLOW}Removing duplicates...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' '2,${/^API_KEYS=/d;}' "$PROJECT_ROOT/backend/.env"
    else
        sed -i '2,${/^API_KEYS=/d;}' "$PROJECT_ROOT/backend/.env"
    fi
    
    echo -e "${GREEN}✓ Removed duplicate API_KEYS entries${NC}"
fi

# Verify API key synchronization between backend and frontend
BACKEND_API_KEY=$(grep "^API_KEYS=" "$PROJECT_ROOT/backend/.env" | head -1 | cut -d'=' -f2)
FRONTEND_API_KEY=$(grep "API_KEY:" "$PROJECT_ROOT/frontend/config.js" | grep -o "'[^']*'" | tr -d "'")

if [ "$BACKEND_API_KEY" != "$FRONTEND_API_KEY" ]; then
    echo -e "${YELLOW}⚠ API keys don't match between backend and frontend${NC}"
    echo -e "${YELLOW}Synchronizing keys...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/API_KEY: '[^']*'/API_KEY: '$BACKEND_API_KEY'/" "$PROJECT_ROOT/frontend/config.js"
    else
        sed -i "s/API_KEY: '[^']*'/API_KEY: '$BACKEND_API_KEY'/" "$PROJECT_ROOT/frontend/config.js"
    fi
    
    echo -e "${GREEN}✓ Frontend API key synchronized with backend${NC}"
else
    echo -e "${GREEN}✓ API keys match between backend and frontend${NC}"
fi

echo -e "${GREEN}✓ Configuration validation complete${NC}"
echo ""

# Validate MAPTILER_API_KEY is not a placeholder
if grep -q "^MAPTILER_API_KEY=your_maptiler_api_key_here" "$PROJECT_ROOT/backend/.env" 2>/dev/null; then
    echo -e "${YELLOW}⚠ MAPTILER_API_KEY is set to placeholder value${NC}"
    echo -e "${YELLOW}Map features may not work correctly.${NC}"
    echo -e "${YELLOW}To fix: Update MAPTILER_API_KEY in backend/.env with a valid key from https://cloud.maptiler.com/${NC}"
    echo ""
elif grep -q "^MAPTILER_API_KEY=" "$PROJECT_ROOT/backend/.env" 2>/dev/null; then
    MAPTILER_KEY=$(grep "^MAPTILER_API_KEY=" "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2)
    if [[ -z "$MAPTILER_KEY" ]]; then
        echo -e "${YELLOW}⚠ MAPTILER_API_KEY is empty${NC}"
        echo -e "${YELLOW}Map features may not work correctly.${NC}"
    else
        echo -e "${GREEN}✓ MAPTILER_API_KEY is configured${NC}"
    fi
else
    echo -e "${YELLOW}⚠ MAPTILER_API_KEY not found in .env${NC}"
    echo -e "${YELLOW}Map features may not work correctly.${NC}"
fi
echo ""

################################################################################
# Step 3.6: Auto-configure Database Settings
################################################################################
echo -e "${BLUE}Step 3.6: Auto-configuring database settings...${NC}"

# Always update DB_USER to current user (for peer authentication on macOS/Linux)
CURRENT_USER=$(whoami)
CURRENT_DB_USER=$(grep "^DB_USER=" "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2)

if [ "$CURRENT_DB_USER" != "$CURRENT_USER" ]; then
    echo -e "${YELLOW}Updating DB_USER from '$CURRENT_DB_USER' to '$CURRENT_USER'${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^DB_USER=.*/DB_USER=$CURRENT_USER/" "$PROJECT_ROOT/backend/.env"
        sed -i '' "s/^DB_PASSWORD=.*/DB_PASSWORD=/" "$PROJECT_ROOT/backend/.env"
    else
        sed -i "s/^DB_USER=.*/DB_USER=$CURRENT_USER/" "$PROJECT_ROOT/backend/.env"
        sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=/" "$PROJECT_ROOT/backend/.env"
    fi
    echo -e "${GREEN}✓ DB_USER set to '$CURRENT_USER' (peer authentication)${NC}"
else
    echo -e "${GREEN}✓ DB_USER is already set to '$CURRENT_USER'${NC}"
fi

# Extract database configuration
DB_NAME=$(grep "^DB_NAME=" "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2)
DB_HOST=$(grep "^DB_HOST=" "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2)
DB_PORT=$(grep "^DB_PORT=" "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2)

echo ""

################################################################################
# Step 3.7: PostgreSQL Detection and Setup
################################################################################
echo -e "${BLUE}Step 3.7: Checking PostgreSQL installation...${NC}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}✗ PostgreSQL is not installed${NC}"
    echo ""
    echo -e "${YELLOW}PostgreSQL is required for this application.${NC}"
    echo ""
    echo -e "${BLUE}Installation instructions:${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "  macOS (using Homebrew):"
        echo -e "    ${GREEN}brew install postgresql@15${NC}"
        echo -e "    ${GREEN}brew services start postgresql@15${NC}"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo -e "  Ubuntu/Debian:"
        echo -e "    ${GREEN}sudo apt-get update${NC}"
        echo -e "    ${GREEN}sudo apt-get install postgresql postgresql-contrib${NC}"
        echo -e "    ${GREEN}sudo systemctl start postgresql${NC}"
        echo ""
        echo -e "  Fedora/RHEL:"
        echo -e "    ${GREEN}sudo dnf install postgresql-server${NC}"
        echo -e "    ${GREEN}sudo systemctl start postgresql${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}After installing PostgreSQL, run this script again.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ PostgreSQL is installed${NC}"
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    echo -e "  Version: $PSQL_VERSION"
fi

# Check if PostgreSQL is running
echo -e "${YELLOW}Checking if PostgreSQL is running...${NC}"
if pg_isready -h "$DB_HOST" -p "$DB_PORT" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ PostgreSQL is not running${NC}"
    echo ""
    echo -e "${YELLOW}Starting PostgreSQL...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # Try to start PostgreSQL on macOS
        if command -v brew &> /dev/null; then
            # Try different PostgreSQL versions
            for version in 15 14 13 16 ""; do
                if [ -z "$version" ]; then
                    SERVICE_NAME="postgresql"
                else
                    SERVICE_NAME="postgresql@$version"
                fi
                
                if brew services list | grep -q "$SERVICE_NAME"; then
                    echo -e "${YELLOW}Starting $SERVICE_NAME...${NC}"
                    brew services start "$SERVICE_NAME" > /dev/null 2>&1
                    sleep 3
                    
                    if pg_isready -h "$DB_HOST" -p "$DB_PORT" > /dev/null 2>&1; then
                        echo -e "${GREEN}✓ PostgreSQL started successfully${NC}"
                        break
                    fi
                fi
            done
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Try to start PostgreSQL on Linux
        sudo systemctl start postgresql > /dev/null 2>&1
        sleep 2
    fi
    
    # Final check
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" > /dev/null 2>&1; then
        echo -e "${RED}✗ Failed to start PostgreSQL${NC}"
        echo ""
        echo -e "${YELLOW}Please start PostgreSQL manually:${NC}"
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo -e "  ${GREEN}brew services start postgresql@15${NC}"
        else
            echo -e "  ${GREEN}sudo systemctl start postgresql${NC}"
        fi
        
        exit 1
    fi
fi

echo ""

################################################################################
# Step 3.8: Database Creation and Setup
################################################################################
echo -e "${BLUE}Step 3.8: Setting up database...${NC}"

# Check if database exists
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$CURRENT_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${GREEN}✓ Database '$DB_NAME' already exists${NC}"
else
    echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
    
    if createdb -h "$DB_HOST" -p "$DB_PORT" -U "$CURRENT_USER" "$DB_NAME" 2>/dev/null; then
        echo -e "${GREEN}✓ Database '$DB_NAME' created successfully${NC}"
    else
        echo -e "${RED}✗ Failed to create database '$DB_NAME'${NC}"
        echo ""
        echo -e "${YELLOW}Trying with template0...${NC}"
        
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$CURRENT_USER" -c "CREATE DATABASE $DB_NAME;" postgres 2>/dev/null; then
            echo -e "${GREEN}✓ Database '$DB_NAME' created successfully${NC}"
        else
            echo -e "${RED}✗ Failed to create database${NC}"
            echo ""
            echo -e "${YELLOW}Please create the database manually:${NC}"
            echo -e "  ${GREEN}createdb $DB_NAME${NC}"
            echo -e "  or"
            echo -e "  ${GREEN}psql -c 'CREATE DATABASE $DB_NAME;' postgres${NC}"
            exit 1
        fi
    fi
fi

# Check if schema is already set up
echo -e "${YELLOW}Checking database schema...${NC}"
TABLES_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$CURRENT_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

if [ "$TABLES_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Database schema exists ($TABLES_COUNT tables found)${NC}"
else
    echo -e "${YELLOW}No schema found. Setting up database schema...${NC}"
    
    # Look for schema files
    SCHEMA_FILE=""
    if [ -f "$PROJECT_ROOT/database/schema_inclusive.sql" ]; then
        SCHEMA_FILE="$PROJECT_ROOT/database/schema_inclusive.sql"
        echo -e "${YELLOW}Using schema_inclusive.sql${NC}"
    elif [ -f "$PROJECT_ROOT/database/schema_production.sql" ]; then
        SCHEMA_FILE="$PROJECT_ROOT/database/schema_production.sql"
        echo -e "${YELLOW}Using schema_production.sql${NC}"
    elif [ -f "$PROJECT_ROOT/database/schema.sql" ]; then
        SCHEMA_FILE="$PROJECT_ROOT/database/schema.sql"
        echo -e "${YELLOW}Using schema.sql${NC}"
    fi
    
    if [ -n "$SCHEMA_FILE" ]; then
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$CURRENT_USER" -d "$DB_NAME" -f "$SCHEMA_FILE" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Database schema created successfully${NC}"
        else
            echo -e "${YELLOW}⚠ Schema setup had some warnings (this may be normal)${NC}"
            echo -e "${GREEN}✓ Continuing with startup${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ No schema file found in database/ directory${NC}"
        echo -e "${YELLOW}⚠ Database will be empty. You may need to run setup manually.${NC}"
    fi
fi

echo -e "${GREEN}✓ Database setup complete${NC}"
echo ""

################################################################################
# Step 4: Start Backend Server
################################################################################
echo -e "${BLUE}Step 4: Starting Backend Server...${NC}"
cd "$PROJECT_ROOT/backend"

# Start backend in background
nohup npm run dev > "$PROJECT_ROOT/logs/backend-server.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PROJECT_ROOT/logs/backend.pid"

echo -e "${GREEN}✓ Backend server started (PID: $BACKEND_PID)${NC}"
echo -e "  Port: $BACKEND_PORT"
echo -e "  URL: http://localhost:$BACKEND_PORT"
echo -e "  Log: logs/backend-server.log"
echo ""

# Wait for backend to start (nodemon needs time to spawn node process)
echo -e "${YELLOW}Waiting for backend to initialize...${NC}"
sleep 6

# Verify backend is running
if check_port $BACKEND_PORT; then
    echo -e "${RED}✗ Backend failed to start on port $BACKEND_PORT${NC}"
    echo -e "${YELLOW}Check logs/backend-server.log for errors${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Backend is running on port $BACKEND_PORT${NC}"
fi
echo ""

################################################################################
# Step 5: Start Frontend Server
################################################################################
echo -e "${BLUE}Step 5: Starting Frontend Server...${NC}"
cd "$PROJECT_ROOT/frontend"

# Start frontend in background
nohup python3 -m http.server $FRONTEND_PORT > "$PROJECT_ROOT/logs/frontend-server.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PROJECT_ROOT/logs/frontend.pid"

echo -e "${GREEN}✓ Frontend server started (PID: $FRONTEND_PID)${NC}"
echo -e "  Port: $FRONTEND_PORT"
echo -e "  URL: http://localhost:$FRONTEND_PORT"
echo -e "  Log: logs/frontend-server.log"
echo ""

# Wait for frontend to start
echo -e "${YELLOW}Waiting for frontend to initialize...${NC}"
sleep 2

# Verify frontend is running
if check_port $FRONTEND_PORT; then
    echo -e "${RED}✗ Frontend failed to start on port $FRONTEND_PORT${NC}"
    echo -e "${YELLOW}Check logs/frontend-server.log for errors${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Frontend is running on port $FRONTEND_PORT${NC}"
fi
echo ""

################################################################################
# Success Summary
################################################################################
echo "=================================="
echo -e "${GREEN}✓ ALL SERVERS RUNNING${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}Access your application:${NC}"
echo -e "  ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
echo ""
echo -e "${BLUE}API Endpoint:${NC}"
echo -e "  ${GREEN}http://localhost:$BACKEND_PORT${NC}"
echo ""
echo -e "${BLUE}Server PIDs:${NC}"
echo -e "  Backend:  $BACKEND_PID"
echo -e "  Frontend: $FRONTEND_PID"
echo ""
echo -e "${BLUE}Server Logs:${NC}"
echo -e "  Backend:  logs/backend-server.log"
echo -e "  Frontend: logs/frontend-server.log"
echo ""
echo -e "${BLUE}To stop servers:${NC}"
echo -e "  ./scripts/stop-servers.sh"
echo ""
echo -e "${BLUE}To view logs:${NC}"
echo -e "  tail -f logs/backend-server.log"
echo -e "  tail -f logs/frontend-server.log"
echo ""
echo "=================================="

################################################################################
# Auto-open Setup Page
################################################################################
echo ""
echo -e "${BLUE}Step 6: Opening setup page...${NC}"

SETUP_URL="http://localhost:$FRONTEND_PORT/setup.html?api_key=$BACKEND_API_KEY"

# Check if NO_BROWSER env var is set (allows skipping browser open)
if [ "$NO_BROWSER" = "true" ]; then
    echo -e "${YELLOW}Skipping browser open (NO_BROWSER=true)${NC}"
    echo -e "${YELLOW}Manual setup URL:${NC}"
    echo -e "  ${GREEN}$SETUP_URL${NC}"
else
    echo -e "${YELLOW}Opening setup page in browser...${NC}"
    
    # Open browser based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "$SETUP_URL" 2>/dev/null && echo -e "${GREEN}✓ Browser opened${NC}" || {
            echo -e "${YELLOW}Could not auto-open browser${NC}"
            echo -e "${YELLOW}Please visit manually:${NC} ${GREEN}$SETUP_URL${NC}"
        }
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v xdg-open &> /dev/null; then
            xdg-open "$SETUP_URL" 2>/dev/null && echo -e "${GREEN}✓ Browser opened${NC}" || {
                echo -e "${YELLOW}Could not auto-open browser${NC}"
                echo -e "${YELLOW}Please visit manually:${NC} ${GREEN}$SETUP_URL${NC}"
            }
        else
            echo -e "${YELLOW}xdg-open not found${NC}"
            echo -e "${YELLOW}Please visit manually:${NC} ${GREEN}$SETUP_URL${NC}"
        fi
    else
        echo -e "${YELLOW}Unknown OS - cannot auto-open browser${NC}"
        echo -e "${YELLOW}Please visit manually:${NC} ${GREEN}$SETUP_URL${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}The setup page will:${NC}"
    echo -e "  1. Clear old browser data (localStorage)"
    echo -e "  2. Configure API authentication"
    echo -e "  3. Verify backend connection"
    echo -e "  4. Launch the main dashboard"
fi

echo ""
echo -e "${YELLOW}Note: To skip auto-open in future, run: NO_BROWSER=true ./scripts/start-servers.sh${NC}"

# Return to project root
cd "$PROJECT_ROOT"

