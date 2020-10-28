var moment = require("moment");
const strings = require('../Res/strings');

// var client = require('./dataContext').redisClient;
// var lredis = require("./redis-local");

// const PREFIX = strings.redis_prefix_delivery;
// const ID_DELIVERY = strings.redis_id_delivery;
// const DELIVERY_SET = strings.redis_prefix_delivery_package_list;

const Delivery = require('../models/delivery');
const Package = require('../models/package');

class DeliveryService {
    constructor() {
        this.services = {};
    }

    setServiceInstances(services) {
        this.services = services;
    }

    async createDelivery(delivery, userId) {
        delivery["status"] = 0;
        delivery["createdBy"] = userId;

        return new Promise((resolve, reject) => {
            let objDelivery = new Delivery(delivery);
            objDelivery.save((err, result) => {
                if (err) {
                    resolve({ success: false, message: strings.string_response_error });
                } else {
                    resolve({
                        success: true,
                        message: strings.string_response_added,
                        delivery: result
                    });
                }
            })
        })
    }

    closeDelivery(deliveryId) {
        return new Promise((resolve, reject) => {
            Delivery.findOneAndUpdate({ _id: deliveryId }, { status: 1 }, (err, result) => {
                if (err) {
                    resolve({ success: false, message: strings.string_response_error });
                } else {
                    resolve({ success: true });
                }
            })
        });
    }
    getDelivery(deliveryId) {
        return new Promise((resolve, reject) => {
            Delivery.findOne({ _id: deliveryId }, (err, result) => {
                if (err) {
                    resolve({});
                } else {
                    resolve(result)
                }
            });
        });
    }

    getDeliveries() {
        return new Promise(async(resolve, reject) => {
            let deliveries = await Delivery.find({})
            resolve(deliveries)
        })
    }

    getDeliveriesFullData(req) {
        return new Promise(async(resolve, reject) => {
            var searchData = { status: { $ne: 1 } };
            if(req && req.query){
                var daterange = req.query.daterange?req.query.daterange:'';
                if(daterange){
                  var date_arr = daterange.split('-');
                  var startDate = (date_arr[0]).trim();      
                  var stdate = new Date(startDate);
                  stdate.setDate(stdate.getDate() );
          
                  var endDate = (date_arr[1]).trim();
                  var endate = new Date(endDate);
                  endate.setDate(endate.getDate() +1);     
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
          
                if(!req.query.daterange && !req.query.clear){
                  var endate = new Date();      
                  endate.setDate(endate.getDate()+1);
                  var stdate = new Date();
                  stdate.setDate(stdate.getDate() -21);      
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
                if(req.query.clear){
                  var endate = new Date();      
                  endate.setDate(endate.getDate()+1);
                  var stdate = new Date();
                  stdate.setDate(stdate.getDate() -14);      
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
              }
            Delivery.find(searchData)
                .populate('locationId')
                .populate('deliveryId')
                .populate('vehicleId')
                .populate('driverId')
                .populate('packages')
                .populate('createdBy', 'username')
                .exec((err, deliveries) => {
                    if (err) {
                        return resolve([]);
                    }

                    deliveries = deliveries.map((delivery) => {
                        delivery.location = delivery.locationId;
                        delivery.driver = delivery.driverId;
                        delivery.vehicle = delivery.vehicleId;
                        // delivery['delivery_date'] = moment(delivery['delivery_date']).format("MMM DD, YYYY");
                        return delivery;
                    });

                    resolve(deliveries);
                })
        })
    }

    getFullDelivery(deliveryId) {
        return new Promise((resolve, reject) => {
            Delivery.findOne({ _id: deliveryId })
                .populate('locationId')
                .populate('packages')
                .populate('deliveryId')
                .populate('vehicleId')
                .populate('driverId')
                .populate('createdBy', 'username')
                .exec((err, delivery) => {
                    if (err) {
                        return resolve({});
                    }
                    delivery.location = delivery.locationId;
                    delivery.driver = delivery.driverId;
                    delivery.vehicle = delivery.vehicleId;
                    delivery.createdBy = delivery.createdBy && delivery.createdBy.username;
                    resolve(delivery);
                })
        });
    }

    getDeliveryAndDriverInfo(deliveryId) {
        return new Promise((resolve, reject) => {
            Delivery.findOne({ _id: deliveryId })
                .populate('driverId')
                .populate('locationId')
                .exec((err, delivery) => {
                    if (err) {
                        return resolve({});
                    }
                    delivery.location = delivery.locationId;
                    delivery.driver = delivery.driverId;
                    resolve(delivery);
                })
        });
    }

    getOpenDeliveries() {
        return new Promise((resolve, reject) => {
            Delivery.find({ status: 0 }, (err, deliveries) => {
                if (err) {
                    resolve([]);
                } else {
                    resolve(deliveries);
                }
            })
        })
    }
}

//========== DB Structure ==========//
// id:
// locationId:
// driverId:
// vehicleId:
// createdBy:
// dateCreated:
// delivery_date:
// status:

module.exports = DeliveryService;