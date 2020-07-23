const cron = require("node-cron");
const services = require('./Services/RedisDataServices')
exports.cronSchedule = () =>{
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