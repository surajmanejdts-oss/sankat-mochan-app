const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["application", "manual"], required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", trim: true },
    category: { type: String, trim: true, default: "General" },
    paymentMethod: { type: String, trim: true, default: "" },
    transactionReference: { type: String, trim: true, default: "" },
    receiptDate: { type: Date, default: Date.now },
    issuedBy: { type: String, trim: true, default: "Admin" },
    sourceApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

receiptSchema.index({ user: 1, receiptDate: -1 });
receiptSchema.index(
  { sourceApplication: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model("Receipt", receiptSchema);
