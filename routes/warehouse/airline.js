var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var airlineCtrl = require('../../Controller/AirlineController');

router.get('/airline/list', middleware().checkSession, airlineCtrl.get_airline_list);
router.get('/airline/create', middleware().checkSession, airlineCtrl.create_airline);
router.post('/airline/create', middleware().checkSession, airlineCtrl.add_new_airline);
router.get('/airline/manage/:id/get', middleware().checkSession, airlineCtrl.get_airline_detail);
router.post('/airline/manage/:id/update', middleware().checkSession, airlineCtrl.update_airline);
router.delete('/airline/manage/:id/delete', middleware().checkSession, airlineCtrl.delete_airline);

module.exports = router;