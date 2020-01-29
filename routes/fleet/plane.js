var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var planeCtrl = require('../../Controller/PlaneController');

router.get('/plane/list', middleware().checkSession, planeCtrl.get_plane_list);
router.get('/plane/create', middleware().checkSession, planeCtrl.create_plane);
router.post('/plane/create', middleware().checkSession, planeCtrl.add_new_plane);
router.get('/plane/manage/:id/get', middleware().checkSession, planeCtrl.get_plane_detail);
router.post('/plane/manage/:id/update', middleware().checkSession, planeCtrl.update_plane);
router.delete('/plane/manage/:id/delete', middleware().checkSession, planeCtrl.delete_plane);

module.exports = router;