var dataContext = require('./dataContext')
export class PrintService{
    constructor(){

    }
    //print awb 
    sendAwbToPrint(awb,username){
        dataContext.redisClient.publish("print:awb:"+username,awb)
    }
    sendLblToPrint(awb,username){
        dataContext.redisClient.publish('print:lbl:'+username,awb)
    }

}