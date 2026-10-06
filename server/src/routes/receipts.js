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
  const membershipFee = Number(application.membershipFee || 0);
  const cooperationAmount = Number(application.cooperationAmount || 0);
  const parts = [
    `Membership fee: ₹${membershipFee.toLocaleString("en-IN")}`,
    `Cooperation amount: ₹${cooperationAmount.toLocaleString("en-IN")}`
  ];

  if (application.paymentMethod) parts.push(`Payment method: ${application.paymentMethod}`);
  if (application.transactionReference) {
    parts.push(`Transaction reference: ${application.transactionReference}`);
  }

  return `Membership application receipt. ${parts.join(" • ")}.`;
}

function receiptMemberMetadata(metadata, application, user) {
  const applicationAddress = application
    ? [
        application.address,
        application.city,
        application.district,
        application.state,
        application.pincode
      ].filter(Boolean).join(", ")
    : "";
  const donorName = application?.fullName || metadata?.donorName ||
    metadata?.recipientName || user.name;
  const fatherOrHusbandName = application?.fatherOrHusbandName ||
    metadata?.fatherOrHusbandName || "";
  const address = applicationAddress || metadata?.address || "";
  const mobile = application?.mobile || application?.whatsapp || metadata?.mobile || "";

  return {
    ...(metadata || {}),
    donorName,
    fatherOrHusbandName,
    address,
    mobile
  };
}

function receiptMemberDetails(application, user) {
  const applicationAddress = application
    ? [
        application.address,
        application.city,
        application.district,
        application.state,
        application.pincode
      ].filter((part) => String(part || "").trim()).join(", ")
    : "";

  return {
    donorName: String(application?.fullName || user.name || "").trim() || "-",
    fatherOrHusbandName: String(application?.fatherOrHusbandName || "").trim() || "-",
    address: applicationAddress || "-",
    mobile: String(application?.mobile || application?.whatsapp || "").trim() || "-"
  };
}

async function ensureApplicationReceipt(userId, application) {
  if (!application) return null;

  const oldMembershipFee = Number(application.membershipFee || 0);
  const oldCooperationAmount = Number(application.cooperationAmount || 0);
  if (oldCooperationAmount > 0) {
    const membershipFee = oldMembershipFee === 0 ? oldCooperationAmount : oldMembershipFee;
    application.membershipFee = membershipFee;
    application.cooperationAmount = 0;
    await Application.updateOne(
      {
        _id: application._id,
        membershipFee: oldMembershipFee,
        cooperationAmount: oldCooperationAmount
      },
      { $set: { membershipFee, cooperationAmount: 0 } }
    );
  }

  const existing = await Receipt.findOne({
    user: userId,
    type: "application",
    sourceApplication: application._id
  });

  const amount = Number(application.membershipFee || 0);
  const description = applicationDescription(application);

  if (existing) {
    const metadata = existing.metadata || {};
    const metadataChanged = metadata.membershipFee !== amount ||
      metadata.cooperationAmount !== Number(application.cooperationAmount || 0) ||
      metadata.applicationAmount !== amount;
    if (existing.amount !== amount || existing.description !== description || metadataChanged) {
      existing.amount = amount;
      existing.description = description;
      existing.metadata = {
        ...metadata,
        membershipFee: amount,
        cooperationAmount: Number(application.cooperationAmount || 0),
        applicationAmount: amount
      };
      await existing.save();
    }
    return existing;
  }

  try {
    return await Receipt.create({
      receiptNumber: makeReceiptNumber(),
      user: userId,
      type: "application",
      title: "Membership Application Receipt",
      description,
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
        membershipFee: amount,
        cooperationAmount: Number(application.cooperationAmount || 0),
        applicationAmount: amount,
        receiptImageUrl: application.receiptImageUrl || "",
        donorName: application.fullName,
        fatherOrHusbandName: application.fatherOrHusbandName || "",
        address: [
          application.address,
          application.city,
          application.district,
          application.state,
          application.pincode
        ].filter(Boolean).join(", "),
        mobile: application.mobile || application.whatsapp || ""
      }
    });
  } catch (error) {
    // A concurrent request may have created the same application receipt.
    if (error?.code === 11000) {
      const receipt = await Receipt.findOne({
        user: userId,
        type: "application",
        sourceApplication: application._id
      });
      const metadata = receipt?.metadata || {};
      const metadataChanged = metadata.membershipFee !== amount ||
        metadata.cooperationAmount !== Number(application.cooperationAmount || 0) ||
        metadata.applicationAmount !== amount;
      if (receipt && (receipt.amount !== amount || receipt.description !== description || metadataChanged)) {
        receipt.amount = amount;
        receipt.description = description;
        receipt.metadata = {
          ...metadata,
          membershipFee: amount,
          cooperationAmount: Number(application.cooperationAmount || 0),
          applicationAmount: amount
        };
        await receipt.save();
      }
      return receipt;
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

  const application = await Application.findOne({ user: user._id }).lean();
  if (user.status === "verified" && application) {
    await ensureApplicationReceipt(user._id, application);
  }

  const receipts = await Receipt.find({ user: user._id })
    .sort({ receiptDate: -1, createdAt: -1 })
    .lean();

  res.json({
    receipts: receipts.map((receipt) => ({
      ...receipt,
      metadata: receiptMemberMetadata(receipt.metadata, application, user),
      memberDetails: receiptMemberDetails(application, user)
    }))
  });
});

router.get("/:id", requireAuth, requireMember, async (req, res) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    user: req.auth.id
  }).lean();

  if (!receipt) return res.status(404).json({ message: "Receipt not found." });

  const [user, application] = await Promise.all([
    User.findById(req.auth.id).select("name").lean(),
    Application.findOne({ user: req.auth.id }).lean()
  ]);
  if (!user) return res.status(404).json({ message: "Member not found." });

  res.json({
    receipt: {
      ...receipt,
      metadata: receiptMemberMetadata(receipt.metadata, application, user),
      memberDetails: receiptMemberDetails(application, user)
    }
  });
});

module.exports = {
  router,
  makeReceiptNumber,
  parseReceiptDate,
  ensureApplicationReceipt
};
