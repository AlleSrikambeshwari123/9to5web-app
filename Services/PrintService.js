const strings = require('../Res/strings');

// var client = require('./dataContext').redisClient;
// var lredis = require('../Services/redis-local')

// const PRINTER_LIST = "fl:print:computers";
// const USER_PRINTER_PREFIX = "wh:printer:";

const Awb = require('../models/awb');
const AwbHistory = require('../models/awbHistory');
const User = require('../models/user');
const Cube = require('../models/cube');

class PrintService {
	// addPrinter(printer) {
	// 	return new Promise((resolve, reject) => {
	// 		this.getPrinters().then(printers => {
	// 			if (printers.includes(printer)) {
	// 				resolve({ success: false, message: strings.string_response_already_added });
	// 			} else {
	// 				client.sadd(PRINTER_LIST, printer);
	// 				resolve({ success: true, message: strings.string_response_added });
	// 			}
	// 		})
	// 	});
	// }
	// getPrinters() {
	// 	return new Promise((resolve, reject) => {
	// 		client.smembers(PRINTER_LIST, (err, printers) => {
	// 			if (err) resolve([]);
	// 			resolve(printers);
	// 		})
	// 	});
	// }

// 	// Printer Management
// 	async getUserPrinter(user) {
// 		var printer = await lredis.get(USER_PRINTER_PREFIX + user)
// 		return printer;
// 	}

// 	async setUserPrinter(user, printer) {
// 		await lredis.set(USER_PRINTER_PREFIX + user, printer);
// 	}

// 	//print awb 
// 	async sendAwbToPrint(awb, username) {
// 		var printServer = await this.getUserPrinter(username)
// 		console.log("printServer:", printServer)
// 		client.publish("print:awb:" + printServer, awb)
// 	}
// 	async sendLblToPrint(awb, username) {
// 		var printServer = await this.getUserPrinter(username)
// 		console.log("printServer:", printServer)
// 		client.publish('print:lbl:' + printServer, awb)
// 	}
// 	async sendSingleLbl(awb, pkgId, username) {
// 		var printServer = await this.getUserPrinter(username)
// 		console.log("printServer:", printServer)
// 		client.publish('print:single:lbl:' + printServer, `${awb}:${pkgId}`)
// 	}

	getAWBDataForAllRelatedEntities(id) {
		return new Promise(async(resolve, reject) => {
			let checkAwb = await Awb.findOne({ _id: id }).read('primary')
			let modelCheck = Awb
			if(checkAwb == null)
				modelCheck = AwbHistory
			modelCheck.findOne({ _id: id })
				.read("primary")
				.populate('customerId')
				.populate('shipper')
				.populate('carrier')
				.populate('hazmat')
				.populate('packages')
				.populate('purchaseOrders')
				.populate('invoices')
				.populate('createdBy')
				.exec((err, result) => {
					if (result && result.customerId) {
						result.customer = result.customerId;
					}
					resolve(result);
				});
		});
	}

	getAWBHistoryDataForAllRelatedEntities(id) {
		return new Promise((resolve, reject) => {
			AwbHistory.findOne({ _id: id })
				.populate('customerId')
				.populate('shipper')
				.populate('carrier')
				.populate('hazmat')
				.populate('packages')
				.populate('purchaseOrders')
				.populate('invoices')
				.populate('createdBy')
				.exec((err, result) => {
					if (result && result.customerId) {
						result.customer = result.customerId;
					}
					resolve(result);
				});
		});
	}

	getAWBDataForPackagesRelatedEntitie(id) {
		return new Promise(async(resolve, reject) => {
			let checkAwb = await Awb.findOne({ _id: id }).read('primary')
			let modelCheck = Awb
			if(checkAwb == null)
				modelCheck = AwbHistory
			modelCheck.findOne({ _id: id })
				.populate('packages')
				.exec((err, result) => {
					resolve(result);
				});
		});
	}

	getAWBHistoryDataForPackagesRelatedEntitie(id) {
		return new Promise((resolve, reject) => {
			AwbHistory.findOne({ _id: id })
				.populate('packages')
				.exec((err, result) => {
					resolve(result);
				});
		});
	}

	getAWBDataForPurchaseOrderRelatedEntitie(id) {
		return new Promise(async(resolve, reject) => {
			let checkAwb = await Awb.findOne({ _id: id }).read('primary')
			let modelCheck = Awb
			if(checkAwb == null)
				modelCheck = AwbHistory
			modelCheck.findOne({ _id: id })
				.populate('packages')
				.populate('purchaseOrders')
				.populate('createdBy')
				.exec(async(err, result) => {
					var purchaseOrders = result.purchaseOrders?result.purchaseOrders:[];
					
					for(var i=0;i<purchaseOrders.length;i++){
						var userDetail = await User.findOne(purchaseOrders[i].createdBy);
						purchaseOrders[i].createdBy = userDetail;
					}
					
						result.weightAwb = 0;
						result.volumetricWeight = 0;
						result.packages.forEach(packag=>{
						  let check = 1
						  packag.dimensions.split('x').forEach(data =>{
							check = check * data
						  })
						  result.weightAwb = result.weightAwb + packag.weight;
						  result.volumetricWeight = result.volumetricWeight+(check/166);
						})
						//result.volumetricWeight = volumetricWeight;
						//result.weight = weightAwb
					  
					result.no_of_pieces = result.packages?(result.packages).length:[];
					result.purchaseOrders = purchaseOrders;
					resolve(result);
				});
		});
	}
	getCubeDetailEntitie(id){
		return new Promise((resolve, reject) => {
			Awb.findOne({ _id: id })
				.populate('purchaseOrders')
				.populate('createdBy')
				.exec((err, result) => {
					resolve(result);
				});
		});
	}

}

module.exports = PrintService;