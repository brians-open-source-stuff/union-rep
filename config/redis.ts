import { createClient } from "redis";

const redis = await createClient({
	url: process.env.REDIS_URL,
})
	.on("error", (error) => console.error("Redis Client Error", error))
	.connect();

export default redis;
