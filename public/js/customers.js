$(function(){
    var colDef = [
        {
            title: "Box",
            data: null,
            targets: 'no-sort', orderable: false,
            render: function (data, type, row, meta) {
                // console.log(data);
                return "T-"+data.SkyBox; 
            }
        },
        {
            targets: 'no-sort', orderable: false,
            title: "Name",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return `${data.Name} `;
            }
        },
        {
            targets: 'no-sort', orderable: false,
            title: "Email",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return `${data.Email} `;
            }
        },
        {
            targets: 'no-sort', orderable: false,
            title: "mobile",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return `${data.Mobile} `;
            }
        },
        {
            targets: 'no-sort', orderable: false,
            title: "Location",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return `${data.Area} `;
            }
        },
        {
            targets: 'no-sort', orderable: false,
            title: "",
            data: null,
            render: function (data, type, row, meta) {
                // console.log(data);
                return `<a href ="/admin/customer-edit/${data.Id}" class='text-white'><i class='icon-edit2'></i></a>`;
            }
        },
        
    ];
     $("#customerTable").DataTable({

        data: rpackages,
        paging: false,

        columns: colDef,
        //bInfo:false,
        bFilter: false, bInfo: false,
        "language": {
            "decimal": ",",
            "thousands": "."
        },

        "deferRender": true,
        initComplete: function () {
         
        },

    });
});