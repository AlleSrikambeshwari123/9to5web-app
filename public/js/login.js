$(function () {
	$(".login-button").click(function () {
		var password = document.getElementById('password');
		var username = document.getElementById('username');
		$.ajax({
			url: '/',
			type: 'post',
			data: { username: username.value, password: password.value }
		}).done(function (res) {
			if (res.success) {
				if (res.role == "admin")
					window.location.replace('/admin');
			}
		});
	});
});