# MapTiler Setup Guide

Configure map visualization for the Urban Mobility Data Explorer using MapTiler's tile service.

## Overview

This guide explains how to configure MapTiler for secure, performant map visualizations. The setup follows security best practices by storing API keys server-side and serving them through authenticated endpoints.

## Prerequisites

- Backend server configured and running
- Environment file (`.env`) created in backend directory
- Basic understanding of API authentication

## Security Architecture

### Secure Configuration Flow

```
┌─────────────┐
│ MapTiler    │
│ Cloud       │
└──────┬──────┘
       │ API Key
       ▼
┌─────────────┐
│ Backend     │ ◄── API_KEYS in .env
│ .env file   │     (never committed)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ /api/config │ ◄── Requires authentication
│ endpoint    │     (API key protected)
└──────┬──────┘
       │ Serves key to authenticated clients
       ▼
┌─────────────┐
│ Frontend    │
│ config.js   │ ◄── Fetches key dynamically
└─────────────┘
```

### Security Benefits

1. **Server-Side Storage**: API keys never appear in frontend code
2. **Git Protection**: `.env` file is excluded from version control
3. **Access Control**: Only authenticated clients receive the key
4. **Dynamic Loading**: Keys fetched at runtime, not hard-coded
5. **Rotation Support**: Keys can be changed without code updates

## Obtaining a MapTiler API Key

### Step 1: Create Free Account

1. Navigate to [MapTiler Cloud](https://cloud.maptiler.com/)
2. Click "Sign Up" in the top right corner
3. Complete registration (no credit card required)
4. Verify your email address

### Step 2: Access API Keys

1. Log in to your MapTiler account
2. Navigate to **Account** > **Keys**
3. Locate your default API key
4. Click the copy icon to copy the key

### Step 3: (Optional) Create Application-Specific Key

For production environments, create a dedicated key:

1. Click "Create New Key" in the Keys section
2. Name it "Urban Mobility Data Explorer"
3. Configure restrictions:
   - **HTTP Referrers**: Add your domain
   - **Allowed URLs**: Specify allowed origins
4. Save and copy the new key

## Free Tier Features

MapTiler's free tier includes:

- **100,000 tile loads** per month
- All map styles (Streets, Dark, Satellite, Outdoor)
- No credit card required
- Sufficient for development and small production deployments

**Monitoring Usage**:
- Check usage in MapTiler dashboard
- Set up alerts for usage thresholds
- Upgrade to paid plan if needed

## Configuration Steps

### Step 1: Configure Backend Environment

Edit `backend/.env` and add your MapTiler API key:

```bash
# MapTiler Configuration
MAPTILER_API_KEY=your_actual_maptiler_api_key_here
```

**Important Security Notes**:

1. **Never commit** `.env` file to version control
2. Use different keys for development and production
3. Rotate keys periodically (every 90 days recommended)
4. Keep backup of active keys in secure location

### Step 2: Configure Frontend Authentication

The frontend must authenticate to receive the MapTiler key.

Edit `frontend/config.js` to ensure API key is included:

```javascript
// API client automatically includes authentication
const config = await loadConfigFromBackend();
// config.maptilerApiKey is now available
```

**Verification**:

1. Frontend sends request to `/api/config`
2. Backend validates API key from request header
3. Backend returns MapTiler key to authenticated client
4. Frontend uses MapTiler key for map tiles

### Step 3: Verify Configuration

Test the configuration:

```bash
# Test without authentication (should fail)
curl http://localhost:8000/api/config

# Expected response:
# {
#   "success": false,
#   "message": "Authentication required"
# }

# Test with authentication (should succeed)
curl -H "X-API-Key: your_api_key_here" http://localhost:8000/api/config

# Expected response:
# {
#   "success": true,
#   "data": {
#     "maptilerApiKey": "your_maptiler_key...",
#     "apiBaseUrl": "http://localhost:8000/api",
#     "environment": "development"
#   }
# }
```

### Step 4: Restart Server

After updating `.env`, restart the backend server:

```bash
# Navigate to backend directory
cd backend

# Stop server (if running)
pkill -f "node.*server-production.js"

# Start server
npm start
```

Or use the automated script:

```bash
# Stop servers
cd scripts
./stop-servers.sh

# Start servers
./start-servers.sh
```

## Testing Map Functionality

### Step 1: Access Map View

1. Open browser to http://localhost:3000
2. Navigate to the Heatmap view
3. Wait for map to load

### Step 2: Verify Map Loads

Check that:

- [ ] Map tiles load correctly
- [ ] Map style is "MapTiler Streets"
- [ ] No authentication errors in console
- [ ] Zoom and pan work smoothly

### Step 3: Browser Console Check

Open browser console (F12) and verify:

```javascript
// No errors related to MapTiler
// No 403 Forbidden errors
// No authentication failures
```

### Step 4: Test Different Themes

The application supports multiple map themes:

1. Click theme switcher in map view
2. Test each theme:
   - **Light**: MapTiler Streets (default)
   - **Dark**: MapTiler Streets Dark
   - **Satellite**: MapTiler Hybrid

## Available Map Styles

### MapTiler Streets (Default)

```javascript
tileLayer: 'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key={apiKey}'
```

**Features**:
- Clean, readable street map
- Optimized for data overlay
- Good contrast for markers and heatmaps

### MapTiler Dark

```javascript
tileLayer: 'https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key={apiKey}'
```

**Features**:
- Dark theme for low-light environments
- Reduces eye strain
- Better for nighttime use

### MapTiler Satellite

```javascript
tileLayer: 'https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key={apiKey}'
```

**Features**:
- Satellite imagery with street labels
- Real-world context
- Higher data transfer

## Advanced Configuration

### Custom Map Styles

To use a custom MapTiler style:

1. Create custom style in MapTiler Cloud
2. Copy the style URL
3. Update `frontend/components/MapView.js`:

```javascript
const customTileLayer = `https://api.maptiler.com/maps/{style-id}/{z}/{x}/{y}.png?key={apiKey}`;
```

### Tile Caching

For production, enable tile caching:

```javascript
// In MapView.js initialization
const tileLayer = L.tileLayer(tileUrl, {
    maxZoom: 18,
    attribution: '&copy; MapTiler',
    // Enable browser caching
    crossOrigin: true
});
```

### Performance Optimization

Optimize map performance:

```javascript
// Reduce tile quality for faster loading
const tileUrl = `${baseUrl}@2x.png?key=${apiKey}`;  // High DPI
const tileUrl = `${baseUrl}.png?key=${apiKey}`;     // Standard DPI (faster)
```

## Troubleshooting

### Map Not Loading

**Symptoms**:
- Blank map area
- Gray tiles
- Loading spinner never stops

**Solutions**:

1. **Check API Key Configuration**:
   ```bash
   # Verify key is in .env
   grep MAPTILER_API_KEY backend/.env
   ```

2. **Verify Authentication**:
   ```bash
   # Test config endpoint
   curl -H "X-API-Key: your_key" http://localhost:8000/api/config
   ```

3. **Check Browser Console**:
   - Look for 403 Forbidden errors
   - Verify MapTiler key is present
   - Check network tab for failed requests

4. **Validate MapTiler Key**:
   ```bash
   # Test key directly with MapTiler
   curl "https://api.maptiler.com/maps/streets-v2/0/0/0.png?key=your_maptiler_key"
   ```

### 403 Forbidden Errors

**Problem**: Tiles return 403 Forbidden

**Causes**:
1. Invalid or expired API key
2. Usage limit exceeded
3. Domain restrictions on key

**Solutions**:

1. **Verify Key Validity**:
   - Log in to MapTiler Cloud
   - Check key status
   - Verify key hasn't been revoked

2. **Check Usage Limits**:
   - Review usage in MapTiler dashboard
   - Verify within free tier limits
   - Upgrade plan if necessary

3. **Review Domain Restrictions**:
   - Check key restrictions in MapTiler
   - Add `localhost` to allowed origins
   - Update production domains

### Tiles Not Updating

**Problem**: Map shows old/cached tiles

**Solution**:

```javascript
// Force tile refresh
map.invalidateSize();

// Clear browser cache
// Chrome: Ctrl+Shift+Delete
// Firefox: Ctrl+Shift+Delete
```

### Performance Issues

**Problem**: Map loads slowly or stutters

**Solutions**:

1. **Reduce Tile Quality**:
   ```javascript
   // Use standard DPI instead of @2x
   const tileUrl = baseUrl + '.png?key=' + apiKey;
   ```

2. **Limit Zoom Levels**:
   ```javascript
   const tileLayer = L.tileLayer(url, {
       minZoom: 10,
       maxZoom: 16  // Reduce from 18
   });
   ```

3. **Enable Tile Caching**:
   - Configure CDN
   - Enable browser caching
   - Use service worker for offline

## Security Best Practices

### Development Environment

- [ ] Store keys in `.env` file only
- [ ] Add `.env` to `.gitignore`
- [ ] Use separate keys for dev and production
- [ ] Never log API keys
- [ ] Rotate keys every 90 days

### Production Environment

- [ ] Use environment variables (not files)
- [ ] Configure domain restrictions
- [ ] Enable HTTPS only
- [ ] Set up key rotation schedule
- [ ] Monitor usage and set alerts
- [ ] Use different keys per environment
- [ ] Enable request logging
- [ ] Set up backup keys

### Key Rotation Procedure

1. Generate new MapTiler API key
2. Update `.env` with new key
3. Test functionality
4. Update production environment
5. Monitor for issues
6. Revoke old key after 48 hours

## Monitoring and Maintenance

### Usage Monitoring

Monitor your MapTiler usage:

1. Log in to MapTiler Cloud
2. Navigate to **Dashboard**
3. Review metrics:
   - Total requests
   - Bandwidth usage
   - Popular tiles
   - Error rates

### Set Up Alerts

Configure usage alerts:

1. Go to **Account** > **Alerts**
2. Set threshold (e.g., 80% of limit)
3. Add email notification
4. Test alert delivery

### Logs and Debugging

Enable detailed logging:

```javascript
// In MapView.js
L.tileLayer(url, {
    errorTileUrl: 'path/to/error-tile.png',
    // Log tile loading errors
    onload: () => console.log('Tile loaded'),
    onerror: (error) => console.error('Tile error:', error)
});
```

## Additional Resources

### Official Documentation

- [MapTiler Cloud Documentation](https://docs.maptiler.com/)
- [Leaflet Integration Guide](https://docs.maptiler.com/leaflet/)
- [MapTiler API Reference](https://docs.maptiler.com/cloud/api/)

### Code Examples

- [Leaflet Examples](https://leafletjs.com/examples.html)
- [MapTiler Examples](https://docs.maptiler.com/leaflet/examples/)

### Support

- [MapTiler Support](https://support.maptiler.com/)
- [Community Forum](https://community.maptiler.com/)

## Migration Notes

### From OpenStreetMap

If migrating from OpenStreetMap tiles:

```javascript
// Old (OpenStreetMap)
const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// New (MapTiler)
const mapTilerUrl = 'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=' + apiKey;
```

**Benefits**:
- Better performance
- More style options
- Commercial use allowed
- Better attribution

## Frequently Asked Questions

### Q: Is MapTiler free?

**A**: Yes, the free tier includes 100,000 tile loads per month, sufficient for development and small production deployments.

### Q: Can I use MapTiler in production?

**A**: Yes, MapTiler is production-ready. Upgrade to a paid plan for higher usage.

### Q: How do I monitor usage?

**A**: Log in to MapTiler Cloud and check the dashboard for real-time usage statistics.

### Q: What happens if I exceed the limit?

**A**: Tile requests will be rate-limited. Upgrade your plan or wait until the next billing cycle.

### Q: Can I use custom map styles?

**A**: Yes, create custom styles in MapTiler Cloud and use the style URL in your application.

---

**Last Updated**: October 2025  
**Version**: 1.0.0  
**Related**: [Setup Guide](setup-guide.md), [Architecture](architecture.md)
