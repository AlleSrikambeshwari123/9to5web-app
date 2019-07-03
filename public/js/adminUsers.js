$(function () {
    $("#area").val($("#pickupValue").val())
    $(".enableUser").click(function () {
        var username = $(this).attr('data-id');
        var enabled = $(this).attr('data-value');
        $.ajax({
            url: '/admin/enable-user/',
            type: 'post',
            data: { username: username, enabled: enabled },
            success: function (result) {
                swal("Hey", "User Status Updated", {
                    icon: "success",
                    buttons: {
                        confirm: {
                            className: 'btn btn-success'
                        }
                    },
                });
                setTimeout(function () {
                    window.location = '/admin/users';
                }, 2000);
            }
        });
    });
    $('.rm-user').click(function () {
        var username = $(this).attr('data-id');
        var row = $(this).closest('row');
        $.ajax({
            url: '/admin/rm-user',
            type: 'post',
            data: { username: username },
            success: function (result) {
                setTimeout(function () {
                    window.location = '/admin/users';
                }, 2000);
                swal("Hey", "User Successfully Deleted", {
                    icon: "success",
                    buttons: {
                        confirm: {
                            className: 'btn btn-success'
                        }
                    },
                });
            }
        });
    });

    $("#cancelForm").click(function () {
        window.history.back();
        console.log("Cancel Button Clicked");
    });

    $("#saveFrom").submit(function (e) {
        //validate dropdownlist 
        var roleId = $("#userRole").val();
        var password = $("#password").val();
        var cpass = $("#cpass").val();
        if (cpass != password) {
            e.preventDefault(e);
            swal("Hey", "Your password doesn't match", {
                icon: "error",
                buttons: {
                    confirm: {
                        className: 'btn btn-danger'
                    }
                },
            });
        }
        if (roleId == '') {
            e.preventDefault(e);
            swal("Hey", "Please select a user role", {
                icon: "warning",
                buttons: {
                    confirm: {
                        className: 'btn btn-warning'
                    }
                },
            });
        }
        else {
            return true;
        }
    });
}); 