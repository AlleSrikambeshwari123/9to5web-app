$(function(){
    $(".rm-pilot").click(function(){
        var id = $(this).attr('data-id'); 
        //confirm 

        swal("Are you sure? ", {
            
            buttons: true,
            dangerMode: true,
            
        }).then((result)=>{
           console.log(result)
            if (result === true)
            {
                $.ajax({
                    url:'/fleet/rm-pilot',
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
    $(".edit-pilot").click(function(){
        var id = $(this).data('id'); 
        clearForm(); 
        $.ajax({
            url:'/fleet/get-pilot/'+id,
            contentType:'json',
            success:function(pilot){
                $("#id").val(pilot.id); 
                $("#name").val(pilot.name)
                $('#company').val(pilot.company); 
                $("#email").val(pilot.email); 
                $("#mobile").val(pilot.mobile)
                
            }
        })
    })
    function clearForm(){
        $("#id").val('0'); 
        $("#name").val('')
        $('#company').val(''); 
        $("#email").val(''); 
        $("#mobile").val('')
    }
    $("#save-pilot").click(function(){
        console.log('clicked to save the pilot')
        var pilot = {
            id: $("#id").val(),
            name:$("#name").val(),
            company:$("#company").val(),
            email:$("#email").val(),
            mobile:$("#mobile").val()
        }
        console.log('saving pilot ',pilot)
        if (validatePilot(pilot)){
            console.log('aboout to send to the pilot to be saved.')
            $(".close-del").trigger('click'); 
                    swal('Save Sucessful',{
                        icon:'success'
                    })
                    setTimeout(() => {
                        window.location = window.location; 
                }, 2000);
            $.ajax({
                url:'/fleet/save-pilot',
                type:'post',
                data:pilot,
                error:function(err){
                    console.log(err)
                },
                success:function(results){
                    console.log(results)
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

    function getPilot(){
        var pilot = {
            id: $("#id").val(),
            name:$("#name").val(),
            company:$("#company").val(),
            email:$("#email").val(),
            mobile:$("#mobile").val()
        }
        return pilot; 
    }
    function validatePilot(pilot){
        var isValid = true; 
        if (pilot.name == ""){
            isValid = false; 
        }
        if (pilot.company == ""){
            isValid = false; 
        }

        return isValid; 
    }
})