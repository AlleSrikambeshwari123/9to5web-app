const strings = require('../Res/strings');

var client = require('./dataContext').redisClient;
var lredis = require('../RedisServices/redis-local')

const PRINTER_LIST = "fl:print:computers";
const USER_PRINTER_PREFIX = "wh:printer:";
const Awb = require('../models/awb');

class PrintService {
    addPrinter(printer) {
        return new Promise((resolve, reject) => {
            this.getPrinters().then(printers => {
                if (printers.includes(printer)) {
                    resolve({ success: false, message: strings.string_response_already_added });
                } else {
                    client.sadd(PRINTER_LIST, printer);
                    resolve({ success: true, message: strings.string_response_added });
                }
            })
        });
    }
    getPrinters() {
        return new Promise((resolve, reject) => {
            client.smembers(PRINTER_LIST, (err, printers) => {
                if (err) resolve([]);
                resolve(printers);
            })
        });
    }

    // Printer Management
    async getUserPrinter(user) {
        var printer = await lredis.get(USER_PRINTER_PREFIX + user)
        return printer;
    }

    async setUserPrinter(user, printer) {
        await lredis.set(USER_PRINTER_PREFIX + user, printer);
    }

    //print awb 
    async sendAwbToPrint(awb, username) {
        var printServer = await this.getUserPrinter(username)
        console.log("printServer:", printServer)
        client.publish("print:awb:" + printServer, awb)
    }
    async sendLblToPrint(awb, username) {
        var printServer = await this.getUserPrinter(username)
        console.log("printServer:", printServer)
        client.publish('print:lbl:' + printServer, awb)
    }
    async sendSingleLbl(awb, pkgId, username) {
        var printServer = await this.getUserPrinter(username)
        console.log("printServer:", printServer)
        client.publish('print:single:lbl:' + printServer, `${awb}:${pkgId}`)
    }

    getAWBDataForAllRelatedEntities(id) {
        return new Promise((resolve, reject) => {
            Awb.findOne({_id: id})
            .populate('customerId')
            .populate('shipper')
            .populate('carrier')
            .populate('hazmat')
            .populate('packages')
            .populate('purchaseOrders')
            .populate('invoices')
            .populate('createdBy')
            .exec((err, result) => {
                if (result.customerId) {
                    result.customer = result.customerId;
                }
                resolve(result);
            });
        });
    }
}

module.exports = PrintService;