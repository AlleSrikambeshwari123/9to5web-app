$('#locationId').select2({
  theme: 'bootstrap',
  width: '100%',
  placeholder: 'Select a location'
})

var packageTable = $('.package-table').DataTable({
  pageLenth: 10,
  order: [[0, 'desc']]
})

$('#locationId').change(function () {
  var locationId = $(this).val();
  var locationName = $('#locationId option:selected').text();
  packageTable.clear();
  $.ajax({
    url: '/store/package/location/' + locationId,
    type: 'get',
    success: packages => {
      packages.forEach(pkg => {
        packageTable.row.add([
          pkg.status.datetimestamp,
          locationName,
          pkg.trackingNo,
          pkg.customer.pmb + ' - ' + pkg.customer.firstName + ' ' + pkg.customer.lastName,
          pkg.awbId,
          pkg.description,
          pkg.weight + ' lbs'
        ]).draw(false);
      })
    }
  })
})