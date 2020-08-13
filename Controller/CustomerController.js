var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var momentz = require('moment-timezone')


exports.preview_customer_awb = (req, res, next) => {
  let id =res.user._id
  console.log("res",res.user)

  services.awbService.getAwbsCustomer(id).then((awb)=>{
    console.log("awb",awb)
    if(awb){
      awb['dateCreated'] = momentz(awb.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');
      awb._doc.createdBy = awb.createdBy ? (awb.createdBy.firstName || '')  + (awb.createdBy.lastName || ''): ''
      // console.log("awb",awb)
      if (awb.invoices && awb.invoices.length) {
        awb.invoices = awb.invoices.map(invoice => {
          if (invoice.filename) {
          invoice.link = aws.getSignedUrl(invoice.filename);
        }
      invoice['dateCreated'] = momentz(invoice.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');

        // console.log("invoice",invoice)
        return invoice;
      });
      }
    }
    console.log("check",awb)
    if(awb){

      res.render('pages/customerDashboard', {
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
};

exports.get_customer_list = (req, res, next) => {
  Promise.all([
    services.locationService.getLocations(),
    services.customerService.getCustomers(),
    services.locationService.getCompanies()
  ]).then(results => {
    const locations = results[0];
    const customers = results[1];
    const companies = results[2];

    res.render('pages/admin/customers/list', {
      page: req.originalUrl,
      title: "Consignee",
      user: res.user,
      customers: customers.map(utils.formattedRecord),
      locations: locations,
      companies: companies
    })
  })
}

exports.create_customer = (req, res, next) => {
  Promise.all([
    services.locationService.getLocations(),
    services.locationService.getCompanies()
  ]).then((results) => {
    res.render('pages/admin/customers/create', {
      page: req.originalUrl,
      title: "Create New Consignee",
      user: res.user,
      locations: results[0],
      companies: results[1]
    })
  });
}

exports.signup_customer = (req, res, next) => {
  if (req.session.token){
    res.redirect('/dashboard');
  }
  else{
    Promise.all([
      services.locationService.getLocations(),
      services.locationService.getCompanies()
    ]).then((results) => {
      res.render('signup', {
        page: req.originalUrl,
        title: "Sign Up",
        user: res.user,
        locations: results[0],
        companies: results[1]
      })
    });
  }
}

exports.add_new_customer = (req, res, next) => {
  // req.body['createdBy'] = req['userId'];
  req.body['createdBy'] = "5ea9202aa056fb0a07ef9b8b";
  services.customerService.createCustomer(req.body).then(result => {
    res.send(result);
  }).catch(err=>{
    console.log(err);
  })
}

exports.get_customer_detail = (req, res, next) => {
  Promise.all([
    services.locationService.getLocations(),
    services.customerService.getCustomer({_id: req.params.id}),
    services.locationService.getCompanies()
  ]).then(results => {
    res.render('pages/admin/customers/edit', {
      page: req.originalUrl,
      title: "Consignee Details",
      user: res.user,
      locations: results[0],
      customer: results[1],
      companies: results[2]
    })
  })
}

exports.update_customer = (req, res, next) => {
  services.customerService.updateCustomer(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_customer = (req, res, next) => {
  services.customerService.removeCustomer(req.params.id).then(result => {
    res.send(result);
  })
}
