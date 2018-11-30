'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var redis = require('redis');
var lredis = require('../DataServices/redis-local');
var moment = require('moment');
var redisSearch = require('redisearchclient');
var MID_COUNTER = "global:midCounter";
var MID_PREFIX = "tew:manifest:";
var OPEN_MANIFEST = "manifest:open";
var CLOSED_MANIFEST = "manifest:closed";
var SHIPPED_MANIFEST = "manifest:shipped";
var VERIFIED_MANIFEST = "manifest:verified"; // manifest that have duties verified

var manifestTypes = {
    air: {
        id: 1,
        title: "Air Cargo",
        prefix: "M"
    },
    ocean: {
        id: 1,
        title: "Ocean",
        prefix: "S"
    },
    hazmat: {
        id: 3,
        title: "HAZMAT",
        prefix: "H"
    }
};
var manifestStages = {
    open: { id: 1, title: 'Open' },
    closed: { id: 2, title: 'Closed' },
    shipped: { id: 3, title: 'Shipped' },
    verified: { id: 4, title: 'Verified' }

};

var ManifestService = exports.ManifestService = function () {
    function ManifestService() {
        _classCallCheck(this, ManifestService);

        this.redisClient = lredis.client;
        this.mtypes = manifestTypes;
        this.mstages = manifestStages;
        //check to ensure we have the manifest counter 
        this.redisClient.exists(MID_COUNTER, function (err, res) {
            if (res == 0) {
                //create the manifest 
                lredis.set(MID_COUNTER, 100);
            }
            console.log(res);
        });
    }

    _createClass(ManifestService, [{
        key: 'getTypes',
        value: function getTypes() {
            return this.mytypes;
        }
    }, {
        key: 'getStages',
        value: function getStages() {
            return this.manifestStages;
        }
    }, {
        key: 'createNewManifest',
        value: function createNewManifest(type, user) {
            var _this = this;

            //we have some rules to follow here 
            //1. a new manifest cannot be created if the previous manifest is not closed 
            //check for open manifest first 
            return new Promise(function (resolve, reject) {
                lredis.setSize(OPEN_MANIFEST).then(function (openCount) {
                    console.log("openCount");
                    console.log(openCount);
                    if (openCount > 0) {
                        //we can't add the manifest reject 
                        reject({
                            "message": "there is an open manifest please close it"
                        });
                    } else {
                        _this.redisClient.multi().incr(MID_COUNTER).exec(function (err, resp) {
                            console.log(resp);
                            var manifest = {
                                mid: resp[0],
                                title: '',
                                dateCreated: moment().format("YYYY-MM-DD"),
                                mtypeId: type.id,
                                stageId: manifestStages.open.id,
                                createdBy: user
                            };
                            _this.redisClient.multi().hmset(MID_PREFIX + manifest.mid, manifest).sadd(OPEN_MANIFEST, manifest.mid).exec(function (err, results) {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(results);
                                }
                            });
                        });
                    }
                });
            });
        }
    }, {
        key: 'closeManifest',
        value: function closeManifest(mid) {}
    }, {
        key: 'shipManifest',
        value: function shipManifest(mid) {}
    }, {
        key: 'deleteManifest',
        value: function deleteManifest() {}
    }]);

    return ManifestService;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlJlZGlzU2VydmljZXMvTWFuaWZlc3RTZXJ2aWNlLmVzNiJdLCJuYW1lcyI6WyJyZWRpcyIsInJlcXVpcmUiLCJscmVkaXMiLCJtb21lbnQiLCJyZWRpc1NlYXJjaCIsIk1JRF9DT1VOVEVSIiwiTUlEX1BSRUZJWCIsIk9QRU5fTUFOSUZFU1QiLCJDTE9TRURfTUFOSUZFU1QiLCJTSElQUEVEX01BTklGRVNUIiwiVkVSSUZJRURfTUFOSUZFU1QiLCJtYW5pZmVzdFR5cGVzIiwiYWlyIiwiaWQiLCJ0aXRsZSIsInByZWZpeCIsIm9jZWFuIiwiaGF6bWF0IiwibWFuaWZlc3RTdGFnZXMiLCJvcGVuIiwiY2xvc2VkIiwic2hpcHBlZCIsInZlcmlmaWVkIiwiTWFuaWZlc3RTZXJ2aWNlIiwicmVkaXNDbGllbnQiLCJjbGllbnQiLCJtdHlwZXMiLCJtc3RhZ2VzIiwiZXhpc3RzIiwiZXJyIiwicmVzIiwic2V0IiwiY29uc29sZSIsImxvZyIsIm15dHlwZXMiLCJ0eXBlIiwidXNlciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwic2V0U2l6ZSIsInRoZW4iLCJvcGVuQ291bnQiLCJtdWx0aSIsImluY3IiLCJleGVjIiwicmVzcCIsIm1hbmlmZXN0IiwibWlkIiwiZGF0ZUNyZWF0ZWQiLCJmb3JtYXQiLCJtdHlwZUlkIiwic3RhZ2VJZCIsImNyZWF0ZWRCeSIsImhtc2V0Iiwic2FkZCIsInJlc3VsdHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxRQUFRQyxRQUFRLE9BQVIsQ0FBWjtBQUNBLElBQUlDLFNBQVNELFFBQVEsNkJBQVIsQ0FBYjtBQUNBLElBQUlFLFNBQVNGLFFBQVEsUUFBUixDQUFiO0FBQ0EsSUFBSUcsY0FBY0gsUUFBUSxrQkFBUixDQUFsQjtBQUNBLElBQU1JLGNBQWMsbUJBQXBCO0FBQ0EsSUFBTUMsYUFBYSxlQUFuQjtBQUNBLElBQU1DLGdCQUFnQixlQUF0QjtBQUNBLElBQU1DLGtCQUFrQixpQkFBeEI7QUFDQSxJ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QUNKLDZCQVRMO0FBVUgseUJBdEJEO0FBdUJIO0FBRUosaUJBcENEO0FBc0NILGFBdkNNLENBQVA7QUF5Q0g7OztzQ0FDYVIsRyxFQUFJLENBRWpCOzs7cUNBQ1lBLEcsRUFBSSxDQUVoQjs7O3lDQUNnQixDQUVoQiIsImZpbGUiOiJSZWRpc1NlcnZpY2VzL01hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciByZWRpcyA9IHJlcXVpcmUoJ3JlZGlzJyk7XHJcbnZhciBscmVkaXMgPSByZXF1aXJlKCcuLi9EYXRhU2VydmljZXMvcmVkaXMtbG9jYWwnKTtcclxudmFyIG1vbWVudCA9IHJlcXVpcmUoJ21vbWVudCcpO1xyXG52YXIgcmVkaXNTZWFyY2ggPSByZXF1aXJlKCdyZWRpc2VhcmNoY2xpZW50Jyk7XHJcbmNvbnN0IE1JRF9DT1VOVEVSID0gXCJnbG9iYWw6bWlkQ291bnRlclwiO1xyXG5jb25zdCBNSURfUFJFRklYID0gXCJ0ZXc6bWFuaWZlc3Q6XCI7XHJcbmNvbnN0IE9QRU5fTUFOSUZFU1QgPSBcIm1hbmlmZXN0Om9wZW5cIjtcclxuY29uc3QgQ0xPU0VEX01BTklGRVNUID0gXCJtYW5pZmVzdDpjbG9zZWRcIlxyXG5jb25zdCBTSElQUEVEX01BTklGRVNUID0gXCJtYW5pZmVzdDpzaGlwcGVkXCJcclxuY29uc3QgVkVSSUZJRURfTUFOSUZFU1QgPSBcIm1hbmlmZXN0OnZlcmlmaWVkXCI7IC8vIG1hbmlmZXN0IHRoYXQgaGF2ZSBkdXRpZXMgdmVyaWZpZWRcclxuXHJcbnZhciBtYW5pZmVzdFR5cGVzID0ge1xyXG4gICAgYWlyOiB7XHJcbiAgICAgICAgaWQ6IDEsXHJcbiAgICAgICAgdGl0bGU6IFwiQWlyIENhcmdvXCIsXHJcbiAgICAgICAgcHJlZml4OiBcIk1cIlxyXG4gICAgfSxcclxuICAgIG9jZWFuOiB7XHJcbiAgICAgICAgaWQ6IDEsXHJcbiAgICAgICAgdGl0bGU6IFwiT2NlYW5cIixcclxuICAgICAgICBwcmVmaXg6IFwiU1wiXHJcbiAgICB9LFxyXG4gICAgaGF6bWF0OiB7XHJcbiAgICAgICAgaWQ6IDMsXHJcbiAgICAgICAgdGl0bGU6IFwiSEFaTUFUXCIsXHJcbiAgICAgICAgcHJlZml4OiBcIkhcIlxyXG4gICAgfVxyXG59XHJcbnZhciBtYW5pZmVzdFN0YWdlcyA9IHtcclxuICAgIG9wZW46IHtpZDoxLHRpdGxlOidPcGVuJ30sXHJcbiAgICBjbG9zZWQ6IHtpZDoyLHRpdGxlOidDbG9zZWQnfSxcclxuICAgIHNoaXBwZWQ6IHtpZDozLHRpdGxlOidTaGlwcGVkJ30sXHJcbiAgICB2ZXJpZmllZDoge2lkOjQsdGl0bGU6J1ZlcmlmaWVkJ31cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYW5pZmVzdFNlcnZpY2Uge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMucmVkaXNDbGllbnQgPSBscmVkaXMuY2xpZW50O1xyXG4gICAgICAgIHRoaXMubXR5cGVzID0gbWFuaWZlc3RUeXBlczsgXHJcbiAgICAgICAgdGhpcy5tc3RhZ2VzID0gbWFuaWZlc3RTdGFnZXM7XHJcbiAgICAgICAgLy9jaGVjayB0byBlbnN1cmUgd2UgaGF2ZSB0aGUgbWFuaWZlc3QgY291bnRlciBcclxuICAgICAgICB0aGlzLnJlZGlzQ2xpZW50LmV4aXN0cyhNSURfQ09VTlRFUiwgKGVyciwgcmVzKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXMgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgLy9jcmVhdGUgdGhlIG1hbmlmZXN0IFxyXG4gICAgICAgICAgICAgICAgbHJlZGlzLnNldChNSURfQ09VTlRFUiwgMTAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZXMpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZ2V0VHlwZXMoKXtcclxuICAgICAgICByZXR1cm4gdGhpcy5teXR5cGVzXHJcbiAgICB9XHJcbiAgICBnZXRTdGFnZXMoKXtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYW5pZmVzdFN0YWdlczsgXHJcbiAgICB9XHJcbiAgICBjcmVhdGVOZXdNYW5pZmVzdCh0eXBlLCB1c2VyKSB7XHJcbiAgICAgICAgLy93ZSBoYXZlIHNvbWUgcnVsZXMgdG8gZm9sbG93IGhlcmUgXHJcbiAgICAgICAgLy8xLiBhIG5ldyBtYW5pZmVzdCBjYW5ub3QgYmUgY3JlYXRlZCBpZiB0aGUgcHJldmlvdXMgbWFuaWZlc3QgaXMgbm90IGNsb3NlZCBcclxuICAgICAgICAvL2NoZWNrIGZvciBvcGVuIG1hbmlmZXN0IGZpcnN0IFxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGxyZWRpcy5zZXRTaXplKE9QRU5fTUFOSUZFU1QpLnRoZW4oKG9wZW5Db3VudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJvcGVuQ291bnRcIilcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG9wZW5Db3VudCk7XHJcbiAgICAgICAgICAgICAgICBpZiAob3BlbkNvdW50ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vd2UgY2FuJ3QgYWRkIHRoZSBtYW5pZmVzdCByZWplY3QgXHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtZXNzYWdlXCI6IFwidGhlcmUgaXMgYW4gb3BlbiBtYW5pZmVzdCBwbGVhc2UgY2xvc2UgaXRcIlxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZGlzQ2xpZW50Lm11bHRpKClcclxuICAgICAgICAgICAgICAgICAgICAuaW5jcihNSURfQ09VTlRFUilcclxuICAgICAgICAgICAgICAgICAgICAuZXhlYygoZXJyLCByZXNwKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3ApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWFuaWZlc3QgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaWQ6IHJlc3BbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlQ3JlYXRlZDogbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG10eXBlSWQ6IHR5cGUuaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFnZUlkOiBtYW5pZmVzdFN0YWdlcy5vcGVuLmlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlZEJ5IDogdXNlclxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZGlzQ2xpZW50Lm11bHRpKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5obXNldChNSURfUFJFRklYICsgbWFuaWZlc3QubWlkLCBtYW5pZmVzdClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zYWRkKE9QRU5fTUFOSUZFU1QsbWFuaWZlc3QubWlkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmV4ZWMoKGVyciwgcmVzdWx0cykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHRzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcbiAgICBjbG9zZU1hbmlmZXN0KG1pZCl7XHJcblxyXG4gICAgfVxyXG4gICAgc2hpcE1hbmlmZXN0KG1pZCl7XHJcblxyXG4gICAgfVxyXG4gICAgZGVsZXRlTWFuaWZlc3QoKSB7XHJcblxyXG4gICAgfVxyXG59Il19
