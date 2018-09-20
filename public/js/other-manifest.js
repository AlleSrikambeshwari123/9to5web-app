

$(function(){
    
    function addManifest(manifest){
        //check to see if the card body has a table if not add it i
        var table = $(".mlisting"); 
        table.show(); 
        var tableBody = $(".mlisting").find('tbody'); 
        if (!tableBody){
           table.append(`<tbody id="data-listing"><tr> <td>M-${manifest.ManifestId} </td> <td>${manifest.StageName} </td> <td>${manifest.DateCreatedDisplay} </td> <td>${manifest.CreatedBy} </td> <td><a href='/warehouse/m-packages/${manifest.ManifestId}' class='btn btn-sm btn-primary'>Manage</a> <button class='btn btn-danger btn-sm'>Delete</button> </td> </tr></tbody>`); 


        }
        else {
            $(tableBody).append(`<tr> <td>M-${manifest.ManifestId} </td> <td>${manifest.StageName} </td> <td>${manifest.DateCreatedDisplay} </td> <td>${manifest.CreatedBy} </td> <td><a href='/warehouse/m-packages/${manifest.ManifestId}' class='btn btn-sm btn-primary'>Manage</a> <button class='btn btn-danger btn-sm'>Delete</button> </td> </tr>`);
        }

    }

    $(".create-manifest").click(function(){
        var mtype = $(this).attr('data-type'); 
        $.ajax({
            url:'/warehouse/create-manifest',
            type:'post',
            data:{mtype:mtype},
            success:function(result){
                if (result.manifestId > 0 ){
                    notes.show("Manifest Created", {
                        type: 'success',
                        title: 'Hey',
                        icon: '<i class="icon-icon-lock-open-outline"></i>',
                        sticky: true
                    });
                    $(".alert-warning").hide();
                    console.log(result);
                    addManifest(result.manifest);     
                }
                else  {
                    //show the message that 
                    notes.show(result.message, {
                        type: 'error',
                        title: 'Hey',
                        icon: '<i class="icon-icon-lock-open-outline"></i>',
                        sticky: true
                    });
                }
                
            }


        });
    }); 
}); 