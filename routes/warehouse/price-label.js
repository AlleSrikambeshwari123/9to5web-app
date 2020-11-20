
var express = require('express');
var router = express.Router();

var middleware = require('../../middleware');
var priceCtrl = require('../../Controller/AwbPriceLabelController');
var printerCtrl = require('../../Controller/PrinterController');

router.get('/price/list', middleware().checkSession, priceCtrl.get_awb_list);
router.post('/price/all-list', middleware().checkSession, priceCtrl.get_all_awb_list);
router.get('/pricelabels/:id', middleware().checkSession, priceCtrl.get_pricelabel_awb);
router.get('/pricelabels-package/:id', middleware().checkSession, priceCtrl.get_awb_pricelabel);
router.post('/pricelabels/:id', middleware().checkSession, priceCtrl.add_pricelabel_awb);
router.post('/pricelabels/edit/:id', middleware().checkSession, priceCtrl.edit_pricelabel_awb);


router.get('/price-label/download/:id', middleware().checkSession, printerCtrl.download_pdf_pricelabel);
// router.get('/fll/package/list', middleware().checkSession, packageCtrl.get_fll_package_list);
// router.get('/fll/package/get/:awbId', middleware().checkSession, packageCtrl.get_awb_packages);
// router.get('/nas/package/list', middleware().checkSession, packageCtrl.get_nas_package_list);

module.exports = router;