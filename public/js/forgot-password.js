var remote = require('electron').remote;
var main = remote.require('./main.js');
var axios = require('axios');
const { ipcRenderer } = require('electron');

var username = document.getElementById('reset_password_username');
var loginBtn = document.getElementById('send_request');

var containerResetPassword = $(".container-login")
	, containerResetSent = $(".container-signup")
	, wrongPassword = $(".wrongPassword")
	, showResetPassword = true
	, showResetSent = false
	, isWrongPassword = false;

$(".form-floating-label .form-control").keyup(function () {
	"" !== $(this).val() ? $(this).addClass("filled") : $(this).removeClass("filled")
});

function changeContainer() {
	showResetPassword ? containerResetPassword.css("display", "block") : containerResetPassword.css("display", "none");
	showResetSent ? containerResetSent.css("display", "block") : containerResetSent.css("display", "none");
	isWrongPassword ? wrongPassword.css("display", "block") : wrongPassword.css("display", "none")
}
changeContainer();

loginBtn.addEventListener('click', function () {
	var user = {
		email: username.value
	};
	console.log(user)
	axios.post('http://209.97.151.217:3000/users/request-pwd-reset', user).then(function (response) {
		console.log(response.data);
		if (response.data.code != "") {
			showResetPassword = false;
			showResetSent = true;
			isWrongPassword = false;
			changeContainer()
		}
		else {
			showResetPassword = true;
			showResetSent = false;
			isWrongPassword = true;
			changeContainer()
		}
	}).catch(function (err) {
		console.log(err);
	});

});

document.getElementById('back').addEventListener('click', function () {
	window.location = "login.html";
})
document.getElementById('back2').addEventListener('click', function () {
	window.location = "login.html";
})

$("back").on("click", function () {
	window.location = "index.html";
})

ipcRenderer.on('login-result', (event, arg) => {
	if (arg.valid == true) {
		var window = remote.getCurrentWindow();
		main.openWindow('pages/appointment');
		window.close();
	}
	else {
	}
});