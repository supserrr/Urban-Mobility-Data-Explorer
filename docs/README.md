# Urban Mobility Data Explorer - Documentation

Complete technical documentation for the Urban Mobility Data Explorer platform.

## Overview

The Urban Mobility Data Explorer provides comprehensive analysis and visualization of NYC taxi trip data. The platform processes over 1.4 million trip records, offering real-time insights through interactive dashboards, heatmaps, and custom analytics.

## Getting Started

### Quick Links

| Resource | Description |
|----------|-------------|
| [Setup Guide](setup-guide.md) | Install and configure the application |
| [API Reference](api-reference.md) | Complete REST API documentation |
| [Architecture](architecture.md) | System design and technical architecture |

### New to the Project?

1. Start with the [Setup Guide](setup-guide.md) to install the application
2. Review the [Architecture](architecture.md) to understand the system design
3. Explore the [API Reference](api-reference.md) for integration options
4. Check the [Data Processing Guide](data-processing-guide.md) for data import

## Documentation Index

### Core Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [Setup Guide](setup-guide.md) | Installation, configuration, and deployment | Developers, DevOps |
| [API Reference](api-reference.md) | REST API endpoints and authentication | Developers, Integrators |
| [Architecture](architecture.md) | System design, components, and data flow | Developers, Architects |

### Technical Guides

| Document | Purpose | Audience |
|----------|---------|----------|
| [Data Processing Guide](data-processing-guide.md) | Data import, validation, and transformation | Data Engineers |
| [Database Schema](database-schema.md) | Database structure, indexes, and queries | Database Administrators |
| [Custom Algorithms](custom-algorithms.md) | Manual algorithm implementations | Developers, Researchers |
| [MapTiler Setup](maptiler-setup.md) | Map visualization configuration | Developers |

## System Requirements

### Minimum Requirements

- **Node.js**: Version 16.x or higher
- **PostgreSQL**: Version 12.x or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space for data and logs
- **Browser**: Modern browser with ES6 support

### Recommended Development Environment

- **OS**: macOS, Linux, or Windows 10+
- **Editor**: Visual Studio Code with ESLint
- **Terminal**: Bash or Zsh
- **Database Tool**: pgAdmin or DBeaver

## Technology Stack

### Backend

- **Runtime**: Node.js 16+
- **Framework**: Express.js 4.18
- **Database**: PostgreSQL 12+ with PostGIS
- **Authentication**: API Key-based
- **Logging**: Winston 3.11
- **Validation**: Express-validator 7.2

### Frontend

- **Architecture**: Vanilla JavaScript (ES6+)
- **UI Framework**: NeoBrutalism CSS
- **Charts**: Chart.js 4.4
- **Maps**: Leaflet with MapTiler tiles
- **HTTP Client**: Fetch API

### Data Processing

- **CSV Parser**: Custom RFC 4180 compliant
- **Geospatial**: H3 hexagonal grid system
- **Algorithms**: Custom sorting, filtering, and search
- **Validation**: Multi-stage data quality checks

## Key Features

### Data Visualization

- **Interactive Dashboard**: Real-time statistics and trends
- **Heatmap View**: Pickup and dropoff density visualization
- **Route Analysis**: Popular route corridors and patterns
- **Custom Analytics**: Advanced filtering and insights

### Data Processing

- **Inclusive Processing**: 100% data retention with quality categorization
- **Custom Algorithms**: Manually implemented sorting, filtering, and search
- **H3 Grid Aggregation**: Efficient hexagonal grid mapping
- **Quality Scoring**: Automatic data quality assessment

### Security Features

- **API Key Authentication**: Secure endpoint access
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive parameter checking
- **CORS Configuration**: Strict origin control

## Documentation Standards

This documentation follows the Google Technical Writing Style Guide with emphasis on:

- **Active Voice**: Use active voice for clarity
- **Present Tense**: Describe actions in present tense
- **Clear Language**: Avoid jargon and complex terminology
- **Logical Order**: Present information in a natural flow
- **Practical Examples**: Include working code samples
- **Completeness**: Document all parameters and options

## Project Structure

```
Urban-Mobility-Data-Explorer/
├── backend/              # Express.js API server
│   ├── src/
│   │   ├── config/       # Database and logger configuration
│   │   ├── controllers/  # HTTP request handlers
│   │   ├── middleware/   # Authentication and error handling
│   │   ├── routes/       # API route definitions
│   │   ├── services/     # Business logic and data processing
│   │   └── utils/        # Custom algorithms and utilities
│   ├── logs/             # Application logs
│   └── package.json      # Dependencies and scripts
├── frontend/             # Static web application
│   ├── components/       # UI components (Dashboard, Map, Charts)
│   ├── styles/           # CSS stylesheets
│   ├── utils/            # API client and helpers
│   └── *.html            # Application pages
├── database/             # Database schemas and migrations
│   ├── schema_inclusive.sql    # Full-featured schema
│   ├── schema_production.sql   # Production-optimized schema
│   └── migrations/       # Database migrations
├── scripts/              # Data import and utility scripts
│   ├── importDataInclusive.js  # Inclusive data importer
│   ├── importToProduction.js   # Production importer
│   └── *.sh              # Shell scripts for server management
├── data/                 # Data storage directories
│   ├── raw/              # Source CSV files
│   ├── processed/        # Processed data
│   └── temp/             # Temporary processing files
├── docs/                 # This documentation
└── logs/                 # Project-wide logs
```

## Support and Contribution

### Getting Help

1. Check the relevant documentation section
2. Review the troubleshooting guides
3. Examine the logs in the `logs/` directory
4. Consult the API documentation for endpoint issues

### Reporting Issues

When reporting issues, include:

- Operating system and version
- Node.js and PostgreSQL versions
- Relevant error messages from logs
- Steps to reproduce the issue
- Expected vs actual behavior

### Documentation Updates

To update documentation:

1. Follow the Google Technical Writing Style Guide
2. Use active voice and present tense
3. Include practical examples
4. Test all code samples
5. Update the relevant log file

## Version Information

- **Current Version**: 1.0.0
- **Node.js Required**: 16.x or higher
- **PostgreSQL Required**: 12.x or higher
- **Last Updated**: October 2025

## License

MIT License - See the main README.md for full license text.

## Related Resources

- [Main Project README](../README.md)
- [Technical Report](Urban%20Mobility%20Data%20Explorer%20-%20Technical%20Report.pdf)
- [Backend Package.json](../backend/package.json)
- [Scripts README](../scripts/README.md)

---

**Note**: This documentation is maintained alongside the codebase. Always refer to the latest version in the repository for the most up-to-date information.
