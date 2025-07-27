// app.js - Main application file with Swagger integration and image support
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const applyMiddleware = require('./middleware');
const searchRoutes = require('./routes/searchController');
const relationRoutes = require('./routes/personController');
const routeController = require('./routes/routeController');
const marriageRoutes = require('./routes/marriageController');
const imageRoutes = require('./routes/imageController'); // New image routes
const passport = require('passport');
const authRoutes = require('./routes/auth');

// Import Swagger configuration
const { swaggerDocument, swaggerUi, swaggerOptions } = require('./swagger');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory');
}

// CORS configuration
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

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1y', // Cache for 1 year
    etag: true,
    lastModified: true
}));

// Serve static files from public directory (for frontend assets)
app.use(express.static(path.join(__dirname, 'public')));

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
app.use('/api/details', routeController);
app.use('/api/details', relationRoutes);
app.use('/api/marriages', marriageRoutes);
app.use('/api/images', imageRoutes); // New image routes
app.use('/auth', authRoutes);


// Serve image uploader interface
app.get('/image-uploader', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'image-uploader.html'));
});

// Root route with API information
app.get('/', (req, res) => {
    res.json({
        message: 'Family Network API Server is running',
        version: '1.0.0',
        features: {
            imageUpload: true,
            imageCropping: true,
            imageProcessing: true
        },
        documentation: {
            interactive: `${req.protocol}://${req.get('host')}/api-docs`,
            json: `${req.protocol}://${req.get('host')}/api-docs.json`,
            yaml: `${req.protocol}://${req.get('host')}/api-docs.yaml`
        },
        endpoints: {
            search: '/api/search',
            persons: '/api/details',
            marriages: '/api/marriages',
            images: '/api/images',
            imageUploader: '/image-uploader'
        },
        imageFeatures: {
            supportedFormats: ['JPEG', 'PNG', 'WebP'],
            maxFileSize: '10MB',
            processing: {
                cropping: true,
                resizing: true,
                optimization: true,
                multipleSizes: ['thumbnail', 'medium', 'large']
            }
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Image upload test endpoint (for development)
app.get('/test-upload', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Image Upload Test</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .container { max-width: 800px; margin: 0 auto; }
                .upload-area { 
                    border: 2px dashed #ccc; 
                    padding: 40px; 
                    text-align: center; 
                    margin: 20px 0;
                }
                .btn { 
                    background: #007bff; 
                    color: white; 
                    border: none; 
                    padding: 10px 20px; 
                    margin: 10px;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Image Upload Test</h1>
                <p>This is a simple test page. Use the full featured uploader at: 
                   <a href="/image-uploader">/image-uploader</a>
                </p>
                
                <form id="testForm" enctype="multipart/form-data">
                    <div class="upload-area">
                        <input type="file" name="image" accept="image/*" required>
                        <br><br>
                        <label>Person ID: <input type="number" name="personId" required></label>
                        <br><br>
                        <button type="submit" class="btn">Upload Test Image</button>
                    </div>
                </form>
                
                <div id="result"></div>
            </div>
            
            <script>
                document.getElementById('testForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    
                    try {
                        const response = await fetch('/api/images/upload', {
                            method: 'POST',
                            body: formData
                        });
                        
                        const result = await response.json();
                        document.getElementById('result').innerHTML = 
                            '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
                    } catch (error) {
                        document.getElementById('result').innerHTML = 
                            '<p style="color: red;">Error: ' + error.message + '</p>';
                    }
                });
            </script>
        </body>
        </html>
    `);
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: 'The requested endpoint does not exist',
        documentation: `${req.protocol}://${req.get('host')}/api-docs`,
        availableEndpoints: [
            '/api/search',
            '/api/details',
            '/api/marriages',
            '/api/images',
            '/image-uploader'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);

    // Handle multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File size too large. Maximum size is 10MB.'
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: 'Unexpected file field. Please check your form data.'
        });
    }

    // Handle other errors
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start the server
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
        console.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
        console.log(`📄 Swagger JSON: http://localhost:${port}/api-docs.json`);
        console.log(`📋 Swagger YAML: http://localhost:${port}/api-docs.yaml`);
        console.log(`🖼️  Image Uploader: http://localhost:${port}/image-uploader`);
        console.log(`🔧 Test Upload: http://localhost:${port}/test-upload`);
        console.log(`📁 Upload Directory: ${uploadsDir}`);
        console.log(`💾 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

module.exports = app;