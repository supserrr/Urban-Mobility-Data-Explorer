# Urban Mobility Data Explorer

A fullstack application for analyzing and visualizing NYC taxi trip data using PostgreSQL, Express.js, and modern web technologies.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/supserrr/Urban-Mobility-Data-Explorer.git
cd Urban-Mobility-Data-Explorer

# Run automated setup (installs everything)
./setup.sh
```

The setup script will automatically:
- Install all dependencies (backend, frontend, scripts)
- Generate secure API keys
- Configure database
- Create environment files
- Set up data processing
- Ask if you want to start servers immediately

**After setup completes:**
1. Servers start automatically (if you chose "Yes")
2. Visit `http://localhost:3000/setup.html` in your browser
3. Browser configures automatically and redirects to dashboard
4. Application is ready to use

## Running the Application

If you didn't start servers during setup, or need to restart them:

```bash
# Start both backend and frontend servers
./scripts/start-servers.sh
```

**First-time browser setup:**
Visit `http://localhost:3000/setup.html` (one-time, auto-configures and redirects)

**Access the application:**
`http://localhost:3000` (after setup)

## Key Features

- Interactive dashboard with real-time trip statistics
- Heatmap visualization of pickup and dropoff locations
- Advanced analytics and trend analysis
- Custom data processing with quality categorization
- Comprehensive filtering and search capabilities

## Project Deliverables

### Video Walkthrough
**[Technical Demonstration](https://youtu.be/U3d5SoPx_Ms)** - System overview and feature demonstration

### Technical Report
**[Urban Mobility Data Explorer - Technical Report.pdf](docs/Urban%20Mobility%20Data%20Explorer%20-%20Technical%20Report.pdf)** - Comprehensive technical report

### Database Schema Files
- **[schema_inclusive.sql](database/schema_inclusive.sql)** - Full-featured database schema
- **[schema_production.sql](database/schema_production.sql)** - Production-optimized schema
- **[schema.sql](database/schema.sql)** - Base schema

### Complete Codebase
- **GitHub Repository**: [https://github.com/supserrr/Urban-Mobility-Data-Explorer.git](https://github.com/supserrr/Urban-Mobility-Data-Explorer.git)
- **Backend Code**: [backend/](backend/) - Express.js API server
- **Frontend Code**: [frontend/](frontend/) - Interactive dashboard
- **Scripts**: [scripts/](scripts/) - Data import utilities

### Custom Algorithm Implementation
- **[CustomAlgorithms.js](backend/src/utils/CustomAlgorithms.js)** - Implementation of sorting, filtering, and search algorithms
- **[Custom Algorithms Documentation](docs/custom-algorithms.md)** - Algorithm documentation

### Data Processing Implementation
- **[DataProcessorInclusive.js](backend/src/services/DataProcessorInclusive.js)** - Data processing with categorization
- **[CustomCSVParser.js](backend/src/services/CustomCSVParser.js)** - CSV parser
- **[Data Processing Guide](docs/data-processing-guide.md)** - Processing documentation

## Technical Documentation

Detailed documentation is available in the `docs/` folder:

- **[Setup Guide](docs/setup-guide.md)** - Complete installation instructions
- **[API Reference](docs/api-reference.md)** - API endpoints and usage
- **[Architecture](docs/architecture.md)** - System architecture and design
- **[Data Processing Guide](docs/data-processing-guide.md)** - Data import and processing
- **[Database Schema](docs/database-schema.md)** - Database structure and queries
- **[Custom Algorithms](docs/custom-algorithms.md)** - Algorithm implementations and complexity analysis

## Project Structure

```
Urban-Mobility-Data-Explorer/
├── backend/           # Express.js API server
├── frontend/          # Web application
├── database/          # PostgreSQL schemas and migrations
├── scripts/           # Utility scripts and server management
├── data/              # Data storage directories
├── docs/              # Detailed documentation
└── logs/              # Application and setup logs
```

## Prerequisites

- Node.js 16 or higher
- PostgreSQL 12 or higher
- npm

## Data Import

```bash
# Place CSV file in data/raw/
cp your-data.csv data/raw/train.csv

# Import data
cd scripts
node importDataInclusive.js ../data/raw/train.csv
```

## Development

```bash
# Backend development mode
cd backend
npm run dev

# View logs
tail -f logs/combined.log
```

## License

MIT License - Copyright (c) 2025 Shima Serein

See [LICENSE](LICENSE) file for full license text.

## Recent Updates

### October 2025
- Security improvements and API authentication
- Code cleanup and standardization
- Database schema finalization  
- Documentation updates

## Security

For production deployments, review:
- [Frontend Security Guidelines](frontend/SECURITY.md)
- [Backend Environment Configuration](backend/env.example)
- [Server Architecture Guide](backend/src/SERVER_ARCHITECTURE.md)
- [Security Implementation Log](logs/2025-10-16-final-secure-implementation.md)

## Submission Summary

### Required Deliverables
1. Codebase & GitHub: [https://github.com/supserrr/Urban-Mobility-Data-Explorer.git](https://github.com/supserrr/Urban-Mobility-Data-Explorer.git)
2. Database Schema: [database/schema_inclusive.sql](database/schema_inclusive.sql)
3. Technical Report: [docs/Urban Mobility Data Explorer - Technical Report.pdf](docs/Urban%20Mobility%20Data%20Explorer%20-%20Technical%20Report.pdf)
4. Video Walkthrough: [https://youtu.be/U3d5SoPx_Ms](https://youtu.be/U3d5SoPx_Ms)

### Key Features Implemented
- Data Processing: 1.4M+ records with quality categorization
- Custom Algorithms: Sorting, filtering, and search implementations
- Database Design: Normalized PostgreSQL schema with indexing
- Frontend Dashboard: Interactive visualizations
- Backend API: RESTful API with authentication
- Documentation: Technical documentation and setup guides

### Performance Metrics
- Processing Speed: 57,000+ records/sec
- Database Records: 1,458,641 trip records
- API Response: Sub-second response times
- Data Quality: Comprehensive scoring system

## Support

- Review [docs/](docs/) folder for detailed documentation
- Check [logs/](logs/) directory for troubleshooting
- See [database/README.md](database/README.md) for database setup
- Reference API documentation at `/api/docs` endpoint
