var express = require('express');
var router = express.Router();
var middleware = require('../../middleware');
var invoiceCtrl = require('../../Controller/InvoiceController');

router.get('/invoices/list', middleware().checkSession, invoiceCtrl.getInvoiceList);
router.post('/invoices/all-invoices', middleware().checkSession, invoiceCtrl.getAllInvoice);
router.get('/invoices/packageStatus/:id', middleware().checkSession, invoiceCtrl.getInvoicePackages);
router.post('/invoices/invoice-url', middleware().checkSession, invoiceCtrl.getInvoiceUrl);
router.delete('/invoices/invoice-url/:id/:fileName', middleware().checkSession, invoiceCtrl.deleteInvoiceUrl);

module.exports = router;