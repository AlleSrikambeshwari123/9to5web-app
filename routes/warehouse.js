var express = require('express');
var router = express.Router();
var services = require('../DataServices/services'); 
var middleware = require('../middleware'); 
var moment = require('moment'); 
//Manifest Routes
router.get('/list-manifest',middleware(services.userService).requireAuthentication,(req,res,next)=>{
    var pageData = {}; 
    pageData.title = "Manifest"; 
    pageData.luser = res.User.FirstName+ ' '+res.User.LastName;
    pageData.RoleId = res.User.RoleId; 
    services.manifestService.listAllManifest().then((result)=>{
        console.log('listing'); 
        console.log(result);
        pageData.listing = result.listing; 

        res.render('pages/warehouse/list-manifest',pageData); 
    });
    
}); 
router.get('/m-packages/:manifestId',middleware(services.userService).requireAuthentication,function(req,res,next){
    var pageData = {}; 
    pageData.title = "Manifest Packages"; 
    pageData.luser = res.User.FirstName+ ' '+res.User.LastName;
    pageData.RoleId = res.User.RoleId; 
    res.render('pages/warehouse/manifest-packages',pageData);
});
router.post('/create-manifest',middleware(services.userService).requireAuthentication,function(req,res,next){
    console.log(res.User);
    services.manifestService.createManfiest(res.User.Username).then((result)=>{
        res.send(result); 
    });
});
router.get('/mlist',middleware(services.userService).requireAuthentication,(req,res,next)=>{
    services.manifestService.listAllManifest().then((result)=>{
       res.send(result.listing);
    });
});
router.get('/packages',middleware(services.userService).requireAuthentication,(req,res,next)=>{
    var pageData = {}; 
    pageData.title = "Add Packages"; 
    pageData.luser = res.User.FirstName+ ' '+res.User.LastName;
    pageData.RoleId = res.User.RoleId; 
    res.render('pages/warehouse/add-package.ejs',pageData);
});
router.post('/packages',middleware(services.userService).requireAuthentication,(req,res,next)=>{

});
module.exports = router;