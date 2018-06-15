var edge = require('edge');
console.log("about to create the DLL Reference");
var serviceProxy = edge.func({
    assemblyFile: './dlls/TropicalCore.dll',
    typeName: 'TropicalCore.NodeFunctions.NodeFactoryService',
    methodName: 'InvokeService',
    references: ["System.Collections.dll"]
});
console.log("DLL Reference created");
module.exports = {
    getServiceProxy : function(service){
        console.log('trying to get a reference to the service '+ service);
        return serviceProxy ({'service':service},true);
    }
}