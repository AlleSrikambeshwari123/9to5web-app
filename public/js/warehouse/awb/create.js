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
  $('#customerId').select2({
    theme: 'bootstrap',
    width: '100%'
  })
  $('#shipper').select2({
    theme: 'bootstrap',
    width: '100%'
  })
  $('#carrier').select2({
    theme: 'bootstrap',
    width: '100%'
  })
  $('#hazmat').select2({
    theme: 'bootstrap',
    width: '100%'
  })

  var pageMode = $("#pgmode").val();
  //#region PAGE LOAD 
  var mid = $("#mid").val();
  var mtype = $('#mtype').val();
  var sedAnswered = 0;
  var awbPackages = [];

  $('.btn-add-package').magnificPopup({
    type: 'inline',
    midClick: true,
    mainClass: 'mfp-fade',
    gallery: {
      enabled: true,
    }
  });

  $("#print-awb").click(function () {
    var awb = $(this).attr('data-id')
    $.ajax({
      url: '/warehouse/print-awb/' + awb,
      contentType: 'json',
      success: function (result) {
        console.log('result', result)
      }
    })
  })
  $("#print-lbl").click(function () {
    var awb = $(this).attr('data-id')
    $.ajax({
      url: '/warehouse/print-awb-lbl/' + awb,
      contentType: 'json',
      success: function (result) {
        console.log('result', result)
      }
    })
  })

  $(".copy-last").click(function () {
    if (awbPackages.length > 0) {
      var pkgIndex = awbPackages.length - 1
      var packageToCopy = awbPackages[pkgIndex];
      $("#pkgId").val("");
      $("#trackingNo").val("");
      $("#description").val(packageToCopy.description);
      $("#weight").val(packageToCopy.weight);
      //Dims 
      packageToCopy.dimensions = packageToCopy.dimensions.toLowerCase()
      var dims = packageToCopy.dimensions.toLowerCase().split('x');
      $("#W").val(dims[0])
      $("#H").val(dims[1])
      $("#L").val(dims[2])
    }
  })
  $('#add-package-popup').$("#btn-cancel-add").click(function () {
    $('.mfp-close').trigger("click");
  })
  $('#add-package-popup').find("#btn-add-package").click(function () {
    var package = {
      id: $("#pkgId").val(),
      trackingNo: $("#trackingNo").val(),
      description: $("#description").val(),
      weight: $("#weight").val(),
      dimensions: $("#W").val() + "x" + $("#H").val() + "x" + $("#L").val(),
      awb: $(".awb").val(),
      packaging: $("#packaging").val(),
      pkgNo: $("#pkgNo").val()
    }
    var isValid = true;
    if (package.trackingNo == "") {
      isValid = false
    }
    if (package.weight == "") {
      isValid = false
    }
    if (package.description == "") {
      isValid = false;
    }
    if (isValid == true) {
      package.location = "Warehouse FL";
      $.ajax({
        url: '/warehouse/save-awb-package',
        type: 'post',
        data: package,
        success: function (result) {
          if (result.id) {
            package.id = result.id;
          }
          if ($("#pkgId").val() != 0) {
            $("#pkgId").val("0");
            window.location = window.location;
          }
          else {
            awbPackages.push(package);
            displayPackages(awbPackages, "#packageTable", "cargo");
          }
          $("#pkgNo").val(awbPackages.length + 1)
          $("#trackingNo").val('');
          $("#description").val('');
          $("#weight").val('');
          $("#W").val("");
          $("#H").val("");
          $("#L").val("");
          //$(".close-popup").trigger('click'); 
        }
      })
      //we need to actually save the package and clear the screen 
    }
    console.log(package)
    console.log(awbPackages)
    //refres the table 
  })
  $(".sed-click").click(function () {
    $("#sedRequired").val(Number($(this).attr("data-id")));
    sedAnswered = 1;
    console.log('sed answer changed' + sedAnswered)
    $("#save_awb").trigger('click');
  })

  $("#value").change(function () {
    sedAnswered = 0;
  })
  $("#update_awb").click(function () {
    $("#save_awb").trigger("click")
  })
  $("#save_awb").click(function () {
    //validate the awb 
    //handle upload
    var hasInvoice = 0;
    if (Number($("#value").val()) >= 2500 && sedAnswered == 0) {
      //trigger SED QUESTION
      $("#show-sed").trigger('click');
      console.log('showing sed question')
      return;
    }

    var awbInfo = {
      id: $("#id").val(),
      isSed: $("#sedRequired").val(),
      hasDocs: hasInvoice,
      invoiceNumber: $("#invoiceNumber").val(),
      value: $("#value").val(),
      customerId: $("#customerId").val(),
      shipper: $("#pick-shipper").val(),
      carrier: $("#carrier").val(),
      hazmat: $("#pick-haz").val(),

    };
    if (awbInfo.customerId == "" || awbInfo.shipper == "" || awbInfo.carrier == "") {
      alert('cannot save AWB Info missing')
      return;
    }
    if (awbInfo.value == "") {
      awbInfo.value = 0;
    }
    console.log(awbInfo, "saving the awb")
    uploadContentFile($("#invFile"), function (results) {
      var fileInfo = {};
      if (results != "") {
        var fileInfo = JSON.parse(results);

        console.log('results', fileInfo[0].uploadedFile);
        if (fileInfo[0].uploadedFile) {
          hasInvoice = 1;
          awbInfo.hasDocs = 1;
          awbInfo.invoice = fileInfo[0].uploadedFile;
        }
      }

      //we can send now 
      console.log('sending', awbInfo)
      $.ajax({
        url: '/warehouse/save-awb',
        type: 'post',
        data: awbInfo,
        success: function (result) {
          console.log(result);
          $(".awb").text(result.id);
          $(".awb").val(result.id)
          $("#add_package").show();
          $("#save_awb").hide();
          $(".print-options").show();
          $("#print-awb").attr('data-id', result.id);
          $("#print-lbl").attr('data-id', result.id);

        }
      });
    })

  });


  $("#print-label").click(function () {

  })

  $("#search").keyup(function () {
    var query = $(this).val();
    console.log(query)
    if (query.length >= 3) {
      console.log(query)
      $.ajax({
        url: '/warehouse/find-customer',
        type: 'post',
        data: { search: query },
        success: function (data) {
          console.log(data, "customer listing");
          $("#customerTable").empty();
          for (i = 0; i < data.customer.length; i++) {
            console.log(data.customer[i])
            $("#customerTable").append(`<tr><td>${data.customer[i].pmb}</td><td>${data.customer[i].name}</td> <td><i data-id="${data.customer[i].id}" data-name="${data.customer[i].name}" class='fa fa-check choose_customer' style='cursor:pointer'></i></td></tr>`)
          }
          $("#customerTable").show();
          $(".choose_customer").click(function () {
            var custId = $(this).attr('data-id')
            var custName = $(this).attr('data-name')
            $(".skybox").val(custName);
            $(".customerId").val(custId);
            $(".close-del").trigger('click')
          })
        }

      });
    }
  })
  $(".close-manifest").click(function () {
    var btn = $(this);
    $.ajax({
      url: '/warehouse/close-manifest',
      type: 'post',
      data: {
        mid: mid
      },
      success: function (result) {
        btn.fadeOut();
        $(".pkg-form").hide();
        swal("Hey", result.message, {
          icon: "info",
          buttons: {
            confirm: {
              className: 'btn btn-info'
            }
          },
        });
      }
    });
  });
  $(".new-cube").click(function () {
    var btn = $(this);
    btn.hide();
    $(".cubeId").show();
  });
  $(".ship-manifest").click(function () {
    //we need the awb 
    var btn = $(".ship-manifest-btn");
    var awb = $("#awb").val();

    $.ajax({
      url: '/warehouse/ship-manifest',
      type: 'post',
      data: {
        mid: mid,
        awb: awb
      },
      success: function (result) {
        $(".close-del").trigger('click');
        btn.fadeOut();
        swal("Hey", result.message, {
          icon: "info",
          buttons: {
            confirm: {
              className: 'btn btn-info'
            }
          },
        });
      }
    });
  });
  $(".email-broker").click(function () {

    //change icon to spin 
    $("#eb-icon").removeClass('icon-plane');
    $('#eb-icon').addClass('spinner');
    $('#eb-icon').addClass('icon-spinner2');
    $.ajax({
      url: '/warehouse/email-manifest',
      type: 'post',
      data: { mid: mid, email: $("#broker-email").val(), name: $("#broker-name").val() },
      success: function (result) {

        $("#eb-icon").removeClass('spinner');
        $("#eb-icon").removeClass('icon-spinner2');
        $("#eb-icon").addClass('icon-check');
        $("#eb-message").text(result.message);
        $("#eb-message").addClass('text-success');
        setTimeout(function () {
          $(".close-del").trigger('click');
        }, 2000);
        //show message 
        //and close modal 
      }
    })
  });
  $(".export-manifest").click(function () {
    window.location = '/warehouse/export-manifest/' + mid;
  });
  $("#rmPackage").click(function () {
    var id = $(this).attr('data-id');
    var type = $(this).attr('data-type');
    console.log('type ' + type);
    deletePackage(id, type);
    $(".close-del").trigger('click');
    getManifestTotals(mid, mtype);
  });
  $("#verify-manifest-duty").click(function () {
    var itemsFile = $(document.getElementById('uploadxls'));
    console.log(itemsFile);
    if (itemsFile[0].files.length > 0) {
      uploadContentFile(itemsFile, function (data) {
        var fileData = JSON.parse(data);
        var request = {};
        request.filename = fileData[0].uploadedFile;
        request.mid = mid;

        $.ajax({
          url: '/warehouse/verify-manifest',
          type: 'post',
          data: request,
          success: function (faResponse) {

            alert('success');
          }
        });
      });
    }
  })
  $("#generateAwb").click(function () {
    $.ajax({
      url: "/warehouse/download-awb",
      type: "post",
      data: { mid: mid, totalWeight: $(".total-weight").text(), totalValue: $(".total-value").text(), pieces: Number($("#mailCount").text()) + Number($("#packageCount").text()) + Number($("#unProcCount").text()) },
      success: function (result) {
        console.log(result);
        window.location = "/warehouse/download-file/" + result.filename;
        //alert(result.filename); 
      }
    })
  });

  //#endregion

  //#region Package / Manifest FUNCTIONS
  function uploadContentFile(fileInputctrl, completeHandler) {
    var files = fileInputctrl.get(0).files;

    if (files.length > 0) {
      // create a FormData object which will be sent as the data payload in the
      // AJAX request
      var formData = new FormData();

      // loop through all the selected files and add them to the formData object
      for (var i = 0; i < files.length; i++) {
        var file = files[i];

        // add the files to formData object for the data payload
        formData.append('uploads[]', file, file.name);
      }

      $.ajax({
        url: '/util/upload',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function (data) {
          //we want to get the filename uploaded here
          //we are expecting data to be an array of files uploaded now
          //now that we have uploaded lets send it to azure storage
          console.log('upload successful!\n' + data);
          $("#pindecator").css('width', 0 + '%')
          if (completeHandler !== undefined) {
            completeHandler(data);
          }
        },
        xhr: function () {
          // create an XMLHttpRequest
          var xhr = new XMLHttpRequest();
          // listen to the 'progress' event
          xhr.upload.addEventListener('progress', function (evt) {
            if (evt.lengthComputable) {
              // calculate the percentage of upload completed
              var percentComplete = evt.loaded / evt.total;
              percentComplete = parseInt(percentComplete * 100);
              $("#pindecator").css('width', percentComplete + '%')
              //Materialize.toast("percent complete" + percentComplete);
              // update the Bootstrap progress bar with the new percentage
              //$('.progress-bar').text(percentComplete + '%');
              //$('.progress-bar').width(percentComplete + '%');

              // once the upload reaches 100%, set the progress bar text to done
              //if (percentComplete === 100) {
              //    $('.progress-bar').html('Done');
              //}

            }
          }, false);
          return xhr;
        }
      });
    }
    else {
      console.log("sending back no file")
      completeHandler("");
    }
  }

  function getManifestTotals(mid, type) {
    var totalWeight = 0;
    var totalValue = 0;

    getManifestPackages(mid, mtype, function (packages) {
      packages.forEach(element => {
        if (element != null) {
          totalWeight = totalWeight + Number(element.weight);
          totalValue = totalValue + Number(element.value);
        }
      });
      if (type == 'cargo') {
        getManifestPackages(mid, "mail", function (packages1) {
          packages1.forEach(element => {
            totalWeight += Number(element.weight);
            totalValue += Number(element.value);
          });
          $(".total-weight").text(' ' + totalWeight + ' LBS');
          $(".total-value").text(' ' + Number(totalValue).formatMoney(2, '.', ','))
          getManifestPackages(mid, "unproc", function (packages2) {
            packages2.forEach(element => {
              console.log(element);

              totalWeight += Number(element.weight);
              totalValue += Number(element.value);
              console.log(`the total weight is ${totalWeight} - ${totalValue}`);
              $(".total-weight").text(' ' + totalWeight + ' LBS');
              $(".total-value").text(' ' + Number(totalValue).formatMoney(2, '.', ','));

            });
          });
        });
      }
      else {
        //  LoadPackageCounters();
        $(".total-weight").text(' ' + totalWeight + ' LBS');
        $(".total-value").text(' ' + Number(totalValue).formatMoney(2, '.', ','))
      }
    });
  }
  function getManifestPackages(mid, type, callbk) {
    var pkgs = [];
    $.ajax({
      url: '/warehouse/get-mpackages',
      type: 'post',
      data: {
        mid: mid,
        mtype: type
      },
      success: function (result) {
        console.log(result);
        pkgs = result;
        callbk(pkgs);
      },
      error: function (err) {

      }
    });
  }

  function displayPackages(packages, tableId, ctype) {
    //REFACTORED FUNCTION  
    var totalWeight = 0;
    for (var i = 0; i < packages.length; i++) {
      if (!isNaN(packages[i].weight)) {
        totalWeight += Number(packages[i].weight)
      }
    }
    $('.total-weight').text(totalWeight + " lbs")
    if ($(tableId + " tbody").children().length > 0)
      $(tableId).DataTable().destroy();
    var containerLabel = "Skid";
    var hideCols = true;
    if (ctype == 'mail') {
      console.log('print')
      $("#mailCount").text(packages.length);
    }
    if (ctype == "unproc") {
      hideCols = false;
      $("#unProcCount").text(packages.length);
      console.log('going to hide cols');
    }
    if (ctype == "cargo") {
      $("#packageCount").text(packages.length);
    }
    var colDef = [
      {
        title: "Tracking No",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.trackingNo} `;
        }
      },


      {
        title: "Description",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.description}`;
        }
      },
      {
        title: "Weight",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.weight}`;
        }
      },
      {
        title: "Dimensions",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.dimensions}`;
        }
      },

      {
        title: "",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `<i class='fas fa-pencil-alt edit'  data-id='${data.id}' title='Edit' style='cursor:pointer;'></i> <i class='fas fa-print print-single-label pl-2 pr-2'  data-id='${data.id}' title='Print Label' style='cursor:pointer;'></i> <i title='Delete' data-type='${ctype}' data-toggle='modal' data-target='#confirmPkgDel' class='fas fa-trash rm' data-id='${data.id}' style='cursor:pointer;'></i>`;
        }
      },

    ];
    var colDefc = [

      {
        title: "Compartment",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.compartment} `;
        }
      },
      {
        title: "Tracking No",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.trackingNo} `;
        }
      },


      {
        title: "Description",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.description}`;
        }
      },
      {
        title: "Weight",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.weight}`;
        }
      },
      {
        title: "Dimensions",
        data: null,
        render: function (data, type, row, meta) {
          // console.log(data);
          return `${data.dimensions}`;
        }
      },

      // {
      //     title: "",
      //     data: null,
      //     render: function (data, type, row, meta) {
      //         // console.log(data);
      //         return `<i class='fas fa-pencil-alt edit'  data-id='${data.id}' title='Edit' style='cursor:pointer;'></i> <i class='fas fa-print print-single-label pl-2 pr-2'  data-id='${data.id}' title='Print Label' style='cursor:pointer;'></i> <i title='Delete' data-type='${ctype}' data-toggle='modal' data-target='#confirmPkgDel' class='fas fa-trash rm' data-id='${data.id}' style='cursor:pointer;'></i>`;
      //     }
      // },

    ];
    if (pageMode == "flight") {
      colDef = colDefc;
    }

    $(tableId).DataTable({

      data: packages,
      paging: true,

      columns: colDef,
      //bInfo:false,

      "language": {
        "decimal": ",",
        "thousands": "."
      },

      "deferRender": true,
      initComplete: function () {
        $(tableId).find(".edit").click(function () {
          var id = $(this).attr('data-id');
          var form = "#cargoPackageForm";

          if (ctype == 'mail')
            form = '#mailPackageForm';
          if (ctype == "unproc")
            form = "#unprocPackageForm"
          $(form).parent().show();
          loadPackage(id, $(form));
        });
        $(tableId).find(".print-single-label").click(function () {
          var id = $(this).attr('data-id');
          var form = "#cargoPackageForm";
          $.ajax({
            url: '/warehouse/print-awb-lbl/' + $("#id").val() + ":" + id,
            contentType: 'json',
            success: function (result) {

            }
          })

        });
        $(tableId).find(".rm").click(function () {
          var id = $(this).attr('data-id');
          var type = $(this).attr('data-type');
          $("#rmPackage").attr('data-id', id);
          $("#rmPackage").attr('data-type', type);
          // deletePackage(id,"cargo");
        });
      },

    });
  }

  function loadPackage(trackingNo, form) {
    console.log(form.attr('id'));
    $.ajax({
      url: '/warehouse/load-package/' + trackingNo,
      contentType: 'json',
      success: function (dResult) {
        console.log(dResult);

        // form.find('.skybox').val(dResult.skybox);
        //console.log(dResult.skybox);
        $("#pkgId").val(dResult.id);
        $('#trackingNo').val(dResult.trackingNo);
        // form.find('.shipper').val(dResult.shipper);
        //form.find('.package-value').val(dResult.value);
        $('#weight').val(dResult.weight);
        //form.find('.pieces').val(dResult.pieces);
        $('#description').val(dResult.description);
        //form.find('.carrier').val(dResult.carrier);
        var dims = dResult.dimensions.split("x");
        if (dims.length == 3) {
          $("#W").val(dims[0])
          $("#H").val(dims[1])
          $("#L").val(dims[2])
        }
        if (dResult.pkgNo) {
          $("#pkgNo").val(dResult.pkgNo)
        }
        if (dResult.packaging) {
          $("#packaging").val(dResult.packaging)
        }
        form.find('.dimensions').val(dResult.dimensions);
        $(".btn-add-package").trigger('click');
        // if (typeof dResult.bag != "undefined")
        //     form.find('.bag').val(dResult.bag);
        // else
        //     form.find('.skid').val(dResult.skid);

        //form.find('.skybox').trigger('change');

      },
      error: function (err) {

      }

    })
  }

  function deletePackage(trackingNo, type, id) {
    $.ajax({
      url: '/warehouse/rm-package',
      type: 'post',
      data: {
        id: trackingNo,
      },
      success: function (dResult) {
        getManifestPackages(mid, "default", function (mailPackages) {

          // displayMailPackages(mailPackages);
          window.location = window.location;

        });
      },
      error: function (err) {

      }

    })
  }
});