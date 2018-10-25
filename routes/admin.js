var express = require('express');
var router = express.Router();
var services = require('../DataServices/services');
var middleware = require('../middleware');
var redis = require('../DataServices/redis');

var customerService = require('../DataServices/CustomerService').Customer;

/* GET users listing. */
router.get('/', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var pageData = {};
    pageData.title = "Dashboard";
    pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
    pageData.RoleId = res.User.RoleId;
    res.render('pages/admin/dashboard', pageData);
});
router.get('/users', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var pageData = {};
    pageData.title = "System Users"
    pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
    pageData.RoleId = res.User.RoleId;
    services.userService.getAllUsers().then(function (userResult) {
        console.log(userResult);
        pageData.users = userResult.users;
        res.render('pages/admin/users', pageData);
    });

});
router.get('/user/:username?', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var pageData = {};
    var user = req.params.username;
    pageData.RoleId = res.User.RoleId;
    console.log('user is');
    console.log(res.User);
    pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
    //get the user 
    services.userService.getUser(user).then(function (uResult) {
        services.userService.getRoles().then(function (rResult) {
            pageData.roles = rResult.roles;
            pageData.user = uResult.user;
            pageData.title = "Save User";
            console.log(uResult.user);
            res.render('pages/admin/saveUser', pageData);
        });
    });
});
router.post('/enable-user', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var body = req.body;
    var username = body.username;
    var enabled = body.enabled;
    services.userService.enableUser(username, enabled).then(function (result) {

        res.send(result);
    });
});
router.post('/rm-user', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var body = req.body;
    var username = body.username;
    services.userService.removeUser(username).then(function (result) {
        res.send(result);
    });
});
router.post('/user/', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var body = req.body;
    console.log(body);
    var user = {
        username: body.username,
        firstname: body.firstname,
        lastname: body.lastname,
        password: body.password,
        email: body.email,
        mobile: body.mobile,
        roleId: Number(body.userRole)
    };
    services.userService.getRoles().then(function (rResult) {
        services.userService.saveUser(user).then(function (suResult) {
            if (suResult.saved == true) {
                res.redirect('/admin/users');
            } else {
                var pageData = {};
                pageData.user = user;
                pageData.roles = rResult.roles;
                pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
                res.render('pages/admin/saveUser', pageData);
            }
        });
    });


});
router.get('/customers/:currentPage?', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var pageData = {};
    var currentPage = Number(req.params.currentPage);
    if (isNaN(currentPage))
        currentPage = 1;
    pageData.title = "Tropical Customers"
    pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
    pageData.RoleId = res.User.RoleId;
    pageData.owners = [];
    services.customerService.listCustomers(currentPage, 20).then(function (customers) {

        var psIndex = 1;
        var peIndex = 10;
        if (currentPage >= 10) {
            psIndex = currentPage - 5;
            peIndex = currentPage + 5;
        }
        if (peIndex + 5 > customers.data.TotalPages) {
            peIndex = customers.data.TotalPages;
        }
        var pagerInfo = {
            pages: customers.data.TotalPages,
            currentPage: currentPage,
            startPage: psIndex,
            endPage: peIndex,
            totalRecords: customers.data.totalPages
        }
        pageData.records = customers.data.Records;
        pageData.pagerInfo = pagerInfo;
        console.log(pageData.pagerInfo);
        res.render('pages/admin/customers', pageData);
    });
    // redis.customerList(20,currentPage).then((ownerKeys)=> { 
    //     Promise.all(ownerKeys.boxes.map(redis.hgetall)).then(function (ownersResult) {
    //      //we need to get TOTAL PAGES / count 
    //      //we need 
    //                  pageData.records = ownersResult; 
    //                  pageData.pagerInfo = ownerKeys; 
    //                  console.log(ownerKeys); 
    //                 res.render('pages/admin/customers',pageData);    
    //     });

    // }); 

});
router.get('/customer-edit/:skybox', middleware(services.userService).requireAuthentication, function (req, res, next) {
var body = req.body; 
var skybox = Number(req.params.skybox); 
services.customerService.getCustomer(skybox).then((customer)=>{
    var pageData = {};

        pageData.title = "Tropical Customer"
        pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
        pageData.RoleId = res.User.RoleId;
        pageData.customer = customer.customer;
        console.log(customer);
    res.render('pages/admin/customerEdit',pageData); 
})
}); 
router.post('/customer-edit',middleware(services.userService).requireAuthentication, function (req, res, next) {
    var body = req.body; 
    console.log(body); 
    var customer = { 
        id: Number(body.id),
        skybox : Number(body.skybox ),
        name : body.name, 
        email: body.email, 
        mobile: body.mobile, 
        isBusiness : body.isBusiness,
        area:body.area,
    }; 
    if (customer.isBusiness == "on")
        customer.isBusiness = true;
    else 
        customer.isBusiness =false ; 

    services.customerService.saveCustomer(customer).then(function(result){
        var bvalue = 0 ; 
        if (customer.isBusiness == true){
            bvalue = 1 ; 
        }
        redis.seth(`tew:owners:${customer.skybox}`,"isBusiness", bvalue).then(function(r){
            console.log('set the customer as a business'); 
        }); 
        res.redirect(  '/admin/customers?m='+customer.skybox); 
    }).catch((e)=>{

    }); 

});
router.post('/customers/', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var searchText = req.body.searchText;
    services.customerService.findCustomers(searchText).then((result) => {
        var pageData = {};

        pageData.title = "Tropical Customers"
        pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
        pageData.RoleId = res.User.RoleId;
        pageData.records = result.data;
        res.render('pages/admin/customerSearch.ejs', pageData)
    })
});
module.exports = router;