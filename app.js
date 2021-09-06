var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var ejsmate = require('ejs-mate');
var helmet = require('helmet')
var session = require('client-sessions');
const createConnection = require('./Util/mongo');
const mongoose = require('mongoose');


// Account
var accountPasswordRouter = require('./routes/account/password');
var accountPrintRouter = require('./routes/account/print');

// Cron 
var {cronSchedule} = require('./cron')
// Admin
var authRouter = require('./routes/auth');
var adminIndexRouter = require('./routes/index');
var adminUserRouter = require('./routes/admin/users');
var adminCustRouter = require('./routes/admin/customers');
var adminCustomerchildRouter = require('./routes/admin/customerchild');
var adminLocaRouter = require('./routes/admin/locations');
var adminZonesRouter = require('./routes/admin/zones');
var adminInvoicessRouter = require('./routes/admin/invoice');

// Fleet
var fleetVehicleRouter = require('./routes/fleet/vehicles');
var fleetDriverRouter = require('./routes/fleet/drivers');
var fleetPilotRouter = require('./routes/fleet/pilots');
var fleetPlaneRouter = require('./routes/fleet/plane');
var fleetCompartmentRouter = require('./routes/fleet/compartment');
var fleetAirportsRouter = require('./routes/fleet/airport');

// Warehouse
var warehouseAwbRouter = require('./routes/warehouse/awb');
var warehouseManifestRouter = require('./routes/warehouse/manifest');
var warehouseShipperRouter = require('./routes/warehouse/shipper');
var warehousePaidTypeRouter = require('./routes/warehouse/paid-type');
var warehouseServiceTypeRouter = require('./routes/warehouse/service-type');
var warehouseAirlineRouter = require('./routes/warehouse/airline');
var warehouseContainerRouter = require('./routes/warehouse/container');

var warehouseCarrierRouter = require('./routes/warehouse/carrier');
var warehousePackageRouter = require('./routes/warehouse/package');
var warehousePriceLabelRouter = require('./routes/warehouse/price-label');
var warehousePrinterRouter = require('./routes/warehouse/print');
var warehouseDeliveryRouter = require('./routes/warehouse/delivery');
var warehouseHazmatRouter = require('./routes/warehouse/hazmat');
var warehouseCubeRouter = require('./routes/warehouse/cube');

// Store
var storeRouter = require('./routes/store/store');

//Customer
var customerLoginRouter = require('./routes/customer/login')
var customerSignupRouter = require('./routes/customer/signup')
var customerchildRouter = require('./routes/customer/customerchild');

//reports
var reportRouter = require('./routes/reports/report');

// API
var apiPrinterRouter = require('./routes/api/printer');
var apiWarehouseRouter = require('./routes/api/wapi');
var apiCustomerRouter = require('./routes/api/customer');
var apiCubeRouter = require('./routes/api/cube');
var apiAwbRouter = require('./routes/api/awb');

// Email Router
var emailRouter = require('./routes/email');

var warehouse = require('./routes/warehouse');
var util = require('./routes/util');
const EmailService = require('./Util/EmailService');

var app = express();
app.set('trust proxy');

// Use Helmet
app.use(helmet())

// Xss Filter
app.use(helmet.xssFilter())

// CronSchedule
cronSchedule();

// view engine setup
global.appRoot = __dirname;
global.uploadRoot = __dirname + '/public/uploads';

app.engine("ejs", ejsmate);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.locals.moment = require('moment');
app.locals.helpers = require('./views/helpers');

// uncomment after placing your favicon in /public
app.use(logger('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
let sessionExpireDuration = 10 * 60 * 60 * 1000; // 10 hours

app.use(session({
  cookieName: 'session',
  secret: 'Silver123.',
  duration: sessionExpireDuration,
  isAdmin:false,
  activeDuration: sessionExpireDuration,
  cookie: {
    path: '/', 
    ephemeral: false, 
    httpOnly: true, 
    sameSite:'strict',
    secureProxy: (process.env.NODE_ENV === "development" ? false : true),
  }
}));

app.use(function (req, res, next) {
  if (req.headers.cookie && !req.session.token) {
    res.clearCookie('session');
  }
  next();
});

const adminMiddleware = (req,res,next)=>{
  console.log("customerawb123s")
  req.session.isAdmin ? next() : res.redirect('/customer/awb') 

}
const CustomerMiddleware = (req,res,next)=>{
  req.session.isAdmin ? res.redirect('/dashboard') :next();

}

// app.post('/nodemail',(req,res)=>{
//   // put this in file 
//   var email = require('./Util/EmailService')
//   const{to,subject,html} = req.body;
//   const emailsend = email.sendReportEmail(to,subject,html).then(data=>{
//     console.log(data)
    
//   })
//   })
// console.log(process.env);
app.use('/email',emailRouter);
app.use('/' ,adminIndexRouter, authRouter);
app.use('/account',accountPasswordRouter, accountPrintRouter);
app.use('/admin',adminMiddleware, adminUserRouter, adminCustRouter,adminCustomerchildRouter, adminLocaRouter, adminZonesRouter, adminInvoicessRouter);
app.use('/warehouse',adminMiddleware , warehouse, warehouseAwbRouter, warehouseManifestRouter, warehouseServiceTypeRouter, warehouseShipperRouter, warehousePaidTypeRouter, warehouseAirlineRouter, warehouseContainerRouter, warehouseCarrierRouter, warehousePackageRouter, warehousePrinterRouter, warehouseDeliveryRouter, warehouseHazmatRouter,warehouseCubeRouter,warehousePriceLabelRouter);
app.use('/fleet', adminMiddleware, fleetVehicleRouter, fleetDriverRouter, fleetPilotRouter, fleetPlaneRouter, fleetCompartmentRouter, fleetAirportsRouter);

app.use('/store',adminMiddleware, storeRouter);
app.use('/util', util);
app.use('/customer', CustomerMiddleware,customerLoginRouter,customerSignupRouter,customerchildRouter);
app.use('/reports',adminMiddleware, reportRouter)

app.use('/api/printer', apiPrinterRouter);
app.use('/api/warehouse', apiWarehouseRouter);
app.use('/api/customer', apiCustomerRouter);
app.use('/api/cube', apiCubeRouter);
app.use('/api/awb', apiAwbRouter)


// Version API
/**
 * 0: disconnected
  1: connected
  2: connecting
  3: disconnecting
 */
app.get('/status', (req, res, next) => {
  let readyStateObj = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  } 
  return res.send({connectivity : readyStateObj[mongoose.connection.readyState], version : process.env.APP_VERSION});  
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  // var err = new Error('Not Found');
  // err.status = 404;
  res.render('404')
  // next(err);
});


// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
