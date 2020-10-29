$(document).on('click', '.applyBtn', function() {
    window.location = "/customer/customerchild/no-docs/"+$('#customer').val()+"?daterange="+$('.daterange').val();
})
  
$(document).on('click', '.cancelBtn', function() {
window.location = "/customer/customerchild/no-docs/"+$('#customer').val()+"?clear=1";
})
$(document).ready(function() {
    setTimeout(()=>{
        console.log("no docs",$('#clear').val())
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