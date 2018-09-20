var dataContext = require('./dataContext');
const SERVICE_KEY = 'manifest';

export class ManifestService{
    constructor (){

    }
    createManfiest(username,mtype){
        console.log("about to create the manifest");
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).createManifest({username:username,mtype:mtype},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    listAllManifest(mtype){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).listManifest({mtype:mtype},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    
    closeManifest(mid,stage,username){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).closeManifest({mid:mid,stage:stage,username:username},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    exportExcel(mid){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).exportManifestXLS({mid:mid},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    shipManifest(mid){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).shipManifest({mid:mid},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
}