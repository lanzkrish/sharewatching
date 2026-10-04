import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose | null> | null;
  lastFailedTime: number;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
  lastFailedTime: 0,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) {
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  // If connection failed recently, avoid delaying requests with 2.5s timeout on every call
  if (Date.now() - cached.lastFailedTime < 60000) {
    return null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 1500,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        console.log("Connected to MongoDB successfully");
        return m;
      })
      .catch((err) => {
        console.warn(
          "MongoDB not connected, running with high-performance local store:",
          err.message
        );
        cached.lastFailedTime = Date.now();
        cached.promise = null;
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.lastFailedTime = Date.now();
    cached.promise = null;
    return null;
  }

  return cached.conn;
}
