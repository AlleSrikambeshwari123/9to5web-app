
let user = JSON.parse($('.user-info').val());

$('.reset-form').submit(function (event) {  
  event.preventDefault();
  let data = extractFormData(this);
  let formUrl = $(this).attr('action');

  const re = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/;
  if(!re.test(data.password)){
    showNotify("Failed", "Password is not valid.Enter at least 8 characters, at least one number, one lowercase and one uppercase letter", 'fa fa-info', "danger");
    return false;
  }
  if (data.password != data.confirm_password) {
    showNotify('Failed', "Password doesn't match", 'fa fa-info', 'danger');
  } else {   
    $.post(formUrl, data).then(response => {
      if (response.success == true) {
        let loginUrl = "/";
        document.location.href = '/reset-password/success';
      } else {
        showNotify("Failed", response.message, 'fa fa-info', "danger");
      }
    })
  }
})