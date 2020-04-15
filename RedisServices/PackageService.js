var emailService = require('../Util/EmailService');
var moment = require('moment');
var fs = require('fs');
var uniqId = require('uniqid');
var strings = require('../Res/strings');
var firebase = require('../Util/firebase');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PREFIX = strings.redis_prefix_package;
const PACKAGE_ID = strings.redis_id_package;
const PREFIX_PACKAGE_LIST = strings.redis_prefix_awb_package_list; // this key + awbId = array of packages

const LIST_PACKAGE_SHIPMENT = 'list:shipment:'; // this key + shipmentId = array of packages
const SHIPMENT_ID = 'id:accept:truck';

const PREFIX_ORIGIN_BARCODE = strings.redis_prefix_origin_barcode;
const ORIGIN_BARCODE_ID = strings.redis_id_origin_barcode;

const LIST_PACKAGE_MANIFEST = strings.redis_prefix_manifest_package_list;
const LIST_LOCATION_PACKAGE = strings.redis_prefix_location_package_list;

const PREFIX_PACKAGE_STATUS = strings.redis_prefix_package_status;
const ID_PACKAGE_STATUS = strings.redis_id_package_status;
const LIST_PACKAGE_STATUS = strings.redis_prefix_list_package_status;

const PKG_STATUS = {
  1: 'Received in FLL',
  2: 'Loaded on AirCraft',
  3: 'In Transit',
  4: 'Recieved in NAS',
  5: 'Ready for Pickup / Delivery',
  6: 'Delivered',
};

const Package = require('../models/package');
const PackageStatus = require('../models/packageStatus');

function createDocument(tPackage) {
  var packageDocument = {
    id: tPackage.id,
    trackingNo: tPackage.trackingNo,
    barcode: tPackage.barcode,
    skybox: tPackage.skybox,
    dateRecieved: moment().unix(),
    awb: 0,
    mid: 0,
    volume: 0,
    weight: tPackage.weight,
    pieces: tPackage.pieces,
    customer: tPackage.customer,
    shipper: tPackage.shipper,
    description: tPackage.description,
    dimensions: tPackage.dimensions,
    carrier: tPackage.carrier,
    //skyboxV: tPackage.skybox, add dimenion
    status: tPackage.status,
    mid: tPackage.mid,
    value: tPackage.value,
  };
  return packageDocument;
}

function addPackageToIndex(trackingNo, msearcher) {
  lredis.getPackage(trackingNo).then((pack) => {
    msearcher.delDocument(PKG_IDX, `${pack.mid}-${trackingNo}`, (err, done) => {
      var document = createDocument(pack);
      console.log('readding package to the index like a boss ' + trackingNo);
      msearcher.add(pack.mid + '-' + pack.trackingNo, document);
    });
  });
}

class PackageService {
  constructor() {
    this.services = {};
  }

  setServiceInstances(services) {
    this.services = services;
  }

  //========== Dashboard Functions ==========//
  getAllPackages() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX + '*', (err, keys) => {
        if (err) resolve([]);
        else {
          Promise.all(
            keys.map((key) => {
              return lredis.hgetall(key);
            }),
          ).then((results) => {
            resolve(results);
          });
        }
      });
    });
  }

  //========== Dashboard Functions ==========//
  getAllPackages_updated() {
    return new Promise((resolve, reject) => {
      Package.find({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      });
    });
  }

  async getAllPackagesWithLastStatus() {
    let packages = await this.getAllPackages_updated();
    console.log("packages--", packages )
    return await Promise.all(
      packages.map(async (pkg) => {
        let status = await this.services.packageService.getPackageLastStatus(pkg.id);
        pkg.lastStatusText = status && status.status;
        return pkg;
      }),
    );
  }

  addOriginBarcode(originBarcode) {
    return new Promise((resolve, reject) => {
      client.incr(ORIGIN_BARCODE_ID, (err, id) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        originBarcode.id = id;
        client.hmset(PREFIX_ORIGIN_BARCODE + id, originBarcode, (err, result) => {
          if (err) resolve({ success: false, message: strings.string_response_error });
          resolve({ success: true, message: strings.string_response_added, originBarcode: originBarcode });
        })
      })
    })
  }

  removeOriginBarcode(id) {
    return new Promise((resolve, reject) => {
      client.del(PREFIX_ORIGIN_BARCODE + id, (err, result) => {
        if (err) resolve({ success: false, message: strings.string_response_error });
        resolve({ success: true, message: strings.string_response_removed });
      })
    });
  }
  getOriginBarcode(id) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX_ORIGIN_BARCODE + id, (err, originBarcode) => {
        if (err) resolve({});
        resolve(originBarcode);
      })
    });
  }
  getAllOriginBarcode() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX_ORIGIN_BARCODE + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.hgetall(key);
        })).then(originBarcodes => {
          resolve(originBarcodes);
        })
      })
    })
  }
  removeAllOriginBarcode() {
    return new Promise((resolve, reject) => {
      client.set(ORIGIN_BARCODE_ID, 0);
      client.keys(PREFIX_ORIGIN_BARCODE + '*', (err, keys) => {
        if (err) resolve([]);
        Promise.all(keys.map(key => {
          return lredis.del(key);
        })).then(result => {
          resolve(result);
        })
      })
    });
  }

  getPackage(packageId) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + packageId, (err, pkg) => {
        if (err || pkg == null) resolve({});
        else resolve(pkg);
      });
    });
  }

  async getAWBPackagesWithLastStatus(awbId) {
    const packages = await this.getPackages(awbId);
    await Promise.all(
      packages.map(async (pkg) => {
        let status = await this.getPackageLastStatus(pkg.id);
        pkg.lastStatusText = status && status.status;
      }),
    );

    return packages;
  }

  async getAWBPackagesWithLastStatus_updated(awbId) {
    const packages = await this.getPackages_updated(awbId);
    await Promise.all(
      packages.map(async (pkg) => {
        let status = await this.getPackageLastStatus_updated(pkg._id);
        pkg.lastStatusText = status && status.status;
      }),
    );

    return packages;
  }

  getPackages_updated(awbId) {
    return new Promise((resolve, reject) => {
      Package.find({awbId: awbId}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      });
    });
  }

  // Only show 7 trackingNo on the list;
  getPackages(awbId) {
    return new Promise((resolve, reject) => {
      client.smembers(PREFIX_PACKAGE_LIST + awbId, (err, ids) => {
        if (err) resolve([]);
        Promise.all(
          ids.map((id) => {
            return lredis.hgetall(PREFIX + id);
          }),
        ).then((packages) => {
          resolve(packages);
        });
      });
    });
  }

  getAwbPackageOverview(awbId) {
    // get the awb packages and add everything in
    return new Promise((resolve, reject) => {
      this.getPackages(awbId).then((packages) => {
        let weight = 0;
        var pieces = packages.length;
        var description = '';
        packages.forEach((pkg) => {
          weight += Number(pkg.weight);
          description = pkg.description;
        });
        resolve({ weight: weight, description: description, pieces: pieces });
      });
    });
  }

  getPackageWeightInLBS(pkg) {
    // From client side code it seems like 'kg' is default, so we check for lbs and fallback to kg
    if (pkg.packageCalculation === 'lbs') {
      return Number(pkg.weight);
    }
    return Number(pkg.weight) * 2.20462262185;
  }

  createPackages(awbId, packages) {
    return new Promise((resolve, reject) => {
      Promise.all(
        packages.map((pkg) => {
          return this.createPackage(pkg, awbId);
        }),
      ).then((result) => {
        resolve({ success: true });
      });
    });
  }

  createPackage(newPackage, awbId) {
    // var cPackage = {
    //   skybox: body.skybox,
    //   customer: body.customer.replace("-", "").trim(),
    //   trackingNo: body.tracking,
    //   description: body.description,
    //   shipper: body.shipper,
    //   carrier: body.carrier,
    //   value: Number(body.value),
    //   pieces: Number(body.pieces),
    //   weight: Number(body.weight),
    //   dimensions: body.dimensions,
    //   status: 1,
    //   location: "FLL",
    //   mid: 0,
    //   awb: 0,
    // }
    return new Promise((resolve, reject) => {
      const barid = +newPackage.originBarcode.split(',')[1];
      newPackage.awbId = awbId;
      newPackage.id = Date.now().toString();
      newPackage.trackingNo = uniqId();
      newPackage.originBarcode = newPackage.originBarcode.split(',')[0];
      const newPackageData = new Package(newPackage);
      newPackageData.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          this.updatePackageStatus(result['_id'], 1, newPackage.createdBy)
          resolve({ success: true });
        }
      });
    });
  }

  updatePackage(id, pkg) {
    return new Promise((resolve, reject) => {
      client.hmset(PREFIX + id, pkg);
      resolve({ success: true });
    });
  }

  updatePackage_updated(id, pkg) {
    return new Promise(async(resolve, reject) => {

      Package.findOneAndUpdate({_id: id},pkg, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          console.log("packagesssssssssss,",pkg)
          resolve({ success: true });
        }
      })
    });
  }

  removePackages_updated(awbId) {
    return new Promise((resolve, reject) => {
      Package.deleteMany({awbId: awbId}, (err, result) => {
        if (err) {
          resolve({success: false, message: strings.string_response_error});
        } else {
          resolve(result);
        }
      });
    });
  }

  removePackage_updated(awbId) {
    return new Promise((resolve, reject) => {
      Package.deleteMany({awbId: awbId}, (err, result) => {
        if (err) {
          resolve({success: false, message: strings.string_response_error});
        } else {
          resolve(result);
        }
      });
    });
  }

  removePackage_updated(id) {
    return new Promise((resolve, reject) => {
      Package.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({success: false, message: strings.string_response_error});
        } else {
          resolve(result);
        }
      });
    });
  }

  removePackages(awbId) {
    return new Promise((resolve, reject) => {
      client.smembers(PREFIX_PACKAGE_LIST + awbId, (err, ids) => {
        Promise.all(
          ids.map((id) => {
            return this.removePackage(awbId, id);
          }),
        ).then((results) => {
          resolve(results);
        });
      });
    });
  }

  removePackage(awbId, id) {
    return new Promise((resolve, reject) => {
      client.del(PREFIX + id);
      client.srem(PREFIX_PACKAGE_LIST + awbId, id);
      resolve({ success: true });
    });
  }

  removePackagesStatusByPackageIds(packageIds) {
    return new Promise((resolve, reject) => {
      if (!(packageIds && packageIds.length)) {
        return resolve({success: true});
      }
      PackageStatus.deleteMany({packageId: {$in: packageIds}}, (err, result) => {
        if (err) {
          resolve({success: false});
        } else {
          resolve({success: true});
        }
      });
    });
  }

  getPackagesInFll() {
    return new Promise((resolve, reject) => {
      this.getAllPackages().then((packages) => {
        Promise.all(
          packages.map((pkg) => {
            return this.getPackageLastStatus(pkg.id);
          }),
        ).then((stats) => {
          let pkgs = [];
          stats.forEach((status, i) => {
            packages[i].lastStatusText = status.status;
            if (status.status == PKG_STATUS[1] || status.status == PKG_STATUS[2])
              pkgs.push(packages[i]);
          });
          resolve(pkgs);
        });
      });
    });
  }

  getPackagesInFll_updated() {
    return new Promise((resolve, reject) => {
      this.getAllPackages_updated().then((packages) => {
        Promise.all(
          packages.map((pkg) => {
            return this.getPackageLastStatus_updated(pkg._id);
          }),
        ).then((stats) => {
          let pkgs = [];
          stats.forEach((status, i) => {
            packages[i].lastStatusText = status.status;
            if (status.status == PKG_STATUS[1] || status.status == PKG_STATUS[2])
              pkgs.push(packages[i]);
          });
          resolve(pkgs);
        });
      });
    });
  }

  getPackagesInNas() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX + '*', (err, keys) => {
        Promise.all(
          keys.map((key) => {
            return lredis.hgetall(key);
          }),
        ).then((packages) => {
          console.log(packages);
          Promise.all(
            packages.map((pkg) => {
              return this.getPackageLastStatus(pkg.id);
            }),
          ).then((stats) => {
            console.log(stats);
            let pkgs = [];
            stats.forEach((stat, i) => {
              packages[i].lastStatusText = stat.status;
              if (stat.status == PKG_STATUS[4]) pkgs.push(packages[i]);
            });
            resolve(pkgs);
          });
        });
      });
    });
  }

  getPackagesInNas_updated() {
    return new Promise((resolve, reject) => {
      this.getAllPackages_updated().then((packages) => {
        Promise.all(
          packages.map((pkg) => {
            return this.getPackageLastStatus_updated(pkg._id);
          }),
        ).then((stats) => {
          let pkgs = [];
          stats.forEach((status, i) => {
            packages[i].lastStatusText = status.status;
            if (stat.status == PKG_STATUS[4])
              pkgs.push(packages[i]);
          });
          resolve(pkgs);
        });
      });
    });
  }

  //========== Receive Packages From Truck that arrived at Airport ==========//
  getShipmentId() {
    return new Promise((resolve, reject) => {
      client.incr(SHIPMENT_ID, (err, reply) => {
        if (err) {
          console.error(err);
          resolve(null);
        }
        resolve(reply);
      });
    });
  }
  addPackageToShipment(barcodes, username) {
    return new Promise((resolve, reject) => {
      this.getShipmentId().then((shipmentId) => {
        let packageIds = barcodes.split(',');
        client.sadd(LIST_PACKAGE_SHIPMENT + shipmentId, packageIds, (err, reply) =>
          console.log(err, reply),
        );
        Promise.all(
          packageIds.map((packageId) => {
            return this.updatePackageStatus(packageId, 1, username);
          }),
        ).then((result) => {
          resolve({
            success: true,
            message: strings.string_response_received,
            shipmentId: shipmentId,
          });
        });
      });
    });
  }

  //========== Load Packages to AirCraft (Add to Manifest) ==========//
  addToFlight(packageIds, manifestId, compartmentId, username) {
    return new Promise((resolve, reject) => {

      let packages = packageIds.split(',').filter(Boolean);
      if (packages.length === 0) {
        return resolve({ success: false, message: 'Please select packages.' });
      }



      Promise.all(
        packages.map((packageId) => {
          console.log('.dd',packageId)
          return Promise.all([
            this.updatePackageStatus(packageId, 2, username),
            this.updatePackage_updated(packageId, {
              manifestId: manifestId,
              compartmentId: compartmentId,
            }),
            //lredis.setAdd(LIST_PACKAGE_MANIFEST + manifestId, packages),
          ]);
        }),
      ).then((results) => {
        resolve({ success: true, message: strings.string_response_loaded });
      });
    });
  }
  getPackageOnManifest(manifestId) {
    return new Promise(async(resolve, reject) => {
      let packages = await Package.find({manifestId: manifestId})
      resolve(packages)
    });
  }

  //========== Ship Packages in Manifest ==========//
  updateManifestPackageToInTransit(manifestId, username) {
    return new Promise((resolve, reject) => {
      this.getPackageOnManifest(manifestId).then((packages) => {
        Promise.all(
          packages.map((pkg) => {
            return this.updatePackageStatus(pkg.id, 3, username);
          }),
        ).then((results) => {
          resolve({ success: true, message: strings.string_response_updated });
        });
      });
    });
  }
  //========== Receive Packages in Manifest ==========//
  updateManifestPackageToReceived(manifestId, username) {
    return new Promise((resolve, reject) => {
      this.getPackageOnManifest(manifestId).then((packages) => {
        // Promise.all(packages.map(pkg => {
        //   return this.updatePackageStatus(pkg.id, 4, username);
        // })).then(results => {
        resolve({ success: true, message: strings.string_response_updated });
        // })
      });
    });
  }

  //========== Receive Packages in Nas Airport ==========//
  receivePackageFromPlane(barcodes, username) {
    return new Promise((resolve, reject) => {
      let packageIds = barcodes.split(',');
      Promise.all(
        packageIds.map((packageId) => {
          return this.updatePackageStatus(packageId, 4, username);
        }),
      ).then((result) => {
        resolve({ success: true, message: strings.string_response_received });
      });
    });
  }

  //========== Deliver Package to the Customer ==========//
  checkOutToCustomer(barcodes, username) {
    return new Promise((resolve, reject) => {
      let packageIds = barcodes.split(',');
      Promise.all(
        packageIds.map((packageId) => {
          return this.updatePackageStatus(packageId, 6, username);
        }),
      ).then((result) => {
        resolve({ success: true, message: strings.string_response_received });
      });
    });
  }

  //========== Check In Store ==========//
  checkInStore(locationId, packageIds, username) {
    packageIds = packageIds.split(',');
    return new Promise((resolve, reject) => {
      Promise.all(
        packageIds.map((packageId) => {
          this.updatePackage(packageId, {
            locationId: locationId,
          });
          return this.updatePackageStatus(packageId, 6, username);
        }),
      ).then((result) => {
        client.sadd(LIST_LOCATION_PACKAGE + locationId, packageIds);
        resolve({ success: true, message: strings.string_response_stored });
      });
    });
  }

  getPackagesInLocation(locationId) {
    return new Promise((resolve, reject) => {
      client.smembers(LIST_LOCATION_PACKAGE + locationId, (err, ids) => {
        Promise.all(
          ids.map((id) => {
            return this.getPackage(id);
          }),
        ).then((pkgs) => {
          resolve(pkgs);
        });
      });
    });
  }

  getPackage_updated(packageId) {
    return new Promise((resolve, reject) => {
      Package.findOne({_id: packageId}, (err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      });
    })
  }

  //========== Package Status ==========//
  updatePackageStatus(packageId, status, userId) {
    return new Promise((resolve, reject) => {
      const packageStatus = {
        packageId: packageId,
        status: PKG_STATUS[status],
        updatedBy: userId
      };

      const newPackageStatusData = new PackageStatus(packageStatus);
      console.log("ddddddddddddddddddddddd")
      newPackageStatusData.save((err, packageStatus) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          this.getPackage_updated(packageId).then((pkg) => {
            this.services.awbService.getAwb(pkg.awbId).then((awb) => {
              firebase.sendNotification(
                awb.customer,
                'Package Status Updated',
                'Package-' + pkg.trackingNo + ' Updated',
              );
            });
          });
           console.log("fffffffffffffff")
          resolve({ success: true, message: strings.string_response_updated });
        }
      });

      // client.incr(ID_PACKAGE_STATUS, (err, id) => {
      //   client.hmset(PREFIX_PACKAGE_STATUS + id, {
      //     id: id,
      //     packageId: packageId,
      //     statusId: status,
      //     status: PKG_STATUS[status],
      //     datetimestamp: moment()
      //       .utc()
      //       .unix(),
      //     updatedBy: username,
      //   });
      //   client.sadd(LIST_PACKAGE_STATUS + packageId, id);
      //   this.getPackage(packageId).then((pkg) => {
      //     this.services.awbService.getAwb(pkg.awbId).then((awb) => {
      //       firebase.sendNotification(
      //         awb.customer,
      //         'Package Status Updated',
      //         'Package-' + pkg.trackingNo + ' Updated',
      //       );
      //     });
      //   });
      //   resolve({ success: true, message: strings.string_response_updated });
      // });
    });
  }

  getPackageLastStatus(packageId) {
    return new Promise((resolve, reject) => {
      this.getPackageStatuses_updated(packageId).then((stats) => {
        if (stats.length == 0) resolve(PKG_STATUS[1]);
        else resolve(stats[stats.length - 1]);
      });
    });
  }

  getPackageLastStatus_updated(packageId) {
    return new Promise((resolve, reject) => {
      this.getPackageStatuses_updated(packageId).then((stats) => {
        if (stats.length == 0) resolve(PKG_STATUS[1]);
        else resolve(stats[stats.length - 1]);
      });
    });
  }

  getPackageStatuses_updated(packageId) {
    return new Promise((resolve, reject) => {
      PackageStatus.find({packageId}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    });
  }

  getPackageStatuses(packageId) {
    return new Promise((resolve, reject) => {
      client.smembers(LIST_PACKAGE_STATUS + packageId, (err, ids) => {
        if (err) resolve([]);
        Promise.all(
          ids.map((id) => {
            return lredis.hgetall(PREFIX_PACKAGE_STATUS + id);
          }),
        ).then((status) => {
          resolve(status);
        });
      });
    });
  }

  //========== Customer Package ==========//
  getCustomerPackages(id) {
    return new Promise((resolve, reject) => {
      lredis.search(PREFIX, [{ field: 'customerId', value: id }]).then((packages) => {
        Promise.all(
          packages.map((pkg) => {
            return this.getPackageStatuses(pkg.id);
          }),
        ).then((statuses) => {
          packages.forEach((pkg, i) => (pkg.status = statuses[i]));
        });
        resolve(packages);
      });
    });
  }

  createConsolated(packages, username, boxSize) {
    return new Promise((resolve, reject) => {
      var awbInfo = {
        id: '',
        isSed: 0,
        hasDocs: '0',
        invoiceNumber: '',
        value: '0',
        customerId: 24197,
        shipper: '482', // we should get an id here
        carrier: 'USPS',
        hazmat: '',
        username: username,
      };
      this.saveAwb(awbInfo).then((awbResult) => {
        //add
        var cPackage = {
          id: 0,
          trackingNo: uniqId(),
          barcode: 0,
          description: 'Consolidated Package',
          weight: 0,
          dimensions: `${boxSize}x${boxSize}x${boxSize}`,
          awb: awbResult.id,
          isConsolidated: '1',
          created_by: username,
        };
        srv.savePackageToAwb(cPackage).then((pkgResult) => {
          // get the id
          //
          var batch = client.batch();
          var pkgBatch = client.batch();

          packages.forEach((pkg) => {
            //these are barcodes
            batch.sadd('consolidated:pkg:' + pkgResult.id, pkg);
            pkgBatch.hmget(PACKAGE_ID + getPackageIdFromBarCode(pkg), 'weight');
          });
          batch.exec((err, results) => {
            //
            pkgBatch.exec((err1, results) => {
              var totalWeight = 0;
              results.forEach((weight) => {
                if (isNaN(Number(weight)) == false) totalWeight += Number(weight);
              });
              //we need to update the total weight of the package now
              srv.packageIndex.update(cPackage.id, { weight: totalWeight });
            });
            resolve({ saved: true, id: pkgResult.id });
          });
        });
      });
      //validate the package
    });
  }
  getReceivedPackages(page, pageSize) {
    return new Promise((resolve, reject) => {
      this.mySearch.search(`@mid:[0 0]`, { offset: 0, numberOfResults: 5000 }, (err, data) => {
        var packages = [];
        console.log(data);
        data.results.forEach((element) => {
          packages.push(element.doc);
        });
        resolve(packages);
      });
    });
  }
  getNoDocsPackackages(page, pageSize) {
    return new Promise((resolve, reject) => {
      this.mySearch.search(`@hasDocs:[0 0]`, { offset: 0, numberOfResults: 5000 }, (err, data) => {
        var packages = [];
        console.log(data);
        data.results.forEach((element) => {
          packages.push(element.doc);
        });
        resolve(packages);
      });
    });
  }

  removePackageFromManifest(packageId, mid) {
    var msearch = this.mySearch;
    return new Promise((resolve, reject) => {
      var manifest = mid;
      var manifestKey = 'manifest:' + manifest + ':*';

      lredis.del('packages:' + trackingNo).then(function(result) {
        console.log(result);
        msearch.delDocument(PKG_IDX, `${mid}-${trackingNo}`);
        //we need to remove from the index and dec the counter
        lredis.client.decr('mcounter:' + mid);
        //rServices.packageService.rmPackage(mid, trackingNo);
        lredis.getKeys(manifestKey).then((kResult) => {
          //the list of all the sets ...we need to remove the key from each one
          var keysCount = 0;

          kResult.forEach((element) => {
            console.log(`removing ${trackingNo} package manifest set ${element} `);
            lredis.srem(element, trackingNo).then(function(rResult) {
              console.log(rResult);
              console.log('removed');
              if (keysCount == kResult.length - 1) keysCount++;
            });
          });
          resolve({
            deleted: true,
          });
        });

        //we also need to remove from any sets
      });
    });
  }

  removePackageById(id) {
    var msearch = this.mySearch;
    return new Promise((resolve, reject) => {
      packageIndex.delDocument(PKG_IDX, id, (err, response) => {
        if (err) console.log(err);
        console.log(response);
        resolve({ deleted: true });
      });
    });
  }
  storePackageForPickup(trackingNo, bin) {
    var searcher = this.mySearch;
    return new Promise((resolve, reject) => {
      lredis.hmset(PACKAGE_ID + trackingNo, { status: 4, location: bin }).then((result) => {
        lredis.getPackage(trackingNo).then((pkg) => {
          addPackageToIndex(trackingNo, searcher);
          resolve(pkg);
        });
      });
    });
  }
  updatePackageIndex(tracking) {
    return new Promise((resolve, reject) => {
      var msearch = this.mySearch;
      addPackageToIndex(tracking, msearch);
      resolve({ updated: true });
    });
  }

  //#region Manifest Package Functions

  //get the compartment weight
  getFlightCompartmentWeight(mid, compartment) {
    return new Promise((resolve, reject) => {
      this.mySearch.aggregate(
        `@mid:[${mid} ${mid}] @compartment:${compartment}`,
        {},
        (err, reply) => {
          if (err) console.log(err);
          console.log(reply, 'TOTAL SECTION Weight');
          if (reply[1]) {
            var result = reply[1];
            var compartment = result[3];
            var weight = result[5];
          }
          resolve({ compartment: compartment, weight: weight });
        },
      );
    });
  }
  //remove from flight
  removeFromFlight(action) {
    return new Promise((resolve, reject) => {
      var packageNo = getPackageIdFromBarCode(action.barcode);
      this.mySearch.update(packageNo, { mid: action.mid }, (err, result) => {
        if (err) resolve({ removed: false });

        resolve({ removed: true });
      });
    });
  }

  // getPackage
  getPackage_updated(packageId) {
    return new Promise((resolve, reject) => {
      Package.findOne({_id: packageId}, (err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      });
    })
  }
}

function getPackageIdFromBarCode(barCodeValue) {
  var parts = barCodeValue.split('-');
  if (parts.length == 3) if (typeof parts[2] != 'undefined') return parts[2].trim();
  return '';
}

//========== DB Structure ==========//
/*          Package Record
//--Original
id:
weight:
awbId: 100005
dimensions: 1x2x3
packageType: BOX
trackingNo: 8k72ikk6a0zkgd // Unique ID
description: Shoes
customerId:
shipperId:
carrierId:
hazmatId:
W: 1
H: 2
L: 3
//-- Additional Fields
status:
manifestId:
compartmentId:
location: Warehosue FLL
*/

// - Package Status
// id:
// packageId:
// status:
// datetimestamp:
// updatedBy:

// - Original Barcode
// id:
// barcode:

module.exports = PackageService;
