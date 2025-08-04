// routes/auth.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { login, register } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');


router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Redirect with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}?token=${req.user.token}`);
    }
);

router.get('/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

router.post('/logout', authenticateToken, (req, res) => {
    // For JWT, logout is handled client-side
    // You could implement token blacklisting here
    res.json({ message: 'Logged out successfully' });
});

router.post('/register', register);
router.post('/login', login);

module.exports = router;