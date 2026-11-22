const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const {
  getPendingServices,
  reviewService,
} = require("../controllers/adminController");

router.use(verifyToken, verifyAdmin);

router.get("/services/pending", getPendingServices);
router.patch("/services/:id/review", reviewService);

module.exports = router;
