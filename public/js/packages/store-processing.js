$(function(){
    $("#package").change(function(){
        storePackage($(this).val(), $("#bin").val()); 
    });

    

    function storePackage(package,bin){
        $.ajax({
            url:'/warehouse/store-package',
            type:'post',
            data:{package:package,bin:bin},
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
            <td>${package.location.toUpperCase()}</td>
            </tr>
        `); 
        $("#package").val(''); 
        $("#package").focus(); 
    }
}); 