var express = require('express');
var router = express.Router();
var services = require('../DataServices/services'); 
var middleware = require('../middleware'); 
/* GET users listing. */
router.get('/',middleware(services.userService).requireAuthentication, function(req, res, next) {
    var pageData = {}; 
    pageData.title = "Dashboard"; 
    pageData.luser = res.User.FirstName+ ' '+res.User.LastName;
    pageData.RoleId = res.User.RoleId; 
  res.render('pages/admin/dashboard',pageData);
});
router.get('/users',middleware(services.userService).requireAuthentication, function(req, res, next) {
    var pageData = {}; 
    pageData.title = "System Users"
    pageData.luser = res.User.FirstName+ ' '+res.User.LastName;
    pageData.RoleId = res.User.RoleId; 
    services.userService.getAllUsers().then(function(userResult){
        console.log(userResult); 
        pageData.users = userResult.users; 
        res.render('pages/admin/users',pageData);
    }); 

  });
router.get('/user/:username?',middleware(services.userService).requireAuthentication,function(req,res,next){
    var pageData = {}; 
    var user = req.params.username; 
    pageData.RoleId = res.User.RoleId; 
    console.log('user is');
    console.log(res.User); 
    pageData.luser = res.User.FirstName+ ' '+res.User.LastName;
        //get the user 
        services.userService.getUser(user).then(function(uResult){
            services.userService.getRoles().then(function(rResult){
                pageData.roles = rResult.roles; 
                pageData.user = uResult.user; 
                pageData.title = "Save User"; 
                console.log(uResult.user);
                res.render('pages/admin/saveUser',pageData);
             });     
        }); 
}); 
router.post('/enable-user',middleware(services.userService).requireAuthentication,function(req,res,next){
    var body = req.body; 
    var username = body.username; 
    var enabled = body.enabled; 
    services.userService.enableUser(username,enabled).then(function(result){
        
        res.send(result); 
    }); 
}); 
router.post('/rm-user',middleware(services.userService).requireAuthentication,function(req,res,next){
    var body = req.body; 
    var username = body.username; 
    services.userService.removeUser(username).then(function(result){
        res.send(result); 
    }); 
}); 
router.post('/user/',middleware(services.userService).requireAuthentication,function(req,res,next){
    var body = req.body;
    console.log(body);
    var user = { 
        username : body.username,
        firstname : body.firstname,
        lastname:body.lastname,
        password:body.password, 
        email:body.email,
        mobile:body.mobile, 
        roleId : Number(body.userRole)
    };  
    services.userService.getRoles().then(function(rResult){
        services.userService.saveUser(user).then(function(suResult){
            if (suResult.saved == true){
                res.redirect('/admin/users'); 
            }
            else {
                var pageData = {}; 
                pageData.user = user; 
                pageData.roles = rResult.roles;
                pageData.luser = res.User.FirstName+ ' '+res.User.LastName;
                res.render('pages/admin/saveUser',pageData);
            }
        });
    });
    
    
}); 



module.exports = router;
