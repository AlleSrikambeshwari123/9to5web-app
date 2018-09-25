var express = require('express');
var router = express.Router();
var services = require('../DataServices/services');
var middleware = require('../middleware');
var moment = require('moment');
var redis = require('../DataServices/redis');
var PackageUtil = require('../Util/packageutil').PackageUtility; 
var packageUtil = new PackageUtil(); 
//Manifest Routes
router.get('/list-manifest', middleware(services.userService).requireAuthentication, (req, res, next) => {
    var pageData = {};
    pageData.title = "Manifest";
    pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
    pageData.RoleId = res.User.RoleId;
    services.manifestService.listAllManifest(1).then((result) => {
        console.log('listing');
        console.log(result);
        pageData.listing = result.listing;

        res.render('pages/warehouse/list-manifest', pageData);
    });

});
router.get('/list-ocean', middleware(services.userService).requireAuthentication, (req, res, next) => {
    var pageData = {};
    pageData.title = "Ocean";
    pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
    pageData.RoleId = res.User.RoleId;
    pageData.ColLabel = "Ocean"
    pageData.inital = "O"
    pageData.typeId = 2; 
    services.manifestService.listAllManifest(2).then((result) => {
        console.log('listing');
        console.log(result);
        pageData.listing = result.listing;

        res.render('pages/warehouse/other-manifest', pageData);
    });

});
router.get('/list-hazmat', middleware(services.userService).requireAuthentication, (req, res, next) => {
    var pageData = {};
    pageData.title = "HAZMAT";
    pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
    pageData.RoleId = res.User.RoleId;
    pageData.ColLabel = "HAZMAT"
    pageData.inital = "H"
    pageData.typeId = 3; 
    services.manifestService.listAllManifest(3).then((result) => {
        console.log('listing');
        console.log(result);
        pageData.listing = result.listing;

        res.render('pages/warehouse/other-manifest', pageData);
    });

});

router.get('/m-packages/:manifestId', middleware(services.userService).requireAuthentication, function (req, res, next) {
   

    var pageData = {};
    pageData.title = "Manifest Packages";
    pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
    pageData.RoleId = res.User.RoleId;
    pageData.manifest = {};
    pageData.mid = Number(req.params.manifestId);


    //we want to format the manifest number to 3 digits 
    services.manifestService.getManifest(pageData.mid).then((m)=>{
        console.log(m);
        pageData.manifest = m.manifest; 
        pageData.mtype = "cargo";
        pageData.ColLabel = "Cargo";
        res.render('pages/warehouse/manifest-packages', pageData);
    }); 
    
});


const sumFunction = (accumulator, currentValue) => accumulator + currentValue;
router.get('/manifest-count/:mid/:mtype', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var mid = req.params.mid; 
    var mtype = req.params.mtype; 
    var manifestKeys = `manifest:${mid}:${mtype}:*` ; 
  
    var packageCount = 0; 
  
    
    redis.getKeys(manifestKeys).then((keys)=>{
        //foreach key get the cardinality of the set and add it 
    
        Promise.all(keys.map(redis.setSize)).then((sizes)=>{
    
            if(sizes.length>0){
                var sumResult = {mtype:mtype,size:sizes.reduce(sumFunction)}
                res.send(sumResult); 
            }
            else 
                res.send({mtype:mtype,count:0}); 
        }); 
    }); 
    
}); 

router.post('/create-manifest', middleware(services.userService).requireAuthentication, function (req, res, next) {
    console.log(res.User);
    var manifestType = Number(req.body.mtype); 
    console.log(manifestType)
    services.manifestService.createManfiest(res.User.Username,manifestType).then((result) => {
        res.send(result);
    });
});

router.get('/mlist', middleware(services.userService).requireAuthentication, (req, res, next) => {
    services.manifestService.listAllManifest().then((result) => {
        res.send(result.listing);
    });
});

router.get('/packages/:mid', middleware(services.userService).requireAuthentication, (req, res, next) => {
    var pageData = {};
    pageData.title = "Add Packages";
    pageData.mid = req.params.mid; 
    pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
    pageData.RoleId = res.User.RoleId;
    services.manifestService.getManifest(Number(pageData.mid)).then((m)=>{
        pageData.manifest = m.manifest;
        
        if (m.manifest.ManifestTypeId == 2){
            pageData.ColLabel = "Ocean"
            pageData.inital = "O"
            pageData.typeId = 2; 
        }
        else if ( m.manifest.ManifestTypeId == 3){
            pageData.ColLabel = "HAZMAT"
            pageData.inital = "H"
            pageData.typeId = 3; 
        }
        res.render('pages/warehouse/add-package.ejs', pageData);
    })
    


});

router.post('/get-customer-info', middleware(services.userService).requireAuthentication, (req, res, next) => {
    //get customer information 
    var skybox = req.body.box;
    redis.hgetall('tew:owners:' + skybox).then((result) => {
        console.log(result);
        if (result == null)
            res.send({
                err: 'Could not get customer information'
            });
        //send err
        else
            res.send(result);
    }).catch((err) => {
        res.send({
            err: 'Could not get customer information'
        });
    });

});

router.post('/get-mpackages/', middleware(services.userService).requireAuthentication, (req, res, next) => {
    var body = req.body;

    var manifestKey = `manifest:${body.mid}:${body.mtype}:*`;
    
    //so we get the keys 
    redis.getKeys(manifestKey).then((data) => {
        if (data.length==0){
            res.send([])
        }
        else 
            redis.union(data).then(function (result) {
                console.log(result)
                //we need the actual packages now 
                Promise.all(result.map(redis.getPackage)).then(function (packages) {
                    // console.log(packages);
                    res.send(packages);
                });

            });


    });

});

router.get('/load-package/:trackNo', middleware(services.userService).requireAuthentication, (req, res, next) => {
    var trackingNo = req.params.trackNo;
    redis.getPackage(trackingNo).then((package) => {
        res.send(package);
    });
});

router.post('/rm-package', middleware(services.userService).requireAuthentication, (req, res, next) => {
    var trackingNo = req.body.trackingNo;
    
    var manifest = req.body.mid;
    var manifestKey = "manifest:" + manifest + ":*";
    redis.del('packages:' + trackingNo).then(function (result) {
        console.log(result);
        redis.getKeys(manifestKey).then((kResult) => {
            //the list of all the sets ...we need to remove the key from each one 
            var keysCount = 0;  

            kResult.forEach(element => {
                console.log(`removing ${trackingNo} package manifest set ${element} `)
                redis.srem(element, trackingNo).then(function (rResult) {
                    console.log(rResult);
                    console.log('removed');
                    if (keysCount == kResult.length-1)
                    res.send({
                        deleted: true
                    });
                    keysCount ++; 

                });
            });
        });
        

        //we also need to remove from any sets 
    });

});

router.post('/save-package', middleware(services.userService).requireAuthentication, (req, res, next) => {
    var body = req.body;
    var package = {
        skybox: body.skybox,
        customer: body.customer.replace('-', '').trim(),
        trackingNo: body.tracking,
        dutyPercent:0.2,
        description: body.description,
        shipper: body.shipper,
        value: Number(body.value),
        pieces: Number(body.pieces),
        weight: Number(body.weight),
        mid: body.mid,
        //hasOpt : true,
        mtype: body.mtype
    }; 

    package = packageUtil.calculateFees(package); 
    console.log('package with fees')

    //we also want to calculate the the package fees one time...... 
    //we have the package details here .. now we need to get the existing package 
   
    var container = "";
    var containerNo = ""
    if (typeof body.bag != "undefined") {
        package.bag = body.bag;
        container = "bag";
        containerNo = package.bag;
    }
    if (typeof body.skid != "undefined") {
        package.skid = body.skid;
        container = "skid";
        containerNo = package.skid;
    }
    redis.getPackage(package.trackingNo).then((p)=>{
        if (p){
            var currentContainer = `manifest:${p.mid}:${p.mtype}:${container}:`;
            console.log('found package '); 
            console.log(p); 
            if (container =='bag'){
                //check to see if the back no is the same. 
                if (p.bag != package.bag){
                //remove it from the original list 
                  redis.srem(currentContainer+p.bag,p.trackingNo)
                  console.log('remove package from current set '+ currentContainer)
                }
            }
            else {
                //check to see if the skid number is the same. 
                if (p.skid != package.skid){
                    //remove it from the original list  
                    redis.srem(currentContainer+p.skid,p.trackingNo)
                    console.log('remove package from current set '+ currentContainer)
                }
            }
        }
        
        redis.hmset('packages:' + package.trackingNo, package).then(function (result) {
            var manifestKey = `manifest:${package.mid}:${package.mtype}:${container}:${containerNo}`;
            redis.setAdd(manifestKey, package.trackingNo).then(function (sResult) {
                //get the members one time here 
                console.log(manifestKey);
                redis.getMembers(manifestKey)
                    .then((data) => Promise.all(data.map(redis.getPackage)))
                    .then(function (data) {
                        res.send({
                            saved: true,
                            packages: data
                        });
                    }).catch((err3) => {
                        res.send({
                            err: err3,
                            saved: true,
                            listing: false
                        })
                    });
    
            }).catch(function (err) {
                res.send({
                    saved: false
                });
            });
        }).catch(function (err2) {
            res.send({
                saved: false
            })
    }); 
    //save the package to the package NS
  
    });




    console.log(package);
});

router.post('/packages', middleware(services.userService).requireAuthentication, (req, res, next) => {
    var body = req.body;
    var package = {
        trackingNo: body.trackingNo,
        description: body.description,
        shipper: body.shipper,
        value: Number(body.value),
        pieces: Number(body.pieces),
        weight: Number(body.weight)
    };
    redis.hmset('packages:' + package.trackingNo, package);
    console.log(package);
    res.redirect('/warehouse/packages');
});

router.post('/close-manifest', middleware(services.userService).requireAuthentication, (req, res, next) => {
   var mid = Number(req.body.mid); 

   services.manifestService.closeManifest(mid,res.User.Username).then((mREsult)=>{
       res.send(mREsult); 
   }); 
    
});
router.post('/ship-manifest', middleware(services.userService).requireAuthentication, (req, res, next) => {
    var mid = Number(req.body.mid); 
    var awb = req.body.awb; 
    var user = res.User.Username;
    services.manifestService.shipManifest(mid,awb,user).then((mREsult)=>{
        res.send(mREsult); 
    }); 
    
});
router.get('/export-manifest/:mid', middleware(services.userService).requireAuthentication, (req, res, next) => {

    var mid = Number(req.params.mid); 
    var dir = __dirname.replace("routes","public\\manifest_files") ; 
    console.log('dirname:'+__dirname);
    console.log('dir: '+dir ); 
    //send the package array since there is a problem doing this in c# itself 
    var manifestKey = `manifest:${mid}:*`;
    
    //so we get the keys 
    redis.getKeys(manifestKey).then((data) => {
        
            redis.union(data).then(function (result) {
                console.log(result)
                //we need the actual packages now 
                Promise.all(result.map(redis.getPackage)).then(function (packages) {
                    // console.log(packages);
                    var packagesString = JSON.stringify(packages); 
                    //
                    services.manifestService.exportExcel(mid,packagesString,dir).then((mREsult)=>{
                       // res.send({"packages":packagesString}); 
                         res.download(mREsult.file); 
                    }); 
                });

            });


    });
    
});
module.exports = router;