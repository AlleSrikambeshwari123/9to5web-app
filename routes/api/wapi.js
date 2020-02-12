var express = require('express');
var router = express.Router();
var services = require('../../RedisServices/RedisDataServices');
var middleware = require('../../middleware');
var moment = require('moment');
var formidable = require('formidable');
var path = require('path');
var fs = require('fs');
var delfile = '';
var uniqid = require('uniqid')

var PackageUtil = require('../../Util/packageutil').PackageUtility;
var packageUtil = new PackageUtil();

router.post('/authenticate', (req, res, next) => {
  var body = req.body;
  console.log(body);
  services.userService.authenticate(body.username, body.password).then(result => {
    res.send(result);
  })
})
router.post('/add-package-to-flight', (req, res, next) => {
  var body = req.body;
  var action = {
    mid: body.mid,
    barcode: body.barCode,
    compartment: body.compartment
  }
  console.log(action);

  services.packageService.addToFlight(action).then((result) => {
    res.send(result)
  })
})
router.post('/process-pkg-nas', (req, res, next) => {
  var body = req.body;
  var nas_location_id = 2;
  console.log(req.body)
  services.packageService.procssessPackage(body, req.body.username).then(result => {
    res.send(result)
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
router.get('/get-package-detail/:trackingNo', (req, res, next) => {
  let trackingNo = req.params.trackingNo;
  let ids = trackingNo.split('-');
  let packageId = ids[2];
  let awbId = ids[1];
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
router.post('/accept-package', (req, res, next) => {
  var body = req.body;
  services.packageService.addPackageToShipment(body.trackingNumber, body.username).then((result) => {
    res.send(result);
  })
})
router.post("/consolidate-packages", (req, res, next) => {
  var pkgArray = JSON.parse(req.body.packages);
  var user = req.body.username;
  var boxSize = req.body.boxSize;
  services.packageService.createConsolated(pkgArray, user, boxSize).then(result => {
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
router.get('/plane-compartments/:planeId', (req, res, next) => {
  var planeId = req.params.planeId;
  services.planeService.getCompartments(planeId).then(compartments => {
    res.send({ compartments: compartments })
  })
})

router.post('/rec-package-nas', (req, res, next) => {
  var body = req.body;
  services.packageService.recFromPlaneNas(body.barcode).then((result) => {
    res.send(result)
  })
})
router.get('/get-open-deliveries', (req, res, next) => {
  services.deliveryService.getOpenDeliveries().then(deliveries => {
    res.send(deliveries);
  })
})
router.post('/add-package-to-delivery', (req, res, next) => {
  var deliveryPkg = {
    barcode: req.body.barcode,
    deliveryId: req.body.deliveryId
  }
  services.deliveryService.addPackage(deliveryPkg.deliveryId, deliveryPkg.barcode).then(result => {
    res.send(result)
  })
})
router.post('/')
router.get('/get-locations', (req, res, next) => {
  services.locationService.getLocations().then(locations => {
    res.send(locations);
  })
});
router.post('/checkout-to-customer', (req, res, next) => {
  var body = req.body;
  var barcode = body.barcode;
  var username = body.username;
  services.packageService.checkOutToCustomer(barcode, username).then(result => {
    console.log(result)
    res.send(result)
  })
})
router.post('/get-package-info/', (req, res, next) => {
  var id = req.body.barcode;
  services.packageService.getPackageById(id).then((pkg => {
    res.send(pkg);
  }))
})
router.post('/check-into-store', (req, res, next) => {
  var checkin = {
    locationId: req.body.locationId,
    location: req.body.location,
    barcode: req.body.barcode,
    username: req.body.username,
  }
  services.packageService.updateStoreLocation(checkin).then(result => {
    res.send(result)
  })
})
router.post('/save-package-fees', (req, res, next) => {
  res.send({ saved: true })
})
module.exports = router;