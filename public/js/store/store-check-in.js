$('.changeLocation').select2({
  theme: 'bootstrap',
  width: '100%',
  placeholder: 'Select a location',
});

$(function () {
  let initialPackages = JSON.parse($('.packages').val());
  var packageTable = $('#cableBeachList-table').DataTable();

  $('#locationId-cableBeach').change(function () {
    var locationId = $(this).val();
    var locationName = $(this).find(':selected').text();
    // Clearing the previous data
    $('#cableBeachList-table').dataTable().fnClearTable();
    initialPackages.forEach((pkg, i) => {
      if (locationName === (pkg.location ? pkg.location : 'Empty') || locationId == 'All') {
        let pmb = pkg.customerId ? pkg.customerId.pmb : 0;
        if ((pmb > 0 && pmb <= 1999) || (pmb >= 4000 && pmb <= 4999)) {
          packageTable.row
            .add([
              formatDate(pkg.createdAt),
              pkg.location ? pkg.location : '',
              pkg.trackingNo,
              pkg.customerId ? pkg.customerId.pmb + ' - ' + getFullName(pkg.customerId) : '',
              pkg.awbId ? pkg.awbId.awbId : '',
              pkg.description,
              pkg.weight + ' lbs',
            ])
            .draw(false);
        }
      }
    });
  });

  var albonyTable = $('#albonyList-table').DataTable();
  $('#locationId-albony').change(function () {
    var locationId = $(this).val();
    var locationName = $(this).find(':selected').text();
    // Clearing the previous data
    $('#albonyList-table').dataTable().fnClearTable();
    initialPackages.forEach((pkg) => {
      if (locationName === pkg.location || locationId == 'All') {
        let pmb = pkg.customerId ? pkg.customerId.pmb : 0;
        if (pmb >= 3000 && pmb <= 3999) {
          albonyTable.row
            .add([
              formatDate(pkg.createdAt),
              pkg.location ? pkg.location : '',
              pkg.trackingNo,
              pkg.customerId ? pkg.customerId.pmb + ' - ' + getFullName(pkg.customerId) : '',
              pkg.awbId ? pkg.awbId.awbId : '',
              pkg.description,
              pkg.weight + ' lbs',
            ])
            .draw(false);
        }
      }
    });
  });
});

$('#albonyList-table').DataTable({
  pageLength: 10,
});
$('#cableBeachList-table').DataTable({
  pageLenth: 10,
  order: [[0, 'desc']],
});
