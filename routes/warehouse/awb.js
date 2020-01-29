var express = require('express');
var router = express.Router();
var services = require('../../RedisServices/RedisDataServices');
var middleware = require('../../middleware');
var awbCtrl = require('../../Controller/AwbController');

router.get('/fll/awb/create', middleware().checkSession, awbCtrl.create_awb)
router.post('/fll/awb/create', middleware().checkSession, awbCtrl.add_new_awb);
router.get('/fll/awb/manage/:id/get', middleware().checkSession, awbCtrl.get_awb_detail);
router.get('/fll/awb/manage/:id/preview', middleware().checkSession, awbCtrl.preview_awb);
router.delete('/fll/awb/manage/:id/delete', middleware().checkSession, awbCtrl.delete_awb);
router.get('/fll/awb/list', middleware().checkSession, awbCtrl.get_awb_list);

module.exports = router;