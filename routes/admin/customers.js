var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var customerCtrl = require('../../Controller/CustomerController');

router.get('/customers/list', middleware().checkSession, customerCtrl.get_customer_list);
router.get('/customers/create', middleware().checkSession, customerCtrl.create_customer);
router.post('/customers/create', middleware().checkSession, customerCtrl.add_new_customer);
router.get('/customers/manage/:id/get', middleware().checkSession, customerCtrl.get_customer_detail);
router.post('/customers/manage/:id/update', middleware().checkSession, customerCtrl.update_customer);
router.delete('/customers/manage/:id/delete', middleware().checkSession, customerCtrl.delete_customer);

module.exports = router;