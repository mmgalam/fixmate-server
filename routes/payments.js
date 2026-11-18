import express from "express";
import Stripe from "stripe";
import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";
import { verifyToken, verifyCustomer } from "../middlewares/auth.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Shared idempotent helper to record payment & mark booking paid
async function fulfillCheckoutSession(session) {
  if (session.payment_status !== "paid") return null;

  // 1. Check if this Stripe session was already recorded
  const existingPayment = await collections.payments.findOne({
    stripeSessionId: session.id,
  });
  if (existingPayment) {
    return existingPayment;
  }

  const bookingId = session.metadata?.bookingId;
  if (!bookingId || !ObjectId.isValid(bookingId)) return null;

  const booking = await collections.bookings.findOne({
    _id: new ObjectId(bookingId),
  });
  if (!booking) return null;

  const paymentDoc = {
    bookingId: booking._id.toString(),
    serviceTitle: booking.serviceTitle,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    technicianName: booking.technicianName,
    technicianEmail: booking.technicianEmail,
    amount: booking.finalAmount,
    currency: "usd",
    transactionId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || session.id,
    stripeSessionId: session.id,
    paymentStatus: "paid",
    paidAt: new Date(),
  };

  try {
    await collections.payments.insertOne(paymentDoc);
  } catch (err) {
    // Handle race condition if webhook and success page fire simultaneously (Mongo duplicate key 11000)
    if (err.code === 11000) {
      return await collections.payments.findOne({
        stripeSessionId: session.id,
      });
    }
    throw err;
  }

  // 2. Mark booking as paid
  await collections.bookings.updateOne(
    { _id: booking._id },
    { $set: { paymentStatus: "paid" } },
  );

  return paymentDoc;
}

// 1. CUSTOMER: Create Stripe Checkout Session (Challenge 3 Payment Gate)
router.post(
  "/create-checkout-session",
  verifyToken,
  verifyCustomer,
  async (req, res) => {
    try {
      const { bookingId } = req.body;
      if (!bookingId || !ObjectId.isValid(bookingId)) {
        return res
          .status(400)
          .json({ message: "Valid booking ID is required" });
      }

      // Load booking from DB (never trust an amount sent from the client)
      const booking = await collections.bookings.findOne({
        _id: new ObjectId(bookingId),
        customerEmail: req.user.email,
      });

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.status !== "completed") {
        return res
          .status(400)
          .json({
            message: "Payment is only allowed after the job is completed",
          });
      }

      if (booking.paymentStatus === "paid") {
        return res
          .status(400)
          .json({ message: "This booking is already paid" });
      }

      const unitAmount = Math.round(Number(booking.finalAmount) * 100);
      if (!unitAmount || unitAmount <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid booking final amount" });
      }

      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: req.user.email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: booking.serviceTitle,
                description: `Repair by ${booking.technicianName} (${booking.category})`,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          bookingId: booking._id.toString(),
          customerEmail: req.user.email,
        },
        success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/payment/cancel`,
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error("Stripe checkout session error:", err);
      res.status(500).json({ message: "Failed to initialize Stripe Checkout" });
    }
  },
);

// 2. CUSTOMER: Verify Checkout Session on /payment/success
router.get("/verify", verifyToken, verifyCustomer, async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ message: "Missing session_id" });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.metadata?.customerEmail !== req.user.email) {
      return res
        .status(403)
        .json({ message: "Forbidden: Session belongs to another user" });
    }

    if (session.payment_status !== "paid") {
      return res
        .status(400)
        .json({ message: "Payment has not been completed yet" });
    }

    const payment = await fulfillCheckoutSession(session);
    res.json({
      verified: true,
      payment,
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ message: "Failed to verify payment session" });
  }
});

// 3. CUSTOMER: Get Own Payment History
router.get("/my", verifyToken, verifyCustomer, async (req, res) => {
  try {
    const payments = await collections.payments
      .find({ customerEmail: req.user.email })
      .sort({ paidAt: -1 })
      .toArray();

    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: "Failed to load payment history" });
  }
});

// 4. STRIPE WEBHOOK HANDLER (Challenge 4 - mounted with express.raw in index.js)
export async function stripeWebhookHandler(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    try {
      await fulfillCheckoutSession(session);
    } catch (err) {
      console.error("Webhook fulfillment error:", err);
      return res.status(500).json({ received: false });
    }
  }

  res.json({ received: true });
}

export default router;
