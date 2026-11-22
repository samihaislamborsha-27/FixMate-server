const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/verifyToken");
const verifyCustomer = require("../middleware/verifyCustomer");
const verifyTechnician = require("../middleware/verifyTechnician");

const {
  createBooking,
  getCustomerBookings,
  getTechnicianBookings,
  cancelBooking,
  updateBookingStatus
} = require("../controllers/bookingController");

router.post("/", verifyToken, verifyCustomer, createBooking);
router.get("/my-bookings", verifyToken, verifyCustomer, getCustomerBookings);
router.get("/technician", verifyToken, verifyTechnician, getTechnicianBookings);
router.patch("/:id/cancel", verifyToken, verifyCustomer, cancelBooking);
router.patch("/:id/status", verifyToken, verifyTechnician, updateBookingStatus);

module.exports = router;
