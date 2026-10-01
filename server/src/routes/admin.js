const express = require("express");
const Application = require("../models/Application");
const User = require("../models/User");
const Post = require("../models/Post");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { notifyMember, notifyVerifiedMembers } = require("../utils/notifications");

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/notifications", async (_req, res) => {
  const Notification = require("../models/Notification");
  const notifications = await Notification.find({ audienceRole: "admin" })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const unreadCount = await Notification.countDocuments({ audienceRole: "admin", readAt: null });
  res.json({ notifications, unreadCount });
});

router.get("/members", async (_req, res) => {
  const users = await User.find({ role: "member" })
    .sort({ createdAt: -1 })
    .select("-passwordHash")
    .lean();

  const ids = users.map((u) => u._id);
  const applications = await Application.find({ user: { $in: ids } }).lean();
  const appMap = new Map(applications.map((a) => [a.user.toString(), a]));

  res.json({
    members: users.map((u) => ({
      ...u,
      application: appMap.get(u._id.toString()) || null
    }))
  });
});

router.get("/members/:id", async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: "member" })
    .select("-passwordHash")
    .lean();
  if (!user) return res.status(404).json({ message: "Member not found." });

  const application = await Application.findOne({ user: user._id }).lean();
  const posts = await Post.find({ author: user._id }).sort({ createdAt: -1 }).lean();
  res.json({ member: user, application, posts });
});

router.patch("/members/:id/verify", async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: "member" },
    { status: "verified" },
    { new: true }
  ).select("-passwordHash").lean();

  if (!user) return res.status(404).json({ message: "Member not found." });

  await notifyMember({
    userId: user._id,
    type: "member_verified",
    title: "Membership verified",
    body: "Your membership has been verified. You can now access the community and approved posts.",
    data: { userId: user._id.toString() }
  });

  res.json({ message: "Member verified.", member: user });
});

router.delete("/members/:id", async (req, res) => {
  const user = await User.findOneAndDelete({ _id: req.params.id, role: "member" });
  if (!user) return res.status(404).json({ message: "Member not found." });

  await Application.deleteOne({ user: user._id });
  await Post.deleteMany({ author: user._id });

  res.json({ message: "Member deleted." });
});

// Admin moderation queue for posts.
router.get("/posts", async (_req, res) => {
  const posts = await Post.find()
    .populate("author", "name username status")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.json({ posts });
});

router.patch("/posts/:id/approve", async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { status: "approved", reviewedAt: new Date(), reviewedBy: req.auth.username },
    { new: true }
  ).populate("author", "name username");

  if (!post) return res.status(404).json({ message: "Post not found." });

  await notifyMember({
    userId: post.author._id,
    type: "post_approved",
    title: "Post approved",
    body: "Your post has been approved and is now visible in the community feed.",
    data: { postId: post._id.toString() }
  });

  await notifyVerifiedMembers({
    type: "new_post",
    title: "New community post",
    body: `${post.author.name} shared a new post in the community.`,
    data: { postId: post._id.toString() },
    excludeUserId: post.author._id
  });

  res.json({ message: "Post approved and published.", post });
});

router.patch("/posts/:id/reject", async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { status: "rejected", reviewedAt: new Date(), reviewedBy: req.auth.username },
    { new: true }
  ).populate("author", "name username");

  if (!post) return res.status(404).json({ message: "Post not found." });

  await notifyMember({
    userId: post.author._id,
    type: "post_rejected",
    title: "Post not approved",
    body: "Your post was reviewed by the admin and was not approved for publication.",
    data: { postId: post._id.toString() }
  });

  res.json({ message: "Post rejected.", post });
});

router.delete("/posts/:id", async (req, res) => {
  const post = await Post.findByIdAndDelete(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found." });
  res.json({ message: "Post deleted." });
});

module.exports = router;
