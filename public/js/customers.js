$(function(){
    var colDef = [
        {
            title: "Box",
            data: null,
            targets: 'no-sort', orderable: false,
            render: function (data, type, row, meta) {
                // console.log(data);
                return "T-"+data.skybox; 
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