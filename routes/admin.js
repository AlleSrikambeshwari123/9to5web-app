var express = require('express');
var router = express.Router();
var services = require('../RedisServices/RedisDataServices'); 
var middleware = require('../middleware');

var RedisCustomerService = require('../RedisServices/CustomerService').CustomerService
var rCusomterService = new RedisCustomerService(); 

/* GET users listing. */
router.get('/', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var pageData = {};
    pageData.title = "Dashboard";
    console.log(res.User); 
    pageData.luser = res.User.firstName + ' ' + res.User.lastName;
    pageData.RoleId = res.User.role;
    res.render('pages/admin/dashboard', pageData);
});
router.get('/users', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var pageData = {};
    pageData.title = "System Users"
    console.log(res.User,"here");
    pageData.luser = res.User.firstName + ' ' + res.User.lastName;
    pageData.RoleId = res.User.role;
    
    console.log(pageData,"here")
    services.userService.getAllUsers().then(function (userResult) {
        console.log(userResult);
        pageData.users = userResult;
        res.render('pages/admin/users', pageData);
    });

});
router.get('/user/:username?', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var pageData = {};
    var user = req.params.username;
    pageData.luser = res.User.firstName + ' ' + res.User.lastName;
    pageData.RoleId = res.User.role;
    //get the user 
    console.log('loading up user page'); 
    services.userService.getUser(user).then(function (uResult) {
        console.log(uResult,"found user")
        services.userService.getRoles().then(function (rResult) {
            console.log(rResult,"roles"); 
            pageData.roles = rResult;
            pageData.user = uResult.user;
            pageData.title = "Save User";
            console.log(uResult.user);
            if (!pageData.user.id)
                pageData.user.id = 0 ; 
            if (!pageData.user.role)
                pageData.user.role = ''; 
            
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
router.post('/user/',  function (req, res, next) {
    var body = req.body;
    console.log(body);
    var user = {
        id:body.id,
        username: body.username,
        firstName: body.firstname,
        lastName: body.lastname,
        password: body.password,
        email: body.email,
        mobile: body.mobile,
        role:body.userRole
    };

    console.log(typeof user.role,"ROLE TYPE")
   
    services.userService.getRoles().then(function (rResult) {
        services.userService.saveUser(user).then(function (suResult) {
            console.log(suResult,"save user Results")
            if (suResult.saved == true) {
                res.redirect('/admin/users');
            } else {
                var pageData = {};
                pageData.user = user;
                pageData.roles = rResult.roles;
                //pageData.luser = res.User.FirstName + ' ' + res.User.LastName;
                pageData.luser = "Admin 9-5 Imports"
                res.render('pages/admin/saveUser', pageData);
            }
        });
    });


});
router.get('/locations',middleware(services.userService).requireAuthentication, function (req, res, next){
    var pageData = {}; 
    pageData.title = "Customers"
    pageData.luser = res.User.firstName + ' ' + res.User.lastName;
    pageData.RoleId = res.User.role;
    services.locationService.getLocations().then(locations=>{
        console.log("list of locations ", locations); 
        pageData.locations = locations.locations;
        res.render("pages/Stores/locations",pageData)
    })

}); 
router.get('/add-locations/:locationId?', middleware(services.userService).requireAuthentication,function(req, res, next) {
    var pageData = {};
      pageData.title = "Locations"

      pageData.luser = res.User.firstName + ' ' + res.User.lastName;
      pageData.RoleId = res.User.role;
      if (req.params.locationId){
        services.locationService.getLocation(req.params.locationId).then(locationRes=>{
            console.log("got the location",locationRes); 
            pageData.location = locationRes.location; 
            res.render('pages/Stores/new-location',pageData);
        })
      }
      else {
          pageData.location = {
              id:0,
              name :"", 
              phone :"",
              address:""
          }
          res.render('pages/Stores/new-location',pageData);
      }
    
  });
router.post('/add-location',middleware(services.userService).requireAuthentication, function (req, res, next){
    var body = req.body; 
    console.log(body, 'saving location'); 
    if (Number(body.id)>0){
        services.locationService.updateLocation(body).then(result=>{
            if (result.saved == true){
                res.redirect('/admin/locations'); 
                var pageData = {}; 
                pageData.title = "Location Details"
                pageData.luser = res.User.firstName + ' ' + res.User.lastName;
                pageData.RoleId = res.User.role;
                pageData.location = body;
            }
        })
    }
    else {
        services.locationService.saveLocation(body).then(results=>{
            if (results.saved == true){
                res.redirect('/admin/locations')
            }
            else {
                var pageData = {}; 
                pageData.title = "Location Details"
                pageData.luser = res.User.firstName + ' ' + res.User.lastName;
                pageData.RoleId = res.User.role;
                pageData.location = location;
                res.render('/pages/Stores/add-location',pageData)
            }
        })
    }
   
})
router.get('/customersV1/', middleware(services.userService).requireAuthentication, function (req, res, next) {
    console.log("HERE");
    var pageData = {}; 
        pageData.title = "Customers"
    pageData.luser = res.User.firstName + ' ' + res.User.lastName;
    pageData.RoleId = res.User.role;
    pageData.owners = [];
    rCusomterService.listCustomers(1,25).then((pResult)=>{
        var pagerInfo = {
            totalRecords: pResult.totalResults
        }
        pageData.records = pResult.customers;
        pageData.pagerInfo = pagerInfo;
        console.log("result " + pResult.totalResults)
        console.log(pageData.pagerInfo);
        res.render('pages/admin/customers', pageData);
    })
});
router.get('/customersV1/:currentPage?', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var currentPage = Number(req.params.currentPage);
    var pageData = {}; 
    if (isNaN(currentPage))
        currentPage = 1;
        pageData.title = "Tropical Customers"
    pageData.luser = res.User.firstName + ' ' + res.User.lastName;
    pageData.RoleId = res.User.role;
    pageData.owners = [];
    rCusomterService.listCustomers(currentPage,10).then((pResult)=>{
        var psIndex = 1;
        var peIndex = 10;
        if (currentPage >= 10) {
            psIndex = currentPage - 5;
            peIndex = currentPage + 5;
        }
        if (peIndex + 5 > pResult.TotalPages) {
            peIndex = pResult.TotalPages;
        }
        var pagerInfo = {
            pages: pResult.TotalPages,
            currentPage: currentPage,
            startPage: psIndex,
            endPage: peIndex,
            totalRecords: pResult.totalResults
        }
        pageData.records = pResult.customers;
        pageData.pagerInfo = pagerInfo;
        console.log(pageData.pagerInfo);
        res.render('pages/admin/customers', pageData);
    })

});
router.post('/customersV1/:currentPage?', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var searchText = req.body.searchText;
    var currentPage = Number(req.body.rpage)
    if (isNaN(currentPage)){
        currentPage = 1; 
    }
    console.log('we are looking for '+ searchText + " on the page "+currentPage);
    if (searchText == ''){
        res.redirect('/admin/customersV1'); 
    }
    else 
        rCusomterService.searchCustomers(searchText,currentPage,20).then((result) => {
                var pageData = {};

                pageData.title = "Tropical Customers"
                pageData.searchText = searchText;
                pageData.luser = res.User.firstName + ' ' + res.User.lastName;
                pageData.RoleId = res.User.role;
                pageData.records = result.customers;
                var psIndex = 1;
                var peIndex = 10;
                if (currentPage >= 10) {
                    psIndex = currentPage - 5;
                    peIndex = currentPage + 5;
                }
                if (peIndex + 5 > result.TotalPages) {
                    peIndex = result.TotalPages;
                }
                var pagerInfo = {
                    pages: result.TotalPages,
                    currentPage: currentPage,
                    startPage: psIndex,
                    endPage: peIndex,
                    totalRecords: result.totalResults
                }
                pageData.records = result.customers;
                pageData.pagerInfo = pagerInfo;
                res.render('pages/admin/customerSearch.ejs', pageData)
        })
});
router.get('/customers/:currentPage?', middleware(services.userService).requireAuthentication, function (req, res, next) {
    console.log("HERE_AAA");
    var pageData = {};
    var currentPage = Number(req.params.currentPage);
    if (isNaN(currentPage))
        currentPage = 1;
    pageData.title = "Tropical Customers"
    pageData.luser = res.User.firstName + ' ' + res.User.lastName;
    pageData.RoleId = res.User.role;
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
var skybox = Number(req.params.skybox.replace("T-","")); 
console.log(skybox); 
rCusomterService.getCustomer(skybox).then((customer)=>{
    services.locationService.getLocations().then(locations=>{
        console.log(customer);
        var pageData = {};
        pageData.title = "9-5 Customer"
        pageData.luser = res.User.firstName + ' ' + res.User.lastName;
        pageData.RoleId = res.User.role;
        pageData.customer = customer;
        pageData.locations = locations.locations; 
        res.render('pages/admin/customerEdit',pageData); 
    })
   
});

}); 
router.post('/customer-edit',middleware(services.userService).requireAuthentication, function (req, res, next) {
    var body = req.body; 
    console.log(body); 
    var customer = { 
        id: Number(body.id),
        pmb : Number(body.pmb ),
        name : body.name, 
        firstName: body.firstName,
        lastName:body.lastName,
        email: body.email, 
        mobile: body.mobile,   
        area:body.area,
    }; 
    if (customer.isBusiness == "on")
        customer.isBusiness = true;
    else 
        customer.isBusiness =false ; 
    rCusomterService.saveCustomer(customer).then((result)=>{
        res.redirect('/admin/customersV1/')
    }); 
    // services.customerService.saveCustomer(customer).then(function(result){
    //     var bvalue = 0 ; 
    //     if (customer.isBusiness == true){
    //         bvalue = 1 ; 
    //     }
    //     redis.seth(`tew:owners:${customer.skybox}`,"isBusiness", bvalue).then(function(r){
    //         console.log('set the customer as a business'); 
    //     }); 
    //     res.redirect(  '/admin/customers?m='+customer.skybox); 
    // }).catch((e)=>{

    // }); 

});
router.post('/customers/', middleware(services.userService).requireAuthentication, function (req, res, next) {
    var searchText = req.body.searchText;
    services.customerService.findCustomers(searchText).then((result) => {
        var pageData = {};

        pageData.title = "Customers"
        pageData.luser = res.User.firstName + ' ' + res.User.lastName;
        pageData.RoleId = res.User.role;
        pageData.records = result.data;
        res.render('pages/admin/customerSearch.ejs', pageData)
    })
});
module.exports = router;