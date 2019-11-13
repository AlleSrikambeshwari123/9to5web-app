var redis = require('redis'); 
var rediSearch = require('../redisearchclient/index'); 
var env = require('../environment')
var moment = require('moment'); 
var dataContext = require('../RedisServices/dataContext')


let driverIndex = rediSearch(redis,'index:drivers', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
//driverIndex.dropIndex(); 
driverIndex.createIndex([
    driverIndex.fieldDefinition.numeric("id",true),
    driverIndex.fieldDefinition.text("email",true),
    driverIndex.fieldDefinition.text("firstName",true),
    driverIndex.fieldDefinition.text("lastName",true),
    driverIndex.fieldDefinition.text("password",true),
    driverIndex.fieldDefinition.text("mobile",true),
    driverIndex.fieldDefinition.numeric("locationId",true),
    driverIndex.fieldDefinition.numeric("locationName",true)
]); 

let deliveryIndex = rediSearch(redis,'index:deliveries', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
//deliveryIndex.dropIndex(); 
deliveryIndex.createIndex([
    deliveryIndex.fieldDefinition.numeric("id",true),
    deliveryIndex.fieldDefinition.text("deliveryDate",true),
    deliveryIndex.fieldDefinition.text("toLocation",true),
    deliveryIndex.fieldDefinition.text("status",true), //0 - packing , 1 -in transit, 2 - delivered 

    deliveryIndex.fieldDefinition.text("createdBy",true),
    deliveryIndex.fieldDefinition.text("createdDate",true),
    
]); 


//add package to delivery 
let packageDeliveryIndex = rediSearch(redis,'index:package:delivery', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
//packageDeliveryIndex.dropIndex(); 
packageDeliveryIndex.createIndex([
    packageDeliveryIndex.fieldDefinition.numeric("id",true),
    packageDeliveryIndex.fieldDefinition.numeric("delivery_id",true),
    packageDeliveryIndex.fieldDefinition.text("company_tracking",true),

]); 

let hazmatIndex = rediSearch(redis,'index:hazmat', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
//hazmatIndex.dropIndex(); 
hazmatIndex.createIndex([
    hazmatIndex.fieldDefinition.numeric("id",true),

    hazmatIndex.fieldDefinition.text("name",true),
    hazmatIndex.fieldDefinition.text("description",true),
    
]); 


let locationIndex = rediSearch(redis,'index:locations', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
//locationIndex.dropIndex(); 
locationIndex.createIndex([
    locationIndex.fieldDefinition.numeric("id",true),
    locationIndex.fieldDefinition.text("name",true),
    locationIndex.fieldDefinition.text("address",true),
    locationIndex.fieldDefinition.text("phone",true),
    // locationIndex.fieldDefinition.text("managerId",true),
    // locationIndex.fieldDefinition.text("managerName",true),
    
]); 

let manifestIndex = rediSearch(redis,'index:manifest', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
//manifestIndex.dropIndex(); 
manifestIndex.createIndex([
    manifestIndex.fieldDefinition.numeric("mid",true),
    manifestIndex.fieldDefinition.text("type",true),
    manifestIndex.fieldDefinition.numeric("stageId",true),
    manifestIndex.fieldDefinition.numeric("planeId",true),
    manifestIndex.fieldDefinition.numeric("pilotId",true),
    manifestIndex.fieldDefinition.numeric("fligtDate",true),
    manifestIndex.fieldDefinition.numeric("dateCreated",true),
    manifestIndex.fieldDefinition.text("mtypeId",true),
    manifestIndex.fieldDefinition.text("createdBy",true),

]); 

manifestIndex.add(0,{
    mid:0,
    type:"default",
    stageId:0,
    dateCreated:0,
    mtypeId:0,
    createdBy:"SYSTEM"
})

let awbIndex = rediSearch(redis,'index:awb', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
//awbIndex.dropIndex(); 
awbIndex.createIndex([
    awbIndex.fieldDefinition.numeric("id"),
    awbIndex.fieldDefinition.numeric("isSed"),
    awbIndex.fieldDefinition.text("invoice"),
    awbIndex.fieldDefinition.text("invoiceNumber"),
    awbIndex.fieldDefinition.numeric("value"),
    awbIndex.fieldDefinition.numeric("customerId"),
    awbIndex.fieldDefinition.text("shipper"),
    awbIndex.fieldDefinition.text("carrier"),
    awbIndex.fieldDefinition.numeric("status"),
    awbIndex.fieldDefinition.numeric("dateCreated"),
    awbIndex.fieldDefinition.numeric("mid",true),
    awbIndex.fieldDefinition.numeric("hasDocs",true),
    awbIndex.fieldDefinition.numeric("peices",true),

])
let packageIndex = rediSearch(redis,'index:packages', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
//packageIndex.dropIndex(); 
packageIndex.createIndex([
    packageIndex.fieldDefinition.numeric("id",true),
    packageIndex.fieldDefinition.text("trackingNo",true),
    packageIndex.fieldDefinition.numeric("dateRecieved",true),
    packageIndex.fieldDefinition.numeric("awb",true),
    packageIndex.fieldDefinition.numeric("status",true),
    packageIndex.fieldDefinition.numeric("weight",false),
    packageIndex.fieldDefinition.text("description",true),
    packageIndex.fieldDefinition.numeric("volume",true),
    packageIndex.fieldDefinition.text("location",true),
    packageIndex.fieldDefinition.numeric("hasDocs",true),
    packageIndex.fieldDefinition.numeric("mid",true),
    packageIndex.fieldDefinition.text("dimensions",true),
]); 


let planeCompartmentIndex = rediSearch(redis,'index:compartments', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
//planeCompartmentIndex.dropIndex(); 
planeCompartmentIndex.createIndex([
    planeCompartmentIndex.fieldDefinition.numeric("id",true),
    planeCompartmentIndex.fieldDefinition.numeric("plane_id",true),
    planeCompartmentIndex.fieldDefinition.numeric("weight",true),
    planeCompartmentIndex.fieldDefinition.numeric("volume",true),
   
]); 

let planeIndex = rediSearch(redis,'index:planes', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
///planeIndex.dropIndex(); 
planeIndex.createIndex([
    planeIndex.fieldDefinition.numeric("id",true),
    planeIndex.fieldDefinition.text("tail_num",true),
    planeIndex.fieldDefinition.text("maximum_capacity",true),
    planeIndex.fieldDefinition.text("pilot",true),
    planeIndex.fieldDefinition.text("aircraft_type",true),
    planeIndex.fieldDefinition.text("contact_name",true),
    planeIndex.fieldDefinition.text("contact_phone",true),
    planeIndex.fieldDefinition.text("company",true)
]); 

let shipperIndex = rediSearch(redis,'index:shipper', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
//shipperIndex.dropIndex(); 
shipperIndex.createIndex([
    shipperIndex.fieldDefinition.numeric("id",true),
    shipperIndex.fieldDefinition.text("name",true),
    shipperIndex.fieldDefinition.text("firstName",true),
    shipperIndex.fieldDefinition.text("lastName",true),
    shipperIndex.fieldDefinition.text("telephone",true),
    shipperIndex.fieldDefinition.text("fax",true),
    shipperIndex.fieldDefinition.text("address",true),
    shipperIndex.fieldDefinition.text("state",true),
    shipperIndex.fieldDefinition.text("country",true),
    shipperIndex.fieldDefinition.text("email",true),
   
]); 
let userIndex = rediSearch(redis,'index:users', {
    clientOptions: {
                 'host': env.redis_host,
                 'port': env.redis_port,
                 auth_pass: env.redis_pass,
                //  tls:{ servername:env.red}
    }
    
}); 
//userIndex.dropIndex(); 
userIndex.createIndex([
    userIndex.fieldDefinition.numeric("id",true),
    userIndex.fieldDefinition.text("username",true),
    userIndex.fieldDefinition.text("email",true),
    userIndex.fieldDefinition.text("firstName",true),
    userIndex.fieldDefinition.text("lastName",true),
    userIndex.fieldDefinition.text("password",true),
    userIndex.fieldDefinition.text("mobile",true),
    userIndex.fieldDefinition.text("role",true),
    userIndex.fieldDefinition.numeric("locationId",true),
    userIndex.fieldDefinition.numeric("locationName",true)
]); 

var user = { 
id:4,
username:"admin",
firstName:"admin",
lastName: "9-5 Import",
password: "$2b$10$14j6bL4UEnE5WwNJ35zMoesbG/DGmv5beCcEoTB1VpnHfMgYvwTQu",
email:"admin@9-5imports.com",
mobile:"868.354.7177",
role:"Admin"
}
dataContext.redisClient.hmset("user:admin",user,(err,result)=>{
    console.log('saved user to key',result)
})

userIndex.add(4,user)
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
//customerIndex.dropIndex(); 
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