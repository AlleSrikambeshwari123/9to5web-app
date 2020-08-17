$(function () {
    $("#cancel").click(function () {
        window.history.back();
    });
    $("#change-customer-pwd-form").submit(function (event) {
        event.preventDefault();
        let data = extractFormData(this);
        if (data.password != data.confirmpassword) {
            showNotify('Failed', "Password doesn't match", 'fa fa-info', 'danger');
        }
        else {
            $.ajax({
                url: '/customer/change-pass',
                data: data,
                type: "post",
                success: function (response) {
                    swal({
                        title: response.success == true ? 'Updated' : 'Failed',
                        text: response.message,
                        type: response.success == true ? 'success' : 'error',
                    }).then(res => {
                        if (response.success == true) {
                            document.location.reload(true);
                        }
                    })
                }
            })
        }
    })
})