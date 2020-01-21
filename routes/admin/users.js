var express = require('express');
var router = express.Router();
var services = require('../../RedisServices/RedisDataServices');
var middleware = require('../../middleware');
var userCtrl = require('../../Controller/UserController');
/* GET users listing. */

router.get('/users/list', middleware(services.userService).checkSession, userCtrl.get_user_list);
router.get('/users/manage/:username/get', middleware(services.userService).checkSession, userCtrl.get_user_detail);
router.post('/users/manage/:id/update', middleware(services.userService).checkSession, userCtrl.update_user);
router.put('/users/manage/:id/enable', middleware(services.userService).checkSession, userCtrl.enable_user);
router.delete('/users/manage/:username/delete', middleware(services.userService).checkSession, userCtrl.delete_user);

module.exports = router;