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
  var username = req.headers.username;
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
router.post('/add-packages-to-flight', (req, res, next) => {
  let packageIds = req.body.packageIds;
  let manifestId = req.body.manifestId;
  let compartment = req.body.compartment;
  var username = req.headers.username;
  services.packageService.addToFlight(packageIds, manifestId, compartment, username).then((result) => {
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

router.post('/checkout-to-customer', (req, res, next) => {
  var packageIds = req.body.packageIds;
  var username = req.headers.username;
  services.packageService.checkOutToCustomer(packageIds, username).then(result => {
    res.send(result)
  })
})

router.post('/add-package-to-delivery', (req, res, next) => {
  var deliveryId = req.body.deliveryId;
  var packageIds = req.body.packageId.split(',');
  services.deliveryService.addPackageToDelivery(deliveryId, packageIds).then(result => {
    res.send(result)
  })
})


router.post('/process-pkg-nas', (req, res, next) => {
  var body = req.body;
  var username = req.headers.username;
  var nas_location_id = 2;
  console.log(req.body)
  services.packageService.procssessPackage(body, username).then(result => {
    res.send(result)
  })
})

router.get('/get-open-deliveries', (req, res, next) => {
  services.deliveryService.getOpenDeliveries().then(deliveries => {
    res.send(deliveries);
  })
})

router.get('/get-locations', (req, res, next) => {
  services.locationService.getLocations().then(locations => {
    res.send(locations);
  })
});

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