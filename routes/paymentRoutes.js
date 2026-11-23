const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/verifyToken");
const verifyCustomer = require("../middleware/verifyCustomer");

const {
  createCheckout,
  stripeWebhook,
  getPaymentHistory
} = require("../controllers/paymentController");

// Keep webhook raw: Stripe requires the original request body.
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// Customer-only payment endpoints
router.use(verifyToken, verifyCustomer);
router.post("/checkout/:bookingId", createCheckout);
router.get("/history", getPaymentHistory);

module.exports = router;
