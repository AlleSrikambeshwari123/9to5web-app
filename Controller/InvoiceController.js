var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var aws = require('../Util/aws');
var helpers = require('../views/helpers');

exports.getInvoiceList = (req, res, next) => {
  if(req.query.clear){
    req.query.daterange = '';
  } 
  Promise.all([
    services.invoiceService.getAllStoreInvoice(req),
    services.invoiceService.getInvoices(req),
    services.invoiceService.getAdditionalInvoices(req),
  ]).then(function (storeInvoices) {
      res.render('pages/admin/invoice/list', {
        page: req.originalUrl,
        title: 'All Invoice List',
        invoices: [...storeInvoices[0],...storeInvoices[1]],
        additionalInvoices : storeInvoices[2],
        user: res.user,
        clear:req.query.clear
      });
  })
  }


  exports.getInvoicePackages = (req, res, next) => {
      services.invoiceService.getSearchInvoice(req.params.id).then(async function (invoice) {
      let pkgstatus = await services.packageService.getPackagesWithStatus(invoice)
        res.send(pkgstatus);
      });
    }

exports.getInvoiceUrl = async (req,res,next)=>{
    const fileName = req.body.fileName;
    const file = aws.getSignedUrl(fileName);
    res.send(file);
}
exports.deleteInvoiceUrl = async (req,res,next)=>{
    const id = req.params.id;
    const fileName = req.params.fileName
    services.invoiceService.deleteStoreInvoice(id).then(async function (result) {
      if(result.success){
        await aws.deleteFile(fileName);
        res.send(result);
      }else{
        res.send(result)
      }
    })
}