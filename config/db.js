const { MongoClient } = require("mongodb");

let client;
let db;

async function connectDB() {
  if (db) return db;

  if (!process.env.MONGODB_URI || !process.env.DB_NAME) {
    throw new Error("MongoDB environment variables are missing.");
  }

  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  db = client.db(process.env.DB_NAME);
  await db.command({ ping: 1 });

  console.log("MongoDB connected successfully!");
  console.log("Database:", process.env.DB_NAME);

  return db;
}

function getDB() {
  if (!db) {
    throw new Error("Database is not connected.");
  }
  return db;
}

async function closeDB() {
  if (client) await client.close();
  client = null;
  db = null;
}

module.exports = { connectDB, getDB, closeDB };
