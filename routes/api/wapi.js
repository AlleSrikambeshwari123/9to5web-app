var express = require('express');
var router = express.Router();
var services = require('../../Services/RedisDataServices');
var passport = require('passport');
require('./authHelper')
var PackageUtil = require('../../Util/packageutil').PackageUtility;
var checkEmpty = require('../../Util/utils').checkEmpty
var middleware = require('../../middleware');
var packageUtil = new PackageUtil();
var manifestCtrl = require('../../Controller/ManifestController');
var priceCtrl = require('../../Controller/PriceLabelController');

router.post('/authenticate', (req, res, next) => {
  var body = req.body;
  var username = req.headers.username || body.username;
  services.userService.authenticate(username, body.password).then(result => {
    res.send(result);
  })
})
router.post('/rm-package-from-flight', passport.authenticate('jwt', { session: false }),(req, res, next) => {
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
router.get('/get-package-detail/:trackingNo', passport.authenticate('jwt', { session: false }), async (req, res, next) => {
  let trackingNo = req.params.trackingNo;
  services.packageService.getPackageByTrackingId(trackingNo)
  .then( result => {
    if(result.success){
      Promise.all([
        services.packageService.getPackageById(result.package._id),
        services.awbService.getFullAwb(result.package.awbId),
      ]).then(results => {
      res.send({
        success:true,
        packageInfo: [results[0]],
        awb: results[1]
      });
    })
  }else{
    res.send({ success:false,message: "Please scan one of the system generated labels" })
  }
  });
})

router.get('/get-packages-detail/:trackingNo', passport.authenticate('jwt', { session: false }), async (req, res, next) => {
  let trackingNo = req.params.trackingNo;
  let allService;
  try {
    allService = await services.packageService.getAllPackages();
  } catch (error) {
    console.log(error)
  }
  const myPackage = allService.filter((i) => i.trackingNo === trackingNo)
  if (myPackage === null || myPackage.length === 0) return res.send({ success:false,message: "Please scan one of the system generated labels" })
  const packageId = myPackage[0].id;
  const awbId = myPackage[0].awbId;
  Promise.all([
    services.packageService.getPackage(packageId),
    services.awbService.getFullAwb(awbId),
  ]).then(results => {
    res.send({
      success:true,
      packageInfo: results[0],
      awb: results[1]
    })
  })
})

router.get('/get-package-detail-barcode/:barcode', passport.authenticate('jwt', { session: false }), async (req, res, next) => {
  let barcode = req.params.barcode;

  let allService;
  try {
    allService = await services.packageService.getAllPackages();
  } catch (error) {
    console.log(error)
  }
  const barcodeId = await services.packageService.getOriginalBarcodeByCode(barcode);
  if (barcodeId === null) return res.send({ status: 'barcode Not Found' })
  const myPackage = allService.filter((i) => i.originBarcode.toString() === barcodeId.id)
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
router.get("/get-package-info",passport.authenticate('jwt', { session: false }), (req, res, next) => {
  let userId = req.headers.username
  services.packageService.getPackageInfo(userId).then((result) => {
    res.send(result)
  })
})


router.get("/get_packages_status", middleware().checkSession, (req, res, next) => {
  services.packageService.getPackageStatus().then((result) => {
    res.send(result)
  })
})


router.get("/get_packages_7days_status", middleware().checkSession, (req, res, next) => {
  services.packageService.getPackage7daysStatus().then((result) => {
    res.send(result)
  })
})

// Dashboard Page
router.get("/get_packages_filter/:filter", middleware().checkSession, (req, res, next) => {
  Promise.all([
    services.packageService.getPackageWithFilter(req.params.filter, req.query),
    services.userService.getAllUsers(req)
  ]).then(result => {
    result[0]['users'] = result[1]; 
    res.send(result[0])
  })
})

// Report Page
router.get("/get_packages_data/:filter", middleware().checkSession, (req, res, next) => {
  // console.log('req.query', req.query);
  
  Promise.all([
    services.awbService.getAwbStatuses(req.query),
    services.packageService.getPackageStatusFilterDate(req.query),
    services.packageService.getPackageStatusWithUser(req.params.filter, req.query),
    services.packageService.getDeliveryPackageDetail(req.query)
  ]).then(result => { 
    res.send(result)
  })
})

router.post('/save-origin-barcode', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  req.body.barcode;
  const barcode = {
    barcode: req.body.barcode
  };
  services.packageService.addOriginBarcode(barcode).then((result) => {
    res.send(result);
  })
})

router.get('/getall-barcode', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  services.packageService.getAllOriginBarcode().then((result) => {
    res.send(result);
  })
})


router.post("/consolidate-packages", passport.authenticate('jwt', { session: false }), (req, res, next) => {
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

router.get('/get-flights', passport.authenticate('jwt', { session: false }),(req, res, next) => {
  services.planeService.getPlanes().then((plane) => {
      res.json(plane);
    })
    .catch(next);
});

router.get('/get-all-compartments', passport.authenticate('jwt', { session: false }),(req, res, next) => {
  services.planeService
    .getAllCompartments()
    .then((compartments) => {
      res.json(compartments);
    })
    .catch(next);
});

router.get('/get-compartments', (req, res, next) => {
  let query = req.query;
  // FIXME: we should filter by query here
  services.planeService
    .getCompartmentsManifest(query.planeId,query.manifestId)
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

//========== No-Docs ===================//
router.get('/no-docs',passport.authenticate('jwt', { session: false }),(req,res)=>{
  services.awbService.getAwbsNoDocs().then((result)=>{
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



//========== NAS Store Check-In APIs ==========//
router.get('/get-locations', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  services.locationService.getLocations().then(locations => {
    res.send(locations);
  })
});

router.get('/get-zones', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  services.zoneService.getZones().then(zones => {
    res.send(zones);
  })
});



/* All Package Scans */
//Received in FLL [1]
router.post('/accept-package', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  var body = req.body;
  var userId = req.headers.userId || req.body.userId;
  const {valid,errors} = checkEmpty({packageIds:body.packageIds,userId:userId})
  if(!valid) return res.send({success:false,message:errors})
  services.packageService.addPackageToShipment(body.packageIds, userId).then((result) => {
    res.send(result);
  })
})

//Loaded on AirCraft - [2]
router.post('/add-packages-to-compartment', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  let packageIds = req.body.packageIds;
  let compartmentId = req.body.compartmentId;
  var userId =  req.body.userId;
  const {valid,errors} = checkEmpty({packageIds:packageIds,compartmentId :compartmentId,userId:userId})
  if(!valid) return res.send({success:false,message:errors})
  services.packageService.addPackagesToCompartment(packageIds,compartmentId, userId).then((result) => {
    res.send(result)
  })
})

//Loaded on AirCraft - [2]
router.post('/add-packages-to-manifests', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  let packageIds = req.body.packageIds;
  let manifestId = req.body.manifestId;
  var userId =  req.body.userId;
  const {valid,errors} = checkEmpty({packageIds:packageIds,manifestId :manifestId,userId:userId})
  if(!valid) return res.send({success:false,message:errors})
  services.packageService.addPackagesToManifests(packageIds,manifestId, userId).then((result) => {
    res.send(result)
  })
})

//In Transit - [3]
router.post('/add-packages-to-delivery', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  var deliveryId = req.body.deliveryId;
  var packageIds = req.body.packageIds
  var locationId = req.body.locationId 
  var userId = req.headers.userId || req.body.userId;
  const {valid,errors} = checkEmpty({packageIds:packageIds,deliveryId :deliveryId,userId:userId,locationId : locationId})
  if(!valid) return res.send({success:false,message:errors})
  services.packageService.addPackagesToDelivery(deliveryId, packageIds,userId,locationId,req.query).then(result => {
    res.send(result)
  })
})


// Recieved in NAS -[4] Manifest Scan
router.get('/packages-by-manifest/:manifestId', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  var manifestId = req.params.manifestId
  services.packageService.getPackageOnManifestFlight(manifestId).then(result => {
    res.send(result)
  })
})

// Recieved in NAS -[4]
router.post('/receive-packages-to-flight', passport.authenticate('jwt', { session: false }),(req, res, next) => {
  let packageIds = req.body.packageIds;
  var userId =  req.body.userId;
  const {valid,errors} = checkEmpty({packageIds:packageIds,userId:userId})
  if(!valid) return res.send({success:false,message:errors})
  services.packageService.receivePackageToFlight(packageIds,userId).then((result) => {
    res.send(result)
  })
})

//Ready for Pickup / Delivery - [5]
router.post('/checkout-to-customer', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  var packageIds = req.body.packageIds;
  var userId = req.headers.userId || req.body.userId;
  const {valid,errors} = checkEmpty({packageIds:packageIds,userId:userId})
  if(!valid) return res.send({success:false,message:errors})
  services.packageService.checkOutToCustomer(packageIds, userId).then(result => {
    res.send(result)
  })
})

//No Invoice Present - [7]
router.post('/add-packages-to-nodoc',passport.authenticate('jwt', { session: false }), (req,res)=>{
  const {valid,errors} = checkEmpty({packageIds:req.body.packageIds,zoneId:req.body.zoneId,userId:req.body.userId})
  if(!valid) return res.send({success:false,message:errors})
  services.packageService.addAwbsPkgNoDocs(req.body).then((result)=>{
    res.send(result)
  })
})

//========== Process Package =============//
router.post('/process-package', passport.authenticate('jwt', { session: false }),(req, res, next) => {
  var barcode = req.body.barcode;
  var userId = req.headers.userId || req.body.userId;
  const {valid,errors} = checkEmpty({barcode:barcode,userId:userId})
  if(!valid) return res.send({success:false,message:errors})
  services.packageService.processPackage(barcode, userId).then(result => {
    res.send(result)
  })
})

//Delivered to Store - [9]
router.post('/check-in-store', passport.authenticate('jwt', { session: false }), (req, res, next) => {
  var userId = req.headers.userId || req.body.userId;
  const {valid,errors} = checkEmpty({
    packageIds:req.body.packageIds,
    location: req.body.location,
    companyId: req.body.companyId,
    zoneId:req.body.zoneId,
    userId:userId
    })
    if(!valid) return res.send({success:false,message:errors})
  services.packageService.checkInStore(req.body, userId,req.query).then(result => {
    res.send(result)
  })
})

// Manifest APIs
// Ship Flight Manifest
router.get('/manifest/manage/:id/ship',passport.authenticate('jwt', { session: false }), manifestCtrl.ship_manifest);

//Receive Flight Manifest
router.get('/manifest/manage/:id/receive', passport.authenticate('jwt', { session: false }), manifestCtrl.receive_manifest);

// GetManifest data By Id
router.get('/manifest/:id/get',  passport.authenticate('jwt', { session: false }), manifestCtrl.get_manifest_detail_byId);

// Add Or Update Price Label
router.post('/pricelabels/:id', passport.authenticate('jwt', { session: false }), priceCtrl.add_pricelabel_package);

// Get Price Labels
router.get('/pricelabels/:id', passport.authenticate('jwt', { session: false }), priceCtrl.get_pricelabel_package);

//Add Packages to NoDoc WEB- [7]
router.post('/web/packages/add-packages-to-nodoc',middleware().checkSession, (req,res)=>{
  const {valid,errors} = checkEmpty({packageIds:req.body.packageIds,zoneId:req.body.zoneId,userId: req['userId']})
  if(!valid) return res.send({success:false,message:errors})
  req.body.userId = req['userId']
  services.packageService.addAwbsPkgNoDocs(req.body).then((result)=>{
    res.send(result)
  })
})

router.post('/web/packages/add-packages-to-delivery',middleware().checkSession, (req, res, next) => {
  var deliveryId = req.body.deliveryId;
  var packageIds = req.body.packageIds
  var locationId = req.body.locationId 
  var userId = req['userId']
  const {valid,errors} = checkEmpty({packageIds:packageIds,deliveryId :deliveryId,userId:userId,locationId : locationId})
  if(!valid) return res.send({success:false,message:errors})
  services.packageService.addPackagesToDelivery(deliveryId, packageIds,userId,locationId,req.query).then(result => {
    res.send(result)
  })
})
module.exports = router;