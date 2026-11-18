import jwt from "jsonwebtoken";
import { collections } from "../config/db.js";

// 1. Verify JWT Token (401 if missing or invalid)
export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: Missing token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch latest user record from DB to ensure up-to-date role & profile
    const dbUser = await collections.users.findOne({ email: decoded.email });
    if (!dbUser) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    req.user = {
      id: dbUser._id.toString(),
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role || "customer",
    };

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid or expired token" });
  }
}

// 2. Role Verification Middlewares (403 if wrong role)
export function verifyCustomer(req, res, next) {
  if (req.user?.role !== "customer") {
    return res
      .status(403)
      .json({ message: "Forbidden: Customer access required" });
  }
  next();
}

export function verifyTechnician(req, res, next) {
  if (req.user?.role !== "technician") {
    return res
      .status(403)
      .json({ message: "Forbidden: Technician access required" });
  }
  next();
}

export function verifyAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Forbidden: Admin access required" });
  }
  next();
}
