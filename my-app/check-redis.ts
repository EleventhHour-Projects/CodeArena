import { redisClientPromise } from "./lib/redis";

async function checkRedis() {
    try {
        const redisClient = await redisClientPromise;
        if (!redisClient) {
            console.error("Failed to connect to Redis");
            return;
        }

        const keys = await redisClient.keys('executionCode:*');
        console.log(`\n--- Redis Keys (executionCode:*) ---`);
        console.log(`Found ${keys.length} execution record keys.`);
        
        for (const key of keys) {
            const val = await redisClient.get(key);
            console.log(`  Key: ${key}`);
            // console.log(`  Value: ${val}`); // Uncomment if you want to see the full record
        }

        const queueLength = await redisClient.lLen('tasks');
        console.log(`\n--- Redis Queue (tasks) ---`);
        console.log(`Current Queue Length: ${queueLength}`);
        
        if (queueLength > 0) {
            const queueItems = await redisClient.lRange('tasks', 0, -1);
            console.log(`Items in Queue (MongoDB IDs):`);
            queueItems.forEach((item, index) => {
                console.log(`  [${index}] ID: ${item}`);
            });
        }
        
        process.exit(0);
    } catch (err) {
        console.error("Error checking Redis:", err);
        process.exit(1);
    }
}

checkRedis();
