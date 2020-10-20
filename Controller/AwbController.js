const services = require('../Services/RedisDataServices');
const printerCtrl = require('./PrinterController');
const utils = require('../Util/utils');
const aws = require('../Util/aws');

const mongoose = require('mongoose');
const moment = require('moment');
var momentz = require('moment-timezone')
var countries = require('../public/js/countries');
var helpers = require('../views/helpers')

exports.preview_awb_invoice = (req, res, next) => {
  let id =res.user._id

  services.awbService.getAwbsCustomer(id).then((awb)=>{
      awb['dateCreated'] = momentz(awb.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');
      awb._doc.createdBy = awb.createdBy ? (awb.createdBy.firstName || '')  + (awb.createdBy.lastName || ''): ''
      if (awb.invoices && awb.invoices.length) {
        awb.invoices = awb.invoices.map(invoice => {
          if (invoice.filename) {
          invoice.link = aws.getSignedUrl(invoice.filename);
        }
      invoice['dateCreated'] = momentz(invoice.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');
      return invoice;
      });
      }
      res.render('pages/warehouse/awb/invoice', {
        page: req.originalUrl,
        title: "AWB #" + awb.awbId,
        user: res.user,
        awb: awb,
        shipper: awb.shipper,
        carrier: awb.carrier,
        hazmat: awb.hazmat
      });
  });
};

exports.preview_awb = (req, res, next) => {
  let id = req.params.id;
  
  services.awbService.getAwbPreviewDetails(id).then((awb) => {
    awb['dateCreated'] = momentz(awb.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');
    awb._doc.createdBy = awb.createdBy ? (awb.createdBy.firstName || '')  + (awb.createdBy.lastName || ''): ''
    if (awb.invoices && awb.invoices.length) {
      awb.invoices = awb.invoices.map(invoice => {
        if (invoice.filename) {
          invoice.link = aws.getSignedUrl(invoice.filename);
        }
        return invoice;
      });
    }
    res.render('pages/warehouse/awb/preview', {
      page: req.originalUrl,
      title: "AWB #" + awb.awbId,
      user: res.user,
      awb: awb,
      shipper: awb.shipper,
      carrier: awb.carrier,
      hazmat: awb.hazmat
    });
  });
};

exports.get_awb_detail = (req, res, next) => {
  const id = req.params.id;
  Promise.all([
    services.customerService.getCustomers(),
    services.hazmatService.getHazmats(),
    services.shipperService.getAllShippers(),
    services.carrierService.getAllCarriers(),
    services.awbService.getAwb(id),
    services.packageService.getAWBPackagesWithLastStatus_updated(id),
    services.locationService.getLocations(),
    services.invoiceService.getInvoicesByAWB(id),
    services.paidTypeService.getAllPaidTypes(),
    services.serviceTypeService.getAllServiceTypes(),
    services.awbService.getPurchaseOrder(id),
    services.packageService.getProcessOriginBarcode(res.user),
    services.packageService.getAllOriginBarcodes(),
    services.driverService.getDrivers()
  ]).then(([
    customers,
    hazmats,
    shippers,
    carriers,
    awb,
    packages,
    locations,
    invoices,
    paidTypes,
    serviceTypes,
    purchaseOrder,
    processBarcode,
    barcodes,
    drivers
  ]) => {
    awb['customer'] = awb['customerId'];
    res.render('pages/warehouse/awb/edit', {
      page: req.originalUrl,
      title: 'AWB Details',
      user: res.user,
      printer: res.printer,
      customers,
      hazmats,
      shippers,
      carriers,
      awb,
      packages,
      locations,
      invoices,
      paidTypes,
      serviceTypes,
      purchaseOrder,
      processBarcode,
      barcodes,
      drivers
    });
  })
};

exports.create_awb = (req, res, next) => {  
  Promise.all([
    services.customerService.getCustomers(),
    services.hazmatService.getHazmats(),
    services.shipperService.getAllShippers(),
    services.carrierService.getAllCarriers(),
    services.serviceTypeService.getAllServiceTypes(),
    services.locationService.getLocations(),
    services.paidTypeService.getAllPaidTypes(),
    services.packageService.getAllOriginBarcode(),
    services.packageService.getProcessOriginBarcode(res.user),
    services.locationService.getCompanies(),
    services.driverService.getDrivers()
  ]).then(([
    customers,
    hazmats,
    shippers,
    carriers,
    serviceTypes,
    locations,
    paidTypes,
    barcodes,
    processBarcode,
    companies,
    drivers
  ]) => {
    res.render('pages/warehouse/awb/create', {
      page: req.originalUrl,
      title: 'Create New AWB',
      user: res.user,
      printer: res.printer,
      countries : countries.default,
      customers,
      hazmats,
      shippers,
      carriers,
      serviceTypes,
      locations,
      paidTypes,
      barcodes,
      processBarcode,
      companies,
      drivers
    });
  })
};

exports.add_new_awb = async (req, res, next) => {
  let {invoices, ...awb} = req.body;
  let packages = JSON.parse(awb.packages);
  let purchaseOrders = JSON.parse(awb.purchaseOrder);
  
  const awbId = mongoose.Types.ObjectId();
  const invoiceIds = [];
  // Creating Invoices
  await Promise.all((invoices || []).map(invoice => {
    invoice['_id'] = mongoose.Types.ObjectId();
    invoice.awbId = awbId;
    invoice['createdBy'] = req['userId'];
    invoiceIds.push(invoice['_id']);
    return services.invoiceService.create(invoice);
  }));

  const packagesIds = [];
  packages.forEach(pkg => {
    pkg['_id'] = mongoose.Types.ObjectId();
    pkg.customerId = awb.customerId;
    pkg.shipperId = awb.shipper;
    pkg.carrierId = awb.carrier;
    if (awb.hazmat) {
      pkg.hazmatId = awb.hazmat;
    }
    pkg.createdBy = req['userId'];
    packagesIds.push(pkg['_id']);
  });
  // Creating Packages
  await services.packageService.createPackages(awbId, packages);

  const purchaseOrderIds = [];
  // PurchaseOrders
  if (purchaseOrders && purchaseOrders.length) {
    purchaseOrders.forEach(purchaseOrder => {
      purchaseOrder['_id'] = mongoose.Types.ObjectId();
      purchaseOrder['createdBy'] = req['userId'];
      purchaseOrderIds.push(purchaseOrder['_id']);
    });
    await services.awbService.createPurchaseOrders(awbId, purchaseOrders);
  }
  
  awb.packages = packagesIds;
  awb.invoices = invoiceIds;
  awb.purchaseOrders = purchaseOrderIds;

  awb['_id'] = awbId;
  awb['createdBy'] = req['userId'];
  awb['updatedBy'] = req['userId'];

  services.awbService.createAwb(awb).then(async result => {
    res.send(result);
  })
  .catch((error) => {
    console.log('error While creating the AWB', error);
  });
};

exports.update_awb = (req, res, next) => {
  let awbId = req.params.id;
  let {invoices, ...awb} = req.body;
  console.log('bodydd',req.body)
  let packages = JSON.parse(awb.packages);
  let purchaseOrders = JSON.parse(awb.purchaseOrder);

  const invoiceIds = [];
  const packageIds = [];
  const purchaseOrderIds = [];
  const promises = [];

  // Invoice create and update
  if (invoices && invoices.length) {
    invoices.forEach((invoice) => {
      if (invoice['id']) {
        invoice.awbId = awbId;
        invoiceIds.push(invoice['id']);
        promises.push(() => services.invoiceService.updateInvoice(invoice.id, invoice));
      } else {
        invoice.awbId = awbId;
        invoice['_id'] = mongoose.Types.ObjectId();
        invoice['createdBy'] = req['userId'];
        invoiceIds.push(invoice['_id']);
        promises.push(() => services.invoiceService.create(invoice));
      }  
    });
  }

  // Package create and update
  if (packages && packages.length) {
    packages.forEach((package) => {
      if (package['deleted']) {
        promises.push(() => services.packageService.removePackage_updated(package._id));
        return;
      }

      package.customerId = awb.customerId;
      package.shipperId = awb.shipper;
      package.carrierId = awb.carrier;

      if (package['awbId']) {
        packageIds.push(package['_id']);
        promises.push(() => services.packageService.updatePackage_updated(package._id, package));
      } else {
        package.awbId = awbId;
        if (awb.hazmat) {
          package.hazmatId = awb.hazmat;
        }
        package['_id'] = mongoose.Types.ObjectId();
        package['createdBy'] = req['userId'];
        packageIds.push(package['_id']);
        promises.push(() => services.packageService.createPackages(awbId, [package]));
      }  
    });
  }

  // PurchaseOrders create and update
  if (purchaseOrders && purchaseOrders.length) {
    purchaseOrders.forEach((purchaseOrder) => {
      if (purchaseOrder['deleted']) {
        promises.push(() => services.awbService.removePurchaseOrder(purchaseOrder._id));
        return;
      }
      if (purchaseOrder['awbId']) {
        purchaseOrderIds.push(purchaseOrder['_id']);
        promises.push(() => services.awbService.updatePurchaseOrder(purchaseOrder['_id'], purchaseOrder));
      } else {
        purchaseOrder.awbId = awbId;
        purchaseOrder['_id'] = mongoose.Types.ObjectId();
        purchaseOrder['createdBy'] = req['userId'];
        purchaseOrderIds.push(purchaseOrder['_id']);
        promises.push(() => services.awbService.createPurchaseOrders(awbId, [purchaseOrder]));
      }
    });
  }

  awb.invoices = invoiceIds;
  awb.updatedBy = req['userId'];
  awb.packages = packageIds;
  awb.purchaseOrders = purchaseOrderIds;
  // Updating awb
  services.awbService.updateAwb(awbId, awb, req['userId'])
  .then(async (result) => {
    // Updating or creating invoices, purchaseOrders and packages
    await Promise.all(promises.map((promise) => promise()));
    res.send(result);
  })
  .catch((err) => {
    console.log(err);
  });
};

exports.get_awb_list = (req, res, next) => {
  // services.awbService.getAwbsFull().then(awbs => {
  //   for(let awb of awbs){
  //     awb.volumetricWeight = 0
  //     awb.packages.forEach(package=>{
  //       let check = 1
  //       package.dimensions.split('x').forEach(data =>{
  //         check = check * data
  //       })
  //       awb.volumetricWeight = (check/166);
  //     })
  //   }
    res.render('pages/warehouse/awb/list', {
      page: req.originalUrl,
      title: "AirWay Bills",
      user: res.user,
      awbs: [],//awbs,
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    })
  // })
};

checkCondition = (awb,status) =>{
  if(status == 1)
    return (awb.packages.length > 0)
  else if(status == 2)
    return (!awb.invoice)
  else if(status == 3)
    return (awb.packages.length === 0)
  else if(status == 4)
    return (awb.fll_pickup)
}

exports.get_all_awb = (req, res, next) => {
  // let status = req.body.status
  if(req.body.clear)
    req.body.daterange =''

  services.awbService.getAllAwbsFull(req).then(results => {
    const awbs = results.awbs;
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: results.total,
      recordsFiltered: results.total,
      data:[]
    }
    let data = [];
    for(var i=0; i< awbs.length; i++){
      // if(checkCondition(awbs[i],status)){
        var awbDetail = [];
        awbs[i].volumetricWeight = 0
        awbs[i].packages.forEach(package=>{
          let check = 1
          package.dimensions.split('x').forEach(data =>{
            check = check * data
          })
          awbs[i].volumetricWeight = (check/166);
        })
        if(awbs[i].customer[0] && awbs[i].customer[0].pmb){
          awbDetail.push(awbs[i].customer[0].pmb);
        }else
          awbDetail.push('');

        awbDetail.push(helpers.formatDate(awbs[i].createdAt));
        awbDetail.push(`<a href="manage/${awbs[i]._id}/preview">${awbs[i].awbId}</a>`)
        awbDetail.push(helpers.getFullName(awbs[i].customer[0]))
        if(awbs[i].shipper[0] && awbs[i].shipper[0].name)
          awbDetail.push(awbs[i].shipper[0].name)
        else
          awbDetail.push('')

        if(awbs[i].driver[0])
          awbDetail.push(awbs[i].driver[0].firstName +' ' + awbs[i].driver[0].lastName)
        else
          awbDetail.push('')

        if(awbs[i].carrier[0] && awbs[i].carrier[0].name)
          awbDetail.push(awbs[i].carrier[0].name)
        else
          awbDetail.push('')

        if(awbs[i].packages)
          awbDetail.push(awbs[i].packages.length)
        else
          awbDetail.push(0)
        let weight = awbs[i].weight ? awbs[i].weight : 0
        awbDetail.push(weight + ' lbs')
        awbDetail.push(awbs[i].volumetricWeight.toFixed(2) + ' vlbs')
        
        let action = `<a href='manage/${awbs[i]._id}/get' class="btn btn-link btn-primary px-1" data-toggle="tooltip"
        data-original-title="Edit"> <i class="fa fa-pen"></i> </a>`+
        `<button class="btn btn-link btn-primary btn-print-awb p-1" onclick='printAwb(this)' data-toggle="modal" data-id="${awbs[i]._id}"
      data-target="#print-popup"> <i class="fa fa-print"></i> </button>`
      awbDetail.push(action)
      data.push(awbDetail);
      // }
    }
    dataTable.data = data;
    res.json(dataTable);
  })
};

exports.get_awb_no_docs = (req, res, next) => {
  // services.awbService.getAwbsNoDocs().then(awbs => {
    res.render('pages/warehouse/awb/no-docs', {
      page: req.originalUrl,
      title: "AirWay Bills - No Docs",
      user: res.user,
      awbs: [],//awbs
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    })
  // })
};

exports.get_awb_no_docs_list = (req, res, next) => {
  if(req.body.clear)
    req.body.daterange =''
  services.awbService.getAwbsNoDocsList(req).then(results => {
    const awbs = results.awbs;
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: results.total,
      recordsFiltered: results.total,
      data:[]
    }
    var data = [];
    for(var i=0; i< awbs.length; i++){
      var awbDetail = [];
      if(!awbs[i].invoice) {
        awbDetail.push(awbs[i].customer.name);
        awbDetail.push(helpers.formatDate(awbs[i].createdAt));
        awbDetail.push(awbs[i].customer.pmb)
        awbDetail.push(`<a href="manage/${awbs[i]._id}/preview">${awbs[i].awbId}</a>`)
        awbDetail.push(helpers.getFullName(awbs[i].customer))
        if(awbs[i].shipper && awbs[i].shipper.name)
          awbDetail.push(awbs[i].shipper.name)
        else
          awbDetail.push('')

        if(awbs[i].carrier && awbs[i].carrier.name)
          awbDetail.push(awbs[i].carrier.name)
        else
          awbDetail.push('')
        
        awbDetail.push(awbs[i].packages.length)
        awbDetail.push(awbs[i].weight)
      }
      let action = ` <button 
      class="btn btn-link btn-primary btn-print-awb" 
      data-toggle="modal" 
      data-id="${awbs[i]._id}"
      onclick="printAwb(this)"
      data-target="#print-popup"><i class="fa fa-print"></i> </button>`
      awbDetail.push(action)
       data.push(awbDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })
};

exports.get_awb_no_docs_package_list = (req, res, next) => {
  services.packageService.getAllPackagesWithLastStatus().then((packages) => {
      return Promise.all(
          packages.map(async(pkg, i) => {
              let awb = await services.printService.getAWBDataForPackagesRelatedEntitie(pkg.awbId._id);
              packages[i].pieces = awb.packages ? awb.packages.length : 0
              packages[i].packageNumber = "PK00" + packages[i].id;
              packages[i].invoice = awb.invoices.length === 0 ? true : false
              return pkg
          })
      ).then(pkgs => {
          res.render('pages/warehouse/awb/no-docs-packages', {
              page: req.originalUrl,
              user: res.user,
              title: 'NoDocs - Pkgs',
              filterURL: '',
              buttonName: 'Add to Manifest',
              packages: pkgs,
          });
      })

  });
};
exports.delete_awb = (req, res, next) => {
  let awbId = req.params.id;
  services.awbService.getAwb(awbId).then((awbData) => {
    Promise.all([
      services.awbService.deleteAwb_updated(awbId),
      services.packageService.removePackages_updated(awbId),
      services.awbService.removePurchaseOrdersByAwb(awbId),
      services.packageService.removePackagesStatusByPackageIds(awbData.packages),
      services.awbService.updateAwbStatus(awbData, 3, req['userId']),
    ]).then(results => {
      res.send(results[0]);
    })
  })
};

exports.generate_awb_pdf = (req, res, next) => {
  printerCtrl.generate_awb_pdf(req.params.awbId).then(result => {
    res.send(result);
  })
};

exports.nas_no_docs = (req, res, next) => {
  services.awbService.getAwbsNoDocs().then(awbs => {
    res.render('pages/warehouse/awb/no-docs', {
      page: req.originalUrl,
      title: "AirWay Bills - No Docs",
      user: res.user,
      awbs: awbs,
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    })  
  })
};

exports.refresh_barcode = async (req, res)=>{
  services.packageService.getProcessOriginBarcode(req.session.userId).then(result => {
    res.send(result)
  })
}

exports.add_bar_code = async (req, res, next)=>{
  const result = await services.packageService.addOriginBarcode(req.body);
  res.send(result);
}

