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


router.get('/list-awb/:id',async(req, res, next) => {
    try{
        const customerId = mongoose.Types.ObjectId(req.params.id);
        const awbData = await services.awbService.getAwbsFullCustomer(customerId);
        res.send(awbData); 
    }catch(err){        
        res.send({ success: false, message: strings.string_response_error });
    }
})

//list awb without invoice
router.get('/awb-without-invoice/:id',async(req, res, next) => {
    try{   
        const customerId = mongoose.Types.ObjectId(req.params.id);     
        const awbData = await services.awbService.getAwbsNoDocsCustomer(customerId);
        res.send(awbData); 
    }catch(err){
        res.send({ success: false, message: strings.string_response_error });
    }
});

//store invoice
router.post('/store-invoice',upload.single('invoice'),async(req, res, next) => {
    
    try{ 
        const files = req.file;
        const filePath = files.path?files.path:'';        
        var fileName = files.filename;

        aws.uploadFile(filePath, fileName).then(async data => {
            console.log(`File Uploaded successfully. ${data.Location}`);
            const awbData = await services.awbService.storeInvoceFile({
                fileName: fileName,
                filePath: data.Location,
                awbId:req.body.awbId
            });
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




module.exports = router;