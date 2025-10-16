# Backend Server Architecture

Note: For most use cases, use `server-production.js`. This document explains the differences between server files.

## Server Files

### 1. server-production.js (Primary Server)

Production server with database integration

When to Use:
- Production deployments
- Development with real database
- Testing with actual data

Features:
- Full authentication
- Rate limiting
- Input validation
- Custom algorithm endpoints
- H3 grid aggregation
- PostgreSQL queries
- Security measures

Start Command:
```bash
npm start
# or
npm run production
# or
node src/server-production.js
```

Port: 8000 (default)

Database: Required - PostgreSQL with urban_mobility database

---

### 2. server.js (Modular Architecture)

Purpose: Modular class-based server architecture

When to Use:
- Future development and refactoring
- When extending with new features
- Learning the codebase architecture

Features:
- Object-oriented design
- Separated concerns (routes, controllers, services)
- Middleware-based architecture
- Graceful shutdown handling
- Suitable for scaling and testing

Start Command:
```bash
node src/server.js
```

Port: 3000 (default)

Database: Required - PostgreSQL

Note: This is the architectural foundation. For production use, prefer server-production.js which has all security features implemented.

---

## Comparison Matrix

| Feature | server-production.js | server.js |
|---------|---------------------|-----------|
| **Database** | Required | Required |
| **Authentication** | Full (API keys) | Configurable |
| **Rate Limiting** | Strict | Configurable |
| **Input Validation** | Comprehensive | Basic |
| **Real Data** | Yes | Yes |
| **Custom Algorithms** | Yes | Via controllers |
| **H3 Grid** | Real data | Real data |
| **Production Ready** | ✓ | Partial |
| **Security** | High | Medium |
| **Development** | ✓ | ✓ |
| **Deployment** | RECOMMENDED | Future |

---

## Architecture Patterns

### server-production.js Architecture

```
Express App
├── Middleware Layer
│   ├── Helmet (security headers)
│   ├── CORS (with strict origin checking)
│   ├── Compression
│   ├── Morgan (HTTP logging)
│   ├── Rate limiting
│   └── Body parsing (size-limited)
├── Route Handlers (inline)
│   ├── Public endpoints (health, docs, statistics)
│   ├── Protected endpoints (trips, config, map data)
│   └── Custom algorithm endpoints
├── PostgreSQL Pool
│   ├── Connection management
│   └── Query execution
├── Custom Algorithms
│   ├── CustomTripSorter
│   ├── CustomTripFilter
│   └── CustomTripSearch
└── Error Handling
    ├── Route-level try-catch
    └── Global error handlers
```

### server.js Architecture (Modular)

```
Server Class
├── Constructor
│   └── Initialize components
├── Middlewares
│   ├── Security (Helmet)
│   ├── CORS
│   ├── Compression
│   ├── Logging (Morgan + Winston)
│   ├── Rate limiting
│   └── Request ID tracking
├── Routes (Modular)
│   ├── routes/index.js (main router)
│   ├── routes/tripRoutes.js
│   └── routes/parameterRoutes.js
├── Controllers
│   └── controllers/tripController.js
├── Services
│   ├── services/tripService.js
│   └── services/parameterService.js
├── Middleware
│   ├── middleware/authMiddleware.js
│   └── middleware/errorHandler.js
└── Lifecycle Management
    ├── Startup checks
    └── Graceful shutdown
```

---

## Migration Path

### Current State
- Production uses: **server-production.js**
- Development uses: **server-production.js**
- Architecture reference: **server.js**

### Recommended Path Forward

#### Short Term (Current)
- Continue using **server-production.js** for production
- Maintain **server.js** for architecture reference

#### Long Term (Future Refactoring)
1. Gradually migrate routes from server-production.js to modular structure
2. Move business logic to controllers/services
3. Extract middleware to separate files
4. Eventually deprecate server-production.js in favor of server.js

---

## Development Workflow

### For New Features

1. **If using server-production.js** (current):
   - Add route inline in server-production.js
   - Add authentication/validation as needed
   - Test with real database

2. **If using server.js** (future):
   - Create/update controller in `controllers/`
   - Create/update service in `services/`
   - Add route in `routes/`
   - Add tests

### For Bug Fixes

- Fix in the server file currently being used
- Document the fix
- Test thoroughly

### For Security Updates

- Update both server-production.js and server.js
- Update middleware if applicable
- Run security test scripts
- Document changes

---

## Best Practices

### When Using server-production.js

1. **Environment Variables**: Always use process.env for configuration
2. **Error Handling**: Wrap async routes in try-catch
3. **Validation**: Use express-validator for all inputs
4. **Rate Limiting**: Apply appropriate limiter to each endpoint
5. **Authentication**: Protect sensitive endpoints with requireApiKey
6. **Logging**: Use console.log for startup, remove from routes

### When Using server.js

1. **Follow MVC**: Keep routes thin, logic in controllers/services
2. **Middleware**: Extract reusable logic to middleware
3. **Error Handling**: Use error middleware
4. **Testing**: Write tests for controllers and services
5. **Documentation**: Add JSDoc to all classes and methods

---

## Configuration

### Environment Variables

Both servers use environment variables from `.env`:

```bash
# Server configuration
PORT=8000
HOST=localhost
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=urban_mobility
DB_USER=postgres
DB_PASSWORD=your_password

# Security
API_KEYS=your_api_key_here
CORS_ORIGINS=http://localhost:3000,http://localhost:3000

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Port Allocation

- **8000**: server-production.js (production API)
- **3000**: server.js (development)

---

## Testing

### Test server-production.js

```bash
cd backend

# Start server
npm start

# In another terminal, run tests
./test-security.sh
./test-authentication.sh
```

### Test server.js

```bash
cd backend

# Start server
node src/server.js

# Test endpoints
curl http://localhost:3000/api/health
```


---

## Troubleshooting

### server-production.js Issues

**Problem**: Database connection fails
- **Solution**: Check .env file, verify PostgreSQL is running

**Problem**: 401 Unauthorized errors
- **Solution**: Set API_KEYS in .env, add X-API-Key header to requests

**Problem**: Rate limiting too strict
- **Solution**: Adjust RATE_LIMIT_* in .env

### server.js Issues

**Problem**: Routes not found
- **Solution**: Check routes are properly mounted in routes/index.js

**Problem**: Database errors
- **Solution**: Verify database connection in config/database.js


---

## Performance Considerations

### server-production.js
- Optimized for throughput
- Connection pooling configured
- Query optimization important
- Rate limiting prevents abuse

### server.js
- Designed for scalability
- Middleware can be optimized
- Easy to add caching layer
- Suitable for clustering

- Good for load testing frontend

---

## Security Considerations

### Production Deployment (server-production.js)

Must Configure:
- Strong DB_PASSWORD
- Unique API_KEYS
- Strict CORS_ORIGINS
- NODE_ENV=production
- Enable DB SSL/TLS
- Review rate limits

Must Not:
- Expose .env file
- Use default passwords
- Allow * for CORS
- Skip authentication

---

## Maintenance

### When to Update Each File

**server-production.js**:
- Security patches (immediate)
- Critical bug fixes (immediate)
- New endpoint requirements (as needed)

**server.js**:
- Architecture improvements (planned)
- Middleware updates (as needed)
- New design patterns (planned)

---

## Recommendations

### Immediate
1. Use server-production.js for all production deployments
2. Use server.js as reference architecture

### Future Refactoring
1. Gradually migrate server-production.js to modular structure
2. Extract common code to utilities
3. Improve test coverage
4. Consider microservices architecture for scaling

---

## Summary

Current Production Server: `server-production.js`

Strengths:
- Battle-tested with real data
- Comprehensive security
- All features implemented
- Production-ready

Future Direction: Gradually adopt modular architecture from server.js while maintaining production stability.

---

Last Updated: October 2025
Version: 1.0.0
Status: Production-ready
