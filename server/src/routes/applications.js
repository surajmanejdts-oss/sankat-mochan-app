const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Application = require("../models/Application");
const { requireAuth, requireMember } = require("../middleware/auth");
const { notifyAdmins, notifyMember } = require("../utils/notifications");

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `receipt-${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Receipt must be an image."));
  }
});

router.get("/me", requireAuth, requireMember, async (req, res) => {
  const application = await Application.findOne({ user: req.auth.id }).lean();
  res.json({ application });
});

router.post("/", requireAuth, requireMember, upload.single("receipt"), async (req, res) => {
  try {
    const existing = await Application.findOne({ user: req.auth.id });
    if (existing) {
      return res.status(409).json({ message: "Your application has already been submitted." });
    }

    const body = req.body;
    let declarationChecks;
    try {
      declarationChecks = JSON.parse(body.declarationChecks || "[]");
    } catch {
      return res.status(400).json({ message: "All four declaration statements must be accepted." });
    }
    const allDeclarationsAccepted = Array.isArray(declarationChecks) &&
      declarationChecks.length === 4 &&
      declarationChecks.every((checked) => checked === true);
    const declarationAccepted =
      (body.declarationAccepted === true || body.declarationAccepted === "true") &&
      allDeclarationsAccepted;
    const cooperationAmount = Number(body.cooperationAmount);
    let signatureStrokes;
    try {
      signatureStrokes = JSON.parse(body.signatureData || "[]");
    } catch {
      return res.status(400).json({ message: "A valid signature is required." });
    }
    const signaturePointCount = Array.isArray(signatureStrokes)
      ? signatureStrokes.reduce((count, stroke) => count + (Array.isArray(stroke) ? stroke.length : 0), 0)
      : 0;
    const hasSignature = Array.isArray(signatureStrokes) &&
      signatureStrokes.some((stroke) =>
        Array.isArray(stroke) &&
        stroke.length > 1 &&
        stroke.every((point) =>
          point &&
          Number.isFinite(point.x) &&
          Number.isFinite(point.y)
        )
      ) &&
      signaturePointCount <= 12000;
    if (!body.fullName || !body.mobile || !body.address || !declarationAccepted || !hasSignature) {
      return res.status(400).json({
        message: "Full name, mobile, address, all four declarations and a valid signature are required."
      });
    }
    if (!body.cooperationAmount || !Number.isFinite(cooperationAmount) || cooperationAmount < 0) {
      return res.status(400).json({ message: "A valid cooperation amount is required." });
    }

    let familyMembers = [];
    try {
      familyMembers = body.familyMembers ? JSON.parse(body.familyMembers) : [];
    } catch {
      familyMembers = [];
    }

    const base = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const receiptImageUrl = req.file ? `${base}/uploads/${req.file.filename}` : "";

    const application = await Application.create({
      user: req.auth.id,
      fullName: body.fullName,
      fatherOrHusbandName: body.fatherOrHusbandName,
      dob: body.dob,
      mobile: body.mobile,
      whatsapp: body.whatsapp,
      email: body.email,
      address: body.address,
      city: body.city,
      district: body.district,
      state: body.state,
      pincode: body.pincode,
      occupation: body.occupation,
      familyMembers,
      membershipFee: Number(body.membershipFee || 500),
      cooperationAmount,
      paymentDate: body.paymentDate,
      paymentMethod: body.paymentMethod,
      transactionReference: body.transactionReference,
      receiptImageUrl,
      declarationChecks,
      signatureData: body.signatureData,
      declarationAccepted
    });

    await notifyAdmins({
      type: "application_submitted",
      title: "New membership application",
      body: `${application.fullName} submitted a membership application for review.`,
      data: { applicationId: application._id.toString(), userId: req.auth.id }
    });

    await notifyMember({
      userId: req.auth.id,
      type: "application_submitted",
      title: "Application submitted",
      body: "Your membership application is under review. Please wait up to 24 hours.",
      data: { applicationId: application._id.toString() }
    });

    res.status(201).json({
      message: "Application submitted. Please wait up to 24 hours for verification.",
      application
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to submit application." });
  }
});

module.exports = router;
