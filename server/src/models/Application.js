const mongoose = require("mongoose");

const familyMemberSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    relation: { type: String, trim: true },
    mobile: { type: String, trim: true },
    email: { type: String, trim: true }
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    fatherOrHusbandName: { type: String, trim: true },
    dob: { type: String, trim: true },
    mobile: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    occupation: { type: String, trim: true },
    familyMembers: { type: [familyMemberSchema], default: [] },
    membershipFee: { type: Number, default: 0 },
    cooperationAmount: { type: Number, default: 0 },
    paymentDate: { type: String, trim: true },
    paymentMethod: { type: String, trim: true },
    transactionReference: { type: String, trim: true },
    receiptImageUrl: { type: String, trim: true },
    declarationChecks: { type: [Boolean], default: [] },
    signatureData: { type: String, trim: true },
    declarationAccepted: { type: Boolean, required: true },
    submittedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);
