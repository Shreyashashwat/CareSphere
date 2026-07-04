import { createClient } from "redis";

const redisClient = createClient({
  url: "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("Redis Error:", err));
redisClient.on("connect", () => console.log("Redis connected via Docker"));

redisClient.connect().catch((err) => {
  console.error("Redis connection failed:", err);
});

export default redisClient;