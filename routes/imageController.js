// routes/search.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');



const router = express.Router();
const pool = require('../config/db');


const storage = multer.memoryStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });


router.post('/upload', upload.single('croppedImage'), (req, res) => {
    const { imageName } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }


    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!imageName) {
        return res.status(400).json({ message: 'Image name is required' });
    }

    // Sanitize image name (remove unsafe characters)
    const sanitizedFileName = imageName.replace(/[^a-z0-9_\-\.]/gi, '_');

    // Define full path
    const filePath = path.join(__dirname, 'uploads', sanitizedFileName);

    // Write buffer to file
    fs.writeFile(filePath, req.file.buffer, (err) => {
        if (err) {
            console.error('File write error:', err);
            return res.status(500).json({ message: 'Failed to save image' });
        }

        res.json({
            message: 'Image uploaded successfully!',
            filePath: `/uploads/${sanitizedFileName}`
        });
    });
});

module.exports = router;