var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var paidTypeCtrl = require('../../Controller/PaidTypeController');

router.get('/paid-type/list', middleware().checkSession, paidTypeCtrl.get_paid_type_list);
router.post('/paid-type/listAll', middleware().checkSession, paidTypeCtrl.get_all_paid_type_list);
router.get('/paid-type/create', middleware().checkSession, paidTypeCtrl.create_paid_type);
router.post('/paid-type/create', middleware().checkSession, paidTypeCtrl.add_new_paid_type);
router.get('/paid-type/manage/:id/get', middleware().checkSession, paidTypeCtrl.get_paid_type_detail);
router.post('/paid-type/manage/:id/update', middleware().checkSession, paidTypeCtrl.update_paid_type);
router.delete('/paid-type/manage/:id/delete', middleware().checkSession, paidTypeCtrl.delete_paid_type);

module.exports = router;