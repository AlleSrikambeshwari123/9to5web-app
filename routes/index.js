var express = require('express');
var router = express.Router();
var middleware = require('../middleware');
var services = require('../Services/RedisDataServices');
var momentz = require('moment-timezone')

router.get('/', function (req, res, next) {
  if (req.session.token)
    res.redirect('/dashboard');
  else
    res.render('index');
});

router.get('/report', middleware(services.userService).checkSession, function (req, res, next) {
  services.userService.getAllUsers().then( users =>
    res.render('pages/report', {
      page: req.originalUrl,
      title: "Reports",
      user: res.user,
      package_status: {
        1: 'Received in FLL',
        2: 'Loaded on AirCraft',
        3: 'In Transit',
        4: 'Recieved in NAS',
        5: 'Ready for Pickup / Delivery',
        6: 'Delivered',
        7: 'No Invoice Present',
        8: 'Assigned to cube',
        9: 'Delivered to Store'
      },
      users: users
    })
  )
});

router.get('/dashboard', middleware(services.userService).checkSession, function (req, res, next) {
  if(res.user.roles[0].type == 'Customers'){
    
    let id =res.user._id
    services.awbService.getAwbsCustomer(id).then((awb)=>{
      if(awb){
        awb['dateCreated'] = momentz(awb.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');
        awb._doc.createdBy = awb.createdBy ? (awb.createdBy.firstName || '')  + (awb.createdBy.lastName || ''): ''
        if (awb.invoices && awb.invoices.length) {
          awb.invoices = awb.invoices.map(invoice => {
            if (invoice.filename) {
            invoice.link = aws.getSignedUrl(invoice.filename);
          }
        invoice['dateCreated'] = momentz(invoice.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');
        return invoice;
        });
        }
      }
      if(awb){
        res.render('pages/warehouse/awb/invoice', {
          page: req.originalUrl,
          title: "AWB #" + awb.awbId,
          user: res.user,
          awb: awb,
          shipper: awb.shipper,
          carrier: awb.carrier,
          hazmat: awb.hazmat
        });
      }else{
        awb = {}
        res.render('pages/emptyDashboard', {
          page: req.originalUrl,
          title: "Home",
          awb: awb,
          user: res.user,
          shipper: awb.shipper,
          carrier: awb.carrier,
          hazmat: awb.hazmat
        });
      }
    });

  }else{
    services.userService.getAllUsers().then( users =>
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
      },
      users: users
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
