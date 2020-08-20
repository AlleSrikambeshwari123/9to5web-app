var express = require('express');
var router = express.Router();
var customerChildCtrl = require('../../Controller/CustomerChildController');
var middleware = require('../../middleware');

router.get('/customerchild/list/:customerId', middleware().checkSession, customerChildCtrl.get_sub_customer_list);
router.get('/customerchild/:customerId/create', middleware().checkSession, customerChildCtrl.create_sub_customer);
router.post('/customerchild/:customerId/create', middleware().checkSession, customerChildCtrl.add_new_customer);
router.get('/customerchild/:customerId/manage/:id/get', middleware().checkSession, customerChildCtrl.get_sub_customer_detail);
router.post('/customerchild/:customerId/manage/:id/update', middleware().checkSession, customerChildCtrl.update_customer);
router.delete('/customerchild/manage/:id/delete', middleware().checkSession, customerChildCtrl.delete_customer);

module.exports = router;

