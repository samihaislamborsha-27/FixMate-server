function verifyTechnician(req, res, next) {
  if (req.user?.role !== "technician") {
    return res.status(403).json({
      success: false,
      message: "Technician access required.",
    });
  }
  next();
}

module.exports = verifyTechnician;
