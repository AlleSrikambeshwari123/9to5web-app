var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var storeCtrl = require('../../Controller/StoreController');

router.get('/store-check-in', middleware().checkSession, storeCtrl.render_store_check_in);
router.post('/all_store-check-in', middleware().checkSession, storeCtrl.all_cable_store_check_in);
router.post('/all_store-check-in-albony', middleware().checkSession, storeCtrl.all_cable_store_check_in_albony);
router.get('/package/location/:id', middleware().checkSession, storeCtrl.get_location_packages);

module.exports = router;