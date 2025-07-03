const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('../utils/jwt');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        const user = result.rows[0];
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
}, async (token, refreshToken, profile, done) => {
    const { id, displayName, emails } = profile;

    try {
        let result = await pool.query('SELECT * FROM users WHERE google_id = $1', [id]);

        if (!result.rows.length) {
            // Register user if not exists
            result = await pool.query(
                'INSERT INTO users (google_id, email, name) VALUES ($1, $2, $3) RETURNING *',
                [id, emails[0].value, displayName]
            );
        }

        const user = result.rows[0];
        const token = jwt.signToken({ id: user.id });

        // Pass token back as part of the user object
        return done(null, { ...user, token });
    } catch (err) {
        return done(err, null);
    }
}));