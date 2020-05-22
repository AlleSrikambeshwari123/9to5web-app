var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var zoneCtrl = require('../../Controller/ZoneController');

router.get('/zones/list', middleware().checkSession, zoneCtrl.get_zone_list);
router.get('/zones/create', middleware().checkSession, zoneCtrl.create_zones);
router.post('/zones/create', middleware().checkSession, zoneCtrl.add_new_zone);
router.get('/zones/manage/:id/get', middleware().checkSession, zoneCtrl.get_zone);
router.post('/zones/manage/:id/update', middleware().checkSession, zoneCtrl.update_zone);
router.delete('/zones/manage/:id/delete', middleware().checkSession, zoneCtrl.delete_zone);

module.exports = router;