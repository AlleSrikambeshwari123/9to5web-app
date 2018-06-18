var cryptojs  = require('crypto-js');
var jwt = require('jsonwebtoken');
var dataContext = require('./dataContext');
const SERVICE_KEY = 'users';
export class UserService {
    constructor(){

    }
    authenticate (username,password){
        return new Promise(function(resolve,reject){
            var verifyUser  = {
                username: username,
                password:password
            };
            dataContext.getServiceProxy(SERVICE_KEY).authenticate(verifyUser,function(error,validUser){
                resolve( validUser);
            });
            reject();
        });
    }
    getUser(username){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).getUser({username:username},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    getUserInRole(roleId){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).getUsersByRole({roleId:roleId},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    getRoles(){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).getUserRoles({},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    getAllUsers(){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).getUsers({},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    removeUser(username){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).removeUser({username:username},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    enableUser(username,enabled){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).enableUser({username:username,enabled:enabled},function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    saveUser(user){
        return new Promise (function(resolve,reject){
            dataContext.getServiceProxy(SERVICE_KEY).saveUser(user,function(error,result){
                if (error){
                    reject(error);
                }
                resolve( result);
            });
        });
    }
    verifyToken (token){
        return new Promise(function(reslove,reject){
            try {
                var decodedJWT = jwt.verify(token,'silver123.');
                var bytes = cryptojs.AES.decrypt(decodedJWT.token,'Silver123');
                var tokenData = JSON.parse(bytes.toString(cryptojs.enc.Utf8));
                /*  console.log('token data below');
                 console.log(tokenData);*/
                reslove(tokenData);
            }
            catch(e){
                reject();
            }

        });
    }
    generateToken (user){
        return new Promise(function(resolve,reject){

            var stringData = JSON.stringify(user);
            var encryptedData = cryptojs.AES.encrypt(stringData,'Silver123').toString();

            var token = jwt.sign({
                token:encryptedData
            }, 'silver123.');
            resolve( token);
        });

    }
}