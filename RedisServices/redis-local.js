var redis = require('redis');
const NSPACE_CUST = "skybox:";
const NSPACE_BOX = "tew:owner:";
var env = require('../environment')
var client = redis.createClient(env.redis_port, env.redis_host, {
    auth_pass: env.redis_pass,
    // tls:{
    //     servername: 'core.shiptropical.com'
    // }
});
var searchClientOption = {
    'host': env.redis_host,
    'port': env.redis_port,
    auth_pass: env.redis_pass,
    // tls:{ servername:env.redis_host}
}

var get = (key) => {
    return new Promise((resolve, reject) => {
        if (key == null) reject();
        client.get(key, (error, data) => {
            if (error) reject(error);
            resolve(data)
        });
    });
}
var setHashField = (key, field, value)=> { 
    return new Promise((resolve, reject) => {
        if (key == null) reject();
        
        client.hset(key,field,value, (error, data) => {
            if (error) reject(error);
            resolve(data)
        });
    });
}
var getKeys = (ptrn) => {
    return new Promise((resolve, reject) => {
        if (ptrn == null) reject();
        client.keys(ptrn, (error, data) => {
            if (error) reject(error);
            resolve(data)
        });
    });
}
var union = (arr) => {
    return new Promise((resolve, reject) => {
        if (arr == null) reject();

        client.sunion(arr, (error, data) => {
            if (error) reject(error);
            resolve(data)
        });
    });
}
var set = (key, value) => {
    return new Promise((resolve, reject) => {
        if (key == null) reject();
        client.set(key, value, (error, data) => {
            if (error) reject(error);
            resolve(data)
        });
    });
}
var srem = (key, value) => {
    return new Promise((resolve, reject) => {
        if (key == null) reject();
        client.srem(key, value, (error, data) => {
            if (error) reject(error);
            resolve(data)
        });
    });
}
var hashset = (key, value) => {
    return new Promise((resolve, reject) => {
        if (key == null) reject();
        client.hmset(key, value, (error, data) => {
            if (error)
                reject(error);
            resolve(data);
        });
    });

}
var getPackage = (key) => {
    return new Promise((resolve, reject) => {
        //console.log('key = packages:' +key); 
        if (key == null) reject();
        client.hgetall('packages:' + key, (error, data) => {

            if (error) {
                reject(error);
                console.log(error);
            }
            //console.log(data);
            resolve(data)
        });
    });
}
var setAdd = (key, value) => {
    return new Promise((resolve, reject) => {
        if (key == null) reject();
        client.sadd(key, value, (error, data) => {

            if (error) reject(error);
            resolve(data)
        });
    });
}
var getMembers = (key) => {
    return new Promise((resolve, reject) => {
        if (key == null) reject();
        client.smembers(key, (error, data) => {
            if (error) {
                reject(error);

            }
            // console.log('printing smembers')
            // console.log(data);
            resolve(data)
        });
    });
}
var hmgetall = (key) => {
    return new Promise((resolve, reject) => {
        if (key == null) reject();
        client.hgetall(key, (error, data) => {
            if (error) reject(error);
            resolve(data)
        });
    });
}

var getNSRecords = (key) => {
    return new Promise((resolve, reject) => {
        if (key == null) reject();
        client.scan('0', 'MATCH', key, (error, data) => {
            if (error) reject(error);
            resolve(data)
        });
    });
}
var delkey = (key) => {
    return new Promise((resolve, reject) => {
        if (key == null) reject();
        client.del(key, (error, data) => {
            if (error) reject(error);
            resolve(data)
        });
    });
}

var sCard = (key) => {
    return new Promise((resolve, reject) => {

        if (key == null) reject();
        client.scard(key, (error, data) => {
            if (error) reject(error);
            console.log('getting the size of ' + key);
            console.log(data);
            resolve(data)
        });
    });
}
var queue = (item) => {
    return new Promise((resolve, reject) => {
        client.lpush
        client.lpush("process-packages", item, (error, data) => {
            resolve(data) ;
        });

    });
}


var rmNamesforLookup = (compoundKey) => {
    var skybox = compoundKey.substring(compoundKey.indexOf(':'));
    console.log(skybox);
    return "tew:owners" + skybox;
}
module.exports.client = client; 
module.exports.set = set;
module.exports.seth = setHashField; 
module.exports.get = get;
module.exports.getPackage = getPackage;
module.exports.getNS = getNSRecords;
module.exports.setAdd = setAdd;
module.exports.del = delkey;
module.exports.union = union;
module.exports.getKeys = getKeys;
module.exports.hmset = hashset;
module.exports.getMembers = getMembers;
module.exports.hgetall = hmgetall;
module.exports.srem = srem;
module.exports.setSize = sCard;
module.exports.mProcessQueue = queue; 
module.exports.client = client;
module.exports.searchClientDetails = searchClientOption