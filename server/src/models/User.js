const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["member"], default: "member" },
    status: { type: String, enum: ["pending", "verified"], default: "pending" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
