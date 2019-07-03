$(function () {
    var colDef = [
        {
            title: "Box",
            data: null,
            targets: 'no-sort', orderable: false,
            render: function (data, type, row, meta) {
                // console.log(data);
                return data.skybox;
            }
        },
        {
            targets: 'no-sort', orderable: false,
            title: "Name",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return `${data.name} `;
            }
        },
        {
            targets: 'no-sort', orderable: false,
            title: "Email",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return `${data.email} `;
            }
        },
        {
            targets: 'no-sort', orderable: false,
            title: "mobile",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return `${data.mobile} `;
            }
        },
        {
            targets: 'no-sort', orderable: false,
            title: "Location",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return `${data.area} `;
            }
        },
        {
            targets: 'no-sort', orderable: false,
            title: "",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return `<a href ="/admin/customer-edit/${data.skybox}"><i class='fas fa-pencil-alt'></i></a>`;
            }
        },

    ];

    console.log(rpackages);
    $("#customerTable").DataTable({
        data: rpackages,
        paging: true,
        columns: colDef,
        bFilter: true, bInfo: true,
        "language": {
            "decimal": ",",
            "thousands": "."
        },
        "deferRender": true,
        initComplete: function () {
        },
    });

    $(".page-item-search").click(function () {
        $("#rpage").val($(this).attr('data-id'));
        $("#searchFrm").submit();
    });
});