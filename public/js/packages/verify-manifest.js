$(function(){


    var itemsFile =$(document.getElementById('uploadxls'));
    console.log(itemsFile);
    if (itemsFile[0].files.length >0 ){
        uploadContentFile(itemsFile,function(data){
            var fileData = JSON.parse(data); 
            var request = {}; 
            request.filename = fileData[0].uploadedFile; 
            $.ajax({
                url:'/warehouse/verify-manifest',
                type:'post',
                data:request,
                success:function(faResponse){
                 
                  alert('success');
                }
              }); 
        }); 
    }
});