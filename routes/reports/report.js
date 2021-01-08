var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var reportCtrl = require('../../Controller/ReportController');

router.get('/all-awb/status', middleware().checkSession, reportCtrl.all_awb_status);
router.post('/all-awb/status_report', middleware().checkSession, reportCtrl.all_awb_status_report);
router.post('/delivery-detail/report', middleware().checkSession, reportCtrl.delivery_detail_report);
router.post('/package-detail/report', middleware().checkSession, reportCtrl.package_detail_report);
//dashboard
router.post('/postbox-etc-package-detail/report', middleware().checkSession, reportCtrl.postbox_etc_package_report);
router.post('/ninetofive-package-detail/report', middleware().checkSession, reportCtrl.ninetofive_package_report);
router.post('/nodocs-detail/report', middleware().checkSession, reportCtrl.nodocs_package_report);
router.post('/users-detail/report', middleware().checkSession, reportCtrl.users_report);
//allreport
router.get('/all-report/download', middleware().checkSession, reportCtrl.all_dowload_report);
module.exports = router;