$(function(){
    $("#show-add").click(function(){
        clearForm()
    })
    $(".rm-compartment").click(function(){
        var id = $(this).attr('data-id'); 
        //confirm 

        swal("Are you sure? ", {
            
            buttons: true,
            dangerMode: true,
            
        }).then((result)=>{
           console.log(result)
            if (result === true)
            {
                console.log('deleting '+id)
                $.ajax({
                    url:'/fleet/rm-plane-compartment',
                    type:'post',
                    data: {planeId:$("#planeId").val(),id:id},
                    success:function(){
                        swal("The pilot was deleted",{
                            icon:'success'
                        })
                        setTimeout(() => {
                            window.location = window.location; 
                        }, 2000);
                    }
                })
            }
            
        })
     

    })
  
    // $(".edit-plane").click(function(){
    //     var id = $(this).data('id'); 
    //     clearForm(); 
    //     $.ajax({
    //         url:'/fleet/get-plane/'+id,
    //         contentType:'json',
    //         success:function(plane){
    //             console.log(plane); 
    //             setPlane(plane.plane)

                
    //         }
    //     })
    // })
    function clearForm(){
        $("#id").val('0'); 
        $("#name").val('')
        $('#weight').val(''); 
        $("#volume").val(''); 
    }
   
    $(".save-compartment").click(function(){
        console.log('clicked to save the pilot')
        var compartment  = getCompartment()
        console.log(compartment,"compartment");
        if (validateCompartment(compartment)){
            console.log('aboout to send to the plane to be saved.')
            $(".close-del").trigger('click'); 
                    swal('Save Sucessful',{
                        icon:'success'
                    })
                    setTimeout(() => {
                        window.location = window.location; 
                }, 2000);
            $.ajax({
                url:'/fleet/add-plane-compartment',
                type:'post',
                data:compartment,
                error:function(err){
                    console.log(err)
                },
                success:function(results){
                    console.log(results,"result of plane saved.")
                    //show success message close modal 
                    console.log('about to close the window')
                    
                   
                }
            })
        }
        else {
            
            swal("Opps", "The pilots' Name, Company and Mobile are required", {
                icon: "error",
                buttons: {
                    confirm: {
                        className: 'btn btn-danger'
                    }
                },
            });
        }
    })


    function getCompartment(){
        var compartment = {
            id: $("#id").val(),
            plane_id:$("#planeId").val(),
            name:$("#name").val(),
            weight:$("#max-weight").val(),
            volume:$("#max-vol").val(),
         
        }
        return compartment; 
    }
    function setCompartment(compartment){
      $("#id").val(plane.id),
      $("#tail-number").val(plane.tail_num),
      $("#aircraft-type").val(plane.aircarft_type),
      $("#contact").val(plane.contact_name),
      $("#phone").val(plane.contact_phone),
      $("#company").val(plane.company)
    }
   
    function validateCompartment(compartment){
        var isValid = true; 
        if (compartment.name == ""){
            isValid = false; 
        }
        if (compartment.weight == ""){
            isValid = false; 
        }

        return isValid; 
    }
  
})