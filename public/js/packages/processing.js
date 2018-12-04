$(function(){

    $("#package").change(function(){
        processPackage($(this).val()); 
    });

    $("#manifest").change(function(){
        //get the list of processing pacakges 
        var id = $(this).val(); 
        console.log(id +" is the manifest id we")
        $.ajax({
            url:'/warehouse/get-processing/'+id,
            contentType:'json',
            success:function(result){
                console.log(result); 
                result.forEach(function(package){
                    $("#processedPackages").append(`
                    <tr>
                    <td>${package.skybox}</td>
                    <td>${package.customer}</td>
                    <td>${package.trackingNo}</td>
                    
                    </tr>
                    })
                    
                `); 
                })
                  
            }
        })

    })

    function processPackage(package){
        $.ajax({
            url:'/warehouse/process-package',
            type:'post',
            data:{package:package},
            success:function(result){
                
                if (result.updated == true){
                    // add package to tabel 
                 addPackageToTable(result.package)
                }
            }
        });
    }

    function addPackageToTable(package){
        $("#scannedPackages").append(`
            <tr>
            <td>${package.skybox}</td>
            <td>${package.customer}</td>
            <td>${package.trackingNo}</td>
            
            </tr>
        `); 
        $("#package").val(''); 
        $("#package").focus(); 
    }
})