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
$(function () {
  var upload = new FileUploadWithPreview('invoice-upload-field')
  if ($('#add-purchase-order-popup').is(':hidden')) {
    $('#charge-table-body > tr').remove();
  }
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
    placeholder: "Select a package type"
  })

  var packageTable = $('#packageTable').DataTable({
    pageLength: 5,
    bSortable: false,
    bLengthChange: false,
    bFilter: false,
    columnDefs: [{
      orderable: false,
      targets: [0, 1, 2, 3]
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
        if (awbPackages.length > 0) $('.btn-copy-last').show()
        else $('.btn-copy-last').hide();

        $('#id').val(undefined);
        $('#description').val("");
        $('#weight').val("");
        $('#packageCalculation').val('kg');
        $('#packageType').val("");
        $('#W').val("");
        $('#H').val("");
        $('#L').val("");
      }
    }
  });

  $(".btn-copy-last").click(function () {
    if (awbPackages.length > 0) {
      var lastPackage = awbPackages[awbPackages.length - 1];
      $('#id').val(undefined);
      $("#description").val(lastPackage.description);
      $("#weight").val(lastPackage.weight);
      $('#packageCalculation').val(lastPackage.packageCalculation||'kg');
      $('#packageType').val("");
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

  $('#add-package-form').submit(function (event) {
    event.preventDefault();
    let pkg = extractFormData(this);
    let isNew=false;
    if(!pkg.id){
      pkg.id = Date.now().toString();
      isNew=true;
    }
    pkg.location = "Warehouse FLL";
    pkg.dimensions = pkg.W + 'x' + pkg.H + 'x' + pkg.L;
    if(isNew===true){
      awbPackages.push(pkg);
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

    var awbInfo = extractFormData(this);
    awbInfo.isSed = sedAnswered || Number(awbInfo.isSed);
    awbInfo.packages = JSON.stringify(awbPackages);

    uploadContentFile($("#invFile"), result => {
      if (result.fileName) {
        awbInfo.invoice = result.fileName;
      }

      $.ajax({
        url: 'create',
        type: 'post',
        data: awbInfo,
        success: function (response) {
          swal({
            title: response.success == true ? 'Created' : 'Failed',
            text: response.message,
            type: response.success == true ? 'success' : 'error',
          }).then(res => {
            if (response.success == true) {
              window.location.href = 'manage/' + response.awb.id + '/preview';
            }
          })
        }
      });
    })
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
            $('#shipper').append(`<option value="${response.shipper.id}">${response.shipper.name}</option>`)
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
            $('#carrier').append(`<option value="${response.carrier.id}">${response.carrier.name}</option>`)
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
            $('#customerId').append(`<option value="${customer.id}">${customer.pmb} / ${customer.firstName} ${customer.lastName}</option>`)
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
            $('#charge-table-body').append('<tr data-record="' + i + '" > <td class="charge">'+response['serviceTypes['+i+'][charge]']+'</td><td class="amount">$'+response['serviceTypes['+i+'][amount]']+'</td><td> <a class="btn btn-link rm-service-type-edit p-1" data-id="'+awbpoId+'" data-ids="'+i+'" data-toggle="modal" data-target="#confirm-delete-awb"> <i class="fa fa-trash"></i> </a> </td></tr>');
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
                  $('#awbpoTableBody').append('<tr value="'+response.awbpoupd.id+'" role="row" class="even"><td class="sorting_1">'+data.source+'</td><td>'+data.paidType+'</td><td>'+data.note+'</td><td>'+arrayType+'</td><td><a class="editpo" href="" data-toggle="modal" data-edit-id="3" data-target="#add-purchase-order-popup"><i class="fas fa-pen"> </i></a></td></tr>');
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
        Number(pkg.weight).toFixed(2) + ` ${pkg.packageCalculation||'kg'}`,
        `<a class="btn btn-link btn-primary btn-edit-pkg p-1" title="Edit" data-id="${pkg.id}" href="#add-package-popup">
          <i class="fa fa-pen"></i> </a>
        <a class="btn btn-link btn-danger btn-rm-pkg p-1" title="Delete" data-id="${pkg.id}" data-toggle='modal' data-target='#confirmPkgDel'>
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
            $('#packageCalculation').val(pkg.packageCalculation||'kg');
            $('#packageType').val(pkg.packageType);
            var dims = pkg.dimensions.toLowerCase().split('x');
            $("#W").val(dims[0])
            $("#H").val(dims[1])
            $("#L").val(dims[2])
          }
        }
      })
    })

    $('.btn-rm-pkg').click(function () {
      var id = $(this).data('id');
      $("#rmPackage").attr('data-id', id);
    })
    $("#rmPackage").click(function () {
      var id = $(this).data('id');
      awbPackages = awbPackages.filter(package => package.id != id);
      displayPackages();
      $(".close-del").trigger('click');
    });
  }
});
