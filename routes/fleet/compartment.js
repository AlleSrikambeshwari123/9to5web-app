var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var compartmentCtrl = require('../../Controller/CompartmentController');

router.get('/compartment/:id', middleware().checkSession, compartmentCtrl.get_compartment);
router.get('/compartment/:planeId/list', middleware().checkSession, compartmentCtrl.get_compartment_list);
router.post('/compartment/:planeId/create', middleware().checkSession, compartmentCtrl.add_new_compartment);
router.delete('/compartment/:planeId/delete', middleware().checkSession, compartmentCtrl.delete_compartment);
router.post('/compartment/:planeId/update/:compartmentId', middleware().checkSession, compartmentCtrl.update_compartment);

module.exports = router;