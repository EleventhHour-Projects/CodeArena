import { redisClientPromise } from "./lib/redis";

async function checkRedis() {
    try {
        const redisClient = await redisClientPromise;
        if (!redisClient) {
            console.error("Failed to connect to Redis");
            return;
        }

        const keys = await redisClient.keys('executionCode:*');
        console.log(`Found ${keys.length} executionCode keys:`);
        
        for (const key of keys) {
            const val = await redisClient.get(key);
            console.log(`\nKey: ${key}`);
            console.log(`Value: ${val}`);
        }
        
        process.exit(0);
    } catch (err) {
        console.error("Error checking Redis:", err);
        process.exit(1);
    }
}

checkRedis();
