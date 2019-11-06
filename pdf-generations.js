var AwbGeneration = require('./Util/AWBGeneration').AWBGeneration
var awbPdf = new AwbGeneration()
var PackageService = require('./RedisServices/PackageService').PackageService
var pkgService  = new PackageService(); 
var ProcessLbl  = require('./Util/ProcessedLbl').GenerateProcessedLabel; 
var lblPdf = new ProcessLbl(); 
var NoDocsLbl = require('./Util/NoDocsLbl').LBLNoDocs; 
var lblNoDocs  = new NoDocsLbl()
pkgService.getAwb("100143").then(result=>{
    // awbPdf.generateAWb(result).then(results=>{
    //     console.log('done')
    // })
    var fees = {
        value : "$112.00",
        duty:"$0.0",
        envLevy:"$0.0",
        processing:"$0.0",
        cvat : "$0.0",
        svat : "$0.0",
        total :"$0.0",
        freight:"$0.0",
        nodocs:"$0.0",
        insurance:"$0.0",
        storage:"$0.0",
        brokerage:"$0.0",
        sed:"$0.0",
        express:"$0.0",
        delivery:"$0.0",
        pickup:"$0.0",
        hazmat: "$0.0",

    }
    lblNoDocs.printNoDocsLabel(result,fees)
})
