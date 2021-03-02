var express = require('express');
var router = express.Router();
var passport = require('passport');
require('./authHelper')
const strings = require('../../Res/strings');
var services = require('../../Services/RedisDataServices');
var middleware = require('../../middleware');
var moment = require('moment');
var mongoose = require('mongoose');
var aws = require('../../Util/aws');
var uniqid = require('uniqid');
const multer = require('multer');
var emailService = require('../../Util/EmailService');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, global.uploadRoot+'/')
    },
    filename: function (req, file, cb) {
        const fext = (file.originalname).split('.').pop();
      cb(null, uniqid() + '_' + moment().utc().unix() + "."+fext) //Appending extension
    }
  });
  var upload = multer({ storage: storage});


router.get('/list-awb/:id',passport.authenticate('jwt', { session: false }), async(req, res, next) => {
    try{
        const customerId = mongoose.Types.ObjectId(req.params.id);
        let awbData = await services.awbService.getAwbsFullCustomer(customerId);
        console.log("Awb data",awbData)

        let queryStatus = req.query.status,flag;
        console.log("query Status",queryStatus)

        if(awbData.length > 0){
            console.log("list flag")
            flag = 1
        }else{
            console.log("list else")
            const result = await services.customerChildService.getCustomer({_id: customerId})
            console.log("list result",result)
            if(result && result.parentCustomer && result.parentCustomer.id )
                awbData = await services.awbService.getAwbsFullCustomer(result.parentCustomer.id);
        }
        let awbResponse = await services.awbService.getAwbPriceAndStatus(awbData,queryStatus)
        console.log("Awb Response",awbResponse)

        return res.send(awbResponse);
    }catch(err){  
        res.send({ success: false, message: strings.string_response_error ,err : err});
    }
})

//list awb without invoice
router.get('/awb-without-invoice/:id',passport.authenticate('jwt', { session: false }),async(req, res, next) => {
    try{   
        const customerId = mongoose.Types.ObjectId(req.params.id);     
        const awbData = await services.awbService.getAwbsNoDocsCustomer(customerId);
        res.send(awbData); 
    }catch(err){
        res.send({ success: false, message: strings.string_response_error });
    }
});

//list awb without invoice and storeInvoice
router.get('/awb-no-invoice/:id',passport.authenticate('jwt', { session: false }),async(req, res, next) => {
    try{   
        const customerId = mongoose.Types.ObjectId(req.params.id);     
        const awbData = await services.awbService.getAwbsNoInvoiceCustomer(customerId);
        res.send(awbData); 
    }catch(err){
        res.send({ success: false, message: strings.string_response_error });
    }
});

//store invoice
router.post('/store-invoice',passport.authenticate('jwt', { session: false }), upload.single('invoice'),async(req, res, next) => {    
    try{ 
        const files = req.file;
        const filePath = files.path?files.path:'';        
        var fileName = files.filename;
        
        if(req.body.fileType)
            fileName = fileName.split('.')[0] + '.' + req.body.fileType
        aws.uploadFile(filePath, fileName).then(async data => {
            console.log(`File Uploaded successfully. ${data.Location}`);            
            let invoiceObject ={
                fileName: fileName,
                filePath: data.Location,
                courierNo : req.body.courierNo,
                pmb : req.body.pmb,
                customerId : req.body.id
            }
            if(files.originalname)
                invoiceObject.name = files.originalname;
            let awbData
            if(req.body.awbId){
                invoiceObject.awbId = req.body.awbId 
                let customer = await services.customerService.getCustomer({_id : invoiceObject.customerId})
                let awb = await services.awbService.getAwb(req.body.awbId)
                await emailService.sendInvoicesEmail(invoiceObject,customer,awb.awbId);
                awbData = await services.awbService.storeInvoiceFile(invoiceObject);
            }else{
                awbData = await services.awbService.storeAdditionalInvoceFile(invoiceObject);
            }
            res.send(awbData);

          }).catch(err => {
            console.error(err);
            res.send({});
          })
       
    }catch(err){
        console.log(err)
        res.send({ success: false, message: strings.string_response_error });
    }
});

router.get('/awb-price/:id',passport.authenticate('jwt', { session: false }), async(req, res, next) => {
    try{ 
        const awbId = mongoose.Types.ObjectId(req.params.id);
        const priceLabelData = await services.awbService.getAwbHistoryPriceLabel(awbId);
        res.json(priceLabelData);
    }catch(err){
        console.log(err)
        res.send({ success: false, message: strings.string_response_error });
    }

})
router.post('/awb-price-add/:id',passport.authenticate('jwt', { session: false }), async(req, res, next) => {
    try{ 
        const awbId = mongoose.Types.ObjectId(req.params.id);
        const priceLabelData = await services.AwbPriceLabelService.updatePriceLabel(req.body,awbId);
        res.json(priceLabelData);
    }catch(err){
        console.log(err)
        res.send({ success: false, message: strings.string_response_error });
    }

})


module.exports = router;