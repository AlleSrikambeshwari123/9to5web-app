// let packageTable = $('.pricelabel-table').DataTable({
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
//   },
// });
let TotalVolumetricWeight
$('.checkPriceLabelExistPkg').map(function (i, dateElement) {
  const id = dateElement.value;
  checkPriceLabelExist(id)
});
function checkPriceLabelExist(id) {
  $.ajax({
    url: '/warehouse/pricelabels/' + id,
    type: 'get',
    success: function (response) {
      if (response.awbId) {
        return true
      } else {
        // $(`.ifNotPriceLabel${id}`).css({cursor:"not-allowed"});
        // $(`.ifNotPriceLabel${id}`).attr("disabled",true);
        // $(`.ifNotPriceLabel${id}`).removeAttr('data-toggle');
        // $(`.ifNotPriceLabel${id}`).off("click");
        $(`.ifNotPriceLabel${id}`).hide();
        return false
      }
    }
  });
}
var pdfPath;
$('#pricelabel-table').on('click', '.btn-print-pkg', function () {
  let id = $(this).data('id');
  $.ajax({
    url: '/api/printer/pdf/generate/pricelabel/' + id,
    type: 'get',
    success: function (response) {
      if (response.success) {
        pdfPath = '/util/pdf' + response.filename;
        pdfjsLib.getDocument({ url: pdfPath }).promise.then((pdfData) => {
          pdfData.getPage(1).then((page) => {
            var canvas = $('#pdf-preview')[0];
            var canvasContext = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: 1 });
            canvas.height = 214;
            canvas.width = 280;
            page.render({ canvasContext, viewport });
          });
        });
      } else {
        setTimeout(function(){$('.close-del').trigger('click');}, 1000);
            swal({
              title: 'Failed',
              text: response.message,
              type: 'error',
            });
      }
    },
  });
});
$('#pricelabel-table').on('click', '.download-price-label', function () {
  let id = $(this).data('id');
  $.ajax({
    url: '/warehouse/price-label/download/' + id,
    type: 'get',
    success: function (response) {
      if (response && response.success == false ) {
        swal({
          title: 'Failed',
          text: response.message,
          type: 'error',
        });
      }else{
        window.location.href  = '/warehouse/price-label/download/' + id
      }
    },
  });
});

function pricelLabelCheck(response) {
  const pkg = response.awbId;
  let ServiceVat = (response.ServiceVat || 0).toFixed(2);
  let TotalVat = (response.TotalWet || 0).toFixed(2);
  let NoDocsVal = 0;
  let InsuranceVal = 0;
  let SedVal = 0;
  let ExpressVal = response.Express;
  TotalVolumetricWeight = response.TotalVolumetricWeight
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
  else $('#Express').prop('checked', false)
  pricelabelcommon(ServiceVat, NoDocsVal, InsuranceVal, SedVal, ExpressVal, response.TotalInvoiceValue)
}

function packagePriceLabel(response) {
  const pkg = response;
  let ServiceVat = 0;
  let NoDocsVal = 0;
  let InsuranceVal = 0;
  let SedVal = 0;
  let ExpressVal = response.Express;
  let VatMultiplier = 0.12;
  TotalVolumetricWeight = response.TotalVolumetricWeight
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
  $('#TotalWet').val(response.TotalWet ? response.TotalWet.toFixed(2) : 0)
  let Freight = (1.55 * pkg.weight).toFixed(2);
  if (pkg.company == "Post Boxes") {
    let fw = pkg.weight * 3;
    if (fw <= 35) $('#Freight').val(35)
    else $('#Freight').val(fw);
  } else {
    $('#Freight').val(Freight);
  }
  // if (pkg.express) ExpressVal = 35, $('#Express').prop('checked', true), $('#ExpressVal').val('35');
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
  // if (Number($('#TotalWet').val()) > 0) {
    // $('#totalWetSpan').text($('#TotalWet').val());
  // } else {
  //   $('#totalWetSpan').text((total + Number($('#ServiceVat').val())).toFixed(2));
  // }

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
      ExpressVal = 35;
      if($('#Freight').val() > 35) 
        ExpressVal = $('#Freight').val();
      $('#ExpressVal').val(ExpressVal);
    } else if ($(this).prop('checked') == false) {
      $('#ExpressVal').val('');
      // ExpressVal = 0;
    }
  });

  $('#add-to-pricelabel-form').on('keyup change', function () {
    tval(ServiceVat, NoDocsVal, InsuranceVal, SedVal, ExpressVal)
  });
}

$('#pricelabel-table').on('click', '.btn-edit-pricelabel', function () {
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

$('#UpdatePriceLabelPackage').on('click', function (event) {
  event.preventDefault();
  var id = $('#setIdPriceLabel').val()
  // if (Number($('#TotalWet').val()) > 0) {
    TotalWet = $('#TotalWet').val() == "" ? 0 : $('#TotalWet').val();
  // } else {
  //   TotalWet = $('#totalWetSpan').text() == "" ? 0 : $('#totalWetSpan').text();
  // }
  
  if (ServiceVat > 0) {
    ServiceVat = ServiceVat == "" ? 0 : ServiceVat;
  } else {
    ServiceVat = $('#serviceVatSpan').text() == "" ? 0 : $('#serviceVatSpan').text();
  }

  data = {
    Brokerage: $('#Brokerage').val() == "" ? 0 : $('#Brokerage').val(),
    CustomsProc: $('#CustomsProc').val() == "" ? 0 : $('#CustomsProc').val(),
    SumOfAllCharges: $('#sum-of-charges').val() == "" ? 0 : $('#sum-of-charges').val(),
    CustomsVAT: $('#CustomsVAT').val() == "" ? 0 :$('#CustomsVAT').val(),
    VatMultiplier : $('#VatMultiplier').val() == "" ? 0.12 : $('#VatMultiplier').val(),
    Delivery: $('#Delivery').val() == "" ? 0 : $('#Delivery').val(),
    Duty: $('#Duty').val() == "" ? 0 : $('#Duty').val(),
    EnvLevy: $('#EnvLevy').val() == "" ? 0 : $('#EnvLevy').val(),
    Freight: $('#Freight').val() == "" ? 0 : $('#Freight').val(),
    Hazmat: $('#Hazmat').val() == "" ? 0 : $('#Hazmat').val(),
    Pickup: $('#Pickup').val() == "" ? 0 : $('#Pickup').val(),
    ServiceVat: ServiceVat == "" ? 0 :ServiceVat,
    Storage: $('#Storage').val() == "" ? 0 : $('#Storage').val(),
    NoDocs: $('#NoDocsVal').val() == "" ? 0 : $('#NoDocsVal').val(),
    Insurance: $('#InsuranceVal').val() == "" ? 0 : $('#InsuranceVal').val(),
    Sed: $('#SedVal').val() == "" ? 0 : $('#SedVal').val(),
    Express: $('#ExpressVal').val() == "" ? 0 : $('#ExpressVal').val(),
    OverrideInvoiceValue:  $('#override-value-invoice').val() == "" ? 0 : $('#override-value-invoice').val(),
    TotalInvoiceValue: $("#total-value-invoice").val() == "" ? 0 : $("#total-value-invoice").val(),
    NoOfInvoice: $("#no_of_invoice").val() == "" ? 0 : $("#no_of_invoice").val(),
    TotalWeightValue: $("#total_weight_value").val() == "" ? 0 : $("#total_weight_value").val(),
    TotalVolumetricWeight : TotalVolumetricWeight,
    TotalWet: TotalWet,
  };
  $.ajax({
    url: '/warehouse/pricelabels/' + id,
    type: 'post',
    data: data,
    success: function (response) {
      $('.close-del').trigger('click');
      $(`.ifNotPriceLabel${id}`).show();
      swal({
        title: response.success ? 'Success' : 'Error',
        type: response.success ? 'success' : 'error',
        text: response.message,
      }).then(() => window.location.reload());

    },
    error: function () {
      swal({
        title: 'Error',
        type: 'error',
        text: 'Unknown error',
      });
    },
  });
});

$('.print-package').click(function () {
  $('.close-del').trigger('click');
  printJS(pdfPath);
});


$(document).on('click', '.applyBtn', function() {
  window.location = "/warehouse/price/list?daterange="+$('.daterange').val();
})
 $(document).on('click', '.cancelBtn', function() {
  window.location = "/warehouse/price/list?clear=1";
})
$(document).ready(function() {
  setTimeout(()=>{
		if($('#clear').val() ){
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
