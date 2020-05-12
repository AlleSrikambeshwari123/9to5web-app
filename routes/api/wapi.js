var express = require('express');
var router = express.Router();
var services = require('../../RedisServices/RedisDataServices');

var PackageUtil = require('../../Util/packageutil').PackageUtility;
var middleware = require('../../middleware');
var packageUtil = new PackageUtil();

router.post('/authenticate', (req, res, next) => {
  var body = req.body;
  var username = req.headers.username || body.username;
  console.log(body);
  services.userService.authenticate(username, body.password).then(result => {
    res.send(result);
  })
})
router.post('/rm-package-from-flight', (req, res, next) => {
  var body = req.body;
  var action = {
    mid: body.mid,
    barcode: body.barCode
  }
  services.packageService.removeFromFlight(action).then(result => {
    res.send(result);
  })
})

//========== FLL Package APIs ==========//
// Packages from FLL Truck to Airport, accept them to get ready to be loaded to flight
router.get('/new-shipment-id', (req, res, next) => {
  services.packageService.getShipmentId().then(id => {
    res.send({ id: id })
  })
})
router.get('/get-package-detail/:trackingNo', async (req, res, next) => {
  let trackingNo = req.params.trackingNo;
  // let ids = trackingNo.split('-');
  // let packageId = ids[2];
  // let awbId = ids[1];
  let allService;
  try {
    allService = await services.packageService.getAllPackages();
  } catch (error) {
    console.log(error)
  }
  const myPackage = allService.filter((i) => i.trackingNo === trackingNo)
  if(myPackage == '') res.send('Tracking No. Not Found')
  const packageId = myPackage[0].id;
  const awbId = myPackage[0].awbId;
  Promise.all([
    services.packageService.getPackage(packageId),
    services.awbService.getFullAwb(awbId),
  ]).then(results => {
    res.send({
      packageInfo: results[0],
      awb: results[1],
    })
  })
})

router.get('/get-package-detail-barcode/:barcode', async (req, res, next) => {
  let barcode = req.params.barcode;

  let allService;
  try {
    allService = await services.packageService.getAllPackages();
  } catch (error) {
    console.log(error)
  }
  const myPackage = allService.filter((i) => i.originBarcode.toString() === barcode)
  if (myPackage.length > 0) {
    const packageId = myPackage[0].id;
    const awbId = myPackage[0].awbId;
    Promise.all([
      services.packageService.getPackage(packageId),
      services.awbService.getFullAwb(awbId),
    ]).then(results => {
      res.send({
        packageInfo: results[0],
        awb: results[1],
      })
    })
  } else {
    res.send({
      status: 'barcode not found'
    })    
  }
})

router.get("/get_packages_status", middleware().checkSession, (req,res,next) => {
  services.packageService.getPackageStatus().then((result)=> {
    res.send(result)
  })
})


router.get("/get_packages_7days_status", middleware().checkSession, (req,res,next) => {
  services.packageService.getPackage7daysStatus().then((result)=> {
    res.send(result)
  })
})


router.get("/get_packages_filter/:filter", middleware().checkSession, (req, res, next) => {
  console.log('req.query', req.query);
  services.packageService.getPackageWithFilter(req.params.filter, req.query).then((result)=>{
    res.send(result)
  })
})

router.post('/save-origin-barcode', (req, res, next) => {
  req.body.barcode;
  const barcode = {
    barcode: req.body.barcode
  };
  services.packageService.addOriginBarcode(barcode).then((result) => {
    res.send(result);
  })
})

router.get('/getall-barcode', (req, res, next) => {
  services.packageService.getAllOriginBarcode().then((result) => {
    res.send(result);
  })
})

router.post('/accept-package', (req, res, next) => {
  var body = req.body;
  var username = req.headers.username;
  services.packageService.addPackageToShipment(body.packageIds, username).then((result) => {
    res.send(result);
  })
})
router.post("/consolidate-packages", (req, res, next) => {
  var pkgArray = JSON.parse(req.body.packages);
  var boxSize = req.body.boxSize;
  var username = req.headers.username;
  services.packageService.createConsolated(pkgArray, username, boxSize).then(result => {
    res.send(result);
  })
})
//========== FLL Flight APIs ==========//
router.get('/open-manifest', (req, res, next) => {
  services.manifestService.getOpenManifest().then(manifests => {
    Promise.all(manifests.map(manifest => {
      return services.planeService.getFullPlane(manifest.planeId);
    })).then(planes => {
      manifests.forEach((manifest, i) => manifest.plane = planes[i]);
      console.log(manifests);
      res.send({ manifests: manifests });
    })
  })
})

router.get('/get-manifests', (req, res, next) => {
  let query = req.query;
  // FIXME: we should filter by query here
  services.manifestService
    .getManifests()
    .then((manifests) => {
      res.json(manifests);
    })
    .catch(next);
});

router.get('/get-deliverys', (req, res, next) => {

  services.deliveryService
    .getDeliveries()
    .then((deliverys) => {
      res.json(deliverys);
    })
    .catch(next);
});

router.get('/get-compartments', (req, res, next) => {
  let query = req.query;
  // FIXME: we should filter by query here
  services.planeService
    .getCompartments(query.planeId)
    .then((compartments) => {
      res.json(compartments);
    })
    .catch(next);
});

router.post('/add-packages-to-flight', middleware().checkSession, (req, res, next) => {
  let packageIds = req.body.packageIds;
  let manifestId = req.body.manifestId;
  let compartmentId = req.body.compartment || req.body.compartmentId;
  var userId = req['userId'];
  services.packageService.addToFlight(packageIds, manifestId, compartmentId, userId).then((result) => {
    res.send(result)
  })
})

//========== NAS Package APIs ==========//
router.post('/rec-package-nas', (req, res, next) => {
  let packageIds = req.body.packageIds;
  var username = req.headers.username;
  services.packageService.receivePackageFromPlane(packageIds, username).then((result) => {
    res.send(result)
  })
})

//========== NAS Delivery APIs ==========//
router.get('/get-open-deliveries', (req, res, next) => {
  services.deliveryService.getOpenDeliveries().then(deliveries => {
    Promise.all(deliveries.map(delivery => {
      return services.deliveryService.getFullDelivery(delivery.id);
    })).then(deliveries => {
      deliveries.forEach(delivery => {
        delivery.name = delivery.location.name + ' - ' + delivery.vehicle.model;
      })
      res.send({ deliveries: deliveries });
    })
  })
})

router.post('/add-packages-to-delivery', (req, res, next) => {
  var deliveryId = req.body.deliveryId;
  var packageIds = req.body.packageIds.split(',');
  services.deliveryService.addPackagesToDelivery(deliveryId, packageIds).then(result => {
    res.send(result)
  })
})

//========== NAS Store Check-In APIs ==========//
router.get('/get-locations', (req, res, next) => {
  services.locationService.getLocations().then(locations => {
    res.send({ locations: locations });
  })
});

router.post('/check-in-store', (req, res, next) => {
  var packageIds = req.body.packageIds;
  var locationId = req.body.locationId;
  var username = req.headers.username;
  services.packageService.checkInStore(locationId, packageIds, username).then(result => {
    res.send(result)
  })
})

//========== NAS Check out to Customer ==========//
router.post('/checkout-to-customer', (req, res, next) => {
  var packageIds = req.body.packageIds;
  var username = req.headers.username;
  services.packageService.checkOutToCustomer(packageIds, username).then(result => {
    res.send(result)
  })
})

module.exports = router;
