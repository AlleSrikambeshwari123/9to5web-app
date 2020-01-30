
var moment = require('moment');
const strings = require('../Res/strings');

var lredis = require('./redis-local');
var client = require('./dataContext').redisClient;

const INIT_ID = strings.redis_id_manifest_init;
const ID_COUNTER = strings.redis_id_manifest;
const PREFIX = strings.redis_prefix_manifest;
const OPEN_MANIFEST_LIST = strings.redis_prefix_manifest_open_list;

var PlaneService = require('./PlaneService');
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
  shipped: {
    id: 3,
    title: 'Shipped'
  },
  verified: {
    id: 4,
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
      client.incr(ID_COUNTER, (err, id) => {
        manifest.id = id;
        manifest.dateCreated = moment().utc().unix();
        manifest.title = 'M-' + id;
        manifest.stageId = manifestStages.open.id;
        manifest.stage = manifestStages.open.title;
        client.hmset(PREFIX + id, manifest);
        client.sadd(OPEN_MANIFEST_LIST, id);
        resolve({ success: true, message: strings.string_response_created, manifest: manifest });
      })
    });
  }

  updateManifestDetails(id, details) {
    return new Promise((resolve, reject) => {
      client.hmset(PREFIX + id, details);
      resolve({ success: true, message: strings.string_response_updated });
    })
  }

  changeStage(mid, stages) {
    return new Promise((resolve, reject) => {
      var stage = this.getStageById(stages);
      client.hmset(PREFIX + mid, {
        stageId: stage.id,
        stege: stage.title
      }, (err, result) => {
        if (stage.id == manifestStages.open.id)
          client.sadd(OPEN_MANIFEST_LIST, mid);
        else
          client.srem(OPEN_MANIFEST_LIST, mid);
        resolve({ success: true, message: strings.string_response_updated });
      });
    })
  }
  shipManifest(mid, awb, user) {
    return new Promise((resolve, reject) => {
      client.hmset(PREFIX + mid, {
        shipDate: moment().format("YYYY-MM-DD"),
        shippedBy: user
      }, (err, result) => {
        this.changeStage(mid, manifestStages.shipped.id);
        resolve({ success: true, message: strings.string_response_shipped });
      })
    })
  }

  getManifest(manifestId) {
    return new Promise((resolve, reject) => {
      client.hgetall(PREFIX + manifestId).then(manifest => {
        if (manifest.planeId) {
          planeService.getPlane(manifest.planeId).then(planeInfo => {
            manifest.plane = planeInfo;
            resolve(manifest);
          })
        }
      })
    })
  }

  getManifests() {
    return new Promise((resolve, reject) => {
      client.keys(PREFIX + '*', (err, keys) => {
        Promise.all(keys.map(key => {
          return lredis.hgetall(key);
        })).then(manifests => {
          resolve(manifests);
        })
      })
    });
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
      client.del(PREFIX + mid);
      client.srem(OPEN_MANIFEST_LIST, mid);
      resolve({ success: true, message: strings.string_response_removed });
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

module.exports = ManifestService;