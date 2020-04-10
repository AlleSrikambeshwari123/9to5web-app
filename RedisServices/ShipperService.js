const strings = require('../Res/strings');
const csv = require('csvtojson');

var client = require('./dataContext').redisClient;
var lredis = require('./redis-local');

const PREFIX = strings.redis_prefix_shipper;
const SHIPPER_ID = strings.redis_id_shipper;

const Shipper = require('../models/shipper');


class ShipperService {
  importShippersFromCsv() {
    //return new Promise((resolve, reject) => {
      // this.removeAll().then(result => {
      //   csv().fromFile("./DB_Seed/shipper.csv").then(async(jsonObj) => {
      //     Promise.all(jsonObj.map(element => {
      //        let body = {
      //           id: id,
      //           name: element.sCarrierName,
      //           firstName: element.sContactFirstName,
      //           lastName: element.sContactLastName,
      //           telephone: element.sTelephone,
      //           fax: element.sFaxNumber,
      //           email: element.sEmail,
      //           address: element.sAddress,
      //           state: element.sState,
      //           country: element.sCountry,
      //           zipcode: element.sZipCode,
      //           accountNo: element.sAccountNo,
      //           type: element.iCarrierType,
      //           isExternal: element.bIsExternal,
      //           tranVersion: element.msrepl_tran_version,
      //           departurePortId: element.iDeparturePortID,
      //         }
      //      let obj_shipper = new Shipper(body);
      //      obj_shipper.save((err, result) => {
      //         if (err) {
      //           console.error('Error while creating the user!!');
      //           return({ success: false, message: err});
      //         } else {
      //           return({ success: true, message: "successfully added"});
      //         }
      //       })
      //    })).then(result => {
      //       resolve(result)
      //     })

      //   })
      // })
    //});
  }

  addShipper(shipper) {
    return new Promise((resolve, reject) => {
     let newShipper = new Shipper(shipper);
     newShipper.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ 
            success: true, 
            message: strings.string_response_added, 
            shipper: result
          });
        }
      })
    })
  }
  updateShipper(id, body) {
    return new Promise(async(resolve, reject) => {
      Shipper.findOneAndUpdate({_id: id}, body, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error});
        } else {
          resolve({ success: true, message: strings.string_response_updated });
        }
      })
    })
  }
  removeShipper(id) {
    return new Promise((resolve, reject) => {
      Shipper.deleteOne({_id: id}, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed});
        }
      })
    });
  }
  getShipper(id) {
    return new Promise((resolve, reject) => {
      Shipper.findOne({_id: id}).exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result)
        }
      });
    });
  }
  getAllShippers() {
    return new Promise(async(resolve, reject) => {
      let shippers = await Shipper.find({})
      resolve(shippers)
    })
  }
  removeAll() {
    return new Promise(async(resolve, reject) => {
      Shipper.deleteMany({}, (err, result) => {
        if (err) {
          resolve([]);
        } else {
          resolve(result);
        }
      })
    });
  }
}

//========== DB Structure ==========//
// id:
// name:
// firstName:
// lastName:
// telephone:
// email:
// fax:
// address:
// city:
// state:
// country:
// zipcode:

module.exports = ShipperService;