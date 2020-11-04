
$(document).on('click', '.applyBtn', function() {
    window.location = "/customer/dashboard?daterange="+$('.daterange').val();
  })
  
  $(document).on('click', '.cancelBtn', function() {
    window.location = "/customer/dashboard?clear=1";
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