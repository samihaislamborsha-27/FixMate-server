require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.MONGODB_URI || !process.env.DB_NAME) {
  console.error("Missing MongoDB environment configuration.");
  process.exit(1);
}

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);
let db;

app.get("/", (req, res) => {
  res.send("FixMate API is running!");
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "FixMate backend is healthy",
    database: db ? "Connected" : "Not connected"
  });
});

async function startServer() {
  try {
    await client.connect();

    db = client.db(process.env.DB_NAME);
    await db.command({ ping: 1 });

    console.log("MongoDB connected successfully!");
    console.log("Database:", process.env.DB_NAME);

    app.listen(PORT, () => {
      console.log(`FixMate server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
