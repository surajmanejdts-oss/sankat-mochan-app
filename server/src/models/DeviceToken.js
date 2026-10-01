const mongoose = require("mongoose");

const deviceTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, trim: true },
    role: { type: String, enum: ["member", "admin"], required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    platform: { type: String, enum: ["android", "ios", "web", "unknown"], default: "unknown" },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeviceToken", deviceTokenSchema);
