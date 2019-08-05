$(function () {
	$("#saveFrom").submit(function (e) {
		console.log(e);
		var routeName = $("routeName").val();
		var description = $("description").val();

		console.log(routeName, description);
		return true;
	})
	$('#cancel').click(function () {
		window.history.back();
	})
})