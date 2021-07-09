var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var reportCtrl = require('../../Controller/ReportController');

router.get('/all-awb/status', middleware().checkSession, reportCtrl.all_awb_status);
router.get('/package/status', middleware().checkSession, reportCtrl.packagestatus);

router.get('/package-detail/reports',middleware().checkSession,reportCtrl.packagedetail)
router.get('/delivery-detail/reports',middleware().checkSession,reportCtrl.deliverydetail)

// router.get('/nodocsreport',middleware().checkSession,reportCtrl.nodocsreport)
// router.get('/agingreport',middleware().checkSession,reportCtrl.agingreport)
// router.get('/locationreport',middleware().checkSession,reportCtrl.locationreport)
// router.get('/awbreport',middleware().checkSession,reportCtrl.awbreport)
// router.get('/deliveryreport',middleware().checkSession,reportCtrl.deliveryreport)



router.get('/nodocsreport',middleware().checkSession,reportCtrl.nodocsReport)
router.get('/agingreport',middleware().checkSession,reportCtrl.agingReport)
router.get('/locationreport',middleware().checkSession,reportCtrl.locationReport)
router.get('/awbreport',middleware().checkSession,reportCtrl.awbReport)
router.get('/deliveryreport',middleware().checkSession,reportCtrl.deliveryReport)



router.post('/nodocsreport',middleware().checkSession,reportCtrl.gennodocsReport)
router.post('/agingreport',middleware().checkSession,reportCtrl.genagingReport)
router.post('/locationreport',middleware().checkSession,reportCtrl.genlocationReport)
router.post('/awbreport',middleware().checkSession,reportCtrl.genawbReport)
router.post('/deliveryreport',middleware().checkSession,reportCtrl.gendeliveryReport)








router.get('/package-report',middleware().checkSession,reportCtrl.packageReport)

router.post('/all-awb/status_report', middleware().checkSession, reportCtrl.all_awb_status_report);
router.post('/delivery-detail/report', middleware().checkSession, reportCtrl.delivery_detail_report);
router.post('/package-detail/report', middleware().checkSession, reportCtrl.package_detail_report);
//dashboard
router.post('/postbox-etc-package-detail/report', middleware().checkSession, reportCtrl.postbox_etc_package_report);
router.post('/ninetofive-package-detail/report', middleware().checkSession, reportCtrl.ninetofive_package_report);
router.post('/nodocs-detail/report', middleware().checkSession, reportCtrl.nodocs_package_report);
router.post('/users-detail/report', middleware().checkSession, reportCtrl.users_report);
router.post('/package-status-detail/report', middleware().checkSession, reportCtrl.package_status_report);

//allreport
router.get('/all-report/download', middleware().checkSession, reportCtrl.all_dowload_report);
module.exports = router;