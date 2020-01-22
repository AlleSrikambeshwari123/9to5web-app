var express = require('express');
var router = express.Router();
var services = require('../../RedisServices/RedisDataServices');
var middleware = require('../../middleware');
var manifestCtrl = require('../../Controller/ManifestController');

module.exports = router;