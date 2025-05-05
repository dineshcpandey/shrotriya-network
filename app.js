// app.js - Main application file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const applyMiddleware = require('./middleware');
const searchRoutes = require('./routes/search');
const relationRoutes = require('./routes/personController');
const marriageRoutes = require('./routes/marriageController');

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

// API Routes

app.use('/api/search', searchRoutes);
app.use('/api/details', relationRoutes);
app.use('/api/marriages', marriageRoutes);



// Root route
app.get('/', (req, res) => {
    res.json({ message: 'Network API Server is running' });
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start the server
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

module.exports = app;