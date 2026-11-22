const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/verifyToken");
const verifyTechnician = require("../middleware/verifyTechnician");

const {
  getServices,
  getServiceById,
  createService,
  getMyServices,
} = require("../controllers/serviceController");

router.get("/", getServices);
router.get("/my-services", verifyToken, verifyTechnician, getMyServices);
router.get("/:id", getServiceById);
router.post("/", verifyToken, verifyTechnician, createService);

module.exports = router;
