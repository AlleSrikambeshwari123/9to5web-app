var AwbGeneration = require('./Util/AWBGeneration').AWBGeneration
var awbPdf = new AwbGeneration()
var PackageService = require('./RedisServices/PackageService').PackageService
var pkgService  = new PackageService(); 
var LBLGenerator  = require('./Util/LBLGeneration').LBLGeneration; 
var lblPdf = new LBLGenerator(); 
pkgService.getAwb("100143").then(result=>{
    // awbPdf.generateAWb(result).then(results=>{
    //     console.log('done')
    // })
    lblPdf.generatePackageLabels(result)
})
