var client = require('./dataContext.js').redisClient;
var lredis = require('./redis-local');

exports.search = (PREFIX, filters) => {
  return new Promise(function (resolve, reject) {
    client.keys(PREFIX + '*', function (err, keys) {
      if (err) {
        resolve([]);
      } else {
        Promise.all(keys.map(function (key) {
          return lredis.hgetall(key);
        })).then(function (dataList) {
          var result = [];
          dataList.map(function (data) {
            let matchedFilters = 0;
            filters.map(filter => {
              if (data[filter.field] == filter.value) {
                matchedFilters++;
              }
            })
            if (matchedFilters == filters.length) {
              result.push(data);
            }
          })
          resolve(result);
        });
      }
    })
  });
}
exports.searchInRange = (PREFIX, field, minValue, maxValue) => {
  return new Promise(function (resolve, reject) {
    client.keys(PREFIX + '*', function (err, keys) {
      if (err) {
        resolve([]);
      } else {
        Promise.all(keys.map(function (key) {
          return lredis.hgetall(key);
        })).then(function (dataList) {
          var result = [];
          dataList.map(function (data) {
            var value = Number(data[field]);
            if (value >= minValue && value <= maxValue) {
              result.push(data);
            }
          })
          resolve(result);
        });
      }
    })
  });
}