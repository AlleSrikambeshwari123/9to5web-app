var redis = require("redis");
var lredis = require("./redis-local");
var moment = require("moment");
var redisSearch = require("../redisearchclient");

const INDEX = "index:deliveries"
const ID = "delivery:ID";
const DELIVERY_SET = "delivery:id:"
var dataContext = require('./dataContext')
var deliveryIndex = redisSearch(redis, INDEX, {
    clientOptions: dataContext.clientOptions
});

var PackageService = require("./PackageService");
var packageService = new PackageService();

class DeliveryService {
    constructor() {

    }

    addPackage(deliveryId, barcode) {
        return new Promise((resolve, reject) => {
            dataContext.redisClient.sadd(DELIVERY_SET + deliveryId, barcode, (err, reply) => {
                if (err) {
                    resolve({ added: false })
                }
                resolve({ added: true })
            })
        })
    }
    getDeliveryPackages(deliveryId) {
        return new Promise((resolve, reject) => {
            dataContext.redisClient.smembers(DELIVERY_SET + deliveryId, (err, results) => {
                Promise.all(results.map(dpkg => packageService.getPackageById(dpkg))).then(packages => {
                    resolve({ packages: packages })
                })
            })
        })
    }

    saveDelivery(delivery) {
        return new Promise((resolve, reject) => {
            dataContext.redisClient.incr(ID, (err, id) => {
                delivery.id = id;
                delivery.status = 0;
                console.log('saving delivery', delivery);
                deliveryIndex.add(id, delivery)
                resolve({ saved: true });
            })

        })
    }
    getDeliveries() {
        return new Promise((resolve, reject) => {
            deliveryIndex.search("*", { offset: 0, numberOfResults: 1000, sortBy: 'createdDate', sortDir: 'DESC' }, (err, reply) => {
                if (err) {
                    console.log(err);
                    resolve({ deliveries: [] })
                    return;
                }
                var deliveries = [];
                reply.results.forEach(delivery => {
                    deliveries.push(delivery.doc)
                });
                resolve({ deliveries: deliveries })
            })
        })
    }
    getOpenDeliveries() {
        return new Promise((resolve, reject) => {
            deliveryIndex.search("@status:0", { offset: 0, numberOfResults: 1000, sortBy: 'createdDate', sortDir: 'DESC' }, (err, reply) => {
                if (err) {
                    console.log(err);
                    resolve({ deliveries: [] })
                    return;
                }
                var deliveries = [];
                reply.results.forEach(delivery => {
                    deliveries.push(delivery.doc)
                });
                resolve({ deliveries: deliveries })
            })
        })
    }
    sendDelivery(deliverId) {
        return new Promise((resolve, reject) => {
            deliveryIndex.getDoc(deliverId, (err, result) => {
                result.doc.status = 1;
                deliveryIndex.update(deliverId, results.doc);
            })
        })
    }
}

module.exports = DeliveryService;