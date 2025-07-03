// controllers/authController.js
const pool = require('../config/db');

const bcrypt = require('bcryptjs');
const jwt = require('../utils/jwt');

exports.register = async (req, res) => {
    const { email, password, name } = req.body;

    try {
        console.log("inside authController")
        const existing = await pool.query('SELECT * FROM network.users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ msg: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
            [email, hash, name]
        );

        const token = jwt.signToken({ id: result.rows[0].id });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    console.log("Authcontroller Login")
    const { email, password } = req.body;
    console.log("Email password ", email, "  ", password)
    try {
        //console.log("POOL: ", pool)
        console.log("POOL TYPE:", typeof pool);
        const result = await pool.query('SELECT * FROM network.users WHERE email =$1', [email]);
        console.log("Fount Result ", result)
        const user = result.rows[0];

        if (!user || !user.password_hash) {
            return res.status(400).json({ msg: "Invalid credentials" });
        }

        //const isMatch = await bcrypt.compare(password, user.password_hash);
        //if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });
        if (user.password_hash !== password) {
            return res.status(400).json({ msg: "Invalid credentials" });
        }

        const token = jwt.signToken({ id: user.id });
        res.json({ token });
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: err.message });
    }
};