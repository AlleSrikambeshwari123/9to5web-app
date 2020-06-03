const services = require('../Services/RedisDataServices');
const printerCtrl = require('./PrinterController');
const utils = require('../Util/utils');
const aws = require('../Util/aws');

const mongoose = require('mongoose');
const moment = require('moment');
const id = mongoose.Types.ObjectId();

exports.preview_awb = (req, res, next) => {
  let id = req.params.id;
  
  services.awbService.getAwbPreviewDetails(id).then((awb) => {
    awb.dateCreated = moment(awb.createdAt).format("MMM DD,YYYY");
    
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
    services.packageService.getAllOriginBarcode(),
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
    services.locationService.getCompanies()
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
    companies
  ]) => {
    res.render('pages/warehouse/awb/create', {
      page: req.originalUrl,
      title: 'Create New AWB',
      user: res.user,
      printer: res.printer,
      customers,
      hazmats,
      shippers,
      carriers,
      serviceTypes,
      locations,
      paidTypes,
      barcodes,
      processBarcode,
      companies
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
  services.awbService.getAwbsFull().then(awbs => {
    awbs.forEach((awb) => {
      awb['customer'] = awb['customerId'];
      awb['dateCreated'] = moment(awb['createdAt']).format('MMM DD,YYYY');
    });
    
    res.render('pages/warehouse/awb/list', {
      page: req.originalUrl,
      title: "AirWay Bills",
      user: res.user,
      awbs: awbs,
    })
  })
};

exports.get_awb_no_docs = (req, res, next) => {
  services.awbService.getAwbsNoDocs().then(awbs => {
    res.render('pages/warehouse/awb/no-docs', {
      page: req.originalUrl,
      title: "AirWay Bills - No Docs",
      user: res.user,
      awbs: awbs,
    })
  })
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
    })  
  })
};

exports.refresh_barcode = async (req, res)=>{
  services.packageService.getProcessOriginBarcode(req.session.userId).then(result => {
    res.send(result)
  })
}

exports.add_bar_code = async (req, res, next)=>{
  const result = await services.awbService.addBarcode(req.body);
  res.send(result);
}

