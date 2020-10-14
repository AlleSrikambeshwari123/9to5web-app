var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var momentz = require('moment-timezone')
var helpers = require('../views/helpers')


exports.get_customer_awb_list = (req, res, next) => {
    services.awbService.getAwbCustomer(res.user._id).then(async (awbs) => {
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
      companies: companies,
      daterange:req.query.daterange?req.query.daterange:'',
      clear:req.query.clear
    })
  })
}
exports.get_customers = (req,res,next)=>{
  if(!req.body.daterange && !req.body.clear){
    var st = new Date();
    var d = new Date();
    d.setDate(d.getDate() -7);
    req.body.daterange = st.getMonth()+'/'+st.getDate()+'/'+st.getFullYear()+ ' - ' + d.getMonth()+'/'+d.getDate()+'/'+d.getFullYear();
  }
  if(req.body.clear)
    req.body.daterange =''
  services.customerService.getAllCustomers(req).then(async(results) => {
    const customers = results.customers;
    var dataTable = {
      draw: req.query.draw,
      recordsTotal: results.total,
      recordsFiltered: results.total,
      data:[]
    }
    var data = [];
    for(var i=0; i< customers.length; i++){
      var customerDetail = [];
      customerDetail.push(customers[i].company.name);
      customerDetail.push(helpers.formatDate(customers[i].createdAt));
      customerDetail.push(customers[i].pmb)
      customerDetail.push(helpers.getFullName(customers[i]))
      customerDetail.push(customers[i].email);
      customerDetail.push(customers[i].telephone)
      if(customers[i].location && customers[i].location.name)
        customerDetail.push(customers[i].location.name)
      else
        customerDetail.push('')
      
      let action = `<a href='manage/${customers[i].id}/get'><i class="fas fa-user-edit"></i></a>`
      customerDetail.push(action)
       data.push(customerDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
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
