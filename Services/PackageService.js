var emailService = require('../Util/EmailService');
var moment = require('moment');
var fs = require('fs');
var uniqId = require('uniqid');
var strings = require('../Res/strings');
var firebase = require('../Util/firebase');
var _ = require("lodash")

// var client = require('./dataContext').redisClient;
// var lredis = require('./redis-local');
// const PREFIX = strings.redis_prefix_package;
// const PACKAGE_ID = strings.redis_id_package;
// const PREFIX_PACKAGE_LIST = strings.redis_prefix_awb_package_list; // this key + awbId = array of packages

const Barcode = require('../models/barcode');

const LIST_PACKAGE_SHIPMENT = 'list:shipment:'; // this key + shipmentId = array of packages
// const SHIPMENT_ID = 'id:accept:truck';
const SHIPMENT_ID = 34;

// const PREFIX_ORIGIN_BARCODE = strings.redis_prefix_origin_barcode;
// const ORIGIN_BARCODE_ID = strings.redis_id_origin_barcode;

// const LIST_PACKAGE_MANIFEST = strings.redis_prefix_manifest_package_list;
// const LIST_LOCATION_PACKAGE = strings.redis_prefix_location_package_list;

// const PREFIX_PACKAGE_STATUS = strings.redis_prefix_package_status;
// const ID_PACKAGE_STATUS = strings.redis_id_package_status;
// const LIST_PACKAGE_STATUS = strings.redis_prefix_list_package_status;

const PKG_STATUS = {
  1: 'Received in FLL',
  2: 'Loaded on AirCraft',
  3: 'In Transit',
  4: 'Recieved in NAS',
  5: 'Ready for Pickup / Delivery',
  6: 'Delivered',
  7: 'No Invoice Present'
};

const Package = require('../models/package');
const Compartment = require('../models/compartment');
const Manifest = require('../models/manifest');
const PackageStatus = require('../models/packageStatus');
const Customer = require('../models/customer');
const Awb = require('../models/awb');
const Zone = require('../models/zone')
const ProcessPackage = require('../models/processPkg')

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

// function addPackageToIndex(trackingNo, msearcher) {
//   lredis.getPackage(trackingNo).then((pack) => {
//     msearcher.delDocument(PKG_IDX, `${pack.mid}-${trackingNo}`, (err, done) => {
//       var document = createDocument(pack);
//       msearcher.add(pack.mid + '-' + pack.trackingNo, document);
//     });
//   });
// }

class PackageService {
  constructor() {
    this.services = {};
  }

  setServiceInstances(services) {
    this.services = services;
  }

  //========== Dashboard Functions ==========//
  getPackageStatus() {
    return new Promise(async (resolve, reject) => {
      let packages = await Package.find({})
      let obj = {
        received_fill: 0,
        loaded_craft: 0,
        in_transit: 0,
        received_nas: 0,
        ready_pd: 0,
        delivered: 0,
      };

      await Promise.all(
        packages.map(async (item) => {
          let packagesStatus = await PackageStatus.find({ packageId: item._id });
          if(packagesStatus.length > 0){
            packagesStatus = packagesStatus[packagesStatus.length - 1];
            obj["received_fill"] = obj["received_fill"] + (packagesStatus.status == PKG_STATUS[1] ? 1 : 0)
            obj["loaded_craft"] = obj["loaded_craft"] + (packagesStatus.status == PKG_STATUS[2] ? 1 : 0)
            obj["in_transit"] = obj["in_transit"] + (packagesStatus.status == PKG_STATUS[3] ? 1 : 0)
            obj["received_nas"] = obj["received_nas"] + (packagesStatus.status == PKG_STATUS[4] ? 1 : 0)
            obj["ready_pd"] = obj["ready_pd"] + (packagesStatus.status == PKG_STATUS[5] ? 1 : 0)
            obj["delivered"] = obj["delivered"] + (packagesStatus.status == PKG_STATUS[6] ? 1 : 0)
            obj["total_packages"] = packages.length
          }
        })
      )
      resolve(obj)
    })
  }

  getPackage7daysStatus() {
    return new Promise((resolve, reject) => {
      const LAST_DAYS = 6;

      const dateObj = {
        $lte: moment().endOf('day').toDate(),
        $gte: moment().subtract(LAST_DAYS, 'days').startOf('day').toDate()
      };

      const final_obj = {};

      for (let index = LAST_DAYS; index >= 0; index--) {
        final_obj[moment().subtract(index, 'days').format('DD/MM')] = {
          received_fill: 0,
          received_nas: 0,
          loaded_craft: 0,
          ready_pd: 0,
          delivered: 0,
        };
      }

      Package.find({ createdAt: dateObj }, null, { sort: { createdAt: 1 } }, async (err, packages) => {
        if (err) {
          console.error('Error occuring while fetching the packages', err);
          resolve(final_obj);
        } else {
          const packageIds = packages.map((data) => data['_id']);
          const packagesStatus = await PackageStatus.find({ packageId: { '$in': packageIds } }).populate('packageId');
          // key value pair by packageId
          const packageStatusDataById = {};
          packagesStatus.forEach((pkgData) => {
            if (!packageStatusDataById[pkgData['packageId']]) {
              packageStatusDataById[pkgData['packageId']] = [];
            }
            packageStatusDataById[pkgData['packageId']].push(pkgData);
          });

          Object.keys(packageStatusDataById).forEach((packageId) => {
            const dataByPackageId = packageStatusDataById[packageId];
            const lastStatusData = dataByPackageId[dataByPackageId.length - 1];
            const date = moment(lastStatusData.packageId.createdAt).format('DD/MM');

            let obj = final_obj[date];
            obj["received_fill"] = obj["received_fill"] + (lastStatusData.status == PKG_STATUS[1] ? 1 : 0)
            obj["loaded_craft"] = obj["loaded_craft"] + (lastStatusData.status == PKG_STATUS[2] ? 1 : 0)
            obj["received_nas"] = obj["received_nas"] + (lastStatusData.status == PKG_STATUS[4] ? 1 : 0)
            obj["ready_pd"] = obj["ready_pd"] + (lastStatusData.status == PKG_STATUS[5] ? 1 : 0)
            obj["delivered"] = obj["delivered"] + (lastStatusData.status == PKG_STATUS[6] ? 1 : 0)
          });

          return resolve(final_obj);
        }
      })
    });
  }

  getAllPackages() {
    return new Promise((resolve, reject) => {
      Package.find({}, (err, result) => {
        if (err) {
          resolve([])
        } else {
          resolve(result)
        }
      })
      // client.keys(PREFIX + '*', (err, keys) => {
      //   if (err) resolve([]);
      //   else {
      //     Promise.all(
      //       keys.map((key) => {
      //         return lredis.hgetall(key);
      //       }),
      //     ).then((results) => {
      //       console.log(results);
      //       resolve(results);
      //     });
      //   }
      // });
    });
  }

  getPackageByTrackingId(trackingNo) {
    return new Promise((resolve, reject) => {
      Package.find({ trackingNo })
      .populate(['customerId','shipperId','carrierId','awbId','hazmatId','createdBy','manifestId','compartmentId','deliveryId'])
      .exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          if (result[0] && result[0].id) {
            let pkg = result[0] 
            PackageStatus.find({ packageId:pkg._id })
            .populate("updatedBy", "username")
            .exec((error, stats) => {
              resolve({
                success: true,
                package: pkg,
                status: stats
              });  
            }) 
          } else {
            resolve({
              success : false,
              message : strings.string_not_found_package
            })
          }
        }
      })
    })
  }

  getCustomerPackagesByStatus(statusId) {
    return new Promise((resolve, reject) => {
      Package.find({})
        .exec((error, packages) => {
          Promise.all(
            packages.map((pkg) => {
              return this.getPackageLastStatus_updated(pkg._id);
            })
          ).then((stats) => {
            let pkgs = [];
            stats.forEach((status, i) => {
              packages[i].lastStatusText = status.status;
              if (status.status === PKG_STATUS[statusId]) {
                pkgs.push(packages[i]);
              }
            });
            resolve({
              success : true, 
              packages : pkgs
            });
          });
        })
    });
  }

  //========== Dashboard Functions ==========//
  getAllPackages_updated() {
    return new Promise((resolve, reject) => {
      Package.find({})
      .populate('awbId')
      .exec((err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      });
    });
  }

  getPackageWithFilter(filter, query) {
    return new Promise(async (resolve, reject) => {
      let nineToPackages = [], postBox = [], noDocs = [];
      if (filter === 'all') {
        let packages = await Package.find({}).populate("awbId").populate('customerId');

        let result = await Promise.all(packages.map(async (pkg) => {
          let statuses = await PackageStatus.find({ packageId: pkg._id }) || [];
          if(statuses.length > 0){
            let packageStatus = statuses[statuses.length - 1];
            // console.log(pkg.customerId.pmb, pkg);
            if (pkg.awbId.invoices.length == 0) {
              noDocs.push({ _id: pkg.id, last_status: packageStatus.status, awb: "AWB"+pkg.awbId.awbId, customer_email: pkg.customerId.email})
            }
  
            if (pkg.customerId.pmb == "9000") {
              nineToPackages.push({ _id: pkg.id, last_status: packageStatus.status, awb: "AWB"+pkg.awbId.awbId, customer_email: pkg.customerId.email})
            }
  
            if (pkg.customerId.pmb != "9000") {
              postBox.push({ _id: pkg.id, last_status: packageStatus.status, awb: "AWB"+pkg.awbId.awbId, customer_email: pkg.customerId.email})
            }
          }
        }))
        // console.log("PostBox", postBox);
        // console.log("No Docs", noDocs);
        
        resolve({ nineToPackages, postBox, noDocs });

      } else {
        let dbQuery = {};

        if (query.filter_date && query.filter_date !== '') {
          dbQuery = {
            'createdAt': {
              $lte: moment(query.filter_date, 'MM-DD-YYYY').endOf('day').toDate(),
              $gte: moment(query.filter_date, 'MM-DD-YYYY').startOf('day').toDate()
            }
          }
        }
        
        if (query.users && query.users != "all") {
          dbQuery['createdBy'] = query.users;
        }

        const packages = await Package.find(dbQuery).populate("awbId").populate("customerId");

        let result = await Promise.all(packages.map(async (pkg) => {
          let statuses = await PackageStatus.find({ packageId: pkg._id }) || [];
          let packageStatus = statuses[statuses.length - 1];

          if (pkg.awbId.invoices.length == 0 && query.filter_for === "noDocs" && (query.package_status === packageStatus.status || query.package_status === "all")) {
            noDocs.push({ _id: pkg.id, last_status: packageStatus.status, awb: pkg.awbId.awbId, customer_email: pkg.customerId.email })
          }
          if (pkg.customerId.pmb == 9000 && query.filter_for === "9to5" && (query.package_status === packageStatus.status || query.package_status === "all")) {
            nineToPackages.push({ _id: pkg.id, last_status: packageStatus.status, awb: pkg.awbId.awbId, customer_email: pkg.customerId.email })
          }

          if (pkg.customerId.pmb != 9000  && query.filter_for === "postBox" && (query.package_status === packageStatus.status || query.package_status === "all")) {
            postBox.push({ _id: pkg.id, last_status: packageStatus.status, awb: pkg.awbId.awbId, customer_email: pkg.customerId.email })
          }
        }))

        if (query.filter_for === "noDocs") {
          resolve({ noDocs })
        } else if (query.filter_for === "9to5") {
          resolve({ nineToPackages })
        } else if (query.filter_for === "postBox") {
          resolve({ postBox })
        }
      }
    })
  }

  async getAllPackagesWithLastStatus() {
    let packages = await this.getAllPackages_updated();
    return await Promise.all(
      packages.map(async (pkg) => {
        let status = await this.services.packageService.getPackageLastStatus(pkg._id);
        pkg.lastStatusText = status && status.status;
        return pkg;
      }),
    );
  }

  addOriginBarcode(originBarcode) {
    return new Promise(async (resolve, reject) => {
      await Barcode.findOne(originBarcode, (err, res) => {
        if (res === null || res === undefined) {
          const barcode = new Barcode(originBarcode);
          barcode.save((err, result) => {
            if (err) {
              return resolve({
                success: false,
                message: strings.string_response_error,
              });
            } else {
              resolve({
                success: true,
                message: strings.string_response_added,
                originBarcode: result,
              });
            }
          });
        } else {
          return resolve({ success: false, message: 'Barcode Already Added' });
        }
      });

      // client.incr(ORIGIN_BARCODE_ID, (err, id) => {
      //   if (err) resolve({ success: false, message: strings.string_response_error });
      //   originBarcode.id = id;
      //   client.hmset(PREFIX_ORIGIN_BARCODE + id, originBarcode, (err, result) => {
      //     if (err) resolve({ success: false, message: strings.string_response_error });
      //     resolve({ success: true, message: strings.string_response_added, originBarcode: originBarcode });
      //   })
      // })
    });
  }


  removeOriginBarcode(id) {
    return new Promise((resolve, reject) => {
      Barcode.deleteOne({ _id: id }, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      });
      // client.del(PREFIX_ORIGIN_BARCODE + id, (err, result) => {
      //   if (err) resolve({ success: false, message: strings.string_response_error });
      //   resolve({ success: true, message: strings.string_response_removed });
      // })
    });
  }
  getOriginBarcode(id) {
    return new Promise((resolve, reject) => {
      Barcode.findOne({ _id: id }, (err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result);
        }
      });
      // client.hgetall(PREFIX_ORIGIN_BARCODE + id, (err, originBarcode) => {
      //   if (err) resolve({});
      //   resolve(originBarcode);
      // })
    });
  }

  getOriginalBarcodeByCode(barcode) {
    return new Promise((resolve, reject) => {
      Barcode.findOne({ barcode: barcode }, (err, result) => {
        if (err || result === null) {
          resolve([]);
        } else {
          resolve(result);
        }
      });
    })
  }

  getAllOriginBarcode() {
    return new Promise((resolve, reject) => {
      Barcode.find({}, (err, barCodes) => {
        if (err) {
          resolve([]);
        } else {
          resolve(barCodes);
        }
      })
      // client.keys(PREFIX_ORIGIN_BARCODE + '*', (err, keys) => {
      //   if (err) resolve([]);
      //   Promise.all(keys.map(key => {
      //     return lredis.hgetall(key);
      //   })).then(originBarcodes => {
      //     resolve(originBarcodes);
      //   })
      // })
    })
  }
  removeAllOriginBarcode() {
    return new Promise((resolve, reject) => {
      Barcode.deleteMany({}, (err, result) => {
        if (err || result == null) resolve([]);
        else resolve(result);
      })
      // client.set(ORIGIN_BARCODE_ID, 0);
      // client.keys(PREFIX_ORIGIN_BARCODE + '*', (err, keys) => {
      //   if (err) resolve([]);
      //   Promise.all(keys.map(key => {
      //     return lredis.del(key);
      //   })).then(result => {
      //     resolve(result);
      //   })
      // })
    });
  }

  getPackage(packageId) {
    return new Promise((resolve, reject) => {
      Package.find({ id: packageId }, (err, pkg) => {
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
      Package.find({ awbId: awbId }, (err, result) => {
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
      Awb.find({ _id: awbId }, (err, response) => {
        if (err || response == null) resolve([])
        else { resolve(response) }
      })
      // client.smembers(PREFIX_PACKAGE_LIST + awbId, (err, ids) => {
      //   if (err) resolve([]);
      //   Promise.all(
      //     ids.map((id) => {
      //       return lredis.hgetall(PREFIX + id);
      //     }),
      //   ).then((packages) => {
      //     resolve(packages);
      //   });
      // });
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
      newPackage.awbId = awbId;
      newPackage.id = Date.now().toString();
      console.log(newPackage.id)
      newPackage.trackingNo = uniqId();
      // Here as per the frontend logic, we're getting the 
      // values like 43322211,398749844904894
      const obarCode = newPackage.originBarcode.split(',');      
      if(obarCode.length>1){
        newPackage.originBarcode = newPackage.originBarcode.split(',')[1];
       }      
      const newPackageData = new Package(newPackage);
      newPackageData.save((err, result) => {
        if (err) {
          console.log(err);
          resolve({ success: false, message: strings.string_response_error });
        } else {
          this.removeProcessPackage(newPackage.originBarcode, newPackage.createdBy)
          this.updatePackageStatus(result['_id'], 1, newPackage.createdBy)
          resolve({ success: true });
        }
      });
    });
  }

  async removeProcessPackage(barcode,userId){
    return await ProcessPackage.deleteOne({barcode:barcode, userId});
  }

  updatePackage(id, pkg) {
    return new Promise((resolve, reject) => {
      Package.updateOne({_id:id},pkg,(err,result)=> {
        if(err) resolve({ success: false, message: strings.string_response_error });
        else resolve({ success: true });

      })
    
    });
  }

  updatePackage_updated(id, pkg) {
    return new Promise(async (resolve, reject) => {
      Package.findOneAndUpdate({ _id: id }, pkg, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true });
        }
      })
    });
  }

  removePackages_updated(awbId) {
    return new Promise((resolve, reject) => {
      Package.deleteMany({ awbId: awbId }, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve(result);
        }
      });
    });
  }

  removePackage_updated(awbId) {
    return new Promise((resolve, reject) => {
      Package.deleteMany({ awbId: awbId }, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve(result);
        }
      });
    });
  }

  removePackage_updated(id) {
    return new Promise((resolve, reject) => {
      Package.deleteOne({ _id: id }, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve(result);
        }
      });
    });
  }

  // removePackages(awbId) {
  //   return new Promise((resolve, reject) => {
  //     client.smembers(PREFIX_PACKAGE_LIST + awbId, (err, ids) => {
  //       Promise.all(
  //         ids.map((id) => {
  //           return this.removePackage(awbId, id);
  //         }),
  //       ).then((results) => {
  //         resolve(results);
  //       });
  //     });
  //   });
  // }

  // removePackage(awbId, id) {
  //   return new Promise((resolve, reject) => {
  //     client.del(PREFIX + id);
  //     client.srem(PREFIX_PACKAGE_LIST + awbId, id);
  //     resolve({ success: true });
  //   });
  // }

  removePackagesStatusByPackageIds(packageIds) {
    return new Promise((resolve, reject) => {
      if (!(packageIds && packageIds.length)) {
        return resolve({ success: true });
      }
      PackageStatus.deleteMany({ packageId: { $in: packageIds } }, (err, result) => {
        if (err) {
          resolve({ success: false });
        } else {
          resolve({ success: true });
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

  // getPackagesInNas() {
  //   return new Promise((resolve, reject) => {
  //     client.keys(PREFIX + '*', (err, keys) => {
  //       Promise.all(
  //         keys.map((key) => {
  //           return lredis.hgetall(key);
  //         }),
  //       ).then((packages) => {
  //         Promise.all(
  //           packages.map((pkg) => {
  //             return this.getPackageLastStatus(pkg.id);
  //           }),
  //         ).then((stats) => {
  //           let pkgs = [];
  //           stats.forEach((stat, i) => {
  //             packages[i].lastStatusText = stat.status;
  //             if (stat.status == PKG_STATUS[4]) pkgs.push(packages[i]);
  //           });
  //           resolve(pkgs);
  //         });
  //       });
  //     });
  //   });
  // }

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
            if (status.status == PKG_STATUS[4])
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
      resolve(SHIPMENT_ID)
      // client.incr(SHIPMENT_ID, (err, reply) => {
      //   if (err) {
      //     console.error(err);
      //     resolve(null);
      //   }
      //   resolve(reply);
      // });
    });
  }
  async addPackageToShipment(packages, username) {
    try {
      let packageIds = packages.split(',');
      return Promise.all(
        packageIds.map(async (packageId) => {
          return await this.updatePackageStatus(packageId, 1, username);
        })
      ).then((result) => {
        console.log(result)
        return {
          success: true,
          message: strings.string_response_received,
        };
      });
    } catch (error) {
      console.error('addPackageToShipment', error);
      return error;
    }
  }

  //========== Load Packages to AirCraft (Add to Manifest) ==========//
  addToFlight(packageIds, manifestId, compartmentId, userId) {
    return new Promise((resolve, reject) => {
      let packages = packageIds && packageIds.length && packageIds.split(',').filter(Boolean);

      if (!packages || packages.length === 0) {
        return resolve({ success: false, message: 'Please select packages.' });
      }

      Promise.all(
        packages.map((packageId) => {
          return Promise.all([
            // this.updatePackageStatus(packageId, 2, userId),
            this.updatePackage_updated(packageId, {
              manifestId: manifestId,
              compartmentId: compartmentId,
            }),
          ]);
        }),
      ).then((results) => {
        resolve({ success: true, message: strings.string_response_loaded, status: PKG_STATUS[1] });
      });
    });
  }
  
  // Add Packages To Compartment
  async addPackagesToCompartment(packageIds,compartmentId,userId){
    try {
      let error = []
      let packages = packageIds && packageIds.length && packageIds.split(',').filter(Boolean);
      await Compartment.findOneAndUpdate({_id:compartmentId},{$push:{packages:packages}})
      await Promise.all(packages.map(async packageId=>{
        // check packageId Exists
        if(await Package.findById(packageId)){
          await this.updatePackageStatus(packageId, 2, userId);
        }else{
          error.push(`Package ${packageId} doesn't Exist`)
        }
      }))
      if(error.length >0) return { success: false, message: error }
      return { success: true, message: strings.string_response_loaded, status: PKG_STATUS[2] }
    } catch (error) {
      return { success: false, message: strings.string_response_error }
    }
  }
  
    // Add Packages To Compartment
    async addPackagesToManifests(packageIds,manifestId,userId){
      try {
        let error = []
        let packages = packageIds && packageIds.length && packageIds.split(',').filter(Boolean);
        await Manifest.findOneAndUpdate({_id:manifestId},{$push:{packages:packages}})
        await Promise.all(packages.map(async packageId=>{
          // check packageId Exists
          if(await Package.findById(packageId)){
            await this.updatePackageStatus(packageId, 2, userId);
          }else{
            error.push(`Package ${packageId} doesn't Exist`)
          }
        }))
        if(error.length >0) return { success: false, message: error }
        return { success: true, message: strings.string_response_loaded, status: PKG_STATUS[2] }
      } catch (error) {
        return { success: false, message: strings.string_response_error }
      }
    }
    
  // Receive Package To Flight
  async receivePackageToFlight(packageIds,userId){
    try {
      let error = []
      let packages = packageIds && packageIds.length && packageIds.split(',').filter(Boolean);
      await Promise.all(packages.map(async packageId=>{
        // check packageId Exists
        if(await Package.findById(packageId)){
          await this.updatePackageStatus(packageId, 2, userId);
        }else{
          error.push(`Package ${packageId} doesn't Exist`)
        }
      }))
      if(error.length >0) return { success: false, message: error }
      return { success: true, message: strings.string_response_loaded, status: PKG_STATUS[2] }
    } catch (error) {
      return { success: false, message: strings.string_response_error }
    }
  }
  
  
  getPackageOnManifest(manifestId) {
    return new Promise((resolve, reject) => {
      Package.find({ manifestId: manifestId })
        .populate(['awbId','compartmentId','shipperId','carrierId','customerId','hazmatId'])
        .exec((err, packages) => {
          if (err) {
            resolve([]);
          } else {
            resolve(packages);
          }
        })
    });
  }

  //======== Packages for store ========//
  getPackagesForStores() {
    return new Promise((resolve, reject) => {
      Package.find({})
        .populate('customerId')
        .exec((err, packages) => {
          if (err) {
            resolve([]);
          } else {
            resolve(packages);
          }
        })
    });
  }

  //========== Ship Packages in Manifest ==========//
  updateManifestPackageToInTransit(manifestId, userId) {
    return new Promise((resolve, reject) => {
      this.getPackageOnManifest(manifestId).then((packages) => {
        Promise.all(
          packages.map((pkg) => {
            return this.updatePackageStatus(pkg._id, 3, userId);
          }),
        ).then((results) => {
          resolve({ success: true, message: strings.string_response_updated });
        });
      });
    });
  }
  //========== Receive Packages in Manifest ==========//
  updateManifestPackageToReceived(manifestId, userId) {
    return new Promise((resolve, reject) => {
      this.getPackageOnManifest(manifestId).then((packages) => {
        Promise.all(packages.map(pkg => {
          return this.updatePackageStatus(pkg._id, 4, userId);
        })).then(results => {
          resolve({ success: true, message: strings.string_response_updated });
        })
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
        resolve({ success: true, message: strings.string_response_received,status: PKG_STATUS[4] });
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
        resolve({ success: true, message: strings.string_response_received,status: PKG_STATUS[6] });
      });
    });
  }

  // ======== Process Package ==========//
  async processPackage(barcode,userId){
    try {
      let bar = await Barcode.findOne({barcode:barcode});
        if (bar === null || bar === undefined){
           return { success: false, message: 'Barcode Does not Exist' }
          }
           else{
             const process = await ProcessPackage.findOneAndUpdate({userId:userId},{userId:userId,barcode:bar.id},{upsert:true,new:true})
             if(process == null)  return { success: false, message: strings.string_response_error }
             return {
              success: true,
              message: strings.string_response_added,
              originBarcode: process,
            }
             
           }
    } catch (error) {
      console.error('updateZone',error)
    }
  }

  //========= Update Zone On Package Delivered ======//
  async updateZone(id,pkgs){
    try {
      return await Zone.findByIdAndUpdate({_id:id},{$push:{packages:pkgs}})
    } catch (error) {
      console.error('updateZone',error)
    }
  }

  async updateAwbPackages(id,pkgs){
    try {
      return await Awb.findByIdAndUpdate({_id:id},{$push:{packages:pkgs}})
    } catch (error) {
      console.error('updateAwbPackages',error)
    }
  }


// =========== addPackages to No Docs ==============//

  async addAwbsPkgNoDocs(data){
    try {
      let packageIds = data.packageIds.split(',');
      await Promise.all(
        packageIds.map(packageId=>{
          this.updatePackage(packageId, {
            location: data.location,
            zoneId:data.zoneId
          });
          return this.updatePackageStatus(packageId, 7, data.userId);
        },
        this.updateAwbPackages(data.awbId,packageIds),
        this.updateZone(data.zoneId,packageIds)
        )
      )
      return { success: true, message: strings.string_response_received,status: PKG_STATUS[7] }
    } catch (error) {
      console.error('addAwbsPkgNoDocs',error)
    }
  }
  //========== Check In Store ==========//
  checkInStore(data, username) {
    let packageIds = data.packageIds.split(',');
    return new Promise((resolve, reject) => {
      Promise.all(
        packageIds.map((packageId) => {
          this.updatePackage(packageId, {
            location: data.location,
            companyId: data.companyId,
            zoneId:data.zoneId
          });
          return this.updatePackageStatus(packageId, 6, username);
        },
        this.updateZone(data.zoneId,packageIds)
        ),
        ).then((result) => {
        resolve({ success: true, message: strings.string_response_received,status: PKG_STATUS[6] });
      });
    });
  }

  // getPackagesInLocation(locationId) {
  //   return new Promise((resolve, reject) => {
  //     client.smembers(LIST_LOCATION_PACKAGE + locationId, (err, ids) => {
  //       Promise.all(
  //         ids.map((id) => {
  //           return this.getPackage(id);
  //         }),
  //       ).then((pkgs) => {
  //         resolve(pkgs);
  //       });
  //     });
  //   });
  // }

  getPackage_updated(packageId,pkgStatus) {
    return new Promise(async (resolve, reject) => {
      let pkg = await Package.findOneAndUpdate({_id:packageId},{lastStatusText:pkgStatus},{new:true})
      if(!pkg) resolve({})
      else resolve(pkg)
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
      // TODO: set updatedBy
      if (!packageStatus.updatedBy) {
        delete packageStatus.updatedBy;
      }
      const newPackageStatusData = new PackageStatus(packageStatus);
      newPackageStatusData.save((err, packageStatus) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          this.getPackage_updated(packageId,packageStatus['status']).then((pkg) => {
            this.services.awbService.getAwb(pkg.awbId).then((awb) => {
              let fParam = {trackingNo:pkg.trackingNo,screenName:'PACKAGE_DETAIL'}
                firebase.sendNotification(
                  awb.customerId,
                  'Package Status Updated',
                  'Package-' + pkg.trackingNo + ' Updated',
                  fParam
                );
            });
          });
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

  async getPackageInfo(){
    try {
      return await PackageStatus.find().populate({path:"packageId",populate:{path:"awbId"}})
    } catch (error) {
      return []
    }
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
      PackageStatus.find({ packageId }, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    });
  }

  // getPackageStatuses(packageId) {
  //   return new Promise((resolve, reject) => {
  //     client.smembers(LIST_PACKAGE_STATUS + packageId, (err, ids) => {
  //       if (err) resolve([]);
  //       Promise.all(
  //         ids.map((id) => {
  //           return lredis.hgetall(PREFIX_PACKAGE_STATUS + id);
  //         }),
  //       ).then((status) => {
  //         resolve(status);
  //       });
  //     });
  //   });
  // }

  // getCustomerPackages(id) {
  //   return new Promise((resolve, reject) => {
  //     lredis.search(PREFIX, [{ field: 'customerId', value: id }]).then((packages) => {
  //       Promise.all(
  //         packages.map((pkg) => {
  //           return this.getPackageStatuses(pkg.id);
  //         }),
  //       ).then((statuses) => {
  //         packages.forEach((pkg, i) => (pkg.status = statuses[i]));
  //       });
  //       resolve(packages);
  //     });
  //   });
  // }

  //========== Customer Package ==========//
  getCustomerPackages(customerId) {
    return new Promise((resolve, reject) => {
      Package.find({ customerId })
        .exec((error, packages) => {
          if (error || packages.length == 0) {
            resolve({ 
              success: false,
              message : strings.string_package_not_found_customer
            })
          } else {
            Promise.all(
              packages.map((pkg) => {
                return this.getPackageLastStatus_updated(pkg._id);
              })
            ).then((stats) => {
              stats.forEach((status, i) => {
                packages[i].lastStatusText = status.status;
              });
              resolve({
                success : true, 
                packages : packages
              });
            });
          }
        })
    });
  }

  getPackagesDataByDeliveryId(deliveryId) {
    return new Promise((resolve, reject) => {
      Package.find({ deliveryId })
        .populate('shipperId')
        .populate('carrierId')
        .populate('customerId')
        .exec((error, packages) => {
          if (error) {
            resolve({ success: false })
          } else {
            packages.forEach((data) => {
              data['shipper'] = data['shipperId'];
              data['carrier'] = data['carrierId'];
              data['customer'] = data['customerId'];
            });
            resolve(packages);
          }
        })
    })
  }

  getAllDeliveryPackagesData(deliveryIds) {
    return new Promise((resolve, reject) => {
      let query = {};
      if (deliveryIds && deliveryIds.length) {
        query = { deliveryId: { '$in': deliveryIds } }
      }

      Package.find(query, (error, packages) => {
        if (error) {
          resolve({ success: false })
        } else {
          resolve(packages);
        }
      })
    })
  }

  // createConsolated(packages, username, boxSize) {
  //   return new Promise((resolve, reject) => {
  //     var awbInfo = {
  //       id: '',
  //       isSed: 0,
  //       hasDocs: '0',
  //       invoiceNumber: '',
  //       value: '0',
  //       customerId: 24197,
  //       shipper: '482', // we should get an id here
  //       carrier: 'USPS',
  //       hazmat: '',
  //       username: username,
  //     };
  //     this.saveAwb(awbInfo).then((awbResult) => {
  //       //add
  //       var cPackage = {
  //         id: 0,
  //         trackingNo: uniqId(),
  //         barcode: 0,
  //         description: 'Consolidated Package',
  //         weight: 0,
  //         dimensions: `${boxSize}x${boxSize}x${boxSize}`,
  //         awb: awbResult.id,
  //         isConsolidated: '1',
  //         created_by: username,
  //       };
  //       srv.savePackageToAwb(cPackage).then((pkgResult) => {
  //         // get the id
  //         //
  //         var batch = client.batch();
  //         var pkgBatch = client.batch();

  //         packages.forEach((pkg) => {
  //           //these are barcodes
  //           batch.sadd('consolidated:pkg:' + pkgResult.id, pkg);
  //           pkgBatch.hmget(PACKAGE_ID + getPackageIdFromBarCode(pkg), 'weight');
  //         });
  //         batch.exec((err, results) => {
  //           //
  //           pkgBatch.exec((err1, results) => {
  //             var totalWeight = 0;
  //             results.forEach((weight) => {
  //               if (isNaN(Number(weight)) == false) totalWeight += Number(weight);
  //             });
  //             //we need to update the total weight of the package now
  //             srv.packageIndex.update(cPackage.id, { weight: totalWeight });
  //           });
  //           resolve({ saved: true, id: pkgResult.id });
  //         });
  //       });
  //     });
  //     //validate the package
  //   });
  // }
  // getReceivedPackages(page, pageSize) {
  //   return new Promise((resolve, reject) => {
  //     this.mySearch.search(`@mid:[0 0]`, { offset: 0, numberOfResults: 5000 }, (err, data) => {
  //       var packages = [];
  //       data.results.forEach((element) => {
  //         packages.push(element.doc);
  //       });
  //       resolve(packages);
  //     });
  //   });
  // }
  getNoDocsPackackages(page, pageSize) {
    // return new Promise((resolve, reject) => {
    //   this.mySearch.search(`@hasDocs:[0 0]`, { offset: 0, numberOfResults: 5000 }, (err, data) => {
    //     var packages = [];
    //     data.results.forEach((element) => {
    //       packages.push(element.doc);
    //     });
    //     resolve(packages);
    //   });
    // });
    // Redis Integration
    return new Promise((resolve, reject) => {
      Awb.find({ invoices: { $eq: [] } })
        .populate('packages')
        .select('packages')
        .exec((err, awbData) => {
          if (err) {
            resolve([]);
          } else {
            let packages = [];
            awbData.forEach((data) => {
              packages = [...packages, ...data.packages];
            })
            resolve(packages);
          }
        })
    })
  }
  // removePackageFromManifest(packageId, mid) {
  //   var msearch = this.mySearch;
  //   return new Promise((resolve, reject) => {
  //     var manifest = mid;
  //     var manifestKey = 'manifest:' + manifest + ':*';

  //     lredis.del('packages:' + trackingNo).then(function (result) {
  //       msearch.delDocument(PKG_IDX, `${mid}-${trackingNo}`);
  //       //we need to remove from the index and dec the counter
  //       lredis.client.decr('mcounter:' + mid);
  //       //rServices.packageService.rmPackage(mid, trackingNo);
  //       lredis.getKeys(manifestKey).then((kResult) => {
  //         //the list of all the sets ...we need to remove the key from each one
  //         var keysCount = 0;

  //         kResult.forEach((element) => {
  //           lredis.srem(element, trackingNo).then(function (rResult) {
  //             if (keysCount == kResult.length - 1) keysCount++;
  //           });
  //         });
  //         resolve({
  //           deleted: true,
  //         });
  //       });

  //       //we also need to remove from any sets
  //     });
  //   });
  // }

  // removePackageById(id) {
  //   var msearch = this.mySearch;
  //   return new Promise((resolve, reject) => {
  //     packageIndex.delDocument(PKG_IDX, id, (err, response) => {
  //       if (err) console.log(err);
  //       resolve({ deleted: true });
  //     });
  //   });
  // }
  // storePackageForPickup(trackingNo, bin) {
  //   var searcher = this.mySearch;
  //   return new Promise((resolve, reject) => {
  //     lredis.hmset(PACKAGE_ID + trackingNo, { status: 4, location: bin }).then((result) => {
  //       lredis.getPackage(trackingNo).then((pkg) => {
  //         addPackageToIndex(trackingNo, searcher);
  //         resolve(pkg);
  //       });
  //     });
  //   });
  // }
  // updatePackageIndex(tracking) {
  //   return new Promise((resolve, reject) => {
  //     var msearch = this.mySearch;
  //     addPackageToIndex(tracking, msearch);
  //     resolve({ updated: true });
  //   });
  // }

  //#region Manifest Package Functions

  //get the compartment weight
  // getFlightCompartmentWeight(mid, compartment) {
  //   return new Promise((resolve, reject) => {
  //     this.mySearch.aggregate(
  //       `@mid:[${mid} ${mid}] @compartment:${compartment}`,
  //       {},
  //       (err, reply) => {
  //         if (err) console.log(err);

  //         if (reply[1]) {
  //           var result = reply[1];
  //           var compartment = result[3];
  //           var weight = result[5];
  //         }
  //         resolve({ compartment: compartment, weight: weight });
  //       },
  //     );
  //   });
  // }
  //remove from flight
  // removeFromFlight(action) {
  //   return new Promise((resolve, reject) => {
  //     var packageNo = getPackageIdFromBarCode(action.barcode);
  //     this.mySearch.update(packageNo, { mid: action.mid }, (err, result) => {
  //       if (err) resolve({ removed: false });

  //       resolve({ removed: true });
  //     });
  //   });
  // }

  // This method is used when we're performing the global search 
  getGlobalSearchData(bodyData) {
    return new Promise((resolve, reject) => {
      let { selectedOption, inputField } = bodyData;
      if (!selectedOption || selectedOption === 'default' || !(inputField && inputField.trim())) {
        return resolve({ success: false, message: strings.string_global_search_error });
      }

      if (selectedOption === "Package") {
        Package.find({ description: { $regex: inputField, $options: 'i' } }, 'id', (err, packages) => {
          if (err) {
            resolve([]);
          } else {
            resolve(packages);
          }
        })
      }

      else if (selectedOption === "Awb") {
        inputField = inputField.trim().toLowerCase();
        Awb.findOne({ awbId: inputField }, 'awbId', (err, awb) => {
          if (err) {
            resolve([]);
          } else {
            resolve([awb]);
          }
        });
      }

      else {
        inputField = inputField.trim();
        Customer.find({ email: { $regex: '^' + inputField + '$', $options: 'i' } }, '_id', (err, customers) => {
          if (err) {
            resolve([]);
          } else {
            resolve(customers);
          }
        });
      }
    })
  }
  getProcessOriginBarcode(user){
    let userId = user._id;
    userId = user._id == undefined ? user: user._id
    return new Promise((resolve, reject) => {
      ProcessPackage.findOne({userId:userId}).populate('barcode').exec((err,data)=>{
        if(err){
          console.log(err)
          resolve({});
        }else{
          resolve(data)
        }
      })
    });
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
