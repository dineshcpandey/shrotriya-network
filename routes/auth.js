// routes/auth.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { login, register } = require('../controllers/authController');

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Redirect with token
        res.redirect(`http://localhost:3000?token=${req.user.token}`);
    }
);

router.post('/register', register);
router.post('/login', login);

module.exports = router;