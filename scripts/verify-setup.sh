#!/bin/bash

################################################################################
# Urban Mobility Data Explorer - Setup Verification Script
################################################################################
# 
# This script verifies that the application is properly set up and configured.
# It checks all components and reports any issues.
#
# Usage: ./verify-setup.sh
#
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DB_NAME="${DB_NAME:-urban_mobility}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Counters
PASSED=0
FAILED=0
WARNINGS=0

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_test() {
    echo -e "${NC}Testing: $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

print_warn() {
    echo -e "${YELLOW} WARN${NC}: $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${NC}  ℹ $1${NC}"
}

################################################################################
# Verification Tests
################################################################################

verify_prerequisites() {
    print_header "Prerequisites"
    
    # Node.js
    print_test "Node.js installation"
    if command -v node >/dev/null 2>&1; then
        version=$(node -v)
        print_pass "Node.js $version installed"
    else
        print_fail "Node.js not found"
        print_info "Install from: https://nodejs.org/"
    fi
    
    # npm
    print_test "npm installation"
    if command -v npm >/dev/null 2>&1; then
        version=$(npm -v)
        print_pass "npm $version installed"
    else
        print_fail "npm not found"
    fi
    
    # PostgreSQL
    print_test "PostgreSQL installation"
    if command -v psql >/dev/null 2>&1; then
        version=$(psql --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
        print_pass "PostgreSQL $version installed"
    else
        print_fail "PostgreSQL not found"
        print_info "Install from: https://www.postgresql.org/"
    fi
}

verify_directory_structure() {
    print_header "Directory Structure"
    
    local required_dirs=(
        "backend"
        "backend/src"
        "backend/src/config"
        "backend/src/controllers"
        "backend/src/services"
        "backend/src/routes"
        "frontend"
        "frontend/components"
        "database"
        "scripts"
        "data/raw"
        "data/processed"
        "logs"
    )
    
    for dir in "${required_dirs[@]}"; do
        print_test "Directory: $dir"
        if [ -d "$dir" ]; then
            print_pass "$dir exists"
        else
            print_fail "$dir not found"
        fi
    done
}

verify_dependencies() {
    print_header "Dependencies"
    
    # Backend dependencies
    print_test "Backend node_modules"
    if [ -d "backend/node_modules" ]; then
        print_pass "Backend dependencies installed"
        
        # Check key packages
        if [ -d "backend/node_modules/express" ]; then
            print_pass "Express installed"
        else
            print_fail "Express not found"
        fi
        
        if [ -d "backend/node_modules/pg" ]; then
            print_pass "PostgreSQL driver (pg) installed"
        else
            print_fail "PostgreSQL driver not found"
        fi
    else
        print_fail "Backend dependencies not installed"
        print_info "Run: cd backend && npm install"
    fi
    
    # Scripts dependencies
    print_test "Scripts node_modules"
    if [ -d "scripts/node_modules" ]; then
        print_pass "Scripts dependencies installed"
    else
        print_warn "Scripts dependencies not installed"
        print_info "Run: cd scripts && npm install"
    fi
}

verify_configuration() {
    print_header "Configuration Files"
    
    # Backend .env
    print_test "Backend environment file"
    if [ -f "backend/.env" ]; then
        print_pass "backend/.env exists"
        
        # Check required variables
        if grep -q "DB_NAME" backend/.env; then
            print_pass "DB_NAME configured"
        else
            print_warn "DB_NAME not found in .env"
        fi
        
        if grep -q "DB_USER" backend/.env; then
            print_pass "DB_USER configured"
        else
            print_warn "DB_USER not found in .env"
        fi
        
        if grep -q "PORT" backend/.env; then
            print_pass "PORT configured"
        else
            print_warn "PORT not found in .env"
        fi
        
        # Check API_KEYS configuration
        print_test "API key configuration"
        if grep -q "^API_KEYS=" backend/.env; then
            # Check if it's not the default value
            if grep -q "^API_KEYS=your_api_key_here" backend/.env; then
                print_fail "API_KEYS has default value (not configured)"
                print_info "Run: node backend/src/utils/generateApiKey.js"
            else
                print_pass "API_KEYS is configured"
                
                # Check for duplicates
                local api_key_count=$(grep -c "^API_KEYS=" backend/.env)
                if [ "$api_key_count" -gt 1 ]; then
                    print_fail "Duplicate API_KEYS found ($api_key_count entries)"
                    print_info "Remove duplicate lines from backend/.env"
                else
                    print_pass "No duplicate API_KEYS entries"
                fi
                
                # Verify synchronization with frontend
                print_test "API key synchronization"
                if [ -f "frontend/config.js" ]; then
                    local backend_key=$(grep "^API_KEYS=" backend/.env | head -1 | cut -d'=' -f2)
                    local frontend_key=$(grep "API_KEY:" frontend/config.js | grep -o "'[^']*'" | tr -d "'" | head -1)
                    
                    if [ "$backend_key" = "$frontend_key" ]; then
                        print_pass "API keys match between backend and frontend"
                    else
                        print_fail "API keys don't match between backend and frontend"
                        print_info "Backend: ${backend_key:0:16}..."
                        print_info "Frontend: ${frontend_key:0:16}..."
                    fi
                fi
            fi
        else
            print_fail "API_KEYS not found in .env"
            print_info "Add: API_KEYS=<your_generated_key>"
        fi
    else
        print_fail "backend/.env not found"
        print_info "Copy from: backend/env.example"
        print_info "Then configure API_KEYS"
    fi
    
    # Database schema
    print_test "Database schema file"
    if [ -f "database/schema_production.sql" ]; then
        print_pass "database/schema_production.sql exists"
    elif [ -f "database/schema_inclusive.sql" ]; then
        print_pass "database/schema_inclusive.sql exists"
    else
        print_fail "database schema file not found"
    fi
}

verify_database() {
    print_header "Database"
    
    # Check if database exists
    print_test "Database existence"
    if psql -U "$DB_USER" -h "$DB_HOST" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_pass "Database '$DB_NAME' exists"
        
        # Check tables
        print_test "Database tables"
        local table_count=$(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'" 2>/dev/null || echo "0")
        
        if [ "$table_count" -gt 0 ]; then
            print_pass "$table_count tables found"
            
            # Check trips table
            if psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -tAc "\dt trips" 2>/dev/null | grep -q "trips"; then
                print_pass "trips table exists"
                
                # Check record count
                local record_count=$(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM trips" 2>/dev/null || echo "0")
                if [ "$record_count" -gt 0 ]; then
                    print_pass "$record_count records in trips table"
                else
                    print_warn "trips table is empty"
                    print_info "Import data: cd scripts && node importDataInclusive.js"
                fi
            else
                print_fail "trips table not found"
                print_info "Run database schema"
            fi
        else
            print_fail "No tables found in database"
            print_info "Run: psql -U $DB_USER -d $DB_NAME -f database/schema_production.sql"
        fi
    else
        print_fail "Database '$DB_NAME' not found"
        print_info "Run: createdb -U $DB_USER $DB_NAME"
        print_info "Then: psql -U $DB_USER -d $DB_NAME -f database/schema_production.sql"
    fi
    
    # Check database connection
    print_test "Database connection"
    if psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
        print_pass "Can connect to database"
    else
        print_fail "Cannot connect to database"
        print_info "Check credentials in backend/.env"
    fi
}

verify_data_files() {
    print_header "Data Files"
    
    # Check for CSV data
    print_test "Raw data file"
    if [ -f "data/raw/train.csv" ]; then
        size=$(du -h "data/raw/train.csv" | cut -f1)
        print_pass "train.csv exists ($size)"
    else
        print_warn "train.csv not found"
        print_info "Place CSV file at: data/raw/train.csv"
    fi
    
    # Check processed data
    print_test "Processed data"
    if [ "$(ls -A data/processed 2>/dev/null)" ]; then
        print_pass "Processed data files exist"
    else
        print_warn "No processed data files"
    fi
}

verify_key_files() {
    print_header "Key Application Files"
    
    local required_files=(
        "backend/src/server.js"
        "backend/src/server-production.js"
        "backend/src/config/database.js"
        "backend/src/config/logger.js"
        "backend/package.json"
        "frontend/index.html"
        "frontend/main.js"
        "scripts/importDataInclusive.js"
        "setup.sh"
        "README.md"
    )
    
    for file in "${required_files[@]}"; do
        print_test "File: $file"
        if [ -f "$file" ]; then
            print_pass "$file exists"
        else
            print_fail "$file not found"
        fi
    done
}

verify_ports() {
    print_header "Port Availability"
    
    # Check if ports are in use
    print_test "Port 3000 (Backend)"
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warn "Port 3000 is in use"
        print_info "Backend might be running or port is occupied"
    else
        print_pass "Port 3000 is available"
    fi
    
    print_test "Port 3000 (Frontend)"
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warn "Port 3000 is in use"
        print_info "Frontend might be running or port is occupied"
    else
        print_pass "Port 3000 is available"
    fi
}

verify_permissions() {
    print_header "File Permissions"
    
    # Check setup script
    print_test "setup.sh executable"
    if [ -x "setup.sh" ]; then
        print_pass "setup.sh is executable"
    else
        print_fail "setup.sh is not executable"
        print_info "Run: chmod +x setup.sh"
    fi
    
    # Check log directory writable
    print_test "logs directory writable"
    if [ -w "logs" ]; then
        print_pass "logs directory is writable"
    else
        print_fail "logs directory is not writable"
    fi
}

################################################################################
# Summary
################################################################################

print_summary() {
    print_header "Verification Summary"
    
    local total=$((PASSED + FAILED + WARNINGS))
    
    echo ""
    echo -e "${GREEN}Passed:${NC}   $PASSED tests"
    echo -e "${RED}Failed:${NC}   $FAILED tests"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS tests"
    echo -e "${NC}Total:${NC}    $total tests"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        if [ $WARNINGS -eq 0 ]; then
            echo -e "${GREEN}✓ All verification tests passed!${NC}"
            echo -e "${GREEN}  Your setup is complete and ready to use.${NC}"
            echo ""
            echo "Next steps:"
            echo "1. Start backend:  cd backend && npm run dev"
            echo "2. Start frontend: cd frontend && python -m http.server 3000"
            echo "3. Visit: http://localhost:3000"
        else
            echo -e "${YELLOW} Setup is mostly complete with some warnings.${NC}"
            echo -e "${YELLOW}  Review warnings above and address if needed.${NC}"
        fi
    else
        echo -e "${RED}✗ Setup verification failed.${NC}"
        echo -e "${RED}  Please address the failed tests above.${NC}"
        echo ""
        echo "Common fixes:"
        echo "- Missing dependencies: cd backend && npm install"
        echo "- Database not set up: ./setup.sh --skip-deps --skip-data"
        echo "- Configuration missing: cp backend/env.example backend/.env"
    fi
    
    echo ""
    echo "For detailed documentation, see README.md"
    echo "For quick setup, see QUICK_START.md"
}

################################################################################
# Main Execution
################################################################################

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Urban Mobility - Setup Verification     ║${NC}"
    echo -e "${BLUE}║  Version 1.0.0                            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    
    verify_prerequisites
    verify_directory_structure
    verify_dependencies
    verify_configuration
    verify_database
    verify_data_files
    verify_key_files
    verify_ports
    verify_permissions
    
    print_summary
    
    # Return exit code based on failures
    if [ $FAILED -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

main

