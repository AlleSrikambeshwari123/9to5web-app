const cron = require("node-cron");
const services = require('./Services/RedisDataServices')
const date = require('date-and-time')
const Customer = require('./models/customer');
const Users = require('./models/user');

const EmailService = require('./Util/EmailService');
const { uniq } = require("lodash");

var filepath = "./public/emails/no_docs/store.html"
const fs = require("fs")
const path = require("path")
var filee ;
exports.cronSchedule =async  () =>{
    
    // Users.find({email:"mani@mani.com"},(err,res)=>{
    //     console.log(err , "Err" , res,"res")
    // })
    fs.readFile(path.join(__dirname.replace("Util",""),filepath), "UTF8", function(err, data) {
        if (err)
            console.log("couldn't read the file"); 
        else {
            filee = data ; 
             
            //load  up the message 
        }
    });
var custemail = [];
// 5 8 * * 7        7days 
// */10 * * * * *   10sec
    cron.schedule("5 8 * * 7", async function () {
        var datee = new Date();
        allService = await services.packageService.getAllPackages();
        const sendEmaildata =   allService.map(d=>{
                const value = date.subtract(d.updatedAt,datee);
                // console.log(Math.abs(value.toDays()) ,datee , d.updatedAt, "Dateee")
                if(Math.abs(value.toDays()) > 7){
                    
                    return d.customerId;
                }
                else{
                    return 0;
                }
            })
            // console.log(sendEmaildata , "sendEmaildata")
            // console.log(sendEmaildata , "sendddd")
            // console.log(sendEmaildata , "sendemailcustomer")
            // console.log(sendEmaildata , "sendemaildata")
            if(sendEmaildata){
                // send email
                // console.log("asdkfajslk")
                sendEmaildata.forEach(async d=>{
                    // console.log("aaaaaaaaaaaaa")
            if(d){
            //   console.log(d)

          await Customer.findById(d.toString()).then(async data=>{
            //   console.log(data , "daadta")
            // console.log(data , "dddd")
              
                if(data){
                    
                if( data.email == null ||  data.email == '' || data.email == undefined ){
                    // console.log("iam called")
                        return "nill"
                }
                else{
                    // console.log(d.email , "demail")
                    // console.log("iam called ww")

                    if(data.email && data.reminder_email_sent != true){
                    custemail.push(data.email)
                    return 0
                    }

                }
                }
         
            
              
          })
            }

    
        })

       
    
            }
            
            uniqueArray = custemail.filter(function(item, pos) {
                return custemail.indexOf(item) == pos;
            })
            // console.log(uniqueArray  , "uniquearay")
            // console.log(uniqueArray , "uniqueArray")
            uniqueArray = ["jh@ajkc.ci"]
            // uniqueArray = uniqueArray[];
            var uSet = new Set(custemail);
            uSet = [...uSet]
            // uniqueArray = ["jh@ajkc.ci"]
            // console.log("alksdfj")
            console.log(uniqueArray , "uniqueArraaaaay");
                uniqueArray.map(async demail=>{
                // console.log("aisjkdf");
                 EmailService.sendReminderMail(demail,"Reminder - check your Package" , filee).then(async d=>{
                        // console.log(demail)
                        // console.log(d)
                        if(d.response=="250 Great success"){
                            

        
                   
                          await Users.updateOne({"email" : demail}, {"$set": {"reminder_email_sent": true}}, (err, writeResult) => {
                         console.log(err,writeResult)
                    // Users.find({email:demail},(err,result)=>console.log(result , "resultt"));

                     })
                            
                            
                         
                        }
                    })
               
                })
    
      });
      

    cron.schedule("20 0 * * *", function () {
        console.log(`Running Cron Job`);
        //Check Agign for NODOCS 
        services.packageService.checkAgingofNoDocsPackages().then((result)=>{
            console.log('checkAgingofNoDocsPackages.....',result)
        })
        //Check Aging for Delivered to Store
        services.packageService.checkAgingofStoreInPackages().then((result)=>{
            console.log('checkAgingofStoreInPackages.....',result)
        })
    });
}