var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var customerCtrl = require('../../Controller/CustomerChildController');

router.get('/customerchild/list', middleware().checkSession, customerCtrl.get_customer_list);
router.get('/customerchild/create', middleware().checkSession, customerCtrl.create_customer);
router.post('/customerchild/create', middleware().checkSession, customerCtrl.add_new_customer);
router.get('/customerchild/manage/:id/get', middleware().checkSession, customerCtrl.get_customer_detail);
router.post('/customerchild/manage/:id/update', middleware().checkSession, customerCtrl.update_customer);
router.delete('/customerchild/manage/:id/delete', middleware().checkSession, customerCtrl.delete_customer);

module.exports = router;