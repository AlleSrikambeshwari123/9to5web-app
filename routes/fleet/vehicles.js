var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var vehicleCtrl = require('../../Controller/VehicleController');

router.get('/vehicle/list', middleware().checkSession, vehicleCtrl.get_vehicle_list);
router.post('/vehicle/all-list', middleware().checkSession, vehicleCtrl.get_all_vehicle_list);
router.get('/vehicle/create', middleware().checkSession, vehicleCtrl.create_vehicle);
router.post('/vehicle/create', middleware().checkSession, vehicleCtrl.add_new_vehicle);
router.get('/vehicle/manage/:id/get', middleware().checkSession, vehicleCtrl.get_vehicle_detail);
router.post('/vehicle/manage/:id/update', middleware().checkSession, vehicleCtrl.update_vehicle);
router.delete('/vehicle/manage/:id/delete', middleware().checkSession, vehicleCtrl.delete_vehicle);

router.get('/vehicle/list/:location', middleware().checkSession, vehicleCtrl.get_location_vehicles);

module.exports = router;