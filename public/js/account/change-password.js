$(function () {
    $("#cancel").click(function () {
        window.history.back();
    });
    $("#change-pwd-form").submit(function (event) {
        event.preventDefault();
        let formData = $(this).serializeArray();
        let data = {};
        $.each(formData, function (_, record) {
            data[record.name] = record.value
        })
        console.log(data);
        if (data.password != data.confirmpassword) {
            showNotify('Failed', "Password doesn't match", 'fa fa-info', 'danger');
        }
        else {
            console.log(data)
            $.ajax({
                url: 'change-pass',
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
    function showNotify(title, message, icon, type) {
        $.notify({
            title: title,
            message: message,
            icon: icon,
            target: '_blank'
        }, {
            type: type,
            placement: {
                from: "top",
                align: "right",
            },
            time: 1000,
            delay: 3000
        });
    }
})