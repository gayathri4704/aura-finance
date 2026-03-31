const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
// GAYATHRI: Security Packages ulla kondu varom
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
});

// Secret Key for Login Token
const JWT_SECRET = process.env.JWT_SECRET || "aura_finance_super_secret_key";

app.get('/', (req, res) => {
  res.send('Aura Finance Secure Server is Running! 🚀');
});

// ==========================================
// 🔐 AUTHENTICATION APIs (NEW)
// ==========================================

// 1. REGISTER (Sign Up)
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Email already irukka nu check panrom
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists! Please Login." });
    }

    // Password Encryption (Hashing)
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);

    // Save User in DB
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, encryptedPassword]
    );

    res.json({ message: "Account created successfully!", user: newUser.rows[0] });
  } catch (err) {
    console.error("Register Error:", err.message);
    res.status(500).json({ error: "Server error during registration." });
  }
});

// 2. LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Check if user exists
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: "Account not found. Please Register!" });
    }

    // Compare original password with encrypted password in DB
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: "Incorrect Password!" });
    }

    // Generate Token (Entry Pass)
    const token = jwt.sign({ id: user.rows[0].id }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ 
      message: "Login Successful!", 
      token, 
      user: { id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email } 
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ error: "Server error during login." });
  }
});


// ==========================================
// 💰 EXPENSES APIs (UPDATED)
// ==========================================

// GET ALL (Filter by logged-in user)
app.get('/api/expenses', async (req, res) => {
  const { user_id } = req.query; // Puthusa add pannirukkom
  try {
    let query = 'SELECT * FROM expenses ORDER BY date DESC';
    let params = [];
    
    // User ID irundha, avanga data mattum anuppu
    if (user_id) {
      query = 'SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC';
      params = [user_id];
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  const { user_id, amount, category, description, type } = req.body;
  try {
    const newExpense = await pool.query(
      'INSERT INTO expenses (user_id, amount, category, description, type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, amount, category, description, type]
    );
    res.json(newExpense.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  const { amount, category, type } = req.body;
  try {
    const updateExpense = await pool.query(
      'UPDATE expenses SET amount = $1, category = $2, type = $3 WHERE id = $4 RETURNING *',
      [amount, category, type, id]
    );
    res.json({ message: "Updated successfully!", data: updateExpense.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
    res.json({ message: "Expense deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});