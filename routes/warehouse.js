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
    redis.hgetall('tew:owners:'+skybox).then((result)=>{
        console.log(result);
        if (result == null )
            res.send({err:'Could not get customer information'});
        //send err
        else  
            res.send(result);
    }).catch((err)=>{
        res.send({err:'Could not get customer information'});
    });
    
});
router.get('/get-mpackages/:mid',middleware(services.userService).requireAuthentication, (req, res, next) => {
    var manifestKey = `manifest:${package.mid}:${package.mtype}:${container}:${containerNo}`; 
    redis.getMembers(manifestKey).then(function(members){
        res.send(members)
    }); 
});
router.post('/save-package',middleware(services.userService).requireAuthentication, (req, res, next) => {
    var body = req.body;
    var package = {
        trackingNo: body.tracking,
        description: body.description,
        shipper: body.shipper,
        value: Number(body.value),
        pieces: Number(body.pieces),
        weight: Number(body.weight),
        mid:body.mid,
        mtype:body.mtype
    }
    var container = ""; 
    var containerNo = ""
    if (typeof body.bag != "undefined"){
        package.bag = body.bag;
        container= "bag";
        containerNo = package.bag; 
    }
    if(typeof body.skid != "undefined"){
        package.skid = body.skid; 
        container = "skid"; 
        containerNo = package.skid; 
    }
    //save the package to the package NS
    redis.hmset('packages:'+package.trackingNo,package).then(function(result){
        var manifestKey = `manifest:${package.mid}:${package.mtype}:${container}:${containerNo}`; 
        redis.setAdd(manifestKey,package.trackingNo).then(function(sResult){
            //get the members one time here 
            console.log(manifestKey); 
            redis.getMembers(manifestKey)
            .then( (data) => Promise.all(data.map(redis.getPackage)))
            .then( function(data){
                res.send({saved:true, packages:data});
            }).catch((err3)=>{
                res.send({err:err3,saved:true,listing:false})
            });
            
        }).catch(function(err){
            res.send({saved:false});
        }); 
    }).catch(function(err2){
        res.send({saved:false})
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
    redis.hmset('packages:'+package.trackingNo,package); 
    console.log(package);
    res.redirect('/warehouse/packages'); 
});
module.exports = router;