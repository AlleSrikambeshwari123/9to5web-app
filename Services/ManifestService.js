
var moment = require('moment');
const mongoose = require('mongoose');
const strings = require('../Res/strings');

// var lredis = require('./redis-local');
// var client = require('./dataContext').redisClient;

// const INIT_ID = strings.redis_id_manifest_init;
// const ID_COUNTER = strings.redis_id_manifest;
// const PREFIX = strings.redis_prefix_manifest;
// const OPEN_MANIFEST_LIST = strings.redis_prefix_manifest_open_list;

const PlaneService = require('./PlaneService');
const Manifest = require('../models/manifest');

var planeService = new PlaneService();
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
  shipped: {
    id: 4,
    title: 'Shipped'
  },
  verified: {
    id: 5,
    title: 'Verified'
  }
}

class ManifestService {
  // constructor() {
  //   this.mstages = manifestStages;
  //   this.checkSetup();
  // }
  // checkSetup() {
  //   client.exists(ID_COUNTER, (err, exist) => {
  //     if (Number(exist) == 0) {
  //       client.set(ID_COUNTER, INIT_ID);
  //     }
  //   });
  // }
  getStages() {
    return this.manifestStages;
  }

  createManifest(manifest) {
    return new Promise((resolve, reject) => {
      const generatedUniqId = mongoose.Types.ObjectId();
      manifest['_id'] = generatedUniqId;
      manifest['title'] = 'M-' + generatedUniqId;
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
            message: strings.string_response_created, 
            manifest: result
          });
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

  // changeStage(mid, stageId) {
  //   return new Promise((resolve, reject) => {
  //     var stage = this.getStageById(stageId);
  //     client.hmset(PREFIX + mid, {
  //       stageId: stage.id,
  //       stage: stage.title
  //     }, (err, result) => {
  //       if (stage.id == manifestStages.open.id)
  //         client.sadd(OPEN_MANIFEST_LIST, mid);
  //       else
  //         client.srem(OPEN_MANIFEST_LIST, mid);
  //       resolve({ success: true, message: strings.string_response_updated });
  //     });
  //   })
  // }

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
      const stage = this.getStageById(manifestStages.shipped.id);

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
      let totalPkgWeight = 0
      Manifest.find({})
      .populate([{path:'packages',select:'weight'},{path:'planeId'}])
      .exec((err, manifests) => {
        if (err) {
          resolve([]);
        } else {
          manifests.map(cp=>{
            cp.packages.map(w => totalPkgWeight+= w.weight)
            cp._doc['available_weight'] = (cp.planeId.maximumCapacity - totalPkgWeight).toFixed(2)
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
        {stageId: manifestStages.shipped.id},
        {stageId: manifestStages.verified.id}
      ]})
      .populate('planeId')
      .exec((err, manifests) => {
        if (err) {
          resolve([]);
        } else {
          manifests.forEach((manifest) => {
            manifest['plane'] = manifest['planeId'];
          })
          resolve(manifests);
        }
      });
    });
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
    if (id == manifestStages.shipped.id) {
      return manifestStages.shipped;
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