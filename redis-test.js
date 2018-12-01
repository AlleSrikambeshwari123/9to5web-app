//#region  Manifest TEST 
    var ManifestService = require('./RedisServices/ManifestService').ManifestService; 
    
    var ms = new ManifestService(); 
    ms.getOpenManifest(2).then((result)=>{
        console.log(result);
    });

    // ms.createNewManifest(ms.mtypes.air,"stevan").then((result)=>{
    //     console.log(result)
    // }).catch((err)=>{
    //     console.log(err);
    // });
//#endregion