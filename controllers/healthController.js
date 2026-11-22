const asyncHandler = require("../utils/asyncHandler");
const { getDB } = require("../config/db");

const getHealth = asyncHandler(async (req, res) => {
  const db = getDB();
  await db.command({ ping: 1 });

  res.status(200).json({
    success: true,
    message: "FixMate backend is healthy",
    database: "Connected"
  });
});

module.exports = { getHealth };
