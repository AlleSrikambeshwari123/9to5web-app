
// let packageTable = $('.package-table').DataTable({
//   pageLength: 10,
//   columnDefs: [
//     {
//       orderable: false,
//       targets: 0,
//     },
//   ],
//   select: {
//     style: 'multi',
//     selector: 'td:first-child input[type="checkbox"]',
//   }
// });
let packageTable
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
  packageTable = $('.package-table').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/package/all-list",
      type: "POST",
      data :{ daterange: $('#daterange').val(), 
      clear:$('#clear').val()}
    },
  })
  packageTable = $('.package-table-filter-package').DataTable( {
    "processing": true,
    "serverSide": true,    
    "ajax": {
      url: "/warehouse/package/all-deliver-list/",
      type: "POST",
      data :{ 
        daterange: $('#daterange').val(), 
        clear: $('#clear').val(), 
        filterURL: $('#filterURL').val()
      }
    },
  })
  var applyurl = "/warehouse/package/list";
  if( $("#filter").val() == "deliver"){
    applyurl ="/warehouse/package/list/deliver";
  }
    // Event listener to the two range filtering inputs to redraw on input
    $(document).on('click', '.applyBtn', function() {
        window.location = applyurl+"?daterange="+$('.daterange').val();
    });
    $(document).on('click', '.cancelBtn', function() {
      window.location = applyurl+"?clear=1";
    });
})



// $('#package-table').on('draw.dt', function() {
//   unSelectAll();
// });

function unSelectAll() {
  packageTable.rows().deselect();
  $("tr").removeClass("selected");
  $("input.package-select-all").removeClass("selected");
  $("input.package-select").prop("checked", false);
  $("input.package-select-all").prop("checked", false);
}

$('#package-table').on('click', '.btn-edit-pricelabel', function () {
  const id = $(this).data('id');
  $('#setIdPriceLabel').val(id);
  $('#Brokerage').val(''),
    $('#CustomsProc').val(''),
    $('#sum-of-charges').val(''),
    $('#CustomsVAT').val(''),
    $('#Delivery').val(''),
    $('#Duty').val(''),
    $('#EnvLevy').val(''),
    $('#Freight').val(''),
    $('#Hazmat').val(''),
    $('#Pickup').val(''),
    $('#ServiceVat').val(''),
    $('#Storage').val(''),
    $('#NoDocsVal').val(''),
    $('#InsuranceVal').val(''),
    $('#SedVal').val(''),
    $('#ExpressVal').val(''),
    $('#TotalWet').val(''),
    $('#total-value-invoice').html(''),
    $("#override-value-invoice").val('')
    $.ajax({
      url: '/warehouse/pricelabels/' + id,
      type: 'get',
      success: function (response) {
        console.log(response);
        $('input').css({"color" : "black"})
        if (response.awbId) {
          pricelLabelCheck(response)
        } else {
          $.ajax({
            url: '/warehouse/pricelabels-package/' + id,
            type: 'get',
            success: function (response) {
              packagePriceLabel(response)
            }
          })
        }
      },
      error: function () {
      }
    });

});

function pricelLabelCheck(response) {
  const pkg = response.awbId;
  let ServiceVat = (response.ServiceVat || 0).toFixed(2);
  let TotalVat = (response.TotalWet || 0).toFixed(2);
  let NoDocsVal = 0;
  let InsuranceVal = 0;
  let SedVal = 0;
  let ExpressVal = 0;
  // if (pkg.packageCalculation == 'Kg') pkg.weight = 2.20462 * pkg.weight;
  // let totalinvoiceVal = 0;

  // if (pkg.invoices) {
  //   pkg.invoices.map((inv) => (totalinvoiceVal += inv.value));
  // }
  // var totalweightVal = 0;

  // if (pkg.packages) {
  //   const pa = pkg.packages;
  //   for (var i = 0; i < pa.length; i++) {

  //     var weight = pa[i].weight;
  //     if (pa[i].packageCalculation == 'kg') {
  //       weight = 2.20462 * pa[i].weight;

  //     }
  //     totalweightVal = totalweightVal + weight;
  //   }

    //pkg.packages.map((pkge) => (totalweightVal += pkge.weight));
  // }
  
  let Freight =  response.Freight //(1.55 * pkg.weight).toFixed(2);
  let VatMultiplier = response.VatMultiplier
  $('#VatMultiplier').val(VatMultiplier.toFixed(2));
  $('#Brokerage').val(response.Brokerage.toFixed(2));
  $('#CustomsProc').val(response.CustomsProc.toFixed(2));
  $('#sum-of-charges').val(response.SumOfAllCharges.toFixed(2));
  $('#CustomsVAT').val(response.CustomsVAT.toFixed(2));
  $('#Delivery').val(response.Delivery.toFixed(2));
  $('#Duty').val(response.Duty.toFixed(2));
  $('#EnvLevy').val(response.EnvLevy.toFixed(2));
  $('#Freight').val(Freight.toFixed(2));

  $('#Hazmat').val(response.Hazmat.toFixed(2));
  $('#Pickup').val(response.Pickup.toFixed(2));
  $('#ServiceVat').val(ServiceVat);
  $('#Storage').val(response.Storage.toFixed(2));
  $('#NoDocsVal').val(response.NoDocs.toFixed(2));
  $('#InsuranceVal').val(response.Insurance.toFixed(2));
  $('#SedVal').val(response.Sed.toFixed(2));
  $('#ExpressVal').val(response.Express.toFixed(2));
  $('#TotalWet').val(TotalVat);
  $("#no_of_invoice").val((pkg.invoices).length.toFixed(2))
  $("#total-value-invoice").val(response.TotalInvoiceValue.toFixed(2))
  $("#override-value-invoice").val(response.OverrideInvoiceValue.toFixed(2))
  $("#total_weight_value").val(response.TotalWeightValue.toFixed(2))
  if (response.NoDocs > 0) $('#NoDocs').prop('checked', true)
  if (response.Insurance > 0) $('#Insurance').prop('checked', true)
  if (response.Sed > 0) $('#Sed').prop('checked', true)
  if (response.Express > 0) $('#Express').prop('checked', true)
  pricelabelcommon(ServiceVat, NoDocsVal, InsuranceVal, SedVal, ExpressVal, response.TotalInvoiceValue)
}

function packagePriceLabel(response) {
  const pkg = response;
  let ServiceVat = 0;
  let NoDocsVal = 0;
  let InsuranceVal = 0;
  let SedVal = 0;
  let ExpressVal = 0;
  let VatMultiplier = 0.12;
  //if (pkg.packageCalculation == 'Kg') pkg.weight = 2.20462 * pkg.weight;
  // let totalinvoiceVal = 0;
  // if (pkg.invoices) {
  //   pkg.invoices.map((inv) => (totalinvoiceVal += inv.value));
  // }
  // let totalweightVal = 0;
  // if (pkg.packages) {
  //   const pa = pkg.packages;
  //   for (var i = 0; i < pa.length; i++) {

  //     var weight = pa[i].weight;
  //     if (pa[i].packageCalculation == 'kg') {
  //       weight = 2.20462 * pa[i].weight;

  //     }
  //     totalweightVal = totalweightVal + weight;
  //   }

    //pkg.packages.map((pkge) => (totalweightVal += pkge.weight));
  // }
  $('#sum-of-charges').val(response.SumOfAllCharges ? response.SumOfAllCharges.toFixed(2) : 0)
  $("#VatMultiplier").val(VatMultiplier)
  $("#no_of_invoice").val((pkg.invoices).length)
  $("#total-value-invoice").val(response.TotalInvoiceValue ? response.TotalInvoiceValue.toFixed(2) : 0)
  $("#override-value-invoice").val(response.OverrideInvoiceValue ? response.OverrideInvoiceValue.toFixed(2) : 0)
  $("#total_weight_value").val(response.TotalWeightValue ? response.TotalWeightValue.toFixed(2) : 0)
  let Freight = (1.55 * pkg.weight).toFixed(2);
  if (pkg.company == "Post Boxes") {
    let fw = pkg.weight * 3;
    if (fw <= 35) $('#Freight').val(35)
    else $('#Freight').val(fw);
  } else {
    $('#Freight').val(Freight);
  }
  if (pkg.express) ExpressVal = 35, $('#Express').prop('checked', true), $('#ExpressVal').val('35');
  tval(0, 0, 0, 0, ExpressVal);
  pricelabelcommon(ServiceVat, NoDocsVal, InsuranceVal, SedVal, ExpressVal, response.TotalInvoiceValue)
}
function tval(ServiceVat, NoDocsVal, InsuranceVal, SedVal, ExpressVal) {
  let total = (
    Number($('#Brokerage').val()) +
    Number($('#CustomsProc').val()) +
    Number($('#sum-of-charges').val()) +
    Number($('#CustomsVAT').val()) +
    Number($('#Delivery').val()) +
    Number($('#Duty').val()) +
    Number($('#EnvLevy').val()) +
    Number($('#Freight').val()) +
    Number($('#Hazmat').val()) +
    Number($('#Pickup').val()) +
    Number($('#NoDocsVal').val()) +
    Number($('#InsuranceVal').val()) +
    Number($('#SedVal').val()) +
    Number($('#ExpressVal').val()) +
    // Number(NoDocsVal) +
    // Number(InsuranceVal) +
    // Number(SedVal) +
    // Number(ExpressVal) +
    Number(ServiceVat) +
    Number($('#Storage').val())
  );
  // $('#ServiceVat').val(((total * 7.5) / 100).toFixed(2));
  if (Number($('#ServiceVat').val()) > 0) {
    $('#serviceVatSpan').text($('#ServiceVat').val());
  } else {
    $('#serviceVatSpan').text(((total * 7.5) / 100).toFixed(2));
  }
  if (Number($('#TotalWet').val()) > 0) {
    $('#totalWetSpan').text($('#TotalWet').val());
  } else {
    $('#totalWetSpan').text((total + Number($('#ServiceVat').val())).toFixed(2));
  }

  // $('#TotalWet').val((total + Number($('#ServiceVat').val())).toFixed(2));
}
function pricelabelcommon(ServiceVat, NoDocsVal, InsuranceVal, SedVal, ExpressVal, totalinvoiceVal) {
  let Insurance = totalinvoiceVal * 0.01;
  $('#NoDocs').click(function () {
    if ($(this).prop('checked') == true) {
      $('#NoDocsVal').val('5');
      NoDocsVal = 5;
    } else if ($(this).prop('checked') == false) {
      $('#NoDocsVal').val('');
      NoDocsVal = 0;
    }
  });
  $('#Insurance').click(function () {
    if ($(this).prop('checked') == true) {
      $('#InsuranceVal').val(Insurance);
      InsuranceVal = Insurance;
    } else if ($(this).prop('checked') == false) {
      $('#InsuranceVal').val('');
      InsuranceVal = 0;
    }
  });
  $('#Sed').click(function () {
    if ($(this).prop('checked') == true) {
      $('#SedVal').val('25');
      SedVal = 25;
    } else if ($(this).prop('checked') == false) {
      $('#SedVal').val('');
      SedVal = 0;
    }
  });
  $('#Express').click(function () {
    if ($(this).prop('checked') == true) {
      $('#ExpressVal').val('35');
      ExpressVal = 35;
    } else if ($(this).prop('checked') == false) {
      $('#ExpressVal').val('');
      ExpressVal = 0;
    }
  });

  $('#add-to-pricelabel-form').on('keyup change', function () {
    tval(ServiceVat, NoDocsVal, InsuranceVal, SedVal, ExpressVal)
  });
}

// packageTable.on("click", "input.package-select-all", function() {
//   if($("input.package-select-all").hasClass("selected")) {
//     packageTable.rows().deselect();
//     return unSelectAll()
//   }
//   var tableRows = packageTable.rows({ page: 'current' }).nodes();
//   packageTable.rows({ page: 'current' }).select();
//   $("input.package-select-all").addClass("selected");
//   $("input.package-select-all").prop("checked", true);
//   tableRows.each(function () {
//     $(this).find("input.package-select").prop("checked", true); 
//   });
// })

$('#package-table tbody').on('change', 'input[type="checkbox"]', function(){
  if(!this.checked) {
    $(this).closest("tr").removeClass('selected');
    $(this).prop("checked", false);
  } 
  if(this.checked) $(this).closest("tr").addClass('selected')
  let selectingRowCount = packageTable.rows({selected: true}).count();
  if ((selectingRowCount) !== packageTable.rows({ page: 'current' }).count()) {
    $("input.package-select-all").removeClass("selected");
    $("input.package-select-all").prop("checked", false);
  } else if((selectingRowCount ) === packageTable.rows({ page: 'current' }).count()) {
    $("input.package-select-all").prop("checked", true);
    $("input.package-select-all").addClass("selected");
  }
});

$('#package-table tbody').on( 'click', 'tr', function () {
  $(this).toggleClass('selected');
} );



var pdfPath;
$("#package-table").on("click",'.btn-print-pkg',function() {
  let id = $(this).data('id');
  $.ajax({
    url: '/api/printer/pdf/generate/pkg/' + id,
    type: 'get',
    success: function(response) {
      if (response.success) {
        pdfPath = '/util/pdf' + response.filename;
        pdfjsLib.getDocument({ url: pdfPath }).promise.then((pdfData) => {
          pdfData.getPage(1).then((page) => {
            var canvas = $('#pdf-preview')[0];
            var canvasContext = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: 1 });
            canvas.height = (canvas.width / viewport.width) * viewport.height;
            page.render({ canvasContext, viewport });
          });
        });
      } else {
        $('.close-del').trigger('click');
        swal({
          title: 'Failed',
          text: response.message,
          type: 'error',
        });
      }
    },
  });
});

$('.print-package').click(function() {
  $('.close-del').trigger('click');
  printJS(pdfPath);
});

$(function() {
  let addToManifestModal = $('#add-to-manifest-modal');
  let addToManifestForm = $('#add-to-manifest-form');
  let compartmentIdSelect = addToManifestForm.find('[name="compartmentId"]');

  let addToDeliveryModal = $('#add-to-delivery-modal');
  let addToDeliveryForm = $('#add-to-delivery-form');

  let addToCubeModal = $('#add-to-cube-modal');
  let addToNoDocModal = $('#add-to-nodoc-modal');
  let addtoNoDocForm = $('#add-to-nodoc-form')
  let addToCubeForm = $('#add-to-cube-form');
  let cubeSelectOption = addToCubeForm.find('[name="compartmentId"]');

  compartmentIdSelect.select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: 'Select compartment',
    dropdownParent: addToManifestModal,
  });
  // cubeSelectOption.select2({
  //   theme: 'bootstrap',
  //   width: '100%',
  //   placeholder: 'Select Cube',
  //   dropdownParent: addToCubeModal,
  // });

  $.ajax({
    url: '/api/warehouse/get-manifests',
    type: 'get',
    dataType: 'json',
    success(data) {
      addToManifestForm
        .find('[name="manifestId"]')
        .select2({
          theme: 'bootstrap',
          width: '100%',
          placeholder: 'Select manifest',
          dropdownParent: addToManifestModal,
          data: data.map((manifest) => ({
            id: manifest.id,
            text: manifest.planeId.tailNumber+' '+moment(manifest.shipDate).subtract(4, 'hours').format('dddd, MMMM Do YYYY, h:mm A'),
            source: manifest,
          })),
        })
        .on('select2:select', function(event) {
          compartmentIdSelect.val(null).trigger('change');
          compartmentIdSelect.find('option').remove();
          compartmentIdSelect.prop('disabled', true);

          let manifest = event.params.data && event.params.data.source;
          const manifestPlanId = (manifest && (manifest.planeId['_id'] || manifest.planeId)); 
          if (manifestPlanId) {
            loadCompartments(manifestPlanId);
          }
        });
    },
  });

  $.ajax({
    url: '/api/warehouse/get-deliverys',
    type: 'get',
    dataType: 'json',
    success(data) {      
      addToDeliveryForm
        .find('[name="deliveryId"]')
        .select2({
          theme: 'bootstrap',
          width: '100%',
          placeholder: 'Select delivery',
 
          data: data.map((delivery) => ({
            id: delivery._id,
            text: formatDate(delivery.delivery_date)
          })),
        })
    },
  });

  // Get Cubes in DropDown
  $.ajax({
    url: '/warehouse/cube/getall',
    type: 'get',
    dataType: 'json',
    success(data) {    
      addToCubeForm
        .find('[name="CubeId"]')
        .select2({
          theme: 'bootstrap',
          width: '100%',
          placeholder: 'Select Cube',
 
          data: data.map((cube) => ({
            id: cube._id,
            text: cube.name
          })),
        })
    },
  });

  /*  Get Location and ZOne IN Nodoc Dropdown */
  // Location
  $.ajax({
    url: '/warehouse/package/locations',
    type: 'get',
    dataType: 'json',
    success(data) {    
      addtoNoDocForm
        .find('[name="location"]')
        .select2({
          theme: 'bootstrap',
          width: '100%',
          placeholder: 'Select Location',
 
          data: data.map((locate) => ({
            id: locate.name,
            text: locate.name
          })),
        })
    },
  });

    $.ajax({
    url: '/warehouse/package/locations',
    type: 'get',
    dataType: 'json',
    success(data) {    
      addToDeliveryForm
        .find('[name="locationId"]')
        .select2({
          theme: 'bootstrap',
          width: '100%',
          placeholder: 'Select Location',
 
          data: data.map((locate) => ({
            id: locate._id,
            text: locate.name
          })),
        })
    },
  });
  // Zone
  $.ajax({
    url: '/warehouse/package/zones',
    type: 'get',
    dataType: 'json',
    success(data) {    
      addtoNoDocForm
        .find('[name="zoneId"]')
        .select2({
          theme: 'bootstrap',
          width: '100%',
          placeholder: 'Select Zone',
 
          data: data.map((zone) => ({
            id: zone._id,
            text: zone.name
          })),
        })
    },
  });
/* End Location And Zone */
  function loadCompartments(planeId) {
    compartmentIdSelect.prop('disabled', true);
    $.ajax({
      url: '/api/warehouse/get-compartments',
      data: { planeId: planeId },
      type: 'get',
      dataType: 'json',
      success(data) {
        compartmentIdSelect.select2({
          theme: 'bootstrap',
          width: '100%',
          placeholder: 'Select compartment',
          dropdownParent: addToManifestModal,
          data: data.result.map((compartment) => ({
            id: compartment._id,
            text: compartment.name
          })),
        });

        compartmentIdSelect.prop('disabled', false);
      },
    });
  }

  addToManifestForm.submit(function(event) {
    addToManifestModal.modal('hide');
    event.preventDefault();
    // var packageIds = packageTable
    //   .rows({ selected: true })
    //   .nodes()
    //   .map((i) => $(i).data('record'))
    //   .toArray()
    //   .join(',');
    var packageIds = []
    for(var i=0;i<packageTable.rows('.selected').data().length;i++){
      packageIds.push(packageTable.rows('.selected').data()[i][0].split(' ')[2].split('"')[1])
    }
    console.log("pac",packageIds)
    addToManifestForm.find('[name="packageIds"]').val(packageIds);
    var data = extractFormData(this);
   
    $.ajax({
      url: '/api/warehouse/add-packages-to-flight',
      type: 'post',
      data: data,
      success: function(response) {
        swal({
          title: response.success ? 'Success' : 'Error',
          type: response.success ? 'success' : 'error',
          text: response.message,
        });
        const statusText = response.status;
        const packageIds = (data['packageIds'] || '').split(',');

        packageIds.forEach((packageId) => {
          $(`tr[data-record="${packageId}"] > .lastStatusText_field`).text(statusText);
        })
      },
      error: function ()  {
        swal({
          title: 'Error',
          type: 'error',
          text: 'Unknown error',
        });
      }
    });
  });

  addToDeliveryForm.submit(function(event) {
    addToDeliveryModal.modal('hide');
    event.preventDefault();
    // var packageIds = packageTable
    //   .rows({ selected: true })
    //   .nodes()
    //   .map((i) => $(i).data('record'))
    //   .toArray()
    //   .join(',');
      var packageIds = []
      for(var i=0;i<packageTable.rows('.selected').data().length;i++){
        packageIds.push(packageTable.rows('.selected').data()[i][0].split(' ')[2].split('"')[1])
      }
      console.log("pac",packageIds)
    addToDeliveryForm.find('[name="packageIds"]').val(packageIds);
    var data = extractFormData(this);
    $.ajax({
      url: '/api/warehouse/web/packages/add-packages-to-delivery',
      type: 'post',
      data: data,
      success: function(response) {
        if(!response.success && response.message && response.message.packageIds)
          response.message = response.message.packageIds

        if(response.error_message){
          response.message = response.error_message
          swal({
            title: response.message[0],
            showCancelButton: true,
            confirmButtonText: 'yes',
          }).then(response => {
            if (response.value) {
              $.ajax({
                url: '/api/warehouse/web/packages/add-packages-to-delivery?override=true',
                type: 'post',
                data: data,
                success: function (response) {
                  swal({
                    title: response.success ? 'Success' : 'Error',
                    type: response.success ? 'success' : 'error',
                    text: response.message,
                  }).then(res => {
                    if (response.success) {
                      location.reload()
                    }
                  })
                }
              });
            }
          })
        }else{
          swal({
            title: response.success ? 'Success' : 'Error',
            type: response.success ? 'success' : 'error',
            text: response.message,
          });
        }
      },
      error: function ()  {
        swal({
          title: 'Error',
          type: 'error',
          text: 'Unknown error',
        });
      }
    });
  });

  // Add To Cube Form
  addToCubeForm.submit(function(event) {
    addToCubeModal.modal('hide');
    event.preventDefault();
    // var packageIds = packageTable
    //   .rows({ selected: true })
    //   .nodes()
    //   .map((i) => $(i).data('record'))
    //   .toArray()
    //   .join(',');
      var packageIds = []
      for(var i=0;i<packageTable.rows('.selected').data().length;i++){
        packageIds.push(packageTable.rows('.selected').data()[i][0].split(' ')[2].split('"')[1])
      }
      console.log("pac",packageIds)
      addToCubeForm.find('[name="packageIds"]').val(packageIds);
    var data = extractFormData(this);
    $.ajax({
      url: '/api/cube/web/assign-packages/'+data.CubeId,
      type: 'post',
      data: data,
      success: function(response) {
        swal({
          title: response.success ? 'Success' : 'Error',
          type: response.success ? 'success' : 'error',
          text: response.message,
        });
      },
      error: function ()  {
        swal({
          title: 'Error',
          type: 'error',
          text: 'Unknown error',
        });
      }
    });
  });

  // Add To NoDOc Form
  addtoNoDocForm.submit(function(event) {
    addToNoDocModal.modal('hide');
    event.preventDefault();
    // var packageIds = packageTable
    //   .rows({ selected: true })
    //   .nodes()
    //   .map((i) => $(i).data('record'))
    //   .toArray()
    //   .join(',');

    var packageIds = []
    for(var i=0;i<packageTable.rows('.selected').data().length;i++){
      packageIds.push(packageTable.rows('.selected').data()[i][0].split(' ')[2].split('"')[1])
    }
    console.log("pac",packageIds)
      addtoNoDocForm.find('[name="packageIds"]').val(packageIds);
    var data = extractFormData(this);
    if(data.packageIds == ''){
      swal({
            title:'Empty Packages',
            type: 'warning',
            text: 'Please Select Packages',
          });
    }
    $.ajax({
      url: '/api/warehouse/web/packages/add-packages-to-nodoc',
      type: 'post',
      data: data,
      success: function(response) {
        swal({
          title: response.success ? 'Success' : 'Error',
          type: response.success ? 'success' : 'error',
          text: response.message,
        });
        location.reload()
      },
      error: function ()  {
        swal({
          title: 'Error',
          type: 'error',
          text: 'Unknown error',
        });
      }
    });
  });
});
