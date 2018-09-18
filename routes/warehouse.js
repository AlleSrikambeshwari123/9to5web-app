var express = require('express');
var router = express.Router();
var services = require('../DataServices/services');
var middleware = require('../middleware');
var moment = require('moment');
var redis = require('../DataServices/redis');
//Manifest Routes
router.get('/list-manifest', middleware(services.userService).requireAuthentication, (req, res, next) => {
    var pageData = {};
    pageData.title = "Manifest";
    pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
    pageData.RoleId = res.User.RoleId;
    services.manifestService.listAllManifest().then((result) => {
        console.log('listing');
        console.log(result);
        pageData.listing = result.listing;

        res.render('pages/warehouse/list-manifest', pageData);
    });

});
router.get('/m-packages/:manifestId', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var pageData = {};
    pageData.title = "Manifest Packages";
    pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
    pageData.RoleId = res.User.RoleId;
    pageData.mid = Number(req.params.manifestId);
    console.log(pageData.mid);

    //we want to format the manifest number to 3 digits 
    res.render('pages/warehouse/manifest-packages', pageData);
});
router.post('/create-manifest', middleware(services.userService).requireAuthentication, function (req, res, next) {
    console.log(res.User);
    services.manifestService.createManfiest(res.User.Username).then((result) => {
        res.send(result);
    });
});
router.get('/mlist', middleware(services.userService).requireAuthentication, (req, res, next) => {
    services.manifestService.listAllManifest().then((result) => {
        res.send(result.listing);
    });
});
router.get('/packages', middleware(services.userService).requireAuthentication, (req, res, next) => {
    var pageData = {};
    pageData.title = "Add Packages";
    pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
    pageData.RoleId = res.User.RoleId;
    res.render('pages/warehouse/add-package.ejs', pageData);


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
    console.log(manifestKey); 
    //so we get the keys 
    redis.getKeys(manifestKey).then((data) => {
        console.log('matches'); 
        console.log(data); 
        redis.union(data).then(function (result) {
            console.log(result)
            //we need the actual packages now 
            Promise.all(result.map(redis.getPackage)).then(function(packages){
               // console.log(packages);
                res.send(packages);
            });
            
        });


    });

});
router.get('/load-package/:trackNo',middleware(services.userService).requireAuthentication, (req, res, next) => {
    var trackingNo = req.params.trackNo; 
    redis.getPackage(trackingNo).then((package)=>{
        res.send(package); 
    }); 
});
router.post('/rm-package',middleware(services.userService).requireAuthentication, (req, res, next) => {
    var trackingNo = req.body.trackNo;
    var manifest = req.body.manifest; 
    var manifestKey = "manifest:"+manifest+":*"; 
    redis.del('package:'+ trackingNo).then(function(result){
        redis.getKeys(manifestKey).then((kResult)=>{
            //the list of all the sets ...we need to remove the key from each one 
            kResult.array.forEach(element => {
                redis.srem(element,trackingNo);
            });
        });
        res.send({deleted:true}); 

        //we also need to remove from any sets 
    }); 

});
router.post('/save-package', middleware(services.userService).requireAuthentication, (req, res, next) => {
    var body = req.body;
    var package = {
        skybox:body.skybox,
        customer:body.customer.replace('-','').trim(),
        trackingNo: body.tracking,
        description: body.description,
        shipper: body.shipper,
        value: Number(body.value),
        pieces: Number(body.pieces),
        weight: Number(body.weight),
        mid: body.mid,
        mtype: body.mtype
    }
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
    //save the package to the package NS
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
module.exports = router;