var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var serviceTypeCtrl = require('../../Controller/ServiceTypeController');

router.get('/service-type/list', middleware().checkSession, serviceTypeCtrl.get_service_type_list);
router.get('/service-type/create', middleware().checkSession, serviceTypeCtrl.create_service_type);
router.post('/service-type/create', middleware().checkSession, serviceTypeCtrl.add_new_service_type);
router.get('/service-type/manage/:id/get', middleware().checkSession, serviceTypeCtrl.get_service_type_detail);
router.post('/service-type/manage/:id/update', middleware().checkSession, serviceTypeCtrl.update_service_type);
router.delete('/service-type/manage/:id/delete', middleware().checkSession, serviceTypeCtrl.delete_service_type);

module.exports = router;