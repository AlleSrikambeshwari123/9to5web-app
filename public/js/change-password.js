$(function(){

    $(".change-pass").click(function(){

        
        var data = {
            oldPass:$("#oldpass").val(),
            newPass:$("#pass").val(),
            confPass: $("#cpass").val(),
        }
        console.log(data);
        if (data.confPass != data.newPass){
            swal("Hey", "Your password doesn't match", {
                icon: "error",
                buttons: {
                    confirm: {
                        className: 'btn btn-danger'
                    }
                },
            });
            return ; 
        }
        else {
            console.log(data)
            $.ajax({
                url:'/change-pass',
                data:data,
                type:"post",
                success:function(rs){
                    swal("Hey", "Your password has been updated", {
                        icon: "success",
                        buttons: {
                            confirm: {
                                className: 'btn btn-info'
                            }
                        },
                    });
                }
            })
        }
      
    })
})