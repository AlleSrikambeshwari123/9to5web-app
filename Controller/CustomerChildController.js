var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
var momentz = require('moment-timezone')
const aws = require('../Util/aws');
var helpers = require('../views/helpers')

exports.get_customer_list = (req, res, next) => {
  Promise.all([
    services.customerChildService.getAllCustomers(req)
  ]).then(results => {
    const customers = results[0];
    res.render('pages/admin/customerchild/list', {
      page: req.originalUrl,
      title: "Consignee",
      user: res.user,
      customers: customers.map(utils.formattedRecord),
      clear: req.query.clear
    })
  })
}

exports.get_customers = (req,res,next)=>{
  if(req.body.clear)
    req.body.daterange =''
  services.customerChildService.getAllCustomers(req).then(async(results) => {
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
      customerDetail.push(helpers.getFullName(customers[i].parentCustomer));
      customerDetail.push(helpers.formatDate(customers[i].createdAt));
      customerDetail.push(helpers.getFullName(customers[i]))
      customerDetail.push(customers[i].email);
      
      let action = `<a href='manage/${customers[i].id}/get'><i class="fas fa-user-edit"></i></a>
      <button class='btn btn-link btn-danger rm-customer ml-3'  onclick="deleteCustomer(this)" data-id='${customers[i].id}'><i class="fas fa-trash"></i></a>`
      customerDetail.push(action)
       data.push(customerDetail);
    }
    dataTable.data = data;
    res.json(dataTable);
  })
}

exports.get_sub_customer_list = (req, res, next) => {
  Promise.all([
    services.customerChildService.getCustomers(req,{createdBy : req.params.customerId })
  ]).then(results => {
    const  customers = results[0]
    res.render('pages/customer/customerchild/list', {
      page: req.originalUrl,
      title: "Consignee",
      user: res.user,
      customers: customers.map(utils.formattedRecord),
      createdBy : req.params.customerId,
      clear: req.query.clear
    })
  })
}

exports.create_customer = (req, res, next) => {
  Promise.all([
    services.customerService.getCustomers()
  ]).then((results) => {
    res.render('pages/admin/customerchild/create', {
      page: req.originalUrl,
      title: "Create New Sub Consignee",
      user: res.user,
      customers: results[0]
    })
  });
}

exports.create_sub_customer = (req, res, next) => {
  Promise.all([
    services.customerService.getCustomers()
  ]).then((results) => {
    res.render('pages/customer/customerchild/create', {
      page: req.originalUrl,
      title: "Create New Sub Consignee",
      user: res.user,
      customers: results[0]
    })
  });
}

exports.add_new_customer = (req, res, next) => {
  req.body['createdBy'] = req['userId'];
  services.customerChildService.createCustomer(req.body).then(result => {
    res.send(result);
  }).catch(err=>{
    console.log(err);
  })
}

exports.get_customer_detail = (req, res, next) => {
  Promise.all([
    services.customerChildService.getCustomer({_id: req.params.id})
  ]).then(results => {
    res.render('pages/admin/customerchild/edit', {
      page: req.originalUrl,
      title: "Consignee Details",
      user: res.user,
      customer: results[0],
    })
  })
}

exports.get_sub_customer_detail = (req, res, next) => {
  Promise.all([
    services.customerChildService.getCustomer({_id: req.params.id})
  ]).then(results => {
    res.render('pages/customer/customerchild/edit', {
      page: req.originalUrl,
      title: "Consignee Details",
      user: res.user,
      customer: results[0],
    })
  })
}

exports.update_customer = (req, res, next) => {
  services.customerChildService.updateCustomer(req.params.id, req.body).then(result => {
    res.send(result);
  })
}

exports.delete_customer = (req, res, next) => {
  services.customerChildService.removeCustomer(req.params.id).then(result => {
    res.send(result);
  })
}

exports.get_sub_customer_no_docs = (req, res, next) => {
  Promise.all([
    services.customerChildService.getCustomerAwbsNoDocs(req,{createdBy : req.params.customerId})
  ]).then(results => {
    res.render('pages/customer/no-docs/list', {
      page: req.originalUrl,
      title: "Consignee No docs Details",
      user: res.user,
      awbs: results[0],
      createdBy : req.params.customerId,
      clear: req.query.clear
    })
  })
}

exports.preview_awb = (req, res, next) => {
  let id = req.params.id;
  
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
    res.render('pages/customer/awb/preview', {
      page: req.originalUrl,
      title: "AWB #" + awb.awbId,
      user: res.user,
      awb: awb,
      shipper: awb.shipper,
      carrier: awb.carrier,
      hazmat: awb.hazmat
    });
  });
};