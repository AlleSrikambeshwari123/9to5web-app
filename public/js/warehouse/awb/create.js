Number.prototype.formatMoney = function (c, d, t) {
  var n = this,
    c = isNaN(c = Math.abs(c)) ? 2 : c,
    d = d == undefined ? "." : d,
    t = t == undefined ? "," : t,
    s = n < 0 ? "-" : "",
    i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
    j = (j = i.length) > 3 ? j % 3 : 0;
  return "$" + s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};
function file_input(cid){
  $(".invoice_number-"+cid).attr("required", true);
  $(".invoice_value-"+cid).attr("required", true);
}

function openAddPackage(){
  $('.mfp-fade').css({'display':'block'});
}
function closeAddPackage(){  
  // $('.mfp-close').trigger("click");
  $('.mfp-fade').css({'display':'none'});
}
$('select#originBarcode option').each(function(index,option){
  let text = option.text
 if(text === "No tracking") option.selected = true; 
})
// $('select#originBarcode option[=No Tracking]').attr('selected','selected'); 
function refreshBarcode(){  
  $.ajax({
    url: 'refresh-barcode',
    type: 'get',
    success: function (response) {
      if (response) {
        var barcodeId = (response.barcode)?response.barcode._id:'';
        var barcode = (response.barcode)?response.barcode.barcode:'';
        var selectBarcode = barcode+','+barcodeId;
        $('#originBarcode').val(selectBarcode).trigger('change');
      }else{
        // $('#originBarcode').val('No tracking').trigger('change');
      }
    }
  })
}

var pickup = $('select.awb-deliveryMethod').children("option:selected").val();
if(pickup == '1') $('.hideDriver').hide()

// Check for Pickup Delivery
$("select.awb-deliveryMethod").change(function(){
  var pickup = $(this).children("option:selected").val();
  if(pickup == '1') $('.hideDriver').hide()
  if(pickup == '2') $('.hideDriver').show()
});

AWBInvoices.addInvoceRow();
var AWBAdditionalInvoices = [],invoiceIdArray = []
$(function () { 
  $(".copy-package-button").click(function(){    
    $(".copy-package-text").show();
  });
  $("#link-add-package-popup").click(function(){    
    $(".copy-package-text").hide();
    $("#copy").val(1);
  });

  $('#location').select2({
    theme: 'bootstrap',
    placeholder: 'Select Location',
    width:'100%',
  })
  $('#awb-isSed').select2({
    theme: 'bootstrap',
    width:'100%',
    placeholder: "Select",
    minimumResultsForSearch: Infinity,
  })
  $('#awb-deliveryMethod').select2({
    theme: 'bootstrap',
    width:'100%',
    minimumResultsForSearch: Infinity,
  })
  $('#companyId').select2({
    theme: 'bootstrap',
    placeholder: 'Select company',
    width:'100%',
  })

  $('#customerId').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a customer"
  })
  $('#c-companyId').select2({
    theme: 'bootstrap',
    width: '100%',
    minimumResultsForSearch: -1
  })
  $('#c-companyId').change(function () {
    let companyId = $(this).val();
    if (companyId == '9to5') $('#c-pmb').val(9000);
    else $('#c-pmb').val("");
  })
  $('#po-source').select2({
    theme: 'bootstrap',
    width: '100%',
    minimumResultsForSearch: -1
  })
  $('#po-paid-type').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: 'Select a Paid Type',
    minimumResultsForSearch: -1
  })
  $('#serviceTypeCharge').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: 'Select Charge',
    minimumResultsForSearch: -1
  })
  $('#serviceTypeAmount').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: 'Select Amount',
    minimumResultsForSearch: -1
  })
  $('#shipper').select2({
    theme: 'bootstrap',
    placeholder: "Select a shipper"
  })
  $('#carrier').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a carrier"
  })
  $('#hazmat').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a HAZMAT Class"
  })
  $('#packageType').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a package type",
    dropdownParent: $("#packageSelect")
  })
  $('#packageCalculation').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a package calculation",
    dropdownParent: $("#calculationSelect")
  })
  $('#originBarcode').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a Barcode",
    dropdownParent: $("#trackingSelect")
  })

  $('#driver').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a Driver"
  })

  var packageTable = $('#packageTable').DataTable({
    pageLength: 5,
    order: [],
    bSortable: false,
    bLengthChange: false,
    bFilter: false,
    columnDefs: [{
      orderable: false,
      targets: [0, 1, 2, 3],
      "defaultContent": "-",
      "targets": "_all"
    }]
  })

  var sedAnswered = 0;
  var awbPackages = [];

  // Add Pacakge Popup
  $('.btn-add-package').magnificPopup({
    type: 'inline',
    midClick: true,
    mainClass: 'mfp-fade',
    gallery: {
      enabled: true,
    },
    callbacks: {
      open: function () {
        if (awbPackages.length > 0) {
          $('.btn-copy-last').show()          
        }
        else{
           $('.btn-copy-last').hide();
        }
        $(".hidden-div").css("display", "block");
        $('#id').val(undefined);
        $('#description').val("");
        $('#weight').val("");
        $("#express"). prop("checked", false);
        $('#packageCalculation').val('lbs');
        $('#packageType').val("BOX");
        $('#W').val("");
        $('#H').val("");
        $('#L').val("");
      },
      close: function(){
        $(".hidden-div").css("display", "none");
      }
    },
    closeOnBgClick: false

  });

  $(".btn-copy-last").click(function () {
    if (awbPackages.length > 0) {
      var lastPackage = awbPackages[awbPackages.length - 1];
      $('#id').val(undefined);
      $("#description").val(lastPackage.description);
      $("#weight").val(lastPackage.weight);
      $("#express").prop("checked",lastPackage.express);
      $('#packageCalculation').val(lastPackage.packageCalculation||'lbs');
      $('#packageType').val(lastPackage.packageType || 'BOX');
      var dims = lastPackage.dimensions.toLowerCase().split('x');
      $("#W").val(dims[0])
      $("#H").val(dims[1])
      $("#L").val(dims[2])
    }
  });

  $("#btn-add-po-charge").click(function () { 
    let charge = $('#select2-serviceTypeCharge-container').text();
    let amount = $('#select2-serviceTypeAmount-container').text();
    var rowCount = $('#charge-table-body tr').length;
    $('#charge-table-body').append('<tr data-record="' + rowCount + '"><td class="charge">'+charge+'</td><td class="amount">$'+amount+'</td><td> <i style="cursor:pointer" class="fa fa-trash rm-service-type-add" data-ids="'+rowCount+'"></i></td></tr>');
  })

  $("#btn-cancel-add").click(function () {
    $('.mfp-close').trigger("click");
  })

  $('form[name="add-purchase-order-item-form"] select').select2({
    theme: 'bootstrap',
    width: '100%',
    minimumResultsForSearch: -1
  })

  $('form[name="add-additional-invoices-form"] select').select2({
    theme: 'bootstrap',
    width: '100%',
    minimumResultsForSearch: -1
  })

  $('form[name="add-purchase-order-item-form"]').submit(function (event) {
    event.preventDefault();
    let item = extractFormData(this);
    item.paidTypeText = $(this)
      .find('[name="paidTypeId"] option:selected')
      .data('name');
    item.sourceText = $(this).find('[name="source"] option:selected').text();
    item.serviceTypeText = $(this)
      .find('[name="serviceTypeId"] option:selected')
      .data('name');
    item.amount = $(this)
      .find('[name="serviceTypeId"] option:selected')
      .data('amount');

    AWBPO.addItem(item);
    $(this).closest('.modal').modal('hide');
  });

  $('form[name="add-additional-invoices-form"]').submit(function (event) {
    event.preventDefault();
    let item = extractFormData(this), flag=0;
    item.fileName = $(this)
      .find('[name="additionalInvoices"] option:selected')
      .data('name');
    item.filePath = $(this)
      .find('[name="additionalInvoices"] option:selected')
      .data('path');
    item.pmb = $(this)
      .find('[name="additionalInvoices"] option:selected')
      .data('pmb');
    item.courierNo = $(this)
      .find('[name="additionalInvoices"] option:selected')
      .data('courier');

    item._id = item.additionalInvoices

    for(let id of invoiceIdArray){
      if(String(id) == String(item._id)){
        flag = 1
        break
      }
    }
    if(flag == 0){
      $('#additionalInvoices-list').append(`  <div class="card" data-record="${item.additionalInvoices}">
      <div class="card-header">
        Additional Invoice
        <button type="button"  class="close" data-id="${item.additionalInvoices}" onclick="removeInvoice(this)">
              <span aria-hidden="true" class="float-right">??</span>
        </button>
      </div>
      <div class="card-body">
        <div>
          <b>Courier No</b> : <span style="word-break: break-all" class="float-right">${item.courierNo}</span>
        </div>
        <div>
          <b>File Name</b> : <span style="word-break: break-all" class="float-right">${item.fileName}</span>
        </div>
        <div>
          <b>PMB</b> : <span style="word-break: break-all" class="float-right">${item.pmb}</span>
        </div>
      </div>
      </div>
    `)
      AWBAdditionalInvoices.push(item);
      invoiceIdArray.push(item._id)
    }
    $(this).closest('.modal').modal('hide');
  });
  
  $('#add-package-form').submit(function (event) {
    event.preventDefault();
    let pkg = extractFormData(this);
    if(pkg.express == "on") pkg.express = true;
    else pkg.express = false
    let isNew=false;
    if(!pkg.id){
      pkg.id = Date.now().toString();
      isNew=true;
    }
    pkg.location = "Warehouse FLL";
    pkg.dimensions = pkg.W + 'x' + pkg.H + 'x' + pkg.L;
    if(isNew===true){
      if(parseInt(pkg.copy)>1){
        for(var i=0;i<parseInt(pkg.copy);i++){
          var clonedObj = Object.assign({}, pkg);
          clonedObj.id = Date.now().toString()+i;
          awbPackages.push(clonedObj);
          //awbPackages.push(pkg);
        }
      }else{
        awbPackages.push(pkg);
      }
    }else{
      awbPackages = awbPackages.map(m=>{
        if(m.id===pkg.id){
          return Object.assign(m,pkg);
        }else{
          return m;
        }
      })
    }
    displayPackages();
    $('.mfp-close').trigger("click");
  })

  // AWB Form
  $("#value").change(function () {
    sedAnswered = 0;
  })
  $(".sed-click").click(function () {
    $("#sedRequired").val(Number($(this).attr("data-id")));
    sedAnswered = 1;
    $("#save_awb").trigger('click');
  })
  $("#add-awb-form").submit(function (event) {
    document.querySelector("#myLoader").style.display = "block"; 
    // $('#createAwb').prop('disabled',true)    
    event.preventDefault();
    var awbInfo = $(this)
      .serializeArray()
      .reduce((acc, item) => {
        if (!item.name.startsWith('invoice.')) {
          acc[item.name] = item.value;
        }
        return acc;
      }, {});

    awbInfo.isSed = sedAnswered || Number(awbInfo.isSed);
    awbInfo.packages = JSON.stringify(awbPackages);
    awbInfo.invoices = [];
    awbInfo.purchaseOrder = AWBPO.getItems();
    awbInfo.additionalInvoices = AWBAdditionalInvoices
    awbInfo.purchaseOrder = JSON.stringify(awbInfo.purchaseOrder);
    if(awbInfo.fll_pickup == "on") awbInfo.fll_pickup = true;
    else awbInfo.fll_pickup = false
    if(awbInfo.invoicecheck == "on") awbInfo.invoicecheck = true;
    else awbInfo.invoicecheck = false

    let flag = 0;
    let promises = AWBInvoices.getInvoices().map(({ file, ...invoice }) => {
      if (!invoice.number && !invoice.value && !invoice.id) {
        return;
      }
      return new Promise((r) => uploadContentFile(file, r)).then((result) => {
        if (result.fileName) {
          invoice.filename = result.fileName;
        }
        if(result.name){
          invoice.name = result.name
        }
        if(result.message){
          flag = 1
        }else
          awbInfo.invoices.push(invoice);
      }).catch(err=>{
        console.log("err",err)
      });
    });
    Promise.all(promises)
      .then(() => {
        if(flag == 1){
          swal({
            title:'Failed',
            text: "You cannot upload excel, csv or html type of files",
            type: 'error',
          })
        }else{
        $.ajax({
          url: 'create',
          type: 'post',
          data: JSON.stringify(awbInfo),
          dataType: 'json',
          contentType: 'application/json',
          processData: false,
          success: function(response) {
            swal({
              title: response.success == true ? 'Created' : 'Failed',
              text: response.message,
              type: response.success == true ? 'success' : 'error',
            }).then((res) => {
              if (response.success == true) {
                window.location.href = 'manage/' + response.awb.id + '/preview';
                  let priceExpress = 0,totalweightVal = 0,totalVolumetricWeight=0,totalInvoice=0;
                  if(awbPackages.length >0){
                    for(var i=0;i<awbPackages.length;i++){
                      if(awbPackages[i]){
                      var weight = awbPackages[i].weight;
                      if (awbPackages[i].packageCalculation == 'kg' || awbPackages[i].packageCalculation == 'Kg') {
                        weight = 2.20462 * awbPackages[i].weight;
                      }
                      totalweightVal = totalweightVal + Number(weight);
                      let check = 1;
                      awbPackages[i].dimensions.split('x').forEach(data =>{
                        check = check * data
                      })
                      let volumetricWeight = (check/166);
                      totalVolumetricWeight = totalVolumetricWeight + volumetricWeight;
                      }
                      if(awbPackages[i].express){
                        priceExpress = 1
                      }
                    }
                  }
                  if(awbInfo.invoices.length > 0){
                    awbInfo.invoices.forEach(inv =>{
                      if(inv && inv.value){
                        totalInvoice = totalInvoice + Number(inv.value)
                      }
                    })
                  }
                  let priceData = {
                    Brokerage:  0,
                    CustomsProc:  0,
                    SumOfAllCharges: 0,
                    CustomsVAT  : 0,
                    VatMultiplier :  0.12,
                    Delivery:  0,
                    Duty:  0,
                    EnvLevy:  0,
                    Freight:  0,
                    Hazmat:  0,
                    Pickup:  0,
                    ServiceVat: 0,
                    Storage:  0,
                    NoDocs:  0,
                    Insurance:  0,
                    Sed:  0,
                    Express:  priceExpress,
                    OverrideInvoiceValue:  0,
                    TotalInvoiceValue: totalInvoice,
                    OverrideInvoiceValue : totalInvoice,
                    NoOfInvoice: awbInfo.invoices.length,
                    TotalWeightValue: totalweightVal,
                    TotalVolumetricWeight : totalVolumetricWeight,
                    TotalWet: 0,
                  };
                  $.ajax({
                    url: '/warehouse/pricelabels/' + response.awb.id,
                    type: 'post',
                    data: priceData,
                  });
              }
            });
          },
        });
        }
      })
      .catch((error) => {
        console.log(error);
        swal({
          title: 'Failed',
          text: error.message || 'Unknown error',
          type: 'error',
        });
      });
  });

  // Shipper / Carrier
  $('#add-shipper-form').submit(function (event) {
    $(".close-del").trigger('click');
    event.preventDefault();
    var data = extractFormData(this);
    $.ajax({
      url: '/warehouse/shipper/create',
      type: 'post',
      data: data,
      success: function (response) {
        swal({
          title: response.success == true ? 'Created' : 'Failed',
          text: response.message,
          type: response.success == true ? 'success' : 'error',
        }).then(() => {
          if (response.success) {
            $('#shipper').append(`<option value="${response.shipper._id}">${response.shipper.name}</option>`)
          }
        })
      }
    })
  })
  $('#add-carrier-form').submit(function (event) {
    $(".close-del").trigger('click');
    event.preventDefault();
    var data = extractFormData(this);
    $.ajax({
      url: '/warehouse/carrier/create',
      type: 'post',
      data: data,
      success: function (response) {
        swal({
          title: response.success == true ? 'Created' : 'Failed',
          text: response.message,
          type: response.success == true ? 'success' : 'error',
        }).then(() => {
          if (response.success) {
            $('#carrier').append(`<option value="${response.carrier._id}">${response.carrier.name}</option>`)
          }
        })
      }
    })
  })
  $('#add-customer-form').submit(function (event) {
    $(".close-del").trigger('click');
    event.preventDefault();
    var data = extractFormData(this);
    $.ajax({
      url: '/admin/customers/create',
      type: 'post',
      data: data,
      success: function (response) {
        swal({
          title: response.success == true ? 'Created' : 'Failed',
          text: response.message,
          type: response.success == true ? 'success' : 'error',
        }).then(() => {
          if (response.success) {
            var customer = response.customer;
            $('#customerId').append(`<option value="${customer._id}">${customer.pmb} / ${customer.firstName} ${customer.lastName}</option>`)
          }
        })
      }
    })
  })

  $('#add-barcode-form').submit(function (event) {
    $(".close-del").trigger('click');
    event.preventDefault();
    var data = extractFormData(this);
    $.ajax({
      url: '/warehouse/fll/awb/create-barcode',
      type: 'post',
      data: data,
      success: function (response) {
        swal({
          title: response.success == true ? 'Created' : 'Failed',
          text: response.message,
          type: response.success == true ? 'success' : 'error',
        }).then(() => {
          console.log("alkdsjflkfasj")
          if (response.success) {
            // $("#link-add-package-popup").trigger('click');
          $('.mfp-fade').css({'display':'block'});
            var barCode = response.originBarcode;
            console.log(barCode);
            $('#originBarcode').append(`<option value="${barCode.barcode},${barCode._id}">${barCode.barcode}</option>`)
          }
        })
      }
    })
  })

    $('#charge-table-body').on('click', '.rm-service-type-edit', function (event) {
      event.preventDefault();
      var id = $(this).data('id');
      var ids = $(this).data('ids');
      swal({
        title: "Are you sure?",
        showCancelButton: true,
        confirmButtonText: 'Delete',
      }).then(response => {
        if (response.value) {
          $.ajax({
            url: `po/manage/${id}/${ids}/delete`,
            type: 'delete',
            success: function (response) {
              swal({
                title: response.success == true ? 'Removed' : 'Failed',
                text: response.message,
                type: response.success == true ? 'success' : 'error',
              }).then(res => {
                if (response.success == true) {
                  $('tr[data-record="' + ids + '"]').fadeOut('slow', () => $('tr[data-record="' + ids + '"]').remove())
                }
              })
            }
          });
        }
      })
    })

    $('#charge-table-body').on('click', '.rm-service-type-add', function (event) {
      event.preventDefault();
      var ids = $(this).data('ids');
      swal({
        title: "Are you sure?",
        showCancelButton: true,
        confirmButtonText: 'Delete',
      }).then(response => {
        $('tr[data-record="' + ids + '"]').fadeOut('slow', () => $('tr[data-record="' + ids + '"]').remove())
      })
    });

  $('.editpo').click(function (event) {
    $(".close-del").trigger('click');
    event.preventDefault();
    $('#charge-table-body > tr').remove();
    var awbpoId = $(this).data('edit-id');

    $.ajax({
      url: `/warehouse/fll/awb/po/manage/${awbpoId}/get`,
      type: 'get',
      success: function (response) {
        if (response.source === '9-5 FLL') {
          $("#po-source").val('fll').change();
        } else {
          $("#po-source").val('nas').change();
        }

        switch (response.paidType) {
          case 'Colin Credit Card':
            $("#po-paid-type").val('Colin').change();
            break;
          case 'Lavonda Credit Card':
            $("#po-paid-type").val('Lavonda').change();
            break;
          case 'Other':
            $("#po-paid-type").val('Other').change();
            break;
          default:
            $("#po-paid-type").val('Other').change();
        }
        $('#po_note').val(response.note);
        for (var i = 0; i < (Object.keys(response).length-4)/2;  i++ ) {
          if(response['serviceTypes['+i+'][charge]'] !== 'empty'){
            $('#charge-table-body').append('<tr data-record="' + i + '" > <td class="charge">'+response['serviceTypes['+i+'][charge]']+'</td><td class="amount">$'+response['serviceTypes['+i+'][amount]']+'</td><td> <a class="btn btn-link rm-service-type-edit p-1" data-id="'+awbpoId+'" data-ids="'+i+'" data-toggle="modal" data-backdrop="static" data-target="#confirm-delete-awb"> <i class="fa fa-trash"></i> </a> </td></tr>');
          }
        }

        $( "#buttonPO>button" ).remove();
        $( "#buttonPO" ).append('<button type="button" id="updatePo" class="btn btn-primary">Update PO</button>');
       
        $('#updatePo').click(function (event) {
          $(".close-del").trigger('click');
          event.preventDefault();
          var serviceTypes = [];
          $('#charge-table-body tr').each(function(index) {
            serviceTypes[index] = {
              charge: $(this).find("td").eq(0).html(), 
              amount: $(this).find("td").eq(1).html().substring(1),
            }    
         });
          var data = {
            source: $( "#po-source option:selected" ).text(),
            paidType: $( "#po-paid-type option:selected" ).text(),
            note: $( "#po_note" ).val(),
            serviceTypes: serviceTypes
          }
          $.ajax({
            url: `/warehouse/fll/awb/po/manage/${awbpoId}/update`,
            type: 'POST',
            data: data,
            success: function (response) {
              swal({
                title: response.success == true ? 'Updated' : 'Failed',
                text: response.message,
                type: response.success == true ? 'success' : 'error',
              }).then(() => {
                if (response.success) {

                  var $row = $('#awbpoTableBody tr[value="' + response.awbpoupd.id + '"]');
                  $row.remove();
                  var arrayType = ''
                  for (var i =0; i < (Object.keys(response.awbpoupd).length-4)/2;  i++ ) {
                    if(response.awbpoupd['serviceTypes['+i+'][charge]'] !== 'empty'){ 
                      arrayType = arrayType + '<option value="<%=i%>">'+response.awbpoupd['serviceTypes['+i+'][charge]'] +' / ' +response.awbpoupd['serviceTypes['+i+'][amount]'] +'</option>'
                    }
                  }
                  $('#awbpoTableBody').append('<tr value="'+response.awbpoupd.id+'" role="row" class="even"><td class="sorting_1">'+data.source+'</td><td>'+data.paidType+'</td><td>'+data.note+'</td><td>'+arrayType+'</td><td><a class="editpo" href="" data-toggle="modal" data-backdrop="static" data-edit-id="3" data-target="#add-purchase-order-popup"><i class="fas fa-pen"> </i></a></td></tr>');
                }
              })
              .catch((err) => console.log(' err update awb po'))
            }
          })
        })
        

      }
    })
  })

  $('#createPo').click(function (event) {
    $(".close-del").trigger('click');
    event.preventDefault();
    var serviceTypes = [];
    $('#charge-table-body tr').each(function(index) {
      serviceTypes[index] = {
        charge: $(this).find("td").eq(0).html(), 
        amount: $(this).find("td").eq(1).html().substring(1),
      }    
   });
    var data = {
      source: $( "#po-source option:selected" ).text(),
      paidType: $( "#po-paid-type option:selected" ).text(),
      note: $( "#po_note" ).val(),
      serviceTypes: serviceTypes
    }
    $('#charge-table-body > tr').remove();
    $.ajax({
      url: '/warehouse/fll/awb/po/create',
      type: 'post',
      data: data,
      success: function (response) {
        swal({
          title: response.success == true ? 'Created' : 'Failed',
          text: response.message,
          type: response.success == true ? 'success' : 'error',
        }).then(() => {
          if (response.success) {
            console.log('added awb po')
          }
        })
        .catch((err) => console.log(' err added awb po'))
      }
    })
  })

  //#region Package / Manifest FUNCTIONS
  function uploadContentFile(fileInputctrl, completeHandler) {
    var files = fileInputctrl.get(0).files;
    if (files.length > 0) {
      var formData = new FormData();
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        formData.append('upload', file, file.name);
      }
      $.ajax({
        url: '/util/upload',
        type: 'post',
        data: formData,
        processData: false,
        contentType: false,
        success: function (data) {
          console.log('upload successful!\n' + data);
          $("#pindecator").css('width', 0 + '%')
          if (completeHandler !== undefined) {
            completeHandler(data);
          }
        },
        xhr: function () {
          var xhr = new XMLHttpRequest();
          xhr.upload.addEventListener('progress', function (evt) {
            if (evt.lengthComputable) {
              var percentComplete = evt.loaded / evt.total;
              console.log(percentComplete);
              percentComplete = parseInt(percentComplete * 100);
              $("#pindecator").css('width', percentComplete + '%')
            }
          }, false);
          return xhr;
        }
      });
    }
    else {
      completeHandler("");
    }
  }

  function displayPackages() {
    var totalWeight = awbPackages.reduce((a,c)=>{
      let weight = Number(c.weight);
      let coef = 0.453592;
      let lbs;
      let kg;
      if(c.packageCalculation==='lbs'){
        lbs = a.lbs + weight;
        kg = a.kg + weight*coef;
      }else {
        kg = a.kg + weight;
        lbs = a.lbs +  weight/coef
      }
      return {kg, lbs}
    },{lbs:0,kg:0});

    $('.package-info').html(`${awbPackages.length} Pieces / ${totalWeight.lbs.toFixed(2)}(${totalWeight.kg.toFixed(2)})   <span style="margin-left:20px">lbs(kg)</span>`);

    packageTable.clear().draw();
    awbPackages.forEach(pkg => {
      let rowNode = packageTable.row.add([
        pkg.description,
        pkg.dimensions,
        Number(pkg.weight).toFixed(2) + ` ${pkg.packageCalculation||'lbs'}`,
        `<a class="btn btn-link btn-primary btn-edit-pkg p-1" title="Edit" data-id="${pkg.id}" href="#add-package-popup" data-backdrop="static">
          <i class="fa fa-pen"></i> </a>
        <a class="btn btn-link btn-danger btn-rm-pkg p-1" title="Delete" data-id="${pkg.id}" data-toggle='modal' data-backdrop="static" data-target='#confirmPkgDel'>
          <i class="fa fa-trash"></i> </a>`
      ]).draw(false).node();
      $(rowNode).find('td').eq(1).addClass('text-center');
      $(rowNode).find('td').eq(2).addClass('text-center');
      $(rowNode).find('td').eq(3).addClass('text-right');
      $(rowNode).find('.btn-edit-pkg').magnificPopup({
        type: 'inline',
        midClick: true,
        mainClass: 'mfp-fade',
        gallery: {
          enabled: true,
        },
        callbacks: {
          open: function () {
            $('.btn-copy-last').hide();
            $('#id').val(pkg.id);
            $('#description').val(pkg.description);
            $('#weight').val(pkg.weight);
            $('#packageCalculation').val(pkg.packageCalculation||'lbs');
            $('#select2-packageCalculation-container').text(pkg.packageCalculation || 'lbs');
            $('#packageType').val(pkg.packageType || 'BOX');
            $('#select2-packageType-container').text(pkg.packageType || 'BOX');
            $('#originBarcode').val(pkg.originBarcode || 'No tracking');
            $('#select2-originBarcode-container').text(pkg.originBarcode.split(',')[0] || 'No tracking');
            $("#express"). prop("checked", pkg.express);
            var dims = pkg.dimensions.toLowerCase().split('x');
            $("#W").val(dims[0])
            $("#H").val(dims[1])
            $("#L").val(dims[2])
          }
        },
        closeOnBgClick: false
      })
    })

    $("#packageTable").on("click", ".btn-rm-pkg", function(){
      var id = $(this).data('id');
      $("#rmPackage").attr('data-id', id);
    });

    $("#rmPackage").click(function () {
      var count = 0;
      const deletedPackages = [];
      var id = $(this).attr("data-id");
       console.log(this,);
      // awbPackages = awbPackages.filter(package => package.id != id);
      awbPackages = awbPackages.filter((package) => {
        if (package.id != id) {
          return true;
        } else {
          if(count == 0){
          deletedPackages.push({_id: package._id, deleted: true});
            count++;
          return false;
              }
              else{
                return true;
              }
        }
      });
      console.log(awbPackages);
      displayPackages();
      $(".close-del").trigger('click');
     
    });
  }
});

function removeInvoice(str){
  var id = $(str).data('id');
  for(var i=0;i<AWBAdditionalInvoices.length;i++){
    if(id == AWBAdditionalInvoices[i].additionalInvoices){
      AWBAdditionalInvoices.splice(i,1)
      invoiceIdArray.forEach((itemId,index) => {
        if(String(id) == String(itemId)){
          invoiceIdArray.splice(index,1)
        }
      })
      $('div[data-record="' + id + '"]').remove()
      break
    }
  }
}