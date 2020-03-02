var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var serviceChargeCtrl = require('../../Controller/ServiceChargeController');

router.get('/service-charge/list', middleware().checkSession, serviceChargeCtrl.get_charge_list);
router.post('/service-charge/create', middleware().checkSession, serviceChargeCtrl.add_new_charge);
router.get('/service-charge/manage/:id/get', middleware().checkSession, serviceChargeCtrl.get_charge_detail);
router.post('/service-charge/manage/:id/update', middleware().checkSession, serviceChargeCtrl.update_charge);
router.delete('/service-charge/manage/:id/delete', middleware().checkSession, serviceChargeCtrl.delete_charge);

module.exports = router;