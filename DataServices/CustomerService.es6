var dataContext = require('./dataContext');
const SERVICE_KEY = 'customer';

export class Customer{ 
    constructor(){

    }

    processCustomers(customerList){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).processCustomerList(customerList,function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    findCustomers(searchTxt){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).findCustomer({text:searchTxt},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    listCustomers(currentPage, pageSize){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).getCustomers({currentPage:currentPage,pageSize:pageSize},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    getCustomer(customerId){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).getCustomer({customerId:customerId},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    saveCustomer(customer){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).saveCustomer(customer,function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
}