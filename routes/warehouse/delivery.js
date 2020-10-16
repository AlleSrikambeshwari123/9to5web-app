var express = require('express');
var router = express.Router();
var services = require('../../Services/RedisDataServices');
var middleware = require('../../middleware');
var deliveryCtrl = require('../../Controller/DeliveryController');

router.get('/nas/delivery/list', middleware().checkSession, deliveryCtrl.get_delivery_list);
router.post('/nas/delivery/all-list', middleware().checkSession, deliveryCtrl.get_all_delivery_list);
// router.get('/nas/delivery/create', middleware().checkSession, deliveryCtrl.create_delivery)
router.post('/nas/delivery/create', middleware().checkSession, deliveryCtrl.add_new_delivery);
router.get('/nas/delivery/manage/:id/get', middleware().checkSession, deliveryCtrl.get_delivery_detail);

router.post('/nas/delivery/manage/:id/close', middleware().checkSession, deliveryCtrl.close_delivery);
// router.delete('/nas/delivery/manage/:id/delete', middleware().checkSession, deliveryCtrl.delete_delivery);

module.exports = router;