var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var userCtrl = require('../../Controller/UserController');

router.get('/users/list', middleware().checkSession, userCtrl.get_user_list);
router.get('/users/create', middleware().checkSession, userCtrl.create_user);
router.post('/users/create', middleware().checkSession, userCtrl.add_new_user);
router.get('/users/manage/:username/get', middleware().checkSession, userCtrl.get_user_detail);
router.post('/users/manage/:username/update', middleware().checkSession, userCtrl.update_user);
router.put('/users/manage/:username/enable', middleware().checkSession, userCtrl.enable_user);
router.delete('/users/manage/:username/delete', middleware().checkSession, userCtrl.delete_user);

module.exports = router;