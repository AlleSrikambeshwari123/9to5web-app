var express = require('express');
var router = express.Router();

var middleware = require('../../middleware');
var packageCtrl = require('../../Controller/PackageController');
var printerCtrl = require('../../Controller/PrinterController');

router.get('/package/list', middleware().checkSession, packageCtrl.get_package_list);
router.get('/package/list/:filter', middleware().checkSession, packageCtrl.get_filtered_package_list);
router.get('/package/pkg-label/download/:id', middleware().checkSession, printerCtrl.download_pkg_label);
router.get('/fll/package/list', middleware().checkSession, packageCtrl.get_fll_package_list);
router.get('/fll/package/get/:awbId', middleware().checkSession, packageCtrl.get_awb_packages);
router.get('/nas/package/list', middleware().checkSession, packageCtrl.get_nas_package_list);

module.exports = router;