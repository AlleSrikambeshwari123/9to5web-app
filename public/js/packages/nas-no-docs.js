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

    //#region PAGE LOAD 
    var mid = 0;
    var mtype = "default";
    var mailTable;
    var cargoTable;
    var unProcTable;
    function LoadPageData() {
        //we need to load page data based on manifest type... 
      
        // if (mtype != "cargo") {
            getManifestPackages(mid, mtype, function (mailPackages) {

                // displayMailPackages(mailPackages);
                displayPackages(mailPackages, "#packageTable", mtype)
                displayPackages(mailPackages, "#importsTable", mtype)
            });

        // }

      

        //we need to get the counts intially 
        LoadPackageCounters();

    }

    function LoadPackageCounters() {
        getPackageCountBySize(mid, mtype, "#packageCount");
        if ($("#mailCount"))
            getPackageCountBySize(mid, "mail", "#mailCount");
        if ($("#unProcCount"))
            getPackageCountBySize(mid, "unproc", "#unProcCount");
    }
    LoadPageData();
    //#endregion

    $(".nav-link").click(function (e) {
        $(".tab-pane").removeClass("active");
        var tabSelector = $(this).attr("href");
        $(this).tab('show');
        $(this).addClass('active');
        $(tabSelector).addClass('active');

        return false;
    })


    //#region Control Actions
    $(".skybox").change(function () {
        //set the user 
        //make sure that its the correct length 
        var form = $(this).closest('form');
        var box = $(this).val();
        var nameCtrl = form.find('.customerName');
        lookupUser(box, $(nameCtrl));
    });
    $("input").change(function () {
        //revalidate the from
        var form = $(this).closest('form');
        var package = getPackageDetails($(this));
        var validPackage = validatePackage(package, $(this));
    })
    $(".savePackage").click(function () {

        var package = getPackageDetails($(this));
        //var stage = $(this).attr('data-stage');
       // var mtype = $("#mytpe").val();
        var validPackage = validatePackage(package, $(this));
        var form = $(this).closest('form');
        if (validPackage) {
            //save
            savePackage(package, form, false);
        } else {
            console.log('not saving the package...Invalid')
        }

    });
    $(".saveUnProcPackage").click(function () {

        var package = getPackageDetails($(this));
        var stage = $(this).attr('data-stage');
        var mtype = $("#mytpe").val();
        var validPackage = validateUnProcPackage(package, $(this));
        var form = $(this).closest('form');
        console.log('Package is valid : ' + validatePackage);
        if (validPackage) {
            //save
            savePackage(package, form, Number(stage) > 1);
        } else {
            console.log('not saving the package...Invalid')
        }

    });
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
                url: '/warehouse/upload',
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
    }

    function getPackageDetails(saveBtn) {
        console.log('getting the package details')
        var form = saveBtn.closest('form');
        var package = {
            skybox: $(form).find('.skybox').val(),
            customer: $(form).find('.customerName').text(),
            tracking: $(form).find('.trackingNo').val(),
            description: $(form).find('.description').val(),
            shipper: $(form).find('.shipper').val(),
            value: $(form).find('.package-value').val(),
            pieces: $(form).find('.pieces').val(),
            weight: $(form).find('.weight').val(),
            dimensions: $(form).find('.dimensions').val(),
            carrier: $(form).find('.carrier').val(),
            issue: $("form").find('.issue').val(), 
            //mid: $(form).find('.mid').val(),
            //mtype: $(form).find('.mtype').val(),
            isBusiness: $(form).find('.isBusiness').val()
        }

        // if (typeof $(form).find('.bag').val() != 'undefined') {
        //     package.bag = $(form).find('.bag').val()
        // } else {
        //     package.skid = $(form).find('.skid').val();
        // }
        console.log(package)
        return package;

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
                        //LoadPackageCounters();

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
    function validatePackage(package, saveBtn) {
        var valid = true;
        var message = '';
        var form = saveBtn.closest('form');

        var skybox = form.find('.skybox')
        $(skybox).parent().find('label').removeClass('text-danger');

        if (package.skybox == "") {
            valid = false;
            $(skybox).parent().find('label').addClass('text-danger');
        }

        form.find('.trackingNo').parent().find('label').removeClass('text-danger');
        if (package.tracking == '') {
            valid = false;
            form.find('.trackingNo').parent().find('label').addClass('text-danger');
        }
        form.find('.description').parent().find('label').removeClass('text-danger');
        if (package.description == '') {
            valid = false;
            form.find('.description').parent().find('label').addClass('text-danger');
        }
        form.find('.shipper').parent().find('label').removeClass('text-danger');
        if (package.shipper == '') {
            valid = false;
            form.find('.shipper').parent().find('label').addClass('text-danger');
        }
        form.find('.package-value').parent().find('label').removeClass('text-danger');
        if (package.value == '') {
            valid = false;
            form.find('.package-value').parent().find('label').addClass('text-danger');
        }
        form.find('.weight').parent().find('label').removeClass('text-danger');
        if (package.weight == '') {
            valid = false;
            form.find('.weight').parent().find('label').addClass('text-danger');
        }
        form.find('.pieces').parent().find('label').removeClass('text-danger');
        if (package.pieces == '') {
            valid = false;
            form.find('.pieces').parent().find('label').addClass('text-danger');
        }
        return valid;
    }
    function validateUnProcPackage(package, saveBtn) {
        var valid = true;
        var message = '';
        var form = saveBtn.closest('form');

        var skybox = form.find('.skybox')
        $(skybox).parent().find('label').removeClass('text-danger');

        if (package.skybox == "") {
            valid = false;
            $(skybox).parent().find('label').addClass('text-danger');
        }

        form.find('.trackingNo').parent().find('label').removeClass('text-danger');
        if (package.tracking == '') {
            valid = false;
            form.find('.trackingNo').parent().find('label').addClass('text-danger');
        }

        form.find('.package-value').parent().find('label').removeClass('text-danger');
        if (package.value == '') {
            valid = false;
            form.find('.package-value').parent().find('label').addClass('text-danger');
        }
        form.find('.weight').parent().find('label').removeClass('text-danger');
        if (package.weight == '') {
            valid = false;
            form.find('.weight').parent().find('label').addClass('text-danger');
        }

        return valid;
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

    function clearForm(form) {
        form.find('.skybox').val('');
        form.find('.customerName').text('');
        form.find('.trackingNo').val('');
        form.find('.description').val('');
        form.find('.shipper').val('');
        form.find('.carrier').val('');
        form.find('.issue').val('');
        form.find('.dimensions').val('');
        form.find('.package-value').val('');
        form.find('.pieces').val('');
        form.find('.weight').val('');
        // var bagInput = form.find('.bag');
        // var skidinput = form.find('.skid');
        // console.log(bagInput);
        // console.log('skid');
        // console.log(skidinput);
        // if (bagInput.length > 0)
        //     bagInput.focus();
        // else if (skidinput.length > 0)
        //     skidinput.focus();
    }



    function displayPackages(packages, tableId, ctype) {
        //REFACTORED FUNCTION  
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
           
            // {
            //     title: "PMB",
            //     data: null,
            //     render: function (data, type, row, meta) {
            //         // console.log(data);
            //         return `${data.skybox} `;
            //     }
            // },
            // {
            //     title: "Customer",
            //     data: null,
            //     render: function (data, type, row, meta) {
            //         // console.log(data);
            //         return `${data.customer} `;
            //     }
            // },
            {
                title: "Date Received",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `${data.skybox} `;
                }
            },
            {
                title: "Location",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `${data.trackingNo} `;
                }
            },
            {
                title: "Consignee",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `${data.trackingNo} `;
                }
            },
            {
                title: "AWB",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `${data.trackingNo} `;
                }
            },

            {
                title: "Shipper",
                data: null, visible: hideCols,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `${data.shipper}`;
                }
            },
            {
                title: "Pieces",
                visible: hideCols,
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `${data.pieces}`;
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
                title: "Storage Fees",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `${Number(data.value).formatMoney(2, '.', ',')}`;
                }
            },
            {
                title: "",
                data: null,
                render: function (data, type, row, meta) {
                    // console.log(data);
                    return `<i class='fas fa-pencil-alt edit'  data-id='${data.id}' title='Edit' style='cursor:pointer;'></i> <i title='Delete' data-type='${ctype}' data-toggle='modal' data-target='#confirmPkgDel' class='fas fa-trash rm' data-id='${data.id}' style='cursor:pointer;'></i>`;
                }
            },

        ];


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



    function getPackageCountBySize(mid, type, ctrlName) {
        $.ajax({
            url: `/warehouse/manifest-count/${mid}/${type}`,
            contentType: 'json',
            success: function (result) {
                $(ctrlName).html(result.size);
                console.log(result);
            }
        });
    }

    function savePackage(package, form, isClosed) {

        $.ajax({
            url: '/warehouse/save-package',
            type: 'post',
            data: package,
            success: function (result) {
                if (result.saved == true) {
                    //clear the form 
                    //and build dataTable 
                    //if the manifest is closed then hide the form after  
                    clearForm(form);
                    if (isClosed) {
                        form.parent().hide();
                    }
                    LoadPackageCounters();
                    console.log("about to re-display " + package.mtype);
                    getManifestPackages(mid, "default", function (mailPackages) {

                        // displayMailPackages(mailPackages);
                        displayPackages(mailPackages, "#packageTable", "default")
                    });
                    console.log('saved');
                }
            },
            error: function (err) {
                //check to see if access denied and re-route to login screen 
            }
        })
    }

    function loadPackage(trackingNo, form) {
        console.log(form.attr('id'));
        $.ajax({
            url: '/warehouse/load-package/' + trackingNo,
            contentType: 'json',
            success: function (dResult) {
                console.log(dResult);

                form.find('.skybox').val(dResult.skybox);
                console.log(dResult.skybox);
                form.find('.trackingNo').val(dResult.trackingNo);
                form.find('.shipper').val(dResult.shipper);
                form.find('.package-value').val(dResult.value);
                form.find('.weight').val(dResult.weight);
                form.find('.pieces').val(dResult.pieces);
                form.find('.description').val(dResult.description);
                form.find('.carrier').val(dResult.carrier);
                form.find('.dimensions').val(dResult.dimensions);
                if (typeof dResult.bag != "undefined")
                    form.find('.bag').val(dResult.bag);
                else
                    form.find('.skid').val(dResult.skid);

                form.find('.skybox').trigger('change');

            },
            error: function (err) {

            }

        })
    }

    function deletePackage(trackingNo, type,id) {
        $.ajax({
            url: '/warehouse/rm-package',
            type: 'post',
            data: {
                id:trackingNo,
                trackingNo: trackingNo,
                mid: $("#mid").val()
            },
            success: function (dResult) {
                getManifestPackages(mid, "default", function (mailPackages) {

                    // displayMailPackages(mailPackages);
                    displayPackages(mailPackages, "#packageTable", "default")
                });
                // if (type == 'mail') {
                //     //refresh the package listing 
                //     console.log('refreshing mail');
                //     getManifestPackages(mid, "mail", function (mailPackages) {

                //         // displayMailPackages(mailPackages);
                //         displayPackages(mailPackages, "#mailTable", "mail")
                //     });
                // } else if (type == "cargo") {
                //     // cargo 
                //     console.log('refreshing cargo');
                //     getManifestPackages(mid, "cargo", function (mailPackages) {


                //         displayPackages(mailPackages, "#cargoTable", mtype)
                //     });
                // }
                // else {
                //     getManifestPackages(mid, type, function (mailPackages) {


                //         displayPackages(mailPackages, "#unprocTable", type)
                //     });
                // }
            },
            error: function (err) {

            }

        })
    }
    //sets the name of the person on the page for a given skybox. 
    function setCustomerInfo(customer, ctrl) {
        ctrl.text('');
        ctrl.removeClass('text-info');
        ctrl.removeClass('text-danger');
        if (typeof customer.isBusiness === "undefined")
            customer.isBusiness = 0;
        ctrl.parent().parent().find('.isBusiness').val(customer.isBusiness);
        if (customer.err) {
            //display as error
            ctrl.text(customer.err);
            ctrl.removeClass('text-info');
            ctrl.addClass('text-danger');

            return;
        }
        console.log(customer);

        ctrl.text(" - " + customer.name);
        ctrl.addClass('text-info');

        //we also what to see if 

    }

    //Gets the name of the person associated with the skybox 
    function lookupUser(skybox, ctrl) {
        //ajax call 
        $.ajax({
            url: '/warehouse/get-customer-info',
            type: 'post',
            data: {
                box: skybox
            },
            success: function (customer) {

                setCustomerInfo(customer, ctrl);

            }


        })
    }

    //#endregion
});