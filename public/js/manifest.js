$(function () {

    function addManifest(manifest) {
        //check to see if the card body has a table if not add it i
        var table = $(".mlisting");
        console.log("listing");
        console.log(manifest);
        table.show();
        setTimeout(function () {
            var tableBody = $(".mlisting").find('#data-listing');
            console.log(tableBody);
            var url = "m-packages";
            if (Number(manifest.mtypeId) != 1) {
                url = 'packages'
            }
            if (tableBody.length == 0) {
                table.append(`<tbody id="data-listing"><tr> <td>${manifest.title} </td> <td>${manifest.stage} </td> <td>${moment(manifest.dateCreated, "YYYY-MM-DD").format("dddd, LL")} </td> <td>${manifest.createdBy} </td> <td><a href='/warehouse/${url}/${manifest.mid}' class='btn btn-sm btn-primary'>Manage</a> <button class='btn btn-danger btn-sm rm-manifest-launch' data-id='${manifest.mid}' data-target='#rm-manifest-modal' data-toggle='modal' data-backdrop="static">Delete</button> </td> </tr></tbody>`);


            } else {

                $(tableBody).prepend(`<tr> <td><strong>${manifest.title}</strong> </td> <td>${manifest.stage} </td> <td>${moment(manifest.dateCreated, "YYYY-MM-DD").format("dddd, LL")} </td> <td>${manifest.createdBy} </td> <td><a href='/warehouse/${url}/${manifest.mid}' class='btn btn-sm btn-primary'>Manage</a> <button class='btn btn-danger btn-sm rm-manifest-launch' data-id='${manifest.mid}' data-target='#rm-manifest-modal' data-toggle='modal' data-backdrop="static">Delete</button> </td> </tr>`);
            }
            setupUpDelete();
        }, 100)


    }

    $(".create-manifest").click(function () {
        var mtype = $(this).attr('data-type');
        $.ajax({
            url: '/warehouse/create-manifest',
            type: 'post',
            data: {
                mtype: mtype
            },
            success: function (result) {
                console.log(result);
                if (result.manifest.mid > 0) {
                    swal("Hey", "Manifest Created", {
                        icon: "success",
                        buttons: {
                            confirm: {
                                className: 'btn btn-success'
                            }
                        },
                    });
                    $(".alert-warning").hide();
                    console.log(result);
                    addManifest(result.manifest);
                } else {
                    swal("Opps", result.error.message, {
                        icon: "error",
                        buttons: {
                            confirm: {
                                className: 'btn btn-danger'
                            }
                        },
                    });
                }

            }


        });
    });
    setupUpDelete();
    var currDelBtn;
    function setupUpDelete() {
        $(".rm-manifest-launch").off().click(function () {
            $('.rm-manifest').attr('data-id', $(this).attr('data-id'));
            currDelBtn = $(this);
        })
        $(".rm-manifest").off().click(function () {
            var mid = $(this).attr('data-id');
            $.ajax({
                url: '/warehouse/rm-manifest',
                type: 'post',
                data: {
                    mid: mid
                },
                success: function (result) {
                    $(".close-del").trigger('click');
                    if (result.deleted) {
                        currDelBtn.parent().parent().remove();

                        notes.show("The manifest has been successfully deleted.", {
                            type: 'success',
                            title: 'Deleted Manifest',
                            icon: '<i class="icon-icon-lock-open-outline"></i>',
                            sticky: true,
                            hide: 3000
                        });
                    }
                }

            });
        })
    }

});