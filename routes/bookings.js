import express from "express";
import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";
import {
  verifyToken,
  verifyCustomer,
  verifyTechnician,
} from "../middlewares/auth.js";

const router = express.Router();

// 1. CUSTOMER: Create a Repair Request
router.post("/", verifyToken, verifyCustomer, async (req, res) => {
  try {
    const {
      serviceId,
      customerPhone,
      address,
      preferredDate,
      problemDescription,
    } = req.body;

    if (!ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: "Invalid service ID" });
    }

    if (!customerPhone?.trim() || !address?.trim() || !preferredDate) {
      return res
        .status(400)
        .json({ message: "Phone, address, and preferred date are required" });
    }

    if (!problemDescription || problemDescription.trim().length < 20) {
      return res.status(400).json({
        message: "Problem description must be at least 20 characters",
      });
    }

    const service = await collections.services.findOne({
      _id: new ObjectId(serviceId),
      approvalStatus: "approved",
      isAvailable: true,
    });

    if (!service) {
      return res
        .status(404)
        .json({ message: "Service not found or unavailable" });
    }

    // Block self-booking
    if (service.technicianEmail === req.user.email) {
      return res
        .status(403)
        .json({ message: "You cannot book your own service" });
    }

    // Block duplicate active requests for the same service
    const existingActive = await collections.bookings.findOne({
      serviceId: service._id.toString(),
      customerEmail: req.user.email,
      status: { $in: ["requested", "accepted", "in-progress"] },
    });

    if (existingActive) {
      return res.status(409).json({
        message: "You already have an active request for this service",
      });
    }

    const booking = {
      serviceId: service._id.toString(),
      serviceTitle: service.title,
      serviceImage: service.image,
      category: service.category,
      basePrice: service.basePrice,
      technicianName: service.technicianName,
      technicianEmail: service.technicianEmail,
      customerName: req.user.name,
      customerEmail: req.user.email,
      customerPhone: customerPhone.trim(),
      address: address.trim(),
      preferredDate: new Date(preferredDate),
      problemDescription: problemDescription.trim(),
      status: "requested",
      finalAmount: service.basePrice,
      paymentStatus: "unpaid",
      createdAt: new Date(),
      statusHistory: [{ status: "requested", changedAt: new Date() }],
    };

    const result = await collections.bookings.insertOne(booking);
    res.status(201).json({ ...booking, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: "Failed to create booking" });
  }
});

// 2. CUSTOMER: Get Own Bookings
router.get("/my", verifyToken, verifyCustomer, async (req, res) => {
  try {
    const bookings = await collections.bookings
      .find({ customerEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to load bookings" });
  }
});

// 3. CUSTOMER: Cancel a Requested Booking
router.patch("/:id/cancel", verifyToken, verifyCustomer, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const booking = await collections.bookings.findOne({
      _id: new ObjectId(req.params.id),
      customerEmail: req.user.email,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "requested") {
      return res.status(400).json({
        message: 'Only bookings with status "requested" can be cancelled',
      });
    }

    await collections.bookings.updateOne(
      { _id: booking._id },
      {
        $set: { status: "cancelled" },
        $push: {
          statusHistory: { status: "cancelled", changedAt: new Date() },
        },
      },
    );

    res.json({ message: "Booking cancelled successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel booking" });
  }
});

// 4. TECHNICIAN: Get Incoming Repair Requests
router.get("/technician", verifyToken, verifyTechnician, async (req, res) => {
  try {
    const bookings = await collections.bookings
      .find({ technicianEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to load incoming requests" });
  }
});

// 5. TECHNICIAN: Strict Job Status State Machine (Challenge 3)
router.patch("/:id/status", verifyToken, verifyTechnician, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const { status: nextStatus, finalAmount } = req.body;

    const booking = await collections.bookings.findOne({
      _id: new ObjectId(req.params.id),
      technicianEmail: req.user.email,
    });

    if (!booking) {
      return res
        .status(404)
        .json({ message: "Booking not found or unauthorized" });
    }

    const allowedTransitions = {
      requested: ["accepted", "rejected"],
      accepted: ["in-progress"],
      "in-progress": ["completed"],
    };

    const validNextStates = allowedTransitions[booking.status] || [];
    if (!validNextStates.includes(nextStatus)) {
      return res.status(400).json({
        message: `Invalid status transition from "${booking.status}" to "${nextStatus}"`,
      });
    }

    const updateDoc = { status: nextStatus };

    if (nextStatus === "completed") {
      const parsedAmount = Number(finalAmount);
      if (!parsedAmount || parsedAmount <= 0) {
        return res.status(400).json({
          message:
            "A valid final amount greater than 0 is required to complete a job",
        });
      }
      updateDoc.finalAmount = parsedAmount;
    }

    await collections.bookings.updateOne(
      { _id: booking._id },
      { $set: updateDoc },
    );
    res.json({ message: `Job marked as ${nextStatus}`, ...updateDoc });
  } catch (err) {
    res.status(500).json({ message: "Failed to update job status" });
  }
});

// 6. CUSTOMER: Rate & Review a Paid Booking (Optional Standout Feature)
router.patch("/:id/review", verifyToken, verifyCustomer, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const rating = Number(req.body.rating);
    const review = req.body.review?.trim() || "";

    if (!rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5 stars" });
    }

    const booking = await collections.bookings.findOne({
      _id: new ObjectId(req.params.id),
      customerEmail: req.user.email,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({
        message: "You can only review a booking after payment is completed",
      });
    }

    if (booking.rating) {
      return res
        .status(409)
        .json({ message: "You have already reviewed this booking" });
    }

    await collections.bookings.updateOne(
      { _id: booking._id },
      {
        $set: {
          rating,
          review,
          reviewedAt: new Date(),
        },
      },
    );

    res.json({ message: "Thank you for your review!", rating, review });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit review" });
  }
});

export default router;
