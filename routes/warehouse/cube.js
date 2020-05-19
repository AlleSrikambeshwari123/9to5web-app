var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var cubeCtrl = require('../../Controller/CubeController');

router.get('/cube/list', middleware().checkSession, cubeCtrl.get_cube_list);
router.post('/cube/create', middleware().checkSession, cubeCtrl.add_new_cube);
router.get('/cube/manage/:id/get', middleware().checkSession, cubeCtrl.get_cube_detail);
router.post('/cube/manage/:id/update', middleware().checkSession, cubeCtrl.update_cube);
router.delete('/cube/manage/:id/delete', middleware().checkSession, cubeCtrl.delete_cube);

module.exports = router;