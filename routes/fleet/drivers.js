var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var driverCtrl = require('../../Controller/DriverController');

router.get('/driver/list', middleware().checkSession, driverCtrl.get_driver_list);
router.post('/driver/all-list', middleware().checkSession, driverCtrl.get_all_driver_list);
router.get('/driver/create', middleware().checkSession, driverCtrl.create_driver);
router.post('/driver/create', middleware().checkSession, driverCtrl.add_new_driver);
router.get('/driver/manage/:id/get', middleware().checkSession, driverCtrl.get_driver_detail);
router.post('/driver/manage/:id/update', middleware().checkSession, driverCtrl.update_driver);
router.delete('/driver/manage/:id/delete', middleware().checkSession, driverCtrl.delete_driver);

router.get('/driver/list/:location', middleware().checkSession, driverCtrl.get_location_drivers);

module.exports = router;