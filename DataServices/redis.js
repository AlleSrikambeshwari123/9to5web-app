var redis = require('redis');
const NSPACE_CUST = "skybox:";
const NSPACE_BOX = "tew:owner:";

var client = redis.createClient(6380, "tew-redis.redis.cache.windows.net", {
    auth_pass: 'euAj2NlScSkbO52pTt0LoEX7RajlFnZlmJ+baDt05Cw=',
    tls: {
        servername: 'tew-redis.redis.cache.windows.net'
    }
});

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

//SORTED SET 
var customerList = (pageSize, currentPage) => {
    var startIndex = (currentPage - 1) * pageSize;
    var endIndex = startIndex + (pageSize - 1);
    console.log(`starting index is ${startIndex} and end index is ${endIndex}`)
    var args = ['customer:names', "[A", '(Z\xff', "LIMIT", `${startIndex}`, `${pageSize}`]
    return new Promise((resolve, reject) => {
        client.zrangebylex(args, (error, dataR) => {
            client.zcard('customer:names', (err, data) => {
                var psIndex = 1;
                var peIndex = 10;
                if (currentPage >= 10) {
                    psIndex = currentPage - 5;
                    peIndex = currentPage + 5;
                }
                if (peIndex + 5 > Number(data) / pageSize) {
                    peIndex = Number(data) / pageSize;
                }
                var pagerInfo = {
                    pages: Number(data) / pageSize,
                    currentPage: currentPage,
                    startPage: psIndex,
                    endPage: peIndex,
                    totalRecords: data
                }
                Promise.all(dataR.map(rmNamesforLookup)).then((boxes) => {
                    pagerInfo.boxes = boxes;
                    resolve(pagerInfo);
                })
            })

            // resolve(data); 
        });
    })
}
var customerSearch = (searchText, pageSize, currentPage) => {
    var startIndex = (currentPage - 1) * pageSize;
    var endIndex = startIndex + (pageSize - 1);
    console.log(`starting index is ${startIndex} and end index is ${endIndex}`)
    var args = ['customer:names', `[${searchText}`, `(${searchText}\xff`, "LIMIT", `${startIndex}`, `${pageSize}`]
    return new Promise((resolve, reject) => {

        client.zscan('customer:names', '0', 'MATCH', `*${searchText}*`, (error, dataR) => {
            client.zcard('customer:names', (err, data) => {
                var psIndex = 1;
                var peIndex = 10;
                if (currentPage >= 10) {
                    psIndex = currentPage - 5;
                    peIndex = currentPage + 5;
                }
                if (peIndex + 5 > Number(data) / pageSize) {
                    peIndex = Number(data) / pageSize;
                }
                var pagerInfo = {
                    pages: Number(data) / pageSize,
                    currentPage: currentPage,
                    startPage: psIndex,
                    endPage: peIndex,
                    totalRecords: data
                }
                console.log(dataR);

            })

            // resolve(data); 
        });
    })
}

var rmNamesforLookup = (compoundKey) => {
    var skybox = compoundKey.substring(compoundKey.indexOf(':'));
    console.log(skybox);
    return "tew:owners" + skybox;
}
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
module.exports.customerList = customerList;
module.exports.customerSearch = customerSearch;