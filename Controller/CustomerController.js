var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var momentz = require('moment-timezone')
var helpers = require('../views/helpers')
const aws = require('../Util/aws');
var emailService = require('../Util/EmailService');

const mongoose = require('mongoose');

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
      customers : customers.map(utils.formattedRecord),
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

exports.get_customer_awbs = async (req, res) => {
  const customerId = mongoose.Types.ObjectId(res.user._id);
  let awbData = await services.awbService.getAwbsFullCustomer(customerId);
  let queryStatus = req.query.status,flag;
  
  if(awbData.length > 0){
      flag = 1
  }else{
      const result = await services.customerChildService.getCustomer({_id: customerId})
      if(result && result.parentCustomer && result.parentCustomer.id )
          awbData = await services.awbService.getAwbsFullCustomer(result.parentCustomer.id);
  }
  const awbResponse = await services.awbService.getAwbPriceAndStatus(awbData,queryStatus) 
 
  return res.render('pages/customerAwb', {
    page: req.originalUrl,
    query:req.query,
    title: "AirWay Bills",
    user: res.user,
    awbs: awbResponse,
    clear: req.query.clear
  });
  
}

exports.preview_awb = async(req,res)=>{
  const id = req.params.id;
  services.awbService.getAwbPreviewDetails(id).then((awb) => {
    awb['dateCreated'] = momentz(awb.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');
    awb._doc.createdBy = awb.createdBy ? (awb.createdBy.firstName || '')  + (awb.createdBy.lastName || ''): ''
    if (awb.invoices && awb.invoices.length) {
      awb.invoices = awb.invoices.map(invoice => {
        if (invoice.filename) {
          invoice.link = aws.getSignedUrl(invoice.filename);
        }
        return invoice;
      });
    }
    
    res.render('pages/customerAwbPreview', {
      page: req.originalUrl,
      title: "AWB #" + awb.awbId,
      user: res.user,
      awb: awb,
      shipper: awb.shipper,
      carrier: awb.carrier,
      hazmat: awb.hazmat
    });
  });
}


exports.billing = async(req,res)=>{
  const customerId = mongoose.Types.ObjectId(res.user._id);
  let awbData = await services.awbService.getAwbsFullCustomer(customerId);
  let queryStatus = req.query.status,flag;
  
  if(awbData.length > 0){
      flag = 1
  }else{
      const result = await services.customerChildService.getCustomer({_id: customerId})
      if(result && result.parentCustomer && result.parentCustomer.id )
          awbData = await services.awbService.getAwbsFullCustomer(result.parentCustomer.id);
  }
  const awbResponse = await services.awbService.getAwbPriceAndStatus(awbData,queryStatus) 
  // return res.json(awbResponse);
  return res.render('pages/customerBilling', {
    page: req.originalUrl,
    query:req.query,
    title: "Billing",
    user: res.user,
    awbs: awbResponse,
    clear: req.query.clear
  });
  return res.send("Hello there!");
}

exports.upload_invoices = async(req,res)=>{
  const customerId = mongoose.Types.ObjectId(res.user._id);
  const awbData = await services.awbService.getAwbsNoInvoiceCustomer(customerId);
  return res.render('pages/customerUploadInvoices', {
    page: req.originalUrl,
    query:req.query,
    title: "Upload Invoices in Advance",
    user: res.user,
    awbs: awbData,
    clear: req.query.clear
  });
}

exports.upload_invoice = async(req,res)=>{
 
  try{ 
    const files = req.file;
    const filePath = files.path?files.path:'';        
    var fileName = files.filename;
    
    if(req.body.fileType)
        fileName = fileName.split('.')[0] + '.' + req.body.fileType
        aws.uploadFile(filePath, fileName).then(async data => {
        console.log(`File Uploaded successfully. ${data.Location}`);            
        let invoiceObject ={
            fileName: fileName,
            filePath: data.Location,
            courierNo : req.body.courierNo,
            pmb : res.user.pmb,
            customerId : res.user._id
        }
        if(files.originalname)
            invoiceObject.name = files.originalname;
        let awbData
        if(req.body.awbId){
            invoiceObject.awbId = req.body.awbId;
            let customer = await services.customerService.getCustomer({_id : invoiceObject.customerId})
            let awb = await services.awbService.getAwb(req.body.awbId)
             emailService.sendInvoicesEmail(invoiceObject,customer,awb.awbId);
            awbData = await services.awbService.storeInvoiceFile(invoiceObject);
        }else{
            awbData = await services.awbService.storeAdditionalInvoceFile(invoiceObject);
        }
        res.send(awbData);

      }).catch(err => {
        throw err;
      })
   
}catch(err){
    console.log(err)
    res.status(500).json({ success: false, message: strings.string_response_error });
}
}

exports.profile = async(req,res)=>{
  let profile = {};
  try{
     profile = await services.customerService.getCustomerWithEmail(res.user.email);
  }catch(err){

  }
  
  return res.render('pages/customerProfile', {
    page: req.originalUrl,
    query:req.query,
    title: "Manage Your Profile",
    user: res.user,
    profile,
    clear: req.query.clear
  });
  
}

exports.updateProfile = async(req,res)=>{
  const body ={
    firstName:req.body.firstName,
    lastName:req.body.lastName,
    telephone:req.body.telephone,
  }
  try{
    await services.customerService.updateCustomer(res.user._id,body);
    return res.status(200).json({message:"Proflie updated successfully !"});
  }catch(err){
    res.status(500).json({ success: false, message: strings.string_response_error });
  }  
}


// exports.packageReports = async(req,res)=>{
//   const body ={
//     firstName:req.body.firstName,
//     lastName:req.body.lastName,
//     telephone:req.body.telephone,
//   }
//   try{
//     await services.customerService.updateCustomer(res.user._id,body);
//     return res.status(200).json({message:"Proflie updated successfully !"});
//   }catch(err){
//     res.status(500).json({ success: false, message: strings.string_response_error });
//   }  
// }


exports.packageReport = async(req, res, next)=>{    
  
  let title = 'All Packages'
  if(req.query.type == 'customer')
      title = 'Customer Package List'
  let customers = await services.customerService.getCustomers()
  let locations = await services.locationService.getLocations()
  services.packageService.getPackageDetailByCustomerId(req,{}).then((packages) => {
    // packages = packages.filter(data=>data.customerId == req.session.customerId)
    packages = packages.filter(data=>data.customerId == req.session.customerId)

    
      return Promise.all(
          packages.map(async(pkg, i) => {
              let check = 1,dimen = pkg.dimensions
              if(pkg.packageType == 'Cube' && pkg.masterDimensions)
                  dimen = pkg.masterDimensions 
              dimen.split('x').forEach(data =>{
                check = check * data
              })
              pkg.volumetricWeight = (check/166);
              return pkg
          })
      ).then(pkgs => {            
        
          res.render('pages/reports/customerpackagereport', {
              page: req.originalUrl,
              user: res.user,
              title: title,
              filterURL: '',
              buttonName: 'Add to Manifest',
              packages: pkgs,
              customerId:req.session.customerId,
              customers : customers,
              locations : locations,
              clear: req.query.clear,
              daterange:req.query.daterange?req.query.daterange:'',
              query:req.query
          });
      })

  });
}
