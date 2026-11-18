import express from "express";
import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";
import { verifyToken, verifyAdmin } from "../middlewares/auth.js";

const router = express.Router();

// Protect all admin routes
router.use(verifyToken, verifyAdmin);

// 1. List All Users
router.get("/users", async (req, res) => {
  try {
    const users = await collections.users
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// 2. Change User Role (prevent admin from changing their own role)
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ["customer", "technician", "admin"];

    if (!ObjectId.isValid(req.params.id) || !allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid user ID or role" });
    }

    const targetUser = await collections.users.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.email === req.user.email) {
      return res
        .status(403)
        .json({ message: "You cannot change your own admin role" });
    }

    await collections.users.updateOne(
      { _id: targetUser._id },
      { $set: { role } },
    );

    res.json({ message: `Role updated to ${role}` });
  } catch (err) {
    res.status(500).json({ message: "Failed to update user role" });
  }
});

// 3. List All Services (Pending first for easy moderation)
router.get("/services", async (req, res) => {
  try {
    const services = await collections.services
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Sort pending services to the top
    const order = { pending: 0, approved: 1, rejected: 2 };
    services.sort(
      (a, b) => (order[a.approvalStatus] ?? 3) - (order[b.approvalStatus] ?? 3),
    );

    res.json(services);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch services" });
  }
});

// 4. Approve or Reject a Service
router.patch("/services/:id/approval", async (req, res) => {
  try {
    const { approvalStatus } = req.body;
    if (
      !ObjectId.isValid(req.params.id) ||
      !["approved", "rejected"].includes(approvalStatus)
    ) {
      return res
        .status(400)
        .json({ message: "Invalid service ID or approval status" });
    }

    const result = await collections.services.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { approvalStatus } },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({ message: `Service ${approvalStatus}` });
  } catch (err) {
    res.status(500).json({ message: "Failed to update service approval" });
  }
});

// 5. All Platform Bookings
router.get("/bookings", async (req, res) => {
  try {
    const bookings = await collections.bookings
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch all bookings" });
  }
});

// 6. All Platform Payments / Transactions
router.get("/payments", async (req, res) => {
  try {
    const payments = await collections.payments
      .find({})
      .sort({ paidAt: -1 })
      .toArray();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

export default router;
