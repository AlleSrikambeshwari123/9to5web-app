$(function(){
    $("#show-add").click(function(){
        clearForm()
    })
    $(".rm-plane").click(function(){
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
                    url:'/fleet/rm-plane',
                    type:'post',
                    data: {id:id},
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
  
    $(".edit-plane").click(function(){
        var id = $(this).data('id'); 
        clearForm(); 
        $.ajax({
            url:'/fleet/get-plane/'+id,
            contentType:'json',
            success:function(plane){
                console.log(plane); 
                setPlane(plane.plane)

                
            }
        })
    })
    function clearForm(){
        $("#id").val('0'); 
        $("#tail-number").val('')
        $('#aircraft-type').val(''); 
        $("#company").val(''); 
        $("#contact").val('')
        $("#phone").val('')
    }
    function clearCompartmentForm(){

    }
    $(".save-plane").click(function(){
        console.log('clicked to save the pilot')
        var plane  = getPlane()
       
        if (validatePlane(plane)){
            console.log('aboout to send to the plane to be saved.')
            $(".close-del").trigger('click'); 
                    swal('Save Sucessful',{
                        icon:'success'
                    })
                    setTimeout(() => {
                        window.location = window.location; 
                }, 2000);
            $.ajax({
                url:'/fleet/save-plane',
                type:'post',
                data:plane,
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


    function getPlane(){
        var plane = {
            id: $("#id").val(),
            tail_num:$("#tail-number").val(),
            aircarft_type:$("#aircraft-type").val(),
            contact_name:$("#contact").val(),
            contact_phone:$("#phone").val(),
            company:$("#company").val()
        }
        return plane; 
    }
    function setPlane(plane){
      $("#id").val(plane.id),
      $("#tail-number").val(plane.tail_num),
      $("#aircraft-type").val(plane.aircarft_type),
      $("#contact").val(plane.contact_name),
      $("#phone").val(plane.contact_phone),
      $("#company").val(plane.company)
    }
   
    function validatePlane(plane){
        var isValid = true; 
        if (plane.tail_num == ""){
            isValid = false; 
        }
        if (plane.aircarft_type == ""){
            isValid = false; 
        }

        return isValid; 
    }
  
})