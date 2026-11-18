import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
export let collections = {};

export async function connectDB() {
  if (db) return collections;

  await client.connect();
  db = client.db("fixmate");

  // The 4 core FixMate collections (BetterAuth shares the 'user' collection)
  collections = {
    users: db.collection("user"),
    services: db.collection("services"),
    bookings: db.collection("bookings"),
    payments: db.collection("payments"),
  };

  // Ensure unique index on stripeSessionId so duplicate payments are impossible
  await collections.payments.createIndex(
    { stripeSessionId: 1 },
    { unique: true },
  );

  // Helpful indexes for public service filtering & sorting
  await collections.services.createIndex({
    approvalStatus: 1,
    isAvailable: 1,
    createdAt: -1,
  });

  console.log("Connected to MongoDB (fixmate) & initialized 4 collections");
  return collections;
}
