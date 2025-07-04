// middleware/auth.js
const jwt = require('../utils/jwt');
const pool = require('../config/db');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    try {
        const decoded = jwt.verifyToken(token);
        const user = await pool.query('SELECT * FROM network.users WHERE id = $1', [decoded.id]);

        if (!user.rows.length) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        req.user = user.rows[0];
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = { authenticateToken };