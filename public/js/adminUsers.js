$(function(){


    $(".enableUser").click(function(){
       var username = $(this).attr('data-id'); 
       var enabled = $(this).attr('data-value'); 
       $.ajax({
           url:'/admin/enable-user/',
           type:'post',
           data:{username:username,enabled:enabled},
           success:function(result){
            notes.show("User Status Updated", {
                type: 'success',
                title: 'Hey',
                icon: '<i class="icon-icon-lock-open-outline"></i>',
                sticky: true
            });
            setTimeout(function(){
                window.location = '/admin/users'; 
               },2000);
           }
       });
    }); 
    $('.rm-user').click(function(){
        var username = $(this).attr('data-id'); 
        var row = $(this).closest('row');
        $.ajax({
            url:'/admin/rm-user',
            type:'post',
            data:{username:username},
            success:function(result){
               setTimeout(function(){
                window.location = '/admin/users'; 
               },2000);
                notes.show("User Successfully Deleted", {
                    type: 'success',
                    title: 'Hey',
                    icon: '<i class="icon-icon-lock-open-outline"></i>',
                    sticky: true
                });
            }
        });
    }); 
    $("#saveFrom").submit(function(e){
        //validate dropdownlist 
     
        var roleId = $("#userRole").val();
        var password = $("#password").val(); 
        var cpass = $("#cpass").val(); 
        if (cpass != password){
            e.preventDefault(e); 
            notes.show("Your password don't match", {
                type: 'danger',
                title: 'Hey',
                icon: '<i class="icon-icon-lock-open-outline"></i>',
                sticky: true
            });
        }
        if (roleId =='') 
        {
             e.preventDefault(e); 
             notes.show("Please select a user role", {
                type: 'warning',
                title: 'Hey',
                icon: '<i class="icon-flag-outline"></i>',
                sticky: true
            });
        }   
        else {
            return true; 
        }    
    }); 
}); 