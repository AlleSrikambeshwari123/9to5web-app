$('.changeLocation').select2({
  theme: 'bootstrap',
  width: '100%',
  placeholder: 'Select a location',
});

$(function () {
  let initialPackages = JSON.parse($('.packages').val());
  var packageTable = $('#cableBeachList-table').DataTable();

  /*$('#locationId-cableBeach').change(function () {
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
              pkg.weight + ' lbs',
              pkg.weight + ' lbs',
            ])
            .draw(false);
        }
      }
    });
  });*/
  var albanyPackageTable = $('#albonyList-table').DataTable();
  
 
// #column3_search is a <input type="text"> element
$('#locationId-cableBeach').on( 'change', function () {
  if(this.value != "All"){
    packageTable
          .columns( 0 )
          .search( this.value )
          .draw();
  }else{
    window.location.reload();
  }
} );

$('#locationId-albony').on( 'change', function () {
  if(this.value != "All"){
    albanyPackageTable
          .columns( 0 )
          .search( this.value )
          .draw();
  }else{
    window.location.reload();
  }
});

  /*var albonyTable = $('#albonyList-table').DataTable();
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
  });*/
});

$('#albonyList-table').DataTable({
  pageLength: 10,
});
$('#cableBeachList-table').DataTable({
  pageLenth: 10,
  order: [[0, 'desc']],
});

var redirectUrl = '/store/store-check-in';
$(document).on('click', '.applyBtn', function() {
  window.location = redirectUrl+"?daterange="+$('.daterange').val();
})

$(document).on('click', '.cancelBtn', function() {
  window.location = redirectUrl+"?clear=1";
})
$(document).ready(function() {
  setTimeout(()=>{
		if($('#clear').val() ){
		  // $('#daterange').val('')
		  $('#clear').val('1');
		  var endate = new Date();      
		  endate.setDate(endate.getDate());
		  var stdate = new Date();
		  stdate.setDate(stdate.getDate() -14);      
		  var dateRange = (stdate.getMonth() + 1)+ '/'+stdate.getDate()+'/'+stdate.getFullYear()+' - '+
		  (endate.getMonth() + 1)+ '/'+endate.getDate()+'/'+endate.getFullYear()      
		  $('.daterange').val(dateRange)
		}	   
	},100)

})
