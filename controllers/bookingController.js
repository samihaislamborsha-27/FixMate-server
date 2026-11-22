const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const activeStatuses = ["requested", "accepted", "in-progress"];

exports.createBooking = async (req, res) => {
  try {
    const {
      serviceId,
      customerName,
      phone,
      area,
      address,
      preferredDate,
      problemDescription
    } = req.body;

    if (!ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: "Invalid service." });
    }

    if (!customerName || !phone || !area || !address || !preferredDate || !problemDescription) {
      return res.status(400).json({ success: false, message: "Please complete all booking fields." });
    }

    const db = getDB();
    const service = await db.collection("services").findOne({
      _id: new ObjectId(serviceId),
      status: "approved",
      availability: "available"
    });

    if (!service) {
      return res.status(404).json({ success: false, message: "This service is not available." });
    }

    const customerId = String(req.user.id);
    const technicianId = String(service.technicianId || "");

    if (!technicianId) {
      return res.status(400).json({ success: false, message: "Service technician is unavailable." });
    }

    const duplicate = await db.collection("bookings").findOne({
      customerId,
      serviceId: String(service._id),
      status: { $in: activeStatuses }
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "You already have an active booking for this service."
      });
    }

    const price = Number(service.price ?? service.cost ?? 0);

    const booking = {
      customerId,
      customerEmail: req.user.email || "",
      customerName: String(customerName).trim(),
      phone: String(phone).trim(),
      area: String(area).trim(),
      address: String(address).trim(),
      preferredDate: String(preferredDate),
      problemDescription: String(problemDescription).trim(),
      serviceId: String(service._id),
      serviceTitle: service.title || service.name || service.serviceName || "Repair service",
      technicianId,
      price: Number.isFinite(price) ? price : 0,
      status: "requested",
      paymentStatus: "unpaid",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("bookings").insertOne(booking);

    return res.status(201).json({
      success: true,
      message: "Booking request submitted successfully.",
      data: { ...booking, _id: result.insertedId }
    });
  } catch (error) {
    console.error("Create booking error:", error);
    return res.status(500).json({ success: false, message: "Could not create booking." });
  }
};

exports.getCustomerBookings = async (req, res) => {
  try {
    const db = getDB();
    const bookings = await db.collection("bookings")
      .find({ customerId: String(req.user.id) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error("Customer bookings error:", error);
    res.status(500).json({ success: false, message: "Could not load bookings." });
  }
};

exports.getTechnicianBookings = async (req, res) => {
  try {
    const db = getDB();
    const bookings = await db.collection("bookings")
      .find({ technicianId: String(req.user.id) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error("Technician bookings error:", error);
    res.status(500).json({ success: false, message: "Could not load bookings." });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const db = getDB();
    const result = await db.collection("bookings").updateOne(
      {
        _id: new ObjectId(req.params.id),
        customerId: String(req.user.id),
        status: "requested"
      },
      { $set: { status: "cancelled", updatedAt: new Date() } }
    );

    if (!result.modifiedCount) {
      return res.status(400).json({
        success: false,
        message: "Only your requested bookings can be cancelled."
      });
    }

    res.json({ success: true, message: "Booking cancelled." });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ success: false, message: "Could not cancel booking." });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const allowed = {
      requested: ["accepted", "rejected"],
      accepted: ["in-progress"],
      "in-progress": ["completed"]
    };

    const db = getDB();
    const bookings = db.collection("bookings");

    const booking = await bookings.findOne({
      _id: new ObjectId(req.params.id),
      technicianId: String(req.user.id)
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    if (!(allowed[booking.status] || []).includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid booking status transition." });
    }

    const update = { status, updatedAt: new Date() };

    if (status === "completed") {
      update.completedAt = new Date();
    }

    await bookings.updateOne(
      { _id: booking._id, technicianId: String(req.user.id), status: booking.status },
      { $set: update }
    );

    res.json({ success: true, message: "Booking status updated." });
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({ success: false, message: "Could not update booking." });
  }
};
