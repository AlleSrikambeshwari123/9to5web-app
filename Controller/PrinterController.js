var zip = require('express-zip');
var _ = require('lodash');
var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');
const strings = require('../Res/strings');
var AWBGeneration = require('../Util/AWBGeneration');
var awbPdfGen = new AWBGeneration();
var LBLGeneration = require('../Util/LBLGeneration');
var AirCargoManifest = require('../Util/AirCargoManifest');
var lblPdfGen = new LBLGeneration();

const convertKgToLbs = (value) => value * 2.20462262185

exports.send_print_awb = (req, res, next) => {
  var username = res.user.username;
  var awb = req.params.awb;
  services.printService.sendAwbToPrint(awb, username);
  res.send({ success: true, message: strings.string_response_print_awb })
}

exports.send_print_awb_labels = (req, res, next) => {
  var username = res.user.username;
  var awb = req.params.awb;
  services.printService.sendLblToPrint(awb, username);
  res.send({ success: true, message: strings.string_response_print_awb })
}

exports.send_print_single_label = (req, res, next) => {
  var username = res.user.username;
  var awb = req.params.awb;
  var pkgId = req.params.pkgId
  services.printService.sendLblToPrint(awb, username);
  res.send({ sent: true })
}

exports.add_printer = (req, res, next) => {
  services.printService.addPrinter(req.body.printer).then(result => {
    res.send(result);
  })
}

exports.get_printers = (req, res, next) => {
  services.printService.getPrinters().then(result => {
    res.send(result);
  })
}

exports.get_full_awb = (req, res, next) => {
  let id = req.params.id;
  getFullAwb(id).then(awb => {
    res.send(awb);
  })
}

exports.download_pdf_awb = (req, res, next) => {
  let id = req.params.id;
  console.log("Downloading AWB PDF", id);
  getFullAwb(id).then(awb => {
    awbPdfGen.generateAWb(awb).then(result => {
      res.download(result.path);
    })
  })
}

exports.download_pkg_labels = (req, res, next) => {
  let id = req.params.id;
  console.log("Downloading Package Label PDF", id);
  getFullAwb(id).then(awb => {
    lblPdfGen.generateAllPackageLabels(awb).then(results => {
      console.log(results);
      res.zip(results)
      // res.download(results);
    })
  })
}

exports.downloadAirCargoManifest = async (req, res, next) => {
  try {
    let manifest = await services.manifestService.getManifest(req.params.id);
    let packages = await services.packageService.getPackageOnManifest(req.params.id);
    let [airportFrom, airportTo] = await Promise.all([
      manifest.airportFromId && services.airportService.get(manifest.airportFromId),
      manifest.airportToId && services.airportService.get(manifest.airportToId),
    ]);

    let awbIds = _.uniqBy(packages, 'awbId')
      .map((i) => i.awbId)
      .filter(Boolean);
    let awbs = await Promise.all(awbIds.map((id) => services.awbService.getFullAwb(id)));

    let packagesByAWB = packages.reduce((acc, pkg) => {
      acc[pkg.awbId] = acc[pkg.awbId] || {};
      let item = acc[pkg.awbId];

      let awb = awbs.find((i) => i.id == pkg.awbId) || {};

      item.awb = awb.id;
      item.pieces = (item.pieces || 0) + 1;

      // in lbs
      let weight =
        pkg.packageCalculation === 'lbs' ? Number(pkg.weight) : convertKgToLbs(Number(pkg.weight));
      item.weight = (item.weight || 0) + weight;
      item.consignee = {
        name: String(
          awb.customer && [awb.customer.firstName, awb.customer.lastName].filter(Boolean).join(' '),
        ),
        address: String(awb.customer && awb.customer.address),
      };
      item.shipper = {
        name: String(awb.shipper && awb.shipper.name),
        address: String(awb.shipper && awb.shipper.address),
      };

      return acc;
    }, {});

    let airCargoManifest = new AirCargoManifest({
      owner: 'Nine To Five Import Export LLC',
      marksOfNationalityAndRegistration: 'United States - N296TA',
      flightNumber: '',
      date: manifest.shipDate,
      portOfLading: String(airportFrom && airportFrom.name),
      portOfOnlading: String(airportTo && airportTo.name),
      rows: Object.values(packagesByAWB),
    });
    let stream = await airCargoManifest.generate();
    res.type('pdf');
    res.attachment(`${manifest.id}-ACM.pdf`);
    stream.pipe(res);
    stream.end();
  } catch (error) {
    next(error);
  }
};

exports.generate_awb_pdf = (req, res, next) => {
  getFullAwb(req.params.id).then(awb => {
    awbPdfGen.generateAWb(awb).then(result => {
      res.send(result);
    })
  })
}

exports.generate_pkg_label_pdf = (req, res, next) => {
  services.packageService.getPackage(req.params.id).then(package => {
    getFullAwb(package.awbId).then(awb => {
      lblPdfGen.generateSinglePackageLabel(awb, package).then(result => {
        res.send(result);
      })
    })
  })
}

function getFullAwb(id) {
  return new Promise((resolve, reject) => {
    Promise.all([
      services.awbService.getAwb(id),
      services.packageService.getPackages(id),
      services.invoiceService.getInvoicesByAWB(id),
    ]).then(results => {
      let awb = results[0];
      let packages = results[1];
      let invoices = results[2];
      Promise.all([
        services.customerService.getCustomer(awb.customerId),
        services.shipperService.getShipper(awb.shipper),
        services.carrierService.getCarrier(awb.carrier),
        services.hazmatService.getHazmat(awb.hazmat),
      ]).then(otherInfos => {
        awb.packages = packages;
        awb.invoices = invoices;
        awb.customer = otherInfos[0];
        delete awb.customer.password;
        delete awb.customer.confirmPassword;
        awb.shipper = otherInfos[1];
        awb.carrier = otherInfos[2];
        awb.hazmat = otherInfos[3];

        resolve(awb);
      })
    });
  });
}