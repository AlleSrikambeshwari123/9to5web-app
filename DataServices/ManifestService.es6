var dataContext = require('./dataContext');
const SERVICE_KEY = 'manifest';

export class ManifestService{
    constructor (){

    }
    createManfiest(username){
        console.log("about to create the manifest");
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).createManifest({username:username},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    listAllManifest(){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).listManifest({},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
}