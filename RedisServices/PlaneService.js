const strings = require('../Res/strings');

// Redis
var lredis = require('./redis-local');
var client = require('./dataContext').redisClient;

const PREFIX = strings.redis_prefix_planes;
const PLANE_COUNTER = strings.redis_id_plane;
const PLANE_LIST = strings.redis_prefix_planes_list;

const COMPARTMENT_PREFIX = strings.redis_prefix_plane_compartment;
const COMPARTMENT_COUNTER = strings.redis_id_compartment_plane;
const COMPARTMENT_LIST = strings.redis_prefix_plane_compartment_list;

class PlaneService {
    addPlane(plane) {
        return new Promise((resolve, reject) => {
            client.incr(PLANE_COUNTER, (err, id) => {
                if (err) resolve({ success: false, message: strings.string_response_error });
                plane.id = id;
                plane.maximum_capacity = "";
                client.hmset(PREFIX + id, plane);
                client.sadd(PLANE_LIST + plane.warehouse, id);
                resolve({ success: true, message: strings.string_response_created });
            })
        })
    }
    updatePlane(id, plane) {
        return new Promise((resolve, reject) => {
            client.exists(PREFIX + id, (err, exist) => {
                if (Number(exist) == 1) {
                    client.hmset(PREFIX + id, plane);
                    resolve({ success: true, message: strings.string_response_updated });
                } else {
                    resolve({ success: false, message: strings.string_not_found_user });
                }
            });
        });
    }
    removePlane(planeId) {
        return new Promise((resolve, reject) => {
            client.hgetall(PREFIX + planeId, (err, plane) => {
                if (err) resolve({ success: false, message: strings.string_response_error });
                if (plane.id == undefined) resolve({ success: false, message: strings.string_not_found_plane });

                client.srem(PLANE_LIST + plane.warehouse, planeId);
                client.del(PREFIX + planeId, (err, result) => {
                    if (err) resolve({ success: false, message: strings.string_response_error });
                    resolve({ success: true, message: strings.string_response_removed });
                })
            })
        });
    }
    getPlane(planeId) {
        return new Promise((resolve, reject) => {
            client.hgetall(PREFIX + planeId, (err, plane) => {
                if (err) resolve({});
                resolve(plane);
            })
        })
    }
    getPlanes() {
        return new Promise((resolve, reject) => {
            client.keys(PREFIX + '*', (err, keys) => {
                if (err) resolve([]);
                Promise.all(keys.map(key => {
                    return lredis.hgetall(key);
                })).then(planes => {
                    resolve(planes);
                })
            })
        });
    }

    // Compartment
    addCompartment(compartment) {
        return new Promise((resolve, reject) => {
            client.incr(COMPARTMENT_COUNTER, (err, id) => {
                compartment.id = id;
                if (isNaN(Number(compartment.volume)))
                    compartment.volume = 0;

                client.hmset(COMPARTMENT_PREFIX + id, compartment);
                client.sadd(COMPARTMENT_LIST + compartment.planeId, id);
                this.updatePlaneCapcity(compartment.planeId);
                resolve({ saved: true })
            })
        })
    }

    getCompartments(planeId) {
        return new Promise((resolve, reject) => {
            client.smembers(COMPARTMENT_LIST + planeId, (err, ids) => {
                if (err) resolve([]);
                Promise.all(ids.map(id => {
                    return lredis.hgetall(COMPARTMENT_PREFIX + id);
                })).then(comparts => {
                    resolve(comparts);
                })
            })
        });
    }

    removeCompartment(planeId, cid) {
        return new Promise((resolve, reject) => {
            client.del(COMPARTMENT_PREFIX + cid);
            client.srem(COMPARTMENT_LIST + planeId, cid);
            this.updatePlaneCapcity(planeId);
            resolve({ success: true, message: strings.string_response_removed });
        })
    }

    updatePlaneCapcity(planeId) {
        return new Promise((resolve, reject) => {
            client.smembers(COMPARTMENT_LIST + planeId, (err, ids) => {
                Promise.all(ids.map(id => {
                    return lredis.hgetall(COMPARTMENT_PREFIX + id);
                })).then(comparts => {
                    var total_weight = 0;
                    var total_volume = 0;
                    comparts.forEach(compart => {
                        total_weight += Number(compart.weight);
                        total_volume += Number(compart.volume);
                    })
                    this.getPlane(planeId).then(plane => {
                        plane.maximum_capacity = total_weight;
                        this.updatePlane(planeId, plane);
                        resolve({
                            total_weight: total_weight,
                            total_volume: total_volume,
                        });
                    })
                })
            })
        });
    }
}
module.exports = PlaneService;