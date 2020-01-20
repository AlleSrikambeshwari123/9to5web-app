$(function () {
	$(".login-button").click(function () {
		var password = document.getElementById('password');
		var username = document.getElementById('username');
		$.ajax({
			url: '/',
			type: 'post',
			data: { username: username.value, password: password.value },
			success: function (res) {
				console.log(res);
				if (res.success) {

					if (res.role.indexOf("Admin") > -1) {

						window.location.replace('/admin');
					}
					else if (res.role.indexOf("Warehouse Fl") > -1) {
						window.location.replace("/warehouse/fll-new-package")
					}
					else if (res.role.indexOf("Warehouse NAS") > -1) {
						window.location.replace("warehouse/nas-no-docs")
					}
					else if (res.role.indexOf("Stores") > -1) {
						window.location.replace("warehouse/store-packages")
					}
					else {
					}
				}
			}
		});
	});
	$('.forgot-password').click(function () {
		window.location.replace('./forgot-password')
	})
});