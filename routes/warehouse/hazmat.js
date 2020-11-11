var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var hazmatCtrl = require('../../Controller/HazmatController');

router.get('/hazmat/list', middleware().checkSession, hazmatCtrl.get_hazmat_list);
router.post('/hazmat/listAll', middleware().checkSession, hazmatCtrl.get_all_hazmat_list);
router.post('/hazmat/create', middleware().checkSession, hazmatCtrl.add_new_hazmat);
router.get('/hazmat/manage/:id/get', middleware().checkSession, hazmatCtrl.get_hazmat_detail);
router.post('/hazmat/manage/:id/update', middleware().checkSession, hazmatCtrl.update_hazmat);
router.delete('/hazmat/manage/:id/delete', middleware().checkSession, hazmatCtrl.delete_hazmat);

module.exports = router;