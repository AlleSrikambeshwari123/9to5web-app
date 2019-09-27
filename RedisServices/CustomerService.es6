import { calendarFormat } from 'moment';

var redis = require('redis');
var lredis = require('./redis-local');
var redisSearch = require('../redisearchclient/index');
const PREFIX = "pmb:"
const CUST_ID = "customer:id"; 
var dataContext = require('./dataContext')
const INDEX = "index:customers"

var customerIndex = redisSearch(redis, INDEX, {
    clientOptions: dataContext.clientOptions
});
export class CustomerService {
    constructor() {
        this.mySearch = redisSearch(redis, INDEX, {
            clientOptions: lredis.searchClientDetails
        });
        dataContext.redisClient.get(CUST_ID,(err,id)=>{
            if (Number(id)< 50000){
                dataContext.redisClient.set(CUST_ID,"50000"); 
            }
        })
    }

    listCustomers(page, pageSize) {
        return new Promise((resolve, reject) => {
            var offsetVal = (page - 1) * pageSize;
            console.log('offset '+offsetVal);
            
            this.mySearch.search("@id:[0 50000]", {
                offset:offsetVal,
                numberOfResults: 50000,
               
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
    findCustomer(query){
        return new Promise((resolve,reject)=>{
            customerIndex.search(`(@name:'${query}*')|(@pmb:'${query}*')`, {offset:0, numberOfResults:1000},(err,results)=>{
                if (err){
                    console.log(err)
                    resolve({customer:[]}); 
                    return; 
                }
                if (!results){
                  
                }
                console.log('results', results); 
               
                var customers = []; 
                results.results.forEach(customer => {
                    customers.push(customer.doc); 
                });
                console.log(customers)
                resolve({customer:customers})
            })
        })
    }
    searchCustomers(search,page,pageSize){
        return new Promise((resolve, reject) => {
            var offsetVal = (page - 1) * pageSize;
            console.log('offset '+offsetVal);
            
            this.mySearch.search(search.replace("@"," ")+'*', {
                offset:offsetVal,
                numberOfResults: pageSize,
                // sortBy: "name",
                // dir : "ASC"
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
            this.mySearch.getDoc(skybox, (err,customerDoc)=>{
               
                if (customerDoc.doc.pmb == '')
                    customerDoc.doc.pmb = '9000'
                    console.log(customerDoc,'looking up the customer'); 
                resolve(customerDoc.doc); 
            })
       
        })
    } 
    saveCustomer(customer){ 
        var srv  = this; 
        return new Promise((resolve,reject)=>{
            if (customer.id){
                
                srv.mySearch.update(customer.id,customer,(err,result)=>{
                    resolve({saved:true})
                }); 
            }
            else {
                //create new 
                dataContext.redisClient.incr(CUST_ID,(err,id)=>{
                    customer.id = id; 
                    srv.mySearch.add(id,customer, (err,result)=>{
                        resolve({saved:true})
                    })
                }); 
                
            }
            
        });
    }
}