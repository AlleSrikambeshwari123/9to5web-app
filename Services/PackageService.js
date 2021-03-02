var emailService = require('../Util/EmailService');
var mongoose = require('mongoose')
var moment = require('moment');
var momentz = require('moment-timezone')
var fs = require('fs');
var uniqId = require('uniqid');
var strings = require('../Res/strings');
var firebase = require('../Util/firebase');

var _ = require("lodash")

const Barcode = require('../models/barcode');

const LIST_PACKAGE_SHIPMENT = 'list:shipment:'; // this key + shipmentId = array of packages
// const SHIPMENT_ID = 'id:accept:truck';
const SHIPMENT_ID = 34;

const PKG_STATUS = {
    0: 'Package Created',
    1: 'Received in FLL',
    2: 'Loaded on AirCraft',
    3: 'In Transit',
    4: 'In Warehouse Nassuau',
    5: 'Received By Customer',
    6: 'Delivered',
    7: 'No Invoice Present',
    8: 'Assigned to cube',
    9: 'Delivered to Store',
    10: 'Removed from Flight FLL'
};

const Package = require('../models/package');
const PackageHistory = require('../models/packageHistory');
const Location = require('../models/location');
const Compartment = require('../models/compartment');
const Manifest = require('../models/manifest');
const Delivery = require('../models/delivery');
const PackageStatus = require('../models/packageStatus');
const Customer = require('../models/customer');
const Awb = require('../models/awb');
const Zone = require('../models/zone')
const Cube = require('../models/cube')
const ProcessPackage = require('../models/processPkg')
const DeliveryService = require('./DeliveryService');
const deliveryService = new DeliveryService();
var ObjectId = require('mongoose').Types.ObjectId;

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

class PackageService {
    constructor() {
        this.services = {};
    }

    setServiceInstances(services) {
        this.services = services;
    }

    // 1: 'Received in FLL',
    async addPackageToShipment(packages, username) {
        try {
            let error = []
            if (packages.length == 0 && username.length == 0) return { success: false, message: "Please Provide Valid Input Keys" }
            let packageIds = packages.split(',');
            return Promise.all(
                packageIds.map(async(packageId) => {
                    const status = await this.updatePackageStatus(packageId, 1, username);
                    if (!status.success) error.push(status.message)
                    return status
                })
            ).then((result) => {
                if (error.length > 0) return { success: false, message: error }
                return {
                    success: true,
                    message: strings.string_response_received,
                    status: PKG_STATUS[1]
                };
            });
        } catch (error) {
            console.error('addPackageToShipment', error);
            return error;
        }
    }

    //2: 'Loaded on AirCraft',
    async addPackagesToCompartment(packageIds, compartmentId, userId,manifestId) {
        try {
            let error = []
            let totalPkgWeight = 0
            let upcomingWeight = 0
            let packages = packageIds && packageIds.length && packageIds.split(',').filter(Boolean);
            const cv = await Compartment.findById(compartmentId).populate({ path: 'packages', select: 'weight' }).
            select('packages weight')
            let compartmentPackages = await this.getPackagesByObject({manifestId : manifestId,compartmentId : compartmentId})
            compartmentPackages.map(w => totalPkgWeight += w.weight)
            const pkgs = await Promise.all(packages.map(async pkgId => {
                for(let p of compartmentPackages){
                    if(String(p._id) != String(pkgId)){
                        const pk = await Package.findById(pkgId).select('weight')
                        return upcomingWeight += pk.weight
                    }
                }
            }))
            if (totalPkgWeight + pkgs[0] > cv.weight) {
                return { success: false, message: `Total Packages Weight ${totalPkgWeight+pkgs[0]} Should be less than Compartment Capacity ${cv.weight}` }
            }
            await Compartment.findOneAndUpdate({ _id: compartmentId }, { $push: { packages: packages } })
            await Promise.all(packages.map(async packageId => {
                // check packageId Exists
                if (await Package.findById(packageId)) {
                    this.updatePackage(packageId, { compartmentId: compartmentId });
                    const status = await this.updatePackageStatus(packageId, 2, userId);
                    if (!status.success) error.push(status.message)
                } else {
                    error.push(`Package ${packageId} doesn't Exist`)
                }
            }))
            if (error.length > 0) return { success: false, message: error }
            return { success: true, message: strings.string_response_loaded, status: PKG_STATUS[2] }
        } catch (error) {
            console.log(error);
            return { success: false, message: strings.string_response_error }
        }
    }

    // Add Packages To Manifest 2: 'Loaded on AirCraft',
    async addPackagesToManifests(packageIds, manifestId, userId, compartmentId) {
        try {
            let error = []
            let totalPkgWeight = 0
            let upcomingWeight = 0
            let allPackages = packageIds && packageIds.length && packageIds.split(',').filter(Boolean);
            const cv = await Manifest.findById(manifestId).populate([{ path: 'packages', select: 'weight' }, { path: 'planeId', select: 'maximumCapacity' }]).
            select('packages planeId')
            let compartmentPackages = await this.getPackagesByObject({manifestId : manifestId,compartmentId : compartmentId})
            
            let repeatedPackages = [],packages = [];
            let repeatedPackagesTrackingNo =[]
            for(let i=0;i<allPackages.length;i++){
                let flag = false
                for(let comp of compartmentPackages){
                    if(String(comp._id) == String(allPackages[i])){
                        flag = true
                        repeatedPackagesTrackingNo.push(comp.trackingNo)
                        repeatedPackages.push(allPackages[i])
                    }
                }
                if(!flag)
                    packages.push(allPackages[i])
            }
           
            compartmentPackages.map(w => totalPkgWeight += w.weight)
            const pkgs = await Promise.all(packages.map(async pkgId => {
                for(let p of compartmentPackages){
                    if(String(p._id) != String(pkgId)){
                        const pk = await Package.findById(pkgId).select('weight')
                        return upcomingWeight += pk.weight
                    }
                }
            }))
            if (totalPkgWeight + pkgs[0] > cv.planeId.maximumCapacity) {
                return { success: false, message: `Total Packages Weight ${totalPkgWeight+pkgs[0]} Should be less than Plane Capacity ${cv.planeId.maximumCapacity}` }
            }
            await Manifest.findOneAndUpdate({ _id: manifestId }, { $push: { packages: packages } })
            await Promise.all(packages.map(async packageId => {
                // check packageId Exists
                if (await Package.findById(packageId)) {
                    this.updatePackage(packageId, { manifestId: manifestId});
                    const status = await this.updatePackageStatus(packageId, 2, userId);
                    if (!status.success) error.push(status.message)
                } else {
                    error.push(`Package ${packageId} doesn't Exist`)
                }
            }))
            if (error.length > 0) return { success: false, message: error }
            
            if(repeatedPackages.length > 0)
                return { success: true, message: `These packages are already there in this compartment : ${repeatedPackagesTrackingNo.join(',')} .Do you want to delete them?`, status: PKG_STATUS[2] , repeatedPackages : repeatedPackages.join(','),newPackages : packages.join(',')}
            else
                return { success: true, message: strings.string_response_loaded, status: PKG_STATUS[2] }
        } catch (error) {
            return { success: false, message: strings.string_response_error }
        }
    }

    async removeFromFlight(object){
        try{
            let error = []
            let packages = object.packageIds && object.packageIds.length && object.packageIds.split(',').filter(Boolean);
            await Promise.all(packages.map(async packageId => {
                await Manifest.updateOne({ _id: object.manifestId }, { $pull: { packages: packageId } })
                await Compartment.updateOne({ _id: object.compartmentId }, { $pull: { packages: packageId } })
                // check packageId Exists
                if (await Package.findById(packageId)) {
                    await Package.updateOne({_id : packageId}, {$unset :{ manifestId: 1,compartmentId : 1}});
                    const status = await this.updatePackageStatus(packageId, 10, object.userId);
                    if (!status.success) error.push(status.message)

                } else {
                    error.push(`Package ${packageId} doesn't Exist`)
                }
            }))
            if (error.length > 0) return { success: false, message: error }

            return { success: true, message: strings.string_response_loaded, status: PKG_STATUS[10] }
        } catch (error) {
            return { success: false, message: strings.string_response_error }
        }
    }

    // 3: 'In Transit',
    async addPackagesToDelivery(deliveryId, packageIds, user,locationId,query) {
        return new Promise(async(resolve, reject) => {
            let error = []
            let packages = packageIds && packageIds.length && packageIds.split(',').filter(Boolean);
            Delivery.findOneAndUpdate({ _id: deliveryId }, { $push: { packages: packages }, updatedBy: user }, (err, delivery) => {
                if (err) {
                    resolve({ success: false, message: strings.string_response_error });
                }
            })
            Promise.all(
                packages.map(async(packageId) => {
                    this.updatePackage(packageId, { deliveryId: deliveryId });
                    const validateStore = await this.validateDeliveryStorePackage(locationId,packageId)
                    if(query.override == undefined){
                        if(!validateStore.success) error.push(validateStore.message)
                    }
                    if(validateStore.success || query.override !== undefined){
                        const status = await this.updatePackageStatus(packageId, 3, user);
                        if (!status.success) error.push(status.message)
                        return status
                    }
                }),
            ).then((result) => {
                if (error.length > 0) return resolve({ success: false, error_message: error })
                resolve({ success: true, message: strings.string_response_received, status: PKG_STATUS[3] });
            });
        })
    }

    // 4: 'In Warehouse Nassuau',
    async receivePackageToFlight(packageIds, userId) {
        try {
            let error = []
            let packages = packageIds && packageIds.length && packageIds.split(',').filter(Boolean);
            await Promise.all(packages.map(async packageId => {
                // check packageId Exists
                if (await Package.findById(packageId)) {
                    const status = await this.updatePackageStatus(packageId, 4, userId);
                    if (!status.success) error.push(status.message)
                } else {
                    error.push(`Package ${packageId} doesn't Exist`)
                }
            }))
            if (error.length > 0) return { success: false, message: error }
            return { success: true, message: strings.string_response_loaded, status: PKG_STATUS[4] }
        } catch (error) {
            return { success: false, message: strings.string_response_error }
        }
    }

    // 5: 'Received By Customer',
    checkOutToCustomer(barcodes, username) {
        return new Promise((resolve, reject) => {
            let packageIds = barcodes.split(',');
            let error = []
            Promise.all(
                packageIds.map(async(packageId) => {
                    const status = await this.updatePackageStatus(packageId, 5, username);
                    if (!status.success) error.push(status.message)
                    else{
                        this.removePackageFromLocation(packageId,error)
                    }
                    return status
                }),
            ).then(async (result) => {
                if (error.length > 0) return resolve({ success: false, message: error })
                await this.removePackagesAndAwb(packageIds)
                resolve({ success: true, message: strings.string_response_received, status: PKG_STATUS[5] });
            });
        });
    }

    // 7: 'No Invoice Present',
    async addAwbsPkgNoDocs(data) {
        try {
            let packageIds = data.packageIds.split(',');
            let error = []
             await Promise.all(
                packageIds.map(async packageId => {
                        let zoneResult = await Zone.findById(data.zoneId)
                        let zoneName = (zoneResult && zoneResult.name) ? zoneResult.name : '' 
                        this.updatePackage(packageId, {
                            location: data.location,
                            zoneId: data.zoneId,
                            zoneName: zoneName,
                            aging:1
                        });
                        const status = await this.updatePackageStatus(packageId, 7, data.userId);
                        if (!status.success) error.push(status.message)
                        else{
                            await this.updateZoneAndLocation(data.zoneId, packageIds)
                        }
                        //email                        
                        this.sendNoDocsPackageData(packageId);
                        return status
                    },
                    // this.updateAwbPackages(data.awbId,packageIds),
                )
            )
            if (error.length > 0) return { success: false, message: error }
            return { success: true, message: strings.string_response_received, status: PKG_STATUS[7] }
            
            
        } catch (error) {
            console.error('addAwbsPkgNoDocs', error)
        }
    }

    // 9: 'Delivered to Store'
    checkInStore(data, username,query) {
        let packageIds = data.packageIds.split(',');
        let error = []
        return new Promise((resolve, reject) => {
            Promise.all(
                packageIds.map(async(packageId) => {
                        let locationResult = await Location.findById(data.location)
                        let zoneResult = await Zone.findById(data.zoneId)
                        let zoneName = (zoneResult && zoneResult.name) ? zoneResult.name : '' 
                        this.updatePackage(packageId, {
                            location: locationResult.name,
                            companyId: data.companyId,
                            zoneId: data.zoneId,
                            zoneName : zoneName,
                            agingStore:1
                        });
                        const validateStore = await this.validateStorePackage(data.location,packageId)
                        if(query.override == undefined){
                            if(!validateStore.success) error.push(validateStore.message)
                        }
                        if(validateStore.success || query.override !== undefined){
                            let status
                            if(validateStore.location == 'Warehouse'){
                                status = await this.updatePackageStatus(packageId, 4, username);                       
                            }else{
                                status = await this.updatePackageStatus(packageId, 9, username);                       
                            }
                            this.sendStorePackageData(packageId);
                            if (!status.success) error.push(status.message)
                            else{
                                await this.updateZoneAndLocation(data.zoneId, packageIds,error)
                            }
                            return status
                        }
                    },
                ),
            ).then((result) => {
                if (error.length > 0) return resolve({ success: false, error_message: error })
                resolve({ success: true, message: strings.string_response_received, status: PKG_STATUS[9] });
            });
        });
    }

    //========== Dashboard Functions ==========//
    getPackageStatus() {
        return new Promise(async(resolve, reject) => {
            let packages = await Package.find({})
            let obj = {
                created: 0,
                received_fill: 0,
                loaded_craft: 0,
                in_transit: 0,
                received_nas: 0,
                ready_pd: 0,
                delivered: 0,
                no_invoice: 0,
                assigned_to_cube: 0,
                delivered_to_store: 0
            };

            packages.map((item) => {
                if (!item.lastStatusText) obj.created += 1;
                if (item.lastStatusText == PKG_STATUS[1]) obj.received_fill += 1;
                if (item.lastStatusText == PKG_STATUS[2]) obj.loaded_craft += 1;
                if (item.lastStatusText == PKG_STATUS[3]) obj.in_transit += 1;
                if (item.lastStatusText == PKG_STATUS[4] || item.lastStatusText == 'Recieved in NAS') obj.received_nas += 1;
                if (item.lastStatusText == PKG_STATUS[5]) obj.ready_pd += 1;
                if (item.lastStatusText == PKG_STATUS[6]) obj.delivered += 1;
                if (item.lastStatusText == PKG_STATUS[7]) obj.no_invoice += 1;
                if (item.lastStatusText == PKG_STATUS[8]) obj.assigned_to_cube += 1;
                if (item.lastStatusText == PKG_STATUS[9]) obj.delivered_to_store += 1;
            })

            resolve(obj)
        })
    }
    getPackageStatusFilterDate(query){
        return new Promise(async(resolve, reject) => {
            var searchData = {};
            if(query && query.daterange && query.type == "packageStatus"){
                var daterange = query.daterange;
                var date_arr = daterange.split('-');
                var startDate = (date_arr[0]).trim();      
                var stdate = new Date(startDate);
                stdate.setDate(stdate.getDate() );
            
                var endDate = (date_arr[1]).trim();
                var endate = new Date(endDate);
                endate.setDate(endate.getDate() +1); 
                
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                     
                searchData.createdAt = {"$gte":stdate, "$lte": endate};             
            }else if(query && query.daterange && !query.type ){
              var endate = new Date();      
              endate.setDate(endate.getDate());
              var stdate = new Date();
              stdate.setDate(stdate.getDate() - parseInt(0)); 
              
              stdate = new Date(stdate.setUTCHours(0,0,0,0));
              stdate = stdate.toISOString();
              endate = new Date(endate.setUTCHours(23,59,59,0));
              endate = endate.toISOString(); 
                    
              searchData.createdAt = {"$gte":stdate, "$lte": endate};
            }
            let packages = await Package.find(searchData)
            let obj = {
                created: 0,
                received_fill: 0,
                loaded_craft: 0,
                in_transit: 0,
                received_nas: 0,
                ready_pd: 0,
                delivered: 0,
                no_invoice: 0,
                assigned_to_cube: 0,
                delivered_to_store: 0
            };

            packages.map((item) => {
                if (!item.lastStatusText) obj.created += 1;
                if (item.lastStatusText == PKG_STATUS[1]) obj.received_fill += 1;
                if (item.lastStatusText == PKG_STATUS[2]) obj.loaded_craft += 1;
                if (item.lastStatusText == PKG_STATUS[3]) obj.in_transit += 1;
                if (item.lastStatusText == PKG_STATUS[4] || item.lastStatusText == 'Recieved in NAS') obj.received_nas += 1;
                if (item.lastStatusText == PKG_STATUS[5]) obj.ready_pd += 1;
                if (item.lastStatusText == PKG_STATUS[6]) obj.delivered += 1;
                if (item.lastStatusText == PKG_STATUS[7]) obj.no_invoice += 1;
                if (item.lastStatusText == PKG_STATUS[8]) obj.assigned_to_cube += 1;
                if (item.lastStatusText == PKG_STATUS[9]) obj.delivered_to_store += 1;
            })

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

            Package.find({ createdAt: dateObj }, null, { sort: { createdAt: 1 } }, async(err, packages) => {
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
                        let flag =0
                        if(lastStatusData.status == PKG_STATUS[4] || lastStatusData.status == 'Recieved in NAS'){
                            flag = 1
                        }
                        obj["received_nas"] = obj["received_nas"] + flag
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
        });
    }

    getPackageByTrackingId(trackingNo) {
        return new Promise((resolve, reject) => {
            PackageHistory.find({ trackingNo })
                .populate(['customerId', 'shipperId', 'carrierId', 'awbId', 'hazmatId', 'createdBy', 'manifestId', 'compartmentId', 'deliveryId'])
                .exec((err, result) => {
                    if (err) {
                        resolve({});
                    } else {
                        if (result[0] && result[0].id) {
                            let pkg = result[0]
                            PackageStatus.find({ packageId: pkg._id })
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
                                success: false,
                                message: strings.string_not_found_package
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
                            success: true,
                            packages: pkgs
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
                .populate('originBarcode')
                .populate('customerId')
                .populate('zoneId')
                .exec((err, result) => {
                    if (err) {
                        resolve([]);
                    } else {
                        resolve(result);
                    }
                });
        });
    }
    getAllPackagesUpdated(req){        
        return new Promise((resolve, reject) => {
            var searchData = {};
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
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                     
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
          
                if(!req.query.daterange && !req.query.clear){
                  var endate = new Date();      
                  endate.setDate(endate.getDate());
                  var stdate = new Date();
                  stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table));
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                       
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
                if(req.query.clear){
                  var endate = new Date();      
                  endate.setDate(endate.getDate()+1);
                  var stdate = new Date();
                  stdate.setDate(stdate.getDate() -14); 
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                      
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
              }   
            Package.find(searchData)
                .populate('awbId')
                .populate('originBarcode')
                .populate('customerId')
                .populate('zoneId')
                .populate('shipperId')
                .populate('cubeId')
                .exec((err, result) => {
                    if (err) {
                        resolve([]);
                    } else {
                        resolve(result);
                    }
                });
        });
    }

    getPackageDetail(id){
        return new Promise((resolve, reject) => {
            Package.find({_id:id})
            .populate({path : 'awbId',populate : 'driver'})
            .populate('originBarcode')
            .populate('customerId')
            .populate('zoneId')
            .populate('shipperId')
            .populate('carrierId')
            .populate('cubeId')
            .populate('manifestId')
            .exec((err, result) => {
                if (err) {
                    resolve([]);
                } else {                   
                    resolve(result);
                }
            }); 
        }) 
    }

    getAllSnapshotPackagesUpdated(req,searchData){      
        return new Promise(async(resolve, reject) => {
            // var searchData = {};
            if(req && req.query && req.query.locationId){
                if(ObjectId.isValid(req.query.locationId)){
                    let zoneResult = await Zone.find({location : req.query.locationId}) 
                    let zoneArray = []
                    for(let zone of zoneResult){
                        if(zone && zone._id){
                            zoneArray.push(zone._id)
                        }
                    }
                    searchData['zoneId'] = {$in : zoneArray}
                }
            }
            else if(req && req.query && req.query.customerId){
                if(ObjectId.isValid(req.query.customerId)){
                    let customerResult = await Customer.findById(req.query.customerId) 
                    if(customerResult && customerResult.package){
                        searchData['_id'] =  { $in : customerResult.package}
                    }
                }
            }
            else if(req && req.query && req.query.search_type && req.query.search_text){
                var searchcolmn = {AWBNUMBER:"awbIdString", CONSIGNEE : "customerFullName",SHIPPER : "shipperName",BARCODE : "barcode"}
                var sColumn = searchcolmn[req.query.search_type];
                searchData[sColumn] = {'$regex' : req.query.search_text , '$options' : 'i'};
              } 
            else if(req && req.query && !searchData._id){
                var daterange = req.query.daterange?req.query.daterange:'';
                if(daterange){
                  var date_arr = daterange.split('-');
                  var startDate = (date_arr[0]).trim();      
                  var stdate = new Date(startDate);
                  stdate.setDate(stdate.getDate() );
          
                  var endDate = (date_arr[1]).trim();
                  var endate = new Date(endDate);
                  endate.setDate(endate.getDate() +1); 
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                     
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
          
                if(!req.query.daterange && !req.query.clear){

                  var endate = new Date();      
                  endate.setDate(endate.getDate());
                  var stdate = new Date();
                  stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table));
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                       
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};

                }
                if(req.query.clear){
                  var endate = new Date();      
                  endate.setDate(endate.getDate()+1);
                  var stdate = new Date();
                  stdate.setDate(stdate.getDate() -14); 
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                      
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
              }  
              if(req && req.query && req.query.nodocs){
                searchData['lastStatusText'] =  "No Invoice Present"
              } 
              
            if(searchData._id && !req.query.customerId && !req.query.locationId){
                if(req && req.query && req.query.search_collection == "HISTORY"){
                    PackageHistory.find(searchData)
                    .populate({path : 'awbId',populate : 'driver'})
                    .populate('originBarcode')
                    .populate('customerId')
                    .populate({path : 'zoneId',populate : {path : 'location',populate : 'company'}})
                    .populate('shipperId')
                    .populate('carrierId')
                    .populate('cubeId')
                    .populate('manifestId')
                    .exec((err, result) => {
                        if (err) {
                            resolve([]);
                        } else {
                            console.log("packg",result)
                            resolve(result);
                        }
                    });
                }else{
                    let pkgCheck = await Package.find(searchData)
                    let modelCheck = Package
                    if(pkgCheck == null || pkgCheck.length == 0)
                        modelCheck = PackageHistory
                    modelCheck.find(searchData)
                    .populate({path : 'awbId',populate : 'driver'})
                    .populate('originBarcode')
                    .populate('customerId')
                    .populate({path : 'zoneId',populate : {path : 'location',populate : 'company'}})
                    .populate('shipperId')
                    .populate('carrierId')
                    .populate('cubeId')
                    .populate('manifestId')
                    .exec((err, result) => {
                        if (err) {
                            resolve([]);
                        } else {
                            console.log("packg",result)
                            resolve(result);
                        }
                    });
                }
            }else{
                if(req && req.query && (req.query.customerId == 'load' || req.query.locationId == 'load')){
                    resolve([])
                }else{
                    console.log("check all list")

                    if(req && req.query && req.query.nodocs){
                        searchData['lastStatusText'] =  "No Invoice Present"
                      }
                      console.log("re",req.query,searchData)
                    if(req && req.query && req.query.search_collection == "HISTORY"){  
                        console.log("hist")
                        PackageHistory.find(searchData)
                        .exec((err, result) => {
                            if (err) {
                                resolve([]);
                            } else {
                                resolve(result);
                            }
                        });
                    }else{
                        Package.find(searchData)
                        .exec((err, result) => {
                            if (err) {
                                resolve([]);
                            } else {
                                resolve(result);
                            }
                        });
                    }
                }
            }
        });
    }

    get_Packages_update(object) {
        return new Promise((resolve, reject) => {
            Package.find(object)
                .populate('awbId')
                .populate('originBarcode')
                .populate('customerId')
                .populate('shipperId')
                .populate('zoneId')
                .exec((err, result) => {
                    if (err) {
                        resolve([]);
                    } else {
                        resolve(result);
                    }
                });
        });
    }

    getAllPackagesNoDoc() {
        return new Promise((resolve, reject) => {
            Package.find({})
                .populate('awbId')
                .populate('originBarcode')
                .populate('customerId')
                .populate('zoneId')
                .populate('shipperId')
                .populate('carrierId')
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
        return new Promise(async(resolve, reject) => {
            let nineToPackages = [],
                postBox = [],
                noDocs = [];
            var daterange = query.daterange?query.daterange:'';
            var type = query.type?query.type:'';
            
            var searchData = {};
            if(daterange && type){
                console.log(query);
                var date_arr = daterange.split('-');
                  var startDate = (date_arr[0]).trim();      
                  var stdate = new Date(startDate);
                  stdate.setDate(stdate.getDate() );
          
                  var endDate = (date_arr[1]).trim();
                  var endate = new Date(endDate);
                  endate.setDate(endate.getDate() +1);  
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                    
                  var searchDataType = {createdAt: {"$gte":stdate, "$lte": endate}}; 
            }
                var endate = new Date();      
                endate.setDate(endate.getDate());
                var stdate = new Date();
                stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table));
                
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                       
                searchData.createdAt = {"$gte":stdate, "$lte": endate};
            
            console.log("searchData>>>>>>>>>>>>>>>>",searchData)
            if (filter === 'all') {
                let packages = await Package.find(searchData).populate(["awbId", "customerId", "zoneId"])
                
                let result = await Promise.all(packages.map(async(pkg) => {
                    let statuses = await PackageStatus.find({ packageId: pkg._id }) || [];
                    if (statuses.length > 0) {
                        let packageStatus = statuses[statuses.length - 1];

                        if (pkg.awbId && pkg.awbId.invoices && pkg.awbId.invoices.length == 0) {
                            noDocs.push({ _id: pkg.id, last_status: packageStatus.status, awb: "AWB" + pkg.awbId.awbId, customer_email: pkg.customerId ? pkg.customerId.email : '', zone: pkg.zoneId ? pkg.zoneId.name : '',createdAt:pkg.createdAt })
                        }

                        if (pkg.customerId && pkg.customerId.pmb == "9000") {
                            nineToPackages.push({ _id: pkg.id, last_status: packageStatus.status, awb: "AWB" + pkg.awbId.awbId, customer_email: pkg.customerId ? pkg.customerId.email : '', zone: pkg.zoneId ? pkg.zoneId.name : '',createdAt:pkg.createdAt })
                        }

                        if (pkg.customerId && pkg.customerId.pmb != "9000") {
                            postBox.push({ _id: pkg.id, last_status: packageStatus.status, awb: "AWB" + pkg.awbId.awbId, customer_email: pkg.customerId ? pkg.customerId.email : '', zone: pkg.zoneId ? pkg.zoneId.name : '',createdAt:pkg.createdAt })
                        }
                    }
                }))
                
                if(type){
                        if(type == "postbox"){
                            postBox = [];
                        }
                        if(type == "noDocs"){
                            noDocs = [];
                        }
                        if(type == "nineToPackages"){
                            nineToPackages = [];
                        }

                    let packages = await Package.find(searchDataType).populate(["awbId", "customerId", "zoneId"])
                   
                    let resultType = await Promise.all(packages.map(async(pkg) => {
                        let statuses = await PackageStatus.find({ packageId: pkg._id }) || [];
                        if (statuses.length > 0) {
                            let packageStatus = statuses[statuses.length - 1];
                            if (pkg.customerId && pkg.customerId.pmb != "9000" && type=="postbox" ) {
                                postBox.push({ _id: pkg.id, last_status: packageStatus.status, awb: "AWB" + pkg.awbId.awbId, customer_email: pkg.customerId ? pkg.customerId.email : '', zone: pkg.zoneId ? pkg.zoneId.name : '',createdAt:pkg.createdAt })
                            }
                            if (pkg.awbId && pkg.awbId.invoices && pkg.awbId.invoices.length == 0 &&  type=="noDocs") {
                                noDocs.push({ _id: pkg.id, last_status: packageStatus.status, awb: "AWB" + pkg.awbId.awbId, customer_email: pkg.customerId ? pkg.customerId.email : '', zone: pkg.zoneId ? pkg.zoneId.name : '',createdAt:pkg.createdAt })
                            }
    
                            if (pkg.customerId && pkg.customerId.pmb == "9000" && type == "nineToPackages") {
                                nineToPackages.push({ _id: pkg.id, last_status: packageStatus.status, awb: "AWB" + pkg.awbId.awbId, customer_email: pkg.customerId ? pkg.customerId.email : '', zone: pkg.zoneId ? pkg.zoneId.name : '',createdAt:pkg.createdAt })
                            }
                        }
                    }))
                }
                
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

                const packages = await Package.find(dbQuery).populate("awbId").populate("customerId").populate("zoneId");

                let result = await Promise.all(packages.map(async(pkg) => {
                    let statuses = await PackageStatus.find({ packageId: pkg._id }) || [];
                    let packageStatus = statuses[statuses.length - 1];
                    packageStatus = packageStatus ? packageStatus : {status:''}
                    if (pkg.customerId && pkg.awbId.invoices.length == 0 && query.filter_for === "noDocs" && (query.package_status === packageStatus.status || query.package_status === "all")) {
                        noDocs.push({ _id: pkg.id, last_status: packageStatus.status, awb: pkg.awbId.awbId, customer_email: pkg.customerId.email, zone: pkg.zoneId ? pkg.zoneId.name : '', createdAt:pkg.createdAt })
                    }
                    if (pkg.customerId && pkg.customerId.pmb == 9000 && query.filter_for === "9to5" && (query.package_status === packageStatus.status || query.package_status === "all")) {
                        nineToPackages.push({ _id: pkg.id, last_status: packageStatus.status, awb: pkg.awbId.awbId, customer_email: pkg.customerId.email, zone: pkg.zoneId ? pkg.zoneId.name : '', createdAt:pkg.createdAt })
                    }

                    if (pkg.customerId && pkg.customerId.pmb != 9000 && query.filter_for === "postBox" && (query.package_status === packageStatus.status || query.package_status === "all")) {
                        postBox.push({ _id: pkg.id, last_status: packageStatus.status, awb: pkg.awbId.awbId, customer_email: pkg.customerId ? pkg.customerId.email : '',zone: pkg.zoneId ? pkg.zoneId.name : '',createdAt:pkg.createdAt })
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

   async getPackageWithFilterHistory(filter, query) {
    return new Promise(async(resolve, reject) => {
        var daterange = query.daterange?query.daterange:'';
        var type = query.type?query.type:'';
        
                var searchData = {};
                if(daterange && type){
                    var date_arr = daterange.split('-');
                    var startDate = (date_arr[0]).trim();      
                    var stdate = new Date(startDate);
                      stdate.setDate(stdate.getDate() );
              
                    var endDate = (date_arr[1]).trim();
                    var endate = new Date(endDate);
                      endate.setDate(endate.getDate() +1);  
                      
                    stdate = new Date(stdate.setUTCHours(0,0,0,0));
                   // stdate = stdate.toISOString();
                    endate = new Date(endate.setUTCHours(23,59,59,0));
                    //endate = endate.toISOString(); 
                        
                    var searchDataType = {createdAt: {"$gte":stdate, "$lte": endate}}; 
                }

                var endate = new Date();      
                endate.setDate(endate.getDate());
                var stdate = new Date();
                stdate.setDate(stdate.getDate() - parseInt(0));
                
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
               // stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                //endate = endate.toISOString();                        
                searchData.createdAt = {"$gte":stdate, "$lte": endate};
            if (filter === 'all') {
                if(type == "noDocs"){           
                    var noDocs = await this.getNodocsPackage(searchDataType);
                }else{
                    var noDocs = await this.getNodocsPackage(searchData);
                }
                if(type == "postbox"){
                    var postBox = await this.getPostboxPackages(searchDataType);
                }else{
                    var postBox = await this.getPostboxPackages(searchData);
                }

                if(type == "nineToPackages"){
                    var nineToPackages = await this.getNineToPackages(searchDataType);
                }else{
                    var nineToPackages = await this.getNineToPackages(searchData);
                }
                
                resolve({ nineToPackages, postBox, noDocs });
            }else{
                let dbQuery = {};
                if (query.users && query.users != "all") {
                    dbQuery['createdBy'] = ObjectId(query.users);
                }
                if(query.package_status && query.package_status!='all'){
                    dbQuery['lastStatusText'] = query.package_status;
                }

                if (query.filter_for === "noDocs") {
                    var noDocs = await this.getNodocsPackage(dbQuery);
                    resolve({ noDocs })
                } else if (query.filter_for === "9to5") {
                    var nineToPackages = await this.getNineToPackages(dbQuery);
                    resolve({ nineToPackages })
                } else if (query.filter_for === "postBox") {
                    var postBox = await this.getPostboxPackages(dbQuery);
                    resolve({ postBox })
                }
            }
        })            
    }

    async getNodocsPackage(searchData){
        return new Promise((resolve, reject) => {
            searchData.customerId ={$ne:null};
            Package.aggregate([
                {$match:searchData},                              
                {
                    $lookup:{
                        from:"awbs",
                        localField:"awbId",
                        foreignField:"_id",
                        as:"awbId"
                    }
                },
                {$unwind:"$awbId"},
                {$match:{"awbId.invoices":{$gt:[]}}},
                {
                    $project:{
                        barcode:1,
                        lastStatusText:1,
                        awb: { $concat: [ "AWB", "", "$awbIdString" ] },
                        customerFullName: 1,
                        storeLocation:{ $ifNull: [ "$storeLocation", "-" ]},
                        createdAt:1    
                }
            }

            ]).exec((err, result)=>{
                if (err) {
                    resolve([])
                } else {
                    resolve(result)
                }
            });
        })
    }

    async getNineToPackages(searchData){
        searchData.pmb = 9000
       console.log(searchData)
        return new Promise((resolve, reject) => {
            Package.aggregate([
                {$match:searchData},
                {
                    $project:{
                        barcode:1,
                        lastStatusText:1,
                        awb: { $concat: [ "AWB", "", "$awbIdString" ] },
                        customerFullName: 1,
                        storeLocation:{ $ifNull: [ "$storeLocation", "-" ]},
                        createdAt:1  
                    }  
                }

             ]).exec((err, result)=>{
                if (err) {
                    resolve([])
                } else {
                    resolve(result)
                }
            })
        })
    }
    async getPostboxPackages(searchData){
        searchData.pmb = {$ne:9000}
        return new Promise((resolve, reject) => {
            Package.aggregate([
                {$match:searchData},                
               {
                   $project:{
                        barcode:1,
                        lastStatusText:1,
                        awb: { $concat: [ "AWB", "", "$awbIdString" ] },
                        customerFullName: 1,
                        storeLocation:{ $ifNull: [ "$storeLocation", "-" ]},
                        createdAt:1 
                   }  
               }

            ]).exec((err, result)=>{
                if (err) {
                    resolve([])
                } else {
                    resolve(result)
                }
            })
        })
    }


    async getPackageStatusByPackgeId(id, status) {
        return new Promise((resolve, reject) => {
            PackageStatus.findOne({ packageId: id, status: PKG_STATUS[status] }, (err, result) => {
                if (err) {
                    resolve({ success: false, message: strings.string_response_error })
                } else {
                    resolve(result)
                }
            })
        })
    }

    async checkPackageStatus(awb){
        let flag = 0,status = "Mixed",index = 10
        for(let pkg of awb.packages){
            for(let pack of awb.packages){
                if(!pkg.lastStatusText){
                    break;
                }else{
                    status = pkg.lastStatusText
                }
                if(pkg.lastStatusText != pack.lastStatusText){
                    flag = 1
                    status = "Mixed"
                    break;
                }
            }
            if(flag == 1) break;
        }
        if(status == PKG_STATUS[0]) index = 0
        if(status == PKG_STATUS[1]) index = 1
        if(status == PKG_STATUS[2]) index = 2
        if(status == PKG_STATUS[3]) index = 3
        if(status == PKG_STATUS[4]) index = 4
        if(status == PKG_STATUS[5]) index = 5
        if(status == PKG_STATUS[6]) index = 6
        if(status == PKG_STATUS[7]) index = 7
        if(status == PKG_STATUS[8]){
            let cubePackage = (awb.packages && awb.packages[0] && awb.packages[0].cubeId && awb.packages[0].cubeId.cubepackageId) ? awb.packages[0].cubeId.cubepackageId : null
            if(cubePackage){
                let cubeStatuses = await PackageStatus.find({ packageId: cubePackage }).sort({ updatedAt: -1 })
                status = cubeStatuses[0].status
            }
            index = 8
        }
        if(status == PKG_STATUS[9]) index = 9
        
        return {status : status,id : index }
    }

    async getAllPackagesWithLastStatus() {
        let packages = await this.getAllPackages_updated();
        let awbArray = []
        return await Promise.all(
            packages.map(async(pkg) => {
                let status = await this.services.packageService.getPackageLastStatus(pkg._id);
                pkg.lastStatusText = status && status.status;
                if(pkg.lastStatusDate)
                    pkg.lastStatusDates  = momentz(pkg.lastStatusDate).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A')
                if (pkg.originBarcode) {
                    let barcode = await this.getOriginBarcode(pkg.originBarcode)
                    if (barcode !== null && barcode.createdAt) {
                        pkg.OrignalBarcodeDate = barcode.createdAt;
                    }
                    if(barcode !== null && (barcode.barcode == "No tracking" || barcode.barcode == "No Tracking")){
                        pkg.OrignalBarcodeDate = pkg.createdAt
                    }
                }
                if (pkg.awbId) {
                    let awb = await this.services.awbService.getAwb(pkg.awbId)
                    if (awb !== null && awb.createdAt) {
                        let flag = 0
                        awbArray.forEach(data=>{
                            if(data.awbId == awb.awbId){
                                data.pkgNo++
                                flag = 1
                                pkg.pieceNo = data.pkgNo 
                            }
                        })
                        if(flag == 0){
                            awbArray.push({awbId : awb.awbId,pkgNo : 1})
                            pkg.pieceNo = 1
                        }
                        pkg.awbCreatedAt = momentz(awb.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');
                    }
                }
                if (pkg.manifestId) {
                    let actualFlight = await Manifest.findById(pkg.manifestId).populate('planeId')
                    if (actualFlight !== null && actualFlight.planeId) {
                        pkg.manifestId = actualFlight._id
                        pkg.actualFlight = actualFlight.planeId ? actualFlight.planeId.tailNumber : ''
                    }
                }
                pkg.OrignalBarcodeDate = pkg.OrignalBarcodeDate || ''
                pkg.awbCreatedAt = pkg.awbCreatedAt || ''
                pkg.actualFlight = pkg.actualFlight || ''
                return pkg;
            }),
        );
    }
    async getAwbNoDocsAllPackagesWithLastStatus(req) {
        let packages = await this.getAllPackagesUpdated(req);
        let awbArray = []
        return await Promise.all(
            packages.map(async(pkg) => {
                let status = await this.services.packageService.getPackageLastStatus(pkg._id);
                pkg.lastStatusText = status && status.status;
                if(pkg.lastStatusDate)
                    pkg.lastStatusDates  = momentz(pkg.lastStatusDate).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A')
                if (pkg.originBarcode) {
                    let barcode = await this.getOriginBarcode(pkg.originBarcode)
                    if (barcode !== null && barcode.createdAt) {
                        pkg.OrignalBarcodeDate = barcode.createdAt;
                    }
                }
                pkg.cubeName = ''
                let cubePackage = await Cube.findOne({cubepackageId : pkg._id})
                if(cubePackage){
                    pkg.cubeName = cubePackage.name
                }
                if (pkg.awbId) {
                    let awb = await this.services.awbService.getAwb(pkg.awbId)
                    if (awb !== null && awb.createdAt) {
                        let flag = 0
                        awbArray.forEach(data=>{
                            if(data.awbId == awb.awbId){
                                data.pkgNo++
                                flag = 1
                                pkg.pieceNo = data.pkgNo 
                            }
                        })
                        if(flag == 0){
                            awbArray.push({awbId : awb.awbId,pkgNo : 1})
                            pkg.pieceNo = 1
                        }
                        pkg.awbCreatedAt = momentz(awb.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');
                    }
                }
                if (pkg.manifestId) {
                    let actualFlight = await Manifest.findById(pkg.manifestId).populate('planeId')
                    if (actualFlight !== null && actualFlight.planeId) {
                        pkg.manifestId = actualFlight._id
                        pkg.actualFlight = actualFlight.planeId ? actualFlight.planeId.tailNumber : ''
                    }
                }
                pkg.OrignalBarcodeDate = pkg.OrignalBarcodeDate || ''
                pkg.awbCreatedAt = pkg.awbCreatedAt || ''
                pkg.actualFlight = pkg.actualFlight || ''
                return pkg;
            }),
        );
    }

    getPackageDetail(id){
        return new Promise((resolve, reject) => {
            Package.find({_id:id})
            .populate({path : 'awbId',populate : 'driver'})
            .populate('originBarcode')
            .populate('customerId')
            .populate('zoneId')
            .populate('shipperId')
            .populate('carrierId')
            .populate('cubeId')
            .populate('manifestId')
            .exec((err, result) => {
                if (err) {
                    resolve([]);
                } else {                   
                    resolve(result);
                }
            }); 
        }) 
    }

    async getAwbSnapshotPackageWithLastStatus(req) {
        let packages = await this.getAllSnapshotPackagesUpdated(req,{_id : req.params.id});
        let awbArray = []
        console.log("packa",packages.length)
        return await Promise.all(
            packages.map(async(pkg) => {
                let status = await this.services.packageService.getPackageLastStatus(pkg._id);
                pkg.lastStatusText = status && status.status;
                if(pkg.lastStatusDate)
                    pkg.lastStatusDates  = momentz(pkg.lastStatusDate).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A')
                if (pkg.originBarcode) {
                    let barcode = await this.getOriginBarcode(pkg.originBarcode)
                    if (barcode !== null && barcode.createdAt) {
                        pkg.OrignalBarcodeDate = barcode.createdAt;
                    }
                }
                pkg.cubeName = ''
                let cubePackage = await Cube.findOne({cubepackageId : pkg._id})
                if(cubePackage){
                    pkg.cubeName = cubePackage.name
                }
                if (pkg.awbId) {
                    let awb = await this.services.awbService.getAwb(pkg.awbId)
                    if (awb !== null && awb.createdAt) {
                        let flag = 0
                        awbArray.forEach(data=>{
                            if(data.awbId == awb.awbId){
                                data.pkgNo++
                                flag = 1
                                pkg.pieceNo = data.pkgNo 
                            }
                        })
                        if(flag == 0){
                            awbArray.push({awbId : awb.awbId,pkgNo : 1})
                            pkg.pieceNo = 1
                        }
                        pkg.awbCreatedAt = momentz(awb.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');
                    }
                }
                // if (pkg.manifestId) {
                //     let actualFlight = await Manifest.findById(pkg.manifestId).populate('planeId')
                //     if (actualFlight !== null && actualFlight.planeId) {
                //         pkg.manifestId = actualFlight._id
                //         pkg.actualFlight = actualFlight.planeId ? actualFlight.planeId.tailNumber : ''
                //     }
                // }
                pkg.OrignalBarcodeDate = pkg.OrignalBarcodeDate || ''
                pkg.awbCreatedAt = pkg.awbCreatedAt || ''
                pkg.actualFlight = pkg.actualFlight || ''
                return pkg;
            }),
        );
    }

    async managePackagesData(packages) {
        let awbArray = []
        return await Promise.all(
            packages.map(async(pkg) => {
                let status = await this.services.packageService.getPackageLastStatus(pkg._id);
                pkg.lastStatusText = status && status.status;
                if(pkg.lastStatusDate)
                    pkg.lastStatusDates  = momentz(pkg.lastStatusDate).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A')
                if (pkg.barcode ) {
                    let barcode = await this.getOriginBarcode(pkg.barcode)
                    if (barcode !== null && barcode.createdAt) {
                        pkg.OrignalBarcodeDate = barcode.createdAt;
                    }
                    if(barcode !== null && (barcode.barcode == "No tracking" || barcode.barcode == "No Tracking")){
                        pkg.OrignalBarcodeDate = pkg.createdAt
                    }
                }
                if (pkg.awbId) {
                    var awb =  pkg.awb ? pkg.awb : {};
                    if (awb !== null && awb.createdAt) {
                        let flag = 0
                        awbArray.forEach(data=>{
                            if(data.awbId == awb.awbId){
                                data.pkgNo++
                                flag = 1
                                pkg.pieceNo = data.pkgNo 
                            }
                        })
                        if(flag == 0){
                            awbArray.push({awbId : awb.awbId,pkgNo : 1})
                            pkg.pieceNo = 1
                        }
                        pkg.awbCreatedAt = momentz(awb.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');
                    }
                }
                if (pkg.manifestId) {
                    let actualFlight = await Manifest.findById(pkg.manifestId).populate('planeId')
                    if (actualFlight !== null && actualFlight.planeId) {
                        pkg.manifestId = actualFlight._id
                        pkg.actualFlight = actualFlight.planeId ? actualFlight.planeId.tailNumber : ''
                    }
                }
                pkg.OrignalBarcodeDate = pkg.OrignalBarcodeDate || ''
                pkg.awbCreatedAt = pkg.awbCreatedAt || ''
                pkg.actualFlight = pkg.actualFlight || ''
                return pkg;
            }),
        );
    }

    async getFllPackageWithLastStatus(req){
        return new Promise(async (resolve, reject) => {
            var start = req.body.start ? parseInt(req.body.start) : 0;
            var length = req.body.length ? parseInt(req.body.length) : 10;      
            var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
            var columns = {
                0: 'customer.firstName',
                1: 'createdAt',
                2: 'barcode.barcode',
                3: 'description',
                4: 'customer.pmb',
                5: 'packageType',
                12: 'awb.awbId'
            } 
            
            var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
            var sort = (dir=='asc') ? 1 : -1;
            var sortField = columns[field];

            var search = req.body['search[value]'] ? req.body['search[value]'] : ''; 
            var searchData = {};
            if(req.params.filter && req.params.filter == "in-manifest"){
                searchData.manifestId = {$ne: null}
            }
            if(req.params.filter && req.params.filter == "in-pmb9000"){
                searchData.manifestId = {$ne: null};
                searchData.customerId = {$ne: null};
                searchData.awbId = {$ne: null};
                searchData.pmb = 9000;
            }
            if(req.params.filter && req.params.filter == "not-pmb9000"){
                searchData.manifestId = {$ne: null};
                searchData.customerId = {$ne: null};
                searchData.awbId = {$ne: null};
                searchData.pmb = {$ne: 9000};
            }
            
            //date range
            var daterange = req.body.daterange?req.body.daterange:'';
            if(daterange){
                var date_arr = daterange.split('-');
                var startDate = (date_arr[0]).trim();      
                var stdate = new Date(startDate);
                stdate.setDate(stdate.getDate() +1);

                var endDate = (date_arr[1]).trim();
                var endate = new Date(endDate);
                endate.setDate(endate.getDate() +1);   
                
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                   
                searchData.createdAt = {"$gte":stdate, "$lte": endate};
            }

            if(!req.body.daterange && !req.body.clear){
                var endate = new Date();      
                endate.setDate(endate.getDate());
                var stdate = new Date();
                stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table));   
                
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                    
                searchData.createdAt = {"$gte":stdate, "$lte": endate};
            
            }

            if(search){
                searchData.$or = [          
                    {"customer.firstName":{'$regex' : search, '$options' : 'i'}},
                    {"customer.lastName":{'$regex' : search, '$options' : 'i'}},
                    {"awb.awbId":search},
                    {"barcode.barcode":{'$regex' : search, '$options' : 'i'}},
                    {"description":{'$regex' : search, '$options' : 'i'}},
                    {"zone.name":{'$regex' : search, '$options' : 'i'}},
                ]
            }
           
            console.log(searchData);
            var pipeLineAggregate = [
                {
                    $lookup:{
                        from: "awbs",
                        localField: "awbId",
                        foreignField: "_id",
                        as: "awb"
                    }
                },
                {
                    $unwind: "$awb"
                },
                {
                    $lookup:{
                        from: "barcodes",
                        localField: "originBarcode",
                        foreignField: "_id",
                        as: "barcode"
                    }
                },                
                {
                    $unwind: "$barcode"
                },
                {
                    $lookup:{
                        from: "customers",
                        localField: "customerId",
                        foreignField: "_id",
                        as: "customer"
                    }
                },
                {$unwind: "$customer"},
                {
                    $lookup:{
                        from: "zones",
                        localField: "zoneId",
                        foreignField: "_id",
                        as: "zone"
                    }
                },
                {
                    $addFields:{
                        pmb:"$customer.pmb"
                    }
                },
                {
                    $match: searchData
                }
            ]
            var totalRecords = await Package.aggregate([
                ...pipeLineAggregate,
                ...[{$count:"total"}]
            ]);
            
            if(totalRecords && totalRecords.length && totalRecords[0].total){
                Package.aggregate([
                    ...pipeLineAggregate,
                    ...[
                        {$sort:{[sortField]: sort}},
                        {$skip: start},
                        {$limit: length}
                    ]
                ]).exec((err, result) => {
                    if(err){
                        resolve({total: 0, packages:[]})
                    }else{
                        console.log(result)
                        resolve({total: totalRecords[0].total, packages:result})
                    }
                })
            }else{
                resolve({total: 0, packages:[]})
            }
        }) 
    }

    async getAllFullPackagesWithLastStatus(req) {
        return new Promise(async (resolve, reject) => {
            var start = req.body.start ? parseInt(req.body.start) : 0;
            var length = req.body.length ? parseInt(req.body.length) : 10;      
            var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
            var columns = {0:'barcode.createdAt', 1: 'createdAt', 2: 'location.name'} 
            
            var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
            var sort = (dir=='asc') ? 1 : -1;
            var sortField = columns[field];

            var search = req.body['search[value]'] ? req.body['search[value]'] : ''; 
            var searchData = {};
            if(req.params.filter && req.params.filter == "in-manifest"){
                searchData.manifestId = {$ne: null}
            }
            //date range
            var daterange = req.body.daterange?req.body.daterange:'';
            if(daterange){
            var date_arr = daterange.split('-');
            var startDate = (date_arr[0]).trim();      
            var stdate = new Date(startDate);
            stdate.setDate(stdate.getDate() +1);

            var endDate = (date_arr[1]).trim();
            var endate = new Date(endDate);
            endate.setDate(endate.getDate() +1); 
            
            stdate = new Date(stdate.setUTCHours(0,0,0,0));
            stdate = stdate.toISOString();
            endate = new Date(endate.setUTCHours(23,59,59,0));
            endate = endate.toISOString(); 
                 
            searchData.barcodeDate = {"$gte":stdate, "$lte": endate}
            }

            if(!req.body.daterange && !req.body.clear){
            var endate = new Date();      
            endate.setDate(endate.getDate());
            var stdate = new Date();
            stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table));      
            //searchData.createdAt = {"$gte":stdate, "$lte": endate};

            stdate = new Date(stdate.setUTCHours(0,0,0,0));
            stdate = stdate.toISOString();
            endate = new Date(endate.setUTCHours(23,59,59,0));
            endate = endate.toISOString(); 
             
            searchData.barcodeDate =  {"$gte":stdate, "$lte": endate};
            }

            if(search){
                searchData.$or = [          
                    {"customer.firstName":{'$regex' : search, '$options' : 'i'}},
                    {"awb.awbId":search},
                    {"barcode.barcode":{'$regex' : search, '$options' : 'i'}},
                    {"description":{'$regex' : search, '$options' : 'i'}},
                    {"zone.name":{'$regex' : search, '$options' : 'i'}},
                ]
            }
           
            
            var pipeLineAggregate = [
                {
                    $lookup:{
                        from: "awbs",
                        localField: "awbId",
                        foreignField: "_id",
                        as: "awb"
                    }
                },
                {
                    $unwind: "$awb"
                },
                {
                    $lookup:{
                        from: "barcodes",
                        localField: "originBarcode",
                        foreignField: "_id",
                        as: "barcode"
                    }
                },                
                {
                    $unwind: "$barcode"
                },
                {
                    $lookup:{
                        from: "customers",
                        localField: "customerId",
                        foreignField: "_id",
                        as: "customer"
                    }
                },
                {
                    $lookup:{
                        from: "zones",
                        localField: "zoneId",
                        foreignField: "_id",
                        as: "zone"
                    }
                },
                {
                    $addFields:{barcodeDate:"$barcode.createdAt"}
                },
                {
                    $match: searchData
                }
            ]
            var totalRecords = await Package.aggregate([
                ...pipeLineAggregate,
                ...[{$count:"total"}]
            ]);
            
            if(totalRecords && totalRecords.length && totalRecords[0].total){
                Package.aggregate([
                    ...pipeLineAggregate,
                    ...[
                        {$sort:{[sortField]: sort}},
                        {$skip: start},
                        {$limit: length}
                    ]
                ]).exec((err, result) => {
                    if(err){
                        resolve({total: 0, packages:[]})
                    }else{
                        resolve({total: totalRecords[0].total, packages:result})
                    }
                })
            }else{
                resolve({total: 0, packages:[]})
            }
        })
    }

    addOriginBarcode(originBarcode) {
        if(originBarcode.barcode){
            originBarcode.barcode = originBarcode.barcode.trim()
        }
        return new Promise(async(resolve, reject) => {
            await Barcode.findOne(originBarcode, (err, res) => {
                if (res === null || res === undefined) {
                    console.log(originBarcode);
                    const barcode = new Barcode({barcode: originBarcode.barcode.trim()});
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
    getOriginalBarcodeByCodeWildCard(barcode) {
        return new Promise((resolve, reject) => {
            Barcode.find({ barcode: { $regex: barcode, $options: 'i'} }, (err, result) => {
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
            Barcode.find({status : "unused"}, (err, barCodes) => {
                if (err) {
                    resolve([]);
                } else {
                    resolve(barCodes);
                }
            })
        })
    }
    getAllOriginBarcodes() {
        return new Promise((resolve, reject) => {
            Barcode.find({}, (err, barCodes) => {
                if (err) {
                    resolve([]);
                } else {
                    resolve(barCodes);
                }
            })
        })
    }
    removeAllOriginBarcode() {
        return new Promise((resolve, reject) => {
            Barcode.deleteMany({}, (err, result) => {
                if (err || result == null) resolve([]);
                else resolve(result);
            })
        });
    }

    getPackage(packageId) {
        return new Promise((resolve, reject) => {
            Package.find({ id: packageId },async (err, pkg) => {
                if (err || pkg == null) {
                    resolve({}) 
                }
                else{
                    if(pkg[0]){
                        pkg[0] = pkg[0].toJSON()
                        let zoned = await Zone.findById(pkg[0].zoneId)
                        if(zoned && zoned.name){
                            pkg[0].zoneValue = zoned.name
                        }
                    }
                    resolve(pkg);
                } 
            });
        });
    }

    getPackageById(packageId) {
        return new Promise((resolve, reject) => {
            Package.findById(packageId,async (err, pkg) => {
                if (err || pkg == null) {
                    resolve({}) 
                }
                else{
                    if(pkg){
                        pkg = pkg.toJSON()
                        let zoned = await Zone.findById(pkg.zoneId)
                        if(zoned && zoned.name){
                            pkg.zoneValue = zoned.name
                        }
                    }
                    resolve(pkg);
                } 
            });
        });
    }

    getPackageHistoryById(packageId) {
        return new Promise((resolve, reject) => {
            PackageHistory.findById(packageId)
            .populate('originBarcode')
            .exec(async (err, pkg) => {
                if (err || pkg == null) {
                    resolve({}) 
                }
                else{
                    if(pkg){
                        pkg = pkg.toJSON()
                        let zoned = await Zone.findById(pkg.zoneId)
                        if(zoned && zoned.name){
                            pkg.zoneValue = zoned.name
                        }
                    }
                    resolve(pkg);
                } 
            });
        })
    }

    // getPackagesByObject(object) {
    //     return new Promise((resolve, reject) => {
    //         Package.find(object,async (err, pkgs) => {
    //             if (err || pkgs == null) {
    //                 resolve([]) 
    //             }
    //             else{
    //                 resolve(pkgs);
    //             } 
    //         });
    //     });
    // }

    async getAWBPackagesWithLastStatus_updated(awbId) {
        const packages = await this.getPackages_updated(awbId);
        await Promise.all(
            packages.map(async(pkg) => {
                let status = await this.getPackageLastStatus_updated(pkg._id);
                pkg.lastStatusText = status && status.status;
            }),
        );

        return packages;
    }

    getPackages_updated(awbId) {
        return new Promise(async (resolve, reject) => {
            let pkgResult = await Package.find({ awbId: awbId },null, {sort: {trackingNo: 1}}).read("primary")
            let modelCheck = Package
            if(pkgResult == null || pkgResult.length == 0)
                modelCheck = PackageHistory
                
            modelCheck.find({ awbId: awbId },null, {sort: {trackingNo: 1}}).read("primary").exec((err, result) => {
                if (err) {
                    resolve([]);
                } else {
                    resolve(result);
                }
            });
        });
    }

    getPackagesByObject(object) {
        return new Promise((resolve, reject) => {
            Package.find(object, (err, result) => {
                if (err) {
                    resolve([]);
                } else {
                    resolve(result);
                }
            });
        });
    }

    getPackagesHistoryByObject(object){
        return new Promise((resolve, reject) => {
            PackageHistory.find(object, (err, result) => {
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
        });
    }

    getPackagesHistory(awbId) {
        return new Promise((resolve, reject) => {
            PackageHistory.find({ _id: awbId }, (err, response) => {
                if (err || response == null) resolve([])
                else { resolve(response) }
            })
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
        return new Promise(async (resolve, reject) => {
            newPackage.awbId = awbId;
            newPackage.id = newPackage.id?newPackage.id:Date.now().toString();
            newPackage.trackingNo = uniqId();
            // Here as per the frontend logic, we're getting the 
            // values like 43322211,398749844904894
            const obarCode = newPackage.originBarcode.split(',');
            if (obarCode.length > 1) {
                newPackage.originBarcode = newPackage.originBarcode.split(',')[1];
            }
            let statusObject = {status : "used"}
            let checkBarcode = await Barcode.findById(newPackage.originBarcode)
            if(checkBarcode && checkBarcode.barcode == "No tracking"){
                statusObject = {status : "unused"}
            }
            await Barcode.updateOne({_id : newPackage.originBarcode},statusObject)
            newPackage.masterDescription = newPackage.description
            newPackage.masterWeight =  newPackage.weight
            newPackage.masterDimensions = newPackage.dimensions

            const newPackageData = new Package(newPackage);
            newPackageData.save(async (err, result) => {
                if (err) {
                    console.log(err);
                    resolve({ success: false, message: strings.string_response_error });
                } else {
                    let resp = result.toJSON()
                    newPackage['_id'] = resp._id
                    const newPackageHistoryData = new PackageHistory(resp);
                    await newPackageHistoryData.save()
                    this.removeProcessPackage(newPackage.originBarcode, newPackage.createdBy)
                    this.updatePackageStatus(result['_id'], 1, newPackage.createdBy)
                    resolve({ success: true });
                }
            });
        });
    }
    async updatePackageOtherDetail(packageId){
        return new Promise(async(resolve, reject) => {
            let pkgResult = await Package.findById(packageId).read("primary")
            let modelCheck = Package
            if(pkgResult == null)
                modelCheck = PackageHistory
            modelCheck.findById(packageId)
                .read("primary")
                .populate('awbId')
                .populate('customerId')
                .populate('shipperId')
                .populate('originBarcode')
                .populate('zoneId')
                .populate('carrierId')
                .exec(async (err, result) => {
                    if(err){
                        console.log(err)
                        resolve({ success: false, message: strings.string_response_error });
                    }else{

                        var updateData =  {
                            awbIdNumber:result.awbId.awbId,
                            awbIdString:result.awbId.awbId                        
                        }
                        if(result && result.zoneId && result.zoneId.name){
                            updateData.zoneName = result.zoneId.name;
                        }
                        if(result && result.carrierId && result.carrierId.name){
                            updateData.carrierName = result.carrierId.name;
                        }
                        if(result.originBarcode && result.originBarcode.barcode){
                            updateData.barcode = result.originBarcode.barcode;
                        }
                        if(result.customerId){
                            var customer = result.customerId
                            updateData.customerFirstName = customer.firstName;
                            updateData.customerLastName = customer.lastName;
                            updateData.customerFullName = customer.firstName + (customer.lastName?' '+ customer.lastName: '');  
                            
                            if(customer && customer.pmb){
                                updateData.pmb = customer.pmb;
                                updateData.pmbString = customer.pmb;
                                var pmb =  customer.pmb;
                                if((pmb > 0 && pmb <= 1999) || (pmb >= 4000 && pmb <= 4999)) {
                                    updateData.storeLocation = 'CABLEBEACH';
                                }
                                else if((pmb >= 3000 && pmb <= 3999)){
                                    updateData. storeLocation = 'ALBANY';
                                }else{
                                    updateData. storeLocation = '';
                                }                                                                           
                            }
                        }
                        if(result.shipperId && result.shipperId.name){
                            updateData.shipperName = result.shipperId.name;
                        }
                        var update = await Package.updateOne({_id:packageId}, updateData);
                        var updatePackageHistory = await PackageHistory.updateOne({_id:packageId}, updateData);
                        resolve(update);
                    }
                })
            })
    }


    async removeProcessPackage(barcode, userId) {
        return await ProcessPackage.deleteOne({ barcode: barcode, userId });
    }

    updatePackage(id, pkg) {
        return new Promise((resolve, reject) => {
            Package.updateOne({ _id: id }, pkg,async (err, result) => {
                if (err) resolve({ success: false, message: strings.string_response_error });
                else{
                    await PackageHistory.updateOne({ _id: id }, pkg)
                    resolve({ success: true });
                } 

            })

        });
    }

    updatePackage_updated(id, pkg) {
        return new Promise(async(resolve, reject) => {
            Package.findOneAndUpdate({ _id: id }, pkg, async (err, result) => {
                if (err) {
                    resolve({ success: false, message: strings.string_response_error });
                } else {
                    await PackageHistory.findOneAndUpdate({ _id: id }, pkg)
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

    removePackage_updated(id) {
        return new Promise((resolve, reject) => {
            Package.deleteOne({ _id: id },async (err, result) => {
                if (err) {
                    resolve({ success: false, message: strings.string_response_error });
                } else {
                    await PackageHistory.deleteOne({_id: id})
                    resolve(result);
                }
            });
        });
    }

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

    getPackagesInFll_updated(req) {
        return new Promise((resolve, reject) => {
            this.getAllPackagesUpdated(req).then((packages) => {
                Promise.all(
                    packages.map((pkg) => {
                        if(pkg.customerId) {
                            pkg['customer'] = {
                                'name' : pkg.customerId.firstName + ' ' + (pkg.customerId.lastName || '')
                            }
                        }
                        if (pkg.originBarcode) {
                            pkg.originBarcode = this.getOriginBarcode(pkg.originBarcode)
                        }
                        return this.getPackageLastStatus_updated(pkg._id);
                    }),
                ).then(async (stats) => {
                    let pkgs = [];
                    // stats.forEach(async(status, i) => {
                    for(let i=0;i<stats.length;i++){
                        packages[i].cubeName = ''
                        let cubePackage = await Cube.findOne({cubepackageId : packages[i]._id})
                        if(cubePackage){
                            packages[i].cubeName = cubePackage.name
                        }
                        packages[i].lastStatusText = stats[i].status;
                        if (stats[i].status == PKG_STATUS[1] || stats[i].status == PKG_STATUS[2])
                            pkgs.push(packages[i]);
                    };
                    resolve(pkgs);
                });
            });
        });
    }

    getPackagesAllInFll_updated(req){
        return new Promise(async (resolve, reject) => {
             var start = req.body.start ? parseInt(req.body.start) : 0;
            var length = req.body.length ? parseInt(req.body.length) : 10;      
            var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
            var columns = {
                0: 'customer.firstName',
                1: 'createdAt',
                2: 'barcode.barcode',
                3: 'description',
                4: 'customer.pmb',
                5: 'packageType',
                6: 'aging',
                10: "statusData.status",
                11: 'awb.awbId'
            } 

             var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
            var sort = (dir=='asc') ? 1 : -1;
            var sortField = columns[field];

             var search = req.body['search[value]'] ? req.body['search[value]'] : ''; 
            var searchData = {};

             //date range
            var daterange = req.body.daterange?req.body.daterange:'';
            if(daterange){
            var date_arr = daterange.split('-');
            var startDate = (date_arr[0]).trim();      
            var stdate = new Date(startDate);
            stdate.setDate(stdate.getDate() +1);

             var endDate = (date_arr[1]).trim();
            var endate = new Date(endDate);
            endate.setDate(endate.getDate() +1);  
            
            stdate = new Date(stdate.setUTCHours(0,0,0,0));
            stdate = stdate.toISOString();
            endate = new Date(endate.setUTCHours(23,59,59,0));
            endate = endate.toISOString(); 
                
            searchData.createdAt = {"$gte":stdate, "$lte": endate}
            }

             if(!req.body.daterange && !req.body.clear){
            var endate = new Date();      
            endate.setDate(endate.getDate());
            var stdate = new Date();
            stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table));      
            //searchData.createdAt = {"$gte":stdate, "$lte": endate};

            stdate = new Date(stdate.setUTCHours(0,0,0,0));
            stdate = stdate.toISOString();
            endate = new Date(endate.setUTCHours(23,59,59,0));
            endate = endate.toISOString(); 
             
            searchData.createdAt =  {"$gte":stdate, "$lte": endate};
            }

             if(search){
                searchData.$or = [          
                    {"customer.firstName":{'$regex' : search, '$options' : 'i'}},
                    {"customer.pmb":{'$regex' : search, '$options' : 'i'}},
                    {"awb.awbId":search},
                    {"barcode.barcode":{'$regex' : search, '$options' : 'i'}},
                    {"description":{'$regex' : search, '$options' : 'i'}},
                    {"zone.name":{'$regex' : search, '$options' : 'i'}},
                    {"packageType":{'$regex' : search, '$options' : 'i'}}
                ]
            }
            var pipeAggregate = [
                {
                    $lookup: {
                        from: "awbs",
                        localField: "awbId",
                        foreignField: "_id",
                        as: "awb"
                    }
                },
                {$unwind: "$awb"},
                {
                    $lookup: {
                        from: "barcodes",
                        localField: "originBarcode",
                        foreignField: "_id",
                        as: "barcode"
                    }
                },
                {$unwind: "$barcode"},
                {
                    $lookup: {
                        from: "customers",
                        localField: "customerId",
                        foreignField: "_id",
                        as: "customer"
                    }
                },
                {$unwind: "$customer"},
                {
                    $lookup: {
                        from: "zones",
                        localField: "zoneId",
                        foreignField: "_id",
                        as: "zone"
                    }
                },
                {
                    $lookup: {
                        from: "packagestatuses",
                        localField: "_id",
                        foreignField: "packageId",
                        as: "stats"
                    }
                },
                {
                    $addFields: {
                        statsData: { $arrayElemAt: [ "$stats", -1 ] }
                    }
                },
                {
                    $match :{
                        $or:[
                            {"statsData.status" : PKG_STATUS[1]},
                            {"statsData.status": PKG_STATUS[2]}
                        ]
                    }
                },
                {
                    $match:searchData
                }
            ];

             var totalRecords =  await Package.aggregate([
                ...pipeAggregate,
                ...[
                    {$count:"total"}
                ]
            ]);
            if(totalRecords && totalRecords.length && totalRecords[0]){
                Package.aggregate([
                    ...pipeAggregate,
                    ...[
                        {$sort:{[sortField]:sort}},
                        {$skip:start},
                        {$limit:length}
                    ]
                ]).exec((err, result) => {
                    if(err){
                        resolve({total: 0, packages: []});
                    }else{
                        resolve({total: totalRecords[0].total, packages: result})
                    }
                })
            }else{
                resolve({total: 0, packages: []}); 
            }

         })

     }

    getPackagesNoDocs() {
        return new Promise((resolve, reject) => {
            this.getAllPackagesNoDoc().then((packages) => {
                Promise.all(
                    packages.map( async(pkg)=>{
                        let awb =  await this.services.awbService.awbByCondition({_id : pkg.awbId._id, invoices: { $eq: [] }})
                        if(awb && awb._id) {
                            pkg['dateCreated'] = moment(pkg['createdAt']).format('MMM DD, YYYY');
                            return pkg;
                        } 
                    })
                ).then((data)=>{
                    data = data.filter(function( element ) {
                       return element !== undefined;
                    });
                    console.log(data)
                    resolve(data);
                })
            });
        });
    }

    getPackagesInNas_updated(req) {
        return new Promise((resolve, reject) => {
            this.getAllPackagesUpdated(req).then((packages) => {
                Promise.all(
                    packages.map((pkg) => {
                        return this.getPackageLastStatus_updated(pkg._id);
                    }),
                ).then(async(stats) => {                    
                    let pkgs = [];
                    // stats.forEach((status, i) => {
                        // packages[i].lastStatusText = status.status;
                        // if (status.status == PKG_STATUS[4] || status.status == 'Recieved in NAS')
                        //     pkgs.push(packages[i]);
                    // });

                    for(let i=0;i<stats.length;i++){
                        packages[i].cubeName = ''
                        let cubePackage = await Cube.findOne({cubepackageId : packages[i]._id})
                        if(cubePackage){
                            packages[i].cubeName = cubePackage.name
                        }
                        packages[i].lastStatusText = stats[i].status;
                        if (stats[i].status == PKG_STATUS[4] || stats[i].status == 'Recieved in NAS')
                            pkgs.push(packages[i]);

                    };

                    resolve(pkgs);
                });
            });
        });
    }

    getAllPackagesInNas_updated(req){
        return new Promise(async (resolve, reject) => {
            var start = req.body.start ? parseInt(req.body.start) : 0;
            var length = req.body.length ? parseInt(req.body.length) : 10;      
            var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
            var columns = {0:'barcode.createdAt', 1: 'createdAt', 2: 'location.name'} 
            
            var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
            var sort = (dir=='asc') ? 1 : -1;
            var sortField = columns[field];

            var search = req.body['search[value]'] ? req.body['search[value]'] : ''; 
            var searchData = {};

            //date range
            var daterange = req.body.daterange?req.body.daterange:'';
            if(daterange){
            var date_arr = daterange.split('-');
            var startDate = (date_arr[0]).trim();      
            var stdate = new Date(startDate);
            stdate.setDate(stdate.getDate() +1);

            var endDate = (date_arr[1]).trim();
            var endate = new Date(endDate);
            endate.setDate(endate.getDate() +1);    
            
            stdate = new Date(stdate.setUTCHours(0,0,0,0));
            stdate = stdate.toISOString();
            endate = new Date(endate.setUTCHours(23,59,59,0));
            endate = endate.toISOString(); 
              
            searchData.createdAt = {"$gte":stdate, "$lte": endate}
            }

            if(!req.body.daterange && !req.body.clear){
            var endate = new Date();      
            endate.setDate(endate.getDate());
            var stdate = new Date();
            stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table));      
            //searchData.createdAt = {"$gte":stdate, "$lte": endate};

            stdate = new Date(stdate.setUTCHours(0,0,0,0));
            stdate = stdate.toISOString();
            endate = new Date(endate.setUTCHours(23,59,59,0));
            endate = endate.toISOString(); 
             
            searchData.createdAt =  {"$gte":stdate, "$lte": endate};
            }

            if(search){
                searchData.$or = [          
                    {"customer.firstName":{'$regex' : search, '$options' : 'i'}},
                    {"customer.pmb":{'$regex' : search, '$options' : 'i'}},
                    {"awb.awbId":search},
                    {"barcode.barcode":{'$regex' : search, '$options' : 'i'}},
                    {"description":{'$regex' : search, '$options' : 'i'}},
                    {"zone.name":{'$regex' : search, '$options' : 'i'}},
                    {"packageType":{'$regex' : search, '$options' : 'i'}}
                ]
            }
           var pipeAggregate = [
               {
                   $lookup:{
                       from: "awbs",
                       localField: "awbId",
                       foreignField: "_id",
                       as:"awb"
                   }
               },
               {$unwind:"$awb"},
               {
                    $lookup:{
                        from: "barcodes",
                        localField: "originBarcode",
                        foreignField: "_id",
                        as:"barcode"
                    }
                },
                {$unwind:"$barcode"},
                {
                    $lookup:{
                        from: "customers",
                        localField: "customerId",
                        foreignField: "_id",
                        as:"customer"
                    }
                },
                {$unwind:"$customer"},
                {
                    $lookup:{
                        from: "zones",
                        localField: "zoneId",
                        foreignField: "_id",
                        as:"zone"
                    }
                },
                {
                    $lookup:{
                        from: "packagestatuses",
                        localField: "_id",
                        foreignField: "packageId",
                        as: "stats"
                    }
                },
                {
                    $addFields:{
                        statsData: { $arrayElemAt: [ "$stats", -1 ] } 
                    }
                },                
                {
                    $match :{
                        $or:[
                            {"statsData.status" : PKG_STATUS[4]},
                            {"statsData.status": "Recieved in NAS"}
                        ]
                    }
                },
                {
                    $match:searchData
                }
           ] 
           var totalRecords = await Package.aggregate([
            ...pipeAggregate,
            ...[{$count: "total"}]
           ]);
           if(totalRecords && totalRecords.length && totalRecords[0].total){
                var packages = await Package.aggregate([
                    ...pipeAggregate,
                    ...[
                        {$sort: {createdAt:1}},
                        {$skip: start},
                        {$limit: length}
                    ]
                ]).exec((err, result) => {
                    if (err){
                        resolve({total: 0, packages:[]});
                    }else {
                        resolve({total: totalRecords[0].total, packages: result});
                    }
                });
            }else{
                resolve({total: 0, packages:[]});
            }
           
        })

    }

    //========== Receive Packages From Truck that arrived at Airport ==========//

    getShipmentId() {
        return new Promise((resolve, reject) => {
            resolve(SHIPMENT_ID)
        });
    }

    getPackagesByObject(object) {
        return new Promise((resolve, reject) => {
            Package.find(object, (err, result) => {
                if (err) {
                    resolve([]);
                } else {
                    resolve(result);
                }
            });
        });
    }

    //========== Load Packages to AirCraft (Add to Manifest) ==========//
    addToFlight(packageIds, manifestId, compartmentId, userId) {
        return new Promise(async(resolve, reject) => {
            let packages = packageIds && packageIds.length && packageIds.split(',').filter(Boolean);

            if (!packages || packages.length === 0) {
                return resolve({ success: false, message: 'Please select packages.' });
            }
            let compartmentResult = await this.services.planeService.getCompartment(compartmentId)
            let compartmentPackages = await this.getPackagesByObject({manifestId : manifestId,compartmentId : compartmentId})
            let totalPkgWeight=0,totalCompWeight=0,flag = false;
            for(let pkg of packages){
                let pkgResult = await this.getPackageById(pkg)
                totalPkgWeight = totalPkgWeight + pkgResult.weight
                for(let comp of compartmentPackages){
                    if(String(comp._id) == String(pkg)){
                        flag = true
                    }
                }
            }
            if(flag == true){
                return resolve({ success: false, message: 'This package is already there in this compartment.' });
            }
            for(let comp of compartmentPackages){
                totalCompWeight = totalCompWeight + comp.weight
            }
            if(compartmentResult && compartmentResult.weight < totalCompWeight + totalPkgWeight){
                return resolve({ success: false, message: 'Overweight.' });
            }
            Promise.all(
                packages.map((packageId) => {
                    return Promise.all([
                        this.updatePackageStatus(packageId, 2, userId),
                        this.updatePackage_updated(packageId, {
                            manifestId: manifestId,
                            compartmentId: compartmentId,
                        }),
                    ]);
                }),
            ).then((results) => {
                resolve({ success: true, message: strings.string_response_loaded, status: PKG_STATUS[2] });
            });
        });
    }


    cloneManifestAndOriginal(manifestId) {
        return new Promise((resolve, reject) => {
            let original = []
            Manifest.findOne({ _id: manifestId })
                .populate({
                    path: 'clonePackages',
                    populate: [
                        { path: 'awbId' },
                        { path: 'compartmentId' },
                        { path: 'shipperId' },
                        { path: 'carrierId' },
                        { path: 'customerId' },
                        { path: 'hazmatId' }
                    ]
                })
                .exec(async(err, x) => {
                    if (err) {
                        resolve([])
                    } else {
                        if (x && x.originalManifestId) {
                            if (x.clonePackages) {
                                if (x.clonePackages.length > 0) {
                                    original = x.clonePackages
                                }
                            }
                            // original = await this.getPackageOnManifest(x.originalManifestId)
                            let clone = await this.getPackageOnManifest(x.id)
                            if (clone !== null) clone.map(y => original.push(y))
                            resolve(original)
                        } else {
                            resolve(await this.getPackageOnManifest(manifestId))
                        }
                    }
                })
        })
    }

    getPackageOnManifest(manifestId) {
        return new Promise((resolve, reject) => {
            PackageHistory.find({ manifestId: manifestId })
                .populate(['awbId', 'compartmentId', 'shipperId', 'carrierId', 'customerId', 'hazmatId'])
                .exec((err, packages) => {
                    if (err) {
                        resolve([]);
                    } else {
                        resolve(packages);
                    }
                })
        });
    }

    getPackagesById(ids) {
        return new Promise((resolve, reject) => {
            Package.find({ _id: { $in: ids } })
                .populate(['awbId', 'compartmentId', 'shipperId', 'carrierId', 'customerId', 'hazmatId'])
                .exec((err, packages) => {
                    if (err) {
                        resolve([]);
                    } else {
                        resolve(packages);
                    }
                })
        });
    }

    getPackagesHistoryById(ids) {
        return new Promise((resolve, reject) => {
            PackageHistory.find({ _id: { $in: ids } })
                .populate(['awbId', 'compartmentId', 'shipperId', 'carrierId', 'customerId', 'hazmatId'])
                .exec((err, packages) => {
                    if (err) {
                        resolve([]);
                    } else {
                        resolve(packages);
                    }
                })
        });
    }

    getPackageOnManifestFlight(manifestId) {
        return new Promise((resolve, reject) => {
            Package.find({ manifestId: manifestId })
                .populate(['awbId', 'compartmentId', 'shipperId', 'carrierId', 'customerId', 'hazmatId'])
                .exec((err, packages) => {
                    if (err) {
                        resolve([]);
                    } else {

                        packages.forEach(pkg => {
                            pkg._doc.awbId = (pkg.awbId.awbId || "")
                            pkg._doc.customerId = (pkg.customerId ? pkg.customerId.firstName : "") + ' ' + (pkg.customerId ? pkg.customerId.lastName : "")
                        })
                        resolve(packages);
                    }
                })
        });
    }

    //======== Packages for store ========//
    getPackagesForStores(req) {
        return new Promise((resolve, reject) => {
            var searchData = {};
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
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                    
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
          
                if(!req.query.daterange && !req.query.clear){
                  var endate = new Date();      
                  endate.setDate(endate.getDate());
                  var stdate = new Date();
                  stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table));
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                       
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
                if(req.query.clear){
                  var endate = new Date();      
                  endate.setDate(endate.getDate()+1);
                  var stdate = new Date();
                  stdate.setDate(stdate.getDate() -14);  
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                     
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
              }  
            Package.find(searchData)
            .populate('customerId')
            .populate('awbId')
            .exec(async (err, packages) => {
                    let packageArray = []
                    for(let data of packages){
                        let statusPack = await PackageStatus.find({status : PKG_STATUS[5],packageId : data._id})
                        if(statusPack.length == 0){
                            packageArray.push(data)
                        }
                    }
                    if (err) {
                        resolve([]);
                    } else {
                        
                        resolve(packageArray);
                    }
                })
        });
    }

    getPackagesForStoresList(req, customerPmb){
        var searchData = {
            statuspackageLength : 0,
            $or:customerPmb           
        }
        var start = req.body.start ? parseInt(req.body.start) : 0;
        var length = req.body.length ? parseInt(req.body.length) : 10;      
        var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
        var columns = {0:'deliveryNum', 1: 'createdAt', 2: 'user.name', 3: 'location.name', 5: 'driver', 6: 'vehicle.vehicleMake' } 
        
        var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
        var sort = (dir=='asc') ? 1 : -1;
        var sortField = columns[field];

        var search = req.body['search[value]'] ? req.body['search[value]'] : ''; 

        //date range
        var daterange = req.body.daterange?req.body.daterange:''
        if(daterange){
        var date_arr = daterange.split('-');
        var startDate = (date_arr[0]).trim();      
        var stdate = new Date(startDate);
        stdate.setDate(stdate.getDate() +1);

        var endDate = (date_arr[1]).trim();
        var endate = new Date(endDate);
        endate.setDate(endate.getDate() +1);  
        
        stdate = new Date(stdate.setUTCHours(0,0,0,0));
        stdate = stdate.toISOString();
        endate = new Date(endate.setUTCHours(23,59,59,0));
        endate = endate.toISOString(); 
            
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
        }

        if(!req.body.daterange && !req.body.clear){
        var endate = new Date();      
        endate.setDate(endate.getDate());
        var stdate = new Date();
        stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table)); 
        
        stdate = new Date(stdate.setUTCHours(0,0,0,0));
        stdate = stdate.toISOString();
        endate = new Date(endate.setUTCHours(23,59,59,0));
        endate = endate.toISOString(); 
              
        searchData.createdAt = {"$gte":stdate, "$lte": endate};
        }
        if(req.body.location && req.body.location!="All"){
            searchData.location = req.body.location;
        }

        if(search){
        searchData.$or = [          
            {location:{'$regex' : search, '$options' : 'i'}},
            {trackingNo:{'$regex' : search, '$options' : 'i'}},  
            {"customer.pmb":{'$regex' : search, '$options' : 'i'}},
            {"customer.firstName":{'$regex' : search, '$options' : 'i'}},
            {"customer.lastName":{'$regex' : search, '$options' : 'i'}},
            {"awb.awbId":{'$regex' : search, '$options' : 'i'}},  
            {description:{'$regex' : search, '$options' : 'i'}},
            {weight:{'$regex' : search, '$options' : 'i'}}  
        ]
        }
        return new Promise(async (resolve, reject) => {
            var piplineAggregate = [
                {
                    $lookup:{
                        from:"customers",
                        localField: 'customerId',
                        foreignField: '_id',
                        as:"customer"
                    }
                },
                {$unwind:"$customer"},
                {
                    $lookup:{
                        from:"awbs",
                        localField: 'awbId',
                        foreignField: '_id',
                        as:"awb"
                    }
                },
                 {$unwind:"$awb"},
                {
                    $lookup:{
                        from:"packagestatuses",
                        localField: '_id',
                        foreignField: 'packageId',
                        as:"statuspackage"
                    }
                },
                {
                    $addFields:{
                        statuspackage: {
                            $filter: {
                                input: "$statuspackage",
                                as: "item",
                                cond: { $eq: [ "$$item.status", PKG_STATUS[5] ] }
                             }
                        }
                    }
                },
                
                {
                    $addFields:{
                        statuspackageLength:{
                            $size:"$statuspackage"
                        }
                    }
                },
                {
                    $match:searchData
                }                
            ];
            
            
            var totalRecords = await Package.aggregate([
                ...piplineAggregate,
                ...[{$count: "total"}]
            ]);
           if(totalRecords && totalRecords.length && totalRecords[0].total){
                Package.aggregate([
                    ...piplineAggregate,
                    ...[
                        {$sort: {createdAt:1}},
                        {$skip: start},
                        {$limit: length},
                    ]
                ]).exec((err,result)=>{
                    if(err){
                        console.log(err)
                        resolve({total:0, packages: []})
                    }else{
                        resolve({total:totalRecords[0].total, packages: result})
                    }
                })
            }else{
                resolve({total:0, packages: []})
            }

        })
    }


    //========== load Packages in cargo =============//

    updateManifestPackageToLoadOnAirCraft(manifestId, userId) {
        return new Promise((resolve, reject) => {
            this.getPackageOnManifest(manifestId).then((packages) => {
                Promise.all(
                    packages.map((pkg) => {
                        return this.updatePackageStatus(pkg._id, 2, userId);
                    }),
                ).then((results) => {
                    resolve({ success: true, message: strings.string_response_updated });
                });
            });
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
                resolve({ success: true, message: strings.string_response_received, status: PKG_STATUS[4] });
            });
        });
    }


    // ======== Process Package ==========//
    async processPackage(barcode, userId) {
        try {
            let bar = await Barcode.findOne({ barcode: barcode });
            if (bar === null || bar === undefined) {
                return { success: false, message: 'Barcode Does not Exist' }
            } else {
                const process = await ProcessPackage.findOneAndUpdate({ userId: userId }, { userId: userId, barcode: bar.id }, { upsert: true, new: true })
                if (process == null) return { success: false, message: strings.string_response_error }
                return {
                    success: true,
                    message: strings.string_response_added,
                    originBarcode: process,
                }

            }
        } catch (error) {
            console.error('updateZone', error)
        }
    }

    //========= Update Zone On Package and location Delivered ======//
    async updateZoneAndLocation(id, pkgs) {
        try {
            await Zone.findByIdAndUpdate({ _id: id }, { $push: { packages: pkgs } })
            let zoneResult = await Zone.findById(id)
            if(zoneResult && zoneResult.location){
                await Location.findByIdAndUpdate({_id : zoneResult.location},{ $push: { packages: pkgs }})
            }else{
                return
            }
        } catch (error) {
            console.error('updateZone', error)
        }
    }

    async updateAwbPackages(id, pkgs) {
        try {
            return await Awb.findByIdAndUpdate({ _id: id }, { $push: { packages: pkgs } })
        } catch (error) {
            console.error('updateAwbPackages', error)
        }
    }

    getPackage_updated(packageId, pkgStatus) {
        return new Promise(async(resolve, reject) => {
            let lastDate =  new Date()
            let pkgCheck = await Package.findOne({ _id: packageId }).read("primary")
            let modelResult = Package 
            if(pkgCheck == null)
                modelResult = PackageHistory 
            let pkg = await modelResult.findOneAndUpdate({ _id: packageId }, { lastStatusText: pkgStatus , lastStatusDate :  lastDate}, { new: true }).read("primary")
            let pkgHistoryUpdated = await PackageHistory.findOneAndUpdate({ _id: packageId }, { lastStatusText: pkgStatus , lastStatusDate :  lastDate}, { new: true }).read("primary")
            if (!pkg) resolve({})
            else resolve(pkg)
        })
    }

    getPackage_update_status(packageId, pkgStatus) {
        return new Promise(async(resolve, reject) => {
            let lastDate =  new Date()
            let pkgUpdated = await Package.updateOne({ _id: packageId }, { lastStatusText: pkgStatus , lastStatusDate :  lastDate})
            let pkg  = await Package.findOne({ _id: packageId }).read("primary")
            let pkgHistoryUpdated = await PackageHistory.updateOne({ _id: packageId }, { lastStatusText: pkgStatus , lastStatusDate :  lastDate})
            if (!pkg) resolve({})
            else resolve(pkg)
        })
    }

    async removePackageFromLocation(packageId,error){
        try {
            if(error.length > 0){
                return
            }
            let packageResult = await Package.findById(packageId)
            if(packageResult && packageResult.zoneId){
                let zoneResult = await Zone.findById(packageResult.zoneId)
                if(zoneResult && zoneResult.location){
                    await Package.findOneAndUpdate({_id : packageId},{$unset: {zoneId: 1, zoneName : 1}})
                    await PackageHistory.findOneAndUpdate({_id : packageId},{$unset: {zoneId: 1, zoneName : 1 }})
                    await Location.findByIdAndUpdate({_id : zoneResult.location},{ $pull: { packages: packageId }})
                }else{
                    return
                }
            }else{
                return
            }
        } catch (error) {
            console.error('removePacage from location', error)
        }
    }

    async removePackagesAndAwb(packageIds){
        let awbIds = []
        for(let pkgId of packageIds){
            let packageResult =await Package.findById(pkgId).populate({path : 'awbId', populate : 'packages'})
            awbIds.push(packageResult.awbId)
        }
        for(let awbId of awbIds){
            let flag = 0 
            for(let pkg of awbId.packages){
                if(pkg.lastStatusText != "Received By Customer"){
                    flag =1
                }
            }
            if(flag == 0){
                await Package.deleteMany({awbId : awbId})
                await Awb.deleteOne({_id : awbId})
            }
        }
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
            Package.findById(packageId).read("primary").exec(async(err, res) => {
                await this.getPackage_update_status(packageId, packageStatus['status'])
                if (err || res === null) {
                    resolve({ success: false, message: `PackageId ${packageId} Doesn't Exist. Please scan one of the system generated labels.` })
                } else {
                    PackageStatus.findOneAndUpdate({ packageId: packageId, status: packageStatus.status }, { $set: packageStatus }, { upsert: true, new: true }, (err, packageStatus) => {
                        if (err) {
                            resolve({ success: false, message: strings.string_response_error });
                        } else {
                            this.getPackage_update_status(packageId, packageStatus['status']).then((pkg) => {
                                let fParam = { trackingNo: pkg.trackingNo, screenName: 'PACKAGE_DETAIL' }
                                firebase.sendNotification(
                                    pkg && pkg.customerId,
                                    'Package Status Updated',
                                    'Package-' + pkg.trackingNo + ' Updated',
                                    fParam
                                );
                            });
                            resolve({ success: true, message: strings.string_response_updated, status: packageStatus['status'] });
                        }
                    });
                }
            })
        });
    }


    async getPackageInfo(userId) {
        try {
            let packagesList =  await PackageStatus.find({ updatedBy: userId }).populate({ path: "packageId", populate: [{ path: "awbId" },{path : 'cubeId'}] }).sort({ updatedAt: -1 })
            // let responsePkg = []
            // for(let pkg of packagesList){
            //     pkg = pkg.toJSON()
            //     if(pkg.status == 'Assigned to cube'){
            //         pkg.cubeDetail = pkg.packageId.cubeId
            //         let cubeStatusResult = await PackageStatus.findOne({ packageId : pkg.cubeDetail.cubepackageId }).sort({ updatedAt: -1 })
            //         pkg.cubeDetail.status = cubeStatusResult.status 
            //     }
            //     responsePkg.push(pkg)
            // }
            for(let pkg of packagesList){
                if(!pkg.packageId){
                    let packageIdResult = await PackageStatus.findById(pkg._id)
                    pkg.packageId = await PackageHistory.findById(packageIdResult.packageId).populate([{ path: "awbId" },{path : 'cubeId'}])
                }
            }

            return packagesList
        } catch (error) {
            return []
        }
    }

    async getPackagesWithStatus(invoice){
        return new Promise(async (resolve, reject) => {
            let resultArray = [] 
                if(invoice.awbId){
                    for(let pkg of invoice.awbId.packages){
                        let result = await PackageStatus.findOne({ packageId:pkg._id }).populate('packageId')
                        if(result){
                            resultArray.push(result) 
                        }
                    }
                }
            resolve(resultArray);
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
            PackageStatus.find({ packageId }, (err, result) => {
                if (err) {
                    resolve([]);
                } else {
                    resolve(result);
                }
            }).sort({ updatedAt: 1 })
        });
    }

    //========== Customer Package ==========//
    getCustomerPackages(customerId) {
        console.log("cus",customerId)
        return new Promise((resolve, reject) => {
            PackageHistory.find({ customerId })
                .exec((error, packages) => {
                    if (error || packages.length == 0) {
                        resolve({
                            success: false,
                            message: strings.string_package_not_found_customer
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
                                success: true,
                                packages: packages
                            });
                        });
                    }
                })
        });
    }

    async getPopulatedCustomerPackages(packages) {
        return await Promise.all(
            packages.map(async(pkg) => {
                pkg = await this.get_Packages_update({_id :pkg._id});
                console.log("pkg",pkg)
                let status = await this.services.packageService.getPackageLastStatus(pkg._id);
                pkg.lastStatusText = status && status.status;
                if (pkg.originBarcode) {
                    let barcode = await this.getOriginBarcode(pkg[0].originBarcode._id)
                    if (barcode !== null && barcode.createdAt) {
                        pkg.OrignalBarcodeDate = barcode.createdAt;
                    }
                    if(barcode !== null && (barcode.barcode == "No tracking" || barcode.barcode == "No Tracking")){
                        pkg.OrignalBarcodeDate = pkg.createdAt
                    }
                }
                if (pkg.awbId) {
                    let awb = await this.services.awbService.getAwb(pkg.awbId)
                    if (awb !== null && awb.createdAt) {
                        pkg.awbCreatedAt = momentz(awb.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');
                    }
                }
                if (pkg.manifestId) {
                    let actualFlight = await Manifest.findById(pkg.manifestId).populate('planeId')
                    if (actualFlight !== null && actualFlight.planeId) {
                        pkg.actualFlight = actualFlight.planeId ? actualFlight.planeId.tailNumber : ''
                    }
                }
                pkg.OrignalBarcodeDate = pkg.OrignalBarcodeDate || ''
                pkg.awbCreatedAt = pkg.awbCreatedAt || ''
                pkg.actualFlight = pkg.actualFlight || ''
                return pkg[0];
            }),
        );
    }

    async getPackagesFilterDate(req,packages){
        return new Promise((resolve, reject) => {
        var searchData = {_id:{$in:packages}};
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
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                    
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
          
                if(!req.query.daterange && !req.query.clear){
                  var endate = new Date();      
                  endate.setDate(endate.getDate());
                  var stdate = new Date();
                  stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table));  
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                     
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
                if(req.query.clear){
                  var endate = new Date();      
                  endate.setDate(endate.getDate()+1);
                  var stdate = new Date();
                  stdate.setDate(stdate.getDate() -14); 
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                      
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
              } 

              Package.find(searchData).exec((err,data)=>{
                var packageData = [];
                for(var i=0; i<data.length; i++){
                    packageData.push(data[i]._id)
                }
                resolve(packageData)
              })
              
            })

    }

    async getPopulatedCustomerPackagesDateFilter(query,packages) {
        return await Promise.all(
            packages.map(async(pkg) => {                
                pkg = await this.get_Packages_update({_id :pkg._id});               
                let status = await this.services.packageService.getPackageLastStatus(pkg._id);
                pkg.lastStatusText = status && status.status;
                if (pkg.originBarcode) {
                    let barcode = await this.getOriginBarcode(pkg[0].originBarcode._id)
                    if (barcode !== null && barcode.createdAt) {
                        pkg.OrignalBarcodeDate = barcode.createdAt;
                    }
                    if(barcode !== null && (barcode.barcode == "No tracking" || barcode.barcode == "No Tracking")){
                        pkg.OrignalBarcodeDate = pkg.createdAt
                    }
                }
                if (pkg.awbId) {
                    let awb = await this.services.awbService.getAwb(pkg.awbId)
                    if (awb !== null && awb.createdAt) {
                        pkg.awbCreatedAt = momentz(awb.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');
                    }
                }
                if (pkg.manifestId) {
                    let actualFlight = await Manifest.findById(pkg.manifestId).populate('planeId')
                    if (actualFlight !== null && actualFlight.planeId) {
                        pkg.actualFlight = actualFlight.planeId ? actualFlight.planeId.tailNumber : ''
                    }
                }
                pkg.OrignalBarcodeDate = pkg.OrignalBarcodeDate || ''
                pkg.awbCreatedAt = pkg.awbCreatedAt || ''
                pkg.actualFlight = pkg.actualFlight || ''
                return pkg[0];
            }),
        );
    }

    getPackagesDataByDeliveryId(deliveryId) {
        return new Promise((resolve, reject) => {
            Package.find({ deliveryId })
                .populate('shipperId')
                .populate('awbId')
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

    getDeliveryPackageDetail(query) {
        var searchData = { deliveryId: { $exists: true, $ne: null } };
            if(query && query.daterange && query.type == "deliveryDetail"){
                var daterange = query.daterange;
                var date_arr = daterange.split('-');
                var startDate = (date_arr[0]).trim();      
                var stdate = new Date(startDate);
                stdate.setDate(stdate.getDate() );
            
                var endDate = (date_arr[1]).trim();
                var endate = new Date(endDate);
                endate.setDate(endate.getDate() +1);  
                
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                    
                searchData.createdAt = {"$gte":stdate, "$lte": endate};             
            }else if(query && query.daterange && !query.type ){
                var endate = new Date();      
                endate.setDate(endate.getDate());
                var stdate = new Date();
                stdate.setDate(stdate.getDate() - parseInt(0)); 
                
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                      
                searchData.createdAt = {"$gte":stdate, "$lte": endate};
            }
        return new Promise((resolve, reject) => {
            // Package.find(searchData, (err, packages) => {
            //     Promise.all(
            //         packages.map(async(pkg) => {
            //             let result = await deliveryService.getDeliveryAndDriverInfo(pkg.deliveryId);

            //             return {
            //                 packageId: pkg.id,
            //                 status: pkg.lastStatusText,
            //                 driverName: result.driverId.firstName + " " + (result.driverId.lastName ? result.driverId.lastName : ""),
            //                 date: moment(result.delivery_date).format("DD MMM, YYYY | hh:mm"),
            //                 location: result.locationId.address
            //             }
            //         })
            //     ).then(result => resolve(result))
            // })
            Package.find(searchData)
                    .populate({path : 'deliveryId',populate : 'driverId'})
                    .exec((err, result) => {
                        
                        resolve(result)
            })
                
            
        })
    }

    getPackageStatusWithUser(filter, query) {
        return new Promise((resolve, reject) => {
            let dbQuery = {};
            if (filter === 'all') {
                dbQuery = {}
            } else {
                if (query.filter_for === "all_package_table") {
                    
                    if (query.users && query.users != 'all') {
                        dbQuery['updatedBy'] = mongoose.Types.ObjectId(query.users);
                    }
                    if (query.package_status && query.package_status != 'all') {
                        dbQuery['status'] = query.package_status;
                    }
                }
            }
           
            if(query && query.daterange && query.type == "packageDetail"){
                var daterange = query.daterange;
                var date_arr = daterange.split('-');
                var startDate = (date_arr[0]).trim();      
                var stdate = new Date(startDate);
                stdate.setDate(stdate.getDate() );
            
                var endDate = (date_arr[1]).trim();
                var endate = new Date(endDate);
                endate.setDate(endate.getDate() +1);  
                
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                //stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                //endate = endate.toISOString(); 
                    
                dbQuery.createdAt = {"$gte":stdate, "$lte": endate};             
            }else if(query && query.daterange && !query.type ){
              var endate = new Date();      
              endate.setDate(endate.getDate());
              var stdate = new Date();
              stdate.setDate(stdate.getDate() - parseInt(0));  
              
              stdate = new Date(stdate.setUTCHours(0,0,0,0));
              //stdate = stdate.toISOString();
              endate = new Date(endate.setUTCHours(23,59,59,0));
              //endate = endate.toISOString(); 
                   
              dbQuery.createdAt = {"$gte":stdate, "$lte": endate};
            }
            console.log("packagedetail>>>>>>>>>>>",dbQuery)
            PackageStatus
                .aggregate([
                    { $match: dbQuery },
                    {
                        $group: {
                            _id: "$packageId",
                            lastPackageCreatedAt: { $last: "$createdAt" },
                            status: { $last: "$status" },
                            updatedBy: { $last: "$updatedBy" },
                            packageLastId: { $last: "$packageId" }
                        }
                    }, {
                        $lookup: {
                            from: "users",
                            localField: "updatedBy",
                            foreignField: "_id",
                            as: "userId"
                        },
                    }, {
                        $unwind: '$userId'
                    }, {
                        $lookup: {
                            from: "packages",
                            localField: "packageLastId",
                            foreignField: "_id",
                            as: "package"
                        },
                    }, {
                        $unwind: '$package'
                    },
                    {
                        $project: {
                            _id: 0,
                            barcode:"$package.barcode",
                            packageId: '$package.id',
                            user: {
                                firstName: '$userId.firstName',
                                lastName: '$userId.lastName'
                            },
                            updatedAt: '$lastPackageCreatedAt',
                            status: 1
                        }
                    }
                ]).then((data) => resolve(data));
        })
    }

    getNoDocsPackackages(page, pageSize) {
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

    // This method is used when we're performing the global search 
    getGlobalSearchDataOld(bodyData) {
        return new Promise(async (resolve, reject) => {
            let { selectedOption, inputField } = bodyData;
            if (!selectedOption || selectedOption === 'default' || !(inputField && inputField.trim())) {
                return resolve({ success: false, message: strings.string_global_search_error });
            }

            if (selectedOption === "Package") {
                Package.find({ description: { $regex: inputField, $options: 'i' } }, 'id trackingNo awbId', (err, packages) => {
                    if (err) {
                        resolve([]);
                    } else {
                        resolve(packages);
                    }
                })
            }else if (selectedOption === "Original") {
                let barcode = await this.getOriginalBarcodeByCodeWildCard(inputField)
                let barcodes = []
                barcode.forEach(async br =>{
                    barcodes.push(br._id)
                })
                Package.find({ originBarcode: { $in:barcodes}}, (err, packages) => {
                    if (err) {
                        resolve([]);
                    } else {
                        resolve(packages)
                    }
                }).populate({path:"originBarcode",select:'barcode'}).select('id trackingNo awbId originBarcode')
                
            } else if (selectedOption === "Awb") {
                inputField = inputField.trim().toLowerCase().toString();
                Awb.find({ awbId: inputField  }, 'awbId', (err, awb) => {
                    if (err) {
                        console.log({err})
                        resolve([]);
                    } else {
                        resolve(awb);
                    }
                });
            } else {
                inputField = inputField.trim();
                Customer.find({ email: { $regex: inputField, $options: 'i' } }, '_id firstName', (err, customers) => {
                    if (err) {
                        console.log({err})
                        resolve([]);
                    } else {
                        resolve(customers);
                    }
                });
            }
        })
    }

    getGlobalSearchData(bodyData) {
        return new Promise(async (resolve, reject) => {
            let { selectedOption, inputField } = bodyData;
            if (!selectedOption || selectedOption === 'default' || !(inputField && inputField.trim())) {
                return resolve({ success: false, message: strings.string_global_search_error });
            }
           // inputField = inputField.trim();
            var search = { customerFullName: { $regex: inputField, $options: 'i' } };
            if (selectedOption === "Package"){
               search =  { description: { $regex: inputField, $options: 'i' } }
            }
            if (selectedOption === "Original") {
                search =  { barcode: { $regex: inputField, $options: 'i' } }
            }
            if (selectedOption === "Awb") {
                search =  { awbIdString: { $regex: inputField, $options: 'i' } }
            }
            console.log(search)
            Package.find(search, 'id awbId customerFullName barcode awbIdNumber trackingNo', (err, packages) => {
                if (err) {
                    resolve([]);
                } else {
                    resolve(packages);
                }
            })
        })
    }
    getProcessOriginBarcode(user) {
        let userId = user._id;
        userId = user._id == undefined ? user : user._id
        return new Promise((resolve, reject) => {
            ProcessPackage.findOne({ userId: userId }).populate('barcode').exec((err, data) => {
                if (err) {
                    console.log(err)
                    resolve({});
                } else {
                    resolve(data)
                }
            })
        });
    }

    // getPackageCube(pkgIds) {
    //   return new Promise((resolve, reject) => {
    //     Package.find({ _id: {$in:pkgIds} })
    //       .populate(['awbId', 'compartmentId', 'shipperId', 'carrierId', 'customerId', 'hazmatId'])
    //       .exec((err, packages) => {
    //         if (err) {
    //           resolve([]);
    //         } else {
    //           resolve(packages);
    //         }
    //       })
    //   });
    // }

    async getPackageCube(pkgIds) {
        let packages = await this.getAllPackagesOfCube({ _id: { $in: pkgIds } })
        return await Promise.all(
            packages.map(async(pkg) => {
                let status = await this.services.packageService.getPackageLastStatus(pkg._id);
                pkg.lastStatusText = status && status.status;
                if (pkg.originBarcode) {
                    let barcode = await this.getOriginBarcode(pkg.originBarcode)
                    if (barcode !== null && barcode.createdAt) {
                        pkg.OrignalBarcodeDate = barcode.createdAt;
                    }
                    if(barcode !== null && (barcode.barcode == "No tracking" || barcode.barcode == "No Tracking")){
                        pkg.OrignalBarcodeDate = pkg.createdAt
                    }
                }
                if (pkg.awbId) {
                    let awb = await this.services.awbService.getAwb(pkg.awbId)
                    if (awb !== null && awb.createdAt) {
                        pkg.awbCreatedAt = momentz(awb.createdAt).tz("America/New_York").format('dddd, MMMM Do YYYY, h:mm A');
                    }
                }
                if (pkg.manifestId) {
                    let actualFlight = await Manifest.findById(pkg.manifestId).populate('planeId')
                    if (actualFlight !== null && actualFlight.planeId) {
                        pkg.actualFlight = actualFlight.planeId ? actualFlight.planeId.tailNumber : ''
                    }
                }
                pkg.OrignalBarcodeDate = pkg.OrignalBarcodeDate || ''
                pkg.awbCreatedAt = pkg.awbCreatedAt || ''
                pkg.actualFlight = pkg.actualFlight || ''
                return pkg;
            }),
        );
    }

    getAllPackagesOfCube(cond) {
        return new Promise((resolve, reject) => {
            PackageHistory.find(cond)
                .populate('awbId')
                .populate('originBarcode')
                .populate('customerId')
                .populate('zoneId')
                .populate('shipperId')
                .exec((err, result) => {
                    if (err) {
                        resolve([]);
                    } else {
                        resolve(result);
                    }
                });
        });
    }

    /* Cron For NOdocs  */
    checkAgingofNoDocsPackages(){
        return new Promise(async (resolve,reject)=>{
            try {
                let pkg = await PackageStatus.find({status:PKG_STATUS[7]});
                await Promise.all(pkg.map( async pk=>{
                    let noDocDate = moment(pk.createdAt)
                    let now = moment()
                    let diff = now.diff(noDocDate, 'days')
                    let pkgaging = await Package.findOne({_id:pk.packageId})
                    if(!pkgaging) return ({success:false,message:"pkgaging NOt found"})
                    if(diff > 0){
                        let pkgagingUpdate = await Package.findOneAndUpdate({_id:pkgaging._id},{aging:pkgaging.aging ? (pkgaging.aging + 1) : 1})
                        if(!pkgagingUpdate) return ({success:false,message:"pkgagingUpdate Failed"})
                        else return ({success:true,message:'Aging Updated'})         
                    }
                    if(diff > 14){
                    let updPkg = await Package.findOneAndUpdate({_id:pkgaging._id},{agingdollar:pkgaging.agingdollar ? (pkgaging.agingdollar + 1) : 1},{new:true})
                    // console.log('upp',updPkg)
                    if(!updPkg) return ({success:false,message:"updPkg Failed"})
                    else {
                      this.sendNoDocsPackageDataForAging(updPkg._id)
                        return ({success:true,message:'Aging Dollar Updated'})
                    }  
                           
                    }else{
                        return ({success:false,message:'Greater than 14'})
                    }     
                })).then((result)=> resolve(result))
            } catch (error) {
                console.error({checkAgingofNoDocsPackages:error})
                reject(error)
            }
        })
    }
    /* Cron For Delivered to store */
    checkAgingofStoreInPackages(){
        return new Promise(async (resolve,reject)=>{
            try {
                let pkg = await PackageStatus.find({status:PKG_STATUS[9]});
               
                await Promise.all(pkg.map( async pk=>{
                    let noDocDate = moment(pk.createdAt)
                    let now = moment()
                    let diff = now.diff(noDocDate, 'days')
                    let pkgaging = await Package.findOne({_id:pk.packageId})
                    if(!pkgaging) return ({success:false,message:"pkgaging NOt found"})
                    if(diff > 0){
                        let pkgagingUpdate = await Package.findOneAndUpdate({_id:pkgaging._id},{agingStore:pkgaging.agingStore ? (pkgaging.agingStore + 1) : 1})
                        if(!pkgagingUpdate) return ({success:false,message:"pkgagingUpdate Failed"})
                        else return ({success:true,message:'Aging Updated'})         
                    }
                    if(diff > 14){
                    let updPkg = await Package.findOneAndUpdate({_id:pkgaging._id},{agingStoredollar:pkgaging.agingStoredollar ? (pkgaging.agingStoredollar + 1) : 1},{new:true})
                    if(!updPkg) return ({success:false,message:"updPkg Failed"})
                    else {
                        this.sendStorePackageDataForAging(updPkg._id)
                        return ({success:true,message:'Aging Dollar Updated'})
                    }  
                           
                    }else{
                        return ({success:false,message:'Greater than 14'})
                    }     
                })).then((result)=> resolve(result))
            } catch (error) {
                console.error({checkAgingofStoreInPackages:error})
                reject(error)
            }
        })
    }
   

    /* Email for NODOCS and Store Delivered */
    async sendNoDocsPackageData(pkgId){       
        const pkgData = await Package.findOne({_id:pkgId})
        .populate('customerId')
        .populate('shipperId')
        .populate('originBarcode')
        .populate('awbId');
        if(pkgData && pkgData.awbId &&  !pkgData.awbId.eamil_incoice){
            await emailService.sendNoDocsPackageEmail(pkgData);
            await Awb.updateOne({_id:(pkgData.awbId._id).toString()},{eamil_incoice:true});
            return true;
        }else{
            return false
        }        
    }
    //Send Email for Nodocs Packages 
    async sendNoDocsPackageDataForAging(pkgId){       
        const pkgData = await Package.findOne({_id:pkgId})
        .populate('customerId')
        .populate('shipperId')
        .populate('originBarcode')
        .populate('awbId');
        if(pkgData && pkgData.awbId &&  !pkgData.emailAging){
            await emailService.sendNoDocsPackageEmail(pkgData);
            await Package.updateOne({_id:pkgId},{emailAging:true});
            return true;
        }else{
            return false
        }        
    }
    //Send Email when Package ENter to No DOc
    async sendStorePackageData(pkgId){
        let pkgData = await Package.findOne({_id:pkgId})
        .populate('customerId')
        .populate('shipperId')
        .populate('originBarcode')
        .populate('awbId');
        pkgData = JSON.parse(JSON.stringify(pkgData));
        if(pkgData && pkgData.awbId &&  !pkgData.awbId.eamil_delivered_store){
            const awbId = pkgData.awbId._id;
            const awbData = await Awb.findOne({_id:awbId}).populate('invoices');
            const invoices = awbData.invoices?awbData.invoices:[];
            // var totalPrice = 0;
            // for(let i=0;i<invoices.length;i++){
            //     totalPrice = totalPrice+invoices[i].value;
            // }
            let pricelabelResult = await  this.services.AwbPriceLabelService.getPriceLabel(awbId);
            pkgData.totalPrice = pricelabelResult.SumOfAllCharges;
            console.log(pkgData.totalPrice,'>>>>>>>>>>>>>>>>');
            await emailService.sendStorePackageEmail(pkgData);
            await Awb.updateOne({_id:(pkgData.awbId._id).toString()},{eamil_delivered_store:true});
            return true;
        }else{
            return false
        } 
    }
    //SEnd email when package starts aging
    async sendStorePackageDataForAging(pkgId){
        let pkgData = await Package.findOne({_id:pkgId})
        .populate('customerId')
        .populate('shipperId')
        .populate('originBarcode')
        .populate('awbId');
        pkgData = JSON.parse(JSON.stringify(pkgData));
        if(pkgData && pkgData.awbId &&  !pkgData.emailAgingStore){
            const awbId = pkgData.awbId._id;
            const awbData = await Awb.findOne({_id:awbId}).populate('invoices');
            const invoices = awbData.invoices?awbData.invoices:[];
            // var totalPrice = 0;
            // for(let i=0;i<invoices.length;i++){
            //     totalPrice = totalPrice+invoices[i].value;
            // }
            let pricelabelResult = await  this.services.AwbPriceLabelService.getPriceLabel(awbId);
            pkgData.totalPrice = pricelabelResult.SumOfAllCharges;
            console.log(pkgData.totalPrice,'>>>>>>>>>>>>>>>>');
            await emailService.sendStorePackageEmail(pkgData);
            await Package.updateOne({_id:pkgId},{emailAgingStore:true});
            return true;
        }else{
            return false
        } 
    }


    async validateDeliveryStorePackage(locationId,pkgId){
        return new Promise(async (resolve,reject)=>{
            let location = await Location.findOne({_id:locationId})
            if(location){  
             let pkgData = await Package.findOne({_id:pkgId})
             .populate('customerId')
             .populate('shipperId')
             .populate('awbId');
             pkgData = JSON.parse(JSON.stringify(pkgData));
             if(pkgData.customerId && pkgData.customerId.pmb){
                 let awb = await this.services.awbService.getAwb(pkgData.awbId)
                 let pmb = pkgData.customerId.pmb
                 let locationName = location.name.toUpperCase()
                 if(pmb >0 && pmb <=1999  || pmb >= 4000 && pmb <=5999){
                     if(locationName.indexOf('CABLE BEACH') >=0){
                         resolve({ success: true, message: `Package is OK` })
                     }else{
                         resolve({ success: false, message: `The following package ${pkgId} belongs to Post Boxes Cable Beach with AWB:${awb.awbId}.Would you like to change it?` })
                     }
                 }else if (pmb >= 3000 && pmb <=3999){
                     if(locationName.indexOf('ALBANY') >=0){
                         resolve({ success: true, message: `Package is OK` })
                     }else{
                         resolve({ success: false, message: `The following package ${pkgId} belongs to Post Boxes Albany with AWB:${awb.awbId}.Would you like to change it?` })
                     }
                 }else if (pmb >= 9000 && pmb <=10000){
                     if(locationName.indexOf('9TO5') >=0 || locationName.indexOf('9to5') >=0 || locationName.indexOf('NINE TO FIVE') >=0 || locationName.indexOf('WAREHOUSE') >=0){
                         resolve({ success: true, message: `Package is OK` })
                     }else{
                         resolve({ success: false, message: `The following package ${pkgId} belongs to 9 to 5 with AWB:${awb.awbId}.Would you like to change it?` })
                     }
                 }else{
                  resolve({ success: false, message: `Following PackageId ${pkgId} with Tracking No.${pkgData.trackingNo} Doesn't belong to Right Store` })
                 }
             }else{
                resolve({ success: false, message: `Customer Id Not Found` })
               }
            }else{
             resolve({ success: false, message: `Location Id Not Found` })
            }
        }) 
     }

    async validateStorePackage(locationId,pkgId){
       return new Promise(async (resolve,reject)=>{
        //    let zone = await Zone.findOne({_id:zoneId})
            let location = await Location.findOne({_id:locationId})
        
           if(location){  
            let pkgData = await Package.findOne({_id:pkgId})
            .populate('customerId')
            .populate('shipperId')
            .populate('awbId');
            pkgData = JSON.parse(JSON.stringify(pkgData));
            if(pkgData.customerId && pkgData.customerId.pmb){
                let awb = await this.services.awbService.getAwb(pkgData.awbId)
                let pmb = pkgData.customerId.pmb
                let locationName = location.name.toUpperCase()
                if(pmb >0 && pmb <=1999  || pmb >= 4000 && pmb <=5999){
                    if(locationName.indexOf('CABLE BEACH') >=0){
                        resolve({ success: true, message: `Package is OK`, location : 'Cable Beach' })
                    }else{
                        resolve({ success: false, message: `The following package ${pkgId} belongs to Post Boxes Cable Beach with AWB:${awb.awbId} .Would you like to change it?` })
                    }
                }else if (pmb >= 3000 && pmb <=3999){
                    if(locationName.indexOf('ALBANY') >=0){
                        resolve({ success: true, message: `Package is OK`, location : 'Albany' })
                    }else{
                        resolve({ success: false, message: `The following package ${pkgId} belongs to Post Boxes Albany with AWB:${awb.awbId} .Would you like to change it?` })
                    }
                }else if (pmb >= 9000 && pmb <=10000){
                    if(locationName.indexOf('9TO5') >=0 || locationName.indexOf('9to5') >=0 || locationName.indexOf('NINE TO FIVE') >=0 || locationName.indexOf('WAREHOUSE') >=0 ){
                        resolve({ success: true, message: `Package is OK`, location : 'Warehouse' })
                    }else{
                        resolve({ success: false, message: `The following package ${pkgId} belongs to 9 to 5 with AWB:${awb.awbId} .Would you like to change it?` })
                    }
                }else{
                 resolve({ success: false, message: `Following PackageId ${pkgId} with Tracking No.${pkgData.trackingNo} Doesn't belong to Right Store` })
                }
            }else{
                resolve({ success: false, message: `Customer Id Not Found` })
            } 
           }else{
            resolve({ success: false, message: `Zone Id Not Found` })
           }
           
       }) 

    }
    get_overview_fll(req){        
        return new Promise((resolve, reject) => {
            var searchData = {};
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
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                     
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
          
                if(!req.query.daterange && !req.query.clear){
                  var endate = new Date();      
                  endate.setDate(endate.getDate());
                  var stdate = new Date();
                  stdate.setDate(stdate.getDate() - parseInt(strings.default_days_table));
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                       
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
                if(req.query.clear){
                  var endate = new Date();      
                  endate.setDate(endate.getDate()+1);
                  var stdate = new Date();
                  stdate.setDate(stdate.getDate() -14); 
                  
                stdate = new Date(stdate.setUTCHours(0,0,0,0));
                stdate = stdate.toISOString();
                endate = new Date(endate.setUTCHours(23,59,59,0));
                endate = endate.toISOString(); 
                      
                  searchData.createdAt = {"$gte":stdate, "$lte": endate};
                }
              }   
            Package.find(searchData)
                .populate('awbId')
                .populate('originBarcode')
                .populate('customerId')
                .exec((err, result) => {
                    if (err) {
                        resolve([]);
                    } else {
                        resolve(result);
                    }
                });
        });
    }
    async getLocationDetail(id){
        return new Promise(async (resolve,reject)=>{
            console.log({_id:id})
            let location = await Location.findOne({_id:id.toString()}).populate('company');
            resolve(location);
        }) 
    }
    async updateAwbPackageOnCustomer(customerId){
        return new Promise(async (resolve,reject)=>{           
            var packages = await Package.aggregate([
                {$match:{customerId:mongoose.mongo.ObjectId(customerId), awbId:{$ne:null}}},
                {$group:{_id:"$customerId",package:{$push:"$_id"}}}
              ]).read('primary');
            var awbs = await Awb.aggregate([
                {$match:{customerId:mongoose.mongo.ObjectId(customerId)}},
                {$group:{_id:"$customerId",awb:{$push:"$_id"}}}
              ]).read('primary');
              if(packages && packages.length && packages[0].package){
                let uniquePackage = [...new Set(packages[0].package)];
                await Customer.findByIdAndUpdate({_id:customerId}, {package:uniquePackage});
              }
              if(awbs && awbs.length && awbs[0].awb){
                let uniqueAwb = [...new Set(awbs[0].awb)];
                await Customer.findByIdAndUpdate({_id:customerId}, {awb:uniqueAwb});
              }
              resolve(customerId);
        })
    }
   /* End Sending EMail for Nodocs and Delivered */
}

function getPackageIdFromBarCode(barCodeValue) {
    var parts = barCodeValue.split('-');
    if (parts.length == 3)
        if (typeof parts[2] != 'undefined') return parts[2].trim();
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