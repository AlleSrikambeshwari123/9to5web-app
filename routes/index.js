var express = require('express');
var router = express.Router();
var services = require('../DataServices/services.js'); 
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
router.post('/',function(req,res,next){
  var body = req.body; 
  var username = body.username; 
  var password = body.password; 
  services.userService.authenticate(username,password).then(function(authresult){
    if (authresult.valid == true){
      services.userService.generateToken(authresult.user).then(function(token){
        req.session.token = token;
        var cuser = authresult.user; 
        
        if (cuser.RoleId == 1){
 
         //replace with admin dashboard
         res.redirect('/admin/'); 
        }
        else {
          //replace with general user dashboard
         res.redirect('/users/'); 
        }
     });
    }
    else {
      res.render('index', { title: 'Express' });
    }
    
    console.log('auth results'); 
    console.log(authresult);
  }); 
  
});
router.get('/logout',function(req,res,next){
  req.session.reset();

  res.redirect('/');
});

module.exports = router;
