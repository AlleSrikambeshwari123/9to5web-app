var redis = require('redis');
var lredis = require('./redis-local');
var dataContext = require('./dataContext');
var redisSearch = require('../redisearchclient/index');
const PREFIX = "location:"
const INDEX = "index:locations"
const LOCATION_COUNTER = "location:id";

const rs = redisSearch(redis, INDEX, {
  clientOptions: dataContext.clientOptions
});
class LocationService {
  constructor() {

  }

  getLocations() {
    return new Promise((resolve, reject) => {
      rs.search('*', { numberOfResults: 100 }, (err, locations) => {
        var locationsResult = [];
        console.log(locations, 'results from locations')
        locations.results.forEach(locDocument => {
          locationsResult.push(locDocument.doc);
        });
        resolve({ locations: locationsResult })
      })
    })
  }
  saveLocation(location) {
    return new Promise((resolve, reject) => {
      dataContext.redisClient.incr(LOCATION_COUNTER, (err, id) => {
        location.id = id;
        dataContext.redisClient.hmset(PREFIX + id, location, (errS, result) => {
          if (errS)
            resolve({ saved: false })
          rs.add(id, location);
          resolve({ saved: true })
        })
      })

    });
  }
  getLocation(id) {
    console.log('looking up id' + id);
    return new Promise((resolve, reject) => {
      rs.getDoc(id, (err, location) => {
        console.log(location, "from rs")
        resolve({ location: location.doc })
      })
    })
  }
  updateLocation(location) {
    return new Promise((resolve, reject) => {
      rs.update(location.id, location, (err, result) => {
        if (err)
          resolve({ saved: false });
        resolve({ saved: true })
      });
      dataContext.redisClient.hmset(PREFIX + location.id, location);

    });
  }
  rmLocation(id) {
    return new Promise((resolve, reject) => {
      rs.delDocument(INDEX, id);
      dataContext.redisClient.del(PREFIX + id);
    })
  }
}

module.exports = LocationService;