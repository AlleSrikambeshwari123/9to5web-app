var services = require('../Services/RedisDataServices');
var printerCtrl = require('./PrinterController');
var utils = require('../Util/utils');
var helpers = require('../views/helpers');

exports.get_awb_list = (req, res, next) => {
  if(req.query.clear){
    req.query.daterange = '';
  }
  services.awbService.getAwbsFull(req).then((awbs) => {
    res.render('pages/warehouse/awbprice/list-all', {
      page: req.originalUrl,
      user: res.user,
      title: 'All Price Label',
      filterURL: '',
      awbs: awbs,
      clear:req.query.clear,
    });
  });
};

exports.get_all_awb_list =  (req, res, next) => {
  services.awbService.getAllAwbsFull(req).then((awbResults) => {
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: awbResults.total,
      recordsFiltered: awbResults.total,
      data:[]
    }
    var data = [];
    var awbs = awbResults.awbs?awbResults.awbs:[];
    for(var i=0; i< awbs.length; i++){
      var awbDetail = [];
      var SumOfAllCharges = 0;
      if(awbs[i].pricelabel && (awbs[i].pricelabel).length && awbs[i].pricelabel[0])
      {
        var awbPriceLabel = awbs[i].pricelabel[0];
        awbPriceLabel.Brokerage = awbPriceLabel.Brokerage ? awbPriceLabel.Brokerage.toFixed(2) : 0
        awbPriceLabel.CustomsProc = awbPriceLabel.CustomsProc ? awbPriceLabel.CustomsProc.toFixed(2) : 0 
        awbPriceLabel.CustomsVAT = awbPriceLabel.CustomsVAT ? awbPriceLabel.CustomsVAT.toFixed(2) : 0 
        awbPriceLabel.Delivery =  awbPriceLabel.Delivery ? awbPriceLabel.Delivery.toFixed(2): 0 
        awbPriceLabel.Duty =  awbPriceLabel.Duty ? awbPriceLabel.Duty.toFixed(2) : 0
        awbPriceLabel.EnvLevy = awbPriceLabel.EnvLevy ? awbPriceLabel.EnvLevy.toFixed(2) : 0
        awbPriceLabel.Express = awbPriceLabel.Express ? awbPriceLabel.Express.toFixed(2) : 0
        awbPriceLabel.Freight = awbPriceLabel.Freight ? awbPriceLabel.Freight.toFixed(2) : 0
        awbPriceLabel.Hazmat = awbPriceLabel.Hazmat ? awbPriceLabel.Hazmat.toFixed(2) : 0
        awbPriceLabel.Insurance = awbPriceLabel.Insurance ? awbPriceLabel.Insurance.toFixed(2) : 0 
        awbPriceLabel.NoDocs = awbPriceLabel.NoDocs ? awbPriceLabel.NoDocs.toFixed(2) : 0
        awbPriceLabel.Pickup = awbPriceLabel.Pickup ? awbPriceLabel.Pickup.toFixed(2)  : 0
        awbPriceLabel.Sed = awbPriceLabel.Sed ? awbPriceLabel.Sed.toFixed(2) : 0
        awbPriceLabel.ServiceVat = awbPriceLabel.ServiceVat ? awbPriceLabel.ServiceVat.toFixed(2) : 0 
        awbPriceLabel.Storage = awbPriceLabel.Storage ? awbPriceLabel.Storage.toFixed(2) : 0 
        
        var SumOfAllCharges = Number(awbPriceLabel.CustomsVAT) 
        + Number(awbPriceLabel.ServiceVat)
        + Number(awbPriceLabel.Freight)
        + Number(awbPriceLabel.Duty)
        + Number(awbPriceLabel.CustomsProc)
        + Number(awbPriceLabel.EnvLevy)
        + Number(awbPriceLabel.NoDocs)
        + Number(awbPriceLabel.Insurance)
        + Number(awbPriceLabel.Storage)
        + Number(awbPriceLabel.Brokerage)
        + Number(awbPriceLabel.Express)
        + Number(awbPriceLabel.Delivery)
        + Number(awbPriceLabel.Hazmat)
        + Number(awbPriceLabel.Pickup)
        + Number(awbPriceLabel.Sed)


      }
      awbs[i].awbPriceLabel = SumOfAllCharges?SumOfAllCharges.toFixed(2):'';

      awbDetail.push(`<input type="checkbox" class="package-select" />
      <input class="checkPriceLabelExistPkg" value="${awbs[i]._id}" hidden />`);
      
      awbDetail.push(helpers.formatDate(awbs[i].createdAt));

      if((awbs[i]['customer'])){
        awbDetail.push((awbs[i]['customer'].lastName ? 
        `${awbs[i]['customer'].firstName} ${awbs[i]['customer'].lastName}` : 
        `${awbs[i]['customer'].firstName}`));
      }else{
        awbDetail.push('-');
      }
      awbDetail.push(awbs[i]['customer']? awbs[i]['customer'].pmb:'');
      awbDetail.push(`<a class="text-decoration-none"
      href="../../warehouse/nas/awb/manage/${awbs[i]._id}/preview">${awbs[i].awbId}</a>`);

      if (awbs[i]['shipper'] && (awbs[i]['shipper']).length && awbs[i]['shipper'][0].name) {
        awbDetail.push(awbs[i]['shipper'][0].name);
      }else{
        awbDetail.push('-')
      }
      awbDetail.push((awbs[i].carrier && (awbs[i].carrier).length && awbs[i].carrier[0].name)?awbs[i].carrier[0].name:'');
      awbDetail.push(awbs[i].awbPriceLabel? awbs[i].awbPriceLabel :'-');      
      awbDetail.push(`<a class="btn btn-link btn-primary btn-edit-pricelabel" data-toggle="modal" data-id="${awbs[i]._id}"
      data-original-title="Add Price" data-target="#pricelabel-popup"><i class="fa fa-edit"></i>`);
      let ifNotPriceLabel = 'ifNotPriceLabel'+ awbs[i]._id;

      awbDetail.push(`<button class="btn btn-link download-price-label ${ifNotPriceLabel}" data-id="${awbs[i]._id}" ><i
      class="fa fa-download ifNotPriceLabel"></i></button>`);

      awbDetail.push(`<a class="btn btn-link btn-primary btn-print-pkg ${ifNotPriceLabel}" data-toggle="modal"
      data-id="${awbs[i]._id}" data-original-title="Print Label" data-target="#print-pricelabel-popup"><i
        class="fa fa-print ifNotPriceLabel"></i>
      </a>`);
      data.push(awbDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })
}

exports.get_pricelabel_awb = (req,res) =>{
  services.AwbPriceLabelService.getPriceLabel(req.params.id).then((result)=>{
    res.send(result)
  })
}
exports.get_awb_pricelabel = (req,res) =>{
  services.AwbPriceLabelService.getAwbPriceLabel(req.params.id).then((result)=>{
    res.send(result)
  })
}

exports.add_pricelabel_awb = (req,res) =>{
  services.AwbPriceLabelService.updatePriceLabel(req.body,req.params.id).then((result)=>{
    res.send(result)
  })
}

exports.edit_pricelabel_awb = (req,res) =>{
  services.AwbPriceLabelService.editPriceLabel(req.body,req.params.id).then((result)=>{
    res.send(result)
  })
}
////////////////////////////////////////////////////////////////


exports.get_fll_package_list = (req, res, next) => {
  services.packageService.getPackagesInFll_updated().then((packages) => {
    res.render('pages/warehouse/package/list', {
      page: req.originalUrl,
      user: res.user,
      title: 'Packages On Hands Of FLL',
      filterURL: '',
      packages: packages,
    });
  });
};

exports.get_nas_package_list = (req, res, next) => {
  services.packageService.getPackagesInNas_updated().then((packages) => {
    res.render('pages/warehouse/package/list', {
      page: req.originalUrl,
      user: res.user,
      title: 'Packages On Hand Of NAS',
      filterURL: '',
      packages: packages,
    });
  });
};

exports.get_awb_packages = (req, res, next) => {
  services.packageService.getPackages_updated(req.params.awbId).then((packages) => {
    res.send(packages);
  });
};
