# API Reference

Complete REST API documentation for the Urban Mobility Data Explorer.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Health & Documentation](#health--documentation)
  - [Trip Data](#trip-data)
  - [Statistics](#statistics)
  - [Map Data](#map-data)
  - [Parameters](#parameters)
- [Code Examples](#code-examples)
- [Best Practices](#best-practices)

## Overview

### Base URL

```
http://localhost:8000/api
```

**Production**: Replace with your production domain

### API Version

Current Version: `1.0.0`

Version information available at: `GET /api/version`

### Content Type

All requests and responses use `application/json`

## Authentication

### Authentication Methods

The API uses API Key authentication to secure sensitive endpoints.

#### Method 1: HTTP Header (Recommended)

```http
GET /api/trips HTTP/1.1
Host: localhost:8000
X-API-Key: your_api_key_here
```

Benefits:
- More secure (not visible in URLs)
- Not logged in server access logs
- Recommended for production

#### Method 2: Query Parameter

```http
GET /api/trips?api_key=your_api_key_here HTTP/1.1
Host: localhost:8000
```

Note:
- Visible in URLs and logs
- Less secure than header method
- Use when header method unavailable

### Obtaining an API Key

#### Automated Setup (Recommended)

The automated setup script handles API key generation and configuration:

```bash
# Run from project root
./setup.sh
```

This will:
1. Generate a secure 64-character API key
2. Configure backend/.env automatically
3. Create browser configuration page
4. Set up required components

#### Frontend Browser Configuration

After servers are running, configure your browser once:

**Option 1: Auto-Configuration**
```
Visit: http://localhost:3000/setup.html
```
- Saves API key to browser localStorage
- Redirects to dashboard after 2 seconds
- Only needed once per browser

**Option 2: URL Parameter**
```
Visit: http://localhost:3000?api_key=YOUR_KEY_HERE
```
- Key is saved to localStorage
- URL is cleaned automatically

**Option 3: Manual Console**
```javascript
localStorage.setItem('api_key', 'YOUR_KEY_HERE')
location.reload()
```

#### Manual API Key Generation

If needed, generate keys manually:

**Step 1**: Generate a key using the utility:

```bash
cd backend
node src/utils/generateApiKey.js
```

**Step 2**: Add the generated key to `backend/.env`:

```bash
API_KEYS=your_generated_key_here
```

For multiple keys (recommended for different clients):

```bash
API_KEYS=frontend_key,mobile_key,admin_key
```

**Step 3**: Use the key in your requests:

```bash
curl -H "X-API-Key: your_generated_key_here" \
  http://localhost:8000/api/trips
```

#### Frontend Integration

The frontend automatically loads the API key from localStorage:

```javascript
// In config.js
API_KEY: localStorage.getItem('api_key') || ''
```

Security Note: API keys are not hardcoded in source code. They are stored in:
- **Backend**: `backend/.env` file (server-side, not committed)
- **Frontend**: Browser localStorage (client-side, per-browser)

### Endpoint Security

**Protected Endpoints** (require authentication):
- `GET /api/config` - Frontend configuration
- `GET /api/trips` - Trip data retrieval
- `GET /api/trips/map` - Map visualization data
- `GET /api/trips/h3-grid` - H3 hexagonal grid data
- `GET /api/trips/advanced` - Custom algorithm processing
- `GET /api/trips/:id` - Specific trip details

**Public Endpoints** (no authentication required):
- `GET /api/health` - Health check
- `GET /api/docs` - API documentation
- `GET /api/docs/authentication` - Authentication guide
- `GET /api/version` - Version information
- `GET /api/trips/statistics` - Trip statistics
- `GET /api/trips/neighborhoods` - Neighborhood data
- `GET /api/trips/vendors` - Vendor statistics
- `GET /api/trips/fares` - Fare distribution
- `GET /api/trips/distribution/pickup-dropoff` - Pickup/dropoff counts
- `GET /api/map/*` - Map data endpoints
- `GET /api/parameters/*` - Parameter endpoints

## Response Format

### Success Response

All successful responses follow this format:

```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Response

Endpoints that support pagination include metadata:

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1458641,
    "totalPages": 14587,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Collection Response

Endpoints returning collections of data:

```json
{
  "success": true,
  "data": [
    { "id": 1, ... },
    { "id": 2, ... }
  ],
  "count": 2
}
```

### Metadata Response

Some endpoints include additional metadata:

```json
{
  "success": true,
  "data": [ ... ],
  "metadata": {
    "resolution": 8,
    "cellCount": 1247,
    "filters": { ... }
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

**Note**: The `error` field is only included in development mode

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request succeeded |
| `400` | Bad Request | Invalid parameters or request format |
| `401` | Unauthorized | Missing API key |
| `403` | Forbidden | Invalid API key |
| `404` | Not Found | Resource not found |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |

### Error Examples

**401 Unauthorized** - Missing API key:

```json
{
  "success": false,
  "message": "Authentication required",
  "error": "Missing API key. Provide key via X-API-Key header or api_key query parameter.",
  "documentation": "/api/docs/authentication"
}
```

**403 Forbidden** - Invalid API key:

```json
{
  "success": false,
  "message": "Invalid API key",
  "error": "The provided API key is not valid or has been revoked.",
  "documentation": "/api/docs/authentication"
}
```

**400 Bad Request** - Invalid parameters:

```json
{
  "success": false,
  "message": "Invalid request parameters",
  "errors": [
    {
      "field": "startDate",
      "message": "startDate must be a valid ISO 8601 date",
      "value": "invalid-date"
    }
  ]
}
```

**429 Too Many Requests** - Rate limit exceeded:

```json
{
  "success": false,
  "message": "Too many requests, please try again later",
  "retryAfter": 900
}
```

## Rate Limiting

### Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General endpoints | 100 requests | 15 minutes |
| Expensive operations | 50 requests | 15 minutes |

**Expensive operations** include:
- `/api/trips/map`
- `/api/trips/h3-grid`
- `/api/trips/advanced`

### Rate Limit Headers

Response includes rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1697452800
```

### Handling Rate Limits

When rate limited, wait for the time specified in `retryAfter` (seconds) before retrying.

## Endpoints

### Health & Documentation

#### GET /api/health

Get API and database health status.

**Authentication**: Not required

**Response**:

```json
{
  "success": true,
  "data": {
    "totalTrips": 1458641,
    "validNycTrips": 1125347,
    "avgDuration": 720.5,
    "avgDistance": 2.34,
    "activeVendors": 2,
    "lastUpdated": "2025-10-15T10:30:00Z"
  }
}
```

#### GET /api/docs

Get API documentation structure.

**Authentication**: Not required

**Response**:

```json
{
  "success": true,
  "data": {
    "title": "Urban Mobility Data Explorer API",
    "version": "1.0.0",
    "description": "REST API for NYC taxi trip data analysis",
    "authentication": "API Key required for most endpoints",
    "authDocs": "/api/docs/authentication",
    "endpoints": { ... }
  }
}
```

#### GET /api/docs/authentication

Get authentication documentation.

**Authentication**: Not required

**Response**: Complete authentication guide with examples

#### GET /api/version

Get API version information.

**Authentication**: Not required

**Response**:

```json
{
  "success": true,
  "data": {
    "api": "Urban Mobility Data Explorer API",
    "version": "1.0.0",
    "status": "operational",
    "timestamp": "2025-10-15T10:30:00Z"
  }
}
```

#### GET /api/config

Get frontend configuration (includes MapTiler API key).

**Authentication**: Required

**Response**:

```json
{
  "success": true,
  "data": {
    "maptilerApiKey": "your_maptiler_key",
    "apiBaseUrl": "http://localhost:8000/api",
    "environment": "production",
    "authenticated": true
  }
}
```

### Trip Data

#### GET /api/trips

Retrieve trips with filtering and pagination.

**Authentication**: Required  
**Rate Limit**: General (100/15min)

**Query Parameters**:

| Parameter | Type | Description | Default | Range/Options |
|-----------|------|-------------|---------|---------------|
| `startDate` | string | Filter from date (ISO 8601) | - | Valid ISO date |
| `endDate` | string | Filter to date (ISO 8601) | - | Valid ISO date |
| `vendorId` | string | Filter by vendor | - | `"1"` or `"2"` |
| `passengerCount` | integer | Filter by passengers | - | 1-6 |
| `minDuration` | integer | Min duration (seconds) | - | ≥ 0 |
| `maxDuration` | integer | Max duration (seconds) | - | ≥ 0 |
| `minDistance` | number | Min distance (km) | - | ≥ 0 |
| `maxDistance` | number | Max distance (km) | - | ≥ 0 |
| `pickupHour` | integer | Filter by hour | - | 0-23 |
| `pickupDayOfWeek` | integer | Filter by day | - | 0-6 (0=Sunday) |
| `category` | string | Data category | - | `complete`, `incomplete`, `invalid` |
| `page` | integer | Page number | 1 | ≥ 1, ≤ 10000 |
| `limit` | integer | Records per page | 100 | 1-100 |
| `sortBy` | string | Sort field | - | Any valid field |
| `sortOrder` | string | Sort order | `DESC` | `ASC`, `DESC` |

**Example Request**:

```bash
curl -H "X-API-Key: your_key" \
  "http://localhost:8000/api/trips?startDate=2016-01-01&limit=10&vendorId=1"
```

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "vendor_id": "1",
      "vendor_name": "Creative Mobile Technologies",
      "pickup_datetime": "2016-01-01T10:30:00Z",
      "dropoff_datetime": "2016-01-01T10:45:00Z",
      "trip_duration": 900,
      "passenger_count": 2,
      "pickup_longitude": -73.982154,
      "pickup_latitude": 40.767936,
      "dropoff_longitude": -73.964630,
      "dropoff_latitude": 40.765602,
      "distance_km": 1.234,
      "speed_kmh": 4.93,
      "fare_estimate": 12.50,
      "fare_per_km": 10.13,
      "pickup_hour": 10,
      "pickup_day_of_week": 5,
      "pickup_month": 1,
      "pickup_year": 2016,
      "data_category": "valid_complete",
      "data_quality_score": 95
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1458641,
    "totalPages": 145865,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### GET /api/trips/:id

Get specific trip by ID.

**Authentication**: Required  
**Rate Limit**: General (100/15min)

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Trip ID |

**Example Request**:

```bash
curl -H "X-API-Key: your_key" \
  "http://localhost:8000/api/trips/123456"
```

**Response**:

```json
{
  "success": true,
  "data": {
    "id": 123456,
    "vendor_id": "1",
    "vendor_name": "Creative Mobile Technologies",
    "pickup_datetime": "2016-03-14T17:24:55Z",
    "dropoff_datetime": "2016-03-14T17:32:30Z",
    // ... all trip fields
  }
}
```

**Errors**:
- `400` - Invalid trip ID
- `404` - Trip not found

#### GET /api/trips/map

Get optimized trip data for map visualization.

**Authentication**: Required  
**Rate Limit**: Expensive (50/15min)

**Query Parameters**:

| Parameter | Type | Description | Default | Range |
|-----------|------|-------------|---------|-------|
| `startDate` | string | Filter from date | - | ISO date |
| `endDate` | string | Filter to date | - | ISO date |
| `vendorId` | string | Filter by vendor | - | `"1"` or `"2"` |
| `neighborhood` | string | Filter by area | - | `Manhattan`, `Brooklyn`, `Queens`, `Bronx`, `Other` |
| `startHour` | integer | Start hour range | - | 0-23 |
| `endHour` | integer | End hour range | - | 0-23 |
| `month` | integer | Filter by month | - | 1-12 |
| `limit` | integer | Max records | 1000 | 1-10000 |

**Example Request**:

```bash
curl -H "X-API-Key: your_key" \
  "http://localhost:8000/api/trips/map?neighborhood=Manhattan&limit=5000"
```

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "pickup_latitude": 40.7589,
      "pickup_longitude": -73.9851,
      "dropoff_latitude": 40.7614,
      "dropoff_longitude": -73.9776,
      "pickup_datetime": "2016-01-01T10:30:00Z",
      "dropoff_datetime": "2016-01-01T10:45:00Z",
      "vendor_name": "Creative Mobile Technologies",
      "distance_km": 2.34
    }
  ],
  "filters": {
    "neighborhood": "Manhattan"
  },
  "count": 5000
}
```

#### GET /api/trips/h3-grid

Get H3 hexagonal grid aggregation for efficient map rendering.

**Authentication**: Required  
**Rate Limit**: Expensive (50/15min)

**Query Parameters**:

| Parameter | Type | Description | Default | Range |
|-----------|------|-------------|---------|-------|
| `resolution` | integer | H3 resolution | 8 | 0-15 |
| `includeGeometry` | boolean | Include hex boundaries | true | `true`, `false` |
| `startDate` | string | Filter from date | - | ISO date |
| `endDate` | string | Filter to date | - | ISO date |
| `neighborhood` | string | Filter by area | - | `Manhattan`, `Brooklyn`, `Queens`, `Bronx` |
| `startHour` | integer | Start hour range | - | 0-23 |
| `endHour` | integer | End hour range | - | 0-23 |
| `month` | integer | Filter by month | - | 1-12 |
| `minDistance` | number | Min distance | - | ≥ 0 |
| `maxDistance` | number | Max distance | - | ≥ 0 |

**Example Request**:

```bash
curl -H "X-API-Key: your_key" \
  "http://localhost:8000/api/trips/h3-grid?resolution=8&neighborhood=Manhattan"
```

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "h3": "88283082bffffff",
      "pickups": 1247,
      "dropoffs": 1193,
      "total": 2440,
      "intensity": 2440,
      "center": {
        "lat": 40.7589,
        "lng": -73.9851
      },
      "dominant_type": "pickup",
      "pickup_ratio": 0.511,
      "dropoff_ratio": 0.489,
      "boundary": [
        [40.7595, -73.9855],
        [40.7593, -73.9840],
        [40.7584, -73.9838],
        [40.7581, -73.9846],
        [40.7583, -73.9862],
        [40.7592, -73.9863]
      ]
    }
  ],
  "metadata": {
    "resolution": 8,
    "cellCount": 1247,
    "filters": {
      "neighborhood": "Manhattan"
    }
  }
}
```

#### GET /api/trips/advanced

Execute custom algorithms for advanced trip analysis.

**Authentication**: Required  
**Rate Limit**: Expensive (50/15min)

**Query Parameters**:

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `sortBy` | string | Sort field | `pickup_datetime` |
| `sortOrder` | string | Sort order | `asc` |
| `sortCriteria` | string | Multi-key sort (comma-separated) | `pickup_datetime,distance_km,data_quality_score` |
| `limit` | integer | Max records | 1000 |
| `startDate` | string | Filter from date | - |
| `endDate` | string | Filter to date | - |
| `minDistance` | number | Min distance | - |
| `maxDistance` | number | Max distance | - |
| `minDuration` | integer | Min duration | - |
| `maxDuration` | integer | Max duration | - |
| `vendorName` | string | Vendor name | - |
| `passengerCount` | integer | Passenger count | - |
| `dataCategory` | string | Data category | - |
| `minQuality` | integer | Min quality score | - |

**Example Request**:

```bash
curl -H "X-API-Key: your_key" \
  "http://localhost:8000/api/trips/advanced?sortCriteria=distance_km,speed_kmh&limit=100"
```

**Response**:

```json
{
  "success": true,
  "data": [ ... ],
  "metadata": {
    "totalAnalyzed": 50000,
    "relevantTrips": 45230,
    "finalResults": 100,
    "insights": {
      "peakHour": "17",
      "peakHourCount": 4521,
      "avgDistance": 2.8,
      "avgDuration": 15.3,
      "efficiencyScore": 76.5,
      "topPattern": "Normal traffic flow",
      "boroughDistribution": {
        "Manhattan": 35678,
        "Brooklyn": 8432,
        "Queens": 1120
      }
    },
    "sortOrder": "asc",
    "filters": {}
  }
}
```

### Statistics

#### GET /api/trips/statistics

Get trip statistics grouped by time period.

**Authentication**: Not required  
**Rate Limit**: General (100/15min)

**Query Parameters**:

| Parameter | Type | Description | Default | Options |
|-----------|------|-------------|---------|---------|
| `startDate` | string | Filter from date | - | ISO date |
| `endDate` | string | Filter to date | - | ISO date |
| `vendorId` | string | Filter by vendor | - | `"1"` or `"2"` |
| `groupBy` | string | Group by period | `hour` | `hour`, `month` |

**Example Request**:

```bash
curl "http://localhost:8000/api/trips/statistics?groupBy=hour"
```

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "pickup_hour": 0,
      "trip_count": 45231,
      "avg_duration": 720.5,
      "min_duration": 60,
      "max_duration": 3600,
      "avg_distance": 2.34,
      "min_distance": 0.1,
      "max_distance": 25.0,
      "avg_speed": 19.5,
      "total_passengers": 75384
    }
  ]
}
```

#### GET /api/trips/neighborhoods

Get neighborhood pickup and dropoff statistics.

**Authentication**: Not required  
**Rate Limit**: General (100/15min)

**Query Parameters**:

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `startDate` | string | Filter from date | - |
| `endDate` | string | Filter to date | - |
| `vendorId` | string | Filter by vendor | - |

**Example Request**:

```bash
curl "http://localhost:8000/api/trips/neighborhoods"
```

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "name": "Manhattan",
      "pickups": 650000,
      "dropoffs": 645000
    },
    {
      "name": "Brooklyn",
      "pickups": 380000,
      "dropoffs": 375000
    }
  ]
}
```

#### GET /api/trips/vendors

Get vendor statistics and distribution.

**Authentication**: Not required  
**Rate Limit**: General (100/15min)

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string | Filter from date |
| `endDate` | string | Filter to date |

**Example Request**:

```bash
curl "http://localhost:8000/api/trips/vendors"
```

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "vendor_id": "1",
      "vendor_name": "Creative Mobile Technologies",
      "trip_count": 875187,
      "percentage": 60.0,
      "avg_duration": 695,
      "avg_distance": 2.45,
      "avg_speed": 19.5,
      "total_passengers": 1458645,
      "avg_quality_score": 85.3
    }
  ]
}
```

#### GET /api/trips/fares

Get fare distribution statistics.

**Authentication**: Not required  
**Rate Limit**: General (100/15min)

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "category": "Budget",
      "tripCount": 125430,
      "avgFare": 1.45,
      "avgDistance": 0.8
    },
    {
      "category": "Economy",
      "tripCount": 543210,
      "avgFare": 2.95,
      "avgDistance": 1.5
    }
  ]
}
```

#### GET /api/trips/distribution/pickup-dropoff

Get total pickup and dropoff counts.

**Authentication**: Not required

**Response**:

```json
{
  "success": true,
  "data": {
    "pickups": 1458641,
    "dropoffs": 1458641,
    "note": "Every trip has exactly one pickup and one dropoff"
  }
}
```

### Map Data

#### GET /api/map/heatmap

Get density heatmap data for map visualization.

**Authentication**: Not required  
**Rate Limit**: General (100/15min)

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "latitude": 40.758,
      "longitude": -73.985,
      "intensity": 1247
    }
  ],
  "count": 1000
}
```

#### GET /api/map/routes

Get popular route corridors with trip counts.

**Authentication**: Not required  
**Rate Limit**: General (100/15min)

**Query Parameters**:

| Parameter | Type | Description | Default | Range |
|-----------|------|-------------|---------|-------|
| `limit` | integer | Max routes | 100 | 1-1000 |

**Example Request**:

```bash
curl "http://localhost:8000/api/map/routes?limit=50"
```

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "from": {
        "latitude": 40.758,
        "longitude": -73.985
      },
      "to": {
        "latitude": 40.761,
        "longitude": -73.978
      },
      "tripCount": 1247,
      "avgDistance": 2.34,
      "avgDuration": 15.5
    }
  ],
  "count": 50
}
```

#### GET /api/map/neighborhoods

Get neighborhood boundaries with trip counts.

**Authentication**: Not required

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "name": "Manhattan",
      "bounds": {
        "north": 40.8,
        "south": 40.7,
        "east": -73.9,
        "west": -74.02
      },
      "center": {
        "latitude": 40.75,
        "longitude": -73.96
      },
      "tripCount": 650000
    }
  ]
}
```

#### GET /api/map/stats

Get comprehensive map statistics summary.

**Authentication**: Not required

**Response**:

```json
{
  "success": true,
  "data": {
    "totalTrips": 1458641,
    "daysWithData": 365,
    "dateRange": {
      "from": "2016-01-01T00:00:00Z",
      "to": "2016-12-31T23:59:59Z"
    },
    "avgDistance": 2.34,
    "maxDistance": 45.67,
    "vendorCount": 2
  }
}
```

### Parameters

#### GET /api/parameters/options

Get available parameter options for dynamic filtering.

**Authentication**: Not required  
**Rate Limit**: General (100/15min)

**Response**:

```json
{
  "success": true,
  "data": {
    "dateRange": {
      "minDate": "2016-01-01T00:00:00Z",
      "maxDate": "2016-12-31T23:59:59Z",
      "totalDays": 365,
      "defaultStart": "2016-01-01T00:00:00Z",
      "defaultEnd": "2016-12-31T23:59:59Z"
    },
    "neighborhoods": [
      {
        "name": "Manhattan",
        "tripCount": 650000,
        "percentage": 44.5
      }
    ],
    "hours": [
      {
        "hour": 0,
        "label": "0:00",
        "tripCount": 45231,
        "percentage": 3.1
      }
    ],
    "months": [
      {
        "month": 1,
        "year": 2016,
        "label": "January 2016",
        "tripCount": 125430,
        "percentage": 8.6
      }
    ]
  }
}
```

#### POST /api/parameters/validate

Validate filter parameter values.

**Authentication**: Not required  
**Rate Limit**: General (100/15min)

**Request Body**:

```json
{
  "startDate": "2016-01-01",
  "endDate": "2016-12-31",
  "startHour": 0,
  "endHour": 23
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": []
  }
}
```

**Invalid Example**:

```json
{
  "success": true,
  "data": {
    "isValid": false,
    "errors": [
      "Start date cannot be after end date"
    ],
    "warnings": [
      "Start date is before available data (2016-01-01)"
    ]
  }
}
```

#### GET /api/parameters/stats

Get parameter usage statistics.

**Authentication**: Not required

**Response**:

```json
{
  "success": true,
  "data": {
    "Total Trips": 1458641,
    "Date Range (Days)": 365,
    "Active Vendors": 2,
    "Neighborhoods": 5,
    "Hours with Data": 24,
    "Months with Data": 12
  }
}
```

## Code Examples

### JavaScript (Fetch API)

```javascript
// With authentication header (recommended)
async function getTrips() {
  const response = await fetch('http://localhost:8000/api/trips?limit=10', {
    headers: {
      'X-API-Key': 'your_api_key_here'
    }
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('Trips:', data.data);
    console.log('Pagination:', data.pagination);
  } else {
    console.error('Error:', data.message);
  }
}

// With filters
async function getFilteredTrips() {
  const params = new URLSearchParams({
    startDate: '2016-01-01',
    endDate: '2016-01-31',
    vendorId: '1',
    limit: '50'
  });
  
  const response = await fetch(
    `http://localhost:8000/api/trips?${params}`,
    {
      headers: {
        'X-API-Key': 'your_api_key_here'
      }
    }
  );
  
  return await response.json();
}
```

### Python (requests)

```python
import requests

# Authentication
headers = {
    'X-API-Key': 'your_api_key_here'
}

# Get trips with filters
params = {
    'startDate': '2016-01-01',
    'endDate': '2016-01-31',
    'vendorId': '1',
    'limit': 50
}

response = requests.get(
    'http://localhost:8000/api/trips',
    headers=headers,
    params=params
)

data = response.json()

if data['success']:
    print(f"Retrieved {len(data['data'])} trips")
    print(f"Total: {data['pagination']['total']}")
else:
    print(f"Error: {data['message']}")
```

### cURL

```bash
# Get trips (authenticated)
curl -H "X-API-Key: your_key" \
  "http://localhost:8000/api/trips?limit=10"

# Get statistics (public)
curl "http://localhost:8000/api/trips/statistics?groupBy=hour"

# Get H3 grid (authenticated)
curl -H "X-API-Key: your_key" \
  "http://localhost:8000/api/trips/h3-grid?resolution=8&neighborhood=Manhattan"

# POST parameter validation (public)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2016-01-01","endDate":"2016-12-31"}' \
  "http://localhost:8000/api/parameters/validate"
```

## Best Practices

### Security

1. **Use Header Authentication**
   - Prefer `X-API-Key` header over query parameter
   - Never expose API keys in client-side code
   - Rotate keys regularly

2. **Secure Transmission**
   - Use HTTPS in production
   - Never transmit keys over HTTP
   - Validate SSL certificates

3. **Key Management**
   - Store keys in environment variables
   - Use different keys for different environments
   - Revoke compromised keys immediately

### Performance

1. **Pagination**
   - Use appropriate `limit` values (default: 100)
   - Don't request all data at once
   - Cache responses when possible

2. **Filtering**
   - Apply filters to reduce data transfer
   - Use specific date ranges
   - Filter by neighborhood when applicable

3. **Rate Limiting**
   - Implement exponential backoff for retries
   - Cache responses to reduce API calls
   - Respect `retryAfter` values

### Error Handling

1. **Check Response Status**
```javascript
   if (!response.ok) {
     throw new Error(`HTTP ${response.status}: ${response.statusText}`);
   }
   ```

2. **Validate Response Data**
   ```javascript
   if (!data.success) {
     console.error('API Error:', data.message);
     return;
   }
   ```

3. **Handle Network Errors**
   ```javascript
   try {
     const response = await fetch(url, options);
     // ... process response
   } catch (error) {
     console.error('Network error:', error);
   }
   ```

### Data Handling

1. **Parse Dates Correctly**
   ```javascript
   const pickupDate = new Date(trip.pickup_datetime);
   ```

2. **Handle Null Values**
   ```javascript
   const distance = trip.distance_km ?? 0;
   ```

3. **Validate Data Types**
   ```javascript
   if (typeof trip.distance_km === 'number') {
     // Process distance
   }
   ```

## Troubleshooting

### Common Issues

**Issue**: 401 Unauthorized

**Solution**: Ensure API key is included in `X-API-Key` header or `api_key` query parameter

---

**Issue**: 429 Too Many Requests

**Solution**: Wait for the time specified in `retryAfter` before retrying

---

**Issue**: 400 Invalid Parameters

**Solution**: Check error response for specific validation errors and correct parameters

---

**Issue**: Empty Data Array

**Solution**: Check if filters are too restrictive. Try broadening date range or removing filters

---

**Issue**: Slow Response Times

**Solution**: 
- Reduce `limit` parameter
- Apply more specific filters
- Use H3 grid endpoint for map data instead of raw trips

## Support

For additional help:

1. Check the [Setup Guide](setup-guide.md) for configuration issues
2. Review the [Architecture documentation](architecture.md) for system understanding
3. Examine server logs in `logs/` directory
4. Verify API key configuration in `.env` file

---

**Last Updated**: October 2025  
**Version**: 1.0.0  
**Related**: [Setup Guide](setup-guide.md), [Architecture](architecture.md)
