var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var locationCtrl = require('../../Controller/LocationController');

router.get('/locations/list', middleware().checkSession, locationCtrl.get_location_list);
router.get('/locations/create', middleware().checkSession, locationCtrl.create_location);
router.post('/locations/create', middleware().checkSession, locationCtrl.add_new_location);
router.get('/locations/manage/:id/get', middleware().checkSession, locationCtrl.get_location);
router.post('/locations/manage/:id/update', middleware().checkSession, locationCtrl.update_location);
router.delete('/locations/manage/:id/delete', middleware().checkSession, locationCtrl.delete_location);

module.exports = router;