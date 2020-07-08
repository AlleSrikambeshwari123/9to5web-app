var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var invoiceCtrl = require('../../Controller/InvoiceController');

router.get('/invoices/list', middleware().checkSession, invoiceCtrl.getInvoiceList);
router.post('/invoices/invoice-url', middleware().checkSession, invoiceCtrl.getInvoiceUrl);

module.exports = router;