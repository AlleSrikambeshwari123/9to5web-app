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

function extractFormData(form) {
  let formData = $(form).serializeArray();
  let data = {};
  $.each(formData, function (_, record) {
    data[record.name] = record.value
  })
  return data;
}

function calculatePackageVolumetricWeight(pkg) {
  let dimensions = pkg.dimensions.split('x').map(Number);
  // Assuming dimensions are in inches
  return dimensions[0] * dimensions[1] * dimensions[2] / 139;
}

function validateEmail(email) {
  const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(String(email).toLowerCase());
}

function formatDate(date) {
  if (!date) return '';
  return moment(date).format('MMM DD,YYYY HH:mm');
}

// This method is used for displaying the fullName by concatinating the firstName
// and lastName.
function getFullName(objData) {
  if (!objData || (!objData.firstName && !objData.lastName)) {
    return '';
  } else {
    return objData.firstName + ' ' + objData.lastName;
  }
};