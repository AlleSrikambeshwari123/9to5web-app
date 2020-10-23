var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var carrierCtrl = require('../../Controller/CarrierController');

router.get('/carrier/list', middleware().checkSession, carrierCtrl.get_carrier_list);
router.post('/carrier/listAll', middleware().checkSession, carrierCtrl.get_all_carrier_list);
router.get('/carrier/create', middleware().checkSession, carrierCtrl.create_carrier);
router.post('/carrier/create', middleware().checkSession, carrierCtrl.add_new_carrier);
router.get('/carrier/manage/:id/get', middleware().checkSession, carrierCtrl.get_carrier_detail);
router.post('/carrier/manage/:id/update', middleware().checkSession, carrierCtrl.update_carrier);
router.delete('/carrier/manage/:id/delete', middleware().checkSession, carrierCtrl.delete_carrier);

module.exports = router;