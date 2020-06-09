var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var ejsmate = require('ejs-mate');
var helmet = require('helmet')
var session = require('client-sessions');

// Account
var accountPasswordRouter = require('./routes/account/password');
var accountPrintRouter = require('./routes/account/print');

// Admin
var authRouter = require('./routes/auth');
var adminIndexRouter = require('./routes/index');
var adminUserRouter = require('./routes/admin/users');
var adminCustRouter = require('./routes/admin/customers');
var adminLocaRouter = require('./routes/admin/locations');
var adminZonesRouter = require('./routes/admin/zones');

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

// API
var apiPrinterRouter = require('./routes/api/printer');
var apiWarehouseRouter = require('./routes/api/wapi');
var apiCustomerRouter = require('./routes/api/customer');
var apiCubeRouter = require('./routes/api/cube');

var warehouse = require('./routes/warehouse');
var util = require('./routes/util');

var app = express();
app.set('trust proxy');

// Use Helmet
app.use(helmet())

// Xss Filter
app.use(helmet.xssFilter())

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
let sessionExpireDuration = 15 * 60 * 1000; // 15 min

app.use(session({
  cookieName: 'session',
  secret: 'Silver123.',
  duration: sessionExpireDuration,
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


app.use('/', adminIndexRouter, authRouter);
app.use('/account', accountPasswordRouter, accountPrintRouter);
app.use('/admin', adminUserRouter, adminCustRouter, adminLocaRouter, adminZonesRouter);
app.use('/warehouse', warehouse, warehouseAwbRouter, warehouseManifestRouter, warehouseServiceTypeRouter, warehouseShipperRouter, warehousePaidTypeRouter, warehouseAirlineRouter, warehouseContainerRouter, warehouseCarrierRouter, warehousePackageRouter, warehousePrinterRouter, warehouseDeliveryRouter, warehouseHazmatRouter,warehouseCubeRouter,warehousePriceLabelRouter);
app.use('/fleet', fleetVehicleRouter, fleetDriverRouter, fleetPilotRouter, fleetPlaneRouter, fleetCompartmentRouter, fleetAirportsRouter);
app.use('/store', storeRouter);
app.use('/util', util);

app.use('/api/printer', apiPrinterRouter);
app.use('/api/warehouse', apiWarehouseRouter);
app.use('/api/customer', apiCustomerRouter);
app.use('/api/cube', apiCubeRouter)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
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
