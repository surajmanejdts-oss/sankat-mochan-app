const jwt = require("jsonwebtoken");

function signMember(user) {
  return jwt.sign(
    { id: user._id.toString(), role: "member", username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function signAdmin() {
  return jwt.sign(
    { role: "admin", username: process.env.ADMIN_USERNAME },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Authentication required." });

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

function requireMember(req, res, next) {
  if (req.auth?.role !== "member") {
    return res.status(403).json({ message: "Member access required." });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.auth?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
}

module.exports = { signMember, signAdmin, requireAuth, requireMember, requireAdmin };
