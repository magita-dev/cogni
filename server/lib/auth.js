import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// In production, set JWT_SECRET as a real environment variable.
const JWT_SECRET = process.env.JWT_SECRET || "proctoriq-dev-secret-change-in-production";
const TOKEN_EXPIRY = "7d";
const SALT_ROUNDS = 10;

export function hashPassword(plainPassword) {
  return bcrypt.hashSync(plainPassword, SALT_ROUNDS);
}

export async function comparePassword(plainPassword, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY
  });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Strips the password hash (and any other private fields) before a user
// object is ever sent to the client.
export function sanitizeUser(user) {
  if (!user) return user;
  const { password, ...safe } = user;
  return safe;
}

export function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Middleware: requires a valid bearer token, attaches decoded payload to req.user.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: "Authentication required. Please log in." });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Your session has expired. Please log in again." });
  req.user = payload;
  next();
}
