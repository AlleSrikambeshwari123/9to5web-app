var cryptojs  = require('crypto-js');
var jwt = require('jsonwebtoken');
var redis = require('redis');
var lredis = require('./redis-local');
var moment = require('moment');
var redisSearch = require('../redisearchclient');
const SERVICE_KEY = 'users';
var bcrypt = require('bcrypt'); 
const PREFIX  = "user:"
const INDEX = "index:users"
const USERIDCOUNTER = "user:id"; 
const ENV = require('../environment')
var client = redis.createClient(ENV.redis_port, ENV.redis_host, {
    auth_pass: ENV.redis_pass,
    // tls:{
    //     servername: 'core.shiptropical.com'
    // } 
});
export class UserService {
    constructor(){
        this.redisIndexSearch = redisSearch(redis, 'index:users', {
            clientOptions:lredis.searchClientDetails
        });
    }
    authenticate (username,password){
        var srv = this; 
        console.log('about to auth')
        return new Promise(function(resolve,reject){
           
            client.hgetall(PREFIX+username,(err,result)=>{

                console.log(result, "is the results"); 
                if (result){
                    console.log(result);
                    bcrypt.compare(password,result.password,(err,pwdResult)=>{
                        if (err){
                            console.log(err); 

                        }
                        if(pwdResult == true){
                            delete result.password; 
                            srv.generateToken(result).then(token=>{
                                resolve({user:result,token:token,valid:true})
                            });
                        }
                        else { 
                            console.log("auth failed")
                            resolve({user:null,token:"",valid:false})
                        }
                       
                       
                    })
                }
                else{
                    resolve({user:null,token:"",valid:false})
                }
            }); 
            
            
        });
    }
    getUser(username){
        return new Promise (function(resolve,reject){
            client.hgetall(PREFIX+username,(err,result)=>{
                if (result){
                    delete result.password; 
                    resolve({user:result})
                }
                else resolve({user:{username:'',firstName:'',lastName:'',email:'',mobile:''}})
            })
         
        });
    }
    getUsersInRole(roleId){
        return new Promise (function(resolve,reject){

            // dataContext.getServiceProxy(SERVICE_KEY).getUsersByRole({roleId:roleId},function(error,result){
            //     if (error){
            //         reject(error);
            //     }
            //     resolve( result);
            // });
        });
    }
    getRoles(){
        return new Promise (function(resolve,reject){

            resolve(["Admin","Warehouse FLL","Customs Agent","Warehouse BAHAMAS","Cashier","Location Manager"])
            
        });
    }
    getAllUsers(pageSize,currentPage){
        var srv = this; 
        console.log('getting all users')
        return new Promise (function(resolve,reject){
            var offset
           srv.redisIndexSearch.search('*',{
            offset:0,
            numberOfResults: 1000,
            sortBy: "lastName",
            dir: "ASC"
        },(err,results)=>{
            var users = [];
                results.results.forEach(element => {
                    delete element.doc.password
                    users.push(element.doc); 
                });
                resolve(users)
        })
        });
    }
    removeUser(username){
        return new Promise (function(resolve,reject){
            var idx= this.redisIndexSearch; 
        lredis.hgetall(PREFIX+username).then(user=>{
            idx.delete(user.id); 
            client.delete(PREFIX+username,(err,result)=>{
                if (err){
                    console.log("unable to delete"); 
                }
                resolve({removed:true})
            })
        })
          //find the user by username 
          //get the doc Id 
          //delete from index 
          //delete hash 
        });
    }
    enableUser(username,enabled){
        return new Promise (function(resolve,reject){
            client.hmset(PREFIX+username,{enabled:enabled},(err,result)=>{
                if (err){
                    resolve({updated:false})
                }
                else {
                    resolve({updated:true})
                }
            }); 
            
        });
    }
    saveUser(user){
       var srv = this; 
        return new Promise (function(resolve,reject){
            srv.checkUsername(user.username).then(valid=>{
                console.log(valid)
                if (valid.taken == false){
                    //create the hash 
                    client.incr(USERIDCOUNTER,(err,id)=>{
                        user.id = id; 
                        user.password = bcrypt.hashSync(user.password,10); 
                        lredis.hmset(PREFIX+user.username,user)
                        addUserToIndex(user,srv.redisIndexSearch); 
                        resolve({saved:true,"message":"saved successfully."})
                    })
                    
                }
                else {
                    //update the user 
                    //prepare the roles we are going to get an arra 
                   
                    
                    if (!user.password || user.password == ""){
                        delete user.password; 
                    }
                    console.log('updating user',user)
                    client.hmset(PREFIX+user.username,user)
                    srv.redisIndexSearch.update(user.id,user,(err,reply)=>{
                        if(err)
                         {
                             console.log(err)
                            resolve({saved:false,"message":"Username err"})
                         }   
                        else {
                           
                           
                                user.password = bcrypt.hashSync(user.password,10); 
                            
                            resolve({saved:true,"message":"User updated."})
                        }
                        
                    })
                    
                    
                }
            })
            
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
                console.log(e,"unable to verify token")
                reject();
            }

        });
    }
    checkUsername(username){
        return new Promise((resolve,reject)=>{
            //we can check in 2 ways one see if the hash exists 
            client.exists(PREFIX+username,(err,results)=>{
                console.log(results)
                if (Number(results) == 1){
                    resolve({taken:true})
                }
                else
                    resolve({taken:false})
            })
        })
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
function ConvertRolesToString(rolesArray){
    var allPermissions = ""; 
    rolesArray.forEach(role => {
        allPermissions += role +","
    });
    allPermissions = allPermissions.substring(0,allPermissions.length-1); 
    console.log(allPermissions)
}
function createDocument(account){
    var customerDocument = { 
        id : account.id,
        username:account.username,
        email: account.email, 
        firstName : account.firstName, 
        lastName: account.lastName,
        password:account.password,
        mobile: account.mobile,
        role: account.role
    }
    console.log(customerDocument)
    return customerDocument; 
 }
 function addUserToIndex(account, searchObj){
     var userDocument = createDocument(account); 
     searchObj.add(account.id,userDocument); 
 }