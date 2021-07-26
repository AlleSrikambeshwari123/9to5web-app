$(document).ready(function () {
  const _spinner = "<i class='fa fa-spinner fa-spin'></i>";
  $("#updateProfileForm").submit(async function (event) {
    event.preventDefault();
    const form = $(this);
    const button = form.find("button[type='submit']");
    button.prop("disabled", true).html(_spinner);
    const data = {
      firstName: form.find("[name='firstName']").val(),
      lastName: form.find("[name='lastName']").val(),
      telephone: form.find("[name='telephone']").val(),
    };

    try {
      await postJson("/customer/update/profile", data);
      showNotify(
        "Sucess",
        "Profile updated successfully !",
        "fa fa-info",
        "success"
      );
    } catch (err) {
      showNotify("Failed", "Internal Server Error", "fa fa-info", "danger");
    }
    button.html("Save").prop("disabled", false);
  });
});
