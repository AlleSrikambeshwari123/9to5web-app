let packageTable = $('.pricelabel-table').DataTable({
  pageLength: 10,
  columnDefs: [
    {
      orderable: false,
      targets: 0,
    },
  ],
  select: {
    style: 'multi',
    selector: 'td:first-child input[type="checkbox"]',
  },
});
$('.checkPriceLabelExistPkg').map(function (i, dateElement) {
  const id = dateElement.value;
  checkPriceLabelExist(id)
});
function checkPriceLabelExist(id){
  $.ajax({
    url: '/warehouse/pricelabels/' + id,
    type: 'get',
    success: function (response) {
      if(response.awbId){
        return true
      }else{
        // $(`.ifNotPriceLabel${id}`).css({cursor:"not-allowed"});
        // $(`.ifNotPriceLabel${id}`).attr("disabled",true);
        // $(`.ifNotPriceLabel${id}`).removeAttr('data-toggle');
        // $(`.ifNotPriceLabel${id}`).off("click");
        $(`.ifNotPriceLabel${id}`).hide();
        return false}
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

function pricelLabelCheck(response){
  const pkg = response.awbId;
  let ServiceVat = (response.ServiceVat || 0).toFixed(2);
  let TotalVat = (response.TotalWet || 0).toFixed(2);
  let NoDocsVal = 0;
  let InsuranceVal = 0;
  let SedVal = 0;
  let ExpressVal = 0;
  // if (pkg.packageCalculation == 'Kg') pkg.weight = 2.20462 * pkg.weight;
   let totalinvoiceVal = 0;

   if (pkg.invoices) {
     pkg.invoices.map((inv) => (totalinvoiceVal += inv.value));
   }
   var totalweightVal = 0;
   
   if (pkg.packages) {
     const pa = pkg.packages;
     for(var i=0;i<pa.length;i++){
       
       var weight = pa[i].weight;
      if (pa[i].packageCalculation == 'kg'){ 
         weight = 2.20462 * pa[i].weight;
         
      }
      totalweightVal = totalweightVal+weight;
     }
    
    //pkg.packages.map((pkge) => (totalweightVal += pkge.weight));
  }
  
  let Freight = 0//(1.55 * pkg.weight).toFixed(2);
  $('#Brokerage').val(response.Brokerage);
  $('#CustomsProc').val(response.CustomsProc);
  $('#CustomsVAT').val(response.CustomsVAT);
  $('#Delivery').val(response.Delivery);
  $('#Duty').val(response.Duty);
  $('#EnvLevy').val(response.EnvLevy);
  $('#Freight').val(Freight);
  $('#Hazmat').val(response.Hazmat);
  $('#Pickup').val(response.Pickup);
  $('#ServiceVat').val(ServiceVat);
  $('#Storage').val(response.Storage);
  $('#NoDocsVal').text(response.NoDocs);
  $('#InsuranceVal').text(response.Insurance);
  $('#SedVal').text(response.Sed);
  $('#ExpressVal').text(response.Express);
  $('#TotalWet').val(TotalVat);
  $("#no_of_invoice").val((pkg.invoices).length)
  $("#total-value-invoice").html(totalinvoiceVal)
  $("#total_weight_value").val(totalweightVal)
  if(response.NoDocs >0) $('#NoDocs').prop('checked',true)
  if(response.Insurance >0) $('#Insurance').prop('checked',true)
  if(response.Sed >0) $('#Sed').prop('checked',true)
  if(response.Express >0) $('#Express').prop('checked',true)
  pricelabelcommon(ServiceVat,NoDocsVal,InsuranceVal,SedVal,ExpressVal,totalinvoiceVal)
}

function packagePriceLabel(response){
  const pkg = response;
  let ServiceVat = 0;
  let NoDocsVal = 0;
  let InsuranceVal = 0;
  let SedVal = 0;
  let ExpressVal = 0;
  //if (pkg.packageCalculation == 'Kg') pkg.weight = 2.20462 * pkg.weight;
  let totalinvoiceVal = 0;
  if (pkg.invoices) {
    pkg.invoices.map((inv) => (totalinvoiceVal += inv.value));
  }
  let totalweightVal = 0;
  if (pkg.packages) {
    const pa = pkg.packages;
    for(var i=0;i<pa.length;i++){
      
      var weight = pa[i].weight;
     if (pa[i].packageCalculation == 'kg'){ 
        weight = 2.20462 * pa[i].weight;
        
     }
     totalweightVal = totalweightVal+weight;
    }
   
   //pkg.packages.map((pkge) => (totalweightVal += pkge.weight));
 }
  $("#no_of_invoice").val((pkg.invoices).length)
  $("#total-value-invoice").html(totalinvoiceVal)
  $("#total_weight_value").val(totalweightVal)
  let Freight = (1.55 * pkg.weight).toFixed(2);
  if(pkg.company == "Post Boxes"){
    let fw = pkg.weight * 3;
    if(fw <=35) $('#Freight').val(35)
    else $('#Freight').val(fw);
  }else{
    $('#Freight').val(Freight);
  } 
  if(pkg.express) ExpressVal = 35,$('#Express').prop('checked',true),$('#ExpressVal').text('35');
  tval(0,0,0,0,ExpressVal);
  pricelabelcommon(ServiceVat,NoDocsVal,InsuranceVal,SedVal,ExpressVal,totalinvoiceVal)
}
function tval(ServiceVat,NoDocsVal,InsuranceVal,SedVal,ExpressVal) {
  let total =  (
    Number($('#Brokerage').val()) +
    Number($('#CustomsProc').val()) +
    Number($('#CustomsVAT').val()) +
    Number($('#Delivery').val()) +
    Number($('#Duty').val()) +
    Number($('#EnvLevy').val()) +
    Number($('#Freight').val()) +
    Number($('#Hazmat').val()) +
    Number($('#Pickup').val()) +
    Number(NoDocsVal) +
    Number(InsuranceVal) +
    Number(SedVal) +
    Number(ExpressVal) +
    Number(ServiceVat) +
    Number($('#Storage').val())
  );
  $('#ServiceVat').val(((total * 7.5) / 100).toFixed(2));
  $('#TotalWet').val((total + Number($('#ServiceVat').val())).toFixed(2));
}
function pricelabelcommon(ServiceVat,NoDocsVal,InsuranceVal,SedVal,ExpressVal,totalinvoiceVal){
  let Insurance = totalinvoiceVal * 0.01;
  $('#NoDocs').click(function () {
    if ($(this).prop('checked') == true) {
      $('#NoDocsVal').text('5');
      NoDocsVal = 5;
    } else if ($(this).prop('checked') == false) {
      $('#NoDocsVal').text('');
      NoDocsVal = 0;
    }
  });
  $('#Insurance').click(function () {
    if ($(this).prop('checked') == true) {
      $('#InsuranceVal').text(Insurance);
      InsuranceVal = Insurance;
    } else if ($(this).prop('checked') == false) {
      $('#InsuranceVal').text('');
      InsuranceVal = 0;
    }
  });
  $('#Sed').click(function () {
    if ($(this).prop('checked') == true) {
      $('#SedVal').text('25');
      SedVal = 25;
    } else if ($(this).prop('checked') == false) {
      $('#SedVal').text('');
      SedVal = 0;
    }
  });
  $('#Express').click(function () {
    if ($(this).prop('checked') == true) {
      $('#ExpressVal').text('35');
      ExpressVal = 35;
    } else if ($(this).prop('checked') == false) {
      $('#ExpressVal').text('');
      ExpressVal = 0;
    }
  });

  $('#add-to-pricelabel-form').on('keyup change', function () {
    tval(ServiceVat,NoDocsVal,InsuranceVal,SedVal,ExpressVal)
  });
}

$('#pricelabel-table').on('click', '.btn-edit-pricelabel', function () {
  const id = $(this).data('id');
  $('#setIdPriceLabel').val(id);
  $('#Brokerage').val(''),
  $('#CustomsProc').val(''),
  $('#CustomsVAT').val(''),
  $('#Delivery').val(''),
  $('#Duty').val(''),
  $('#EnvLevy').val(''),
  $('#Freight').val(''),
  $('#Hazmat').val(''),
  $('#Pickup').val(''),
  $('#ServiceVat').val(''),
  $('#Storage').val(''),
  $('#NoDocsVal').text(''),
  $('#InsuranceVal').text(''),
  $('#SedVal').text(''),
  $('#ExpressVal').text(''),
  $('#TotalWet').val(''),
  $('#total-value-invoice').html(''),
  $.ajax({
    url: '/warehouse/pricelabels/' + id,
    type: 'get',
    success: function (response) {
      console.log(response);
      if(response.awbId){
        pricelLabelCheck(response)
      }else{
        $.ajax({
          url: '/warehouse/pricelabels-package/' + id,
          type: 'get',
          success:function(response){
            packagePriceLabel(response)
          }
        })
      }
    },
    error:function(){
  }
  });
  
});

$('#UpdatePriceLabelPackage').on('click' , function (event) {
  event.preventDefault();
  var id = $('#setIdPriceLabel').val()
  data = {
    Brokerage: $('#Brokerage').val() == "" ? 0 : $('#Brokerage').val(),
    CustomsProc: $('#CustomsProc').val() == "" ? 0 : $('#CustomsProc').val(),
    CustomsVAT: $('#CustomsVAT').val() == "" ? 0 : $('#CustomsVAT').val(),
    Delivery: $('#Delivery').val() == "" ? 0 : $('#Delivery').val(),
    Duty: $('#Duty').val() == "" ? 0 : $('#Duty').val(),
    EnvLevy: $('#EnvLevy').val() == "" ? 0 : $('#EnvLevy').val(),
    Freight: $('#Freight').val() == "" ? 0 : $('#Freight').val(),
    Hazmat: $('#Hazmat').val() == "" ? 0 : $('#Hazmat').val(),
    Pickup: $('#Pickup').val() == "" ? 0 : $('#Pickup').val(),
    ServiceVat: $('#ServiceVat').val() == "" ? 0 : $('#ServiceVat').val(),
    Storage: $('#Storage').val() == "" ? 0 : $('#Storage').val(),
    NoDocs: $('#NoDocsVal').text() == "" ? 0 : $('#NoDocsVal').text(),
    Insurance: $('#InsuranceVal').text() == "" ? 0 : $('#InsuranceVal').text(),
    Sed: $('#SedVal').text() == "" ? 0 : $('#SedVal').text(),
    Express: $('#ExpressVal').text() == "" ? 0 : $('#ExpressVal').text(),
    TotalWet: $('#TotalWet').val() == "" ? 0 : $('#TotalWet').val(),
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
      }).then(()=> window.location.reload());
     
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

