$(document).ready(function() {
    setTimeout(()=>{
      if(daterange){
       $('.daterange').val(daterange);
      }
    },100)
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
  $(document).on('click', '.applyBtn', function() {
    window.location = "/reports/all-awb/status?daterange="+$('.daterange').val();
  })
  
  $(document).on('click', '.cancelBtn', function() {
    window.location = "/reports/all-awb/status?clear=1";
  })
  var table = $('.allawb').DataTable();
  

  function generate_report(){
     $.ajax({
        url: "/reports/all-awb/status_report",
        type: "post",
        data: {daterange:$("#daterange-noDocs").val()} ,
        success: function (response) {
          if(response && response.status){
            swal("Report!", "Please wait while your report is generated.!", "success");
          }else{
            swal("Report!", "Something went wrong Please try again after 5 min.!", "error");
          }
           
        },
        error: function(jqXHR, textStatus, errorThrown) {
           console.log(textStatus, errorThrown);
        }
    });
  }