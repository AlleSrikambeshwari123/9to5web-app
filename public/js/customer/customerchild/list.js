$(function () {
    let customerId = window.location.href.split('/')[6]
    $('.rm-customer').click(function () {
      var id = $(this).data('id');
      swal({
        title: "Are you sure?",
        showCancelButton: true,
        confirmButtonText: 'Delete',
      }).then(response => {
        if (response.value) {
          $.ajax({
            url: '/customer/customerchild/manage/' + id + '/delete',
            type: 'delete',
            success: function (response) {
              swal({
                title: response.success == true ? 'Removed' : 'Failed',
                text: response.message,
                type: response.success == true ? 'success' : 'error',
              }).then(res => {
                if (response.success == true) {
                  $('tr[data-record="' + id + '"]').fadeOut('slow', () => $('tr[data-record="' + id + '"]').remove())
                }
              })
            }
          });
        }
      })
    });
  }); 

$(document).on('click', '.applyBtn', function() {
  window.location = "/customer/customerchild/list/"+$('#customer').val()+"?daterange="+$('.daterange').val();
})

$(document).on('click', '.cancelBtn', function() {
  window.location = "/customer/customerchild/list/"+$('#customer').val()+"?clear=1";
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