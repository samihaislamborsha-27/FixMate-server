const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

async function getPendingServices(req, res) {
  try {
    const services = await getDB()
      .collection("services")
      .find({ status: "pending" })
      .sort({ createdAt: 1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    console.error("Pending services error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load pending services.",
    });
  }
}

async function reviewService(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected.",
      });
    }

    const result = await getDB().collection("services").updateOne(
      { _id: new ObjectId(id), status: "pending" },
      {
        $set: {
          status,
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (!result.matchedCount) {
      return res.status(404).json({
        success: false,
        message: "Pending service not found. It may already have been reviewed.",
      });
    }

    res.status(200).json({
      success: true,
      message: `Service ${status} successfully.`,
    });
  } catch (error) {
    console.error("Review service error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to review service.",
    });
  }
}

module.exports = { getPendingServices, reviewService };
