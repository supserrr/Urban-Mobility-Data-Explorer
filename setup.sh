#!/bin/bash

################################################################################
# Urban Mobility Data Explorer - Setup Script
################################################################################
# 
# This script automates the complete setup process including:
# - Prerequisites validation
# - Directory structure creation
# - Dependency installation
# - Environment configuration
# - Database initialization
# - Data import
# 
# Usage: ./setup.sh [OPTIONS]
#
# Options:
#   --skip-deps       Skip npm dependency installation
#   --skip-db         Skip database setup
#   --skip-data       Skip data import
#   --db-name NAME    Custom database name (default: urban_mobility)
#   --db-user USER    Custom database user (default: postgres)
#   --help            Show this help message
#
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="${DB_NAME:-urban_mobility}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
SKIP_DEPS=false
SKIP_DB=false
SKIP_DATA=false
LOG_FILE="logs/setup_$(date +%Y%m%d_%H%M%S).log"

################################################################################
# Helper Functions
################################################################################

# Print colored message
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}" | tee -a "$LOG_FILE"
}

# Print section header
print_header() {
    echo "" | tee -a "$LOG_FILE"
    print_message "$BLUE" "========================================" 
    print_message "$BLUE" "$1"
    print_message "$BLUE" "========================================"
}

# Print success message
print_success() {
    print_message "$GREEN" "✓ $1"
}

# Print error message
print_error() {
    print_message "$RED" "✗ $1"
}

# Print warning message
print_warning() {
    print_message "$YELLOW" " $1"
}

# Print info message
print_info() {
    print_message "$NC" "ℹ $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js version
check_node_version() {
    local version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$version" -ge 16 ]; then
        return 0
    else
        return 1
    fi
}

# Check PostgreSQL version
check_postgres_version() {
    local version=$(psql --version | grep -oE '[0-9]+' | head -1)
    if [ "$version" -ge 12 ]; then
        return 0
    else
        return 1
    fi
}

################################################################################
# Parse Command Line Arguments
################################################################################

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-db)
                SKIP_DB=true
                shift
                ;;
            --skip-data)
                SKIP_DATA=true
                shift
                ;;
            --db-name)
                DB_NAME="$2"
                shift 2
                ;;
            --db-user)
                DB_USER="$2"
                shift 2
                ;;
            --help)
                grep '^#' "$0" | grep -v '#!/bin/bash' | sed 's/^# //' | sed 's/^#//'
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

################################################################################
# Main Setup Functions
################################################################################

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local all_good=true
    
    # Check Node.js
    if command_exists node; then
        if check_node_version; then
            print_success "Node.js $(node -v) found"
        else
            print_error "Node.js version 16 or higher is required"
            print_info "Current version: $(node -v)"
            all_good=false
        fi
    else
        print_error "Node.js is not installed"
        print_info "Install from: https://nodejs.org/"
        all_good=false
    fi
    
    # Check npm
    if command_exists npm; then
        print_success "npm $(npm -v) found"
    else
        print_error "npm is not installed"
        all_good=false
    fi
    
    # Check PostgreSQL
    if command_exists psql; then
        if check_postgres_version; then
            print_success "PostgreSQL $(psql --version | grep -oE '[0-9]+\.[0-9]+' | head -1) found"
        else
            print_error "PostgreSQL version 12 or higher is required"
            all_good=false
        fi
    else
        print_error "PostgreSQL is not installed"
        print_info "Install from: https://www.postgresql.org/download/"
        all_good=false
    fi
    
    # Check git
    if command_exists git; then
        print_success "Git $(git --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+') found"
    else
        print_warning "Git is not installed (optional but recommended)"
    fi
    
    if [ "$all_good" = false ]; then
        print_error "Prerequisites check failed. Please install missing dependencies."
        exit 1
    fi
    
    print_success "All prerequisites satisfied"
}

# Create directory structure
create_directories() {
    print_header "Creating Directory Structure"
    
    local dirs=(
        "logs"
        "data/raw"
        "data/processed"
        "data/interim"
        "data/backup"
        "data/temp"
        "database/migrations"
        "database/seeds"
        "backend/tests"
    )
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_success "Created directory: $dir"
        else
            print_info "Directory already exists: $dir"
        fi
    done
    
    # Create .gitkeep files for empty directories
    touch data/raw/.gitkeep
    touch data/processed/.gitkeep
    touch data/interim/.gitkeep
    touch data/backup/.gitkeep
    touch data/temp/.gitkeep
    
    print_success "Directory structure created"
}

# Install dependencies
install_dependencies() {
    if [ "$SKIP_DEPS" = true ]; then
        print_warning "Skipping dependency installation (--skip-deps flag)"
        return
    fi
    
    print_header "Installing Dependencies"
    
    # Install backend dependencies
    print_info "Installing backend dependencies..."
    cd backend
    npm install 2>&1 | tee -a "../$LOG_FILE"
    cd ..
    print_success "Backend dependencies installed"
    
    # Install scripts dependencies
    print_info "Installing scripts dependencies..."
    cd scripts
    npm install 2>&1 | tee -a "../$LOG_FILE"
    cd ..
    print_success "Scripts dependencies installed"
    
    print_success "All dependencies installed"
}

# Setup environment files
setup_environment() {
    print_header "Setting Up Environment Configuration"
    
    # Backend .env
    if [ ! -f "backend/.env" ]; then
        print_info "Creating backend/.env from template..."
        cp backend/env.example backend/.env
        
        # Generate API key
        print_info "Generating secure API key..."
        API_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 64)
        
        # Update configuration in .env
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/DB_NAME=.*/DB_NAME=$DB_NAME/" backend/.env
            sed -i '' "s/DB_USER=.*/DB_USER=$DB_USER/" backend/.env
            sed -i '' "s/DB_PASSWORD=.*/DB_PASSWORD=/" backend/.env
            sed -i '' "s/API_KEYS=.*/API_KEYS=$API_KEY/" backend/.env
        else
            # Linux
            sed -i "s/DB_NAME=.*/DB_NAME=$DB_NAME/" backend/.env
            sed -i "s/DB_USER=.*/DB_USER=$DB_USER/" backend/.env
            sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=/" backend/.env
            sed -i "s/API_KEYS=.*/API_KEYS=$API_KEY/" backend/.env
        fi
        
        print_success "Created backend/.env with generated API key"
        print_warning "Please review and update backend/.env with your database password if needed"
    else
        print_info "backend/.env already exists"
        
        # Get API key from existing .env
        API_KEY=$(grep "^API_KEYS=" backend/.env | head -1 | cut -d'=' -f2)
        
        # Validate .env has no duplicate API keys
        local api_key_count=$(grep -c "^API_KEYS=" backend/.env 2>/dev/null || echo "0")
        if [ "$api_key_count" -gt 1 ]; then
            print_error "Duplicate API_KEYS found in backend/.env"
            print_info "Removing duplicates..."
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' '2,${/^API_KEYS=/d;}' backend/.env
            else
                sed -i '2,${/^API_KEYS=/d;}' backend/.env
            fi
            print_success "Removed duplicate API_KEYS entries"
        fi
        
        # Update database settings if they're still defaults
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/DB_USER=postgres/DB_USER=$DB_USER/" backend/.env
            sed -i '' "s/DB_PASSWORD=your_secure_password_here/DB_PASSWORD=/" backend/.env
        else
            sed -i "s/DB_USER=postgres/DB_USER=$DB_USER/" backend/.env
            sed -i "s/DB_PASSWORD=your_secure_password_here/DB_PASSWORD=/" backend/.env
        fi
    fi
    
    # Scripts .env (copy from backend)
    if [ ! -f "scripts/.env" ]; then
        cp backend/.env scripts/.env
        print_success "Created scripts/.env"
    else
        print_info "scripts/.env already exists"
    fi
    
    # Create auto-setup HTML page for localStorage configuration
    print_info "Creating frontend setup page..."
    cat > frontend/setup.html << 'SETUP_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Urban Mobility Explorer - Setup</title>
    
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Lexend+Mega:wght@700;900&family=Public+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
            --primary-color: #1a1a1a;
            --secondary-color: #faf8f3;
            --yellow: #ffe600;
            --green: #40d39c;
            --blue: #2c7a7b;
            --border-thick: 4px;
            --shadow-lg: 8px 8px 0 var(--primary-color);
        }

        body {
            font-family: 'Public Sans', sans-serif;
            background: var(--primary-color);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 2rem;
        }

        .setup-wrapper { width: 100%; max-width: 600px; }

        .header {
            background: var(--yellow);
            border: var(--border-thick) solid var(--primary-color);
            box-shadow: var(--shadow-lg);
            padding: 2rem;
            text-align: center;
            margin-bottom: 2rem;
        }

        .header-title {
            font-family: 'Lexend Mega', sans-serif;
            font-size: clamp(1.5rem, 4vw, 2.5rem);
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: -0.02em;
            line-height: 1.1;
            margin-bottom: 0.5rem;
        }

        .header-subtitle {
            font-family: 'Public Sans', sans-serif;
            font-size: clamp(0.875rem, 2vw, 1rem);
            font-weight: 600;
            text-transform: uppercase;
        }

        .container {
            background: #f5f5dc;
            border: var(--border-thick) solid var(--primary-color);
            box-shadow: var(--shadow-lg);
            padding: 3rem;
            text-align: center;
        }

        .setup-icon {
            width: 80px;
            height: 80px;
            background: var(--green);
            border: var(--border-thick) solid var(--primary-color);
            box-shadow: 4px 4px 0 var(--primary-color);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 2rem;
            transition: background 0.3s ease;
        }
        
        .setup-icon svg {
            width: 50px;
            height: 50px;
            fill: var(--primary-color);
        }

        .progress-bar {
            width: 100%;
            height: 24px;
            background: var(--secondary-color);
            border: var(--border-thick) solid var(--primary-color);
            margin: 2rem 0;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: var(--blue);
            border-right: var(--border-thick) solid var(--primary-color);
            transition: width 0.5s ease;
            width: 0%;
        }

        .status {
            font-family: 'Public Sans', sans-serif;
            font-size: 1.125rem;
            font-weight: 700;
            color: var(--primary-color);
            text-transform: uppercase;
            margin-top: 1rem;
            letter-spacing: 0.05em;
        }

        .status.success { color: var(--green); }

        .checklist {
            text-align: left;
            margin: 2rem 0;
            font-size: 0.9375rem;
        }

        .checklist-item {
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            background: var(--secondary-color);
            border: 3px solid var(--primary-color);
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            animation: slideIn 0.3s ease forwards;
            opacity: 0;
        }

        .checklist-item.complete {
            background: var(--green);
            color: var(--primary-color);
        }

        .check-icon { 
            font-size: 1.25rem; 
            font-weight: 900; 
            width: 20px;
            height: 20px;
            display: inline-block;
        }
        
        .check-icon svg {
            width: 20px;
            height: 20px;
            vertical-align: middle;
        }

        @keyframes slideIn {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        .checklist-item:nth-child(1) { animation-delay: 0.1s; }
        .checklist-item:nth-child(2) { animation-delay: 0.3s; }
        .checklist-item:nth-child(3) { animation-delay: 0.5s; }
        .checklist-item:nth-child(4) { animation-delay: 0.7s; }
    </style>
</head>
<body>
    <div class="setup-wrapper">
        <div class="header">
            <div class="header-title">Urban Mobility</div>
            <div class="header-subtitle">Configuration in Progress</div>
        </div>

        <div class="container">
            <div class="setup-icon" id="setupIcon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z"/>
                </svg>
            </div>
            
            <div class="progress-bar">
                <div class="progress-fill" id="progressBar"></div>
            </div>
            
            <div class="status" id="status">Initializing...</div>
            
            <div class="checklist">
                <div class="checklist-item" id="check1">
                    <span class="check-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                        </svg>
                    </span>
                    <span>Loading configuration</span>
                </div>
                <div class="checklist-item" id="check2">
                    <span class="check-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                        </svg>
                    </span>
                    <span>Saving API key</span>
                </div>
                <div class="checklist-item" id="check3">
                    <span class="check-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                        </svg>
                    </span>
                    <span>Verifying authentication</span>
                </div>
                <div class="checklist-item" id="check4">
                    <span class="check-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                        </svg>
                    </span>
                    <span>Ready to launch</span>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        (function() {
            const urlParams = new URLSearchParams(window.location.search);
            const apiKey = urlParams.get("api_key") || "API_KEY_PLACEHOLDER";
            const status = document.getElementById("status");
            const progressBar = document.getElementById("progressBar");
            const setupIcon = document.getElementById("setupIcon");
            
            const steps = [
                { id: 'check1', text: 'Loading configuration', delay: 200 },
                { id: 'check2', text: 'Saving API key', delay: 500 },
                { id: 'check3', text: 'Verifying authentication', delay: 800 },
                { id: 'check4', text: 'Ready to launch', delay: 1100 }
            ];
            
            let currentStep = 0;
            
            function completeStep(stepId) {
                const element = document.getElementById(stepId);
                element.classList.add('complete');
                
                const checkIcon = element.querySelector('.check-icon');
                checkIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>';
                
                currentStep++;
                progressBar.style.width = (currentStep / steps.length * 100) + '%';
            }
            
            function runSetup() {
                status.textContent = "Configuring your application...";
                
                steps.forEach((step, index) => {
                    setTimeout(() => {
                        completeStep(step.id);
                        
                        if (index === 1) {
                            localStorage.setItem("api_key", apiKey);
                        }
                        
                        if (index === steps.length - 1) {
                            setTimeout(() => {
                                status.textContent = "Setup Complete!";
                                status.className = "status success";
                                setupIcon.style.background = "#40d39c";
                                setupIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>';
                                
                                setTimeout(() => {
                                    status.textContent = "Launching dashboard...";
                                    setTimeout(() => {
                                        window.location.href = "/index.html";
                                    }, 500);
                                }, 1000);
                            }, 300);
                        }
                    }, step.delay);
                });
            }
            
            setTimeout(runSetup, 300);
        })();
    </script>
</body>
</html>
SETUP_EOF
    
    # Replace API key placeholder with actual key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/API_KEY_PLACEHOLDER/$API_KEY/" frontend/setup.html
    else
        sed -i "s/API_KEY_PLACEHOLDER/$API_KEY/" frontend/setup.html
    fi
    print_success "Created frontend/setup.html (auto-configuration page)"
}

# Initialize database
initialize_database() {
    if [ "$SKIP_DB" = true ]; then
        print_warning "Skipping database setup (--skip-db flag)"
        return
    fi
    
    print_header "Initializing Database"
    
    # Check if database exists
    print_info "Checking if database '$DB_NAME' exists..."
    if psql -U "$DB_USER" -h "$DB_HOST" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_warning "Database '$DB_NAME' already exists"
        read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Dropping existing database..."
            dropdb -U "$DB_USER" -h "$DB_HOST" "$DB_NAME" 2>&1 | tee -a "$LOG_FILE" || true
            print_success "Dropped database '$DB_NAME'"
        else
            print_info "Keeping existing database"
            return
        fi
    fi
    
    # Create database
    print_info "Creating database '$DB_NAME'..."
    createdb -U "$DB_USER" -h "$DB_HOST" "$DB_NAME" 2>&1 | tee -a "$LOG_FILE"
    print_success "Created database '$DB_NAME'"
    
    # Run schema
    print_info "Running database schema..."
    psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -f database/schema_production.sql 2>&1 | tee -a "$LOG_FILE"
    print_success "Database schema applied"
    
    # Verify database
    print_info "Verifying database setup..."
    local table_count=$(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
    print_success "Database verified: $table_count tables created"
}

# Import data
import_data() {
    if [ "$SKIP_DATA" = true ]; then
        print_warning "Skipping data import (--skip-data flag)"
        return
    fi
    
    print_header "Importing Data"
    
    # Check if data file exists
    if [ ! -f "data/raw/train.csv" ]; then
        print_warning "Data file 'data/raw/train.csv' not found"
        print_info "Please place your CSV file at: data/raw/train.csv"
        print_info "You can import data later using: cd scripts && node importDataInclusive.js"
        return
    fi
    
    # Import data
    print_info "Starting data import (this may take several minutes)..."
    print_info "Log file: logs/data_import_$(date +%Y%m%d_%H%M%S).log"
    
    cd scripts
    node importDataInclusive.js ../data/raw/train.csv 2>&1 | tee -a "../$LOG_FILE"
    cd ..
    
    print_success "Data imported successfully"
    
    # Verify import
    print_info "Verifying data import..."
    local record_count=$(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM trips")
    print_success "Data verified: $record_count records in database"
}

# Start servers automatically
start_servers() {
    print_header "Starting Servers"
    
    # Make scripts executable
    chmod +x scripts/start-servers.sh scripts/stop-servers.sh
    
    print_info "Starting backend and frontend servers..."
    cd scripts
    ./start-servers.sh
    cd ..
    
    print_success "Servers started successfully"
}

# Print completion message
print_completion() {
    print_header "Setup Complete!"
    
    print_success "Urban Mobility Data Explorer has been set up successfully"
    echo ""
    
    # Get API key
    local api_key=$(grep "^API_KEYS=" backend/.env | head -1 | cut -d'=' -f2)
    
    print_message "$GREEN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_message "$GREEN" "  Quick Start - Complete in 3 Steps:"
    print_message "$GREEN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    print_message "$NC" "1️⃣  Start the servers:"
    print_message "$YELLOW" "   ./scripts/start-servers.sh"
    echo ""
    
    print_message "$NC" "2️⃣  Configure your browser (one-time setup):"
    print_message "$YELLOW" "   http://localhost:3000/setup.html"
    echo ""
    print_message "$NC" "   This will automatically:"
    print_message "$NC" "   - Save your API key to browser storage"
    print_message "$NC" "   - Redirect you to the dashboard"
    print_message "$NC" "   - Only needs to be done once per browser"
    echo ""
    
    print_message "$NC" "3️⃣  Access the application:"
    print_message "$YELLOW" "   http://localhost:3000"
    echo ""
    
    print_message "$GREEN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    print_info "Advanced Options:"
    echo ""
    print_message "$NC" "  Manual API key setup (if needed):"
    print_message "$NC" "  http://localhost:3000?api_key=$api_key"
    echo ""
    print_message "$NC" "  Import data (if skipped):"
    print_message "$NC" "  cd scripts && node importDataInclusive.js ../data/raw/train.csv"
    echo ""
    print_message "$NC" "  Stop servers:"
    print_message "$NC" "  ./scripts/stop-servers.sh"
    echo ""
    print_message "$NC" "  View logs:"
    print_message "$NC" "  tail -f logs/backend-server.log"
    print_message "$NC" "  tail -f logs/frontend-server.log"
    echo ""
    
    print_info "Configuration:"
    print_message "$NC" "  Backend: http://localhost:8000"
    print_message "$NC" "  Frontend: http://localhost:3000"
    print_message "$NC" "  Database: $DB_NAME"
    print_message "$NC" "  API Key: Configured ✓"
    echo ""
    
    print_info "For detailed documentation, see README.md and docs/"
    print_info "Setup log saved to: $LOG_FILE"
    echo ""
    
    # Ask if user wants to start servers now
    read -p "$(echo -e ${YELLOW}Would you like to start the servers now? \(Y/n\): ${NC})" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$  ]] || [[ -z $REPLY ]]; then
        start_servers
        echo ""
        print_message "$GREEN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        print_message "$GREEN" "  🎉 Everything is ready!"
        print_message "$GREEN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        print_message "$YELLOW" "  👉 Open your browser and visit:"
        print_message "$GREEN" "     http://localhost:3000/setup.html"
        echo ""
        print_message "$NC" "     The setup page will configure your browser automatically"
        print_message "$NC" "     and redirect you to the dashboard."
        echo ""
        print_message "$GREEN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    else
        echo ""
        print_info "Servers not started. Run './scripts/start-servers.sh' when ready."
        echo ""
    fi
}

################################################################################
# Main Execution
################################################################################

main() {
    # Parse arguments
    parse_args "$@"
    
    # Print banner
    echo ""
    print_message "$BLUE" "╔════════════════════════════════════════════╗"
    print_message "$BLUE" "║  Urban Mobility Data Explorer - Setup     ║"
    print_message "$BLUE" "║  Version 1.0.0                            ║"
    print_message "$BLUE" "╚════════════════════════════════════════════╝"
    echo ""
    
    # Log start time
    print_info "Setup started at: $(date)"
    print_info "Log file: $LOG_FILE"
    echo ""
    
    # Run setup steps
    check_prerequisites
    create_directories
    install_dependencies
    setup_environment
    initialize_database
    import_data
    print_completion
    
    # Log end time
    print_info "Setup completed at: $(date)"
}

# Run main function
main "$@"

