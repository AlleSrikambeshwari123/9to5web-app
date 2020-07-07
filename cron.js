const cron = require("node-cron");
const services = require('./Services/RedisDataServices')
exports.cronSchedule = () =>{
    cron.schedule("20 0 * * *", function () {
        console.log(`Running Cron Job`);
        services.packageService.checkAgingofStoreInPackages().then((result)=>{
            console.log('Working.....',result)
        })
        services.packageService.checkAgingDollarofStoreInPackages().then((result)=>{
            console.log('Working Dollar.....',result)
        })
    });
}