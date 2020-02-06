var express = require('express');
var zip = require('express-zip');
var router = express.Router();
var printerController = require('../../Controller/PrinterController');

// Printing App APIs
router.post('/add-printer', printerController.add_printer);
router.get('/get-printers', printerController.get_printers);
router.get('/get-awb/:id', printerController.get_full_awb);
router.get('/download-pdf/awb/:id', printerController.download_pdf_awb);
router.get('/download-pdf/pkg/:id', printerController.download_pkg_labels);
router.get('/pdf/generate/awb/:id', printerController.generate_awb_pdf);
router.get('/pdf/generate/pkg/:id', printerController.generate_pkg_label_pdf);

module.exports = router;