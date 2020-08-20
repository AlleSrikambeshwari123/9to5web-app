var express = require('express');
var router = express.Router();
var customerCtrl = require('../../Controller/CustomerController');

router.get('/signup', customerCtrl.signup_customer);
router.post('/create', customerCtrl.add_new_customer);

module.exports = router;
