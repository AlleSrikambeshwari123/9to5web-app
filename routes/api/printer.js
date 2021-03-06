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
router.get('/pdf/generate/pricelabel/:id', printerController.generate_price_label_pdf);

router.get(
  '/download-pdf/manifest/:id/air-cargo-manifest',
  printerController.downloadAirCargoManifest,
);
router.get(
  '/download-pdf/manifest/:id/flight-load-sheet',
  printerController.downloadFlightLoadSheet,
);
router.get('/download-pdf/manifest/:id/flight-manifest', printerController.downloadFlightManifest);
router.get('/download-pdf/manifest/:id/us-customs', printerController.downloadUSCustoms);
router.get('/download-pdf/delivery-report/:id', printerController.downloadDeliveryReport);

router.get('/download-pdf/cube/:id', printerController.downloadCubePdf);
router.get('/pdf/generate/cube/:id', printerController.generate_cube_pdf);

router.get('/pdf/generate/awb-purchase-order/:id', printerController.generate_awb_purchase_order_pdf);
router.get('/api/printer/pdf/generate/cubedetail/:id', printerController.generate_cude_detail_pdf)

module.exports = router;
