$('.changeLocation').select2({
  theme: 'bootstrap',
  width: '100%',
  placeholder: 'Select a location',
});

$(function () {
  let initialPackages = JSON.parse($('.packages').val());
  //var packageTable = $('#cableBeachList-table').DataTable();

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

 // var albonyTable = $('#albonyList-table').DataTable();
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

// $('#albonyList-table').DataTable({
//   pageLength: 10,
// });
// $('#cableBeachList-table').DataTable({
//   pageLenth: 10,
//   order: [[0, 'desc']],
// });
$(document).ready(function() { 
  if($('#clear').val() ){
    $('#daterange').val('')
    $('#clear').val('1')
  }
  setTimeout(()=>{
    if($('#clear').val() ){
      $('#daterange').val('')
      $('#clear').val('1')
    }else
      $('.daterange').val($('#daterange').val())
  },1000)
  var cableDataTable = $('#cableBeachList-table').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/store/all_store-check-in",
      type: "POST",
      data :function(data){
        data.daterange = $('#daterange').val();
        data.clear = $('#clear').val();
        data.location =$("#locationId-cableBeach").val();
     }
      
    },
  })
     
    // Event listener to the two range filtering inputs to redraw on input
    $(document).on('click', '.applyBtn', function() {
        window.location = "/store/store-check-in?daterange="+$('.daterange').val();
    });
    $(document).on('click', '.cancelBtn', function() {
      window.location = "/store/store-check-in?clear=1";
    });  
    $(document).on('change', '#locationId-cableBeach', function() {     
      cableDataTable.draw();
    })

    //albony

    var albonyDataTable = $('#albonyList-tables').DataTable( {
      "processing": true,
      "serverSide": true,    
      "ajax": {
        url: "/store/all_store-check-in-albony",
        type: "POST",
        data :function(data){
          data.daterange = $('#daterange').val();
          data.clear = $('#clear').val();
          data.location =$("#locationId-albony").val();
       }        
      },
    })
       
       
      $(document).on('change', '#locationId-albony', function() {     
        albonyDataTable.draw();
      })
    
})
