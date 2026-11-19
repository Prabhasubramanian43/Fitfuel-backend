
const jwt = require("jsonwebtoken");
module.exports = (req, res, next) => {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Admin login required." });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "admin") return res.status(403).json({ message: "Admin access only." });
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired admin session." });
  }
};
