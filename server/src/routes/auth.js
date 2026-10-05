const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signMember, signAdmin, requireAuth, requireMember, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/register", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (typeof name !== "string" || typeof username !== "string" || typeof password !== "string" ||
      !name.trim() || !username.trim() || !password) {
      return res.status(400).json({ message: "Name, username and password are required." });
    }
    const normalized = username.trim();
    if (!/^\d{10}$/.test(normalized)) {
      return res.status(400).json({ message: "Username must be a 10-digit phone number." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must contain at least 6 characters." });
    }

    const exists = await User.findOne({ username: normalized });
    if (exists) return res.status(409).json({ message: "Username is already registered." });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      username: normalized,
      passwordHash
    });

    res.status(201).json({
      message: "Registration successful. Please login.",
      user: { id: user._id, name: user.name, username: user.username, status: user.status }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to register." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username?.trim().toLowerCase() });

    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
      return res.status(401).json({ message: "Incorrect username or password." });
    }

    res.json({
      token: signMember(user),
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        status: user.status
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to login." });
  }
});


router.get("/me", requireAuth, requireMember, async (req, res) => {
  const user = await User.findById(req.auth.id).select("_id name username status").lean();
  if (!user) return res.status(404).json({ message: "Member not found." });
  res.json({
    user: { id: user._id, name: user.name, username: user.username, status: user.status }
  });
});

router.post("/admin-login", (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return res.json({
      token: signAdmin(),
      user: { username: process.env.ADMIN_USERNAME, role: "admin" }
    });
  }
  return res.status(401).json({ message: "Invalid admin credentials." });
});

module.exports = router;
