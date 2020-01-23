var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var shipperCtrl = require('../../Controller/ShipperController');

router.get('/shipper/list', middleware().checkSession, shipperCtrl.get_shipper_list);
router.get('/shipper/create', middleware().checkSession, shipperCtrl.create_shipper);
router.post('/shipper/create', middleware().checkSession, shipperCtrl.add_new_shipper);
router.get('/shipper/manage/:id/get', middleware().checkSession, shipperCtrl.get_shipper_detail);
router.post('/shipper/manage/:id/update', middleware().checkSession, shipperCtrl.update_shipper);
router.delete('/shipper/manage/:id/delete', middleware().checkSession, shipperCtrl.delete_shipper);

module.exports = router;