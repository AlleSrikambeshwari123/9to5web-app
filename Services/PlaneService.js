const strings = require('../Res/strings');

// Redis
// var lredis = require('./redis-local');
// var client = require('./dataContext').redisClient;
// const PREFIX = strings.redis_prefix_planes;
// const PLANE_COUNTER = strings.redis_id_plane;
// const PLANE_LIST = strings.redis_prefix_planes_list;

// const COMPARTMENT_PREFIX = strings.redis_prefix_plane_compartment;
// const COMPARTMENT_COUNTER = strings.redis_id_compartment_plane;
// const COMPARTMENT_LIST = strings.redis_prefix_plane_compartment_list;

const Plane = require('../models/plane');
const Compartment = require('../models/compartment')
let ObjectId = require('mongodb').ObjectID;

class PlaneService {
  constructor() {
    this.services = {};
  }

  setServiceInstances(services) {
      this.services = services;
  }

  addPlane(plane) {
    return new Promise((resolve, reject) => {
      // let date = new Date()
      // plane.tailNumber = plane.tailNumber + ("0" + date.getDate(2)).slice(-2) +   ("0" + (date.getMonth() + 1)).slice(-2)+ (date.getFullYear().toString().substr(-2))+ "/"+ plane.time
      let newPlane = new Plane(plane);
      newPlane.save((err, result) => {
        if (err) {
          console.log("ERROR", err)
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_created });
        }
      })
    })
  }

  updatePlane(id, plane) {
    return new Promise(async (resolve, reject) => {
      Plane.findOneAndUpdate({ _id: id }, plane, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_updated });
        }
      })
    })
  }
  removePlane(planeId) {
    return new Promise((resolve, reject) => {
      Plane.deleteOne({ _id: planeId }, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
  }
  getPlane(id) {
    return new Promise((resolve, reject) => {
      Plane.findOne({ _id: id }).exec((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve(result)
        }
      });
    });
  }
  getPlanes() {
    return new Promise(async (resolve, reject) => {
      let planes = await Plane.find({})
      resolve(planes)
    })
  }
  getAllPlanes(req){

    var start = req.body.start ? parseInt(req.body.start) : 0;
    var length = req.body.length ? parseInt(req.body.length) : 10;      
    var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
    var columns = {0:'tailNumber', 1: 'createdAt', 2: 'flightName', 3: 'pilot.firstName', 3: 'airline.name', 4: 'aircraftType', 5:'maximumCapacity'} 
    
    var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
    var sort = (dir=='asc') ? 1 : -1;
    var sortField = columns[field];

    var search = req.body['search[value]'] ? req.body['search[value]'] : ''; 
    var searchData = {};

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
      searchData.createdAt = {"$gte":stdate, "$lte": endate};
    }

    if(!req.body.daterange && !req.body.clear){
      var endate = new Date();      
      endate.setDate(endate.getDate()+1);
      var stdate = new Date();
      stdate.setDate(stdate.getDate() -21);      
      searchData.createdAt = {"$gte":stdate, "$lte": endate};
    }

    if(search){
      searchData.$or = [          
        {tailNumber: {'$regex' : search, '$options' : 'i'}},
        {flightName: {'$regex' : search, '$options' : 'i'}},
        {"pilot.firstName": {'$regex' : search, '$options' : 'i'}},
        {"airline.name": {'$regex' : search, '$options' : 'i'}},
        {aircraftType: {'$regex' : search, '$options' : 'i'}},
        {maximumCapacity: {'$regex' : search, '$options' : 'i'}}
      ]
    }
    var pipeLineAggregate = [
      {
        $lookup:{
          from: "airlines",
          localField: "airlineId",
          foreignField: "_id",
          as: "airline"
        }
      },
      {
        $unwind: "$airline"
      },
      {
        $lookup:{
          from: "pilots",
          localField: "pilotId",
          foreignField: "_id",
          as: "pilot"
        }
      },
      {
        $unwind: "$pilot"
      },
      {
        $match: searchData
      }
    ]
    return new Promise(async(resolve, reject) => {
      var totalRecords = await Plane.aggregate([
        ...pipeLineAggregate,
        ...[
          {"$count":"total"}
        ]
      ]);
      if(totalRecords && totalRecords.length && totalRecords[0].total){
        Plane.aggregate([
          ...pipeLineAggregate,
          ...[
            {$sort: {[sortField]:sort}},
            {$skip: start},
            {$limit: length},
          ]
        ]).exec((err, result) => {
          if(err){
            resolve({total: 0, planes:[]});
          }else{
            resolve({ total: totalRecords[0].total, planes: result});
          }
        })    
      }else{
        resolve({total: 0, planes:[]});
      }      
    })
  }
  getFullPlane(planeId) {
    return new Promise((resolve, reject) => {
      Promise.all([
        this.getPlane(planeId),
        this.getCompartments(planeId),
      ]).then(results => {
        let plane = results[0];
        plane.compartments = results[1];
        resolve(plane);
      })
    });
  }
  // Compartment
  addCompartment(planeId, compartment) {
    return new Promise((resolve, reject) => {
      let newCompartment = new Compartment(compartment);
      newCompartment.save((err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          // Updating the maximum capacity of plane
          this.getPlane(planeId).then(plane => {
            plane.maximumCapacity += newCompartment.weight;
            this.updatePlane(planeId, plane);
          });
          resolve({ success: true, message: strings.string_response_created });
        }
      })
    })
  }

  async getAllCompartments(){
    try {
      return await Compartment.find()
    } catch (error) {
      return []
    }
  }
  getCompartments(planeId) {
    return new Promise(async (resolve, reject) => {
      let compartments = await Compartment.find({ planeId: ObjectId(planeId) }).populate([{path:'packages',select:'weight'},{path : 'planeId'}])
      compartments.map(cp=>{
        let totalPkgWeight = 0
        cp.packages.map(w => totalPkgWeight+= w.weight)
        cp._doc['available_weight'] = (cp.weight - totalPkgWeight).toFixed(2)
      })
      resolve(compartments)
    });
  }

  getCompartmentsManifest(planeId,manifestId) {
    return new Promise(async (resolve, reject) => {
      let compartments = await Compartment.find({ planeId: ObjectId(planeId) }).populate([{path:'packages',select:'weight compartmentId manifestId'},{path : 'planeId'}])
      let manifestResult = await this.services.packageService.cloneManifestAndOriginal(manifestId)
      let loadedManifestWeight =0,planeWeight =0;
      compartments.map(cp=>{
        let totalPkgWeight = 0,totalCompartmentWeight =0;
        for(let pkg of manifestResult){
          if(manifestId){
            if(pkg.compartmentId && String(pkg.compartmentId._id) == String(cp._id)){
              totalCompartmentWeight+=pkg.weight
            }
          }
        }
        cp.packages.map(w => totalPkgWeight+= w.weight)
        cp._doc['available_weight'] = (cp.weight - totalPkgWeight).toFixed(2)
        cp._doc['compartment_weight_loaded'] = totalCompartmentWeight.toFixed(2)
        cp._doc['available_compartment_weight'] = (cp.weight - totalCompartmentWeight).toFixed(2)
        loadedManifestWeight+=totalCompartmentWeight
        planeWeight = cp.planeId.maximumCapacity
      })
      resolve({result : compartments,loadedFlightWeight : loadedManifestWeight,availableWeightOnFLight :planeWeight - loadedManifestWeight })
    });
  }

  getCompartment(compartmentId) {
    return new Promise((resolve, reject) => {
      Compartment.findOne({ _id: compartmentId }).exec((err, result) => {
        if (err) {
          resolve({});
        } else {
          resolve(result)
        }
      });
    });
  }

  updateCompartment(planeId, cid,data) {
    return new Promise((resolve, reject) => {
      let weightCapacityReduced = 0;
      this.getCompartment(cid).then(compartment => {
        weightCapacityReduced = compartment.weight;
      })
      Compartment.updateOne({ _id: cid },data, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          // Updating the maximum capacity of plane
          this.getPlane(planeId).then(plane => {
            plane.maximumCapacity -= weightCapacityReduced;
            if (plane.maximumCapacity < 0) {
              plane.maximumCapacity = 0;
            }
            plane.maximumCapacity =plane.maximumCapacity+ Number(data.weight);
            this.updatePlane(planeId, plane);
          });
          resolve({ success: true, message: strings.string_response_updated });
        }
      })
    })
  }

  removeCompartment(planeId, cid) {
    return new Promise((resolve, reject) => {
      let weightCapacityReduced = 0;
      this.getCompartment(cid).then(compartment => {
        weightCapacityReduced = compartment.weight;
      })
      Compartment.deleteOne({ _id: cid }, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          // Updating the maximum capacity of plane
          this.getPlane(planeId).then(plane => {
            plane.maximumCapacity -= weightCapacityReduced;
            if (plane.maximumCapacity < 0) {
              plane.maximumCapacity = 0;
            }
            this.updatePlane(planeId, plane);
          });
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    })
  }
  // updatePlaneCapcity(planeId) {
  //   return new Promise((resolve, reject) => {
  //     client.smembers(COMPARTMENT_LIST + planeId, (err, ids) => {
  //       Promise.all(ids.map(id => {
  //         return lredis.hgetall(COMPARTMENT_PREFIX + id);
  //       })).then(comparts => {
  //         var total_weight = 0;
  //         var total_volume = 0;
  //         comparts.forEach(compart => {
  //           total_weight += Number(compart.weight);
  //           total_volume += Number(compart.volume);
  //         })
  //         this.getPlane(planeId).then(plane => {
  //           plane.maximum_capacity = total_weight;
  //           this.updatePlane(planeId, plane);
  //           resolve({
  //             total_weight: total_weight,
  //             total_volume: total_volume,
  //           });
  //         })
  //       })
  //     })
  //   });
  // }
  async getFlieghtName(){
    let now = manifest.shipDate;
    let year = "" + now.getFullYear();
    year = year.toString().substr(-2);
    let month = "" + (now.getMonth() + 1); if (month.length == 1) { month = "0" + month; }
    let day = "" + now.getDate(); if (day.length == 1) { day = "0" + day; }
    let hour = "" + now.getHours(); if (hour.length == 1) { hour = "0" + hour; }
    let minute = "" + now.getMinutes(); if (minute.length == 1) { minute = "0" + minute; }
    var h = "1A";
    if(parseInt(hour)>12){
      h ="2A";
    }
    if(parseInt(hour)==12 && parseInt(minute)>0){
      h ="2A";
    }    
    return day+ month + year + "-" + h ;    
  }
}

//========== DB Structure / Plane ==========//
/*
id: 2
pilotId: 6
warehouse: fll
tail_number: N1480K
aircraft_type: TWIN BEECH
maximum_capacity
*/

//========== DB Structure / Compartment ==========//
/*
id: 3
planeId: 2
weight: 200
name: Right Wing Locker
volume: 0
*/
module.exports = PlaneService;