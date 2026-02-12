const { MongoClient } = require("mongodb");

let client;
let db;

async function connectDB(uri) {
  if (db) return db; // reuse existing connection

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(); // uses db name from URI
  return db;
}

function getDB() {
  if (!db) throw new Error("DB not connected yet. Call connectDB() first.");
  return db;
}

module.exports = { connectDB, getDB };
