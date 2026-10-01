const express = require("express");
const Notification = require("../models/Notification");
const DeviceToken = require("../models/DeviceToken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const query = req.auth.role === "admin"
    ? { audienceRole: "admin" }
    : { audienceRole: "member", recipientUser: req.auth.id };

  const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(100).lean();
  const unreadCount = await Notification.countDocuments({ ...query, readAt: null });
  res.json({ notifications, unreadCount });
});

router.patch("/:id/read", async (req, res) => {
  const query = req.auth.role === "admin"
    ? { _id: req.params.id, audienceRole: "admin" }
    : { _id: req.params.id, audienceRole: "member", recipientUser: req.auth.id };

  const notification = await Notification.findOneAndUpdate(query, { readAt: new Date() }, { new: true }).lean();
  if (!notification) return res.status(404).json({ message: "Notification not found." });
  res.json({ notification });
});

router.post("/push-token", async (req, res) => {
  const { token, platform } = req.body;
  if (!token) return res.status(400).json({ message: "Push token is required." });

  const role = req.auth.role === "admin" ? "admin" : "member";
  const user = role === "member" ? await User.findById(req.auth.id).select("_id") : null;

  await DeviceToken.findOneAndUpdate(
    { token },
    {
      token,
      role,
      user: user?._id || null,
      platform: platform || "unknown",
      lastSeenAt: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ message: "Push token registered." });
});

module.exports = router;
