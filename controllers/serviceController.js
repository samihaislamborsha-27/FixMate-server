const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getServices(req, res) {
  try {
    const db = getDB();

    const {
      search = "",
      category = "",
      area = "",
      sort = "newest",
      page = "1",
      limit = "12",
    } = req.query;

    const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 12));

    const filter = {
      status: "approved",
      availability: "available",
    };

    if (search.trim()) {
      const pattern = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [
        { title: pattern },
        { category: pattern },
        { description: pattern },
        { area: pattern },
      ];
    }

    if (category.trim()) {
      filter.category = category.trim();
    }

    if (area.trim()) {
      filter.area = new RegExp(escapeRegex(area.trim()), "i");
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_low: { price: 1 },
      price_high: { price: -1 },
    };

    const collection = db.collection("services");
    const total = await collection.countDocuments(filter);

    const services = await collection
      .find(filter)
      .sort(sortOptions[sort] || sortOptions.newest)
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    res.status(200).json({
      success: true,
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
      data: services,
    });
  } catch (error) {
    console.error("Get services error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve services.",
    });
  }
}

async function getServiceById(req, res) {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const service = await getDB()
      .collection("services")
      .findOne({
        _id: new ObjectId(req.params.id),
        status: "approved",
        availability: "available",
      });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    res.status(200).json({ success: true, data: service });
  } catch (error) {
    console.error("Get service error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve service.",
    });
  }
}

async function createService(req, res) {
  try {
    const {
      title,
      category,
      description,
      price,
      area,
    } = req.body;

    if (
      typeof title !== "string" ||
      typeof category !== "string" ||
      typeof description !== "string" ||
      typeof area !== "string" ||
      !title.trim() ||
      !category.trim() ||
      !description.trim() ||
      !area.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required service details.",
      });
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid service price.",
      });
    }

    const newService = {
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      price: numericPrice,
      area: area.trim(),
      technicianId: req.user.id,
      technicianName: req.user.name || "Technician",
      status: "pending",
      availability: "available",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await getDB()
      .collection("services")
      .insertOne(newService);

    res.status(201).json({
      success: true,
      message: "Service submitted for admin approval.",
      data: {
        ...newService,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Create service error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create service.",
    });
  }
}

async function getMyServices(req, res) {
  try {
    const services = await getDB()
      .collection("services")
      .find({ technicianId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    console.error("Get technician services error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve your services.",
    });
  }
}

module.exports = {
  getServices,
  getServiceById,
  createService,
  getMyServices,
};
