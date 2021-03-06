var express = require('express');
var router = express.Router();

var middleware = require('../../middleware');
var packageCtrl = require('../../Controller/PackageController');
var printerCtrl = require('../../Controller/PrinterController');

router.get('/package/list', middleware().checkSession, packageCtrl.get_package_list);
router.get('/package/package-detail/:id', middleware().checkSession, packageCtrl.get_package_detail);
router.post('/package/all-list', middleware().checkSession, packageCtrl.get_all_package_list);
router.get('/snapshot/package/list', middleware().checkSession, packageCtrl.get_package_list_snapshot);
router.get('/snapshot/package/list/report', middleware().checkSession, packageCtrl.get_package_list_snapshotReport);
router.get('/snapshot/package/:id', middleware().checkSession, packageCtrl.get_package_snapshot);
router.get('/snapshot/package/report/:id', middleware().checkSession, packageCtrl.get_package_snapshotReport);
router.get('/customer/package/list/:id', middleware().checkSession, packageCtrl.get_customer_package_list);
router.get('/package/locations', middleware().checkSession, packageCtrl.get_package_locations);
router.get('/package/locations/report', middleware().checkSession, packageCtrl.get_package_locationsReport);
router.get('/package/zones', middleware().checkSession, packageCtrl.get_package_zones);
router.get('/package/zones/report', middleware().checkSession, packageCtrl.get_package_zonesReport);
router.get('/package/list/:filter', middleware().checkSession, packageCtrl.get_filtered_package_list);
router.post('/package/all-deliver-list', middleware().checkSession, packageCtrl.get_all_delivered_package_list);
router.post('/package/all-list/:filter', middleware().checkSession, packageCtrl.get_all_filtered_package_list);
router.get('/package/pkg-label/download/:id', middleware().checkSession, printerCtrl.download_pkg_label);
router.get('/fll/package/list', middleware().checkSession, packageCtrl.get_fll_package_list);
router.get('/fll/package/get/:awbId', middleware().checkSession, packageCtrl.get_awb_packages);
router.post('/fll/package/all-list', middleware().checkSession, packageCtrl.get_all_nas_package_list);
router.get('/nas/package/list', middleware().checkSession, packageCtrl.get_nas_package_list);
router.post('/nas/package/all-list', middleware().checkSession, packageCtrl.get_all_nas_package_list);
router.get('/nas/package/aging', middleware().checkSession, packageCtrl.get_nas_package_aging);
router.post('/nas/package/all-aging', middleware().checkSession, packageCtrl.get_all_nas_package_aging);
router.get('/fll/package/no-docs', middleware().checkSession, packageCtrl.get_package_no_docs);
router.get('/fll/package/overviewfll/list', middleware().checkSession, packageCtrl.get_overview_fll);

module.exports = router;