
require('dotenv').config();
var redis = require('redis');
const strings = require('../Res/strings');
var moment = require('moment');
var uniqId = require('uniqid');


console.log('Creating Redis Client', process.env.REDIS_HOST);

var client = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST, {
  auth_pass: process.env.REDIS_PASS,
});
client.on('connect', () => {
  console.log("Connected to Redis...");
})

client.on('error', function (err) {
  console.log("REDIS ERROR : " + err);
  console.log((new Date()) + " Redis: disconnect");
  console.log('Reconnecting in 15000');
  setTimeout(createClient, 15000);
})

var createClient = () => {
  client = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST, {
    auth_pass: process.env.REDIS_PASS,
  });
}

var clientOptions = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  auth_pass: process.env.REDIS_PASS
}

module.exports = {
  redisClient: client,
  clientOptions: clientOptions
}