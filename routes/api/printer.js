var express = require('express');
var router = express.Router();
var printerController = require('../../Controller/PrinterController');

// Printing App APIs
router.post('/add-printer', printerController.add_printer);
router.get('/get-printers', printerController.get_printers);
router.get('/get-awb/:id', printerController.get_full_awb);
router.get('/download-pdf/awb/:id', printerController.download_pdf_awb);

module.exports = router;