var services = require('../RedisServices/RedisDataServices');
var printerCtrl = require('./PrinterController');
var utils = require('../Util/utils');
var aws = require('../Util/aws');

exports.preview_awb = (req, res, next) => {
  let id = req.params.id;
  Promise.all([
    services.awbService.getAwb(id),
    services.packageService.getPackages(id),
  ]).then(results => {
    let awb = results[0];
    let packages = results[1];
    Promise.all([
      services.customerService.getCustomer(awb.customerId),
      services.shipperService.getShipper(awb.shipper),
      services.carrierService.getCarrier(awb.carrier),
      services.hazmatService.getHazmat(awb.hazmat),
      services.invoiceService.getInvoicesByAWB(awb.id),
    ]).then(otherInfos => {
      awb.packages = packages;
      awb.invoices = otherInfos[4].map(invoice => {
        if (invoice.filename) {
          invoice.link = aws.getSignedUrl(invoice.filename);
        }
        return invoice;
      });
      awb.customer = otherInfos[0];
      awb.dateCreated = utils.formatDate(awb.dateCreated, "MMM DD,YYYY");
      res.render('pages/warehouse/awb/preview', {
        page: req.originalUrl,
        title: "AWB #" + awb.id,
        user: res.user,
        awb: awb,
        shipper: otherInfos[1],
        carrier: otherInfos[2],
        hazmat: otherInfos[3],
      })
    })
  })
}

exports.get_awb_detail = (req, res, next) => {
  var id = req.params.id;
  Promise.all([
    services.customerService.getCustomers(),
    services.hazmatService.getHazmats(),
    services.shipperService.getAllShippers(),
    services.carrierService.getAllCarriers(),
    services.awbService.getAwb(id),
    services.packageService.getAWBPackagesWithLastStatus(id),
    services.locationService.getLocations(),
    services.invoiceService.getInvoicesByAWB(id),
    services.paidTypeService.getAllPaidTypes(),
    services.serviceTypeService.getAllServiceTypes(),
    services.awbService.getPurchaseOrder(id),
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
  ]) => {
    //console.log(results[4]);
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
    });
  })
}

exports.create_awb = (req, res, next) => {
  Promise.all([
    services.customerService.getCustomers(),
    services.hazmatService.getHazmats(),
    services.shipperService.getAllShippers(),
    services.carrierService.getAllCarriers(),
    services.serviceTypeService.getAllServiceTypes(),
    services.locationService.getLocations(),
    services.paidTypeService.getAllPaidTypes(),
  ]).then(([
    customers,
    hazmats,
    shippers,
    carriers,
    serviceTypes,
    locations,
    paidTypes,
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
    });
  })
}

exports.add_new_awb = (req, res, next) => {
  let { invoices, ...awb } = req.body;
  let packages = JSON.parse(awb.packages);
  services.awbService.createAwb(awb).then(async result => {
    awb = result.awb;
    await Promise.all((invoices || []).map(invoice => {
      invoice.awbId = awb.id;
      return services.invoiceService.create(invoice);
    }));
    packages.forEach(pkg => {
      pkg.customerId = awb.customerId;
      pkg.shipperId = awb.shipper;
      pkg.carrierId = awb.carrier;
      pkg.hazmatId = awb.hazmat;
    })
    services.packageService.createPackages(awb.id, packages).then(packageResult => {
      res.send(result);
    })
  })
}

exports.update_awb = (req, res, next) => {
  let awb_id = parseInt(req.params.id);
  let { invoices, ...awb } = req.body;

  let packages = JSON.parse(awb.packages);
  services.awbService.updateAwb(awb_id,awb).then(async result => {
    //awb = result.awb;
    let all = (invoices || []).map(async (invoice) => {
      invoice.awbId = awb_id;
      if (invoice.id) {
        console.log('UPDATE incoive', invoice)
        await services.invoiceService.update(invoice.id, invoice);
      } else {
        console.log('CREATE incoive', invoice)
        await services.invoiceService.create(invoice);
      }
    });

    packages.forEach(pkg => {
      pkg.customerId = awb.customerId;
      pkg.shipperId = awb.shipper;
      pkg.carrierId = awb.carrier;
      pkg.hazmatId = awb.hazmat;
          //Old package need in updates
      if(pkg.awbId!==undefined){
        all.push(services.packageService.updatePackage(pkg.id, pkg))
      }
    });

    const new_packages = packages.filter(f=>f.awbId===undefined);
      //Adding new packages
    all.push(
        services.packageService.createPackages(awb_id, new_packages)
    );

    Promise.all(all).then(packageResult => {
      res.send(result);
    })
  }).catch(err=>{
    console.log(err);
  })
}

exports.get_awb_list = (req, res, next) => {
  services.awbService.getAwbs().then(awbs => {
    getFullAwb(awbs).then(awbs => {
      res.render('pages/warehouse/awb/list', {
        page: req.originalUrl,
        title: "AirWay Bills",
        user: res.user,
        awbs: awbs,
      })
    })
  })
}

exports.get_awb_no_docs = (req, res, next) => {
  services.awbService.getAwbsNoDocs().then(awbs => {
    getFullAwb(awbs).then(awbs => {
      console.log(awbs)
      res.render('pages/warehouse/awb/no-docs', {
        page: req.originalUrl,
        title: "AirWay Bills - No Docs",
        user: res.user,
        awbs: awbs,
      })
    })
  })
}

exports.delete_awb = (req, res, next) => {
  let awbId = req.params.id;
  Promise.all([
    services.awbService.deleteAwb(awbId),
    services.packageService.removePackages(awbId),
  ]).then(results => {
    res.send(results[0]);
  })
}

exports.generate_awb_pdf = (req, res, next) => {
  printerCtrl.generate_awb_pdf(req.params.awbId).then(result => {
    res.send(result);
  })
}

exports.nas_no_docs = (req, res, next) => {
  services.awbService.getAwbsNoDocs().then(awbs => {
    getFullAwb(awbs).then(awbs => {
      res.render('pages/warehouse/awb/no-docs', {
        page: req.originalUrl,
        title: "AirWay Bills - No Docs",
        user: res.user,
        awbs: awbs,
      })
    })
  })
}

function getFullAwb(awbs) {
  return new Promise((resolve, reject) => {
    Promise.all(awbs.map(awb => {
      return Promise.all([
        services.packageService.getPackages(awb.id),
        services.customerService.getCustomer(awb.customerId),
        services.shipperService.getShipper(awb.shipper),
        services.carrierService.getCarrier(awb.carrier),
      ]).then(results => {
        let weight = 0;
        awb.packages = results[0];
        awb.packages.forEach(pkg => weight += Number(pkg.weight));
        awb.weight = weight;
        awb.customer = results[1];
        awb.shipper = results[2];
        awb.carrier = results[3];
        awb.dateCreated = utils.formatDate(awb.dateCreated, "MMM DD, YYYY");
      })
    })).then(results => {
      resolve(awbs);
    })
  });
}
