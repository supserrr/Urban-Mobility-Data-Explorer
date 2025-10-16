#!/bin/bash

################################################################################
# Urban Mobility Data Explorer - Server Shutdown Script
# Gracefully stops both frontend and backend servers
################################################################################

set -e  # Exit on error

echo "=================================="
echo "Urban Mobility Server Shutdown"
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
# Function: Kill process by PID file
################################################################################
kill_by_pid_file() {
    local pid_file=$1
    local server_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping $server_name (PID: $pid)...${NC}"
            kill -15 $pid 2>/dev/null || kill -9 $pid 2>/dev/null
            sleep 1
            
            if ps -p $pid > /dev/null 2>&1; then
                echo -e "${RED}Failed to stop $server_name gracefully, forcing...${NC}"
                kill -9 $pid 2>/dev/null || true
            fi
            
            echo -e "${GREEN}✓ $server_name stopped${NC}"
        else
            echo -e "${YELLOW}$server_name (PID: $pid) not running${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}No PID file found for $server_name${NC}"
    fi
}

################################################################################
# Function: Kill process by port
################################################################################
kill_by_port() {
    local port=$1
    local server_name=$2
    
    local pids=$(lsof -ti :$port 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}Stopping $server_name on port $port (PIDs: $pids)...${NC}"
        echo "$pids" | xargs kill -15 2>/dev/null || echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✓ $server_name stopped${NC}"
    else
        echo -e "${GREEN}✓ No process running on port $port${NC}"
    fi
}

################################################################################
# Step 1: Stop servers using PID files
################################################################################
echo -e "${BLUE}Step 1: Stopping servers using PID files...${NC}"
kill_by_pid_file "$PROJECT_ROOT/logs/backend.pid" "Backend Server"
kill_by_pid_file "$PROJECT_ROOT/logs/frontend.pid" "Frontend Server"
echo ""

################################################################################
# Step 2: Clean up any remaining processes on ports
################################################################################
echo -e "${BLUE}Step 2: Cleaning up ports...${NC}"
kill_by_port $BACKEND_PORT "Backend Server"
kill_by_port $FRONTEND_PORT "Frontend Server"
echo ""

################################################################################
# Step 3: Clean up any Node.js or Python HTTP servers
################################################################################
echo -e "${BLUE}Step 3: Cleaning up remaining processes...${NC}"

# Kill any remaining nodemon processes
if pgrep -f "nodemon" > /dev/null; then
    echo -e "${YELLOW}Killing remaining nodemon processes...${NC}"
    pkill -f "nodemon" || true
    sleep 1
fi

# Kill any remaining node processes running our server
if pgrep -f "server-production.js" > /dev/null; then
    echo -e "${YELLOW}Killing remaining node server processes...${NC}"
    pkill -f "server-production.js" || true
    sleep 1
fi

# Kill any remaining Python HTTP servers on our port
if pgrep -f "python3 -m http.server $FRONTEND_PORT" > /dev/null; then
    echo -e "${YELLOW}Killing remaining Python HTTP servers...${NC}"
    pkill -f "python3 -m http.server $FRONTEND_PORT" || true
    sleep 1
fi

echo -e "${GREEN}✓ All processes cleaned up${NC}"
echo ""

################################################################################
# Step 4: Verify ports are free
################################################################################
echo -e "${BLUE}Step 4: Verifying ports are free...${NC}"

if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}✗ Port $BACKEND_PORT is still in use${NC}"
else
    echo -e "${GREEN}✓ Port $BACKEND_PORT is free${NC}"
fi

if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}✗ Port $FRONTEND_PORT is still in use${NC}"
else
    echo -e "${GREEN}✓ Port $FRONTEND_PORT is free${NC}"
fi

echo ""

################################################################################
# Success Summary
################################################################################
echo "=================================="
echo -e "${GREEN}✓ ALL SERVERS STOPPED${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}Ports cleared:${NC}"
echo -e "  Backend:  $BACKEND_PORT"
echo -e "  Frontend: $FRONTEND_PORT"
echo ""
echo -e "${BLUE}To restart servers:${NC}"
echo -e "  ./scripts/start-servers.sh"
echo ""
echo "=================================="

