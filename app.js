// app.js - Main application file with Swagger integration
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const applyMiddleware = require('./middleware');
const searchRoutes = require('./routes/search');
const relationRoutes = require('./routes/personController');
const marriageRoutes = require('./routes/marriageController');

// Import Swagger configuration
const { swaggerDocument, swaggerUi, swaggerOptions } = require('./swagger');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    // Allow access from any frontend during development
    origin: function (origin, callback) {
        // Allow all origins in development mode
        // In production, you would want to be more restrictive
        callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply middleware
applyMiddleware(app);

// Swagger Documentation Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

// Serve raw swagger JSON
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
});

// Serve swagger YAML (if you want to provide the raw YAML)
app.get('/api-docs.yaml', (req, res) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.sendFile(__dirname + '/swagger.yaml');
});

// API Routes
app.use('/api/search', searchRoutes);
app.use('/api/details', relationRoutes);
app.use('/api/marriages', marriageRoutes);

// Root route with API information
app.get('/', (req, res) => {
    res.json({
        message: 'Family Network API Server is running',
        documentation: {
            interactive: `${req.protocol}://${req.get('host')}/api-docs`,
            json: `${req.protocol}://${req.get('host')}/api-docs.json`,
            yaml: `${req.protocol}://${req.get('host')}/api-docs.yaml`
        },
        endpoints: {
            search: '/api/search',
            persons: '/api/details',
            marriages: '/api/marriages'
        }
    });
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        documentation: `${req.protocol}://${req.get('host')}/api-docs`
    });
});

// Start the server
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
        console.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
        console.log(`📄 Swagger JSON: http://localhost:${port}/api-docs.json`);
        console.log(`📋 Swagger YAML: http://localhost:${port}/api-docs.yaml`);
    });
}

module.exports = app;