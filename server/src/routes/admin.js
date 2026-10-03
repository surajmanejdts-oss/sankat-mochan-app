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

router.patch("/members/:id", async (req, res) => {
  const member = await User.findOne({ _id: req.params.id, role: "member" });
  if (!member) return res.status(404).json({ message: "Member not found." });

  const name = String(req.body.name || "").trim();
  const username = String(req.body.username || "").trim().toLowerCase();
  if (!name || !username) {
    return res.status(400).json({ message: "Member name and username are required." });
  }

  const duplicateUsername = await User.findOne({
    username,
    _id: { $ne: member._id }
  }).select("_id").lean();
  if (duplicateUsername) {
    return res.status(409).json({ message: "That username is already in use." });
  }

  const application = await Application.findOne({ user: member._id });
  const applicationUpdates = req.body.application;
  if (applicationUpdates && !application) {
    return res.status(409).json({
      message: "An application must be submitted before its details can be edited."
    });
  }

  if (applicationUpdates) {
    for (const field of ["fullName", "mobile", "address"]) {
      if (!String(applicationUpdates[field] || "").trim()) {
        return res.status(400).json({ message: `${field} is required.` });
      }
    }

    for (const field of [
      "fullName", "fatherOrHusbandName", "dob", "mobile", "whatsapp",
      "email", "address", "city", "district", "state", "pincode",
      "occupation", "paymentDate", "paymentMethod", "transactionReference"
    ]) {
      if (Object.prototype.hasOwnProperty.call(applicationUpdates, field)) {
        application[field] = String(applicationUpdates[field] || "").trim();
      }
    }

    for (const field of ["membershipFee", "cooperationAmount"]) {
      if (Object.prototype.hasOwnProperty.call(applicationUpdates, field)) {
        const value = Number(applicationUpdates[field]);
        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({ message: `${field} must be a valid non-negative amount.` });
        }
        application[field] = value;
      }
    }

    if (Array.isArray(applicationUpdates.familyMembers)) {
      application.familyMembers = applicationUpdates.familyMembers.map((familyMember) => ({
        name: String(familyMember.name || "").trim(),
        relation: String(familyMember.relation || "").trim(),
        mobile: String(familyMember.mobile || "").trim(),
        email: String(familyMember.email || "").trim()
      }));
    }
  }

  member.name = name;
  member.username = username;
  try {
    await member.save();
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "That username is already in use." });
    }
    throw error;
  }

  if (applicationUpdates) await application.save();

  const safeMember = member.toObject();
  delete safeMember.passwordHash;
  res.json({ message: "Member details updated.", member: safeMember, application });
});

router.patch("/members/:id/verify", async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: "member" });

  if (!user) return res.status(404).json({ message: "Member not found." });

  const application = await Application.findOne({ user: user._id }).lean();
  if (!application) {
    return res.status(409).json({
      message: "The member must submit an application before verification."
    });
  }

  user.status = "verified";
  await user.save();
  const verifiedUser = user.toObject();
  delete verifiedUser.passwordHash;
  const applicationReceipt = await ensureApplicationReceipt(user._id, application);

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
    member: verifiedUser,
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
  const users = await User.find({ role: "member", status: "verified" })
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
      description,
      amount,
    } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "Select at least one member." });
    }

    const receiptTitle = String(title || "").trim();
    if (!receiptTitle) {
      return res.status(400).json({ message: "Receipt title is required." });
    }

    const receiptDescription = String(description || "").trim();
    if (!receiptDescription) {
      return res.status(400).json({ message: "Receipt description is required." });
    }

    if (receiptTitle.length > 160 || receiptDescription.length > 2000) {
      return res.status(400).json({ message: "Receipt title or description is too long." });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ message: "Enter a valid receipt amount." });
    }

    const uniqueIds = [...new Set(userIds.map(String))];
    const users = await User.find({
      _id: { $in: uniqueIds },
      role: "member",
      status: "verified"
    })
      .select("_id name username")
      .lean();

    if (users.length !== uniqueIds.length) {
      return res.status(400).json({ message: "Receipts can only be sent to verified members." });
    }

    const receipts = [];

    for (const user of users) {
      const receipt = await Receipt.create({
        receiptNumber: makeReceiptNumber(),
        user: user._id,
        type: "manual",
        title: receiptTitle,
        description: receiptDescription,
        amount: numericAmount,
        currency: "INR",
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
        body: `${receiptTitle} for ₹${numericAmount.toLocaleString("en-IN")} has been added to your Receipts section.`,
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
