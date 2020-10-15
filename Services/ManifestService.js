
var moment = require('moment');

const strings = require('../Res/strings');
const Manifest = require('../models/manifest');
const Package = require('../models/package')
const manifestStages = {
  open: {
    id: 1,
    title: 'Open'
  },
  closed: {
    id: 2,
    title: 'Closed'
  },
  shipping: {
    id: 3,
    title: 'Shipping'
  },
  received: {
    id: 4,
    title: 'Received'
  },
  verified: {
    id: 5,
    title: 'Verified'
  }
}

class ManifestService {
  getStages() {
    return this.manifestStages;
  }

  createManifest(manifest) {
    return new Promise((resolve, reject) => {
      manifest['title'] = moment(manifest.shipDate, "MMM DD,YYYY").format('MMDDYY')+"/"+manifest.time;
      manifest['stageId'] = manifestStages.open.id;
      manifest['stage'] = manifestStages.open.title;

      let objManifest = new Manifest(manifest);
      objManifest.save(async (err, result) => {
        if (err) {
          resolve({ success: false, message: err});
        } else {
          manifest['id'] = manifest['_id'];
          resolve({ 
            success: true, 
            status : manifest.status,
            message: strings.string_response_created, 
            manifest: result
          });
        }
      })
    })
  }

  createManifestCloneFromOriginal(manifest) {
    return new Promise(async (resolve, reject) => {
      let pkgsClone =[]
      manifest['title'] = moment(manifest.shipDate, "MMM DD,YYYY").format('MMDDYY')+"/"+manifest.time;
      manifest['stageId'] = manifestStages.open.id;
      manifest['stage'] = manifestStages.open.title;
      const pkgs = await Package.find({manifestId:manifest.originalManifestId})
      if (pkgs !==  null){
        pkgs.map(pkg=>{
          pkgsClone.push(pkg._id)
        })
        manifest['clonePackages'] = pkgsClone
      }
      let objManifest = new Manifest(manifest);
      objManifest.save(async (err, result) => {
        if (err) {
          resolve({ success: false, message: err});
        } else {
          if (pkgs !==  null){
            pkgs.map(pkg=>{
              return this.updateCloneManifestIdOnPackages(pkg._id,result.id)
            })
          }
          resolve({ 
            success: true, 
            message: strings.string_response_created, 
            manifest: result
          });
        }
      })
    })
  }
  updateCloneManifestIdOnPackages(id,manifestId){
    return new Promise((resolve,reject)=>{
      Package.findOneAndUpdate({_id:id},{cloneManifestId:manifestId},(err,result)=>{
        if (err) {
          resolve({ success: false, message: err});
        } else {
          resolve({ success: true, message:  strings.string_response_updated});
        }
      })
    })
  }
  updateManifestDetails(id, details) {
    return new Promise((resolve, reject) => {
      Manifest.findOneAndUpdate({_id: id}, details, (err, result) => {
        if (err) {
          resolve({ success: false, message: err});
        } else {
          resolve({ success: true, message:  strings.string_response_updated});
        }
      })
    })
  }
  
  shipManifest(mid, userId) {
    return new Promise((resolve, reject) => {
      const stage = this.getStageById(manifestStages.shipping.id);

      Manifest.findByIdAndUpdate({_id: mid}, {
        shipDate: new Date(),
        shippedBy: userId,
        stageId: stage.id,
        stage: stage.title
      }, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_shipped });
        }
      });
    })
  }
  
  receiveManifest(mid, userId) {
    return new Promise((resolve, reject) => {
      const stage = this.getStageById(manifestStages.received.id);

      Manifest.findByIdAndUpdate({_id: mid}, {
        receiveDate: new Date(),
        receivedBy: userId,
        stageId: stage.id,
        stage: stage.title
      }, (err, result) => {
        if (err) {
          resolve({ success: false, message: strings.string_response_error });
        } else {
          resolve({ success: true, message: strings.string_response_received });
        }
      });
    });
  }
  getManifest(manifestId) {
    return new Promise((resolve, reject) => {
      Manifest.findOne({_id: manifestId})
      .populate('airportFromId')
      .populate('airportToId')
      .populate('planeId')
      .exec((err, result) => {
        if(err){
          resolve({});
        }else{
          resolve(result)
        }
      });
    });
  }

  getManifests() {
    return new Promise(async(resolve, reject) => {
      let planeArray = []
      Manifest.find({})
      .populate([{path:'packages',select:'weight'},{path:'planeId'}])
      .exec((err, manifests) => {
        if (err) {
          resolve([]);
        } else {
          manifests.map(cp=>{
            let totalPkgWeight = 0
            cp.packages.map(w => totalPkgWeight+= w.weight)
            if(totalPkgWeight == NaN || !totalPkgWeight)
               totalPkgWeight =0
            let planeActualCapacity = cp.planeId.maximumCapacity
            let flag = 0;
            planeArray.forEach(data=>{
              if(data.id == cp.planeId._id){
                data.availCapacity = data.availCapacity - totalPkgWeight
                planeActualCapacity = data.availCapacity 
                flag = 1
              }
            })
            if(flag == 0){
              planeActualCapacity = cp.planeId.maximumCapacity -totalPkgWeight
              planeArray.push({id :cp.planeId._id,availCapacity : planeActualCapacity})
            }
            cp._doc['available_weight'] = (planeActualCapacity).toFixed(2)
          })
          resolve(manifests);
        }
      });
    })
  }

  getOpenManifest() {
    return new Promise((resolve, reject) => {
      Manifest.find({stageId : manifestStages.open.id}, (err, manifests) => {
        if (err) {
          resolve([]);
        } else {
          resolve(manifests);
        }
      });
    });
  }

  getManifestProcessing() {
    return new Promise((resolve, reject) => {
      Manifest.find({$or: [
        {stageId: manifestStages.received.id},
        {stageId: manifestStages.verified.id}
      ]})
      .populate('planeId')
      .populate('customerId')
      .exec( (err, manifests) => {
        if (err) {
          resolve([]);
        } else {
          Promise.all(manifests.map(async (manifest,i) => {
            manifest['plane'] = manifest['planeId'];
            let pkg = await Package.find({manifestId:manifest.id})
            console.log({manifest,pkg})
            if(pkg.length == 0) delete manifests[i]
          })
          ).then(()=>{
            console.log({manifests})
             resolve(manifests);
          })
        }
      });
    });
  }

  get_all_incoming_manifest(req){
    var start = req.body.start ? parseInt(req.body.start) : 0;
    var length = req.body.length ? parseInt(req.body.length) : 10;      
    var field = req.body['order[0][column]'] ?parseInt(req.body['order[0][column]']) : 0;
    var columns = {0:'title', 1: 'createdAt', 2: 'plane.number'} 
    
    var dir = req.body['order[0][dir]'] ? req.body['order[0][dir]'] : 0;
    var sort = (dir=='asc') ? 1 : -1;
    var sortField = columns[field];

    var search = req.body['search[value]'] ? req.body['search[value]'] : ''; 
    var searchData = {
      $or:[
        {stageId: manifestStages.received.id},
        {stageId: manifestStages.verified.id}
      ]
    };

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
        {title:{'$regex' : search, '$options' : 'i'}},
        {"plane.number":{'$regex' : search, '$options' : 'i'}}        
      ]
    }
   
    return new Promise(async (resolve, reject) => {
     var totalRecord =  await  Manifest.aggregate([
       {
          $match:searchData        
        },
        {
          $lookup:{
            from:"planes",
            localField: 'planeId',
            foreignField: '_id',
            as:"plane"
          }
        },
        {
          $lookup:{
            from:"customers",
            localField: 'customerId',
            foreignField: '_id',
            as:"customer"
          }
        },
        {
          $lookup:{
            from:"packages",
            localField: '_id',
            foreignField: 'manifestId',
            as:"package"
          }
        },
       { 
          $addFields: {
            packageLength: {$size: '$package'}
          }
        },
        {
          $match: {
            packageLength: {$gt: 1}
          }
        },
        {$count:"total"}
      ]);
      if(totalRecord && totalRecord.length && totalRecord[0].total){
        Manifest.aggregate([
          {
            $match:searchData       
          },
          {
            $lookup:{
              from:"planes",
              localField: 'planeId',
              foreignField: '_id',
              as:"plane"
            }
          },
          {$unwind: "$plane"},
          {
            $lookup:{
              from:"customers",
              localField: 'customerId',
              foreignField: '_id',
              as:"customer"
            }
          },
          {
            $lookup:{
              from:"packages",
              localField: '_id',
              foreignField: 'manifestId',
              as:"package"
            }
          },
          { 
            $addFields: {
              packageLength: {$size: '$package'}
            }
          },
          {
            $match: {
              packageLength: {$gt: 1}
            }
          },
          {
            $sort : { [sortField] : sort}, 
          },
          {
            $skip:start,
          },
          {
            $limit:length,
          }
        ]).exec((err,result)=>{          
          resolve({total:totalRecord[0].total, manifests: result});
        })
      }else{
        resolve({total:0, menifests: []});
      }
    })
  }

  deleteManifest(mid) {
    return new Promise((resolve, reject) => {
      Manifest.deleteOne({_id: mid}, (err, result) => {
        if (err) {
          resolve({ success: false, message: err });
        } else {
          resolve({ success: true, message: strings.string_response_removed });
        }
      })
    });
  }

  getStageById(id) {
    if (id == manifestStages.open.id) {
      return manifestStages.open;
    }
    if (id == manifestStages.closed.id) {
      return manifestStages.closed;
    }
    if (id == manifestStages.shipping.id) {
      return manifestStages.shipping;
    }
    if (id == manifestStages.received.id) {
      return manifestStages.received;
    }
    if (id == manifestStages.verified.id) {
      return manifestStages.verified;
    }
    return manifestStages.open;
  }
}

//========== DB Structure ==========//
/* 
id: 102
planeId: 1
dateCreated:
title: M-102
shipDate: Jan 30, 2020 22:14
shippedBy:
stage: Open
stageId: 1
*/
module.exports = ManifestService;