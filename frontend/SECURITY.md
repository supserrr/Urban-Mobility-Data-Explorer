# Frontend Security Guidelines

## API Key Management

### Current Implementation
The frontend currently uses API keys for backend authentication. This is not a secure production solution.

### Security Risks
1. API keys are visible in client-side JavaScript code
2. Anyone can extract the API key from browser developer tools
3. No user tracking - all users share the same API key
4. Cannot revoke individual user access

### Recommended Solutions for Production

#### Option 1: User Authentication (Recommended)
Implement proper user authentication:
```javascript
// User logs in with credentials
const login = async (username, password) => {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    const { token } = await response.json();
    // Store token in secure httpOnly cookie
    // Backend validates token for each request
};
```

#### Option 2: Backend Proxy
Create a backend proxy that handles authentication:
```javascript
// Frontend calls proxy without API key
const fetchData = async () => {
    const response = await fetch('/api/proxy/trips');
    // Proxy adds API key server-side
};
```

#### Option 3: Build-Time Environment Variables
Use environment-specific builds:
```bash
# .env.production
VITE_API_KEY=production_key_here

# Build process injects key
npm run build
```

#### Option 4: OAuth/JWT Authentication
Implement OAuth2 or JWT-based authentication flow.

### Current Development Setup

For development and demo purposes only:

1. Generate an API key:
   ```bash
   cd backend
   node src/utils/generateApiKey.js
   ```

2. Add to `backend/.env`:
   ```
   API_KEYS=your_generated_key_here
   ```

3. Update `frontend/config.js`:
   ```javascript
   API_KEY: 'your_generated_key_here'
   ```

### Production Checklist

Before deploying to production:

- Remove hardcoded API keys from config.js
- Implement one of the recommended authentication solutions
- Enable HTTPS for all API calls
- Implement rate limiting per user (not per API key)
- Add user session management
- Implement CSRF protection
- Add security headers (CSP, HSTS, etc.)
- Regular security audits
- API key rotation policy
- Monitor for unusual API activity

### Additional Security Measures

1. **Content Security Policy (CSP)**
   - Restrict script sources
   - Prevent XSS attacks

2. **HTTPS Only**
   - All API communication over HTTPS
   - Use secure cookies

3. **Input Validation**
   - Validate all user inputs
   - Sanitize data before display

4. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories

5. **Security Headers**
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block

## Reporting Security Issues

If you discover a security vulnerability:
1. Do not create a public GitHub issue
2. Email security concerns to the development team
3. Include details of the vulnerability
4. Wait for acknowledgment before disclosure

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Security Best Practices](https://developer.mozilla.org/en-US/docs/Web/Security)
- [API Security Checklist](https://github.com/shieldfy/API-Security-Checklist)

