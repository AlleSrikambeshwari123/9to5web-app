var express = require('express');
var router = express.Router();
var middleware = require('../middleware');
var services = require('../RedisServices/RedisDataServices');

router.get('/', function (req, res, next) {
  console.log('req.sessions',req.session)
  if (req.session.token)
    res.redirect('/dashboard');
  else
    res.render('index');
});

router.get('/dashboard', middleware(services.userService).checkSession, function (req, res, next) {
  res.render('pages/dashboard', {
    page: req.originalUrl,
    title: "Dashboard",
    user: res.user,
    package_status: {
      1: 'Received in FLL',
      2: 'Loaded on AirCraft',
      3: 'In Transit',
      4: 'Recieved in NAS',
      5: 'Ready for Pickup / Delivery',
      6: 'Delivered',
	  }
  });
});

router.post("/global-search", middleware().checkSession, (req,res,next) => {
  services.packageService.getGlobalSearchData(req.body).then((result)=> {
    res.send(result);
  })
})

module.exports = router;
