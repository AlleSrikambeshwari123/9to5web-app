function showNotify(title, message, icon, type) {
  $.notify({
    title: title,
    message: message,
    icon: icon,
    target: '_blank'
  }, {
    type: type,
    placement: {
      from: "top",
      align: "right",
    },
    time: 1000,
    delay: 3000
  });
}

function extractFormData(form) {
  let formData = $(form).serializeArray();
  let data = {};
  $.each(formData, function (_, record) {
    data[record.name] = record.value
  })
  return data;
}

function calculatePackageVolumetricWeight(pkg) {
  let dimensions = pkg.dimensions.split('x').map(Number);
  // Assuming dimensions are in inches
  return dimensions[0] * dimensions[1] * dimensions[2] / 166;
}

function validateEmail(email) {
  const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(String(email).toLowerCase());
}

function formatDate(date) {
  if (!date) return '';
  return moment(date).format('MMM DD,YYYY HH:mm');
}

// This method is used for displaying the fullName by concatinating the firstName
// and lastName.
function getFullName(objData) {
  if (!objData || (!objData.firstName && !objData.lastName)) {
    return '';
  } else {
    return objData.firstName + ' ' + objData.lastName;
  }
};

document.onreadystatechange = function() { 
  if (document.readyState !== "complete") { 
      document.querySelector( 
        "#myLoader").style.visibility = "visible"; 
  } else { 
      document.querySelector( 
        "#myLoader").style.display = "none"; 
  } 
};

function downloadFileD(blob, type){  
  $.ajax({
    url:blob,
    type:'GET',   
    beforeSend: function(){ 
  
      document.getElementById('myLoader').style.display='';
    },
    success: function(response){
        document.getElementById('myLoader').style.display='none';            
    },
    error: function(){
    }
  });
}
function downloadFile(blob, type){

}

$(function(){$('.download-spinner').click(function() { ShowDownloadMessage(); }); })

function ShowDownloadMessage()
{  
     document.getElementById('myLoader').style.display='';
     window.addEventListener('focus', HideDownloadMessage, false);
}

function HideDownloadMessage(){
    window.removeEventListener('focus', HideDownloadMessage, false);                   
    document.getElementById('myLoader').style.display='none';
}