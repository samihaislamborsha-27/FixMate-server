const { ObjectId } = require("mongodb");
const Stripe = require("stripe");
const { getDB } = require("../config/db");

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key is not configured.");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

async function createCheckout(req, res) {
  try {
    const { bookingId } = req.params;

    if (!ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const db = getDB();
    const booking = await db.collection("bookings").findOne({
      _id: new ObjectId(bookingId),
      customerId: req.user.id
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Payment is available only after the service is completed."
      });
    }

    if (booking.paymentStatus === "paid") {
      return res.status(409).json({ success: false, message: "This booking is already paid." });
    }

    const amount = Number(booking.price ?? booking.cost);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid booking amount." });
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: req.user.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "bdt",
          unit_amount: Math.round(amount * 100),
          product_data: {
            name: booking.serviceTitle || booking.title || "FixMate Repair Service",
            description: "FixMate completed repair service"
          }
        }
      }],
      metadata: {
        bookingId: booking._id.toString(),
        customerId: req.user.id
      },
      success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment/cancel`
    });

    await db.collection("bookings").updateOne(
      { _id: booking._id, customerId: req.user.id, paymentStatus: { $ne: "paid" } },
      { $set: { stripeSessionId: session.id, updatedAt: new Date() } }
    );

    res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    console.error("Checkout error:", error.message);
    res.status(500).json({ success: false, message: error.message || "Could not create payment session." });
  }
}

async function stripeWebhook(req, res) {
  let event;

  try {
    const stripe = getStripe();
    const signature = req.headers["stripe-signature"];

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(500).send("Webhook secret is not configured.");
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Stripe webhook signature error:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.payment_status !== "paid") {
        return res.status(200).json({ received: true });
      }

      const { bookingId, customerId } = session.metadata || {};

      if (!ObjectId.isValid(bookingId || "")) {
        return res.status(200).json({ received: true });
      }

      const db = getDB();
      const booking = await db.collection("bookings").findOne({
        _id: new ObjectId(bookingId),
        customerId,
        status: "completed",
        paymentStatus: { $ne: "paid" }
      });

      if (booking) {
        const update = await db.collection("bookings").updateOne(
          {
            _id: booking._id,
            customerId,
            status: "completed",
            paymentStatus: { $ne: "paid" }
          },
          {
            $set: {
              paymentStatus: "paid",
              paidAt: new Date(),
              stripeSessionId: session.id,
              updatedAt: new Date()
            }
          }
        );

        if (update.modifiedCount === 1) {
          await db.collection("payments").insertOne({
            bookingId: booking._id,
            customerId,
            technicianId: booking.technicianId,
            amount: session.amount_total / 100,
            currency: session.currency,
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent || null,
            status: "paid",
            createdAt: new Date()
          });
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ received: false });
  }
}

async function getPaymentHistory(req, res) {
  try {
    const payments = await getDB()
      .collection("payments")
      .find({ customerId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load payment history." });
  }
}

module.exports = { createCheckout, stripeWebhook, getPaymentHistory };
