var express = require('express');
var router = express.Router();
var middleware = require('../middleware');
var services = require('../Services/RedisDataServices');
var momentz = require('moment-timezone')

router.get('/', function (req, res, next) {
  
  if (req.session.token){
    res.redirect('/dashboard')
  }
  else{
    // res.render('index',{process:process.env});
    if(process.env.LOGIN_REDIRECT.replace('\n','') == "true" ){
      let loginurl = process.env.LOGIN_URL.replace('\n','');
      if(loginurl.includes('postbox')){
        console.log(process.env.LOGIN_URL , "Login Url" )
        res.redirect(loginurl)
      }
    res.redirect(loginurl)
    }
    else{
    res.render('index',{process:process.env});
    }
  }

});
const adminMiddleware = (req,res,next)=>{
  console.log("customerawb32423")
  req.session.isAdmin ? next() : res.redirect("/customer/awb")   
}

// router.get('/report',adminMiddleware, middleware(services.userService).checkSession, function (req, res, next) {
//   services.userService.getAllUsers().then( users =>
//     res.render('pages/report', {
//       page: req.originalUrl,
//       title: "Reports",
//       user: res.user,
//       package_status: {
//         1: 'Received in FLL',
//         2: 'Loaded on AirCraft',
//         3: 'In Transit',
//         4: 'In Warehouse Nassuau',
//         5: 'Ready for Pickup / Delivery',
//         6: 'Delivered',
//         7: 'No Invoice Present',
//         8: 'Assigned to cube',
//         9: 'Delivered to Store'
//       },
//       users: users
//     })
//   )
// });

router.get('/dashboard', middleware(services.userService).checkSession, function (req, res, next) {
  if(res.user.roles[0].type == 'Customers'){
    services.awbService.getAwbCustomer(res.user._id,req).then(async (awbs) => {
      return Promise.all(
      awbs.map(async (data,i) =>{
        let awb = await services.awbService.getAwbPriceLabel(data._id)
        if(awb){
          data = data.toJSON()
          data.price = awb.TotalWet ? awb.TotalWet : '' 
        }
        return data
      })
      ).then(awbs => {
      res.render('pages/customerDashboard', {
        page: req.originalUrl,
        title: "AirWay Bills",
        user: res.user,
        awbs: awbs,   
        clear: req.query.clear
      })
    })
  })

  }else{
    services.userService.getAllUsersData().then( users =>
      res.render('pages/dashboard', {
        page: req.originalUrl,
      title: "Dashboard",
      user: res.user,
      package_status: {
        1: 'Received in FLL',
        2: 'Loaded on AirCraft',
        3: 'In Transit',
        4: 'In Warehouse Nassuau',
        5: 'Ready for Pickup / Delivery',
        6: 'Delivered',
      },
      users: users,
      query : req.query
    })
    )
  }
});

router.post("/global-search", middleware().checkSession, (req,res,next) => {
  services.packageService.getGlobalSearchData(req.body).then((result)=> {
    res.send(result);
  })
})

module.exports = router;
