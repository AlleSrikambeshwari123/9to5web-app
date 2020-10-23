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
    $('.vehicle-table').DataTable( {
      "processing": true,
      "serverSide": true,    
      "ajax": {
        url: "/fleet//vehicle/all-list",
        type: "POST",
        data :{ daterange:$('#daterange').val(), clear:$('#clear').val()}
      },
    })     
      // Event listener to the two range filtering inputs to redraw on input
    $(document).on('click', '.applyBtn', function() {
        window.location = "/fleet//vehicle/list?daterange="+$('.daterange').val();
    });
    $(document).on('click', '.cancelBtn', function() {
      window.location = "/fleet/vehicle/list?clear=1";
    });  
  })