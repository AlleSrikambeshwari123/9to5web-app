var zip = require('express-zip');
var services = require('../RedisServices/RedisDataServices');
var utils = require('../Util/utils');
const strings = require('../Res/strings');
var AWBGeneration = require('../Util/AWBGeneration');
var awbPdfGen = new AWBGeneration();
var LBLGeneration = require('../Util/LBLGeneration');
var lblPdfGen = new LBLGeneration();

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
    ]).then(results => {
      let awb = results[0];
      let packages = results[1];
      Promise.all([
        services.customerService.getCustomer(awb.customerId),
        services.shipperService.getShipper(awb.shipper),
        services.shipperService.getShipper(awb.carrier),
        services.hazmatService.getClass(awb.hazmat),
      ]).then(otherInfos => {
        awb.packages = packages;
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