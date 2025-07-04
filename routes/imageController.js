// Enhanced Image Controller with processing and cropping
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

const router = express.Router();

// Configuration
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_SIZES = {
    thumbnail: { width: 150, height: 150 },
    medium: { width: 400, height: 400 },
    large: { width: 800, height: 800 }
};

// Ensure upload directory exists
const ensureUploadDir = async () => {
    try {
        await fs.access(UPLOAD_DIR);
    } catch (error) {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }
};

// Initialize upload directory
ensureUploadDir();

// Multer configuration for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        }
    }
});

// Helper function to generate unique filename
const generateFilename = (originalName, suffix = '') => {
    const timestamp = Date.now();
    const uuid = uuidv4().split('-')[0];
    const ext = path.extname(originalName);
    return `${timestamp}-${uuid}${suffix}${ext}`;
};

// Helper function to save image with different sizes
const saveImageSizes = async (buffer, originalName, cropData = null) => {
    const baseFilename = generateFilename(originalName);
    const savedFiles = {};

    try {
        let imageProcessor = sharp(buffer);

        // Apply cropping if provided
        if (cropData) {
            const { x, y, width, height } = cropData;
            imageProcessor = imageProcessor.extract({
                left: Math.round(x),
                top: Math.round(y),
                width: Math.round(width),
                height: Math.round(height)
            });
        }

        // Get metadata
        const metadata = await imageProcessor.metadata();

        // Save original/large size
        const largeFilename = generateFilename(originalName, '-large');
        const largePath = path.join(UPLOAD_DIR, largeFilename);
        await imageProcessor
            .resize(IMAGE_SIZES.large.width, IMAGE_SIZES.large.height, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 85 })
            .toFile(largePath);

        savedFiles.large = {
            filename: largeFilename,
            path: largePath,
            size: IMAGE_SIZES.large
        };

        // Save medium size
        const mediumFilename = generateFilename(originalName, '-medium');
        const mediumPath = path.join(UPLOAD_DIR, mediumFilename);
        await imageProcessor
            .resize(IMAGE_SIZES.medium.width, IMAGE_SIZES.medium.height, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toFile(mediumPath);

        savedFiles.medium = {
            filename: mediumFilename,
            path: mediumPath,
            size: IMAGE_SIZES.medium
        };

        // Save thumbnail
        const thumbnailFilename = generateFilename(originalName, '-thumb');
        const thumbnailPath = path.join(UPLOAD_DIR, thumbnailFilename);
        await imageProcessor
            .resize(IMAGE_SIZES.thumbnail.width, IMAGE_SIZES.thumbnail.height, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 75 })
            .toFile(thumbnailPath);

        savedFiles.thumbnail = {
            filename: thumbnailFilename,
            path: thumbnailPath,
            size: IMAGE_SIZES.thumbnail
        };

        return {
            ...savedFiles,
            originalMetadata: {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format
            }
        };

    } catch (error) {
        // Clean up any files that might have been created
        for (const file of Object.values(savedFiles)) {
            try {
                await fs.unlink(file.path);
            } catch (cleanupError) {
                console.error('Error cleaning up file:', cleanupError);
            }
        }
        throw error;
    }
};

// Helper function to save image metadata to database
const saveImageMetadata = async (personId, fileInfo, originalFilename, cropData) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Deactivate old profile images for this person
        await client.query(
            'UPDATE network.images SET is_active = false WHERE person_id = $1 AND image_type = $2',
            [personId, 'profile']
        );

        // Insert new image record
        const insertQuery = `
            INSERT INTO network.images 
            (person_id, filename, original_filename, file_path, file_size, mime_type, 
             image_type, width, height, crop_data, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const result = await client.query(insertQuery, [
            personId,
            fileInfo.large.filename,
            originalFilename,
            `/uploads/${fileInfo.large.filename}`,
            0, // We'll calculate this later
            'image/jpeg',
            'profile',
            fileInfo.originalMetadata.width,
            fileInfo.originalMetadata.height,
            cropData ? JSON.stringify(cropData) : null,
            true
        ]);

        // Update person table with profile image info
        await client.query(
            `UPDATE network.person 
             SET profile_image_url = $1, profile_image_filename = $2, 
                 image_upload_date = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [`/uploads/${fileInfo.large.filename}`, fileInfo.large.filename, personId]
        );

        await client.query('COMMIT');
        return result.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Routes

// Upload image with optional cropping
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const { personId, cropData } = req.body;

        if (!personId) {
            return res.status(400).json({
                success: false,
                message: 'Person ID is required'
            });
        }

        // Parse crop data if provided
        let parsedCropData = null;
        if (cropData) {
            try {
                parsedCropData = JSON.parse(cropData);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid crop data format'
                });
            }
        }

        // Process and save image
        const fileInfo = await saveImageSizes(req.file.buffer, req.file.originalname, parsedCropData);

        // Save metadata to database
        const imageRecord = await saveImageMetadata(
            personId,
            fileInfo,
            req.file.originalname,
            parsedCropData
        );

        res.json({
            success: true,
            message: 'Image uploaded and processed successfully',
            data: {
                imageId: imageRecord.id,
                urls: {
                    large: `/api/images/serve/${fileInfo.large.filename}`,
                    medium: `/api/images/serve/${fileInfo.medium.filename}`,
                    thumbnail: `/api/images/serve/${fileInfo.thumbnail.filename}`
                },
                metadata: fileInfo.originalMetadata
            }
        });

    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Serve images
router.get('/serve/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(UPLOAD_DIR, filename);

        // Check if file exists
        await fs.access(filePath);

        // Set appropriate headers
        res.set({
            'Cache-Control': 'public, max-age=31536000', // 1 year
            'Content-Type': 'image/jpeg'
        });

        res.sendFile(filePath);

    } catch (error) {
        console.error('Error serving image:', error);
        res.status(404).json({
            success: false,
            message: 'Image not found'
        });
    }
});

// Get images for a person
router.get('/person/:personId', async (req, res) => {
    try {
        const { personId } = req.params;

        const query = `
            SELECT * FROM network.images 
            WHERE person_id = $1 AND is_active = true 
            ORDER BY created_at DESC
        `;

        const result = await pool.query(query, [personId]);

        const images = result.rows.map(img => ({
            ...img,
            url: `/api/images/serve/${img.filename}`,
            crop_data: img.crop_data ? JSON.parse(img.crop_data) : null
        }));

        res.json({
            success: true,
            data: images
        });

    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch images'
        });
    }
});

// Delete image
router.delete('/:imageId', async (req, res) => {
    try {
        const { imageId } = req.params;

        // Get image info first
        const imageQuery = 'SELECT * FROM network.images WHERE id = $1';
        const imageResult = await pool.query(imageQuery, [imageId]);

        if (imageResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        const image = imageResult.rows[0];

        // Mark as inactive in database
        await pool.query(
            'UPDATE network.images SET is_active = false WHERE id = $1',
            [imageId]
        );

        // Try to delete physical files (don't fail if files don't exist)
        try {
            const baseFilename = image.filename.replace(/-(large|medium|thumb)/, '');
            const variants = [
                image.filename,
                baseFilename.replace(/\.(jpg|jpeg|png|webp)$/, '-medium.$1'),
                baseFilename.replace(/\.(jpg|jpeg|png|webp)$/, '-thumb.$1')
            ];

            for (const variant of variants) {
                try {
                    await fs.unlink(path.join(UPLOAD_DIR, variant));
                } catch (unlinkError) {
                    // File might not exist, continue
                }
            }
        } catch (fileError) {
            console.warn('Error deleting image files:', fileError);
        }

        res.json({
            success: true,
            message: 'Image deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete image'
        });
    }
});

// Get image metadata
router.get('/metadata/:imageId', async (req, res) => {
    try {
        const { imageId } = req.params;

        const query = 'SELECT * FROM network.images WHERE id = $1 AND is_active = true';
        const result = await pool.query(query, [imageId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        const image = result.rows[0];

        res.json({
            success: true,
            data: {
                ...image,
                url: `/api/images/serve/${image.filename}`,
                crop_data: image.crop_data ? JSON.parse(image.crop_data) : null
            }
        });

    } catch (error) {
        console.error('Error fetching image metadata:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch image metadata'
        });
    }
});

module.exports = router;