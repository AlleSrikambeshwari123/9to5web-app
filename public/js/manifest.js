

$(function(){
    
    function addManifest(manifest){
        //check to see if the card body has a table if not add it i
        var table = $(".mlisting"); 
        console.log("listing"); 
        console.log(manifest); 
        table.show(); 
        setTimeout(function(){
            var tableBody = $(".mlisting").find('#data-listing'); 
            console.log(tableBody);
            if (tableBody.length ==0){
               table.append(`<tbody id="data-listing"><tr> <td>M-${manifest.mid} </td> <td>${manifest.stage} </td> <td>${moment(manifest.dateCreated,"YYYY-MM-DD").format("dddd, LL")} </td> <td>${manifest.createdBy} </td> <td><a href='/warehouse/m-packages/${manifest.mid}' class='btn btn-sm btn-primary'>Manage</a> <button class='btn btn-danger btn-sm'>Delete</button> </td> </tr></tbody>`); 
                console
    
            }
            else {
    
                $(tableBody).prepend(`<tr> <td><strong>M-${manifest.mid}</strong> </td> <td>${manifest.stage} </td> <td>${moment(manifest.dateCreated,"YYYY-MM-DD").format("dddd, LL")} </td> <td>${manifest.createdBy} </td> <td><a href='/warehouse/m-packages/${manifest.mid}' class='btn btn-sm btn-primary'>Manage</a> <button class='btn btn-danger btn-sm'>Delete</button> </td> </tr>`);
            }
        },100)
       

    }

    $(".create-manifest").click(function(){
        var mtype = $(this).attr('data-type'); 
        $.ajax({
            url:'/warehouse/create-manifest',
            type:'post',
            data:{mtype:mtype},
            success:function(result){
                console.log(result);
                if (result.manifest.mid > 0 ){
                    notes.show("Manifest Created", {
                        type: 'success',
                        title: 'Hey',
                        icon: '<i class="icon-icon-lock-open-outline"></i>',
                        sticky: true,
                        hide:3000
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