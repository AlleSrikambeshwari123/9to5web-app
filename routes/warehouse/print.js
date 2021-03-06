var express = require('express');
var router = express.Router();
var middleware = require('../../middleware.js');
var printerController = require('../../Controller/PrinterController');

router.get('/download-pdf/awb/:id', middleware().checkSession, printerController.download_pdf_awb);
router.get('/download-pdf/pkg/:id', middleware().checkSession, printerController.download_pkg_labels);
router.get('/print-pdf/pkg/:id', middleware().checkSession, printerController.print_all_pkg_labels);
router.get('/print-awb/:awb', middleware().checkSession, printerController.send_print_awb);
router.get('/print-awb-lbl/:awb', middleware().checkSession, printerController.send_print_awb_labels);
router.get('/print-single-label/:awb/:pkgId', middleware().checkSession, printerController.send_print_single_label);
router.get('/pkg-label/download/:id', middleware().checkSession, printerController.download_pkg_label);
router.get('/pkg-label-excel/download/:id', middleware().checkSession, printerController.download_pkg_label_excel);
router.get('/fll/pkg-label/download/:id', middleware().checkSession, printerController.download_pkg_label);

module.exports = router;