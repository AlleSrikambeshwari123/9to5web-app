
var moment = require('moment');
const strings = require('../Res/strings');

var lredis = require('./redis-local');
var client = require('./dataContext').redisClient;

const INIT_ID = strings.redis_id_manifest_init;
const ID_COUNTER = strings.redis_id_manifest;
const PREFIX = strings.redis_prefix_manifest;
const OPEN_MANIFEST_LIST = strings.redis_prefix_manifest_open_list;

var PlaneService = require('./PlaneService');

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
  constructor() {
    this.mstages = manifestStages;
    this.checkSetup();
  }
  checkSetup() {
    client.exists(ID_COUNTER, (err, exist) => {
      if (Number(exist) == 0) {
        client.set(ID_COUNTER, INIT_ID);
      }
    });
  }
  getStages() {
    return this.manifestStages;
  }

  createManifest(manifest) {
    return new Promise((resolve, reject) => {
     let obj_manifest = new Manifest(manifest);
     obj_manifest.save(async(err, result) => {
        if (err) {
          resolve({ success: false, message: err});
        } else {

          let title = 'M-' + result._id;
          let stageId = manifestStages.open.id;
          let stage = manifestStages.open.title;
          await Manifest.findOneAndUpdate({_id: result._id},{title: title, stageId: stageId, stage: stage})
          resolve({ success: true, message: strings.string_response_created, manifest: result});
        }
      })
    })

    // return new Promise((resolve, reject) => {
    //   client.incr(ID_COUNTER, (err, id) => {
    //     manifest.id = id;
    //     manifest.dateCreated = moment().utc().unix();
    //     manifest.title = 'M-' + id;
    //     manifest.stageId = manifestStages.open.id;
    //     manifest.stage = manifestStages.open.title;
    //     client.hmset(PREFIX + id, manifest);
    //     client.sadd(OPEN_MANIFEST_LIST, id);
    //     resolve({ success: true, message: strings.string_response_created, manifest: manifest });
    //   })
    // });
  }

  updateManifestDetails(id, details) {
    return new Promise(async(resolve, reject) => {
      Manifest.findOneAndUpdate({_id: id},details, (err, result) => {
          if (err) {
            resolve({ success: false, message: err});
          } else {
            resolve({ success: true, message:  strings.string_response_updated});
          }
      })
    })
  }

  changeStage(mid, stageId) {
    return new Promise((resolve, reject) => {
      var stage = this.getStageById(stageId);
      client.hmset(PREFIX + mid, {
        stageId: stage.id,
        stage: stage.title
      }, (err, result) => {
        if (stage.id == manifestStages.open.id)
          client.sadd(OPEN_MANIFEST_LIST, mid);
        else
          client.srem(OPEN_MANIFEST_LIST, mid);
        resolve({ success: true, message: strings.string_response_updated });
      });
    })
  }

  shipManifest(mid, username) {
    return new Promise((resolve, reject) => {
      client.hmset(PREFIX + mid, {
        shipDate: moment().utc().unix(),
        shippedBy: username
      }, (err, result) => {
        this.changeStage(mid, manifestStages.shipping.id);
        resolve({ success: true, message: strings.string_response_shipped });
      })
    })
  }
  receiveManifest(mid, username) {
    return new Promise((resolve, reject) => {
      client.hmset(PREFIX + mid, {
        receiveDate: moment().utc().unix(),
        receivedBy: username
      }, (err, result) => {
        this.changeStage(mid, manifestStages.shipped.id);
        resolve({ success: true, message: strings.string_response_received });
      })
    });
  }

  getManifest(manifestId) {
    return new Promise((resolve, reject) => {
      Manifest.findOne({_id: manifestId}).exec((err, result) => {
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
      let manifest = await Manifest.find({}).populate('plane')
      resolve(manifest)
    })
  }

  getOpenManifest() {
    return new Promise((resolve, reject) => {
      client.smembers(OPEN_MANIFEST_LIST, (err, ids) => {
        Promise.all(ids.map(id => {
          return lredis.hgetall(PREFIX + id);
        })).then(manifests => {
          resolve(manifests);
        })
      })
    });
  }

  getManifestProcessing() {
    return new Promise((resolve, reject) => {
      this.getManifests().then(manifests => {
        var list = manifests.filter(manifest => manifest.stageId == manifestStages.shipped.id || manifest.stageId == manifestStages.verified.id);
        resolve(list);
      })
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