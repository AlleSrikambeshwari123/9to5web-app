var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var pilotCtrl = require('../../Controller/PilotController');

router.get('/pilot/list', middleware().checkSession, pilotCtrl.get_pilot_list);
router.get('/pilot/create', middleware().checkSession, pilotCtrl.create_pilot);
router.post('/pilot/create', middleware().checkSession, pilotCtrl.add_new_pilot);
router.get('/pilot/manage/:id/get', middleware().checkSession, pilotCtrl.get_pilot_detail);
router.post('/pilot/manage/:id/update', middleware().checkSession, pilotCtrl.update_pilot);
router.delete('/pilot/manage/:id/delete', middleware().checkSession, pilotCtrl.delete_pilot);

module.exports = router;