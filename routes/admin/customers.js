var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var customerCtrl = require('../../Controller/CustomerController');

router.get('/customers/list', middleware().checkSession, customerCtrl.get_customer_list);

module.exports = router;