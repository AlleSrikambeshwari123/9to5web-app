var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var awbCtrl = require('../../Controller/AwbController');

//========== FLL AirWay Bills ==========//
router.get('/fll/awb/create', middleware().checkSession, awbCtrl.create_awb)
router.post('/fll/awb/create', middleware().checkSession, awbCtrl.add_new_awb);

router.post('/fll/awb/manage/:id/create', middleware().checkSession, awbCtrl.update_awb);

router.get('/fll/awb/manage/:id/get', middleware().checkSession, awbCtrl.get_awb_detail);
router.get('/fll/awb/manage/:id/preview', middleware().checkSession, awbCtrl.preview_awb);
router.delete('/fll/awb/manage/:id/delete', middleware().checkSession, awbCtrl.delete_awb);
router.get('/fll/awb/manage/:awbId/print', middleware().checkSession, awbCtrl.generate_awb_pdf);

router.get('/fll/awb/list', middleware().checkSession, awbCtrl.get_awb_list);
router.get('/fll/awb/no-docs', middleware().checkSession, awbCtrl.get_awb_no_docs);
router.post('/fll/awb/create-barcode', awbCtrl.add_bar_code);
router.get('/fll/awb/refresh-barcode', awbCtrl.refresh_barcode);

//========== NAS AirWay Bills ==========//
router.get('/nas/awb/no-docs', middleware().checkSession, awbCtrl.nas_no_docs);

module.exports = router;
