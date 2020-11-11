var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var helpers = require('../views/helpers');

exports.render_store_check_in = (req, res, next) => {
  Promise.all([
    services.packageService.getPackagesForStores(req),
    services.locationService.getPackageLocations()
  ]).then(([packages,locations]) => {
    console.log({locations});
    res.render('pages/store/store-check-in', {
      page: req.originalUrl,
      title: 'Store Packages',
      user: res.user,
      packages: packages,
      locations: locations,
      clear: req.query.clear
    })
  });
}

exports.all_cable_store_check_in = (req, res,  next) => {
  if(req.body.clear){
    req.body.daterange = '';
  }
  var customerPmb = [
    {
        "customer.pmb":{
            $gt:0,
            $lte: 1999
        }
    },
    {
        "customer.pmb":{
            $gte:4000,
            $lte: 4999
        }
    }
 ]
  services.packageService.getPackagesForStoresList(req, customerPmb).then((packagesResult)=>{
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: packagesResult.total,
      recordsFiltered: packagesResult.total,
      data:[]
    }
    var data = [];
    var packages = packagesResult.packages?packagesResult.packages:[];
    for(var i=0; i< packages.length; i++){
      var packageDetail = [];
      let check = 1
      packages[i].dimensions.split('x').forEach(data =>{
        check = check * data
      })
      packages[i].volumetricWeight = (check/166); 
            
      packageDetail.push(packages[i].location ? packages[i].location : '');
      packageDetail.push(`<a href="/warehouse/pkg-label-excel/download/${packages[i]._id}">${helpers.formatDate(packages[i].createdAt)}</a>`)
      packageDetail.push(packages[i].trackingNo ? packages[i].trackingNo : '');
      packageDetail.push(packages[i].customer ? packages[i].customer.pmb + '-' + helpers.getFullName(packages[i].customer) : "")
      packageDetail.push(`<a class="text-decoration-none"
      href="/warehouse/nas/awb/manage/${packages[i].awb._id}/preview"><b>${packages[i].express ? '*': ''}</b>${packages[i].awb.awbId}
    </a>`);

      packageDetail.push(packages[i].description ? packages[i].description : '');
      packageDetail.push(packages[i].weight + ' lbs');
      packageDetail.push(packages[i].volumetricWeight.toFixed(2) + ' vlbs');
      packageDetail.push(`<a href="/warehouse/pkg-label/download/${packages[i]._id}"><i class="fa fa-download"></i></a>`)
      data.push(packageDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })
}

exports.all_cable_store_check_in_albony = (req, res, next) => {
  if(req.body.clear){
    req.body.daterange = '';
  }
  var customerPmb = [    
    {
        "customer.pmb":{
            $gte:3000,
            $lte: 3999
        }
    }
 ]
  services.packageService.getPackagesForStoresList(req, customerPmb).then((packagesResult)=>{
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: packagesResult.total,
      recordsFiltered: packagesResult.total,
      data:[]
    }
    var data = [];
    var packages = packagesResult.packages?packagesResult.packages:[];
    for(var i=0; i< packages.length; i++){
      var packageDetail = [];
      let check = 1
      packages[i].dimensions.split('x').forEach(data =>{
        check = check * data
      })
      packages[i].volumetricWeight = (check/166); 
            
      packageDetail.push(packages[i].location ? packages[i].location : '');
      packageDetail.push(`<a href="/warehouse/pkg-label-excel/download/${packages[i]._id}">${helpers.formatDate(packages[i].createdAt)}</a>`)
      packageDetail.push(packages[i].trackingNo ? packages[i].trackingNo : '');
      packageDetail.push(packages[i].customer ? packages[i].customer.pmb + '-' + helpers.getFullName(packages[i].customer) : "")
      packageDetail.push(`<a class="text-decoration-none"
      href="/warehouse/nas/awb/manage/${packages[i].awb._id}/preview"><b>${packages[i].express ? '*': ''}</b>${packages[i].awb.awbId}
    </a>`);

      packageDetail.push(packages[i].description ? packages[i].description : '');
      packageDetail.push(packages[i].weight + ' lbs');
      packageDetail.push(packages[i].volumetricWeight.toFixed(2) + ' vlbs');
      packageDetail.push(`<a href="/warehouse/pkg-label/download/${packages[i]._id}"><i class="fa fa-download"></i></a>`)
      data.push(packageDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })
}

exports.get_location_packages = (req, res, next) => {
  var locationId = req.params.id;
  services.packageService.getPackagesInLocation(locationId).then(packages => {
    Promise.all(packages.map(pkg => {
      return getFullPackage(pkg)
    })).then(pkgs => {
      res.send(pkgs);
    })
  })
}

var getFullPackage = (pkg) => {
  return new Promise((resolve, reject) => {
    services.awbService.getAwb(pkg.awbId).then(awb => {
      Promise.all([
        services.customerService.getCustomer(awb.customerId),
        services.packageService.getPackageLastStatus(pkg.id),
      ]).then(results => {
        pkg.customer = results[0];
        pkg.status = results[1];
        resolve(pkg);
      })
    })
  });
}