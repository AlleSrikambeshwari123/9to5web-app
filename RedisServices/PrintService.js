var dataContext = require('./dataContext')
var printUtil = require("../Util/PrinterUtil")
class PrintService {
    //print awb 
    async sendAwbToPrint(awb, username) {
        var printServer = await printUtil.getUserPrinter(username)
        console.log("printServer:", printServer)
        dataContext.redisClient.publish("print:awb:" + printServer, awb)
    }
    async sendLblToPrint(awb, username) {
        var printServer = await printUtil.getUserPrinter(username)
        console.log("printServer:", printServer)
        dataContext.redisClient.publish('print:lbl:' + printServer, awb)
    }
    async sendSingleLbl(awb, pkgId, username) {
        var printServer = await printUtil.getUserPrinter(username)
        console.log("printServer:", printServer)
        dataContext.redisClient.publish('print:single:lbl:' + printServer, `${awb}:${pkgId}`)
    }

}

module.exports = PrintService;