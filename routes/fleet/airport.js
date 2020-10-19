var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var airportCtrl = require('../../Controller/AirportController');

router.get('/airport/list', middleware().checkSession, airportCtrl.get_airport_list);
router.post('/airport/all-list', middleware().checkSession, airportCtrl.get_all_airport_list);
router.get('/airport/create', middleware().checkSession, airportCtrl.create_airport);
router.post('/airport/create', middleware().checkSession, airportCtrl.add_new_airport);
router.get(
  '/airport/manage/:id/get',
  middleware().checkSession,
  airportCtrl.get_airport_detail,
);
router.post(
  '/airport/manage/:id/update',
  middleware().checkSession,
  airportCtrl.update_airport,
);
router.delete(
  '/airport/manage/:id/delete',
  middleware().checkSession,
  airportCtrl.delete_airport,
);

module.exports = router;
