const express = require("express");
const crypto = require("crypto");
const Receipt = require("../models/Receipt");
const User = require("../models/User");
const Application = require("../models/Application");
const { requireAuth, requireMember } = require("../middleware/auth");

const router = express.Router();

function makeReceiptNumber() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SMS-${stamp}-${random}`;
}

function applicationDescription(application) {
  const parts = [
    `Membership fee: ₹${Number(application.membershipFee || 0).toLocaleString("en-IN")}`,
    `Cooperation amount: ₹${Number(application.cooperationAmount || 0).toLocaleString("en-IN")}`
  ];

  if (application.paymentMethod) parts.push(`Payment method: ${application.paymentMethod}`);
  if (application.transactionReference) {
    parts.push(`Transaction reference: ${application.transactionReference}`);
  }

  return `Membership application receipt. ${parts.join(" • ")}.`;
}

async function ensureApplicationReceipt(userId, application) {
  if (!application) return null;

  const existing = await Receipt.findOne({
    user: userId,
    type: "application",
    sourceApplication: application._id
  });

  if (existing) return existing;

  const amount =
    Number(application.membershipFee || 0) +
    Number(application.cooperationAmount || 0);

  try {
    return await Receipt.create({
      receiptNumber: makeReceiptNumber(),
      user: userId,
      type: "application",
      title: "Membership Application Receipt",
      description: applicationDescription(application),
      amount,
      currency: "INR",
      category: "Membership",
      paymentMethod: application.paymentMethod || "",
      transactionReference: application.transactionReference || "",
      receiptDate: application.paymentDate
        ? parseReceiptDate(application.paymentDate)
        : application.submittedAt || new Date(),
      issuedBy: "Admin",
      sourceApplication: application._id,
      metadata: {
        membershipFee: Number(application.membershipFee || 0),
        cooperationAmount: Number(application.cooperationAmount || 0),
        receiptImageUrl: application.receiptImageUrl || ""
      }
    });
  } catch (error) {
    // A concurrent request may have created the same application receipt.
    if (error?.code === 11000) {
      return Receipt.findOne({
        user: userId,
        type: "application",
        sourceApplication: application._id
      });
    }
    throw error;
  }
}

function parseReceiptDate(value) {
  if (!value) return new Date();

  const text = String(value).trim();
  const ddmmyyyy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);

  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(date.getTime())) return date;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

// Member receipt list. The application receipt is created automatically
// for verified members if an older verified account does not have one yet.
router.get("/", requireAuth, requireMember, async (req, res) => {
  const user = await User.findOne({
    _id: req.auth.id,
    role: "member"
  }).lean();

  if (!user) return res.status(404).json({ message: "Member not found." });

  if (user.status === "verified") {
    const application = await Application.findOne({ user: user._id }).lean();
    if (application) await ensureApplicationReceipt(user._id, application);
  }

  const receipts = await Receipt.find({ user: user._id })
    .sort({ receiptDate: -1, createdAt: -1 })
    .lean();

  res.json({ receipts });
});

router.get("/:id", requireAuth, requireMember, async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    user: req.auth.id
  }).lean();

  if (!receipt) return res.status(404).json({ message: "Receipt not found." });

  res.json({ receipt });
});

module.exports = {
  router,
  makeReceiptNumber,
  parseReceiptDate,
  ensureApplicationReceipt
};
