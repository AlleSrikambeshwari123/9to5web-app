var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var aws = require('../Util/aws');
var helpers = require('../views/helpers');

exports.getInvoiceList = (req, res, next) => {
 
      res.render('pages/admin/invoice/list', {
        page: req.originalUrl,
        title: 'All Invoice List',
        invoices: [],
        user: res.user,
        daterange:req.query.daterange?req.query.daterange:'',
        clear:req.query.clear
      });
    
  }

  exports.getAllInvoice = (req, res, next) =>{
    if(req.body.clear){
      req.body.daterange = '';
    }
    Promise.all([
      services.invoiceService.getAllStoreInvoice(),
      services.invoiceService.getInvoices()
    ]).then(function (storeInvoices) {
      var inovices = [...storeInvoices[0],...storeInvoices[1]]
      services.invoiceService.getAllInvoice(req, inovices).then(async function (invoiceresult) {
        var dataTable = {
          draw: req.query.draw,
          recordsTotal: invoiceresult.total,
          recordsFiltered: invoiceresult.total,
          data:[]
        }
        var data = [];
        var invoices = invoiceresult.invoices?invoiceresult.invoices:[];
        for(var i=0; i< invoices.length; i++){
          var invoiceDetail = [];
          var awbNumber = (invoices[i].awbId) ?invoices[i].awb.awbId : ''
          var awbNumberLink = invoices[i].awb ? invoices[i].awb._id: '#'
          var fileName = (invoices[i].fileName) ? invoices[i].fileName :invoices[i].filename
          invoiceDetail.push(`<a class="text-decoration-none"
          href="/warehouse/nas/awb/manage/${awbNumberLink}/preview">
           ${awbNumber}</a>`);
          invoiceDetail.push(helpers.formatDate(invoices[i].createdAt));
          invoiceDetail.push(`<a href="JavaScript:Void(0);"
          onclick="downloadInvoice('${fileName}')">Invoice</a>`);

          invoiceDetail.push(`<button class="btn btn-primary btn-view-invoice-package btn-round float-right ml-md-auto" data-toggle="modal"
          data-original-title="View Packages" data-id="${invoices[i]._id}" data-target="#invoice-packages">View</button>`)

          invoiceDetail.push(`<a href="JavaScript:Void(0);"
                    onclick="deleteInvoice('${fileName}','${invoices[i]._id}')"><i
                      class="fa fa-trash"></i>`);
          
          data.push(invoiceDetail);
        }
        dataTable.data = data;
        res.json(dataTable);
      })
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