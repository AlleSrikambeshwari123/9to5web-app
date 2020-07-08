var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');

exports.getInvoiceList = (req, res, next) => {
    services.invoiceService.getAllStoreInvoice().then(function (invoices) {
      res.render('pages/admin/invoice/list', {
        page: req.originalUrl,
        title: 'All Invoice List',
        invoices: invoices,
        user: res.user,
      });
    });
  }