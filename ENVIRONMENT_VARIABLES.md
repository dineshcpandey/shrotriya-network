# Environment Variables Configuration

This document describes the environment variables used in the Family Tree Explorer application and how hardcoded URLs have been replaced with configurable environment variables.

## Overview

All hardcoded URLs throughout the application have been replaced with environment variables to make the application more flexible and deployment-ready. This allows easy configuration for different environments (development, staging, production) without code changes.

## Environment Variables

### Server Configuration
- `PORT` - Server port (default: 5050)
- `NODE_ENV` - Environment (development/production)
- `BASE_URL` - Base URL for the server (e.g., http://localhost:5050)

### API Configuration
- `API_BASE_URL` - Base URL for API details endpoints (e.g., http://localhost:5050/api/details)
- `AUTH_BASE_URL` - Base URL for authentication endpoints (e.g., http://localhost:5050/auth)
- `IMAGE_BASE_URL` - Base URL for image API endpoints (e.g., http://localhost:5050/api/images)
- `IMAGE_SERVE_URL` - URL for serving images (e.g., http://localhost:5050/api/images/serve)

### Frontend Configuration
- `FRONTEND_URL` - Frontend application URL (same as BASE_URL since frontend is served from the same Express server)

### External URLs
- `DEFAULT_AVATAR_URL` - Default avatar image URL
- `FACEBOOK_GRAPH_URL` - Facebook Graph API URL (default: https://graph.facebook.com)

## Files Updated

### Backend Files
1. **app.js** - Updated console.log URLs to use environment variables
2. **mappers/personMapper.js** - Updated image serving URLs and Facebook Graph URLs
3. **routes/auth.js** - Updated frontend redirect URL
4. **routes/imageController.js** - Updated image serving URLs
5. **routes/configController.js** - New endpoint to serve frontend configuration

### Frontend Files
1. **public/js/config.js** - New configuration file for frontend
2. **public/js/env-loader.js** - Environment loader script
3. **public/js/api.js** - Updated API base URLs
4. **public/js/imageUtils.js** - Updated image API URLs
5. **public/js/avatarUtils.js** - Updated image serving URLs
6. **public/js/imageUpload.js** - Updated upload endpoint URL
7. **public/js/auth.js** - Updated authentication URLs
8. **public/js/api-utils.js** - Updated API base URLs
9. **public/js/chart.js** - Updated image serving URLs
10. **public/js/chart2.js** - Updated image serving URLs
11. **public/family-chart-app.js** - Updated API URLs

### HTML Files
1. **public/shrotriya.html** - Added configuration script imports
2. **public/route-finder.html** - Added configuration script imports
3. **public/route2.html** - Added configuration script imports

## Configuration System

### Backend Configuration
The backend reads environment variables directly from the `.env` file using `process.env`.

### Frontend Configuration
Since frontend JavaScript cannot directly access `.env` files, we've implemented a configuration system:

1. **config.js** - Defines default configuration values and reads from `window.CONFIG`
2. **env-loader.js** - Attempts to load configuration from the server's `/api/config` endpoint
3. **configController.js** - Backend endpoint that serves safe environment variables to the frontend

### Configuration Loading Order
1. Default values are set in `config.js`
2. Server configuration is loaded from `/api/config` endpoint (if available)
3. Values can be overridden by setting `window.CONFIG` properties before other scripts load

## Setup Instructions

### Development Environment
1. Update `.env` file with your local development URLs
2. All URLs default to localhost:5050 if not specified

### Production Environment
1. Copy `.env.production.template` to `.env.production`
2. Update all URLs to match your production environment
3. Set `NODE_ENV=production`
4. Update `BASE_URL`, `API_BASE_URL`, etc. to use your production domain

## Benefits

1. **Environment Flexibility** - Easy switching between development, staging, and production
2. **Security** - No hardcoded production URLs in source code
3. **Configuration Management** - Centralized configuration through environment variables
4. **Deployment Ready** - Works with Docker, cloud platforms, and CI/CD pipelines
5. **Development Friendly** - Sensible defaults for local development

## Usage Examples

### Development (.env)
```
BASE_URL=http://localhost:5050
API_BASE_URL=http://localhost:5050/api/details
FRONTEND_URL=http://localhost:5050
```

### Production (.env.production)
```
BASE_URL=https://api.familytree.com
API_BASE_URL=https://api.familytree.com/api/details
FRONTEND_URL=https://api.familytree.com
```

### Docker/Cloud Deployment
Environment variables can be set through:
- Docker environment variables
- Kubernetes config maps/secrets
- Cloud platform environment settings
- CI/CD pipeline variables

## Testing

After updating environment variables:
1. Restart the server
2. Check that all API calls use the correct URLs
3. Verify image uploads and serving work correctly
4. Test authentication redirects
5. Confirm frontend loads configuration from server

## Troubleshooting

### Common Issues
1. **URLs not updating** - Check that server is restarted after .env changes
2. **Frontend using old URLs** - Check browser cache, try hard refresh
3. **Images not loading** - Verify IMAGE_SERVE_URL is correctly set
4. **API calls failing** - Check API_BASE_URL matches server configuration

### Debug Configuration
You can check current configuration by:
1. Opening browser console and checking `window.CONFIG`
2. Visiting `/api/config` endpoint directly
3. Checking server logs for environment variable values
