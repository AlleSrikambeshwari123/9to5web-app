var express = require('express');
var router = express.Router();
var services = require('./DataServices/services.js'); 
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
router.post('/',function(req,res,next){
  var body = req.body; 
  var username = body.username; 
  var password = body.password; 
  services.userService.
  res.render('index', { title: 'Express' });
});
router.get('/logout',function(req,res,next){

});


module.exports = router;
