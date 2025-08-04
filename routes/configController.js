const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/config:
 *   get:
 *     tags: [Configuration]
 *     summary: Get frontend configuration
 *     description: Returns environment variables safe for frontend consumption
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 API_BASE_URL:
 *                   type: string
 *                   example: "http://localhost:5050/api/details"
 *                 AUTH_BASE_URL:
 *                   type: string
 *                   example: "http://localhost:5050/auth"
 *                 IMAGE_BASE_URL:
 *                   type: string
 *                   example: "http://localhost:5050/api/images"
 *                 IMAGE_SERVE_URL:
 *                   type: string
 *                   example: "http://localhost:5050/api/images/serve"
 *                 BASE_URL:
 *                   type: string
 *                   example: "http://localhost:5050"
 *                 DEFAULT_AVATAR_URL:
 *                   type: string
 *                   example: "https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg"
 *                 FACEBOOK_GRAPH_URL:
 *                   type: string
 *                   example: "https://graph.facebook.com"
 */
router.get('/config', (req, res) => {
    try {
        // Only expose safe environment variables to frontend
        const frontendConfig = {
            API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5050/api/details',
            AUTH_BASE_URL: process.env.AUTH_BASE_URL || 'http://localhost:5050/auth',
            IMAGE_BASE_URL: process.env.IMAGE_BASE_URL || 'http://localhost:5050/api/images',
            IMAGE_SERVE_URL: process.env.IMAGE_SERVE_URL || 'http://localhost:5050/api/images/serve',
            BASE_URL: process.env.BASE_URL || 'http://localhost:5050',
            DEFAULT_AVATAR_URL: process.env.DEFAULT_AVATAR_URL || 'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg',
            FACEBOOK_GRAPH_URL: process.env.FACEBOOK_GRAPH_URL || 'https://graph.facebook.com'
        };

        res.json(frontendConfig);
    } catch (error) {
        console.error('Error retrieving frontend config:', error);
        res.status(500).json({
            error: 'Failed to retrieve configuration'
        });
    }
});

module.exports = router;
