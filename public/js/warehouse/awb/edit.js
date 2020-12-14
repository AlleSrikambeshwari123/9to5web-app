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
function closeAddPackage(){  
  $('.mfp-close').trigger("click");
}
let noTrackingId = ""
$('select#originBarcode option').each(function(index,option){
  let text = option.text
 if(text === "No tracking") {
   option.selected = true; 
   noTrackingId = option.value
 }
})
function refreshBarcode(){  
  $.ajax({
    url: '/warehouse/fll/awb/refresh-barcode',
    type: 'get',
    success: function (response) {
      if (response) {
        var barcodeId = (response.barcode)?response.barcode._id:'';        
        $('#originBarcode').val(barcodeId).trigger('change');
      }else{
        // $('#originBarcode').val(barcodeId).trigger('change');
      }
    }
  })
}
if (Array.isArray(window.invoices) && window.invoices.length) {
  window.invoices.forEach(invoice => {
    invoice['id'] = invoice['_id'];
    return AWBInvoices.addInvoceRow(invoice)
  });
} else {
  AWBInvoices.addInvoceRow() 
}

var AWBAdditionalInvoices = [],invoiceIdArray = []

var pickup = $('select.awb-deliveryMethod').children("option:selected").val();
if(pickup == '1') $('.hideDriver').hide()

// Check for Pickup Delivery
$("select.awb-deliveryMethod").change(function(){
  var pickup = $(this).children("option:selected").val();
  if(pickup == '1') $('.hideDriver').hide()
  if(pickup == '2') $('.hideDriver').show()
});

$(function () {
  const deletedPackages = [];
  const deletedPurchaseOrders = [];
  $(".copy-package-button").click(function(){    
    $(".copy-package-text").show();
  });
  $("#link-add-package-popup").click(function(){    
    $(".copy-package-text").hide();
    $("#copy").val(1);
  });

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
  $('#po-paid-type').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: 'Select a Paid Type',
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
    placeholder: "Select a package type"
  })
  $('#originBarcode').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a package type"
  })
  $('#packageCalculation').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a package calculation"
  })
  
  $('#driver').select2({
    theme: 'bootstrap',
    width: '100%',
    placeholder: "Select a Driver"
  })
  $('form[name="add-additional-invoices-form"] select').select2({
    theme: 'bootstrap',
    width: '100%',
    minimumResultsForSearch: -1
  })

  $('form[name="add-purchase-order-item-form"] select').select2({
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
              <span aria-hidden="true" class="float-right">×</span>
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

  var packageTable = $('#packageTable').DataTable({
    pageLength: 5,
    bSortable: false,
    ordering: false,
    bLengthChange: false,
    bFilter: false,
    "columnDefs": [{
      "defaultContent": "-",
      "targets": "_all"
    }]
  })

  var sedAnswered = 0;

  var awbPackages = packages || [];
    //Showing old packages
  if(awbPackages.length>0){
    displayPackages();
  }
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
        $('#id').val(undefined);
        $('#description').val("");
        $('#weight').val("");
        $('#packageType').val("BOX");
        $('#select2-packageType-container').text('BOX');
        $('#packageCalculation').val("lbs");
        $('#select2-packageCalculation-container').text('lbs');        
        $("#express"). prop("checked", false);
        $('#originBarcode').val(noTrackingId);
        
        $('#select2-originBarcode-container').text('No tracking');
        $('#originBarcode').val($('#originBarcode').val());
        $('#W').val("");
        $('#H').val("");
        $('#L').val("");
      }
    }
  });
  $(".btn-copy-last").click(function () {
    if (awbPackages.length > 0) {
      var lastPackage = awbPackages[awbPackages.length - 1];
      $("#description").val(lastPackage.description);
      $("#weight").val(lastPackage.weight);
      $('#packageCalculation').val(lastPackage.packageCalculation||'lbs');
      $('#packageType').val(lastPackage.packageType || 'BOX');
      var dims = lastPackage.dimensions.toLowerCase().split('x');
      $("#W").val(dims[0])
      $("#H").val(dims[1])
      $("#L").val(dims[2])
    }
  })
  $("#btn-cancel-add").click(function () {
    $('.mfp-close').trigger("click");
  })
  $('#add-package-form').submit(function (event) {
    event.preventDefault();
    let pkg = extractFormData(this);
   // console.log(pkg);
   // console.log(awbPackages);
   if(pkg.express == "on") pkg.express = true;
    else pkg.express = false
    let isNew=false;
    if (!pkg.id) {
      pkg.id = Date.now().toString();
      isNew=true;
    }

    pkg.location = "Warehouse FLL";
    pkg.dimensions = pkg.W + 'x' + pkg.H + 'x' + pkg.L;
    if(isNew===true){
      if(parseInt(pkg.copy)>1){
        for(var i=0;i<parseInt(pkg.copy);i++){
          var clonedObj = Object.assign({}, pkg);
          clonedObj.id = Date.now().toString()+'_'+i;
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
    event.preventDefault();
    if (Number($("#value").val()) >= 2500 && sedAnswered == 0) {
      $("#show-sed").trigger('click');
      return;
    }

    var awbInfo = $(this)
      .serializeArray()
      .reduce((acc, item) => {
        if (!item.name.startsWith('invoice.')) {
          acc[item.name] = item.value;
        }
        return acc;
      }, {});
    awbInfo.isSed = sedAnswered || Number(awbInfo.isSed);
    var pickup = $('select.awb-deliveryMethod').children("option:selected").val();
    if (pickup == 1) delete awbInfo.driver
    if (deletedPackages && deletedPackages.length) {
      awbPackages = [...awbPackages, ...deletedPackages];
    }

    awbInfo.packages = JSON.stringify(awbPackages);
    awbInfo.invoices = [];
    let purchaseOrder = AWBPO.getItems();
    
    if(awbInfo.fll_pickup == "on") awbInfo.fll_pickup = true;
    else awbInfo.fll_pickup = false
    if(awbInfo.invoicecheck == "on") awbInfo.invoicecheck = true;
    else awbInfo.invoicecheck = false

    let deletedPurchaseOrders = AWBPO.getDeletedItems();
    if (deletedPurchaseOrders && deletedPurchaseOrders.length) {
      purchaseOrder = [...purchaseOrder, ...deletedPurchaseOrders];
    }
    awbInfo.additionalInvoices = AWBAdditionalInvoices

    awbInfo.purchaseOrder = JSON.stringify(purchaseOrder);
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
              title: response.success == true ? 'Updated' : 'Failed',
              text: response.message,
              type: response.success == true ? 'success' : 'error',
            }).then((res) => {
              if (response.success == true) {
                window.location.href = 'preview';
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
                  Express:  priceExpress,
                  TotalInvoiceValue: totalInvoice,
                  NoOfInvoice: awbInfo.invoices.length,
                  TotalWeightValue: totalweightVal,
                  TotalVolumetricWeight : totalVolumetricWeight,
                };
                $.ajax({
                  url: '/warehouse/pricelabels/edit/' + response.id,
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
  });
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
          if (response.success) {
            $("#link-add-package-popup").trigger('click');
            var barCode = response.data;
            console.log(barCode);
            $('#originBarcode').append(`<option value="${barCode.barcode},${barCode._id}">${barCode.barcode}</option>`)
          }
        })
      }
    })
  });
  
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
    //awbPackages.forEach(pkg => totalWeight += Number(pkg.weight));
    $('.package-info').html(`${awbPackages.length} Pieces / ${totalWeight.lbs.toFixed(2)}(${totalWeight.kg.toFixed(2)})   <span style="margin-left:20px">lbs(kg)</span>`);

    packageTable.clear().draw();
    awbPackages.forEach(pkg => {
      // A bit hacky way to detect newly added packages, pkg.id == Date.now() for new package for 
      // some reason
      // console.error('pkg', pkg);
      let check = 1
      pkg.dimensions.split('x').forEach(data =>{
        check = check * data
      })
      pkg.volumetricWeight = (check/166);

      let isNew = pkg.id > 1e9
      let rowNode = packageTable.row
        .add([
          pkg.trackingNo,
          pkg.description,
          pkg.dimensions,
          Number(pkg.weight).toFixed(2) + ` ${pkg.packageCalculation || 'kg'}`,
          Number(pkg.volumetricWeight).toFixed(2) + ` 'vlbs'`,
          pkg.lastStatusText ? pkg.lastStatusText : '',
          [
            `<a class="btn btn-link btn-primary btn-edit-pkg p-1" title="Edit" data-id="${pkg.id}" href="#add-package-popup"><i class="fa fa-pen"></i></a>`,
            `<a class="btn btn-link btn-danger btn-rm-pkg p-1" title="Delete" data-id="${pkg.id}" data-toggle='modal' data-target='#confirmPkgDel'><i class="fa fa-trash"></i></a>`,
            !isNew && `<a class="btn btn-link btn-primary p-1 btn-print-pkg" data-toggle="modal" data-id="${pkg.id}" data-original-title="Print Label" data-target="#print-popup"> <i class="fa fa-print"></i> </a>`,
          ].filter(Boolean).join('\n'),
        ])
        .draw(false)
        .node();
      $(rowNode).find('td').eq(2).addClass('text-center');
      $(rowNode).find('td').eq(3).addClass('text-center');
      $(rowNode).find('td').eq(4).addClass('text-center');
      $(rowNode).find('td').eq(5).addClass('text-center');
      $(rowNode).find('td').eq(6).addClass('text-right');
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
            $('#packageType').val(pkg.packageType || 'BOX');
            $('#select2-packageType-container').text(pkg.packageType || 'BOX');
            $('#originBarcode').val(pkg.originBarcode || 'No tracking');
            console.log("pkg.originBarcode",pkg.originBarcode,$('#originBarcode option:selected').text())
            $('#select2-originBarcode-container').text($('#originBarcode option:selected').text());
            $("#express"). prop("checked", pkg.express);
            $('#packageCalculation').val(pkg.packageCalculation||'lbs');
            $('#select2-packageCalculation-container').text(pkg.packageCalculation || 'lbs');
            var dims = pkg.dimensions.toLowerCase().split('x');
            $("#W").val(dims[0])
            $("#H").val(dims[1])
            $("#L").val(dims[2])
          }
        }
      })
    })
   
    $("#packageTable").on("click", ".btn-rm-pkg", function(){
      var id = $(this).data('id');
      $("#rmPackage").attr('data-id', id);
    });

    $("#rmPackage").click(function () {
      var id = $(this).attr('data-id');
      awbPackages = awbPackages.filter((package) => {
        if (package.id != id) {
          return true;
        } else {
          deletedPackages.push({_id: package._id, deleted: true});
          return false;
        }
      });
      displayPackages();
      $(".close-del").trigger('click');
    });
  }
});


$(function() {
  // This logic is copied from package lists:
  var pdfPath;
  $('.btn-print-pkg').click(function() {
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

  $('.btn-print-pkgs').click(function () {
    let id = $(this).data('id');
    $('.btn-print-pkgs').text('Loading...')
    $.ajax({
      url: '/warehouse/print-pdf/pkg/' + id,
      type: 'get',
      success: function(response) {
        if (response.success) {
          pdfPath = window.location.origin + '/util/pdf' + response.filename;
          printJS(pdfPath)
          $('.btn-print-pkgs').text('Print Pkgs')
        } else {
          $('.btn-print-pkgs').text('Print Pkgs')
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