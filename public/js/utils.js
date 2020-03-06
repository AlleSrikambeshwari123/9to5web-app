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