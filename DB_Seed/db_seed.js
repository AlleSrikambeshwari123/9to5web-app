var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')
var moment = require('moment'); 



// let driverIndex = rediSearch(redis,'index:drivers', {
//     clientOptions: {
//                  'host': env.redis_host,
//                  'port': env.redis_port,
//                  auth_pass: env.redis_pass,
//                 //  tls:{ servername:env.red}
//     }
    
// }); 
// driverIndex.dropIndex(); 
// driverIndex.createIndex([
//     driverIndex.fieldDefinition.numeric("id",true),
//     driverIndex.fieldDefinition.text("email",true),
//     driverIndex.fieldDefinition.text("firstName",true),
//     driverIndex.fieldDefinition.text("lastName",true),
//     driverIndex.fieldDefinition.text("password",true),
//     driverIndex.fieldDefinition.text("mobile",true),
//     driverIndex.fieldDefinition.numeric("locationId",true),
//     driverIndex.fieldDefinition.numeric("locationName",true)
// ]); 



// let flightIndex = rediSearch(redis,'index:flight', {
//     clientOptions: {
//                  'host': env.redis_host,
//                  'port': env.redis_port,
//                  auth_pass: env.redis_pass,
//                 //  tls:{ servername:env.red}
//     }
    
// }); 
// flightIndex.dropIndex(); 
// flightIndex.createIndex([
//     flightIndex.fieldDefinition.numeric("id",true),
//     flightIndex.fieldDefinition.numeric("planeId",true),
//     flightindex.fieldDefinition.numeric("pilotId",false),
//     flightIndex.fieldDefinition.text("pilotName"),
//     flightIndex.fieldDefinition.numeric("compartmentId",true),
//     flightIndex.fieldDefinition.text("packageId",true),
//     flightIndex.fieldDefinition.numeric("departureTime")
//     //flightIndex.fieldDefinition.text("company",true)
// ]); 

// let vehicleIndex = rediSearch(redis,'index:users', {
//     clientOptions: {
//                  'host': env.redis_host,
//                  'port': env.redis_port,
//                  auth_pass: env.redis_pass,
//                 //  tls:{ servername:env.red}
//     }
    
// }); 
// vehicleIndex.dropIndex(); 
// vehicleIndex.createIndex([
//     vehicleIndex.fieldDefinition.numeric("id",true),
//     vehicleIndex.fieldDefinition.text("plate",true),
//     vehicleIndex.fieldDefinition.text("driverId",true),
//     vehicleIndex.fieldDefinition.text("driverName",true),
//     vehicleIndex.fieldDefinition.text("make",true),
//     vehicleIndex.fieldDefinition.text("model",true),
//     vehicleIndex.fieldDefinition.text("country",true)
// ]); 


// let locationIndex = rediSearch(redis,'index:locations', {
//     clientOptions: {
//                  'host': env.redis_host,
//                  'port': env.redis_port,
//                  auth_pass: env.redis_pass,
//                 //  tls:{ servername:env.red}
//     }
    
// }); 
// locationIndex.dropIndex(); 
// locationIndex.createIndex([
//     locationIndex.fieldDefinition.numeric("id",true),
//     locationIndex.fieldDefinition.text("name",true),
//     locationIndex.fieldDefinition.text("address",true),
//     locationIndex.fieldDefinition.text("phoneNumber",true),
//     locationIndex.fieldDefinition.text("managerId",true),
//     locationIndex.fieldDefinition.text("managerName",true),
    
// ]); 

// let manifestIndex = rediSearch(redis,'index:manifest', {
//     clientOptions: {
//                  'host': env.redis_host,
//                  'port': env.redis_port,
//                  auth_pass: env.redis_pass,
//                 //  tls:{ servername:env.red}
//     }
    
// }); 
// manifestIndex.dropIndex(); 
// manifestIndex.createIndex([
//     manifestIndex.fieldDefinition.numeric("mid",true),
//     manifestIndex.fieldDefinition.text("type",true),
//     manifestIndex.fieldDefinition.numeric("stageId",true),
//     manifestIndex.fieldDefinition.numeric("dateCreated",true),
//     manifestIndex.fieldDefinition.text("mtypeId",true),
//     manifestIndex.fieldDefinition.text("createdBy",true),

// ]); 


// let packageIndex = rediSearch(redis,'index:packages', {
//     clientOptions: {
//                  'host': env.redis_host,
//                  'port': env.redis_port,
//                  auth_pass: env.redis_pass,
//                 //  tls:{ servername:env.red}
//     }
    
// }); 
// packageIndex.dropIndex(); 
// packageIndex.createIndex([
//     packageIndex.fieldDefinition.numeric("id",true),
//     packageIndex.fieldDefinition.text("trackingNo",true),
//     packageIndex.fieldDefinition.numeric("dateRecieved",true),

//     packageIndex.fieldDefinition.text("skybox",true),
//     packageIndex.fieldDefinition.text("shipper",true),
//     packageIndex.fieldDefinition.numeric("status",true),
//     packageIndex.fieldDefinition.numeric("pieces",true),
//     packageIndex.fieldDefinition.numeric("weight",false),
//     packageIndex.fieldDefinition.text("carrier",true),
//     packageIndex.fieldDefinition.text("description",true),
//     packageIndex.fieldDefinition.numeric("awb",true),
//     packageIndex.fieldDefinition.numeric("mid",true),
//     packageIndex.fieldDefinition.numeric("volume",true),
//     packageIndex.fieldDefinition.text("location",true),
//     packageIndex.fieldDefinition.numeric("value",true),
//     packageIndex.fieldDefinition.numeric("dimensionalWeight",true),
//     packageIndex.fieldDefinition.numeric("hasDocs",true),
    

// ]); 


// let planeIndex = rediSearch(redis,'index:planes', {
//     clientOptions: {
//                  'host': env.redis_host,
//                  'port': env.redis_port,
//                  auth_pass: env.redis_pass,
//                 //  tls:{ servername:env.red}
//     }
    
// }); 
// planeIndex.dropIndex(); 
// planeIndex.createIndex([
//     planeIndex.fieldDefinition.numeric("id",true),
//     planeIndex.fieldDefinition.text("tail_num",true),
//     planeIndex.fieldDefinition.text("maximum_capacity",true),
//     planeIndex.fieldDefinition.text("pilot",true),
//     planeIndex.fieldDefinition.text("company",true)
// ]); 

// let compartmentIndex = rediSearch(redis,'index:planes', {
//     clientOptions: {
//                  'host': env.redis_host,
//                  'port': env.redis_port,
//                  auth_pass: env.redis_pass,
//                 //  tls:{ servername:env.red}
//     }
    
// }); 
// compartmentIndex.dropIndex(); 
// compartmentIndex.createIndex([
//     compartmentIndex.fieldDefinition.numeric("id",true),
//     compartmentIndex.fieldDefinition.text("plane_id",true),
//     compartmentIndex.fieldDefinition.numeric("maximum_capacity",true),
    
    
// ]); 

let customerIndex = rediSearch(redis,'index:customers', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
customerIndex.dropIndex(); 
customerIndex.createIndex([
    customerIndex.fieldDefinition.numeric("id",true),

    customerIndex.fieldDefinition.text("name",true),
    customerIndex.fieldDefinition.text("firstName",true),
    customerIndex.fieldDefinition.text("lastName",true),
    customerIndex.fieldDefinition.text("pmb",true),
    customerIndex.fieldDefinition.text("address",true),
    //ADD TAG Manually to index for country 
    customerIndex.fieldDefinition.text("identificationNo",true),
    customerIndex.fieldDefinition.text("identificationType",true),
    customerIndex.fieldDefinition.text("email",true),
    customerIndex.fieldDefinition.text("phone",true),
    customerIndex.fieldDefinition.text("branch",true),
    customerIndex.fieldDefinition.text("company",true),
    customerIndex.fieldDefinition.numeric("dateCreated",true),
]); 
const csv  = require('csvtojson'); 
csv()
.fromFile("./customers.csv")
.then((jsonObj)=>{
    //var batch = dataContext.redisClient.batch(); 
    var count =1 ; 
    jsonObj.forEach(customer => {
       // console.log(customer); 
     rCustomer = createRedisCustomer(customer)
    // console.log(rCustomer)
    rCustomer.id= count; 
     customerIndex.add(count,rCustomer,(err,result)=>{
         if (err){
             console.log(err,rCustomer)
         }
     })
     count ++;
      //  batch.zadd("allergies:list", 1,element.Allergy)    
    });
    
    
}); 


function createRedisCustomer(customer){
    var pmb  = ""; 
    var company = "9-5"
    var branch = ""
    if (customer.sAddress.toUpperCase().indexOf('POSTBOXES')>-1 ){
        //get the pmn 
        var parts = customer.sAddress.split(','); 
        company = "postboxes"
        branch = parts[0]; 
        if(typeof parts[1] != "undefined")
        pmb = parts[1].trim(); 
        console.log('found pm number:'+pmb, `setting the branch to ${branch.replace("POSTBOXES ETC","")} - ${company}`)
    }
    else if (customer.sAddress.toUpperCase().indexOf("POST BOXES">-1)){
        //get the pmb number 
    }
    var rcust = { 
        id : customer.ICustomerID,
        name : customer.sCustomerName, 
        firstName:customer.sFirstName,
        lastName:customer.sLastName,
        pmb : pmb,
        address : customer.sAddress, 
        phone : customer.sTelephone,
        email: customer.sEmail,
        dateCreated: moment().unix(),
        company: company,
        branch: branch



    }
    return rcust; 
}