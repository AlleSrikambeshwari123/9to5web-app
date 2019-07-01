var redis = require('redis');
var lredis = require('./redis-local');
var redisSearch = require('redisearchclient');

export class CustomerService {
    constructor() {
        this.mySearch = redisSearch(redis, 'tew:customers', {
            clientOptions: lredis.searchClientDetails
        });
    }

    listCustomers(page, pageSize) {
        return new Promise((resolve, reject) => {
            var offsetVal = (page - 1) * pageSize;
            console.log('offset '+offsetVal);
            
            this.mySearch.search("*", {
                offset:offsetVal,
                numberOfResults: pageSize,
                sortBy: "svalue"
            }, (r1, data) => {
                if (r1)
                    console.log(r1);
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
                console.log(customers);
                
            });
        })


    }
    searchCustomers(search,page,pageSize){
        return new Promise((resolve, reject) => {
            var offsetVal = (page - 1) * pageSize;
            console.log('offset '+offsetVal);
            
            this.mySearch.search(search.replace("@"," ")+'*', {
                offset:offsetVal,
                numberOfResults: pageSize,
                sortBy: "svalue",
                dir : "ASC"
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
    saveCustomer(customer){ 
        return new Promise((resolve,reject)=>{
            lredis.hmset("tew:owners:"+customer.skybox,customer).then((result)=>{
                resolve(result);
            }); 
        });
    }
}