var redis = require('redis');
var lredis = require('../DataServices/redis-local');
var redisSearch = require('redisearchclient');

export class CustomerService {
    constructor() {
        this.mySearch = redisSearch(redis, 'tew:customers', {
            clientOptions: {
                'host': 'redis-14897.c2822.us-east-1-mz.ec2.cloud.rlrcp.com',
                'port': '14897',
                auth_pass: 't5atRuWQlOW7Vp2uhZpQivcIotDmTPpl'
            }
        });
    }

    listCustomers(page, pageSize) {
        return new Promise((resolve, reject) => {
            var offsetVal = (page - 1) * pageSize;
            console.log('offset '+offsetVal);
            
            this.mySearch.search("*", {
                offset:offsetVal,
                numberOfResults: pageSize,
                SORTBY: "skybox"
            }, (r1, data) => {
                console.log(data);
                var customers = []; 
                 data.results.forEach(customerResult => {
                     customers.push(customerResult.doc);    
                    
                 });
                 console.log(customers);
                 var pagedData = {
                    customers:customers,
                    totalResults : data.totalResults,
                    page : page,
                    pageSize: pageSize, 
                    TotalPages : (data.totalResults/pageSize)
                }
                resolve(pagedData);
                //Promise.all()
                console.log(customers);
                // Promise.all(customers.map(lredis.hgetall)).then(function (ownersResult) {
                //     console.log(ownersResult);
                   
                // });
               
                //console.log(r2); 
            });
        })


    }
    searchCustomers(search,page,pageSize){
        return new Promise((resolve, reject) => {
            var offsetVal = (page - 1) * pageSize;
            console.log('offset '+offsetVal);
            
            this.mySearch.search(search+'*', {
                offset:offsetVal,
                numberOfResults: pageSize,
                SORTBY: "skybox"
            }, (r1, data) => {
                console.log(data);
                var customers = []; 
                 data.results.forEach(customerResult => {
                     customers.push(customerResult.doc);    
                    
                 });
                 console.log(customers);
                 var pagedData = {
                    customers:customers,
                    totalResults : data.totalResults,
                    page : page,
                    pageSize: pageSize, 
                    TotalPages : (data.totalResults/pageSize)
                }
                resolve(pagedData);
                //Promise.all()
                console.log(customers);
                // Promise.all(customers.map(lredis.hgetall)).then(function (ownersResult) {
                //     console.log(ownersResult);
                   
                // });
               
                //console.log(r2); 
            });
        })

    }

    getCustomer(skybox){
        return new Promise((resolve, reject) => {
          lredis.hgetall("tew:owners:"+skybox).then((user)=>{
              console.log(user); 
              resolve(user); 
          })
        })
    }
}