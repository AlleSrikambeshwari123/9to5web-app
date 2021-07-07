function generate_allawb_report(){
  $.ajax({
     url: "/reports/all-awb/status_report",
     type: "post",
     data: {daterange:$("#daterange-allAwb").val()} ,
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

function generate_delivery_report(){
console.log("fromme",$("#daterange-delivery-detail").val()      )
  $.ajax({
      url: "/reports/delivery-detail/report",
      type: "post",
      data: {
          daterange:$("#daterange-delivery-detail").val()                
      } ,
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

function generate_package_detail_report(){
  $.ajax({
      url: "/reports/package-detail/report",
      type: "post",
      data: {
          daterange:$("#daterange-package-detail").val(),
          user:$("#package_detail_user").val(),
          status:$("#package_detail_status").val()
      } ,
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

function generate_postbox_report(){
$.ajax({
  url: "/reports/postbox-etc-package-detail/report",
  type: "post",
  data: {
      daterange:$("#daterange-postbox-detail").val(),
      user:$("#postbox_detail_user").val(),
      status:$("#post_detail_status").val()
  } ,
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

function generate_ninetofive_package_report(){
$.ajax({
  url: "/reports/ninetofive-package-detail/report",
  type: "post",
  data: {
      daterange:$("#daterange-ninetofive-detail").val(),
      user:$("#ninetofive_detail_user").val(),
      status:$("#ninetofive_detail_status").val()
  } ,
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

function generate_nodocs_package_report(){
$.ajax({
  url: "/reports/nodocs-detail/report",
  type: "post",
  data: {
      daterange:$("#daterange-ninetofive-detail").val(),
      user:$("#nodocs_detail_user").val(),
      status:$("#nodocs_detail_status").val()
  } ,
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

function generate_users_report(){
$.ajax({
  url: "/reports/users-detail/report",
  type: "post",
  data: {
      daterange:$("#daterange-users-dashboard-detail").val()        
  },
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

function generate_package_status_report(){
$.ajax({
  url: "/reports/package-status-detail/report",
  type: "post",
  data: {
      daterange:$("#daterange-package-status-detail").val()        
  },
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
