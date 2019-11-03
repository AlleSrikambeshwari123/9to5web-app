var express = require('express');
var router = express.Router();
var services = require('../RedisServices/RedisDataServices');
var middleware = require('../middleware');
var moment = require('moment');

var lredis = require('../RedisServices/redis-local');
var redis = lredis;
var PackageUtil = require('../Util/packageutil').PackageUtility;
var packageUtil = new PackageUtil();
var formidable = require('formidable');
var path = require('path');
var fs = require('fs');
var delfile = '';
var uniqid = require('uniqid')
var rServices = require('../RedisServices/RedisDataServices')

router.post('/authenticate',(req,res,next)=>{
  var body = req.body; 
  console.log(body); 
  rServices.userService.authenticate(body.username,body.password).then(result=>{
      res.send(result); 
  })
})
router.post("/consolidate-packages",(req,res,next)=>{
    var pkgArray = JSON.parse(req.body.packages);
    var user = req.body.username; 
    var boxSize = req.body.boxSize; 
    rServices.packageService.createConsolated(pkgArray,user,boxSize).then(result=>{
        res.send(result); 
    })
})
router.get('/open-flights',(req,res,next)=>{
   rServices.manifestService.getOpenManifestList(1).then(mlist=>{
       console.log(mlist)
       res.send(mlist); 
   })
})
router.get('/rec-shipment-id',(req,res,next)=>{
    rServices.shipperService.getShipmentId().then((id)=>{
        res.send({id:id})
    })
})
router.get('/plane-compartments/:planeId',(req,res,next)=>{
    var planeId = req.params.planeId; 
    rServices.planeService.listCompartments(planeId).then(details=>{
        res.send(details)
    })
})
router.post('/add-package-to-flight',(req,res,next)=>{
    var body = req.body; 
    var action = { 
        mid: body.mid,
        barcode: body.barCode,
        compartment: body.compartment
    }
    console.log(action);
    
    services.packageService.addToFlight(action).then((result)=>{
        res.send(result)
    })
})
router.post('/process-pkg-nas',(req,res,next)=>{
    
    var body = req.body; 
    var nas_location_id = 2; 
    console.log(req.body)
    services.packageService.procssessPackage(body,req.body.username).then(result=>{
        res.send(result)
    })
    
    
})
router.post('/rm-package-from-flight',(req,res,next)=>{
    var body = req.body; 
    var action = { 
        mid: body.mid,
        barcode: body.barCode
    }
   services.packageService.removeFromFlight(action).then(result=>{
        res.send(result); 
   })
})

//
router.post('/rec-package',(req,res,next)=>{
    var body = req.body; 
    services.packageService.recFromTruck(body.trackingNumber,body.username,body.shipmentId).then((result)=>{
        res.send(result);

    })
})
router.post('/rec-package-nas',(req,res,next)=>{
    var body = req.body; 
    services.packageService.recFromPlaneNas(body.barcode).then((result)=>{
        res.send(result)
    })
})
router.get('/get-open-deliveries',(req,res,next)=>{
    services.deliveryService.getOpenDeliveries().then(deliveries=>{
        res.send(deliveries); 
    })
})
router.get('/get-locations',(req,res,next)=>{
    services.locationService.getLocations().then(locations=>{
        res.send(locations); 
    })
}); 
router.post('/get-package-info/',(req,res,next)=>{
    var id = req.body.barcode; 
    services.packageService.getPackageById(id).then((pkg=>{
        res.send(pkg); 
    }))
})
router.post('/save-package-fees',(req,res,next)=>{
    //
    res.send({saved:true})
})
module.exports = router;