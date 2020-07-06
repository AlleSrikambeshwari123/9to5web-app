var express = require('express');
var router = express.Router();
var passport = require('passport');
require('./authHelper')
const strings = require('../../Res/strings');
var services = require('../../Services/RedisDataServices');
var middleware = require('../../middleware');
var moment = require('moment');
var mongoose = require('mongoose');

router.get('/list-awb/:id',async(req, res, next) => {
    try{
        const customerId = mongoose.Types.ObjectId(req.params.id);
        const awbData = await services.awbService.getAwbsFullCustomer(customerId);
        res.send(awbData); 
    }catch(err){        
        res.send({ success: false, message: strings.string_response_error });
    }
})

//list of pricing
router.get('/awb/:id',async(req, res, next) => {
    try{
        const id = req.params.id;
        const awbData = await services.awbService.getAwbPreviewDetails(id);
        res.send(awbData); 
    }catch(err){
        res.send({ success: false, message: strings.string_response_error });
    }
});

//list awb without invoices
router.get('/awb-without-invoice/:id',async(req, res, next) => {
    try{   
        const customerId = req.params.id;     
        const awbData = await services.awbService.getAwbsNoDocs();
        res.send(awbData); 
    }catch(err){
        res.send({ success: false, message: strings.string_response_error });
    }
});


module.exports = router;