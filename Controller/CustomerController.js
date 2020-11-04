var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var momentz = require('moment-timezone')


exports.get_customer_awb_list = (req, res, next) => {
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
}

exports.get_customer_package_list = (req, res, next) => {
  services.packageService.getPopulatedCustomerPackages(res.user._id).then((packages) => {
      return Promise.all(
          packages.map(async(pkg, i) => {
              let awb = await services.printService.getAWBDataForPackagesRelatedEntitie(pkg.awbId._id);
              packages[i].pieces = awb.packages ? awb.packages.length : 0
              packages[i].packageNumber = "PK00" + packages[i].id;
              return pkg
          })
      ).then(pkgs => {
          res.render('pages/customerDashboard', {
              page: req.originalUrl,
              user: res.user,
              title: 'All Packages',
              filterURL: '',
              buttonName: 'Add to Manifest',
              packages: pkgs,
          });
      })
  });
};

exports.get_customer_list = (req, res, next) => {
  Promise.all([
    services.locationService.getLocations(),
    services.customerService.getCustomers(req),
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
      companies: companies,
      clear: req.query.clear
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
