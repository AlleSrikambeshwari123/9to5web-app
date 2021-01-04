var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var reportCtrl = require('../../Controller/ReportController');

router.get('/all-awb/status', middleware().checkSession, reportCtrl.all_awb_status);
router.post('/all-awb/status_report', middleware().checkSession, reportCtrl.all_awb_status_report);
router.get('/all-report/download', middleware().checkSession, reportCtrl.all_dowload_report);
module.exports = router;