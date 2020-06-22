var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var cubeCtrl = require('../../Controller/CubeController');

router.get('/cube/list', middleware().checkSession, cubeCtrl.get_cube_list);
router.get('/cube/getall', middleware().checkSession, cubeCtrl.getAllCubes);
router.post('/cube/create', middleware().checkSession, cubeCtrl.add_new_cube);
router.post('/cube/cube2type/create', middleware().checkSession, cubeCtrl.add_new_cube2type);
router.put('/cube/cube2type/update', middleware().checkSession, cubeCtrl.update_cube2type);
router.get('/cube/cube2type', middleware().checkSession, cubeCtrl.get_cube2type_list);
router.delete('/cube/cube2type/:id', middleware().checkSession, cubeCtrl.delete_cube2type);
router.post('/cube/awb/update', middleware().checkSession, cubeCtrl.update_awb_cube);
router.get('/cube/manage/:id/get', middleware().checkSession, cubeCtrl.get_cube_detail);
router.get('/cube/detail/:id', middleware().checkSession, cubeCtrl.cube_detail);
router.get('/cube/awbDetail/:id', middleware().checkSession, cubeCtrl.cube_awb_detail);
router.post('/cube/manage/:id/update', middleware().checkSession, cubeCtrl.update_cube);
router.delete('/cube/manage/:id/delete', middleware().checkSession, cubeCtrl.delete_cube);


module.exports = router;