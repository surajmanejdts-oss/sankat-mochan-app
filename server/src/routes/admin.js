const express = require("express");
const Application = require("../models/Application");
const User = require("../models/User");
const Post = require("../models/Post");
const Receipt = require("../models/Receipt");
const { makeReceiptNumber, parseReceiptDate, ensureApplicationReceipt } = require("./receipts");
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

  const application = await Application.findOne({ user: user._id }).lean();
  let applicationReceipt = null;

  if (application) {
    applicationReceipt = await ensureApplicationReceipt(user._id, application);
  }

  await notifyMember({
    userId: user._id,
    type: "member_verified",
    title: "Membership verified",
    body: applicationReceipt
      ? "Your membership has been verified. Your membership receipt is now available in the Receipts section."
      : "Your membership has been verified. You can now access the community and approved posts.",
    data: {
      userId: user._id.toString(),
      receiptId: applicationReceipt?._id?.toString() || null
    }
  });

  res.json({
    message: "Member verified.",
    member: user,
    receipt: applicationReceipt
  });
});

router.delete("/members/:id", async (req, res) => {
  const user = await User.findOneAndDelete({ _id: req.params.id, role: "member" });
  if (!user) return res.status(404).json({ message: "Member not found." });

  await Application.deleteOne({ user: user._id });
  await Post.deleteMany({ author: user._id });
  await Receipt.deleteMany({ user: user._id });

  res.json({ message: "Member deleted." });
});


// Members available for receipt distribution. The mobile number comes from
// the member's submitted application because User intentionally stores no phone field.
router.get("/receipt-recipients", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const users = await User.find({ role: "member" })
    .sort({ name: 1 })
    .select("_id name username status createdAt")
    .lean();

  const ids = users.map((u) => u._id);
  const applications = await Application.find({ user: { $in: ids } })
    .select("user mobile fullName")
    .lean();

  const appMap = new Map(
    applications.map((application) => [
      application.user.toString(),
      application
    ])
  );

  const normalized = q.toLowerCase();
  const members = users
    .map((user) => {
      const application = appMap.get(user._id.toString());
      return {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        phone: application?.mobile || "",
        status: user.status,
        createdAt: user.createdAt
      };
    })
    .filter((member) => {
      if (!normalized) return true;
      return [
        member.name,
        member.username,
        member.phone
      ].some((value) =>
        String(value || "").toLowerCase().includes(normalized)
      );
    });

  res.json({ members });
});

router.post("/receipts", async (req, res) => {
  try {
    const {
      userIds,
      title,
      amount,
      description,
      category,
      paymentMethod,
      transactionReference,
      receiptDate
    } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "Select at least one member." });
    }

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Receipt title is required." });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ message: "Enter a valid receipt amount." });
    }

    const uniqueIds = [...new Set(userIds.map(String))];
    const users = await User.find({
      _id: { $in: uniqueIds },
      role: "member"
    })
      .select("_id name username")
      .lean();

    if (!users.length) {
      return res.status(404).json({ message: "No valid members were selected." });
    }

    const requestedDate = parseReceiptDate(receiptDate);
    const receipts = [];

    for (const user of users) {
      const receipt = await Receipt.create({
        receiptNumber: makeReceiptNumber(),
        user: user._id,
        type: "manual",
        title: String(title).trim(),
        description: String(description || "").trim(),
        amount: numericAmount,
        currency: "INR",
        category: String(category || "General").trim(),
        paymentMethod: String(paymentMethod || "").trim(),
        transactionReference: String(transactionReference || "").trim(),
        receiptDate: requestedDate,
        issuedBy: req.auth.username || "Admin",
        metadata: {
          distribution: "admin",
          recipientName: user.name
        }
      });

      receipts.push(receipt);

      await notifyMember({
        userId: user._id,
        type: "receipt_sent",
        title: "New receipt received",
        body: `${receipt.title} for ₹${numericAmount.toLocaleString("en-IN")} has been added to your Receipts section.`,
        data: {
          receiptId: receipt._id.toString(),
          receiptNumber: receipt.receiptNumber
        }
      });
    }

    res.status(201).json({
      message: `Receipt sent to ${receipts.length} member${receipts.length === 1 ? "" : "s"}.`,
      count: receipts.length,
      receipts
    });
  } catch (error) {
    console.error("Send receipt error:", error);
    res.status(500).json({ message: error.message || "Unable to send receipt." });
  }
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
