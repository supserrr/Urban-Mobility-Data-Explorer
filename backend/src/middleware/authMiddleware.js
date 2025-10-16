// Authentication Middleware

const crypto = require('crypto');

// Require valid API key for access
const requireApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            error: 'Missing API key. Provide key via X-API-Key header or api_key query parameter.',
            documentation: '/api/docs/authentication'
        });
    }
    
    // Get valid API keys from environment variable
    const validKeys = (process.env.API_KEYS || '').split(',').filter(key => key.trim());
    
    if (validKeys.length === 0) {
        return res.status(500).json({
            success: false,
            message: 'Authentication system not configured',
            error: 'Server configuration error'
        });
    }
    
    // Validate API key using constant-time comparison to prevent timing attacks
    const isValid = validKeys.some(validKey => {
        return crypto.timingSafeEqual(
            Buffer.from(apiKey),
            Buffer.from(validKey)
        );
    });
    
    if (!isValid) {
        return res.status(403).json({
            success: false,
            message: 'Invalid API key',
            error: 'The provided API key is not valid or has been revoked.',
            documentation: '/api/docs/authentication'
        });
    }
    
    // API key is valid, proceed to next middleware
    next();
};

// Optional API key - allows public and authenticated access
const optionalApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
        req.authenticated = false;
        req.accessLevel = 'public';
        return next();
    }
    
    const validKeys = (process.env.API_KEYS || '').split(',').filter(key => key.trim());
    
    if (validKeys.length === 0) {
        req.authenticated = false;
        req.accessLevel = 'public';
        return next();
    }
    
    // Validate API key
    try {
        const isValid = validKeys.some(validKey => {
            return crypto.timingSafeEqual(
                Buffer.from(apiKey),
                Buffer.from(validKey)
            );
        });
        
        if (isValid) {
            req.authenticated = true;
            req.accessLevel = 'authenticated';
        } else {
            req.authenticated = false;
            req.accessLevel = 'public';
        }
    } catch (error) {
        req.authenticated = false;
        req.accessLevel = 'public';
    }
    
    next();
};

// Generate secure random API key
const generateApiKey = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

// Hash API key for storage
const hashApiKey = (apiKey) => {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
};

// Get rate limit multiplier based on auth status
const getRateLimitMultiplier = (req) => {
    return req.authenticated ? 3 : 1;
};

// Check if request is authenticated
const isAuthenticated = (req) => {
    return req.authenticated === true;
};

module.exports = {
    requireApiKey,
    optionalApiKey,
    generateApiKey,
    hashApiKey,
    getRateLimitMultiplier,
    isAuthenticated
};

