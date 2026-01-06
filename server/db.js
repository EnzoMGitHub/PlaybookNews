import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

let client;
let db;

export async function connectDB() {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Err");
  const dbName = process.env.MONGODB_DBNAME;

  client = new MongoClient(uri);
  await client.connect();

  db = client.db(dbName);

  console.log(`Connected to database ${dbName}`);
  return db;
}

export function getDB() {
  if (!db) throw new Error("must connect to DB first");
  return db;
}
