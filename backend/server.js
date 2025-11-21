const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const cron = require('node-cron');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
 
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "barangay_ease",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+08:00", // Set connection timezone to Philippine Time (UTC+8)
});

// --- Multer Setup for File Uploads ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Create a unique filename to prevent overwrites
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Define which fields will contain files. This should match the frontend form.
const certificateUploadFields = [
  { name: 'frontIdImage', maxCount: 1 }, { name: 'backIdImage', maxCount: 1 },
  { name: 'govIdFront', maxCount: 1 }, { name: 'govIdBack', maxCount: 1 },
  { name: 'utilityBill', maxCount: 1 }, { name: 'indigencyFront', maxCount: 1 },
  { name: 'indigencyBack', maxCount: 1 }, { name: 'goodMoralGovIdFront', maxCount: 1 },
  { name: 'goodMoralGovIdBack', maxCount: 1 }, { name: 'proofOfResidency', maxCount: 1 },
  { name: 'communityTaxCert', maxCount: 1 }
];

// Nodemailer transporter setup (replace with your email service credentials)
// IMPORTANT: For Gmail, you must generate an "App Password" if you have 2FA enabled.
// Store these in environment variables in a real application.
const transporter = nodemailer.createTransport({
  service: 'gmail', // e.g., 'gmail', 'yahoo'
  auth: {
    user: process.env.EMAIL_USER, // Your email address from .env file
    pass: process.env.EMAIL_PASS     // Your app password from .env file
  }
});

// Scheduled task to delete unverified users after 24 hours
// This runs at the top of every hour.
cron.schedule('0 * * * *', async () => { // This will now run based on the server's local time.
  console.log('Running scheduled job: Deleting expired unverified users...');
  try {
    const [result] = await db.promise().query(
      "DELETE FROM users WHERE verified = 0 AND verification_expires < NOW()"
    );
    if (result.affectedRows > 0) {
      console.log(`Successfully deleted ${result.affectedRows} expired unverified user(s).`);
    } else {
      console.log('No expired unverified users to delete.');
    }
  } catch (err) {
    console.error('Error during scheduled deletion of unverified users:', err);
  }
});


// --- NEW: Scheduled task to delete finished events ---
// This runs every hour to check for old events.
cron.schedule('0 * * * *', async () => {
  console.log('Running scheduled job: Deleting old finished events...');
  try {
    // This query deletes events where the current time is 5 hours past their end time.
    const [result] = await db.promise().query(
      `DELETE FROM events WHERE NOW() > DATE_ADD(CAST(CONCAT(event_date, ' ', end_time) AS DATETIME), INTERVAL 5 HOUR)`
    );

    if (result.affectedRows > 0) {
      console.log(`Successfully deleted ${result.affectedRows} old event(s).`);
    } else {
      console.log('No old events to delete.');
    }
  } catch (err) {
    console.error('Error during scheduled deletion of old events:', err);
  }
});

// Register endpoint
app.post("/register", async (req, res) => {
  const { firstName, middleName, lastName, dob, gender, email, username, password, barangay } = req.body;

  try {
    // Check if username or email already exists
    const [existingUsers] = await db.promise().query(
      "SELECT username, email FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUsers.length > 0) {
      const isEmailTaken = existingUsers.some(user => user.email === email);
      const isUsernameTaken = existingUsers.some(user => user.username === username);
      if (isEmailTaken) return res.status(400).json({ message: "This email address is already registered." });
      if (isUsernameTaken) return res.status(400).json({ message: "This username is already taken." });
    }

    // Find the barangay ID from the barangay name
    const [barangayRows] = await db.promise().query(
      "SELECT id FROM barangays WHERE name = ?",
      [barangay]
    );

    if (barangayRows.length === 0) {
      return res.status(400).json({ message: "Invalid barangay selected" });
    }
    const barangayId = barangayRows[0].id;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 3600000); // 24 hours

    // Insert user into database
    const [result] = await db.promise().query(
      `INSERT INTO users 
       (firstName, middleName, lastName, dob, gender, email, username, password, role, status, verified, barangay_id, verification_token, verification_expires) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'resident', 'active', 0, ?, ?, ?)`,
      [firstName, middleName, lastName, dob, gender, email, username, hashedPassword, barangayId, verificationToken, verificationExpires]
    );

    // Send verification email
    const verificationLink = `http://localhost:5175/verify-email/${verificationToken}`;
    const mailOptions = {
      from: `"${process.env.EMAIL_SENDER_NAME || 'EaseBarangay Support'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your EaseBarangay Account',
      html: `
        <p>Hello ${username},</p>
        <p>Thank you for registering. Please click the link below to verify your account:</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>
        <p>This link will expire in 24 hours.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "User registered successfully", userId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to report a comment
app.post("/api/comments/report", async (req, res) => {
  const { reporterId, commentId, commentText, commentAuthor, postId, reason } = req.body;

  if (!reporterId || !commentId || !reason) {
    return res.status(400).json({ message: "Missing required report details." });
  }

  try {
    const [reporter] = await db.promise().query("SELECT role, barangay_id FROM users WHERE id = ?", [reporterId]);

    if (reporter.length === 0) {
      return res.status(404).json({ message: "Reporter not found." });
    }

    const reporterRole = reporter[0].role;
    const targetRole = reporterRole === 'moderator' ? 'admin' : 'moderator';
    const barangayId = reporter[0].barangay_id;

    const reportDetails = {
      commentId,
      commentText,
      commentAuthor,
      postId,
      reason,
    };

    // Insert into a new table 'comment_reports'
    await db.promise().query(
      `INSERT INTO comment_reports (reporter_id, reporter_role, target_role, barangay_id, details) 
       VALUES (?, ?, ?, ?, ?)`,
      [reporterId, reporterRole, targetRole, barangayId, JSON.stringify(reportDetails)]
    );

    res.status(201).json({ message: "Comment reported successfully." });
  } catch (err) {
    console.error("Failed to report comment:", err);
    res.status(500).json({ message: "Server error while reporting comment." });
  }
});

// --- Comments Endpoints ---

// Endpoint to get comments for a specific announcement (post)
app.get("/api/announcements/:postId/comments", async (req, res) => {
  const { postId } = req.params;
  try {
    const [comments] = await db.promise().query(
      `SELECT c.id, c.text, c.created_at AS date, u.id AS authorId, u.username AS author, u.avatar AS authorAvatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.announcement_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );
    res.json(comments);
  } catch (err) {
    console.error("Failed to fetch comments:", err);
    res.status(500).json({ message: "Server error while fetching comments." });
  }
});

// Endpoint to add a comment to an announcement
app.post("/api/announcements/:postId/comments", async (req, res) => {
  const { postId } = req.params;
  const { userId, text } = req.body;

  if (!userId || !text) {
    return res.status(400).json({ message: "User ID and comment text are required." });
  }

  try {
    const [result] = await db.promise().query(
      "INSERT INTO comments (announcement_id, user_id, text) VALUES (?, ?, ?)",
      [postId, userId, text]
    );

    // Fetch the newly created comment to return it with author details
    const [newComment] = await db.promise().query(
      `SELECT c.id, c.text, c.created_at AS date, u.id AS authorId, u.username AS author, u.avatar AS authorAvatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newComment[0]);
  } catch (err) {
    console.error("Failed to add comment:", err);
    res.status(500).json({ message: "Server error while adding comment." });
  }
});

// Endpoint to edit a comment
app.put("/api/comments/:commentId", async (req, res) => {
  const { commentId } = req.params;
  const { text, userId } = req.body; // userId for authorization

  try {
    // Optional: Check if the user is the author of the comment before updating
    const [comments] = await db.promise().query("SELECT user_id FROM comments WHERE id = ?", [commentId]);
    if (comments.length === 0 || comments[0].user_id !== userId) {
      return res.status(403).json({ message: "You are not authorized to edit this comment." });
    }

    await db.promise().query("UPDATE comments SET text = ? WHERE id = ?", [text, commentId]);
    res.json({ message: "Comment updated successfully." });
  } catch (err) {
    console.error("Failed to edit comment:", err);
    res.status(500).json({ message: "Server error while editing comment." });
  }
});

// Endpoint to delete a comment
app.delete("/api/comments/:commentId", async (req, res) => {
  const { commentId } = req.params;
  // In a real app, you'd also pass userId to authorize this action
  try {
    await db.promise().query("DELETE FROM comments WHERE id = ?", [commentId]);
    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete comment:", err);
    res.status(500).json({ message: "Server error while deleting comment." });
  }
});

// Endpoint to resend a verification email
app.post("/api/resend-verification", async (req, res) => {
  const { email: identifier } = req.body; // The input could be an email or a username
  if (!identifier) {
    return res.status(400).json({ message: "Email or username is required." });
  }

  try {
    const [users] = await db.promise().query(
      "SELECT * FROM users WHERE (email = ? OR username = ?) AND verified = 0",
      [identifier, identifier]
    );

    if (users.length === 0) {
      // For security, don't reveal if the email exists or is already verified.
      return res.json({ message: "If a matching unverified account exists, a new verification email has been sent." });
    }

    const user = users[0];

    // Reuse the existing token and expiration logic from the registration endpoint
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 3600000); // 24 hours

    await db.promise().query(
      "UPDATE users SET verification_token = ?, verification_expires = ? WHERE id = ?",
      [verificationToken, verificationExpires, user.id]
    );

    const verificationLink = `http://localhost:5175/verify-email/${verificationToken}`;
    const mailOptions = {
      from: `"${process.env.EMAIL_SENDER_NAME || 'EaseBarangay Support'}" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Resend: Verify Your EaseBarangay Account',
      html: `<p>Hello ${user.username},</p><p>Please click the link to verify your account: <a href="${verificationLink}">${verificationLink}</a></p>`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "A new verification email has been sent." });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({ message: "Error resending verification email." });
  }
});
// Login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find user by username or email
    const [users] = await db
      .promise()
      .query(
        `SELECT 
          u.id, u.firstName, u.lastName, u.username, u.email, u.password, u.role, u.status, u.verified, u.avatar, u.dob, u.created_at, u.barangay_id,
          b.name as barangay, m.name as municipality
         FROM users u
         LEFT JOIN barangays b ON u.barangay_id = b.id
         LEFT JOIN municipalities m ON b.municipality_id = m.id
         WHERE u.username = ? OR u.email = ?`,
      [username, username]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    // Check if account is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({ message: "Your account has been suspended. Please contact an administrator." });
    }

    // Check if account is verified
    if (user.verified === 0) {
      return res.status(403).json({ message: "Please verify your email address before logging in." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Login successful, send back user profile data (excluding password)
    delete user.password;
    res.json({ message: "Login successful", userProfile: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to get all municipalities
app.get("/api/municipalities", async (req, res) => {
  try {
    const [municipalities] = await db.promise().query("SELECT id, name FROM municipalities ORDER BY name");
    res.json(municipalities);
  } catch (err) {
    console.error("Failed to fetch municipalities:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to get barangays for a specific municipality
app.get("/api/barangays/:municipalityId", async (req, res) => {
  const { municipalityId } = req.params;
  try {
    const [barangays] = await db.promise().query(
      "SELECT id, name, captain_name FROM barangays WHERE municipality_id = ? ORDER BY name",
      [municipalityId]
    );
    res.json(barangays);
  } catch (err) {
    console.error("Failed to fetch barangays:", err);
    res.status(500).json({ message: "Server error" });
  }
});
// Endpoint to update a barangay's captain name
app.put("/api/barangays/:id/captain", async (req, res) => {
  const { id } = req.params;
  const { captainName } = req.body;

  try {
    await db.promise().query(
      "UPDATE barangays SET captain_name = ? WHERE id = ?",
      [captainName, id]
    );
    res.json({ message: "Barangay captain updated successfully." });
  } catch (err) {
    console.error("Failed to update barangay captain:", err);
    res.status(500).json({ message: "Server error" });
  }
});
// Endpoint to get all users
app.get("/api/users", async (req, res) => {
  try {
    const [users] = await db.promise().query(`
      SELECT u.id, u.username, u.email, u.role, u.status, u.verified, u.created_at, 
             b.name as barangay, m.name as municipality
      FROM users u 
      LEFT JOIN barangays b ON u.barangay_id = b.id
      LEFT JOIN municipalities m ON b.municipality_id = m.id
      ORDER BY u.created_at DESC`);
    res.json(users);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to update a user's status
app.put("/api/users/:userId/status", async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    await db.promise().query("UPDATE users SET status = ? WHERE id = ?", [status, userId]);
    res.json({ message: "User status updated successfully" });
  } catch (err) {
    console.error("Failed to update user status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to update a user's role
app.put("/api/users/:userId/role", async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!['resident', 'moderator', 'admin'].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    await db.promise().query("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
    res.json({ message: "User role updated successfully" });
  } catch (err) {
    console.error("Failed to update user role:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to create a moderator
app.post("/api/moderator", async (req, res) => {
  const { username, email, password, barangay } = req.body;



  try {
    // Check if username or email already exists
    const [existing] = await db.promise().query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Username or email already exists" });
    }

    // Find the barangay ID from the barangay name
    const [barangayRows] = await db.promise().query("SELECT id FROM barangays WHERE name = ?", [barangay]);
    if (barangayRows.length === 0) {
      return res.status(400).json({ message: "Invalid barangay selected" });
    }
    const barangayId = barangayRows[0].id;

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.promise().query(
      `INSERT INTO users (username, email, password, role, status, verified, barangay_id)
       VALUES (?, ?, ?, 'moderator', 'active', 1, ?)`,
      [username, email, hashedPassword, barangayId]
    );

    res.status(201).json({ message: "Moderator created successfully", userId: result.insertId });
  } catch (err) {
    console.error("Failed to create moderator:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to update user avatar
app.put("/api/users/:userId/avatar", upload.single('avatar'), async (req, res) => {
  const { userId } = req.params;
   // If a file is uploaded, req.file will be populated by multer.
  // If the request is to remove the avatar, req.body.avatar will be 'null'.
  const avatarPath = req.file ? `/uploads/${req.file.filename}` : (req.body.avatar === 'null' ? null : undefined);

  // If avatarPath is undefined, it means neither a file was uploaded nor was a removal requested.
  if (avatarPath === undefined) {
    return res.status(400).json({ message: "No avatar file provided or removal action specified." });
  }

  try {
    // TODO: Add logic here to delete the old avatar file from the 'uploads' directory if it exists.
    await db.promise().query("UPDATE users SET avatar = ? WHERE id = ?", [avatarPath, userId]);
    res.json({ message: "Avatar updated successfully", avatar: avatarPath });
  } catch (err) {
    console.error("Failed to update avatar:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint for an admin to reset a user's password
app.put("/api/admin/users/:userId/reset-password", async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ message: "A new password is required." });
  }

  try {
    // Hash the new password and update it in the database
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.promise().query("UPDATE users SET password = ? WHERE id = ?", [hashedNewPassword, userId]);

    res.json({ message: "User password reset successfully." });
  } catch (err) {
    console.error("Failed to reset user password:", err);
    res.status(500).json({ message: "Server error while resetting password." });
  }
});
// Endpoint to change a user's password
app.put("/api/users/:userId/password", async (req, res) => {
  const { userId } = req.params;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new passwords are required." });
  }

  try {
    // 1. Fetch the user's current hashed password
    const [users] = await db.promise().query("SELECT password FROM users WHERE id = ?", [userId]);

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = users[0];

    // 2. Compare the provided current password with the stored hash
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect current password." });
    }

    // 3. Hash the new password and update it in the database
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.promise().query("UPDATE users SET password = ? WHERE id = ?", [hashedNewPassword, userId]);

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("Failed to change password:", err);
    res.status(500).json({ message: "Server error while changing password." });
  }
});

// Endpoint to handle email verification
app.get("/api/verify-email/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const [users] = await db.promise().query(
      "SELECT * FROM users WHERE verification_token = ? AND verification_expires > NOW()",
      [token]
    );

    if (users.length === 0) {
      // This handles cases where the token is invalid, expired, or already used (and thus nulled).
      // For security and UX, we send a generic failure message. The frontend will show the error UI.
      // If the token is not found, it's either invalid, expired, or already used.
      return res
        .status(400)
        .json({ message: "Your verification link is invalid or has expired." });
    }

    const user = users[0];

    await db.promise().query(
      "UPDATE users SET verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?",
      [user.id]
    );

    res.json({ message: "Your account has been successfully verified!" });
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).json({ message: "An error occurred during verification. Please try again later." });
  }
});
// Endpoint to handle "Forgot Password" request
app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const [users] = await db
      .promise()
      .query("SELECT * FROM users WHERE email = ?", [email]);

    if (users.length === 0) {
      // Return a specific error if the email is not found.
      return res.status(404).json({ message: "No account found with that email address." });
    }

    const user = users[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await db
      .promise()
      .query(
        "UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?",
        [token, expires, user.id]
      );

    const resetLink = `http://localhost:5175/reset-password/${token}`;
    const mailOptions = {
      from: `"${process.env.EMAIL_SENDER_NAME || 'EaseBarangay Support'}" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click the link to proceed: <a href="${resetLink}">${resetLink}</a></p>`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Password reset link sent." });
  } catch (err) {
    // Check if it's a Nodemailer error or a general server error
    if (err.code === 'EAUTH') {
      console.error("Forgot password SMTP error:", err);
      return res.status(500).json({ message: "Could not send email due to a server configuration issue." });
    }
    res.status(500).json({ message: "An internal server error occurred." });
  }
});

// Endpoint to handle the actual password reset
app.post("/api/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const [users] = await db
      .promise()
      .query(
        "SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()",
        [token]
      );

    if (users.length === 0) {
      return res.status(400).json({ message: "Password reset token is invalid or has expired." });
    }

    const user = users[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    await db
      .promise()
      .query("UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?", [hashedPassword, user.id]);

    res.json({ message: "Password has been reset successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Error resetting password." });
  }
});



// --- System Settings Endpoints ---

// Municipalities
app.post("/api/municipalities", async (req, res) => {
  const { name } = req.body;
  try {
    const [result] = await db.promise().query("INSERT INTO municipalities (name) VALUES (?)", [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    console.error("Failed to create municipality:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/municipalities/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Note: In a real-world scenario, you might want to prevent deletion if barangays are linked.
    // For simplicity, we'll allow it. The foreign key constraint will handle it if set to cascade.
    await db.promise().query("DELETE FROM municipalities WHERE id = ?", [id]);
    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete municipality:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Barangays
app.post("/api/barangays", async (req, res) => {
  const { name, municipality_id } = req.body;
  try {
    const [result] = await db.promise().query("INSERT INTO barangays (name, municipality_id) VALUES (?, ?)", [name, municipality_id]);
    res.status(201).json({ id: result.insertId, name, municipality_id });
  } catch (err) {
    console.error("Failed to create barangay:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/barangays/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.promise().query("DELETE FROM barangays WHERE id = ?", [id]);
    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete barangay:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Announcement Categories
app.get("/api/announcement-categories", async (req, res) => {
  try {
    const [categories] = await db.promise().query("SELECT * FROM announcement_categories ORDER BY name");
    res.json(categories);
  } catch (err) {
    console.error("Failed to fetch announcement categories:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/announcement-categories", async (req, res) => {
  const { name } = req.body;
  try {
    const [result] = await db.promise().query("INSERT INTO announcement_categories (name) VALUES (?)", [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    console.error("Failed to create announcement category:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/announcement-categories/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.promise().query("DELETE FROM announcement_categories WHERE id = ?", [id]);
    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete announcement category:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Report Categories (Assuming a similar table `report_categories`)
app.get("/api/report-categories", async (req, res) => {
  try {
    const [categories] = await db.promise().query("SELECT * FROM report_categories ORDER BY name");
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/report-categories", async (req, res) => {
  const { name } = req.body;
  try {
    const [result] = await db.promise().query("INSERT INTO report_categories (name) VALUES (?)", [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/report-categories/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.promise().query("DELETE FROM report_categories WHERE id = ?", [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// --- Announcements Endpoints ---

// Endpoint to get announcements for a specific barangay
app.get("/api/announcements/barangay/:barangayId", async (req, res) => {
  const { barangayId } = req.params;
  try {
    const [announcements] = await db.promise().query(
      `SELECT a.*, 
              u.username as author, 
              u.avatar as authorAvatar,
              (SELECT CONCAT('[', GROUP_CONCAT(JSON_QUOTE(ai.image_url)), ']') 
               FROM announcement_images ai 
               WHERE ai.announcement_id = a.id) as images,
              (SELECT CONCAT('[', IFNULL(GROUP_CONCAT(JSON_OBJECT(
                  'id', c.id, 
                  'text', c.text, 
                  'date', c.created_at, 
                  'authorId', cu.id, 
                  'author', cu.username, 
                  'authorAvatar', cu.avatar
              ) ORDER BY c.created_at ASC), ''), ']') 
               FROM comments c JOIN users cu ON c.user_id = cu.id WHERE c.announcement_id = a.id) as comments
       FROM announcements a
       JOIN users u ON a.user_id = u.id
       WHERE a.barangay_id = ? 
       ORDER BY a.created_at DESC`,
      [barangayId]
    );
    res.json(announcements);
  } catch (err) {
    console.error("Failed to fetch announcements:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to create an announcement
app.post("/api/announcements", upload.array('images', 10), async (req, res) => {
  const { userId, title, description, category } = req.body;

  if (!userId || !description) {
    return res.status(400).json({ message: "User ID and description are required." });
  }

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    // Get moderator's barangay_id
    const [userRows] = await connection.query("SELECT barangay_id FROM users WHERE id = ?", [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    const barangayId = userRows[0].barangay_id;

    // Insert the main announcement content, REMOVING the images column
    const [result] = await connection.query(
      `INSERT INTO announcements (user_id, barangay_id, title, description, category) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, barangayId, title, description, category]
    );
    const announcementId = result.insertId;

    // If there are images, insert them into the announcement_images table
    if (req.files && req.files.length > 0) {
      const imageValues = req.files.map(file => [
        announcementId, `/uploads/${file.filename}`
      ]);
      await connection.query(
        'INSERT INTO announcement_images (announcement_id, image_url) VALUES ?',
        [imageValues]
      );
    }

    await connection.commit();

    res.status(201).json({ message: "Announcement created successfully", announcementId: result.insertId });
  } catch (err) {
    await connection.rollback();
    console.error("Failed to create announcement:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
});
app.get("/api/announcements", async (req, res) => {
  try {
    const [announcements] = await db.promise().query(`
      SELECT 
        a.id AS announcement_id,
        a.title,
        a.description,
        a.category,
        a.created_at,
        u.firstName,
        u.lastName,
        b.name AS barangay_name
      FROM announcements a
      JOIN users u ON a.user_id = u.id
      JOIN barangays b ON a.barangay_id = b.id
      ORDER BY a.created_at DESC
    `);

    // Get all images for these announcements
    const [images] = await db.promise().query(`
      SELECT announcement_id, image_url 
      FROM announcement_images
    `);

    // Attach images to the corresponding announcement
    const announcementsWithImages = announcements.map(a => ({
      ...a,
      images: images
        .filter(img => img.announcement_id === a.announcement_id)
        .map(img => img.image_url)
    }));

    res.json(announcementsWithImages);
  } catch (err) {
    console.error("Error fetching announcements:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// Endpoint to delete an announcement
app.delete("/api/announcements/:announcementId", async (req, res) => {
    const { announcementId } = req.params;
    // Optional: Add a check to ensure the user deleting is the author or an admin
    try {
        const [result] = await db.promise().query("DELETE FROM announcements WHERE id = ?", [announcementId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Announcement not found." });
        }
        res.status(204).send();
    } catch (err) {
        console.error("Failed to delete announcement:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// Endpoint to create a certification request
app.post("/api/certificate_requests", upload.fields(certificateUploadFields), async (req, res) => {
  const {
    userId,
    certificateType,
    purpose,
    firstName,
    middleName,
    lastName,
    dob,
    civilStatus,
    lengthOfResidency,
  } = req.body;

  // Basic validation
  if (!userId || !certificateType || !purpose || !firstName || !lastName) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  
  // Helper to get file path or null
  const getPath = (fieldName) => {
    if (req.files && req.files[fieldName] && req.files[fieldName][0]) {
      return `/uploads/${req.files[fieldName][0].filename}`;
    }
    return null;
  };

  try {
    // 1. Find the user's location details from their user_id
    const [userRows] = await db.promise().query(
        `SELECT b.name as barangay, m.name as municipality, u.barangay_id 
         FROM users u
         JOIN barangays b ON u.barangay_id = b.id
         JOIN municipalities m ON b.municipality_id = m.id
         WHERE u.id = ?`,
        [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const { barangay, municipality, barangay_id } = userRows[0];

    // 2. Insert the request into the database
    const [result] = await db.promise().query(
      `INSERT INTO certificate_requests 
       (user_id, type, purpose, firstName, middleName, lastName, municipality, barangay, dob, civilStatus, lengthOfResidency, frontIdImage, backIdImage, govIdFront, govIdBack, utilityBill, indigencyFront, indigencyBack, goodMoralGovIdFront, goodMoralGovIdBack, proofOfResidency, communityTaxCert, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        certificateType,
        purpose,
        firstName,
        middleName,
        lastName,
        municipality,
        barangay,
        dob,
        civilStatus,
        lengthOfResidency,
        getPath('frontIdImage'), getPath('backIdImage'),
        getPath('govIdFront'), getPath('govIdBack'),
        getPath('utilityBill'),
        getPath('indigencyFront'), getPath('indigencyBack'),
        getPath('goodMoralGovIdFront'), getPath('goodMoralGovIdBack'),
        getPath('proofOfResidency'), getPath('communityTaxCert')
      ]
    );

    // --- Notify Moderator ---
    // Find all moderators for this barangay
    const [moderators] = await db.promise().query(
      "SELECT id FROM users WHERE role = 'moderator' AND barangay_id = ?",
      [barangay_id]
    );

    // Create a notification for each moderator
    if (moderators.length > 0) {
      const notificationMessage = `New Certificate Request for "${certificateType}" from ${firstName} ${lastName}.`;
      const notificationType = "new_cert_request";
      const referenceId = result.insertId;

      for (const mod of moderators) {
        await db.promise().query(
          "INSERT INTO notifications (user_id, type, message, reference_id) VALUES (?, ?, ?, ?)",
          [mod.id, notificationType, notificationMessage, referenceId]
        );
      }
    }
    // --- End Notify Moderator ---

    res.status(201).json({
      message: "Certification request submitted successfully",
      requestId: result.insertId,
    });
  } catch (err) {
    console.error("Failed to create certification request:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to get ALL certificate requests (for admin)
app.get("/api/certificate_requests", async (req, res) => {
  try {
    const [requests] = await db.promise().query(
      `SELECT * FROM certificate_requests ORDER BY created_at DESC`
    );
    res.json(requests);
  } catch (err) {
    console.error("Failed to fetch all certificate requests:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to get certificate requests for a specific moderator's barangay
app.get("/api/certificate_requests/moderator/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // 1. Find the moderator's barangay_id
    const [moderatorRows] = await db.promise().query(
        `SELECT b.name as barangay_name 
         FROM users u 
         JOIN barangays b ON u.barangay_id = b.id 
         WHERE u.id = ? AND u.role = 'moderator'`, 
        [userId]
    );

    if (moderatorRows.length === 0) {
      return res.status(404).json({ message: "Moderator not found or user is not a moderator." });
    }
    const barangayName = moderatorRows[0].barangay_name;

    // 2. Fetch all requests for that barangay
    const [requests] = await db.promise().query(
      `SELECT * FROM certificate_requests WHERE barangay = ? ORDER BY created_at DESC`,
      [barangayName]
    );

    res.json(requests);
  } catch (err) {
    console.error("Failed to fetch certificate requests for moderator:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to update a certificate request's status
app.put("/api/certificate_requests/:requestId/status", async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  // Basic validation
  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // Fetch the request details first, so we have them for any status update.
    const [requestRows] = await connection.query("SELECT user_id, type FROM certificate_requests WHERE id = ? FOR UPDATE", [requestId]);

    // If the status is 'Approved', create an inbox message for the resident
    if (status === 'Approved') {
      if (requestRows.length > 0) {
        const request = requestRows[0];
        const title = "Certificate Approved";
        const body = `Your request for a ${request.type} is ready.`;

        await connection.query(
          `INSERT INTO resident_inbox (user_id, type, title, body, reference_id) VALUES (?, ?, ?, ?, ?)`,
          [request.user_id, "approved_certificate", title, body, requestId]
        );
      }
    }

    // Update the status of the certificate request
    await connection.query("UPDATE certificate_requests SET status = ? WHERE id = ?", [status, requestId]);

    // --- Notify Resident of Status Update ---
    // This block will now work for both 'Approved' and 'Declined' statuses.
    if (requestRows.length > 0) {
      const request = requestRows[0];
      const notificationMessage = `Your request for a ${request.type} has been updated to "${status}".`;
      const notificationType = "cert_update";

      await connection.query(
        "INSERT INTO notifications (user_id, type, message, reference_id) VALUES (?, ?, ?, ?)",
        [request.user_id, notificationType, notificationMessage, requestId]
      );
    }

    await connection.commit();
    res.json({ message: "Certificate request status updated successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("Failed to update certificate request status:", err);
    res.status(500).json({ message: "Server error while updating status." });
  } finally {
    connection.release();
  }
});

// Endpoint to delete a certificate request
app.delete("/api/certificate_requests/:requestId", async (req, res) => {
  const { requestId } = req.params;

  try {
    const [result] = await db.promise().query("DELETE FROM certificate_requests WHERE id = ?", [requestId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json({ message: "Certificate request deleted successfully" });
  } catch (err) {
    console.error("Failed to delete certificate request:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to get inbox messages for a specific resident
app.get("/api/resident_inbox/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [messages] = await db.promise().query(
      `SELECT ri.*, cr.firstName, cr.lastName, cr.middleName, cr.municipality, cr.barangay, cr.purpose, cr.type as certificate_type, cr.dob, cr.civilStatus, cr.lengthOfResidency, b.captain_name
       FROM resident_inbox ri
       
       
       LEFT JOIN certificate_requests cr ON ri.reference_id = cr.id AND ri.type = 'approved_certificate'
       LEFT JOIN barangays b ON cr.barangay = b.name
       
       WHERE ri.user_id = ? ORDER BY ri.created_at DESC`,
      [userId]
    );
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch resident inbox:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to create a report and its media
app.post("/api/reports", upload.array('media', 10), async (req, res) => {
  // When using multer, text fields are in `req.body` and files are in `req.files`.
  const { userId, type, description, locationLat, locationLng, locationAddress } = req.body;

  if (!userId || !type || !description) {
    return res.status(400).json({ message: "Missing required fields: userId, type, or description." });
  }

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    // Insert into the main reports table
    const [result] = await connection.query(
      `INSERT INTO reports (user_id, type, description, location_lat, location_lng, location_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        type,
        description,
        locationLat,
        locationLng,
        locationAddress
      ]
    );
    const reportId = result.insertId;

    // If there are media files, insert them into the report_media table
    if (req.files && req.files.length > 0) {
      const mediaValues = req.files.map(file => [
        reportId,
        `/uploads/${file.filename}`, // Store the path from multer
        'image'
      ]);
      await connection.query(
        'INSERT INTO report_media (report_id, file_url, file_type) VALUES ?',
        [mediaValues]
      );
    }
    await connection.commit();

    // --- Notify Moderator ---
    // Get the user's barangay_id
    const [userRows] = await connection.query("SELECT barangay_id FROM users WHERE id = ?", [userId]);
    if (userRows.length > 0) {
      const { barangay_id } = userRows[0];
      // Find all moderators for this barangay
      const [moderators] = await connection.query(
        "SELECT id FROM users WHERE role = 'moderator' AND barangay_id = ?",
        [barangay_id]
      );

      // Create a notification for each moderator
      if (moderators.length > 0) {
        const notificationMessage = `A new report of type "${type}" has been submitted.`;
        const notificationType = "new_report";

        for (const mod of moderators) {
          await connection.query(
            "INSERT INTO notifications (user_id, type, message, reference_id) VALUES (?, ?, ?, ?)",
            [mod.id, notificationType, notificationMessage, reportId]
          );
        }
      }
    }
    res.status(201).json({
      message: "Report submitted successfully",
      reportId: reportId,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Failed to create report:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
});

// Endpoint for moderators to fetch reports in their barangay
app.get("/api/reports/moderator/:moderatorId", async (req, res) => {
  const { moderatorId } = req.params;
  try {
    // 1. Find the moderator's barangay_id
    const [moderatorRows] = await db.promise().query(
      "SELECT barangay_id FROM users WHERE id = ? AND role = 'moderator'",
      [moderatorId]
    );

    if (moderatorRows.length === 0) {
      return res.status(404).json({ message: "Moderator not found." });
    }
    const barangayId = moderatorRows[0].barangay_id;

    // 2. Fetch reports where the reporting user belongs to the moderator's barangay
    const [reports] = await db.promise().query(`
      SELECT r.*, CONCAT(u.firstName, ' ', u.lastName) as reporterName,
             (SELECT CONCAT('[', GROUP_CONCAT(JSON_QUOTE(rm.file_url)), ']') FROM report_media rm WHERE rm.report_id = r.id) as media
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE u.barangay_id = ? ORDER BY r.created_at DESC`, [barangayId]);
    res.json(reports);
  } catch (err) {
    console.error("Failed to fetch reports for moderator:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to get reports for a specific user
app.get("/api/reports/user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [reports] = await db.promise().query(`
      SELECT r.*, 
             (SELECT CONCAT('[', GROUP_CONCAT(JSON_QUOTE(file_url)), ']') FROM report_media WHERE report_id = r.id) as media
      FROM reports r
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [userId]);
    res.json(reports);
  } catch (err) {
    console.error("Failed to fetch user reports:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to get ALL reports (for admin)
app.get("/api/reports", async (req, res) => {
  try {
    const [reports] = await db.promise().query(`
      SELECT r.*, 
             (SELECT CONCAT('[', GROUP_CONCAT(JSON_QUOTE(file_url)), ']') FROM report_media WHERE report_id = r.id) as media,
             CONCAT(u.firstName, ' ', u.lastName) as reporterName,
             b.name as barangay,
             m.name as municipality
      FROM reports r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN barangays b ON u.barangay_id = b.id
      LEFT JOIN municipalities m ON b.municipality_id = m.id
      ORDER BY r.created_at DESC`);
    res.json(reports);
  } catch (err) {
    console.error("Failed to fetch all reports:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to get notifications for a specific user
app.get("/api/notifications/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [notifications] = await db.promise().query(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    res.json(notifications);
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to mark all notifications as read for a user
app.put("/api/notifications/mark-all-read/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    await db.promise().query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [userId]);
    res.json({ message: "All notifications marked as read." });
  } catch (err) {
    console.error("Failed to mark notifications as read:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to mark notifications as read based on their type
app.put("/api/notifications/mark-read-by-type/:userId", async (req, res) => {
  const { userId } = req.params;
  const { type, inverse = false } = req.body; // inverse flag to mark all *except* the type

  if (!type) {
    return res.status(400).json({ message: "Notification type is required." });
  }

  try {
    let query = "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND type = ?";
    if (inverse) {
      query = "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND type != ?";
    }
    
    await db.promise().query(query, [userId, type]);
    
    res.json({ message: `Notifications of type '${type}' marked as read.` });
  } catch (err) {
    console.error("Failed to mark notifications by type:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// Endpoint to delete a single notification
app.delete("/api/notifications/:notificationId", async (req, res) => {
  const { notificationId } = req.params;
  try {
    await db.promise().query("DELETE FROM notifications WHERE id = ?", [notificationId]);
    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete notification:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to clear all notifications for a user
app.delete("/api/notifications/clear-all/:userId", async (req, res) => {
    const { userId } = req.params;
    await db.promise().query("DELETE FROM notifications WHERE user_id = ?", [userId]);
    res.status(204).send();
});

// Endpoint to update a report's status
app.put("/api/reports/:reportId/status", async (req, res) => {
  const { reportId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  try {
    await db.promise().query("UPDATE reports SET status = ? WHERE id = ?", [status, reportId]);

    // Create a notification for the resident whose report was updated
    const [reportRows] = await db.promise().query("SELECT user_id, type FROM reports WHERE id = ?", [reportId]);
    if (reportRows.length > 0) {
        const report = reportRows[0];
        const message = `Your report regarding "${report.type}" has been updated to "${status}".`;
        await db.promise().query(
            `INSERT INTO notifications (user_id, type, message, reference_id) VALUES (?, ?, ?, ?)`,
            [report.user_id, 'report_update', message, reportId]
        );
    }

    res.json({ message: "Report status updated successfully" });
  } catch (err) {
    console.error("Failed to update report status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to delete a report
app.delete("/api/reports/:reportId", async (req, res) => {
  const { reportId } = req.params;
  try {
    // In a real app with separate media tables, you'd delete from report_media first.
    await db.promise().query("DELETE FROM reports WHERE id = ?", [reportId]);
    res.json({ message: "Report deleted successfully" });
  } catch (err) {
    console.error("Failed to delete report:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to mark an inbox message as read
app.put("/api/resident_inbox/:messageId/read", async (req, res) => {
  const { messageId } = req.params;
  try {
    await db.promise().query("UPDATE resident_inbox SET is_read = 1 WHERE id = ?", [messageId]);
    res.json({ message: "Message marked as read successfully" });
  } catch (err) {
    console.error("Failed to mark message as read:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Admin Mailbox Endpoints ---

// Get all dispute reports for admin
app.get("/api/dispute_reports", async (req, res) => {
  try {
    const [reports] = await db.promise().query(`
      SELECT dr.*, u.username as reporter_username 
      FROM dispute_reports dr
      JOIN users u ON dr.reporter_id = u.id
      ORDER BY dr.created_at DESC
    `);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching dispute reports." });
  }
});

// Create a dispute report
app.post("/api/dispute_reports", async (req, res) => {
  const { reporterId, reportedUserName, reason } = req.body;
  try {
    await db.promise().query(
      "INSERT INTO dispute_reports (reporter_id, reported_user_name, reason) VALUES (?, ?, ?)",
      [reporterId, reportedUserName, reason]
    );
    res.status(201).json({ message: "Dispute report submitted." });
  } catch (err) {
    res.status(500).json({ message: "Server error creating dispute report." });
  }
});

// Get all admin messages
app.get("/api/admin_messages", async (req, res) => {
  try {
    const [messages] = await db.promise().query(`
      SELECT am.*, u.username as sender_username 
      FROM admin_messages am
      JOIN users u ON am.sender_id = u.id
      ORDER BY am.created_at DESC
    `);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching admin messages." });
  }
});

// Create an admin message
app.post("/api/admin_messages", async (req, res) => {
  const { senderId, issueType, issueDescription } = req.body;
  try {
    await db.promise().query(
      "INSERT INTO admin_messages (sender_id, issue_type, issue_description) VALUES (?, ?, ?)",
      [senderId, issueType, issueDescription]
    );
    res.status(201).json({ message: "Message sent to admin." });
  } catch (err) {
    res.status(500).json({ message: "Server error sending message." });
  }
});

// Update dispute report status
app.put("/api/dispute_reports/:reportId/status", async (req, res) => {
  const { reportId } = req.params;
  const { status } = req.body;
  try {
    await db.promise().query("UPDATE dispute_reports SET status = ? WHERE id = ?", [status, reportId]);
    res.json({ message: "Dispute report status updated." });
  } catch (err) {
    res.status(500).json({ message: "Server error updating dispute report status." });
  }
});

// Update admin message status
app.put("/api/admin_messages/:messageId/status", async (req, res) => {
  const { messageId } = req.params;
  const { status } = req.body;
  try {
    await db.promise().query("UPDATE admin_messages SET status = ? WHERE id = ?", [status, messageId]);
    res.json({ message: "Admin message status updated." });
  } catch (err) {
    res.status(500).json({ message: "Server error updating admin message status." });
  }
});

// Endpoint to create a message in the moderator's inbox (for admin replies)
app.post("/api/moderator_inbox", async (req, res) => {
  const { userId, title, body, original_message } = req.body;
  if (!userId || !title || !body) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    await db.promise().query(
      "INSERT INTO moderator_inbox (user_id, type, title, body, original_message) VALUES (?, ?, ?, ?, ?)",
      [userId, "admin_reply", title, body, original_message || null]
    );
    res.status(201).json({ message: "Reply sent to moderator inbox." });
  } catch (err) {
    console.error("Failed to create moderator inbox message:", err);
    res.status(500).json({ message: "Server error creating moderator inbox message." });
  }
});

// Endpoint to delete all admin mailbox items
app.delete("/api/admin_mailbox/clear-all", async (req, res) => {
  try {
    await db.promise().query("DELETE FROM dispute_reports");
    await db.promise().query("DELETE FROM admin_messages");
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: "Server error clearing mailbox." });
  }
});
// Endpoint to get inbox messages for a specific moderator
app.get("/api/moderator_inbox/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [messages] = await db.promise().query(
      `SELECT * FROM moderator_inbox WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch moderator inbox:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint for residents to send a message to their barangay moderators
app.post("/api/contact-moderator", async (req, res) => {
  const { userId, subject, message } = req.body;

  if (!userId || !subject || !message) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get the resident's info (username and barangay_id)
    const [userRows] = await connection.query("SELECT username, barangay_id FROM users WHERE id = ?", [userId]);
    if (userRows.length === 0) {
      throw new Error("Resident not found.");
    }
    const { username: residentUsername, barangay_id } = userRows[0];

    // 2. Find all moderators for that barangay
    const [moderators] = await connection.query(
      "SELECT id FROM users WHERE role = 'moderator' AND barangay_id = ?",
      [barangay_id]
    );

    // 3. Create an inbox message for each moderator
    if (moderators.length > 0) {
      const messageTitle = `Inquiry from ${residentUsername}: ${subject}`;
      for (const mod of moderators) {
        await connection.query(
          "INSERT INTO moderator_inbox (user_id, type, title, body, from_user_id) VALUES (?, ?, ?, ?, ?)",
          [mod.id, 'resident_inquiry', messageTitle, message, userId]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ message: "Your message has been sent to the moderators." });
  } catch (err) {
    await connection.rollback();
    console.error("Failed to send message to moderator:", err);
    res.status(500).json({ message: "Server error while sending message." });
  } finally {
    connection.release();
  }
});
// NEW: Endpoint to update a moderator inbox message's status
app.put("/api/moderator_inbox/:messageId/status", async (req, res) => {
  const { messageId } = req.params;
  const { status } = req.body;
  try {
    await db.promise().query("UPDATE moderator_inbox SET status = ? WHERE id = ?", [status, messageId]);
    res.json({ message: "Message status updated successfully." });
  } catch (err) {
    console.error("Failed to update moderator inbox status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// NEW: Endpoint to mark a single moderator inbox message as read
app.put("/api/moderator_inbox/:messageId/read", async (req, res) => {
  const { messageId } = req.params;
  try {
    await db.promise().query("UPDATE moderator_inbox SET is_read = 1 WHERE id = ?", [messageId]);
    res.json({ message: "Message marked as read." });
  } catch (err) {
    console.error("Failed to mark moderator message as read:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// NEW: Endpoint to mark all moderator inbox messages as read
app.put("/api/moderator_inbox/mark-all-read/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    await db.promise().query("UPDATE moderator_inbox SET is_read = 1 WHERE user_id = ?", [userId]);
    res.json({ message: "All messages marked as read." });
  } catch (err) {
    console.error("Failed to mark all moderator messages as read:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// NEW: Endpoint to delete a single moderator inbox message
app.delete("/api/moderator_inbox/:messageId", async (req, res) => {
  const { messageId } = req.params;
  try {
    await db.promise().query("DELETE FROM moderator_inbox WHERE id = ?", [messageId]);
    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete moderator inbox message:", err);
    res.status(500).json({ message: "Server error" });
  }
});
// Endpoint for moderators to reply to a resident's inquiry
app.post("/api/reply-to-resident", async (req, res) => {
  const { moderatorId, residentId, originalMessage, replyText } = req.body;

  if (!moderatorId || !residentId || !originalMessage || !replyText) {
    return res.status(400).json({ message: "Missing required fields for reply." });
  }

  try {
    // Get moderator's name for the reply message
    const [moderatorRows] = await db.promise().query("SELECT username FROM users WHERE id = ?", [moderatorId]);
    if (moderatorRows.length === 0) {
      throw new Error("Moderator not found.");
    }
    const moderatorName = moderatorRows[0].username;

    // Insert the reply into the resident's inbox
    await db.promise().query(
      `INSERT INTO resident_inbox (user_id, type, title, body, original_message) VALUES (?, ?, ?, ?, ?)`,
      [residentId, 'moderator_reply', `Re: ${originalMessage.title}`, replyText, originalMessage.body]
    );

    res.status(201).json({ message: "Reply sent successfully." });
  } catch (err) {
    console.error("Failed to send reply to resident:", err);
    res.status(500).json({ message: "Server error while sending reply." });
  }
});
// --- Audit Log Endpoints ---

// Endpoint to get audit logs for a specific role
app.get("/api/audit_logs/:role", async (req, res) => {
  const { role } = req.params;
  const { userId } = req.query; // Get userId from query parameters

  let query = "SELECT * FROM audit_logs WHERE role = ? ORDER BY timestamp DESC";
  const params = [role];

  // If a userId is provided and the role is not admin, filter by user_id
  if (userId && role !== 'admin') {
    query = "SELECT * FROM audit_logs WHERE role = ? AND user_id = ? ORDER BY timestamp DESC";
    params.push(userId);
  }

  try {
    const [logs] = await db.promise().query(
      query,
      params
    );
    res.json(logs);
  } catch (err) {
    console.error(`Failed to fetch audit logs for role ${role}:`, err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to clear audit logs for a specific role
app.delete("/api/audit_logs/:role", async (req, res) => {
  const { role } = req.params;
  try {
    await db.promise().query("DELETE FROM audit_logs WHERE role = ?", [role]);
    res.status(204).send();
  } catch (err) {
    console.error(`Failed to clear audit logs for role ${role}:`, err);
    res.status(500).json({ message: "Server error" });
  }
});

// Endpoint to create a new audit log entry
app.post("/api/audit_logs", async (req, res) => {
  const { userId, username, role, action, details } = req.body;

  // Basic validation
  if (!username || !role || !action) {
    return res.status(400).json({ message: "Missing required audit log fields" });
  }

  try {
    await db.promise().query(
      "INSERT INTO audit_logs (user_id, username, role, action, details) VALUES (?, ?, ?, ?, ?)",
      [userId, username, role, action, JSON.stringify(details || {})]
    );
    res.status(201).json({ message: "Audit log created" });
  } catch (err) {
    console.error("Failed to write to audit log:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Events Endpoints ---

// Get events for a specific barangay
app.get("/api/events/barangay/:barangayId", async (req, res) => {
  const { barangayId } = req.params;
  try {
    const [events] = await db.promise().query(
      `SELECT id, user_id, barangay_id, title, description, 
              DATE_FORMAT(event_date, '%Y-%m-%d') as event_date, 
              start_time, end_time, created_at 
       FROM events WHERE barangay_id = ? ORDER BY event_date DESC, start_time DESC`,
      [barangayId]
    );
    res.json(events);
  } catch (err) {
    console.error("Failed to fetch events:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new event
app.post("/api/events", async (req, res) => {
  const { userId, title, description, event_date, start_time, end_time } = req.body;
  if (!userId || !title || !event_date) {
    return res.status(400).json({ message: "User ID, title, and date are required." });
  }

  try {
    const [userRows] = await db.promise().query("SELECT barangay_id FROM users WHERE id = ?", [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    const barangayId = userRows[0].barangay_id;

    const [result] = await db.promise().query(
      `INSERT INTO events (user_id, barangay_id, title, description, event_date, start_time, end_time) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, barangayId, title, description, event_date, start_time || null, end_time || null]
    );
    res.status(201).json({ message: "Event created successfully", eventId: result.insertId });
  } catch (err) {
    console.error("Failed to create event:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update an event
app.put("/api/events/:eventId", async (req, res) => {
  const { eventId } = req.params;
  const { title, description, event_date, start_time, end_time } = req.body;
  try {
    await db.promise().query(
      "UPDATE events SET title = ?, description = ?, event_date = ?, start_time = ?, end_time = ? WHERE id = ?",
      [title, description, event_date, start_time, end_time, eventId]
    );
    res.json({ message: "Event updated successfully" });
  } catch (err) {
    console.error("Failed to update event:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete an event
app.delete("/api/events/:eventId", async (req, res) => {
  const { eventId } = req.params;
  try {
    await db.promise().query("DELETE FROM events WHERE id = ?", [eventId]);
    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete event:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Broadcasts Endpoints ---

// Get all active broadcasts (for residents/moderators)
app.get("/api/broadcasts", async (req, res) => {
  try {
    const [broadcasts] = await db.promise().query(
      "SELECT * FROM broadcasts WHERE is_active = 1 ORDER BY created_at DESC"
    );
    res.json(broadcasts);
  } catch (err) {
    console.error("Failed to fetch all broadcasts:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get ALL broadcasts (for admin panel)
app.get("/api/broadcasts/all", async (req, res) => {
  try {
    const [broadcasts] = await db.promise().query(
      "SELECT * FROM broadcasts ORDER BY created_at DESC"
    );
    res.json(broadcasts);
  } catch (err) {
    console.error("Failed to fetch all broadcasts:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Toggle a broadcast's active status
app.put("/api/broadcasts/:id/toggle", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    await db.promise().query("UPDATE broadcasts SET is_active = ? WHERE id = ?", [isActive, id]);
    res.json({ message: "Broadcast status updated." });
  } catch (err) {
    res.status(500).json({ message: "Server error updating broadcast." });
  }
});

// Delete a broadcast
app.delete("/api/broadcasts/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.promise().query("DELETE FROM broadcasts WHERE id = ?", [id]);
    res.json({ message: "Broadcast deleted successfully." });
  } catch (err) {
    console.error("Failed to delete broadcast:", err);
    res.status(500).json({ message: "Server error deleting broadcast." });
  }
});

// Create a new broadcast
app.post("/api/broadcasts", async (req, res) => {
  const { message, type, userId } = req.body;
  if (!message || !type || !userId) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const [result] = await db.promise().query(
      "INSERT INTO broadcasts (message, type, created_by) VALUES (?, ?, ?)",
      [message, type, userId]
    );
    const newBroadcast = {
      id: result.insertId,
      message,
      type,
      created_by: userId,
      is_active: 1,
      created_at: new Date(),
    };
    res.status(201).json(newBroadcast);
  } catch (err) {
    console.error("Failed to create broadcast:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Moderator Performance Endpoint ---

app.get("/api/moderator-performance", async (req, res) => {
  try {
    const query = `
      SELECT
        u.id,
        u.username,
        u.avatar,
        b.name as barangay_name,
        (
          SELECT COUNT(*) 
          FROM announcements a 
          WHERE a.user_id = u.id
        ) as announcements_posted,
        (
          SELECT COUNT(*) 
          FROM events e 
          WHERE e.user_id = u.id
        ) as events_created,
        (
          SELECT COUNT(*) 
          FROM audit_logs al 
          WHERE al.user_id = u.id AND al.action = 'Updated Certificate Request Status'
        ) as certificates_processed,
        (
          SELECT COUNT(*) 
          FROM audit_logs al 
          WHERE al.user_id = u.id AND al.action = 'Updated Report Status'
        ) as reports_handled
      FROM users u
      LEFT JOIN barangays b ON u.barangay_id = b.id
      WHERE u.role = 'moderator'
      ORDER BY u.username;
    `;
    const [performanceData] = await db.promise().query(query);
    res.json(performanceData);
  } catch (err) {
    console.error("Failed to fetch moderator performance data:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Moderator Analytics Endpoint ---
app.get("/api/moderator/:moderatorId/analytics", async (req, res) => {
  const { moderatorId } = req.params;

  try {
    // 1. Get moderator's barangay_id
    const [moderatorRows] = await db.promise().query(
      "SELECT barangay_id FROM users WHERE id = ? AND role = 'moderator'",
      [moderatorId]
    );

    if (moderatorRows.length === 0) {
      return res.status(404).json({ message: "Moderator not found." });
    }
    const { barangay_id } = moderatorRows[0];

    // 2. Fetch all data in parallel
    const [
      [residents],
      [reports],
      [certificates],
      [announcements],
      [events]
    ] = await Promise.all([
      db.promise().query("SELECT id, username, status, created_at FROM users WHERE barangay_id = ? AND role = 'resident'", [barangay_id]),
      db.promise().query("SELECT id, status, created_at FROM reports WHERE user_id IN (SELECT id FROM users WHERE barangay_id = ?)", [barangay_id]),
      db.promise().query("SELECT id, status, created_at FROM certificate_requests WHERE barangay = (SELECT name FROM barangays WHERE id = ?)", [barangay_id]),
      db.promise().query("SELECT id, user_id, created_at FROM announcements WHERE barangay_id = ?", [barangay_id]),
      db.promise().query("SELECT id, user_id, created_at FROM events WHERE barangay_id = ?", [barangay_id])
    ]);

    res.json({
      residents,
      reports,
      certificates,
      announcements,
      events,
      myAnnouncementsCount: announcements.filter(a => a.user_id === parseInt(moderatorId, 10)).length,
      myEventsCount: events.filter(e => e.user_id === parseInt(moderatorId, 10)).length,
    });

  } catch (err) {
    console.error("Failed to fetch moderator analytics data:", err);
    res.status(500).json({ message: "Server error while fetching analytics data." });
  }
});

// --- Current Time Endpoint ---
// Provides the server's current time, which is configured to be PHT.
app.get("/api/time", (req, res) => {
  res.json({ currentTime: new Date() });
});


const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
