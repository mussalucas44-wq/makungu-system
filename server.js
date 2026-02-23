require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS – allow your frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5500',
  credentials: true
}));
app.use(bodyParser.json());

// ---------- User data (simple JSON file) ----------
const USERS_FILE = './users.json';

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE));
  } catch (err) {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ---------- In‑memory store for reset codes ----------
const resetCodes = {}; // { email: { code, expires } }

// ---------- Email transporter ----------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ---------- API Endpoints ----------

// 1. Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } else {
    res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
});

// 2. Request password reset (send code)
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  const users = readUsers();
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Email not found' });
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
  resetCodes[email] = { code, expires };

  // Send email
  const mailOptions = {
    from: `"Makungu Group" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Code',
    text: `Your password reset code is: ${code}\nThis code expires in 15 minutes.`,
    html: `<p>Your password reset code is: <strong>${code}</strong></p><p>This code expires in 15 minutes.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Code sent' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
});

// 3. Verify code and reset password
app.post('/api/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  const record = resetCodes[email];
  if (!record || record.code !== code || Date.now() > record.expires) {
    return res.status(400).json({ success: false, message: 'Invalid or expired code' });
  }

  const users = readUsers();
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  user.password = newPassword;
  writeUsers(users);

  delete resetCodes[email];
  res.json({ success: true, message: 'Password updated' });
});

// 4. (Admin only) Add new user
app.post('/api/users', (req, res) => {
  const { email, username, password, role, adminEmail } = req.body;
  const users = readUsers();
  const admin = users.find(u => u.email === adminEmail && u.role === 'admin');
  if (!admin) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'Email already exists' });
  }
  const newUser = {
    id: 'u' + Date.now() + Math.random().toString(36).substr(2, 5),
    email,
    username,
    password,
    role,
  };
  users.push(newUser);
  writeUsers(users);
  const { password: _, ...safeUser } = newUser;
  res.json({ success: true, user: safeUser });
});

// 5. (Admin only) Delete user
app.delete('/api/users/:email', (req, res) => {
  const { email } = req.params;
  const { adminEmail } = req.body;
  const users = readUsers();
  const admin = users.find(u => u.email === adminEmail && u.role === 'admin');
  if (!admin) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  if (email === adminEmail) {
    return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
  }
  const index = users.findIndex(u => u.email === email);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  users.splice(index, 1);
  writeUsers(users);
  res.json({ success: true });
});

// 6. Get all users (admin only)
app.get('/api/users', (req, res) => {
  const { adminEmail } = req.query;
  const users = readUsers();
  const admin = users.find(u => u.email === adminEmail && u.role === 'admin');
  if (!admin) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  const safeUsers = users.map(({ password, ...u }) => u);
  res.json(safeUsers);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
