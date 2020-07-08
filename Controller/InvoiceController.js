var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var aws = require('../Util/aws');

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

exports.getInvoiceUrl = async (req,res,next)=>{
    const fileName = req.body.fileName;
    const file = aws.getSignedUrl(fileName);
    res.send(file);
}