require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}).promise();


// --- Nodemailer Setup ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


// --- API ROUTES ---

// Middleware to verify any valid token (user or admin)
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ message: "A token is required for authentication." });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid Token." });
    }
};

// Get all policies
app.get('/api/policies', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM policies');
        const policies = rows.map(policy => {
            if (policy.rateTable && typeof policy.rateTable === 'string') {
                policy.rateTable = JSON.parse(policy.rateTable);
            }
            return policy;
        });
        res.json(policies);
    } catch (error) {
        res.status(500).json({ message: "Error fetching policies." });
    }
});

// Register a new user
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required." });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
        res.status(201).json({ message: "User registered successfully! You can now log in." });
    } catch (error) {
        res.status(500).json({ message: "Username or email may already be in use." });
    }
});

// Login for both users and admins
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ message: "Invalid username or password." });
        }
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid username or password." });
        }
        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: "Login successful!", token, role: user.role });
    } catch (error) {
        res.status(500).json({ message: "Server error during login." });
    }
});

// Get the logged-in user's profile information
app.get('/api/user/profile', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, username, email, role FROM users WHERE id = ?', [req.user.userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});



// NEW: Request Password Reset Link
// ==========================================================
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            // SECURITY: Don't reveal if the user exists.
            return res.json({ message: "If a user with that email exists, a reset link has been sent." });
        }
        const user = rows[0];

        // Create a short-lived reset token
        const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const resetLink = `http://localhost:3000/reset-password.html?token=${resetToken}`;

        // Send the email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Your LIC Portal Password Reset Link',
            html: `<p>Hello ${user.username},</p>
                   <p>Please click the link below to reset your password. This link is valid for 15 minutes.</p>
                   <a href="${resetLink}">Reset Password</a>`
        });

        res.json({ message: "If a user with that email exists, a reset link has been sent." });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: "An error occurred." });
    }
});

// ==========================================================
// NEW: Handle the Actual Password Reset
// ==========================================================
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ message: "All fields are required." });
    }
    try {
        // Verify the short-lived token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Hash the new password and update the database
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        res.json({ message: "Password has been reset successfully! You can now log in." });

    } catch (error) {
        // This will catch expired or invalid tokens
        res.status(401).json({ message: "Invalid or expired reset link. Please try again." });
    }
});





// --- ADMIN ONLY ROUTES ---
const verifyAdmin = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ message: "A token is required." });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(401).json({ message: "Unauthorized: Admins only." });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid Token." });
    }
};

// POLICY CRUD
app.post('/api/policies', verifyAdmin, async (req, res) => {
    const { name, minAge, maxAge, description, rateTable, bonus } = req.body;
    if (!name || !minAge || !maxAge) {
        return res.status(400).json({ message: "Name, Min Age, and Max Age are required." });
    }
    try {
        const rateTableJson = rateTable ? JSON.stringify(rateTable) : null;
        await db.query(
            'INSERT INTO policies (name, minAge, maxAge, description, rateTable, bonus) VALUES (?, ?, ?, ?, ?, ?)',
            [name, minAge, maxAge, description, rateTableJson, bonus]
        );
        res.status(201).json({ message: 'Policy added successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error adding policy.', error: error.message });
    }
});

app.put('/api/policies/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, minAge, maxAge, description, rateTable, bonus } = req.body;
    try {
        const rateTableJson = rateTable ? JSON.stringify(rateTable) : null;
        const [result] = await db.query(
            'UPDATE policies SET name=?, minAge=?, maxAge=?, description=?, rateTable=?, bonus=? WHERE id=?',
            [name, minAge, maxAge, description, rateTableJson, bonus, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Policy not found.' });
        }
        res.json({ message: 'Policy updated successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating policy.', error: error.message });
    }
});

app.delete('/api/policies/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM policies WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Policy not found.' });
        }
        res.json({ message: 'Policy deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting policy.', error: error.message });
    }
});

// ADMIN CRUD
app.post('/api/add-admin', verifyAdmin, async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', [username, email, hashedPassword, 'admin']);
        res.status(201).json({ message: "New admin created successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Error creating new admin." });
    }
});

// THIS IS THE NEWLY ADDED ROUTE
app.get('/api/admins', verifyAdmin, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, username, email, created_at FROM users WHERE role = 'admin'");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admins.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running! Open your website at http://localhost:${PORT}`);
});