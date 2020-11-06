var zip = require('express-zip');
var _ = require('lodash');
var services = require('../Services/RedisDataServices');
var utils = require('../Util/utils');
const strings = require('../Res/strings');
var AWBGeneration = require('../Util/AWBGeneration');
var awbPdfGen = new AWBGeneration();
var LBLGeneration = require('../Util/LBLGeneration');
var CUBEGeneration = require('../Util/CUBEGeneration');
var AirCargoManifest = require('../Util/AirCargoManifest');
var FlightManifest = require('../Util/FlightManifest');
var CUBE = require('../Util/cube');
var FlightLoadSheet = require('../Util/FlightLoadSheet');
var USCustoms = require('../Util/USCustoms');
var DeliveryReport = require("../Util/DeliveryReport");
var lblPdfGen = new LBLGeneration();
var cubPdfGen = new CUBEGeneration();
const Awb = require('../models/awb');
//var cubeService = require("../Services/CubeService")
var AllPackagesOnAwb = require('../Util/PrintAllPackages');
var fs = require('fs');


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
	services.printService.getAWBDataForAllRelatedEntities(id).then(async(awb) => {
		let priceLabelAwb  =  await services.AwbPriceLabelService.getPriceLabel(awb._id)
		if(priceLabelAwb){
			awb.express = priceLabelAwb.Express
		}
		awbPdfGen.generateAWb(awb).then(result => {
			res.download(result.path);
		})
	})
}

exports.download_pkg_label = (req, res, next) => {
	services.packageService.getPackage_updated(req.params.id).then(package => {
		services.printService.getAWBDataForAllRelatedEntities(package.awbId).then((awb) => {
			lblPdfGen.generateSinglePackageLabel(awb, package).then(result => {
				res.download(result.path);
			})
		})
	})
}

exports.download_pkg_label_excel = (req, res, next) => {
	services.packageService.getPackage_updated(req.params.id).then(package => {
		services.printService.getAWBDataForAllRelatedEntities(package.awbId).then((awb) => {
			package.ext = "excel"
			lblPdfGen.generateSinglePackageLabel(awb, package).then(result => {
				res.download(result.path);
			})
		})
	})
}

exports.download_pdf_pricelabel = (req, res, next) => {
		services.AwbPriceLabelService.getPriceLabel(req.params.id).then(price => {
		if(!price.awbId){
	        res.send({ success: false, message: "This AWB has no current pricing info. Please update it first." });
		}else{
			services.printService.getAWBDataForAllRelatedEntities(price.awbId).then((awb) => {
				lblPdfGen.generateSinglePriceLabel(awb, price).then(result => {
					res.download(result.path);
					// res.send(result.path);
				})
			})
		}
	})

}

exports.download_pkg_labels = (req, res, next) => {
	let id = req.params.id;
	console.log("Downloading Package Label PDF", id);
	getFullAwb(id).then(awb => {
		lblPdfGen.generateAllPackageLabels(awb).then(results => {
			res.zip(results);
		})
	})
}

exports.print_all_pkg_labels = async (req, res, next) => {
	let id = req.params.id;
	console.log("Downloading Package Label PDF", id);
	getFullAwb(id).then(async awb => {
		// console.log('asd',awb)
		if (awb.packages.length > 0) {
			const pkgs = await Promise.all(awb.packages.map(async ab => {
				const image = await lblPdfGen.generateBarcode(ab.trackingNo);
				ab._doc['png'] = image.toString('base64')
				ab._doc['calculateDimensionalWeight'] = lblPdfGen.calculateDimensionalWeight(ab.dimensions)
				return ab
			}))
			awb.packages = pkgs
		}
		// console.log(awb)
		let pkgs = new AllPackagesOnAwb(awb)
		let stream = await pkgs.generate();
		// res.type('pdf');
		// res.attachment(`${awb.id}-USC.pdf`);
		// stream.pipe(res);
		// stream.end();
		res.send(stream)
	})
}

exports.generate_awb_pdf = (req, res, next) => {
	services.printService.getAWBDataForAllRelatedEntities(req.params.id).then(async(awb) => {
		let priceLabelAwb  =  await services.AwbPriceLabelService.getPriceLabel(awb._id)
		if(priceLabelAwb){
			awb.express = priceLabelAwb.Express
		}
		awbPdfGen.generateAWb(awb).then(result => {
			res.send(result);
		})
	})
}

exports.generate_pkg_label_pdf = (req, res, next) => {
	console.log("DWLD PACKAGE LABEL")
	services.packageService.getPackage_updated(req.params.id).then(package => {
		services.printService.getAWBDataForAllRelatedEntities(package.awbId).then((awb) => {
			lblPdfGen.generateSinglePackageLabel(awb, package).then(result => {
				res.send(result);
			})
		})
	})
}

exports.generate_cube_pdf = (req, res, next) => {
	services.cubeService.getCube(req.params.id).then(cube => {
		cube.trackingNo = cube.cubeDetail ? cube.cubeDetail.trackingNo : null;
		services.printService.getAWBDataForAllRelatedEntities(cube.cubeDetail.awbId).then((awb) => {
			awb['cubePkg'] = true;
			awb.customer.pmb = 9000
			cubPdfGen.generateSinglePackageLabel(awb, cube).then(result => {
				res.send(result);
			})
		})
	})
}

exports.generate_price_label_pdf = (req, res, next) => {
	console.log("DWLD PRICE LABEL")
	services.AwbPriceLabelService.getPriceLabel(req.params.id).then(price => {
		if(!price.awbId){
	        res.send({ success: false, message: "This AWB has no current pricing info. Please update it first." });
		}else{
			services.printService.getAWBDataForAllRelatedEntities(price.awbId).then((awb) => {
				lblPdfGen.generateSinglePriceLabel(awb, price).then(result => {
					res.send(result);
				})
			})
		}
	})
}

exports.downloadAirCargoManifest = async (req, res, next) => {
	try {
		let manifest = await services.manifestService.getManifest(req.params.id);
		let packages = await services.packageService.cloneManifestAndOriginal(req.params.id);
		let [airportFrom, airportTo] = await Promise.all([
			manifest.airportFromId && services.airportService.get(manifest.airportFromId),
			manifest.airportToId && services.airportService.get(manifest.airportToId),
		]);

		let awbIds = [];

		let packagesByAWB = packages.reduce((acc, pkg) => {
			acc[pkg.awbId] = acc[pkg.awbId] || {};
			let item = acc[pkg.awbId];
			if (pkg.awbId != null && pkg.awbId.invoices && pkg.awbId.invoices.length > 0) {
				item['isInvoice'] = true;
				pkg.awbId['isInvoice'] = true;
			}

			item.awb = String(pkg.awbId.awbId);
			let awbId = String(pkg.awbId._id);
			if (awbIds.indexOf(awbId) === -1) {
				awbIds.push(awbId);
			}
			item.pieces = (item.pieces || 0) + 1;
			// in lbs
			let weight = services.packageService.getPackageWeightInLBS(pkg);
			item.weight = (item.weight || 0) + weight;
			item.consignee = {
				name: String(
					pkg.customerId && [pkg.customerId.firstName, pkg.customerId.lastName].filter(Boolean).join(' '),
				),
				address: String(pkg.customerId && pkg.customerId.address),
			};
			item.shipper = {
				name: String(pkg.shipperId && pkg.shipperId.name),
				address: String(pkg.shipperId && pkg.shipperId.address),
			};

			item.hazmat = (pkg.hazmatId && pkg.hazmatId.description) || " ";
			item.natureOfGoods = (pkg.description && pkg.description)
			return acc;
		}, {});

		let awbsArray = await Promise.all(awbIds.map((id) => services.printService.getAWBDataForAllRelatedEntities(id)));

		let invoicesArray = await services.invoiceService.getInvoiceFilesByAWBs(awbIds);

		let airCargoManifest = new AirCargoManifest({
			_id: req.params.id,
			owner: 'Nine To Five Import Export LLC',
			marksOfNationalityAndRegistration: 'United States - ' + manifest.planeId.tailNumber,
			flightNumber: manifest.planeId.tailNumber + manifest.title,
			date: manifest.shipDate,
			portOfLading: String(airportFrom && airportFrom.name),
			portOfOnlading: String(airportTo && airportTo.name),
			rows: Object.values(packagesByAWB),
			awbsArray: awbsArray,
			invoicesArray: invoicesArray
		});
		let result = await airCargoManifest.generate();
		if(result.id){
			res.type('pdf');
			res.attachment(`${result.id}-ACM.pdf`);
			result.stream.pipe(res);
			result.stream.end();
		}else
			res.download(result);
	} catch (error) {
		next(error);
	}
};

exports.downloadCubePdf = async (req, res, next) => {
	try {
		let cubeDataObject = await services.cubeService.getCubeCompleteData(req.params.id);

		let packages = [];
		let manifest = {};

		if (cubeDataObject.cubeDetail && cubeDataObject.cubeDetail.manifestId) {
			manifest = await services.manifestService.getManifest(cubeDataObject.cubeDetail.manifestId);
			// packages = await services.packageService.cloneManifestAndOriginal(cubeDataObject.cubeDetail.manifestId);
		} 
		// else 
		if (cubeDataObject && cubeDataObject.packageList && cubeDataObject.packageList.length) {
			packages = await services.packageService.getPackagesById(cubeDataObject.packageList.map(a => a._id))
		} else {
			return res.send({ success: true, message: strings.string_noData })
		}



		let [airportFrom, airportTo] = await Promise.all([
			manifest.airportFromId && services.airportService.get(manifest.airportFromId),
			manifest.airportToId && services.airportService.get(manifest.airportToId),
		]);

		for(pack of packages){
			let awbCustomer =await services.awbService.getAwbPreviewDetails(pack.awbId._id)
			pack.customerDetail = awbCustomer
		}
		let packagesByAWB = packages.reduce((acc, pkg) => {
			acc[pkg.awbId] = acc[pkg.awbId] || {};
			let item = acc[pkg.awbId];

			if (pkg.awbId != null && pkg.awbId.invoices && pkg.awbId.invoices.length > 0) {
				item['isInvoice'] = true;
				pkg.awbId['isInvoice'] = true;
			}

			item.awb = String(pkg.awbId.awbId);
			item.pieces = (item.pieces || 0) + 1;
			// in lbs
			let weight = services.packageService.getPackageWeightInLBS(pkg);
			item.weight = (item.weight || 0) + weight;

			item.consignee = {
				name: '',
				address: ''
			};
			item.shipper = {
				name: '',
				address: ''
			};
			if (pkg.customerId) {
				item.consignee.name = pkg.customerId.lastName ? (pkg.customerId.firstName + ' ' + pkg.customerId.lastName) : pkg.customerId.firstName
				item.consignee.address = (pkg.customerId && pkg.customerId.address) ? pkg.customerId.address : ''
			}
			else if(pkg.customerDetail){
				item.consignee.name = pkg.customerDetail.customerId.lastName ? (pkg.customerDetail.customerId.firstName + ' ' + pkg.customerDetail.customerId.lastName) : pkg.customerDetail.customerId.firstName
				item.consignee.address = (pkg.customerDetail.customerId && pkg.customerDetail.customerId.address) ? pkg.customerDetail.customerId.address : ''
			}
			if(pkg.shipperId){
				item.shipper = {
					name: String(pkg.shipperId && pkg.shipperId.name),
					address: String(pkg.shipperId && pkg.shipperId.address),
				};
			}else if(pkg.customerDetail && pkg.customerDetail.shipper){
				item.shipper = {
					name: String(pkg.shipperId.name),
					address: String(pkg.shipperId.address),
				};
			}

			item.hazmat = (pkg.hazmatId && pkg.hazmatId.description) || " ";
			item.natureOfGoods = (pkg.description && pkg.description)
			return acc;
		}, {});

		let cubeManifest = new CUBE({
			owner: 'Nine To Five Import Export LLC',
			marksOfNationalityAndRegistration: 'United States - ' + (manifest.planeId ? manifest.planeId.tailNumber : ''),
			flightNumber: ((manifest && manifest.planeId) ? manifest.planeId.tailNumber : '') + (manifest ? manifest.title : ''),
			date: manifest.shipDate,
			portOfLading: (airportFrom && airportFrom.name) ? String(airportFrom && airportFrom.name) : '',
			portOfOnlading: (airportTo && airportTo.name) ? String(airportTo && airportTo.name) : '',
			rows: Object.values(packagesByAWB),
		});

		let stream = await cubeManifest.generate();	
		 res.type('pdf');
		 res.attachment(`${cubeDataObject._id}-Cube.pdf`);
		 stream.pipe(res);
		 stream.end();
		// awbPdfGen.getPdfArray(cubeManifest,cubeDataObject._id,packages).then((pdfArray)=>{
		// 	res.zip(pdfArray)
		// })

	} catch (error) {
		next(error);
	}
};

exports.downloadFlightManifest = async (req, res, next) => {
	try {
		let manifest = await services.manifestService.getManifest(req.params.id);
		let packages = await services.packageService.cloneManifestAndOriginal(req.params.id);

		let rows = packages.map((pkg) => {
			return {
				id: pkg.id,
				awb: pkg.awbId.awbId,
				weight: services.packageService.getPackageWeightInLBS(pkg),
				consignee: {
					name: String(
						pkg.customerId && [pkg.customerId.firstName, pkg.customerId.lastName].filter(Boolean).join(' '),
					),
				},
				shipper: {
					name: String(pkg.shipperId && pkg.shipperId.name),
					address: String(pkg.shipperId && pkg.shipperId.address),
				},
			};
		});
		let image = await lblPdfGen.generateBarcode(manifest.id)
		image = 'data:image/jpeg;base64,' + image.toString('base64')
		let flightManifest = new FlightManifest({
			carrier: "Nine To Five Import Export",
			departureDate: manifest.shipDate,
			barcode: image,
			flightNumber: manifest.planeId.tailNumber,
			rows,
		});

		let stream = await flightManifest.generate();
		res.type('pdf');
		res.attachment(`${manifest.id}-FM.pdf`);
		stream.pipe(res);
		stream.end();
		// awbPdfGen.getPdfArray(flightManifest,manifest.id,packages).then((pdfArray)=>{
		// 	res.zip(pdfArray)
		// })
	} catch (error) {
		next(error);
	}
};



exports.downloadFlightLoadSheet = async (req, res, next) => {
	try {
		let manifest = await services.manifestService.getManifest(req.params.id);
		let packages = await services.packageService.cloneManifestAndOriginal(req.params.id);
		let compartments = await Promise.all(
			_.uniqBy(packages, 'compartmentId').filter(i => i.compartmentId).map((pkg) =>
				services.planeService.getCompartment(pkg.compartmentId),
			),
		);

		let sections = compartments.map((compartment) => {
			return {
				name: compartment.name,
				packages: packages
					.filter((pkg) => (pkg.compartmentId && pkg.compartmentId._id) == compartment.id)
					.map((pkg) => {
						return {
							id: pkg.id,
							awb: pkg.awbId.awbId,
							weight: services.packageService.getPackageWeightInLBS(pkg),
						};
					}),
			};
		});

		let flightLoadSheet = new FlightLoadSheet({
			carrier: "Nine To Five Import Export",
			departureDate: manifest.shipDate,
			flightNumber: manifest.planeId.tailNumber,
			sections: sections,
		});
		let stream = await flightLoadSheet.generate();
		res.type('pdf');
		res.attachment(`${manifest.id}-FLS.pdf`);
		stream.pipe(res);
		stream.end();
	} catch (error) {
		next(error);
	}
};

exports.downloadUSCustoms = async (req, res, next) => {
	try {
		let manifest = await services.manifestService.getManifest(req.params.id);
		let packages = await services.packageService.cloneManifestAndOriginal(req.params.id);
		let airline = await services.airlineService.getAirline(manifest.planeId.airlineId);

		let [airportFrom, airportTo] = await Promise.all([
			manifest.airportFromId && services.airportService.get(manifest.airportFromId),
			manifest.airportToId && services.airportService.get(manifest.airportToId),
		]);

		let awbIds = _.uniqBy(packages, 'awbId')
			.map((i) => i.awbId)
			.filter(Boolean);

		let awbs = await Promise.all(awbIds.map((id) => services.awbService.getFullAwb(id)));

		let packagesByAWB = packages.reduce((acc, pkg) => {
			acc[pkg.awbId] = acc[pkg.awbId] || [];
			acc[pkg.awbId].push(pkg);
			return acc;
		}, {});

		let natureOfGoods = { awbCount: 0, isSed: 0, hazmat: 0 };
		let totalWeight = 0;
		let totalPieces = 0;
		let items = Object.values(packagesByAWB).map((packages) => {
			let awb = awbs.find((i) => String(i._id) == String(packages[0].awbId.id)) || {};
			let weight = packages.reduce(
				(acc, pkg) => acc + services.packageService.getPackageWeightInLBS(pkg),
				0,
			);
			totalWeight += weight;
			totalPieces += packages.length;
			if (awb) {
				natureOfGoods.awbCount += 1;
				if (awb.isSed) natureOfGoods.isSed += 1;
				if (awb.hazmat) natureOfGoods.hazmat += 1;
			}
			let declaredValueForCustoms = 0;
			awb.invoices.forEach(invoice => {
				declaredValueForCustoms += parseInt(invoice.value);
			});

			return {
				declaredValueForCustoms,
				declaredValueForCharge: 'NVD',
				executedOnDate: new Date(),
				executedAtPlace: 'Fort Launderdale',
				awb: awb._id,
				consignee: {
					name: String(
						awb.customer && [awb.customer.firstName, awb.customer.lastName].filter(Boolean).join(' '),
					),
					address: String(awb.customer && awb.customer.address)
				},
				shipper: {
					name: String(awb.shipper && awb.shipper.name),
					address: String(awb.shipper && awb.shipper.address),
				},
				accountingInformation: manifest.planeId.tailNumber,
				pieces: packages.length,
				weight: weight,
				chargeableWeight: 'BBB',
				natureAndQuantityOfGoods: '???',
				ultimateDestination: 'BAHAMAS',
				natureOfAwb: awb.hazmat ? awb.hazmat.description : "",
				packageAWBNumber: packages[0].awbId ? packages[0].awbId.awbId : ""
			};
		});

		items.unshift({
			declaredValueForCustoms: "",
			declaredValueForCharge: '',
			executedOnDate: "",
			executedAtPlace: '',
			awb: "",
			consignee: {},
			shipper: { name: '', address: '' },
			accountingInformation: '',
			pieces: "",
			weight: "",
			chargeableWeight: '',
			natureAndQuantityOfGoods: '???',
			ultimateDestination: '',
			natureOfAwb: ''
		})

		let usCustoms = new USCustoms({
			departureDate: new Date(),
			carrier: "Nine To Five Import Export",
			flightNumber: manifest.planeId.tailNumber,
			airportFrom: {
				name: String(airportFrom && airportFrom.name),
			},
			airportTo: {
				name: String(airportTo && airportTo.name),
			},
			mawb: manifest.planeId.tailNumber,
			to: 'GAC',
			byFirstCarrier: airline.name,
			items,
			natureOfGoods,
			totalWeight,
			totalPieces
		});
		let stream = await usCustoms.generate();
		res.type('pdf');
		res.attachment(`${manifest.id}-USC.pdf`);
		stream.pipe(res);
		stream.end();
	} catch (error) {
		next(error);
	}
};

exports.downloadDeliveryReport = async (req, res, next) => {
	try {
		let delivery = await services.deliveryService.getFullDelivery(req.params.id);
		let packages = await services.packageService.getPackagesDataByDeliveryId(req.params.id);
		let rows = packages.map((pkg) => {
			return {
				id: pkg.id,
				awb: pkg.awbId.id,
				weight: services.packageService.getPackageWeightInLBS(pkg),
				pmb: pkg.customerId && pkg.customerId.pmb,
				description: pkg.description,
				awbId : pkg.awbId.awbId
			};
		});

		let deliveryReport = new DeliveryReport({
			carrier: "Nine To Five Import Export",
			deliveryDate: delivery.delivery_date,
			vehicleNo: delivery.vehicleId.registration,
			rows,
			location : delivery.locationId.name,
			deliveryNum : delivery.deliveryNum
		});
		let stream = await deliveryReport.generate();
		res.type('pdf');
		res.attachment(`${delivery.id}-FM.pdf`);
		stream.pipe(res);
		stream.end();
	} catch (error) {
		next(error);
	}
};





function getFullAwb(id) {
	return new Promise((resolve, reject) => {
		Promise.all([
			services.awbService.getAwb(id),
			services.packageService.getPackages_updated(id),
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
				// console.log(otherInfos)
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