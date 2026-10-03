const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Post = require("../models/Post");
const User = require("../models/User");
const { requireAuth, requireMember } = require("../middleware/auth");
const { notifyAdmins, notifyMember, notifyVerifiedMembers } = require("../utils/notifications");

const router = express.Router();
const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed."));
  }
});

// Only approved posts are visible to members.
router.get("/", requireAuth, requireMember, async (req, res) => {
  const user = await User.findById(req.auth.id).lean();
  if (!user || user.status !== "verified") {
    return res.status(403).json({ message: "Your account must be verified before viewing posts." });
  }

  const posts = await Post.find({ status: "approved" })
    .populate("author", "name username")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json({ posts });
});

// A verified member submits a post. It stays pending until an admin approves it.
router.post("/", requireAuth, requireMember, upload.single("image"), async (req, res) => {
  try {
    const user = await User.findById(req.auth.id);
    if (!user || user.status !== "verified") {
      return res.status(403).json({ message: "Only verified members can create posts." });
    }

    const text = (req.body.text || "").trim();
    if (!text && !req.file) {
      return res.status(400).json({ message: "Add some text or an image." });
    }

    const base = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const imageUrl = req.file ? `${base}/uploads/${req.file.filename}` : "";

    const post = await Post.create({
      author: user._id,
      text,
      imageUrl,
      status: "pending"
    });

    await notifyAdmins({
      type: "post_submitted",
      title: "New post awaiting approval",
      body: `${user.name} submitted a new post for review.`,
      data: { postId: post._id.toString(), userId: user._id.toString() }
    });

    await notifyMember({
      userId: user._id,
      type: "post_submitted",
      title: "Post submitted",
      body: "Your post was sent to the admin for approval.",
      data: { postId: post._id.toString() }
    });

    const populated = await post.populate("author", "name username");
    res.status(201).json({
      message: "Post submitted for admin approval.",
      post: populated
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Unable to create post." });
  }
});

// Member can see their own pending/approved/rejected posts.
router.get("/mine", requireAuth, requireMember, async (req, res) => {
  const posts = await Post.find({ author: req.auth.id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ posts });
});

module.exports = router;
