var services = require('../Services/RedisDataServices');
const { Worker } = require('worker_threads')
const AwbStatus = require('../models/awbStatus');

exports.all_awb_status = async(req, res, next)=>{    
    services.awbService.getAwbStatuses(req.query).then(allawb => {
        res.render('pages/reports/all-awb', {
          title: 'All AWB Status',
          page: req.originalUrl,
          user: res.user,
          allawb: allawb,
          clear: req.query.clear,
          query:req.query
        });
      });
}
exports.all_awb_status_report = async(req, res, next)=>{
    if(req.body.daterange && res.user._id){
        const result = await runService({daterange:req.body.daterange, userId:res.user._id, email: res.user.email}, './thread/awb.js'); 
        res.json(result)
    }else{
        res.json({status: false})
    }
}

exports.delivery_detail_report = async(req, res, next)=>{
  if(req.body.daterange && res.user._id){
      const result = await runService({daterange:req.body.daterange, userId:res.user._id, email: res.user.email}, './thread/delivery.js'); 
      res.json(result)
  }else{
      res.json({status: false})
  }
}

exports.package_detail_report = async(req, res, next)=>{
  if(req.body.daterange && res.user._id){
    const result = await runService({
      daterange:req.body.daterange,
      userId:res.user._id,
      email: res.user.email,
      users:req.body.user,
      package_status:req.body.status
    }, './thread/packagedetail.js'); 
    res.json(result)
  }else{
      res.json({status: false})
  }
}

//dashooard
exports.postbox_etc_package_report = async(req, res, next)=>{
  if(req.body.daterange && res.user._id){
    const result = await runService({
      daterange:req.body.daterange,
      userId:res.user._id,
      email: res.user.email,
      users:req.body.user,
      package_status:req.body.status
    }, './thread/postbox.js'); 
    res.json(result)
  }else{
      res.json({status: false})
  }
}

exports.ninetofive_package_report = async(req, res, next)=>{
  if(req.body.daterange && res.user._id){
    const result = await runService({
      daterange:req.body.daterange,
      userId:res.user._id,
      email: res.user.email,
      users:req.body.user,
      package_status:req.body.status
    }, './thread/ninetofivepackage.js'); 
    res.json(result)
  }else{
      res.json({status: false})
  }
}

exports.nodocs_package_report = async(req, res, next)=>{
  if(req.body.daterange && res.user._id){
    const result = await runService({
      daterange:req.body.daterange,
      userId:res.user._id,
      email: res.user.email,
      users:req.body.user,
      package_status:req.body.status
    }, './thread/nodocspackage.js'); 
    res.json(result)
  }else{
      res.json({status: false})
  }
}

exports.users_report = async(req, res, next)=>{
  console.log('hello')
  if(req.body.daterange && res.user._id){
    const result = await runService({
      daterange:req.body.daterange,
      userId:res.user._id,
      email: res.user.email      
    }, './thread/usersreport.js'); 
    res.json(result)
  }else{
      res.json({status: false})
  }
}

exports.all_dowload_report = async(req,res)=>{
    services.awbService.getAllReport(req.query).then(allreport => {
        res.render('pages/reports/all-report', {
          title: 'All Report',
          page: req.originalUrl,
          user: res.user,
          allreport: allreport,
          clear: req.query.clear,
          query:req.query
        });
    });
}

function runService(workerData, threadPage) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(threadPage, { workerData });
      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0)
          reject(new Error(`Worker stopped with exit code ${code}`));
      })
    })
  }

