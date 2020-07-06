$(function () {
  let initialPackages = packages;

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
    // Clearing the previous data
    $('.package-table').dataTable().fnClearTable();

    initialPackages.forEach(pkg => {
      if (pkg.customerId.location === locationId || locationId == 'All') {
        packageTable.row.add([
          formatDate(pkg.createdAt),
          pkg.location,
          pkg.trackingNo,
          pkg.customerId.pmb + ' - ' + getFullName(pkg.customerId),
          pkg.awbId ? pkg.awbId.awbId:'' ,
          pkg.description,
          pkg.weight + ' lbs'
        ]).draw(false);
      }
    })
  })
});  


