var redis = require('redis');

console.log('Creating Redis Client', process.env.REDIS_HOST);

const client = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST, {
    auth_pass: process.env.REDIS_PASS,
});
client.on('connect', () => {
    console.log("Connected to Redis...");
})

var clientOptions = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    auth_pass: process.env.REDIS_PASS
}

module.exports = {
    redisClient: client,
    clientOptions: clientOptions
}